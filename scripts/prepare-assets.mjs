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

async function createProductLabelTemplatePdf() {
  const templateDir = resolve(root, "public/report-templates");
  await mkdir(templateDir, { recursive: true });

  const PAGE_W = 450;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, 260]);

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Outer border
  page.drawRectangle({
    x: 5,
    y: 5,
    width: PAGE_W - 10,
    height: 250,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0),
  });

  // Company name (centered)
  const companyName = "Exemplum Fabrica Inc.";
  const companyNameWidth = boldFont.widthOfTextAtSize(companyName, 14);
  page.drawText(companyName, {
    x: (PAGE_W - companyNameWidth) / 2,
    y: 238,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Separator line below header
  page.drawRectangle({
    x: 5,
    y: 231,
    width: PAGE_W - 10,
    height: 0.5,
    color: rgb(0, 0, 0),
  });

  // Field labels
  const labels = [
    { text: "Product Name:", y: 220 },
    { text: "Product Category Code:", y: 203 },
    { text: "Lot No.:", y: 186 },
    { text: "Product Date:", y: 169 },
    { text: "Product Code:", y: 152 },
    { text: "Control No.:", y: 135 },
    { text: "Reference ID.:", y: 118 },
    { text: "Section:", y: 101 },
  ];

  for (const label of labels) {
    page.drawText(label.text, {
      x: 10,
      y: label.y,
      size: 9,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();
  await writeFile(resolve(templateDir, "product_label_v1.pdf"), pdfBytes);
}

await copyFonts();
await createTemplatePdf();
await createProductLabelTemplatePdf();

console.log("[prepare-assets] fonts and template PDF were prepared.");
