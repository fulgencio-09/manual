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
const meta = report.metadata || {};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = (v, fallback = 'No especificado') => String(v ?? '').trim() || fallback;
const date = (v) => v ? new Date(v).toLocaleString('es-CO') : 'No especificada';
const evidenceByStep = new Map(report.evidences.map((e) => [e.step, e]));
const evidences = report.evidences.filter((e) => e.dataUrl);

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 470 92" role="img" aria-label="Fiscalía General de la Nación"><rect width="470" height="92" fill="white"/><g transform="translate(5 9)"><rect width="70" height="70" rx="3" fill="#f1c40f" stroke="#123f73" stroke-width="5"/><path d="M35 9v54M9 35h52" stroke="#123f73" stroke-width="13"/><rect x="27" y="25" width="16" height="20" fill="#fff"/></g><text x="88" y="40" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="700" fill="#1d5b9a">FISCALÍA</text><text x="88" y="68" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="700" fill="#333">GENERAL DE LA NACIÓN</text></svg>`;

const header = `<header class="doc-header"><div class="brand">${logoSvg}</div><div class="header-title"><strong>[NOMBRE DEL PROCESO]</strong><span>MANUAL DE USUARIO – ${esc(text(meta.systemName, text(story.title, '[NOMBRE DEL SISTEMA]')))}</span></div><div class="header-meta"><div>Código: ${esc(text(story.id, 'Por asignar'))}</div><div>Versión: 01</div><div>Manual HU</div></div></header>`;
const footer = `<footer class="doc-footer">Este documento es copia del original que reposa en la Intranet. Su impresión o descarga se considera una Copia No Controlada.</footer>`;

const listHtml = (items, fallback = 'No especificado.') => items?.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p>${esc(fallback)}</p>`;
const table = (headers, rows, className = '') => `<table class="grid ${className}"><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const evidenceImage = (ev, caption) => ev?.dataUrl
  ? `<figure class="figure"><img src="${esc(ev.dataUrl)}" alt="Evidencia de ejecución"><figcaption>${esc(caption)}</figcaption></figure>`
  : `<div class="capture-placeholder">[ CAPTURA DE PANTALLA ]<small>${esc(caption)}<br>Oculte datos personales, credenciales e información reservada.</small></div>`;

const firstEvidence = evidences[0];
const mainPageEvidence = evidences.find((e) => e.pageTitle && e.pageTitle !== firstEvidence?.pageTitle) || firstEvidence;
const uniqueElements = [...new Map(report.steps.filter((s) => s.element && s.element !== 'No especificado').map((s) => [s.element, s])).values()].slice(0, 8);
const fieldSteps = report.steps.filter((s) => s.action === 'change');

const procedureRows = report.steps.map((step, index) => {
  const ev = evidenceByStep.get(step.evidenceStep);
  const source = step.sourceSteps?.length ? `Fuente: paso${step.sourceSteps.length > 1 ? 's' : ''} ${step.sourceSteps.join(', ')}` : 'Fuente: No determinada';
  return `<article class="procedure-step"><div class="step-number">${index + 1}</div><div class="step-content"><h3>${esc(text(step.humanAction, 'Ejecutar acción.'))}</h3><p>${esc(text(step.detail))}</p><div class="source">${esc(source)} · Pantalla: ${esc(text(step.pageTitle))}</div>${step.expectedResult && step.expectedResult !== 'No especificado' ? `<p><strong>Resultado esperado:</strong> ${esc(step.expectedResult)}</p>` : ''}${ev ? evidenceImage(ev, `Figura ${index + 1}. Evidencia asociada al paso ${step.step}.`) : ''}</div></article>`;
}).join('');

const contentRows = [
  ['1.', 'Objetivo y alcance', '3'],
  ['2.', 'Usuarios y permisos', '3'],
  ['3.', 'Acceso al sistema', '3'],
  ['3.1', 'Ingreso', '3'],
  ['3.2', 'Salida', '4'],
  ['4.', 'Pantalla principal', '4'],
  ['5.', 'Funcionalidades', '4'],
  ['5.1', text(story.title, '[Nombre de la funcionalidad]'), '4'],
  ['6.', 'Glosario', '5'],
  ['7.', 'Elaboración, revisión y aprobación', '5'],
].map((r) => r.map(esc));

const generalRows = [
  ['Proceso', esc(meta.process)],
  ['Dependencia responsable', esc(meta.dependency)],
  ['Fecha de emisión', esc(meta.issueDate)],
  ['Clasificación de la información', esc(meta.classification)],
];

const accessRows = [
  ['Dirección web', esc(meta.accessUrl)],
  ['Red', esc(meta.network)],
  ['Credenciales', esc(meta.authentication)],
];

