const $ = (id) => document.getElementById(id);
const state = { recording: false, paused: false, count: 0, tabId: null, storyId: '', storyTitle: '' };

function showNotice(message) { $('notice').textContent = message || ''; }
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
  if (!tab?.id || !/^https?:/.test(tab.url || '')) {
    throw new Error('Abre una página HTTP o HTTPS normal.');
  }
  return tab;
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'MANUAL_HU_GET_STATE' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  }
}

async function sendToTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

$('startBtn').addEventListener('click', async () => {
  try {
    const storyId = $('storyId').value.trim();
    const storyTitle = $('storyTitle').value.trim();
    if (!storyId || !storyTitle) { showNotice('Escribe el identificador y el título de la historia.'); return; }
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
    console.error(error);
    showNotice('No se pudo iniciar. Revisa que sea una página web HTTP/HTTPS y que la extensión tenga permisos.');
  }
});

$('pauseBtn').addEventListener('click', async () => {
  try {
    state.paused = !state.paused;
    await sendToTab(state.tabId, { type: 'MANUAL_HU_PAUSE', paused: state.paused });
    await chrome.storage.local.set({ currentRun: state });
    showNotice(state.paused ? 'Grabación pausada.' : 'Grabación reanudada.');
    render();
  } catch {
    showNotice('El control de la grabación está ahora en la página.');
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
  } catch {
    showNotice('Ahora puedes finalizar desde la barra flotante de la página.');
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