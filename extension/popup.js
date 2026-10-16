const $ = (id) => document.getElementById(id);
const state = { recording: false, paused: false, count: 0, tabId: null, storyId: '', storyTitle: '' };

function showNotice(message, isError = false) {
  $('notice').textContent = message || '';
  $('notice').style.color = isError ? '#b42318' : '#0e7490';
}

function render() {
  $('statusText').textContent = state.recording ? 'Grabación iniciada' : 'Grabación detenida';
  $('stepCount').textContent = state.count + (state.count === 1 ? ' paso registrado' : ' pasos registrados');
  $('statusDot').className = 'dot' + (state.recording ? ' active' : '');
  $('startBtn').disabled = state.recording;
  $('pauseBtn').disabled = !state.recording;
  $('pauseBtn').textContent = state.paused ? 'Reanudar' : 'Pausar';
  $('finishBtn').disabled = !state.recording;
  $('storyId').disabled = state.recording;
  $('storyTitle').disabled = state.recording;
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error('No se encontró la pestaña activa.');
  const url = tab.url || '';
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('La pestaña activa no es HTTP/HTTPS. URL detectada: ' + (url || 'sin URL'));
  }
  return tab;
}

async function ensureContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'MANUAL_HU_GET_STATE' });
    if (response?.ok) return;
  } catch (_) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    } catch (injectError) {
      throw new Error('Chrome no permitió inyectar el grabador: ' + (injectError?.message || String(injectError)));
    }
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'MANUAL_HU_GET_STATE' });
      if (!response?.ok) throw new Error('El grabador no respondió después de la inyección.');
    } catch (secondError) {
      throw new Error('El grabador no respondió. Recarga la página y vuelve a intentarlo. Detalle: ' + (secondError?.message || String(secondError)));
    }
  }
}

async function sendToTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

function safeFilename(value, fallback = 'historia') {
  return (String(value || '').trim().replace(/[^a-z0-9_-]/gi, '_') || fallback).slice(0, 80);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function buildAiInput(report) {
  return {
    schemaVersion: '1.0',
    sourceSchemaVersion: report.schemaVersion || '1.2',
    generatedAt: new Date().toISOString(),
    story: report.story,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    steps: (report.steps || []).map((step) => ({
      step: step.step,
      action: step.action,
      humanAction: step.humanAction,
      detail: step.detail,
      pageTitle: step.pageTitle,
      element: step.element,
      elementType: step.elementType,
      selectorHint: step.selectorHint,
      timestamp: step.timestamp,
      hasEvidence: Boolean((report.evidences || []).some((evidence) => evidence.step === step.step))
    })),
    evidenceReferences: (report.evidences || []).map((evidence) => ({
      step: evidence.step,
      timestamp: evidence.timestamp,
      pageTitle: evidence.pageTitle,
      hasImage: Boolean(evidence.dataUrl)
    })),
    privacy: {
      typedValuesIncluded: false,
      screenshotsIncluded: false,
      note: 'Las imágenes y los valores digitados no forman parte de esta entrada segura para IA. La evidencia original permanece en el paquete de ejecución.'
    }
  };
}

$('startBtn').addEventListener('click', async () => {
  try {
    const storyId = $('storyId').value.trim();
    const storyTitle = $('storyTitle').value.trim();
    if (!storyId || !storyTitle) {
      showNotice('Escribe el identificador y el título de la historia.', true);
      return;
    }
    const tab = await activeTab();
    await ensureContentScript(tab.id);
    state.tabId = tab.id;
    state.storyId = storyId;
    state.storyTitle = storyTitle;
    await sendToTab(tab.id, { type: 'MANUAL_HU_START', storyId, storyTitle });
    state.recording = true;
    state.paused = false;
    state.count = 0;
    await chrome.storage.local.set({ currentRun: { ...state, startedAt: new Date().toISOString() } });
    showNotice('Grabación iniciada. El control seguirá visible sobre la página.');
    render();
  } catch (error) {
    console.error('Manual HU:', error);
    showNotice('ERROR: ' + (error?.message || String(error)), true);
    render();
  }
});

$('pauseBtn').addEventListener('click', async () => {
  try {
    state.paused = !state.paused;
    await sendToTab(state.tabId, { type: 'MANUAL_HU_PAUSE', paused: state.paused });
    await chrome.storage.local.set({ currentRun: state });
    showNotice(state.paused ? 'Grabación pausada.' : 'Grabación reanudada.');
    render();
  } catch (error) {
    showNotice('ERROR: ' + (error?.message || String(error)), true);
  }
});

$('finishBtn').addEventListener('click', async () => {
  try {
    const response = await sendToTab(state.tabId, { type: 'MANUAL_HU_STOP' });
    const stored = await chrome.storage.local.get('currentRun');
    const startedAt = stored.currentRun?.startedAt || null;
    const evidencesResponse = await chrome.runtime.sendMessage({ type: 'MANUAL_HU_GET_EVIDENCES' });
    const report = {
      schemaVersion: '1.2',
      product: 'Manual HU Chrome Recorder',
      story: { id: state.storyId, title: state.storyTitle },
      startedAt,
      finishedAt: new Date().toISOString(),
      steps: response?.steps || [],
      evidences: evidencesResponse?.evidences || []
    };

    const base = safeFilename(state.storyId);
    downloadJson(base + '-ejecucion.json', report);
    downloadJson(base + '-ia-input.json', buildAiInput(report));

    state.recording = false;
    state.paused = false;
    state.count = report.steps.length;
    await chrome.storage.local.remove('currentRun');
    await chrome.runtime.sendMessage({ type: 'MANUAL_HU_CLEAR_EVIDENCES' });
    showNotice('Paquete exportado: ejecución + entrada segura para IA. El manual HTML se genera desde el control de la página.');
    render();
  } catch (error) {
    showNotice('ERROR: ' + (error?.message || String(error)), true);
  }
});

$('clearBtn').addEventListener('click', async () => {
  if (state.recording && state.tabId) {
    try { await sendToTab(state.tabId, { type: 'MANUAL_HU_STOP' }); } catch (_) {}
  }
  Object.assign(state, { recording: false, paused: false, count: 0, tabId: null, storyId: '', storyTitle: '' });
  $('storyId').value = '';
  $('storyTitle').value = '';
  await chrome.storage.local.remove('currentRun');
  await chrome.runtime.sendMessage({ type: 'MANUAL_HU_CLEAR_EVIDENCES' }).catch(() => {});
  showNotice('Ejecución local limpiada.');
  render();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'MANUAL_HU_STEPS_UPDATED') {
    state.count = message.count || 0;
    render();
  }
  if (message?.type === 'MANUAL_HU_FINISHED') {
    state.recording = false;
    state.count = message.count || state.count;
    chrome.storage.local.remove('currentRun');
    render();
  }
});

render();