const roleRows = [['Rol', 'Qué puede hacer en el sistema'], ['No especificado', 'No determinado']];
const functionalityRows = [
  ['Ruta', esc(meta.module)],
  ['Para qué sirve', esc(report.document.objective)],
  ['Rol autorizado', 'No especificado'],
  ['Antes de empezar', report.document.preconditions.length ? report.document.preconditions.map(esc).join('<br>') : 'No especificado'],
  ['Restricciones', report.document.observations.length ? report.document.observations.map(esc).join('<br>') : 'No especificado'],
];
const fieldRows = fieldSteps.length
  ? fieldSteps.map((step) => [esc(text(step.element)), 'No determinado', esc(text(step.detail))])
  : [['No especificado', 'No determinado', 'No especificado']];
const glossaryRows = [
  ['Historia de usuario', 'Unidad funcional que origina la ejecución documentada.'],
  ['Evidencia', 'Captura visible asociada a un paso registrado durante la ejecución.'],
  ['No especificado', 'Información que no fue proporcionada o no pudo determinarse a partir de la ejecución.'],
];
const approvalRows = [
  ['Nombre', esc(meta.elaboratedBy), esc(meta.reviewedBy), esc(meta.approvedBy)],
  ['Cargo', esc(meta.elaboratedRole), esc(meta.reviewedRole), esc(meta.approvedRole)],
  ['Fecha', esc(meta.issueDate), 'No especificada', 'No especificada'],
];

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(text(story.title, 'Manual de Usuario'))}</title><style>
@page{size:A4;margin:23mm 13mm 18mm 13mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:0;font-size:11px;line-height:1.42}.doc-header{position:fixed;top:-18mm;left:0;right:0;height:18mm;display:grid;grid-template-columns:31% 54% 15%;align-items:stretch;border-bottom:2px solid #4f86b7;background:#fff}.brand{display:flex;align-items:center;padding:2px 8px}.brand svg{width:100%;height:15mm}.header-title{background:#5e91bd;color:#fff;text-align:center;display:flex;flex-direction:column;justify-content:center;font-size:9px;line-height:1.15;padding:2px 5px}.header-title strong{font-size:8px}.header-title span{font-weight:700}.header-meta{background:#5e91bd;color:#fff;padding:3px 5px;font-size:8px;line-height:1.35}.doc-footer{position:fixed;bottom:-13mm;left:0;right:0;text-align:center;font-size:7.5px;color:#777;border-top:1px solid #ddd;padding-top:3px}.cover{min-height:245mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.cover h1{font-size:29px;color:#075b9c;margin:10px 0 5px}.cover h2{font-size:20px;color:#252f3a;margin:0 0 5px}.cover .module{font-size:13px;color:#777;margin-bottom:30px}.grid{width:100%;border-collapse:collapse;margin:9px 0 16px}.grid th{background:#075b9c;color:#fff;font-weight:700;text-align:left;border:1px solid #174f7c;padding:5px 7px}.grid td{border:1px solid #333;padding:5px 7px;vertical-align:top}.grid td:first-child{font-weight:700;background:#e9eef3}.info td:first-child{width:36%}.section{break-before:auto;margin-top:16px}.page-break{break-before:page}.section-title{font-size:20px;color:#075b9c;margin:0 0 10px;border-bottom:0}.sub-title{font-size:16px;color:#075b9c;margin:14px 0 7px}.lead strong{font-weight:700}.toc{margin-top:12px}.toc td{border:0;border-bottom:1px dotted #777;padding:5px 2px}.toc td:last-child{text-align:right;width:35px}.capture-placeholder{height:72mm;border:2px dashed #b7c1cb;background:#f4f7fa;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:#8a949d;font-size:15px;margin:10px 0}.capture-placeholder small{font-size:9px;margin-top:7px;max-width:80%}.figure{margin:10px 0 14px;text-align:center;break-inside:avoid}.figure img{max-width:100%;max-height:92mm;border:1px solid #aeb7c1}.figure figcaption{font-size:9px;color:#777;font-style:italic;margin-top:3px}.procedure-step{display:flex;gap:10px;break-inside:avoid;margin:8px 0;border:0}.step-number{width:25px;height:25px;flex:0 0 25px;border-radius:50%;background:#075b9c;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}.step-content{flex:1}.step-content h3{font-size:12px;margin:0 0 3px}.step-content p{margin:3px 0}.source{font-size:8.5px;color:#777}.warning{background:#fff5dc;border-left:4px solid #d58b00;padding:7px;margin:8px 0}.muted{color:#777}.approval th{text-align:center}.approval td{text-align:center}.no-break{break-inside:avoid}.small{font-size:9px}.footer-note{font-size:8px;color:#777;margin-top:12px}@media print{a{color:inherit;text-decoration:none}}
</style></head><body>${header}${footer}
<section class="cover"><div style="font-size:14px;color:#777">MANUAL DE USUARIO</div><h1>${esc(text(meta.systemName, '[NOMBRE DEL SISTEMA DE INFORMACIÓN]'))}</h1><h2>${esc(text(story.title, '[NOMBRE DE LA HISTORIA / FUNCIONALIDAD]'))}</h2><div class="module">Módulo: ${esc(meta.module)} · Versión del sistema: ${esc(meta.systemVersion)}</div>${table(['Campo','Detalle'], generalRows, 'info')}</section>
<section class="page-break"><h2 class="section-title">Control de cambios</h2>${table(['Versión','Fecha','Descripción del cambio'], [['01', esc(meta.issueDate), 'Creación del documento a partir de una ejecución registrada.']])}<h2 class="section-title">Contenido</h2><table class="toc">${contentRows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></section>
<section class="page-break"><h2 class="section-title">1. Objetivo y alcance</h2><p><strong>Objetivo:</strong> ${esc(report.document.objective)}</p><p><strong>Alcance:</strong> ${esc(report.document.scope)}</p><p><strong>Documentos de referencia:</strong> No especificado.</p><h2 class="section-title">2. Usuarios y permisos</h2><p>Registre los roles según la configuración real del sistema, validada con el responsable funcional.</p>${table(['Rol','Qué puede hacer en el sistema'], roleRows.slice(1).map((r) => r.map(esc)))}<h2 class="section-title">3. Acceso al sistema</h2>${table(['Requisito','Detalle'], accessRows)}<h3 class="sub-title">3.1 Ingreso</h3><p><strong>Paso 1.</strong> Abra la dirección observada del sistema, cuando corresponda.</p><p><strong>Paso 2.</strong> Realice el mecanismo de autenticación definido para su perfil.</p><p><strong>Paso 3.</strong> Verifique que se muestra la pantalla principal de acuerdo con su rol.</p>${evidenceImage(firstEvidence, 'Figura 1. Evidencia inicial de la ejecución. Oculte datos personales, credenciales e información reservada.')}</section>
<section class="page-break"><h3 class="sub-title">3.2 Salida</h3><p>Seleccione la opción de cierre de sesión cuando esté disponible y cierre siempre la sesión al terminar, especialmente en equipos compartidos.</p><h2 class="section-title">4. Pantalla principal</h2><p>La captura corresponde a la evidencia disponible durante la ejecución. Los elementos que no fueron identificados de manera explícita se mantienen como <strong>No especificado</strong>.</p>${evidenceImage(mainPageEvidence, 'Figura 2. Pantalla observada durante la ejecución. Oculte datos personales, credenciales e información reservada.')}${table(['N.º','Elemento','Para qué sirve'], uniqueElements.length ? uniqueElements.map((s, i) => [String(i + 1), esc(text(s.element)), 'No determinado']) : [['1','No especificado','No determinado']])}<h2 class="section-title">5. Funcionalidades</h2><p>La funcionalidad documentada corresponde a la historia de usuario ejecutada.</p><h3 class="sub-title">5.1 ${esc(text(story.title, '[Nombre de la funcionalidad]'))}</h3>${table(['Campo','Detalle'], functionalityRows)}</section>
<section class="page-break"><h3 class="sub-title">Pasos</h3>${procedureRows || '<p>No se registraron pasos.</p>'}<h3 class="sub-title">Campos del formulario</h3>${table(['Campo','Obligatorio','Formato o regla'], fieldRows)}<h2 class="section-title">6. Glosario</h2>${table(['Término','Definición'], glossaryRows.map((r) => r.map(esc)))}<h2 class="section-title">7. Elaboración, revisión y aprobación</h2>${table(['','Elaboró','Revisó','Aprobó'], approvalRows, 'approval')}<p class="footer-note">Resultado de la ejecución: <strong>${esc(report.execution.result)}</strong>. ${esc(report.execution.justification)}</p>${report.review.warnings.length ? `<div class="warning"><strong>Advertencias:</strong>${listHtml(report.review.warnings)}</div>` : ''}<p class="footer-note">Documento generado automáticamente por Manual HU. Las evidencias corresponden a capturas visibles durante la ejecución. El contenido debe ser revisado y aprobado antes de su publicación oficial.</p></section>
</body></html>`;

fs.writeFileSync(path.resolve(output), html, 'utf8');
console.log(`HTML generado: ${path.resolve(output)}`);
