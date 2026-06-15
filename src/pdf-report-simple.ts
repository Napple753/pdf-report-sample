import bwipjs from "@bwip-js/browser";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";

export type ReportData = Record<
  string,
  string | number | boolean | null | undefined
>;

export type ReportTemplate = {
  id: string;
  templatePdf: string;
  fonts: Record<string, string>;
  fields: ReportField[];
};

export type ReportField = TextField | BarcodeField;

export type TextField = {
  type: "text";
  key: string;
  page: number;
  x: number;
  y: number;
  font: string | string[];
  fontSize: number;
  width?: number;
  align?: "left" | "center" | "right";
  format?: string;
};

export type BarcodeField = {
  type: "barcode";
  key: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  height: number;
  barcodeType?: "code128" | "qrcode" | "code39";
  scale?: number;
  align?: "left" | "center" | "right";
};

export type ReportFormatter = (value: unknown, data: ReportData) => string;

export type GeneratePdfReportInput = {
  data: ReportData;
  template: ReportTemplate;
  formatters?: Record<string, ReportFormatter>;
  debug?: boolean;
};

export async function generatePdfReport({
  data,
  template,
  formatters = {},
  debug = false,
}: GeneratePdfReportInput): Promise<Uint8Array> {
  const templatePdfBytes = await fetchArrayBuffer(template.templatePdf);

  const pdfDoc = await PDFDocument.load(templatePdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const fonts = await embedFonts(pdfDoc, template.fonts);

  for (const field of template.fields) {
    const page = getPage(pdfDoc, field.page);

    if (field.type === "text") {
      drawTextField({
        page,
        field,
        value: resolveValue(data, field.key),
        data,
        fonts,
        formatters,
        debug,
      });
      continue;
    }

    if (field.type === "barcode") {
      await drawBarcodeField({
        pdfDoc,
        page,
        field,
        value: resolveValue(data, field.key),
        debug,
      });
      continue;
    }

    assertNever(field);
  }

  return pdfDoc.save();
}

async function fetchArrayBuffer(path: string): Promise<ArrayBuffer> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`[pdf-report] Failed to fetch: ${path}`);
  }

  return response.arrayBuffer();
}

async function embedFonts(
  pdfDoc: PDFDocument,
  fontSources: Record<string, string>,
): Promise<Record<string, PDFFont>> {
  const entries = await Promise.all(
    Object.entries(fontSources).map(async ([name, path]) => {
      const bytes = await fetchArrayBuffer(path);
      const font = await pdfDoc.embedFont(bytes, { subset: false });
      return [name, font] as const;
    }),
  );

  return Object.fromEntries(entries);
}

function getPage(pdfDoc: PDFDocument, pageIndex: number): PDFPage {
  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];

  if (!page) {
    throw new Error(`[pdf-report] Page not found: page=${pageIndex}`);
  }

  return page;
}

