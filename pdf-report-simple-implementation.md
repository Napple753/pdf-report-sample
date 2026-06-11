# PDF Report Simple 新規プロジェクト実装指示書

## 目的

TypeScript をコンパイルし、Web ブラウザで開いて、ボタン押下により PDF 帳票をダウンロードできる新規プロジェクトを作成する。

帳票生成処理はプロジェクト内の 1 スクリプトファイルとして配置する。

## 必須要件

- Vite + TypeScript のブラウザアプリとして作成する
- `npm install` が成功すること
- `npm run build` が成功すること
- `npm run dev` でブラウザアプリを起動できること
- ブラウザで開いて PDF 帳票をダウンロードできること
- PDF 生成は `pdf-lib` を使う
- 日本語フォントを PDF に埋め込む
- フォントはライセンス上問題のないものをプロジェクトに同梱する
- バーコード生成を実現する
- バーコードの回転は実装しない

## フォント方針

Noto Sans JP を使用する。

フォントファイルは npm package から取得し、`postinstall` で `public/fonts/` にコピーする。

使用パッケージ:

```bash
@expo-google-fonts/noto-sans-jp
```

使用するフォントファイル:

```txt
node_modules/@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf
node_modules/@expo-google-fonts/noto-sans-jp/700Bold/NotoSansJP_700Bold.ttf
```

コピー先:

```txt
public/fonts/NotoSansJP_400Regular.ttf
public/fonts/NotoSansJP_700Bold.ttf
```

## ディレクトリ構成

```txt
pdf-report-simple/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  README.md
  LICENSES.md

  scripts/
    prepare-assets.mjs

  public/
    fonts/
      .gitkeep
    report-templates/
      .gitkeep

  src/
    main.ts
    pdf-report-simple.ts
    report-template.ts
    sample-data.ts
    style.css
```

## package.json

```json
{
  "name": "pdf-report-simple",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "postinstall": "node scripts/prepare-assets.mjs",
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@bwip-js/browser": "^4.7.0",
    "@expo-google-fonts/noto-sans-jp": "^0.4.3",
    "@pdf-lib/fontkit": "^1.1.1",
    "pdf-lib": "^1.17.1"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src", "vite.config.ts"]
}
```

## vite.config.ts

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
  },
});
```

## scripts/prepare-assets.mjs

```js
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

async function copyFonts() {
  const fontDir = resolve(root, "public/fonts");
  await mkdir(fontDir, { recursive: true });

  await copyFile(
    resolve(
      root,
      "node_modules/@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf",
    ),
    resolve(fontDir, "NotoSansJP_400Regular.ttf"),
  );

  await copyFile(
    resolve(
      root,
      "node_modules/@expo-google-fonts/noto-sans-jp/700Bold/NotoSansJP_700Bold.ttf",
    ),
    resolve(fontDir, "NotoSansJP_700Bold.ttf"),
  );
}

