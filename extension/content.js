(() => {
  if (window.__manualHuRecorderInstalledV7) return;
  window.__manualHuRecorderInstalledV7 = true;

  const PDF_ENDPOINT = 'http://127.0.0.1:8787/generate-pdf';
  let recording = false;
  let paused = false;
  let steps = [];
  let story = { id: '', title: '' };
  let metadata = {};
  let toolbar = null;
  let lastClickSignature = '';
  let lastClickAt = 0;

  const sensitiveSelector = [
    'input[type="password"]','input[type="hidden"]','input[type="file"]',
    'input[autocomplete="current-password"]','input[autocomplete="new-password"]','input[autocomplete="one-time-code"]',
    '[data-sensitive="true"]','[data-private="true"]','[autocomplete="cc-number"]','[autocomplete="cc-csc"]'
  ].join(',');

  function isSensitive(el) {
    if (!(el instanceof Element)) return true;
    if (el.matches(sensitiveSelector) || el.closest(sensitiveSelector)) return true;
    const type = (el.getAttribute('type') || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    return ['password','hidden','file'].includes(type) || /pass(word)?|token|secret|credit.?card|cvv|cvc|ssn|documento|historia.?clinica/i.test(`${name} ${id}`) || ['current-password','new-password','cc-number','cc-csc','one-time-code'].includes(autocomplete);
  }
  function cleanText(value, max = 120) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max); }
  function visibleText(el) { return el instanceof Element ? cleanText(el.innerText || el.textContent || '') : ''; }
  function labelFor(el) {
    if (!(el instanceof Element)) return '';
    const aria = el.getAttribute('aria-label') || el.getAttribute('title');
    if (aria) return cleanText(aria);
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) { const node = document.getElementById(labelledBy); if (node?.innerText) return cleanText(node.innerText); }
    if (el.id) { try { const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (label?.innerText) return cleanText(label.innerText); } catch (_) {} }
    const wrapping = el.closest('label'); if (wrapping?.innerText) return cleanText(wrapping.innerText);
    const placeholder = el.getAttribute('placeholder'); if (placeholder) return cleanText(placeholder);
    const name = el.getAttribute('name'); if (name) return cleanText(name.replace(/[_-]+/g, ' '));
    const previous = el.previousElementSibling; if (previous?.innerText) return cleanText(previous.innerText);
    const parentText = el.parentElement ? visibleText(el.parentElement) : ''; return parentText && parentText.length <= 120 ? parentText : '';
  }
  function clickableLabel(el) {
    const label = labelFor(el); if (label && label.toLowerCase() !== el.tagName.toLowerCase()) return label;
    const dataLabel = el.getAttribute('data-label') || el.getAttribute('data-testid') || el.getAttribute('data-cy');
    if (dataLabel) return cleanText(dataLabel.replace(/[_-]+/g, ' '));
    const icon = el.querySelector('[aria-label],[title]'); if (icon) return cleanText(icon.getAttribute('aria-label') || icon.getAttribute('title'));
    return visibleText(el).slice(0, 100);
  }
  function selectorHint(el) {
    if (!(el instanceof Element)) return '';
    const parts = []; let current = el;
    for (let i = 0; i < 4 && current && current !== document.body; i++, current = current.parentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id) part += '#' + current.id;
      else if (typeof current.className === 'string' && current.className.trim()) part += '.' + current.className.trim().split(/\s+/).slice(0, 2).join('.');
      parts.unshift(part);
    }
    return parts.join(' > ').slice(0, 280);
  }
  function normalizeStepNumbering() { steps.forEach((item, index) => { item.step = index + 1; }); }
  function updateToolbar() { if (toolbar?.shadowRoot) toolbar.shadowRoot.querySelector('.count').textContent = `${steps.length} ${steps.length === 1 ? 'paso' : 'pasos'}`; }
  function removeToolbar() { toolbar?.remove(); toolbar = null; }
  function setToolbarVisibility(hidden) { if (toolbar) toolbar.style.visibility = hidden ? 'hidden' : 'visible'; }

  function addStep(action, target, detail, humanAction) {
    if (!recording || paused) return;
    const el = target instanceof Element ? target : null;
    if (!el || el.closest('#manual-hu-toolbar') || isSensitive(el)) return;
    const timestamp = new Date().toISOString();
    const element = labelFor(el) || clickableLabel(el) || 'Elemento de la pantalla';
    const step = { step: steps.length + 1, timestamp, action, humanAction: humanAction || detail, pageTitle: document.title.slice(0, 160), pageUrl: location.origin + location.pathname, element: element.slice(0, 120), elementType: (el.getAttribute('type') || el.tagName.toLowerCase()).slice(0, 40), selectorHint: selectorHint(el), detail: String(detail || '').slice(0, 240) };
    const previous = steps[steps.length - 1];
    if (previous && previous.action === action && previous.element === step.element && Date.parse(timestamp) - Date.parse(previous.timestamp) < 900) return;
    steps.push(step); updateToolbar();
    chrome.runtime.sendMessage({ type: 'MANUAL_HU_CAPTURE_STEP', step: { ...step, story } }).catch(() => {});
    chrome.runtime.sendMessage({ type: 'MANUAL_HU_STEPS_UPDATED', count: steps.length }).catch(() => {});
  }

  function createToolbar() {
    removeToolbar();
    toolbar = document.createElement('div'); toolbar.id = 'manual-hu-toolbar'; toolbar.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647';
    const shadow = toolbar.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>.box{background:#172033;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:12px Arial,sans-serif;display:flex;align-items:center;gap:10px;user-select:none}.title{display:flex;flex-direction:column;gap:3px;min-width:145px;cursor:move}.title b{font-size:13px}.story{opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}.status{display:flex;flex-direction:column;gap:3px;min-width:78px}.status-text{font-weight:700}.active{color:#86efac}.paused{color:#fbbf24}button{border:0;border-radius:7px;padding:8px 10px;font-weight:700;cursor:pointer;font-size:11px}.pause{background:#334155;color:#fff}.finish{background:#0e7490;color:#fff}.drag{font-size:9px;opacity:.5}</style><div class="box"><div class="title"><b>● Manual HU</b><span class="story"></span><span class="drag">↕ Arrastra para mover</span></div><div class="status"><span class="status-text active">Grabando</span><span class="count">0 pasos</span></div><button class="pause">Pausar</button><button class="finish">Finalizar y generar PDF</button></div>`;
    document.documentElement.appendChild(toolbar);
    shadow.querySelector('.story').textContent = `${story.id} · ${story.title}`;
    const pause = shadow.querySelector('.pause'); const finish = shadow.querySelector('.finish');
    pause.addEventListener('click', event => { event.stopPropagation(); paused = !paused; pause.textContent = paused ? 'Reanudar' : 'Pausar'; const status = shadow.querySelector('.status-text'); status.textContent = paused ? 'Pausado' : 'Grabando'; status.className = `status-text ${paused ? 'paused' : 'active'}`; });
    finish.addEventListener('click', event => { event.stopPropagation(); finishAndExport(); });
  }

  async function getEvidences() {
    try { return await new Promise(resolve => chrome.runtime.sendMessage({ type: 'MANUAL_HU_GET_EVIDENCES' }, response => resolve(response?.evidences || []))); } catch (_) { return []; }
  }
  function downloadBlob(filename, blob) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000); }

  async function finishAndExport() {
    if (!recording) return;
    recording = false; paused = false; normalizeStepNumbering();
    const finishedAt = new Date().toISOString(); const evidences = await getEvidences();
    const report = {
      schemaVersion: '1.4', product: 'Manual HU Chrome Recorder',
      document: { type: 'manual-usuario', status: 'draft', version: '01', aiReady: true },
      story: { id: story.id || 'HU-SIN-ID', title: story.title || document.title || 'Historia de usuario sin título' },
      metadata,
      startedAt: steps[0]?.timestamp || finishedAt, finishedAt,
      execution: { status: 'recorded', stepCount: steps.length, evidenceCount: evidences.filter(item => item.dataUrl).length },
      privacy: { typedValuesStored: false, sensitiveFieldsExcluded: true, screenshotsMayContainVisibleData: true },
      steps, evidences: evidences.map(({ step, timestamp, dataUrl, pageTitle }) => ({ step, timestamp, pageTitle, dataUrl }))
    };
    try {
      const response = await fetch(PDF_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
      if (!response.ok) { let message = `El servidor respondió HTTP ${response.status}.`; try { const error = await response.json(); if (error?.error) message = error.error; if (error?.reference) message += ` Referencia: ${error.reference}`; } catch (_) {} throw new Error(message); }
      const pdf = await response.blob(); const baseName = (story.id || 'historia').replace(/[^a-z0-9_-]/gi, '_') || 'historia';
      downloadBlob(`${baseName}-manual.pdf`, pdf); chrome.runtime.sendMessage({ type: 'MANUAL_HU_CLEAR_EVIDENCES' }).catch(() => {}); removeToolbar(); chrome.runtime.sendMessage({ type: 'MANUAL_HU_FINISHED', count: steps.length }).catch(() => {});
    } catch (error) { recording = true; console.error('Manual HU: no fue posible generar el PDF.', error); alert(`No fue posible generar el PDF. Verifique que el servidor esté activo en ${PDF_ENDPOINT}.\n\n${error.message}`); updateToolbar(); }
  }

  document.addEventListener('click', event => {
    if (!recording || paused) return; const target = event.target instanceof Element ? event.target : null; if (!target || target.closest('#manual-hu-toolbar')) return;
    const control = target.closest('input,textarea,select'); if (control && !['checkbox','radio'].includes((control.getAttribute('type') || '').toLowerCase())) return;
    const clickable = target.closest('button,a,[role="button"],[role="tab"],[role="menuitem"],[role="option"],[role="checkbox"],[role="radio"]'); if (!clickable || isSensitive(clickable)) return;
    const label = clickableLabel(clickable); if (!label) return; const signature = `${label}|${location.pathname}|${selectorHint(clickable)}`; const now = Date.now(); if (signature === lastClickSignature && now - lastClickAt < 500) return; lastClickSignature = signature; lastClickAt = now;
    addStep('click', clickable, `Clic realizado sobre ${label}.`, `Hacer clic en "${label}".`);
  }, true);

  document.addEventListener('change', event => {
    if (!recording || paused) return; const target = event.target; if (!(target instanceof Element) || target.closest('#manual-hu-toolbar') || isSensitive(target)) return;
    const tag = target.tagName.toLowerCase(); const type = (target.getAttribute('type') || '').toLowerCase(); const label = labelFor(target) || 'campo'; let detail = ''; let humanAction = '';
    if (tag === 'select') { const option = target.selectedOptions?.[0]; const optionText = option ? cleanText(option.textContent) : ''; detail = optionText ? `Opción seleccionada: ${optionText}` : 'Selección cambiada.'; humanAction = optionText ? `Seleccionar "${optionText}" en "${label}".` : `Cambiar la selección de "${label}".`; }
    else if (type === 'checkbox' || type === 'radio') { detail = target.checked ? `Marcado: ${label}` : `Desmarcado: ${label}`; humanAction = `${target.checked ? 'Marcar' : 'Desmarcar'} "${label}".`; }
    else if (tag === 'input' || tag === 'textarea') { detail = 'Campo completado; el contenido no se almacena.'; humanAction = `Completar el campo "${label}".`; }
    else return;
    addStep('change', target, detail, humanAction);
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'MANUAL_HU_START') {
      steps = []; story = { id: cleanText(message.storyId || message.story?.id), title: cleanText(message.storyTitle || message.story?.title) }; metadata = message.metadata || {};
      if (!story.id) story.id = 'HU-SIN-ID'; if (!story.title) story.title = document.title || 'Historia de usuario'; recording = true; paused = false; lastClickSignature = ''; lastClickAt = 0;
      createToolbar(); chrome.runtime.sendMessage({ type: 'MANUAL_HU_START_RUN', story, metadata }).catch(() => {}); sendResponse({ ok: true, count: 0, story });
    } else if (message?.type === 'MANUAL_HU_PAUSE') { paused = !!message.paused; sendResponse({ ok: true, paused }); }
    else if (message?.type === 'MANUAL_HU_GET_STATE') { sendResponse({ ok: true, recording, paused, count: steps.length }); }
    else if (message?.type === 'MANUAL_HU_STOP') { recording = false; paused = false; normalizeStepNumbering(); sendResponse({ ok: true, steps }); removeToolbar(); }
    else if (message?.type === 'MANUAL_HU_FINISH_AND_EXPORT') { finishAndExport(); sendResponse({ ok: true }); }
    else if (message?.type === 'MANUAL_HU_EVIDENCE_VISIBILITY') { setToolbarVisibility(!!message.hidden); sendResponse({ ok: true }); }
    return true;
  });
})();
