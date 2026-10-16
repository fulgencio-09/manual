const RUN_KEY = 'manualHuRun';
const MAX_EVIDENCES = 40;
const JPEG_QUALITY = 65;
let captureQueue = Promise.resolve();

async function getRun() {
  const data = await chrome.storage.local.get(RUN_KEY);
  return data[RUN_KEY] || { story: null, tabId: null, evidences: [] };
}

async function setRun(run) {
  await chrome.storage.local.set({ [RUN_KEY]: run });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === 'MANUAL_HU_START_RUN') {
      await setRun({ story: message.story || null, tabId: sender.tab?.id ?? null, startedAt: new Date().toISOString(), evidences: [] });
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === 'MANUAL_HU_CAPTURE_STEP') {
      const run = await getRun();
      if (!sender.tab?.id || (run.tabId !== null && sender.tab.id !== run.tabId)) {
        sendResponse({ ok: false, reason: 'run-tab-mismatch' });
        return;
      }
      if ((run.evidences || []).length >= MAX_EVIDENCES) {
        sendResponse({ ok: false, reason: 'evidence-limit' });
        return;
      }

      captureQueue = captureQueue.then(async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        const latestRun = await getRun();
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'jpeg', quality: JPEG_QUALITY });
        latestRun.tabId = sender.tab.id;
        latestRun.evidences = [...(latestRun.evidences || []), {
          step: message.step?.step,
          timestamp: message.step?.timestamp || new Date().toISOString(),
          pageTitle: message.step?.pageTitle || '',
          dataUrl
        }];
        await setRun(latestRun);
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
      await chrome.storage.local.remove(RUN_KEY);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, reason: 'unknown-message' });
  })().catch((error) => sendResponse({ ok: false, reason: String(error?.message || error) }));
  return true;
});