async function createTemplatePdf() {
  const templateDir = resolve(root, "public/report-templates");
  await mkdir(templateDir, { recursive: true });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText("PDF REPORT SAMPLE TEMPLATE", {
    x: 40,
    y: 800,
    size: 14,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawRectangle({
    x: 40,
    y: 735,
    width: 515,
    height: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawRectangle({
    x: 40,
    y: 120,
    width: 515,
    height: 600,
    borderWidth: 1,
    borderColor: rgb(0.85, 0.85, 0.85),
  });

  const pdfBytes = await pdfDoc.save();
  await writeFile(resolve(templateDir, "invoice_v1.pdf"), pdfBytes);
}

await copyFonts();
await createTemplatePdf();

console.log("[prepare-assets] fonts and template PDF were prepared.");
```

## index.html

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PDF Report Simple</title>
  </head>
  <body>
    <main id="app"></main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

## src/sample-data.ts

```ts
export const sampleData = {
  templateId: "invoice_v1",
  invoiceNo: "INV-2026-0001",
  issuedAt: "2026-06-11",
  customerName: "株式会社サンプル",
  customerAddress: "東京都千代田区千代田1-1",
  amount: 12800,
  barcodeValue: "INV2026000112800",
};
```

## src/report-template.ts

```ts
import type { ReportTemplate } from "./pdf-report-simple";

export const reportTemplate: ReportTemplate = {
  id: "invoice_v1",
  templatePdf: "/report-templates/invoice_v1.pdf",

  fonts: {
    jp: "/fonts/NotoSansJP_400Regular.ttf",
    jpBold: "/fonts/NotoSansJP_700Bold.ttf",
  },

  fields: [
    {
      type: "text",
      key: "invoiceNo",
      page: 0,
      x: 390,
      y: 760,
      width: 160,
      font: "jpBold",
      fontSize: 11,
      align: "right",
    },
    {
      type: "text",
      key: "issuedAt",
      page: 0,
      x: 390,
      y: 738,
      width: 160,
      font: "jp",
      fontSize: 10,
      align: "right",
    },
    {
      type: "text",
      key: "customerName",
      page: 0,
      x: 60,
      y: 690,
      width: 300,
      font: "jpBold",
      fontSize: 14,
      align: "left",
    },
    {
      type: "text",
      key: "customerAddress",
      page: 0,
      x: 60,
      y: 665,
      width: 420,
      font: "jp",
      fontSize: 10,
      align: "left",
    },
    {
      type: "text",
      key: "amount",
      page: 0,
      x: 350,
      y: 610,
      width: 180,
      font: "jpBold",
      fontSize: 18,
      align: "right",
      format: "currency",
    },
    {
      type: "barcode",
      key: "barcodeValue",
      page: 0,
      x: 60,
      y: 540,
      width: 240,
      height: 58,
      barcodeType: "code128",
    },
    {
      type: "text",
      key: "barcodeValue",
      page: 0,
      x: 60,
      y: 522,
      width: 240,
      font: "jp",
      fontSize: 8,
      align: "center",
    },
  ],
};
```

## src/pdf-report-simple.ts

```ts
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
  font: string;
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
  width: number;
  height: number;
  barcodeType?: "code128" | "qrcode";
  scale?: number;
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
      const font = await pdfDoc.embedFont(bytes, { subset: true });
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

  const font = fonts[field.font];
  if (!font) {
    throw new Error(
      `[pdf-report] Missing font: key="${field.key}", font="${field.font}"`,
    );
  }

  const text =
    field.format && formatters[field.format]
      ? formatters[field.format](args.value, data)
      : args.value;

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

  bwipjs.toCanvas(canvas, {
    bcid: field.barcodeType ?? "code128",
    text: value,
    scale: field.scale ?? 3,
    height: Math.max(8, Math.round(field.height / 3)),
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0,
  });

  const pngBytes = await dataUrlToArrayBuffer(canvas.toDataURL("image/png"));
  const image = await pdfDoc.embedPng(pngBytes);

  page.drawImage(image, {
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
  });

  if (debug) {
    drawDebugBox(page, {
      x: field.x,
      y: field.y,
      width: field.width,
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
```

## src/main.ts

```ts
import { generatePdfReport } from "./pdf-report-simple";
import { reportTemplate } from "./report-template";
import { sampleData } from "./sample-data";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app not found");
}

app.innerHTML = `
  <section class="page">
    <h1>PDF Report Simple</h1>
    <p>TypeScript + Vite + pdf-lib で、ブラウザからPDF帳票を生成します。</p>

    <div class="actions">
      <button id="download">PDF帳票をダウンロード</button>
      <label>
        <input id="debug" type="checkbox" />
        debug表示
      </label>
    </div>

    <pre>${escapeHtml(JSON.stringify(sampleData, null, 2))}</pre>
  </section>
`;

document
  .querySelector<HTMLButtonElement>("#download")
  ?.addEventListener("click", async () => {
    const debug = Boolean(
      document.querySelector<HTMLInputElement>("#debug")?.checked,
    );

    const pdfBytes = await generatePdfReport({
      data: sampleData,
      template: reportTemplate,
      formatters: {
        currency: (value) => `${Number(value).toLocaleString("ja-JP")} 円`,
      },
      debug,
    });

    downloadPdf(pdfBytes, `invoice-${sampleData.invoiceNo}.pdf`);
  });

function downloadPdf(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
```

## src/style.css

```css
body {
  margin: 0;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f6f7f9;
  color: #222;
}

.page {
  max-width: 760px;
  margin: 48px auto;
  padding: 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 28px rgb(0 0 0 / 8%);
}

h1 {
  margin-top: 0;
}

.actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
}

button {
  padding: 10px 16px;
  border: 0;
  border-radius: 8px;
  background: #222;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  opacity: 0.86;
}

pre {
  overflow: auto;
  padding: 16px;
  border-radius: 8px;
  background: #f0f2f5;
}
```

## LICENSES.md

```md
# Licenses

## Noto Sans JP

This project includes Noto Sans JP font files copied from the npm package:

- `@expo-google-fonts/noto-sans-jp`

The font license should be checked against the Google Fonts page for Noto Sans JP and included when publishing or redistributing this project.

## Runtime dependencies

- pdf-lib
- @pdf-lib/fontkit
- @bwip-js/browser
- @expo-google-fonts/noto-sans-jp
```

## README.md

````md
# PDF Report Simple

Browser-based PDF report generation sample.

## Setup

```bash
npm install
```
````

`postinstall` copies Noto Sans JP font files into `public/fonts/` and creates a sample PDF template in `public/report-templates/`.

## Build

```bash
npm run build
```

## Run

```bash
npm run dev
```

Open the displayed local URL in a browser and click:

```txt
PDF帳票をダウンロード
```

## Design rules

- This is not a library package.
- The PDF generation logic lives in `src/pdf-report-simple.ts`.
- Coordinates are fixed to PDF points.
- Origin is fixed to PDF default bottom-left.
- Barcode rotation is not supported.
- Barcode rendering is supported.
- Barcode readable text is not generated by the barcode field.
- If readable text is needed, add a separate `text` field.
- `defaultFont` is not supported.
- Every text field must explicitly specify `font`.

````

## 実行手順

```bash
mkdir pdf-report-simple
cd pdf-report-simple

npm init -y
````

上記ファイルを配置したあと、依存関係を入れる。

```bash
npm install pdf-lib @pdf-lib/fontkit @bwip-js/browser @expo-google-fonts/noto-sans-jp
npm install -D typescript vite @types/node
```

その後:

```bash
npm run build
npm run dev
```

ブラウザで Vite の URL を開き、`PDF帳票をダウンロード` を押して PDF が落ちれば完了。

## 受け入れ条件

- `npm install` が成功する
- `postinstall` により以下が生成される
  - `public/fonts/NotoSansJP_400Regular.ttf`
  - `public/fonts/NotoSansJP_700Bold.ttf`
  - `public/report-templates/invoice_v1.pdf`
- `npm run build` が成功する
- `npm run dev` でブラウザ表示できる
- ボタン押下で PDF がダウンロードされる
- PDF 内に日本語が表示される
- PDF 内にバーコードが表示される
- バーコードは回転しない
- `schemaVersion` / `unit` / `origin` / `defaultFont` / `overflow` / `includeText` が存在しない

## 実装上の注意

### 座標系

テンプレート上の座標は PDF の標準的な座標系をそのまま使う。

- 単位: pt
- 原点: bottom-left

ただし、これらはテンプレート定義には書かない。内部仕様として固定する。

### text field

`text` field は `font` を必須にする。`defaultFont` は存在しない。

```ts
{
  type: 'text',
  key: 'customerName',
  page: 0,
  x: 60,
  y: 690,
  width: 300,
  font: 'jpBold',
  fontSize: 14,
  align: 'left'
}
```

`format` は任意。`format` がある場合のみ、`generatePdfReport` に渡された `formatters` を参照する。

### barcode field

`barcode` field はバーコード画像だけを生成する。

バーコード下部に人間が読める文字列を出したい場合は、別途 `text` field を配置する。

```ts
{
  type: 'barcode',
  key: 'barcodeValue',
  page: 0,
  x: 60,
  y: 540,
  width: 240,
  height: 58,
  barcodeType: 'code128'
}
```

以下は実装しない。

- バーコード回転
- `includeText`

### デバッグ

`debug: true` の場合、各 field の矩形とラベルを PDF 上に描画する。

例:

```txt
text:invoiceNo
barcode:barcodeValue
```

デバッグ時でも、設定不備は原則としてエラーにする。

例:

```txt
[pdf-report] Missing data: key="customerName"
[pdf-report] Missing font: key="customerName", font="jpBold"
[pdf-report] Text overflow: key="customerName", width=300, textWidth=348.20
```

### エラー方針

以下は即エラーにする。

- data に field の key が存在しない
- text field の font が fonts に存在しない
- page index が存在しない
- text が width を超える
- template PDF が取得できない
- font file が取得できない
