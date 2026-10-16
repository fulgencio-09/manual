import path from 'node:path';
import { execFileSync } from 'node:child_process';

const input = process.argv[2];
const base = process.argv[3] || 'manual-generado';
const aiInput = process.argv[4] || null;
if (!input) {
  console.error('Uso: node export-all.mjs <ejecucion.json> [nombre-base] [manual-ia.json]');
  process.exit(1);
}

const dir = path.dirname(path.resolve(input));
const basePath = path.join(dir, base);
const generatorDir = import.meta.dirname;
const extra = aiInput ? [path.resolve(aiInput)] : [];

execFileSync(process.execPath, [path.join(generatorDir, 'generate.mjs'), path.resolve(input), `${basePath}.html`, ...extra], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(generatorDir, 'export-docx.mjs'), path.resolve(input), `${basePath}.docx`, ...extra], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(generatorDir, 'export-pdf.mjs'), path.resolve(input), `${basePath}.pdf`, ...extra], { stdio: 'inherit' });

console.log(`Exportación completa: ${basePath}.{html,docx,pdf}`);
