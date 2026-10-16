const $ = (id) => document.getElementById(id);
const state = { recording: false, paused: false, count: 0, tabId: null, storyId: '', storyTitle: '' };

function showNotice(message) { $('notice').textContent = message || ''; }
function render() {
  $('statusText').textContent = state.recording ? (state.paused ? 'Grabación pausada' : 'Grabación activa') : 'Grabación detenida';
  $('stepCount').textContent = state.count + (state.count === 1 ? ' paso registrado' : ' pasos registrados');
  $('statusDot').className = 'dot' + (state.recording ? (state.paused ? ' paused' : ' active') : '');
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
    throw new Error('Abre una página HTTP o HTTPS normal. Chrome no permite grabar páginas internas.');
  }
  return tab;
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
    state.tabId = tab.id;
    state.storyId = storyId;
    state.storyTitle = storyTitle;
    await sendToTab(tab.id, { type: 'MANUAL_HU_START' });
    state.recording = true;
    state.paused = false;
    state.count = 0;
    await chrome.storage.local.set({ currentRun: { ...state, startedAt: new Date().toISOString() } });
    showNotice('Grabación iniciada en la pestaña actual.');
    render();
  } catch (error) {
    showNotice('No se pudo iniciar. Recarga la página y prueba otra vez.');
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
    showNotice('No se pudo actualizar la grabación en la pestaña.');
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
    showNotice('No se pudo finalizar. Verifica que la pestaña original siga abierta y recárgala si es necesario.');
  }
});

$('clearBtn').addEventListener('click', async () => {
  if (state.recording) {
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
});

render();