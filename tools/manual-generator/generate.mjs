import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
const output = process.argv[3] || 'manual-generado.html';

if (!input) {
  console.error('Uso: node generate.mjs <ejecucion.json> [salida.html]');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const story = report.story || {};
const steps = Array.isArray(report.steps) ? report.steps : [];
const evidences = Array.isArray(report.evidences) ? report.evidences : [];
const evidenceByStep = new Map(evidences.map(e => [e.step, e]));

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const date = (value) => value ? new Date(value).toLocaleString('es-CO') : 'No especificada';
const title = story.title || 'Manual de usuario';
const id = story.id || 'HU-SIN-ID';
const executionResult = report.execution?.result || 'No determinado';
const objective = report.document?.objective || 'Describir de forma clara y ordenada el procedimiento observado durante la ejecución de la historia de usuario.';
const preconditions = Array.isArray(report.document?.preconditions) && report.document.preconditions.length
  ? report.document.preconditions
  : ['Usuario con acceso al sistema y permisos requeridos para ejecutar la funcionalidad.', 'Información de prueba disponible para realizar la ejecución.'];

const stepRows = steps.map((step, index) => {
  const evidence = evidenceByStep.get(step.step);
  const action = step.humanAction || step.detail || `Ejecutar acción ${index + 1}.`;
  const detail = step.detail || 'No se registró detalle adicional.';
  const image = evidence?.dataUrl
    ? `<figure><img src="${evidence.dataUrl}" alt="Evidencia del paso ${step.step}"><figcaption>Figura ${step.step}. Evidencia de ejecución${evidence.pageTitle ? ` — ${esc(evidence.pageTitle)}` : ''}.</figcaption></figure>`
    : '<div class="no-evidence">No se registró captura para este paso.</div>';
  return `<section class="step"><div class="step-index">${index + 1}</div><div class="step-content"><h3>${esc(action)}</h3><p>${esc(detail)}</p><div class="technical"><span>Pantalla: ${esc(step.pageTitle || 'No especificada')}</span><span>Elemento: ${esc(step.element || 'No especificado')}</span></div>${image}</div></section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(id)} — ${esc(title)}</title>
<style>
@page{size:A4;margin:18mm 16mm 18mm 16mm}
:root{--ink:#172033;--muted:#667085;--line:#dfe3e8;--brand:#0e7490;--soft:#eef8fa}
*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55}.document{width:210mm;max-width:100%;margin:24px auto;background:#fff;box-shadow:0 8px 30px rgba(16,24,40,.10)}.page{padding:20mm 18mm;min-height:297mm;break-after:page}.cover{display:flex;flex-direction:column;justify-content:center;min-height:250mm}.brand{font-size:11px;letter-spacing:.12em;font-weight:700;color:var(--brand);text-transform:uppercase}.cover h1{font-size:31px;line-height:1.15;margin:18px 0 10px}.cover .subtitle{font-size:17px;color:var(--muted);margin:0 0 35px}.cover-table{border-top:2px solid var(--brand);border-bottom:1px solid var(--line);padding:16px 0}.cover-table div{display:grid;grid-template-columns:160px 1fr;padding:6px 0}.label{font-weight:700;color:var(--muted)}h2{font-size:20px;border-bottom:2px solid var(--soft);padding-bottom:8px;margin-top:0}h3{font-size:14px;margin:0 0 7px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0 28px}.metric{border:1px solid var(--line);border-radius:8px;padding:13px}.metric strong{display:block;font-size:20px;color:var(--brand)}.callout{background:var(--soft);border-left:4px solid var(--brand);padding:12px 14px;margin:12px 0 20px}.step{display:flex;gap:13px;border:1px solid var(--line);border-radius:9px;padding:14px;margin:13px 0;break-inside:avoid}.step-index{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--brand);color:white;display:grid;place-items:center;font-weight:700}.step-content{min-width:0;flex:1}.step-content p{margin:0 0 8px;color:#475467}.technical{display:flex;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:10px;border-top:1px solid #f0f2f4;padding-top:7px}.technical span{max-width:100%}figure{margin:14px 0 0;text-align:center}figure img{max-width:100%;max-height:170mm;border:1px solid var(--line);border-radius:5px}figcaption{font-size:10px;color:var(--muted);margin-top:5px}.no-evidence{font-size:10px;color:var(--muted);font-style:italic;margin-top:10px}.toc li{margin:7px 0}.version-table{width:100%;border-collapse:collapse}.version-table th,.version-table td{border:1px solid var(--line);padding:8px;text-align:left}.version-table th{background:#f8fafc}.footer{border-top:1px solid var(--line);padding-top:9px;margin-top:24px;font-size:10px;color:var(--muted)}
@media print{body{background:#fff}.document{width:auto;margin:0;box-shadow:none}.page{min-height:auto;padding:0;break-after:page}.page:last-child{break-after:auto}figure img{max-height:165mm}}
</style>
</head>
<body>
<div class="document">
<section class="page cover"><div class="cover"><div class="brand">Manual de usuario · generado desde ejecución</div><h1>${esc(title)}</h1><p class="subtitle">Historia de usuario ${esc(id)}</p><div class="cover-table"><div><span class="label">Código</span><span>${esc(id)}</span></div><div><span class="label">Fecha de ejecución</span><span>${date(report.startedAt)}</span></div><div><span class="label">Finalización</span><span>${date(report.finishedAt)}</span></div><div><span class="label">Versión del esquema</span><span>${esc(report.schemaVersion || 'No especificada')}</span></div></div></div></section>
<section class="page"><h2>1. Información general</h2><div class="summary"><div class="metric"><span>Pasos</span><strong>${steps.length}</strong></div><div class="metric"><span>Evidencias</span><strong>${evidences.filter(e => e.dataUrl).length}</strong></div><div class="metric"><span>Resultado</span><strong>${esc(executionResult)}</strong></div></div><div class="callout"><strong>Objetivo.</strong><br>${esc(objective)}</div><h3>2. Precondiciones</h3><ul>${preconditions.map(item => `<li>${esc(item)}</li>`).join('')}</ul><h3>3. Alcance</h3><p>Este documento describe únicamente las acciones observadas y las evidencias capturadas durante la ejecución registrada. La información no disponible en la ejecución se identifica como no especificada.</p><h3>4. Tabla de contenido</h3><ol class="toc"><li>Información general</li><li>Precondiciones y alcance</li><li>Procedimiento</li><li>Resultado de ejecución</li><li>Evidencias</li><li>Control de cambios</li></ol></section>
<section class="page"><h2>5. Procedimiento</h2>${stepRows || '<p>No se registraron pasos de ejecución.</p>'}</section>
<section class="page"><h2>6. Resultado de la ejecución</h2><div class="callout"><strong>Resultado registrado:</strong> ${esc(executionResult)}</div><p>El resultado anterior corresponde al estado disponible en el archivo de ejecución. Si el reporte no contiene una validación funcional explícita, el resultado se presenta como <strong>No determinado</strong> y debe ser revisado antes de la aprobación del documento.</p><h2>7. Control de cambios</h2><table class="version-table"><thead><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Responsable</th></tr></thead><tbody><tr><td>1.0</td><td>${date(report.finishedAt)}</td><td>Generación inicial a partir de ejecución registrada.</td><td>No especificado</td></tr></tbody></table><div class="footer">Generado por Manual HU. Documento sujeto a revisión y aprobación antes de su publicación oficial.</div></section>
</div>
</body>
</html>`;

const destination = path.resolve(output);
fs.writeFileSync(destination, html, 'utf8');
console.log(`Manual generado: ${destination}`);
