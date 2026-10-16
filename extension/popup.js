const $ = (id) => document.getElementById(id);
const state = { recording: false, paused: false, count: 0, tabId: null, storyId: '', storyTitle: '', metadata: {} };

function showNotice(message, isError = false) { $('notice').textContent = message || ''; $('notice').style.color = isError ? '#b42318' : '#0e7490'; }
function render() {
  $('statusText').textContent = state.recording ? 'Grabación iniciada' : 'Grabación detenida';
  $('stepCount').textContent = state.count + (state.count === 1 ? ' paso registrado' : ' pasos registrados');
  $('statusDot').className = 'dot' + (state.recording ? ' active' : ''); $('startBtn').disabled = state.recording; $('pauseBtn').disabled = !state.recording; $('pauseBtn').textContent = state.paused ? 'Reanudar' : 'Pausar'; $('finishBtn').disabled = !state.recording;
  ['storyId','storyTitle','systemName','module','process','dependency','classification'].forEach((id) => { if ($(id)) $(id).disabled = state.recording; });
}
async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true }); const tab = tabs[0]; if (!tab?.id) throw new Error('No se encontró la pestaña activa.');
  if (!/^https?:\/\//i.test(tab.url || '')) throw new Error('La pestaña activa no es HTTP/HTTPS.'); return tab;
}
async function ensureContentScript(tabId) {
  try { const response = await chrome.tabs.sendMessage(tabId, { type: 'MANUAL_HU_GET_STATE' }); if (response?.ok) return; }
  catch (_) {
    try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); }
    catch (error) { throw new Error('Chrome no permitió inyectar el grabador: ' + (error?.message || String(error))); }
    const response = await chrome.tabs.sendMessage(tabId, { type: 'MANUAL_HU_GET_STATE' }); if (!response?.ok) throw new Error('El grabador no respondió. Recarga la página.');
  }
}
async function sendToTab(tabId, message) { return chrome.tabs.sendMessage(tabId, message); }
function readMetadata() { return { systemName: $('systemName').value.trim(), module: $('module').value.trim(), process: $('process').value.trim(), dependency: $('dependency').value.trim(), classification: $('classification').value.trim() || 'No especificado' }; }

$('startBtn').addEventListener('click', async () => {
  try {
    const storyId = $('storyId').value.trim(); const storyTitle = $('storyTitle').value.trim(); if (!storyId || !storyTitle) { showNotice('Escribe el identificador y el título de la historia.', true); return; }
    const tab = await activeTab(); await ensureContentScript(tab.id); state.tabId = tab.id; state.storyId = storyId; state.storyTitle = storyTitle; state.metadata = readMetadata();
    await sendToTab(tab.id, { type: 'MANUAL_HU_START', storyId, storyTitle, metadata: state.metadata }); state.recording = true; state.paused = false; state.count = 0;
    await chrome.storage.local.set({ currentRun: { ...state, startedAt: new Date().toISOString() } }); showNotice('Grabación iniciada. El panel seguirá visible sobre la página.'); render();
  } catch (error) { console.error('Manual HU:', error); showNotice('ERROR: ' + (error?.message || String(error)), true); render(); }
});

$('pauseBtn').addEventListener('click', async () => {
  try { state.paused = !state.paused; await sendToTab(state.tabId, { type: 'MANUAL_HU_PAUSE', paused: state.paused }); await chrome.storage.local.set({ currentRun: state }); showNotice(state.paused ? 'Grabación pausada.' : 'Grabación reanudada.'); render(); }
  catch (error) { showNotice('ERROR: ' + (error?.message || String(error)), true); }
});

$('finishBtn').addEventListener('click', async () => {
  try { await sendToTab(state.tabId, { type: 'MANUAL_HU_FINISH_AND_EXPORT' }); showNotice('Generando PDF profesional...'); }
  catch (error) { showNotice('ERROR: ' + (error?.message || String(error)), true); }
});

$('clearBtn').addEventListener('click', async () => {
  if (state.recording && state.tabId) { try { await sendToTab(state.tabId, { type: 'MANUAL_HU_STOP' }); } catch {} }
  Object.assign(state, { recording: false, paused: false, count: 0, tabId: null, storyId: '', storyTitle: '', metadata: {} });
  ['storyId','storyTitle','systemName','module','process','dependency'].forEach((id) => { if ($(id)) $(id).value = ''; }); $('classification').value = '';
  await chrome.storage.local.remove('currentRun'); showNotice('Ejecución local limpiada.'); render();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'MANUAL_HU_STEPS_UPDATED') { state.count = message.count || 0; render(); }
  if (message?.type === 'MANUAL_HU_FINISHED') { state.recording = false; state.count = message.count || state.count; chrome.storage.local.remove('currentRun'); showNotice('PDF generado correctamente.'); render(); }
});
render();