function resolveValue(data: ReportData, key: string): string {
  if (!(key in data)) {
    throw new Error(`[pdf-report] Missing data: key="${key}"`);
  }

  const value = data[key];

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function selectFont(
  text: string,
  fontKeys: string | string[],
  fonts: Record<string, PDFFont>,
  fieldKey: string,
): PDFFont {
  const keys = Array.isArray(fontKeys) ? fontKeys : [fontKeys];
  const isAscii = /^[\x20-\x7E]*$/.test(text);

  for (const [index, key] of keys.entries()) {
    const f = fonts[key];
    if (!f) continue;
    if (index === keys.length - 1 || isAscii) return f;
  }

  throw new Error(`[pdf-report] Missing font: key="${fieldKey}"`);
}

function drawTextField(args: {
  page: PDFPage;
  field: TextField;
  value: string;
  data: ReportData;
  fonts: Record<string, PDFFont>;
  formatters: Record<string, ReportFormatter>;
  debug: boolean;
}) {
  const { page, field, data, fonts, formatters, debug } = args;

  const text =
    field.format && formatters[field.format]
      ? formatters[field.format](args.value, data)
      : args.value;

  const font = selectFont(text, field.font, fonts, field.key);

  const textWidth = font.widthOfTextAtSize(text, field.fontSize);

  if (field.width !== undefined && textWidth > field.width) {
    throw new Error(
      `[pdf-report] Text overflow: key="${field.key}", width=${field.width}, textWidth=${textWidth.toFixed(
        2,
      )}`,
    );
  }

  const x = calculateAlignedX({
    x: field.x,
    width: field.width,
    textWidth,
    align: field.align ?? "left",
  });

  page.drawText(text, {
    x,
    y: field.y,
    size: field.fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  if (debug) {
    drawDebugBox(page, {
      x: field.x,
      y: field.y,
      width: field.width ?? Math.max(textWidth, 40),
      height: field.fontSize + 4,
      label: `text:${field.key}`,
    });
  }
}

function calculateAlignedX(args: {
  x: number;
  width: number | undefined;
  textWidth: number;
  align: "left" | "center" | "right";
}): number {
  const { x, width, textWidth, align } = args;

  if (width === undefined || align === "left") {
    return x;
  }

  if (align === "center") {
    return x + (width - textWidth) / 2;
  }

  return x + width - textWidth;
}

async function drawBarcodeField(args: {
  pdfDoc: PDFDocument;
  page: PDFPage;
  field: BarcodeField;
  value: string;
  debug: boolean;
}) {
  const { pdfDoc, page, field, value, debug } = args;

  const canvas = document.createElement("canvas");

  const bcid = field.barcodeType ?? "code128";

  bwipjs.toCanvas(canvas, {
    bcid,
    text: value,
    scale: field.scale ?? 3,
    // QR コードに height を渡すとセルが縦長になりアスペクト比が崩れるため除外する。
    // 線形バーコード（code128/code39）では bars の高さ(mm)として必要。
    ...(bcid !== "qrcode" && {
      height: Math.max(8, Math.round(field.height / 3)),
    }),
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0,
  });

  const pngBytes = await dataUrlToArrayBuffer(canvas.toDataURL("image/png"));
  const image = await pdfDoc.embedPng(pngBytes);

  // bwipjs renders at 72 DPI. Drawing at 1/2 pixel size gives 144 DPI effective resolution.
  const pixelWidth = canvas.width / 2;
  const pixelHeight = canvas.height / 2;

  // 描画サイズの決定:
  //   qrcode  : 枠内に収まる最大の正方形（contain）。drawWidth === drawHeight を保証。
  //   code39  : 幅は 144 DPI 等倍、高さは field.height にぴったり合わせる。
  //   code128 : 幅は 144 DPI 等倍、高さは field.height の半分（従来動作）。
  let drawWidth: number;
  let drawHeight: number;

  if (bcid === "qrcode") {
    // QR は正方形。短辺を基準に contain スケールを計算して正方形を保証する。
    const pixelSize = Math.min(pixelWidth, pixelHeight);
    const scaleX = field.width !== undefined ? field.width / pixelSize : Infinity;
    const scaleY = field.height / pixelSize;
    const fitScale = Math.min(scaleX, scaleY);
    drawWidth = pixelSize * fitScale;
    drawHeight = pixelSize * fitScale;
  } else if (bcid === "code39") {
    drawWidth = pixelWidth;
    drawHeight = field.height;
  } else {
    drawWidth = pixelWidth;
    drawHeight = field.height / 2;
  }

  if (bcid !== "qrcode" && field.width !== undefined && drawWidth > field.width) {
    throw new Error(
      `[pdf-report] Barcode overflow: key="${field.key}", width=${field.width}, barcodeWidth=${drawWidth}`,
    );
  }

  const drawX = calculateAlignedX({
    x: field.x,
    width: field.width,
    textWidth: drawWidth,
    align: field.align ?? "left",
  });

  page.drawImage(image, {
    x: drawX,
    y: field.y,
    width: drawWidth,
    height: drawHeight,
  });

  if (debug) {
    drawDebugBox(page, {
      x: field.x,
      y: field.y,
      width: field.width ?? naturalWidth,
      height: field.height,
      label: `barcode:${field.key}`,
    });
  }
}

async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

function drawDebugBox(
  page: PDFPage,
  args: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  },
) {
  page.drawRectangle({
    x: args.x,
    y: args.y,
    width: args.width,
    height: args.height,
    borderWidth: 0.5,
    borderColor: rgb(1, 0, 0),
  });

  page.drawText(args.label, {
    x: args.x,
    y: args.y + args.height + 2,
    size: 6,
    color: rgb(1, 0, 0),
  });
}

function assertNever(value: never): never {
  throw new Error(`[pdf-report] Unsupported field: ${JSON.stringify(value)}`);
}
