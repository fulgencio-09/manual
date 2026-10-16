const RUN_KEY = 'manualHuRun';
const MAX_EVIDENCES = 40;
const JPEG_QUALITY = 65;
const PDF_ENDPOINT = 'http://127.0.0.1:8787/generate-pdf';
let captureQueue = Promise.resolve();

async function getRun() {
  const data = await chrome.storage.local.get(RUN_KEY);
  return data[RUN_KEY] || { story: null, tabId: null, steps: [], evidences: [] };
}

async function setRun(run) {
  await chrome.storage.local.set({ [RUN_KEY]: run });
}

async function setEvidenceVisibility(tabId, hidden) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'MANUAL_HU_EVIDENCE_VISIBILITY', hidden });
  } catch (_) {}
}

function safeName(value) {
  return String(value || 'historia').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'historia';
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function generatePdf(run) {
  const report = {
    schemaVersion: '1.3',
    product: 'Manual HU Chrome Recorder',
    document: { type: 'manual-usuario', status: 'draft', version: '1.0', aiReady: true },
    story: {
      id: run.story?.id || 'HU-SIN-ID',
      title: run.story?.title || 'Historia de usuario sin título'
    },
    startedAt: run.startedAt || run.steps?.[0]?.timestamp || new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    execution: {
      status: 'recorded',
      stepCount: run.steps?.length || 0,
      evidenceCount: (run.evidences || []).filter(x => x.dataUrl).length
    },
    privacy: {
      typedValuesStored: false,
      sensitiveFieldsExcluded: true,
      screenshotsMayContainVisibleData: true
    },
    steps: run.steps || [],
    evidences: run.evidences || []
  };

  const response = await fetch(PDF_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      detail = payload.error || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const filename = `${safeName(report.story.id)}-manual.pdf`;
  await chrome.downloads.download({
    url: `data:application/pdf;base64,${base64}`,
    filename,
    saveAs: true
  });
}

chrome.downloads.onCreated.addListener(async item => {
  const filename = String(item.filename || '').toLowerCase();
  if (!filename.endsWith('-ejecucion.json') && !filename.endsWith('-manual.html')) return;
  try {
    if (item.state === 'in_progress') await chrome.downloads.cancel(item.id);
  } catch (_) {}
  try {
    await chrome.downloads.erase({ id: item.id });
  } catch (_) {}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === 'MANUAL_HU_START_RUN') {
      await setRun({ story: message.story || null, tabId: sender.tab?.id ?? null, startedAt: new Date().toISOString(), steps: [], evidences: [] });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'MANUAL_HU_CAPTURE_STEP') {
      const run = await getRun();
      if (!sender.tab?.id || (run.tabId !== null && sender.tab.id !== run.tabId)) {
        sendResponse({ ok: false, reason: 'run-tab-mismatch' });
        return;
      }

      const step = message.step || null;
      if (step) {
        const exists = (run.steps || []).some(item => item.step === step.step && item.timestamp === step.timestamp);
        if (!exists) run.steps = [...(run.steps || []), step];
        await setRun(run);
      }

      if ((run.evidences || []).length >= MAX_EVIDENCES) {
        sendResponse({ ok: false, reason: 'evidence-limit' });
        return;
      }

      captureQueue = captureQueue.then(async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const latestRun = await getRun();
        await setEvidenceVisibility(sender.tab.id, true);
        await new Promise(resolve => setTimeout(resolve, 60));
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'jpeg', quality: JPEG_QUALITY });
          latestRun.tabId = sender.tab.id;
          latestRun.evidences = [...(latestRun.evidences || []), {
            step: message.step?.step,
            timestamp: message.step?.timestamp || new Date().toISOString(),
            pageTitle: message.step?.pageTitle || '',
            dataUrl
          }];
          await setRun(latestRun);
        } finally {
          await setEvidenceVisibility(sender.tab.id, false);
        }
      });

      try {
        await captureQueue;
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, reason: String(error?.message || error) });
      }
      return;
    }

    if (message?.type === 'MANUAL_HU_GET_EVIDENCES') {
      await captureQueue.catch(() => {});
      const run = await getRun();
      sendResponse({ ok: true, evidences: run.evidences || [] });
      return;
    }

    if (message?.type === 'MANUAL_HU_CLEAR_EVIDENCES') {
      await captureQueue.catch(() => {});
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'MANUAL_HU_FINISHED') {
      await captureQueue.catch(() => {});
      const run = await getRun();
      try {
        await generatePdf(run);
        console.log('Manual HU: PDF generado correctamente.');
      } catch (error) {
        console.error('Manual HU: no se pudo generar el PDF.', error);
        if (run.tabId) {
          try {
            await chrome.tabs.sendMessage(run.tabId, {
              type: 'MANUAL_HU_PDF_ERROR',
              message: String(error?.message || error)
            });
          } catch (_) {}
        }
      } finally {
        await chrome.storage.local.remove(RUN_KEY);
      }
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, reason: 'unknown-message' });
  })().catch((error) => sendResponse({ ok: false, reason: String(error?.message || error) }));
  return true;
});
