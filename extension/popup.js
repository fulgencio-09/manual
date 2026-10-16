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
  } catch (firstError) {
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

$('startBtn').addEventListener('click', async () => {
  try {
    const storyId = $('storyId').value.trim();
    const storyTitle = $('storyTitle').value.trim();
    if (!storyId || !storyTitle) { showNotice('Escribe el identificador y el título de la historia.', true); return; }
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
    const steps = response?.steps || [];
    const report = {
      schemaVersion: '1.0',
      product: 'Manual HU Chrome Recorder',
      story: { id: state.storyId, title: state.storyTitle },
      startedAt: (await chrome.storage.local.get('currentRun')).currentRun?.startedAt || null,
      finishedAt: new Date().toISOString(),
      steps
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.storyId.replace(/[^a-z0-9_-]/gi, '_') || 'historia') + '-ejecucion.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    state.recording = false;
    state.paused = false;
    state.count = steps.length;
    await chrome.storage.local.remove('currentRun');
    showNotice('JSON exportado con ' + steps.length + ' pasos.');
    render();
  } catch (error) {
    showNotice('ERROR: ' + (error?.message || String(error)), true);
  }
});

$('clearBtn').addEventListener('click', async () => {
  if (state.recording && state.tabId) {
    try { await sendToTab(state.tabId, { type: 'MANUAL_HU_STOP' }); } catch {}
  }
  Object.assign(state, { recording: false, paused: false, count: 0, tabId: null, storyId: '', storyTitle: '' });
  $('storyId').value = '';
  $('storyTitle').value = '';
  await chrome.storage.local.remove('currentRun');
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