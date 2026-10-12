// Loads i18n/<lang>.json and applies it to [data-i18n] / [data-i18n-html] / [data-i18n-aria] nodes.
const SUPPORTED = ['es', 'en'];
const listeners = [];
let dict = {};
let lang = 'es';

function stored() { try { return localStorage.getItem('isa-lang'); } catch { return null; } }
function store(v) { try { localStorage.setItem('isa-lang', v); } catch { /* storage unavailable */ } }

export function detectLang() {
  const s = stored();
  if (SUPPORTED.includes(s)) return s;
  return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function t(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict) ?? path;
}

export function currentLang() { return lang; }
export function onLangChange(fn) { listeners.push(fn); }

export async function setLang(next, persist = false) {
  lang = SUPPORTED.includes(next) ? next : 'es';
  const res = await fetch(`i18n/${lang}.json?v=20261012g`);
  dict = await res.json();
  // only an explicit choice is remembered; otherwise the browser language keeps deciding
  if (persist) store(lang);
  document.documentElement.lang = lang;
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  listeners.forEach(fn => fn(lang));
}
