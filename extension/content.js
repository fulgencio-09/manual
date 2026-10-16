(() => {
  if (window.__manualHuRecorderInstalled) return;
  window.__manualHuRecorderInstalled = true;

  let recording = false;
  let paused = false;
  let steps = [];
  let story = { id: '', title: '' };
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
    return ['password', 'hidden'].includes(type) ||
      /pass(word)?|token|secret|credit.?card|cvv|cvc|ssn|documento|historia.?clinica/i.test(name + ' ' + id) ||
      ['current-password', 'new-password', 'cc-number', 'cc-csc', 'one-time-code'].includes(autocomplete);
  }

  function labelFor(el) {
    if (!(el instanceof Element)) return '';
    const aria = el.getAttribute('aria-label') || el.getAttribute('title');
    if (aria) return aria.trim().replace(/\s+/g, ' ').slice(0, 120);
    if (el.id) {
      const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (label?.innerText) return label.innerText.trim().replace(/\s+/g, ' ').slice(0, 120);
    }
    const wrappingLabel = el.closest('label')?.innerText;
    if (wrappingLabel) return wrappingLabel.trim().replace(/\s+/g, ' ').slice(0, 120);
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder.trim().replace(/\s+/g, ' ').slice(0, 120);
    const text = el.innerText || '';
    if (text.trim()) return text.trim().replace(/\s+/g, ' ').slice(0, 120);
    return el.tagName.toLowerCase();
  }

  function selectorHint(el) {
    if (!(el instanceof Element)) return '';
    const parts = [];
    let current = el;
    for (let i = 0; i < 3 && current && current !== document.body; i++, current = current.parentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id) part += '#' + current.id;
      else if (typeof current.className === 'string' && current.className.trim()) {
        part += '.' + current.className.trim().split(/\s+/).slice(0, 2).join('.');
      }
      parts.unshift(part);
    }
    return parts.join(' > ').slice(0, 240);
  }

  function addStep(action, target, detail = '', humanAction = '') {
    if (!recording || paused) return;
    const el = target instanceof Element ? target : null;
    if (!el || el === document.documentElement || el === document.body) return;
    const now = new Date().toISOString();
    const element = labelFor(el);
    steps.push({
      step: steps.length + 1,
      timestamp: now,
      action,
      humanAction: humanAction || detail,
      pageTitle: document.title.slice(0, 160),
      pageUrl: location.origin + location.pathname,
      element: element.slice(0, 120),
      elementType: (el.getAttribute('type') || el.tagName.toLowerCase()).slice(0, 40),
      selectorHint: selectorHint(el),
      detail: detail.slice(0, 240)
    });
    updateToolbar();
  }

  function createToolbar() {
    if (toolbar) toolbar.remove();
    toolbar = document.createElement('div');
    toolbar.id = 'manual-hu-toolbar';
    const shadow = toolbar.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{all:initial}.box{position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#172033;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:Arial,sans-serif;font-size:12px;display:flex;align-items:center;gap:10px}.title{display:flex;flex-direction:column;gap:3px;min-width:145px}.title b{font-size:13px}.story{opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}.status{display:flex;flex-direction:column;gap:3px;min-width:78px}.status span:first-child{font-weight:700}.status span:last-child{opacity:.7}.active{color:#86efac}.paused{color:#fbbf24}.box button{border:0;border-radius:7px;padding:8px 10px;font-weight:700;cursor:pointer;font-size:11px}.pause{background:#334155;color:white}.finish{background:#0e7490;color:white}.box button:hover{filter:brightness(1.1)}
      </style>
      <div class="box">
        <div class="title"><b>● Manual HU</b><span class="story"></span></div>
        <div class="status"><span class="active status-text">Grabando</span><span class="count">0 pasos</span></div>
        <button class="pause" type="button">Pausar</button>
        <button class="finish" type="button">Finalizar y exportar</button>
      </div>`;
    document.documentElement.appendChild(toolbar);
    shadow.querySelector('.story').textContent = story.id + ' · ' + story.title;
    shadow.querySelector('.pause').addEventListener('click', (event) => {
      event.stopPropagation();
      paused = !paused;
      shadow.querySelector('.pause').textContent = paused ? 'Reanudar' : 'Pausar';
      shadow.querySelector('.status-text').textContent = paused ? 'Pausado' : 'Grabando';
      shadow.querySelector('.status-text').className = paused ? 'paused status-text' : 'active status-text';
    });
    shadow.querySelector('.finish').addEventListener('click', (event) => {
      event.stopPropagation();
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

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function downloadText(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function buildManualHtml() {
    const rows = steps.map((item) => `
      <article class="step">
        <div class="step-number">${item.step}</div>
        <div class="step-body">
          <h3>${escapeHtml(item.humanAction || item.detail)}</h3>
          <p>${escapeHtml(item.detail)}</p>
          <div class="meta">Pantalla: ${escapeHtml(item.pageTitle)} · Elemento: ${escapeHtml(item.element)} · Acción: ${escapeHtml(item.action)}</div>
        </div>
      </article>`).join('');

    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(story.id + ' - ' + story.title)}</title>
<style>body{font-family:Arial,sans-serif;background:#f5f7fb;color:#172033;margin:0}.page{max-width:980px;margin:0 auto;background:#fff;min-height:100vh;padding:42px 52px;box-sizing:border-box}.cover{border-bottom:3px solid #0e7490;padding-bottom:26px;margin-bottom:30px}.tag{display:inline-block;background:#e6f4f7;color:#0e7490;padding:6px 10px;border-radius:6px;font-weight:700;font-size:12px}.cover h1{font-size:30px;margin:14px 0 8px}.muted{color:#667085}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0 32px}.card{border:1px solid #e4e7ec;border-radius:9px;padding:14px}.card b{display:block;font-size:20px}.step{display:flex;gap:16px;border:1px solid #e4e7ec;border-radius:10px;padding:16px;margin:12px 0;break-inside:avoid}.step-number{width:34px;height:34px;border-radius:50%;background:#0e7490;color:#fff;display:grid;place-items:center;font-weight:700;flex:0 0 auto}.step h3{margin:0 0 7px;font-size:16px}.step p{margin:0 0 8px;color:#475467}.meta{font-size:11px;color:#667085}.footer{margin-top:35px;padding-top:14px;border-top:1px solid #e4e7ec;font-size:11px;color:#667085}@media print{body{background:#fff}.page{padding:20px;max-width:none}.step{box-shadow:none}}</style></head>
<body><main class="page"><section class="cover"><span class="tag">MANUAL DE USUARIO · BORRADOR</span><h1>${escapeHtml(story.title || 'Historia de usuario')}</h1><p class="muted">Historia de usuario: <b>${escapeHtml(story.id)}</b></p></section>
<div class="summary"><div class="card"><span class="muted">Pasos registrados</span><b>${steps.length}</b></div><div class="card"><span class="muted">Inicio</span><b>${escapeHtml(steps[0]?.timestamp || '-')}</b></div><div class="card"><span class="muted">Fin</span><b>${escapeHtml(new Date().toISOString())}</b></div></div>
<h2>Procedimiento</h2>${rows || '<p>No se registraron pasos.</p>'}<div class="footer">Documento generado automáticamente por Manual HU. Este documento es un borrador generado a partir de la ejecución registrada y debe ser revisado antes de publicarse.</div></main></body></html>`;
  }

  function finishAndExport() {
    if (!recording) return;
    recording = false;
    paused = false;
    const finishedAt = new Date().toISOString();
    const report = {
      schemaVersion: '1.1',
      product: 'Manual HU Chrome Recorder',
      story,
      startedAt: steps[0]?.timestamp || finishedAt,
      finishedAt,
      steps
    };
    const baseName = (story.id.replace(/[^a-z0-9_-]/gi, '_') || 'historia');
    downloadText(baseName + '-ejecucion.json', JSON.stringify(report, null, 2), 'application/json;charset=utf-8');
    downloadText(baseName + '-manual.html', buildManualHtml(), 'text/html;charset=utf-8');
    removeToolbar();
    chrome.runtime.sendMessage({ type: 'MANUAL_HU_FINISHED', count: steps.length }).catch(() => {});
  }

  document.addEventListener('click', (event) => {
    if (!recording || paused) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target === document.documentElement || target === document.body) return;
    if (target.closest('#manual-hu-toolbar')) return;

    const formControl = target.closest('input,textarea,select');
    if (formControl) {
      const type = (formControl.getAttribute('type') || '').toLowerCase();
      if (['checkbox', 'radio'].includes(type)) return;
      return;
    }

    const clickable = target.closest('button,a,[role="button"],[role="tab"],[role="menuitem"],[role="option"]');
    if (!clickable) return;
    if (isSensitive(clickable)) return;

    const label = labelFor(clickable) || 'elemento';
    addStep('click', clickable, 'Clic realizado sobre ' + label + '.', 'Hacer clic en "' + label + '".');
  }, true);

  document.addEventListener('change', (event) => {
    if (!recording || paused) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('#manual-hu-toolbar') || isSensitive(target)) return;
    const tag = target.tagName.toLowerCase();
    const type = (target.getAttribute('type') || '').toLowerCase();
    const label = labelFor(target) || 'campo';
    let detail = '';
    let humanAction = '';

    if (tag === 'select') {
      const option = target.selectedOptions?.[0];
      const optionText = option ? (option.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100) : '';
      detail = optionText ? 'Opción seleccionada: ' + optionText : 'Selección cambiada';
      humanAction = optionText ? 'Seleccionar "' + optionText + '" en "' + label + '".' : 'Cambiar la selección de "' + label + '".';
    } else if (type === 'checkbox' || type === 'radio') {
      detail = (target.checked ? 'Marcado: ' : 'Desmarcado: ') + label;
      humanAction = (target.checked ? 'Marcar' : 'Desmarcar') + ' "' + label + '".';
    } else if (tag === 'input' || tag === 'textarea') {
      detail = 'Campo completado; el contenido no se almacena.';
      humanAction = 'Completar el campo "' + label + '".';
    } else {
      detail = 'Valor cambiado';
      humanAction = 'Cambiar el valor de "' + label + '".';
    }

    addStep('change', target, detail, humanAction);
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
      removeToolbar();
      sendResponse({ ok: true, steps });
    } else if (message?.type === 'MANUAL_HU_GET_STATE') {
      sendResponse({ ok: true, recording, paused, count: steps.length });
    }
    return true;
  });
})();