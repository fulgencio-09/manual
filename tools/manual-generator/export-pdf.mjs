import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const input = process.argv[2];
const output = process.argv[3] || 'manual-generado.pdf';
if (!input) {
  console.error('Uso: node export-pdf.mjs <ejecucion.json> [salida.pdf]');
  process.exit(1);
}

const outputPath = path.resolve(output);
const htmlPath = path.join(path.dirname(outputPath), `${path.basename(outputPath, '.pdf')}.html`);
execFileSync(process.execPath, [path.join(import.meta.dirname, 'generate.mjs'), path.resolve(input), htmlPath], { stdio: 'inherit' });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, deviceScaleFactor: 1 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true, margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' } });
  console.log(`PDF generado: ${outputPath}`);
} finally {
  await browser.close();
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
}
