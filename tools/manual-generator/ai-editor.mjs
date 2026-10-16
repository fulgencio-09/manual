#!/usr/bin/env node

import fs from 'node:fs/promises';
import process from 'node:process';

const inputPath = process.argv[2];
const outputPath = process.argv[3] || 'manual-ia.json';

if (!inputPath) {
  console.error('Uso: npm run ai -- <entrada-ia.json> [salida.json]');
  process.exit(1);
}

const endpoint = process.env.MANUAL_AI_ENDPOINT;
const token = process.env.MANUAL_AI_TOKEN;

if (!endpoint) {
  console.error('Falta MANUAL_AI_ENDPOINT. No se realiza ninguna llamada externa.');
  process.exit(2);
}

const source = JSON.parse(await fs.readFile(inputPath, 'utf8'));

const system = `Eres un editor documental para manuales de usuario basados en ejecución real.
Reglas obligatorias:
1. Usa únicamente la información recibida en el objeto fuente.
2. No inventes roles, permisos, módulos, reglas de negocio, resultados ni nombres.
3. Si un dato no está sustentado, escribe "No especificado" o "No determinado".
4. No reproduzcas valores digitados por el usuario.
5. Conserva la trazabilidad de cada paso mediante sourceSteps.
6. Puedes agrupar pasos redundantes, pero debes indicar todos los pasos origen.
7. Redacta las acciones de usuario en infinitivo y con lenguaje profesional.
8. Distingue hechos observados de interpretaciones.
9. Una evidencia gráfica no demuestra por sí sola que una prueba fue exitosa.
10. Devuelve exclusivamente JSON válido con la estructura document, execution, steps y review.`;

const user = JSON.stringify(source);

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  },
  body: JSON.stringify({ system, input: source })
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`El servicio de IA respondió ${response.status}: ${body.slice(0, 500)}`);
}

const payload = await response.json();
const result = payload.result ?? payload.output ?? payload;

if (!result || typeof result !== 'object' || Array.isArray(result)) {
  throw new Error('La respuesta de IA no contiene un objeto JSON válido.');
}

const normalized = {
  document: result.document ?? {},
  execution: result.execution ?? { result: 'No determinado', justification: 'No especificado' },
  steps: Array.isArray(result.steps) ? result.steps : [],
  review: result.review ?? { requiresHumanValidation: true, warnings: [] },
  metadata: {
    generatedAt: new Date().toISOString(),
    sourceFile: inputPath,
    sourceSchemaVersion: source.schemaVersion ?? 'No especificado'
  }
};

await fs.writeFile(outputPath, JSON.stringify(normalized, null, 2), 'utf8');
console.log(`Salida IA creada: ${outputPath}`);
