(() => {
  if (window.__manualHuRecorderInstalled) return;
  window.__manualHuRecorderInstalled = true;

  let recording = false;
  let paused = false;
  let steps = [];
  let story = { id: '', title: '' };
  let lastInputAt = new WeakMap();
  let toolbar = null;

  const sensitiveSelector = [
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    'input[autocomplete="one-time-code"]',
    '[data-sensitive="true"]',
    '[data-private="true"]',
    '[autocomplete="cc-number"]',
    '[autocomplete="cc-csc"]'
  ].join(',');

  function isSensitive(el) {
    if (!(el instanceof Element)) return true;
    if (el.matches(sensitiveSelector) || el.closest(sensitiveSelector)) return true;
    const type = (el.getAttribute('type') || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    return ['password','hidden'].includes(type) ||
      /pass(word)?|token|secret|credit.?card|cvv|cvc|ssn|documento|historia.?clinica/i.test(name + ' ' + id) ||
      ['current-password','new-password','cc-number','cc-csc','one-time-code'].includes(autocomplete);
  }

  function labelFor(el) {
    if (!(el instanceof Element)) return '';
    const aria = el.getAttribute('aria-label') || el.getAttribute('title');
    if (aria) return aria.trim().slice(0, 120);
    if (el.id) {
      const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (label?.innerText) return label.innerText.trim().slice(0, 120);
    }
    const wrappingLabel = el.closest('label')?.innerText;
    if (wrappingLabel) return wrappingLabel.trim().slice(0, 120);
    return (el.innerText || el.getAttribute('placeholder') || el.tagName)
      .toString().trim().replace(/\s+/g, ' ').slice(0, 120);
  }

  function addStep(kind, target, detail = '') {
    if (!recording || paused) return;
    const el = target instanceof Element ? target : null;
    const now = new Date().toISOString();
    const path = el ? [el.tagName.toLowerCase(), el.id ? '#' + el.id : '', typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : ''].join('') : '';
    steps.push({
      step: steps.length + 1,
      timestamp: now,
      action: kind,
      pageTitle: document.title.slice(0, 160),
      pageUrl: location.origin + location.pathname,
      element: el ? labelFor(el) : '',
      elementType: el ? (el.getAttribute('type') || el.tagName.toLowerCase()).slice(0,40) : '',
      selectorHint: path.slice(0,160),
      detail: detail.slice(0,240)
    });
    updateToolbar();
  }

  function createToolbar() {
    if (toolbar) toolbar.remove();
    toolbar = document.createElement('div');
    toolbar.id = 'manual-hu-toolbar';
    toolbar.innerHTML = `
      <div class="mhu-title"><b>● Manual HU</b><span id="mhu-story"></span></div>
      <div class="mhu-status"><span id="mhu-status">Grabando</span><span id="mhu-count">0 pasos</span></div>
      <button id="mhu-pause" type="button">Pausar</button>
      <button id="mhu-finish" type="button">Finalizar y exportar</button>
    `;
    const shadow = toolbar.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{all:initial}
        .box{position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#172033;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:Arial,sans-serif;font-size:12px;display:flex;align-items:center;gap:10px;}
        .title{display:flex;flex-direction:column;gap:3px;min-width:145px}.title b{font-size:13px}.story{opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}.status{display:flex;flex-direction:column;gap:3px;min-width:78px}.status span:first-child{font-weight:700}.status span:last-child{opacity:.7}.active{color:#86efac}.paused{color:#fbbf24}.box button{border:0;border-radius:7px;padding:8px 10px;font-weight:700;cursor:pointer;font-size:11px}.pause{background:#334155;color:white}.finish{background:#0e7490;color:white}.box button:hover{filter:brightness(1.1)}
      </style>
      <div class="box">
        <div class="title"><b>● Manual HU</b><span class="story"></span></div>
        <div class="status"><span class="active status-text">Grabando</span><span class="count">0 pasos</span></div>
        <button class="pause" type="button">Pausar</button>
        <button class="finish" type="button">Finalizar y exportar</button>
      </div>`;
    document.documentElement.appendChild(toolbar);
    const root = shadow;
    root.querySelector('.story').textContent = story.id + ' · ' + story.title;
    root.querySelector('.pause').addEventListener('click', (e) => {
      e.stopPropagation();
      paused = !paused;
      root.querySelector('.pause').textContent = paused ? 'Reanudar' : 'Pausar';
      root.querySelector('.status-text').textContent = paused ? 'Pausado' : 'Grabando';
      root.querySelector('.status-text').className = paused ? 'paused status-text' : 'active status-text';
    });
    root.querySelector('.finish').addEventListener('click', (e) => {
      e.stopPropagation();
      finishAndExport();
    });
  }

  function updateToolbar() {
    if (!toolbar?.shadowRoot) return;
    toolbar.shadowRoot.querySelector('.count').textContent = steps.length + (steps.length === 1 ? ' paso' : ' pasos');
  }

  function removeToolbar() {
    toolbar?.remove();
    toolbar = null;
  }

  function finishAndExport() {
    if (!recording) return;
    recording = false;
    paused = false;
    const report = {
      schemaVersion: '1.0',
      product: 'Manual HU Chrome Recorder',
      story,
      startedAt: steps[0]?.timestamp || new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      steps
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (story.id.replace(/[^a-z0-9_-]/gi, '_') || 'historia') + '-ejecucion.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    removeToolbar();
    chrome.runtime.sendMessage({ type: 'MANUAL_HU_FINISHED', count: steps.length }).catch(() => {});
  }

  document.addEventListener('click', (event) => {
    if (!recording || paused) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('#manual-hu-toolbar')) return;
    const clickable = target?.closest('button,a,input[type="button"],input[type="submit"],[role="button"],[role="tab"],[role="menuitem"]') || target;
    if (isSensitive(clickable)) return;
    addStep('click', clickable, labelFor(clickable) || 'Clic en elemento');
  }, true);

  document.addEventListener('change', (event) => {
    if (!recording || paused) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('#manual-hu-toolbar') || isSensitive(target)) return;
    const tag = target.tagName.toLowerCase();
    const type = (target.getAttribute('type') || '').toLowerCase();
    let detail = '';
    if (tag === 'select') {
      const option = target.selectedOptions?.[0];
      detail = option ? 'Opción seleccionada: ' + (option.textContent || '').trim().slice(0,100) : 'Selección cambiada';
    } else if (type === 'checkbox' || type === 'radio') {
      detail = (target.checked ? 'Marcado: ' : 'Desmarcado: ') + labelFor(target);
    } else {
      detail = 'Campo completado';
    }
    addStep('change', target, detail);
  }, true);

  document.addEventListener('input', (event) => {
    if (!recording || paused) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('#manual-hu-toolbar') || isSensitive(target)) return;
    const tag = target.tagName.toLowerCase();
    const type = (target.getAttribute('type') || '').toLowerCase();
    if (tag !== 'textarea' && tag !== 'input') return;
    if (['checkbox','radio','button','submit','file','reset'].includes(type)) return;
    const now = Date.now();
    if (now - (lastInputAt.get(target) || 0) < 1200) return;
    lastInputAt.set(target, now);
    addStep('input', target, 'Se ingresó información en el campo; el contenido no se almacena.');
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'MANUAL_HU_START') {
      steps = [];
      story = { id: message.storyId || 'HU', title: message.storyTitle || 'Sin título' };
      recording = true;
      paused = false;
      createToolbar();
      sendResponse({ ok: true, count: 0 });
    } else if (message?.type === 'MANUAL_HU_PAUSE') {
      paused = !!message.paused;
      if (toolbar?.shadowRoot) {
        toolbar.shadowRoot.querySelector('.pause').textContent = paused ? 'Reanudar' : 'Pausar';
        toolbar.shadowRoot.querySelector('.status-text').textContent = paused ? 'Pausado' : 'Grabando';
      }
      sendResponse({ ok: true, paused });
    } else if (message?.type === 'MANUAL_HU_STOP') {
      recording = false;
      paused = false;
      sendResponse({ ok: true, steps });
    } else if (message?.type === 'MANUAL_HU_GET_STATE') {
      sendResponse({ ok: true, recording, paused, count: steps.length });
    }
    return true;
  });
})();