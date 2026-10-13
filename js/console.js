// In-browser Python console (Pyodide / WebAssembly). Loaded on demand: ~10 MB the first time.
import { t } from './i18n.js?v=20261013g';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const $ = sel => document.querySelector(sel);
let pyodide = null, loading = null, running = false;

function out(text, cls = '') {
  const pre = $('#pyOut');
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text;
  pre.appendChild(span);
  pre.scrollTop = pre.scrollHeight;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensurePython() {
  if (pyodide) return pyodide;
  if (!loading) {
    loading = (async () => {
      await loadScript(`${PYODIDE_URL}pyodide.js`);
      const py = await window.loadPyodide({ indexURL: PYODIDE_URL });
      py.setStdout({ batched: s => out(s + '\n') });
      py.setStderr({ batched: s => out(s + '\n', 'err') });
      // keep the output clean for students: library deprecation notices are noise here
      py.runPython('import warnings\nwarnings.filterwarnings("ignore", category=DeprecationWarning)');
      return py;
    })();
  }
  try {
    pyodide = await loading;
    return pyodide;
  } catch (e) {
    loading = null;
    throw e;
  }
}

export function renderSamples() {
  const box = $('#samples');
  if (!box) return;
  if (pyodide && $('#pyOut').dataset.state === 'ready') $('#pyOut').textContent = t('console.ready') + '\n';
  box.innerHTML = '';
  t('console.samples').forEach((sample, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = sample.name; b.dataset.sample = String(i);
    box.appendChild(b);
  });
}

function loadSample(i) {
  $('#pyEditor').value = t('console.samples')[i].code;
  $('#pyEditor').focus();
}

export async function openConsole() {
  const body = $('#consoleBody');
  if (!body.hidden) { $('#pyEditor').focus(); return; }
  body.hidden = false;
  $('[data-action="console-open"]').hidden = true;
  renderSamples();
  if (!$('#pyEditor').value) loadSample(0);
  $('#pyOut').textContent = '';
  out(t('console.loading') + '\n');
  try {
    await ensurePython();
    $('#pyOut').textContent = '';
    out(t('console.ready') + '\n');
    $('#pyOut').dataset.state = 'ready';
    $('[data-action="console-run"]').disabled = false;
  } catch {
    $('#pyOut').textContent = '';
    out(t('console.error') + '\n', 'err');
  }
}

export async function runCode() {
  if (!pyodide || running) return;
  running = true;
  const code = $('#pyEditor').value;
  const btn = $('[data-action="console-run"]');
  // aria-disabled keeps the button focusable while code runs
  btn.setAttribute('aria-disabled', 'true');
  $('#pyOut').textContent = '';
  $('#pyOut').dataset.state = 'run';
  try {
    await pyodide.loadPackagesFromImports(code);
    const result = await pyodide.runPythonAsync(code);
    if (result !== undefined && result !== null) out(String(result) + '\n');
  } catch (e) {
    // keep only the useful tail of the Python traceback
    // show the traceback from the student's own code onwards, not Pyodide internals
    const lines = String(e.message || e).split('\n').filter(Boolean);
    const from = lines.map(l => l.includes('File "<exec>"')).lastIndexOf(true);
    out((from >= 0 ? lines.slice(from) : lines.slice(-1)).join('\n') + '\n', 'err');
  } finally {
    running = false;
    btn.removeAttribute('aria-disabled');
  }
}

export function initConsole() {
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-sample]');
    if (s) loadSample(Number(s.dataset.sample));
  });
  const ed = $('#pyEditor');
  ed.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runCode(); return; }
    // Tab indents inside the editor; Escape gives keyboard users a way out
    if (e.key === 'Escape') { $('[data-action="console-run"]').focus(); return; }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b, value } = ed;
      ed.value = value.slice(0, a) + '    ' + value.slice(b);
      ed.selectionStart = ed.selectionEnd = a + 4;
    }
  });
}

export function resetConsole() {
  $('#pyEditor').value = '';
  loadSample(0);
  $('#pyOut').textContent = pyodide ? t('console.ready') + '\n' : '';
  $('#pyOut').dataset.state = 'ready';
}
