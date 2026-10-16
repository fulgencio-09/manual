import fs from 'node:fs';
import path from 'node:path';

const text = (value, fallback = 'No especificado') => String(value ?? '').trim() || fallback;
const list = (value) => Array.isArray(value) ? value.filter((item) => String(item ?? '').trim()) : [];

export function loadModel(sourcePath, aiPath = null) {
  const source = JSON.parse(fs.readFileSync(path.resolve(sourcePath), 'utf8'));
  const ai = aiPath ? JSON.parse(fs.readFileSync(path.resolve(aiPath), 'utf8')) : null;
  const sourceSteps = Array.isArray(source.steps) ? source.steps : [];
  const sourceById = new Map(sourceSteps.map((step) => [step.step, step]));

  const aiSteps = Array.isArray(ai?.steps) ? ai.steps : [];
  const steps = aiSteps.length
    ? aiSteps.map((item, index) => {
        const ids = Array.isArray(item.sourceSteps) ? item.sourceSteps : [];
        const originals = ids.map((id) => sourceById.get(id)).filter(Boolean);
        const primary = originals[0] || sourceSteps[index] || {};
        const evidenceStep = item.evidenceStep ?? primary.step;
        return {
          step: primary.step ?? index + 1,
          sourceSteps: ids.length ? ids : (primary.step != null ? [primary.step] : []),
          humanAction: text(item.title, text(primary.humanAction, text(primary.detail, 'Ejecutar acción.'))),
          detail: text(item.description, text(primary.detail)),
          expectedResult: text(item.expectedResult),
          pageTitle: text(primary.pageTitle),
          pageUrl: text(primary.pageUrl),
          element: text(primary.element),
          action: text(primary.action),
          evidenceStep,
        };
      })
    : sourceSteps.map((step) => ({
        ...step,
        humanAction: text(step.humanAction, text(step.detail, 'Ejecutar acción.')),
        detail: text(step.detail),
        expectedResult: 'No especificado',
        sourceSteps: step.step != null ? [step.step] : [],
        evidenceStep: step.step,
      }));

  const document = ai?.document || {};
  const execution = ai?.execution || {};
  const review = ai?.review || {};
  const sourceResult = source.execution?.result;

  return {
    schemaVersion: text(source.schemaVersion),
    story: source.story || {},
    startedAt: source.startedAt,
    finishedAt: source.finishedAt,
    steps,
    evidences: Array.isArray(source.evidences) ? source.evidences : [],
    document: {
      objective: text(document.objective, 'Describir de forma clara y ordenada el procedimiento observado durante la ejecución registrada.'),
      scope: text(document.scope),
      preconditions: list(document.preconditions),
      expectedResult: text(document.expectedResult),
      observations: list(document.observations),
    },
    execution: {
      result: text(execution.result, text(sourceResult, 'No determinado')),
      justification: text(execution.justification),
    },
    review: {
      requiresHumanValidation: review.requiresHumanValidation !== false,
      warnings: list(review.warnings),
    },
    aiApplied: Boolean(ai),
  };
}
