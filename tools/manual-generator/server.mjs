import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.MANUAL_PDF_PORT || 8787);
const MAX_BODY = 60 * 1024 * 1024;
const generatorDir = import.meta.dirname;

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function safeName(value) {
  return String(value || 'historia').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'historia';
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('La ejecución supera el límite de 60 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function generatePdf(report) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manual-hu-'));
  const inputPath = path.join(workDir, 'ejecucion.json');
  const outputPath = path.join(workDir, `${safeName(report?.story?.id)}-manual.pdf`);

  try {
    await fs.writeFile(inputPath, JSON.stringify(report), 'utf8');
    await execFileAsync(process.execPath, [
      path.join(generatorDir, 'export-pdf.mjs'),
      inputPath,
      outputPath
    ], { maxBuffer: 10 * 1024 * 1024 });
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method !== 'POST' || req.url !== '/generate-pdf') {
    return send(res, 404, JSON.stringify({ ok: false, error: 'Ruta no disponible.' }));
  }

  try {
    const report = JSON.parse(await readBody(req));
    if (!report?.story || !Array.isArray(report.steps)) {
      return send(res, 400, JSON.stringify({ ok: false, error: 'La ejecución no tiene el formato esperado.' }));
    }
    const pdf = await generatePdf(report);
    const filename = `${safeName(report.story.id)}-manual.pdf`;
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(pdf);
  } catch (error) {
    const id = crypto.randomUUID();
    console.error(`[${id}]`, error);
    send(res, 500, JSON.stringify({ ok: false, error: 'No fue posible generar el PDF.', reference: id }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Manual HU PDF server activo en http://127.0.0.1:${PORT}`);
  console.log('Endpoint: POST /generate-pdf');
});
