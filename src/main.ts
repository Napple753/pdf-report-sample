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
      <button id="download">PDF帳票を開く</button>
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
      debug,
    });

    openPdf(pdfBytes);
  });

function openPdf(pdfBytes: Uint8Array) {
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  window.open(url, "_blank");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
