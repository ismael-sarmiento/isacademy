// Loads i18n/<lang>.json and applies it to [data-i18n] / [data-i18n-html] / [data-i18n-aria] nodes.
import { SITE } from './config.js';
import { rememberReadingPosition } from '/assets/ds/ds.js';
const SUPPORTED = ['es', 'en'];
// the import map in index.html loads every module as file.js?v=<version>: the texts follow the same version
const VERSION = new URL(import.meta.url).searchParams.get('v') || 'dev';
const listeners = [];
let dict = {};
let lang = 'es';

function stored() { try { return localStorage.getItem('isa-lang'); } catch { return null; } }
function store(v) { try { localStorage.setItem('isa-lang', v); } catch { /* storage unavailable */ } }

// Spanish is the default for everyone, search engines included (Googlebot browses in English, and an
// automatic switch made Google index the English copy). English comes from ?lang=en or the visitor's own choice.
export function detectLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED.includes(q)) return q;
  const s = stored();
  return SUPPORTED.includes(s) ? s : 'es';
}

// keep the address, the canonical link and og tags in line with the language shown, so every version is shareable
function syncUrl() {
  const url = new URL(location.href);
  if (lang === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
  if (url.href !== location.href) history.replaceState(history.state, '', url);
  const canonical = lang === 'en' ? `${SITE.baseUrl}?lang=en` : SITE.baseUrl;
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', lang === 'en' ? 'en_GB' : 'es_ES');
}

export function t(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict) ?? path;
}

export function currentLang() { return lang; }
export function onLangChange(fn) { listeners.push(fn); }

// texts of any language, fetched once (the form needs the Spanish names even when the page is in English)
const cache = {};
export function dictionary(code) {
  cache[code] ??= fetch(`i18n/${code}.json?v=${VERSION}`).then(res => res.json());
  return cache[code];
}

export async function setLang(next, persist = false) {
  lang = SUPPORTED.includes(next) ? next : 'es';
  dict = await dictionary(lang);
  const restorePosition = persist ? rememberReadingPosition() : () => {};
  // only an explicit choice is remembered
  if (persist) store(lang);
  document.documentElement.lang = lang;
  syncUrl();
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.alt = t(el.dataset.i18nAlt); });
  document.querySelectorAll('[data-i18n-href]').forEach(el => { el.setAttribute('href', t(el.dataset.i18nHref)); });
  listeners.forEach(fn => fn(lang));
  restorePosition();
}
