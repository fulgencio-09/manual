import fs from 'node:fs';
import path from 'node:path';
import { loadModel } from './build-model.mjs';

const input = process.argv[2];
const output = process.argv[3] || 'manual-generado.html';
const aiInput = process.argv[4] || null;
if (!input) {
  console.error('Uso: node generate.mjs <ejecucion.json> [salida.html] [manual-ia.json]');
  process.exit(1);
}

const report = loadModel(input, aiInput);
const story = report.story || {};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = (v, fallback = 'No especificado') => String(v ?? '').trim() || fallback;
const date = (v) => v ? new Date(v).toLocaleString('es-CO') : 'No especificada';
const evidenceByStep = new Map(report.evidences.map((e) => [e.step, e]));
const img = (dataUrl) => dataUrl ? `<img src="${esc(dataUrl)}" alt="Evidencia de ejecución">` : '<div class="no-evidence">No se registró captura para este paso.</div>';

const stepsHtml = report.steps.map((step, index) => {
  const ev = evidenceByStep.get(step.evidenceStep);
  const source = step.sourceSteps?.length ? `Fuente: paso${step.sourceSteps.length > 1 ? 's' : ''} ${step.sourceSteps.join(', ')}` : 'Fuente: No determinada';
  return `<article class="step"><div class="step-head"><span class="number">${index + 1}</span><h3>${esc(text(step.humanAction, 'Ejecutar acción.'))}</h3></div><p>${esc(text(step.detail))}</p><p class="meta">${esc(source)} · Pantalla: ${esc(text(step.pageTitle))} · Elemento: ${esc(text(step.element))}</p>${step.expectedResult && step.expectedResult !== 'No especificado' ? `<p><strong>Resultado esperado:</strong> ${esc(step.expectedResult)}</p>` : ''}<div class="evidence">${img(ev?.dataUrl)}${ev ? `<div class="caption">Evidencia asociada al paso ${esc(ev.step)}.</div>` : ''}</div></article>`;
}).join('');

const listHtml = (items) => items.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>No especificado.</p>';
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(text(story.title,'Manual de usuario'))}</title><style>
@page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#20242a;line-height:1.5;margin:0}.cover{min-height:250mm;display:flex;flex-direction:column;justify-content:center;text-align:center;border-bottom:3px solid #1f4e79}.cover h1{font-size:30px;margin:12px 0}.code{font-size:18px;color:#555}.section{break-before:page}h2{font-size:21px;border-bottom:2px solid #ddd;padding-bottom:6px}h3{font-size:16px;margin:0}.info{width:100%;border-collapse:collapse}.info td{border:1px solid #ddd;padding:8px}.info td:first-child{font-weight:bold;width:28%;background:#f5f6f8}.step{break-inside:avoid;border:1px solid #ddd;border-radius:8px;padding:12px;margin:0 0 14px}.step-head{display:flex;gap:10px;align-items:flex-start}.number{min-width:28px;height:28px;border-radius:50%;background:#1f4e79;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:bold}.meta{font-size:11px;color:#666}.evidence{margin-top:10px;text-align:center}.evidence img{max-width:100%;max-height:115mm;border:1px solid #ddd}.no-evidence{padding:14px;background:#f7f7f7;color:#666}.caption{font-size:11px;color:#666;margin-top:4px}.warning{padding:10px;border-left:4px solid #c77d00;background:#fff8e6}.footer{margin-top:25px;font-size:11px;color:#666}.toc li{margin:4px 0}@media print{a{color:inherit;text-decoration:none}}
</style></head><body>
<section class="cover"><div>MANUAL DE USUARIO</div><h1>${esc(text(story.title,'Historia de usuario'))}</h1><div class="code">${esc(text(story.id,'HU-SIN-ID'))}</div><p>Generado a partir de una ejecución registrada${report.aiApplied ? ' y una capa editorial de IA' : ''}.</p></section>
<section><h2>1. Información general</h2><table class="info"><tr><td>Código</td><td>${esc(text(story.id,'HU-SIN-ID'))}</td></tr><tr><td>Título</td><td>${esc(text(story.title))}</td></tr><tr><td>Inicio</td><td>${esc(date(report.startedAt))}</td></tr><tr><td>Finalización</td><td>${esc(date(report.finishedAt))}</td></tr><tr><td>Esquema</td><td>${esc(report.schemaVersion)}</td></tr><tr><td>Resultado</td><td>${esc(report.execution.result)}</td></tr></table></section>
<section><h2>2. Objetivo</h2><p>${esc(report.document.objective)}</p><h2>3. Alcance</h2><p>${esc(report.document.scope)}</p><h2>4. Precondiciones</h2>${listHtml(report.document.preconditions)}<h2>5. Resultado esperado</h2><p>${esc(report.document.expectedResult)}</p></section>
<section class="section"><h2>6. Procedimiento</h2>${stepsHtml || '<p>No se registraron pasos.</p>'}</section>
<section class="section"><h2>7. Resultado de la ejecución</h2><p><strong>${esc(report.execution.result)}</strong></p><p>${esc(report.execution.justification)}</p><h2>8. Observaciones</h2>${listHtml(report.document.observations)}<h2>9. Revisión</h2><p>${report.review.requiresHumanValidation ? 'Requiere validación humana antes de publicación oficial.' : 'No se marcó validación humana obligatoria.'}</p>${report.review.warnings.length ? `<div class="warning"><strong>Advertencias</strong>${listHtml(report.review.warnings)}</div>` : ''}<p class="footer">Documento generado por Manual HU. La ejecución original conserva la evidencia y trazabilidad de los pasos fuente.</p></section>
</body></html>`;
fs.writeFileSync(path.resolve(output), html, 'utf8');
console.log(`HTML generado: ${path.resolve(output)}`);
