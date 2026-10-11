// Light / dark theme: follows the OS by default, a manual choice is remembered.
const media = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = [];

function stored() { try { return localStorage.getItem('isa-theme'); } catch { return null; } }
function store(v) { try { localStorage.setItem('isa-theme', v); } catch { /* storage unavailable */ } }

export function isDark() {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === 'dark' : media.matches;
}

export function onThemeChange(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn(isDark())); }

export function initTheme() {
  const s = stored();
  if (s === 'light' || s === 'dark') document.documentElement.dataset.theme = s;
  media.addEventListener('change', notify);
}

export function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store(next);
  notify();
}
