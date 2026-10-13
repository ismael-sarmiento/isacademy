// "Alan" assistant: a local, private FAQ assistant (no server). Matches the question against the
// knowledge base in i18n (assistant.intents) and answers with a human tone plus action buttons.
import { t } from './i18n.js?v=20261013k';
import { avatarSVG } from './avatar.js?v=20261013k';

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => ' ' + s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ+#\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
let started = false, onAction = () => {};

// Light stemming so plurals match their singular key ("clases" → "clase", "presenciales" → "presencial").
const stem = w => (w.length > 5 && /[lnrdz]es$/.test(w) ? w.slice(0, -2) : w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w);
const prep = s => ' ' + norm(s).trim().split(' ').map(stem).join(' ') + ' ';

// Score every intent: a key counts when it appears as whole words; longer keys weigh more,
// "boost" ranks specific intents (price, booking, thesis, identity) above topics, and
// generic intents (greetings, thanks, bye) only win when nothing else matched.
export function match(question) {
  const q = prep(question);
  let best = null, bestScore = 0, bestGeneric = null, bestGenericScore = 0;
  for (const intent of t('assistant.intents')) {
    let score = 0;
    for (const key of intent.keys) {
      const k = prep(key);
      if (q.includes(k)) score += k.trim().length;
    }
    if (!score) continue;
    if (intent.boost) score += intent.boost;
    if (intent.generic) { if (score > bestGenericScore) { bestGeneric = intent; bestGenericScore = score; } continue; }
    if (score > bestScore) { best = intent; bestScore = score; }
  }
  if (best && bestScore >= 2) return best;
  return bestGenericScore >= 2 ? bestGeneric : null;
}

function talk(ms) {
  const av = $('.assistant-panel .avatar-svg')?.closest('.as-avatar');
  if (!av) return;
  av.classList.add('talking');
  clearTimeout(talk.timer);
  talk.timer = setTimeout(() => av.classList.remove('talking'), ms);
}

function addMessage(who, text, actions = []) {
  const log = $('#assistantLog');
  const item = document.createElement('div');
  item.className = `msg msg-${who}`;
  item.innerHTML = `<p>${esc(text)}</p>` + (actions.length ? `<div class="msg-actions">${actions.map(a =>
    `<button type="button" class="btn btn-sm" data-as-href="${esc(a.href || '')}" data-as-action="${esc(a.action || '')}" data-as-book="${esc(a.book || '')}">${esc(a.label)}</button>`).join('')}</div>` : '');
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

function reply(question) {
  addMessage('user', question);
  const typing = document.createElement('div');
  typing.className = 'msg msg-bot typing';
  typing.innerHTML = `<p aria-label="${esc(t('assistant.typing'))}"><span></span><span></span><span></span></p>`;
  $('#assistantLog').appendChild(typing);
  $('#assistantLog').scrollTop = $('#assistantLog').scrollHeight;
  const intent = match(question);
  const text = intent ? intent.answer : t('assistant.fallback');
  // a short, human-like pause proportional to the answer length
  const delay = Math.min(1400, 450 + text.length * 4);
  setTimeout(() => {
    typing.remove();
    addMessage('bot', text, intent ? (intent.actions || []) : [{ label: t('nav.cta'), href: '#contacto' }]);
    talk(Math.min(3500, text.length * 30));
  }, delay);
}

function renderChips() {
  $('#assistantChips').innerHTML = t('assistant.suggestions').map(s => `<button type="button" class="chip">${esc(s)}</button>`).join('');
}

function openPanel() {
  const panel = $('#assistantPanel');
  panel.hidden = false;
  $('#assistantFab').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => panel.classList.add('open'));
  if (!started) {
    started = true;
    renderChips();
    setTimeout(() => { addMessage('bot', t('assistant.greeting')); talk(3000); }, 250);
  }
  setTimeout(() => $('#assistantInput').focus(), 300);
}

function closePanel() {
  const panel = $('#assistantPanel');
  panel.classList.remove('open');
  $('#assistantFab').setAttribute('aria-expanded', 'false');
  setTimeout(() => { panel.hidden = true; }, 250);
  $('#assistantFab').focus();
}

export function refreshAssistant() {
  $('#assistantFab .fab-label').textContent = t('assistant.open');
  $('#assistantFab').setAttribute('aria-label', t('assistant.openLabel'));
  $('#assistantPanel .as-name').textContent = t('assistant.name');
  $('#assistantPanel .as-sub').textContent = t('assistant.subtitle');
  $('#assistantClose').setAttribute('aria-label', t('assistant.close'));
  $('#assistantInput').placeholder = t('assistant.placeholder');
  $('#assistantSend').setAttribute('aria-label', t('assistant.send'));
  if (started) renderChips();
}

export function initAssistant(actionHandler) {
  onAction = actionHandler;
  $('#assistantFab .as-avatar').innerHTML = avatarSVG('fab');
  $('#assistantPanel .as-avatar').innerHTML = avatarSVG('panel');
  refreshAssistant();
  $('#assistantFab').addEventListener('click', () => ($('#assistantPanel').hidden ? openPanel() : closePanel()));
  $('#assistantClose').addEventListener('click', closePanel);
  $('#assistantForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#assistantInput').value.trim();
    if (!q) return;
    $('#assistantInput').value = '';
    reply(q);
  });
  $('#assistantChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) { reply(chip.textContent); chip.remove(); }
  });
  $('#assistantLog').addEventListener('click', e => {
    const b = e.target.closest('[data-as-href], [data-as-action]');
    if (!b) return;
    const { asHref, asAction, asBook } = b.dataset;
    onAction({ href: asHref, action: asAction, book: asBook });
    // on phones the panel covers the page: close it so the visitor sees where they went
    if (matchMedia('(max-width: 640px)').matches) closePanel();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#assistantPanel').hidden) closePanel(); });
}

