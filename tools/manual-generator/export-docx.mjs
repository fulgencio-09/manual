import fs from 'node:fs';
import path from 'node:path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType } from 'docx';
import { loadModel } from './build-model.mjs';

const input = process.argv[2];
const output = process.argv[3] || 'manual-generado.docx';
const aiInput = process.argv[4] || null;
if (!input) {
  console.error('Uso: node export-docx.mjs <ejecucion.json> [salida.docx] [manual-ia.json]');
  process.exit(1);
}

const report = loadModel(input, aiInput);
const story = report.story || {};
const text = (v, fallback = 'No especificado') => String(v ?? '').trim() || fallback;
const date = (v) => v ? new Date(v).toLocaleString('es-CO') : 'No especificada';
const evidenceByStep = new Map(report.evidences.map((e) => [e.step, e]));
const imageBuffer = (dataUrl) => { const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl || ''); return match ? Buffer.from(match[2], 'base64') : null; };

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'MANUAL DE USUARIO', bold: true, size: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: text(story.title, 'Historia de usuario'), bold: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: `Código: ${text(story.id, 'HU-SIN-ID')}`, size: 22 })] }),
  new Paragraph({ text: '1. Información general', heading: HeadingLevel.HEADING_1 }),
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [['Código', text(story.id, 'HU-SIN-ID')], ['Título', text(story.title)], ['Inicio', date(report.startedAt)], ['Finalización', date(report.finishedAt)], ['Resultado', text(report.execution.result, 'No determinado')], ['Esquema', text(report.schemaVersion)]].map(([a,b]) => new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a, bold: true })] })] }), new TableCell({ children: [new Paragraph(b)] })] })) ) }),
  new Paragraph({ text: '2. Objetivo', heading: HeadingLevel.HEADING_1 }),
  new Paragraph(text(report.document.objective)),
  new Paragraph({ text: '3. Alcance', heading: HeadingLevel.HEADING_1 }),
  new Paragraph(text(report.document.scope)),
  new Paragraph({ text: '4. Precondiciones', heading: HeadingLevel.HEADING_1 }),
  ...(report.document.preconditions.length ? report.document.preconditions : ['No especificado']).map((p) => new Paragraph({ text: p, bullet: { level: 0 } })),
  new Paragraph({ text: '5. Resultado esperado', heading: HeadingLevel.HEADING_1 }),
  new Paragraph(text(report.document.expectedResult)),
  new Paragraph({ text: '6. Procedimiento', heading: HeadingLevel.HEADING_1 }),
];

for (let i = 0; i < report.steps.length; i += 1) {
  const step = report.steps[i];
  const ev = evidenceByStep.get(step.evidenceStep);
  children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${text(step.humanAction, 'Ejecutar acción.')}`, bold: true })], spacing: { before: 180 } }));
  children.push(new Paragraph(text(step.detail)));
  children.push(new Paragraph({ children: [new TextRun({ text: `Fuente: ${step.sourceSteps?.join(', ') || 'No determinada'} · Pantalla: ${text(step.pageTitle)} · Elemento: ${text(step.element)}`, italics: true, size: 18 })] }));
  if (step.expectedResult !== 'No especificado') children.push(new Paragraph(`Resultado esperado: ${step.expectedResult}`));
  const image = imageBuffer(ev?.dataUrl);
  if (image) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: image, transformation: { width: 560, height: 315 }, type: 'jpg' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Figura ${i + 1}. Evidencia asociada al paso fuente ${ev.step}.`, italics: true, size: 18 })] }));
  } else children.push(new Paragraph({ children: [new TextRun({ text: 'No se registró captura para este paso.', italics: true, size: 18 })] }));
}

children.push(new Paragraph({ text: '7. Resultado de la ejecución', heading: HeadingLevel.HEADING_1 }), new Paragraph(`Resultado: ${text(report.execution.result, 'No determinado')}`), new Paragraph(text(report.execution.justification)), new Paragraph({ text: '8. Observaciones', heading: HeadingLevel.HEADING_1 }), ...(report.document.observations.length ? report.document.observations : ['No especificado']).map((p) => new Paragraph({ text: p, bullet: { level: 0 } })), new Paragraph({ text: '9. Revisión', heading: HeadingLevel.HEADING_1 }), new Paragraph(report.review.requiresHumanValidation ? 'Requiere validación humana antes de publicación oficial.' : 'No se marcó validación humana obligatoria.'), ...(report.review.warnings.length ? report.review.warnings.map((w) => new Paragraph({ text: `Advertencia: ${w}`, bullet: { level: 0 } })) : []), new Paragraph({ spacing: { before: 500 }, children: [new TextRun({ text: 'Documento generado por Manual HU. Revisar y aprobar antes de su publicación oficial.', italics: true, size: 18 })] }));

const doc = new Document({ sections: [{ properties: {}, children }] });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(path.resolve(output), buffer);
console.log(`DOCX generado: ${path.resolve(output)}`);
