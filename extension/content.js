(() => {
  if (window.__manualHuRecorderInstalled) return;
  window.__manualHuRecorderInstalled = true;

  let recording = false;
  let paused = false;
  let steps = [];
  let lastInputAt = new WeakMap();

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
    return (el.innerText || el.value || el.getAttribute('placeholder') || el.tagName)
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
    chrome.runtime.sendMessage({ type: 'MANUAL_HU_STEPS_UPDATED', count: steps.length }).catch(() => {});
  }

  document.addEventListener('click', (event) => {
    if (!recording || paused) return;
    const target = event.target instanceof Element ? event.target.closest('button,a,input[type="button"],input[type="submit"],[role="button"],[role="tab"],[role="menuitem"]') || event.target : event.target;
    if (isSensitive(target)) return;
    addStep('click', target, labelFor(target) || 'Clic en elemento');
  }, true);

  document.addEventListener('change', (event) => {
    if (!recording || paused) return;
    const target = event.target;
    if (!(target instanceof Element) || isSensitive(target)) return;
    const tag = target.tagName.toLowerCase();
    const type = (target.getAttribute('type') || '').toLowerCase();
    let detail = '';
    if (tag === 'select') {
      const option = target.selectedOptions?.[0];
      detail = option ? 'Opción seleccionada: ' + (option.textContent || '').trim().slice(0,100) : 'Selección cambiada';
    } else if (type === 'checkbox' || type === 'radio') {
      detail = (target.checked ? 'Marcado: ' : 'Desmarcado: ') + labelFor(target);
    } else {
      detail = 'Campo completado'; // Intencionalmente nunca captura el valor escrito.
    }
    addStep('change', target, detail);
  }, true);

  document.addEventListener('input', (event) => {
    if (!recording || paused) return;
    const target = event.target;
    if (!(target instanceof Element) || isSensitive(target)) return;
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
      recording = true;
      paused = false;
      sendResponse({ ok: true, count: steps.length });
    } else if (message?.type === 'MANUAL_HU_PAUSE') {
      paused = !!message.paused;
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