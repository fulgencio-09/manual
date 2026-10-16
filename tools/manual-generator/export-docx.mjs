import fs from 'node:fs';
import path from 'node:path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType } from 'docx';

const input = process.argv[2];
const output = process.argv[3] || 'manual-generado.docx';
if (!input) {
  console.error('Uso: node export-docx.mjs <ejecucion.json> [salida.docx]');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
const story = report.story || {};
const steps = Array.isArray(report.steps) ? report.steps : [];
const evidences = Array.isArray(report.evidences) ? report.evidences : [];
const evidenceByStep = new Map(evidences.map((e) => [e.step, e]));
const text = (v, fallback = 'No especificado') => String(v ?? '').trim() || fallback;
const date = (v) => v ? new Date(v).toLocaleString('es-CO') : 'No especificada';
const imageBuffer = (dataUrl) => {
  const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl || '');
  return match ? Buffer.from(match[2], 'base64') : null;
};

const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 }, children: [new TextRun({ text: 'MANUAL DE USUARIO', bold: true, size: 30 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: text(story.title, 'Historia de usuario'), bold: true, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: `Código: ${text(story.id, 'HU-SIN-ID')}`, size: 22 })] }),
  new Paragraph({ text: '1. Información general', heading: HeadingLevel.HEADING_1 }),
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    ['Código', text(story.id, 'HU-SIN-ID')],
    ['Título', text(story.title, 'No especificado')],
    ['Inicio', date(report.startedAt)],
    ['Finalización', date(report.finishedAt)],
    ['Resultado', text(report.execution?.result, 'No determinado')],
    ['Esquema', text(report.schemaVersion)],
  ].map(([a,b]) => new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a, bold: true })] })] }), new TableCell({ children: [new Paragraph(b)] })] })) ) }),
  new Paragraph({ text: '2. Objetivo', heading: HeadingLevel.HEADING_1 }),
  new Paragraph(text(report.document?.objective, 'Describir de forma clara y ordenada el procedimiento observado durante la ejecución registrada.')),
  new Paragraph({ text: '3. Precondiciones', heading: HeadingLevel.HEADING_1 }),
  ...(Array.isArray(report.document?.preconditions) && report.document.preconditions.length ? report.document.preconditions : ['Usuario con acceso al sistema y permisos requeridos para ejecutar la funcionalidad.', 'Información de prueba disponible para realizar la ejecución.']).map((p) => new Paragraph({ text: p, bullet: { level: 0 } })),
  new Paragraph({ text: '4. Procedimiento', heading: HeadingLevel.HEADING_1 }),
];

for (let i = 0; i < steps.length; i += 1) {
  const step = steps[i];
  const ev = evidenceByStep.get(step.step);
  children.push(new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${text(step.humanAction || step.detail, 'Ejecutar acción.')}`, bold: true })], spacing: { before: 180 } }));
  children.push(new Paragraph(text(step.detail, 'No se registró detalle adicional.')));
  children.push(new Paragraph({ children: [new TextRun({ text: `Pantalla: ${text(step.pageTitle)} · Elemento: ${text(step.element)} · Acción: ${text(step.action)}`, italics: true, size: 18 })] }));
  const image = imageBuffer(ev?.dataUrl);
  if (image) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: image, transformation: { width: 560, height: 315 }, type: 'jpg' })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Figura ${i + 1}. Evidencia de ejecución.`, italics: true, size: 18 })] }));
  } else {
    children.push(new Paragraph({ children: [new TextRun({ text: 'No se registró captura para este paso.', italics: true, size: 18 })] }));
  }
}

children.push(
  new Paragraph({ text: '5. Resultado de la ejecución', heading: HeadingLevel.HEADING_1 }),
  new Paragraph(`Resultado registrado: ${text(report.execution?.result, 'No determinado')}`),
  new Paragraph('Si el archivo de ejecución no contiene una validación funcional explícita, el resultado debe ser revisado antes de aprobar el documento.'),
  new Paragraph({ text: '6. Control de cambios', heading: HeadingLevel.HEADING_1 }),
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    ['Versión', 'Fecha', 'Descripción', 'Responsable'],
    ['1.0', date(report.finishedAt), 'Generación inicial a partir de ejecución registrada.', 'No especificado'],
  ].map((row) => new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph(cell)] })) })) }),
  new Paragraph({ spacing: { before: 500 }, children: [new TextRun({ text: 'Documento generado por Manual HU. Revisar y aprobar antes de su publicación oficial.', italics: true, size: 18 })] }),
);

const doc = new Document({ sections: [{ properties: {}, children }] });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(path.resolve(output), buffer);
console.log(`DOCX generado: ${path.resolve(output)}`);
