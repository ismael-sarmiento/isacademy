// In-browser Python console (Pyodide / WebAssembly). Loaded on demand: ~10 MB the first time.
import { t } from './i18n.js?v=20261013k';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
// Subresource Integrity: the browser refuses pyodide.js if the CDN copy is ever altered
const PYODIDE_SRI = 'sha384-i3R37b3tF+HWudsUf1VSEOY2YxwSNMqY8DQa9Z0O3xh+NkJ9o+yjcGyIi5huj+nB';
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

function loadScript(src, integrity) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensurePython() {
  if (pyodide) return pyodide;
  if (!loading) {
    loading = (async () => {
      await loadScript(`${PYODIDE_URL}pyodide.js`, PYODIDE_SRI);
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
    $('[data-action="console-debug"]').disabled = false;
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


// ---------- step-by-step debugger ----------
// Runs the student's code under sys.settrace and records every line with its variables, the call
// stack and the output printed so far; the UI then replays the run forwards and backwards.
const MAX_STEPS = 1000;
const TRACER = `
import sys, io, json, types
def __isa_trace(src, max_steps):
    try:
        code = compile(src, "<alumno>", "exec")
    except SyntaxError as exc:
        err = {"l": exc.lineno, "m": "SyntaxError: " + str(exc.msg)}
        return json.dumps({"steps": [{"l": exc.lineno, "e": "error", "s": [], "v": {}, "o": 0}], "out": "", "error": err, "limited": False})
    buf, steps, g = io.StringIO(), [], {"__name__": "__main__"}
    def show(v):
        if isinstance(v, types.ModuleType): return None
        if isinstance(v, types.FunctionType): return "<función " + v.__name__ + ">"
        r = repr(v).replace("\\n", " ⏎ ")
        return r if len(r) <= 80 else r[:77] + "…"
    def snap(scope):
        out = {}
        for k, v in list(scope.items()):
            if k.startswith("__"): continue
            s = show(v)
            if s is not None: out[k] = s
        return out
    def stack(frame):
        names = []
        while frame is not None:
            if frame.f_code.co_filename == "<alumno>": names.append(frame.f_code.co_name)
            frame = frame.f_back
        return names[::-1]
    class TooMany(Exception): pass
    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<alumno>": return None
        if event in ("line", "return"):
            if len(steps) >= max_steps: raise TooMany()
            step = {"l": frame.f_lineno, "e": event, "s": stack(frame), "v": snap(frame.f_locals), "o": len(buf.getvalue())}
            if event == "return": step["r"] = show(arg)
            steps.append(step)
        return tracer
    error, limited = None, False
    old = sys.stdout
    sys.stdout = buf
    sys.settrace(tracer)
    try:
        exec(code, g)
    except TooMany:
        limited = True
    except Exception as exc:
        tb, line = exc.__traceback__, None
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == "<alumno>": line = tb.tb_lineno
            tb = tb.tb_next
        if line is None and isinstance(exc, SyntaxError): line = exc.lineno
        error = {"l": line, "m": type(exc).__name__ + ": " + str(exc)}
    finally:
        sys.settrace(None)
        sys.stdout = old
    steps.append({"l": error["l"] if error else None, "e": "error" if error else ("limit" if limited else "end"),
                  "s": [], "v": snap(g), "o": len(buf.getvalue())})
    return json.dumps({"steps": steps, "out": buf.getvalue(), "error": error, "limited": limited})
`;
let dbg = null; // { steps, out, lines, i, bps }
const PY_KEYWORDS = /\b(def|return|for|in|if|elif|else|while|import|from|as|print|True|False|None|class|and|or|not|try|except|finally|with|lambda|break|continue|pass|yield|range|len)\b/g;
const escHtml = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function pyLine(line) {
  const hash = line.indexOf('#');
  const code = hash >= 0 && !/["']/.test(line.slice(0, hash)) ? line.slice(0, hash) : line;
  const comment = code.length < line.length ? line.slice(code.length) : '';
  const parts = code.split(/("[^"]*"?|'[^']*'?)/).map((p, i) => (i % 2 ? `<span class="s">${escHtml(p)}</span>` : escHtml(p).replace(PY_KEYWORDS, '<span class="k">$1</span>')));
  return parts.join('') + (comment ? `<span class="c">${escHtml(comment)}</span>` : '') || ' ';
}

export async function debugCode() {
  if (!pyodide || running) return;
  running = true;
  const src = $('#pyEditor').value;
  const btn = $('[data-action="console-debug"]');
  btn.setAttribute('aria-disabled', 'true');
  try {
    await pyodide.loadPackagesFromImports(src);
    if (!pyodide.globals.get('__isa_trace')) pyodide.runPython(TRACER);
    const json = pyodide.globals.get('__isa_trace')(src, MAX_STEPS);
    const res = JSON.parse(json);
    dbg = { ...res, lines: src.split('\n'), i: 0, bps: new Set() };
    renderDebugCode();
    toggleDebug(true);
    showStep(0);
    $('[data-dbg="next"]').focus();
  } catch (e) {
    $('#pyOut').textContent = '';
    out(String(e.message || e).split('\n').filter(Boolean).slice(-1).join('') + '\n', 'err');
  } finally {
    running = false;
    btn.removeAttribute('aria-disabled');
  }
}

function toggleDebug(on) {
  $('#dbg').hidden = !on;
  ['#pyEditor', '#pyOut', '.console-label', '.console-bar'].forEach(sel => { $(sel).hidden = on; });
  if (!on) { dbg = null; $('#pyEditor').focus(); }
}
export function exitDebug() { if (dbg) toggleDebug(false); }

function renderDebugCode() {
  $('#dbgCode').innerHTML = dbg.lines.map((line, i) =>
    `<li data-line="${i + 1}"><button type="button" class="ln" data-bp="${i + 1}" aria-pressed="false" aria-label="${escHtml(t('console.dbg.bp').replace('{l}', i + 1))}">${i + 1}</button><code>${pyLine(line)}</code></li>`).join('');
}

function showStep(i) {
  const steps = dbg.steps;
  dbg.i = Math.max(0, Math.min(steps.length - 1, i));
  const st = steps[dbg.i], prev = steps[dbg.i - 1];
  const last = dbg.i === steps.length - 1;
  $('#dbgCount').textContent = t('console.dbg.step').replace('{i}', dbg.i + 1).replace('{n}', steps.length);
  const range = $('#dbgRange');
  range.max = String(steps.length - 1); range.value = String(dbg.i);
  // code: current line, the one just executed and the error line
  $('#dbgCode').querySelectorAll('li').forEach(li => {
    const n = Number(li.dataset.line);
    li.classList.toggle('cur', st.l === n && st.e !== 'error');
    li.classList.toggle('prev', !!prev && prev.l === n && st.l !== n);
    li.classList.toggle('err', st.e === 'error' && st.l === n);
  });
  $('#dbgCode li.cur, #dbgCode li.err')?.scrollIntoView({ block: 'nearest' });
  // variables, highlighting the ones that changed
  const before = prev ? prev.v : {};
  const names = Object.keys(st.v);
  const fn = st.s.length && st.s[st.s.length - 1] !== '<module>' ? st.s[st.s.length - 1] : null;
  // function names keep their exact case inside the uppercase heading
  $('#dbgVarsTitle').innerHTML = fn
    ? escHtml(t('console.dbg.varsIn')).replace('{f}()', `<span class="fn">${escHtml(fn)}()</span>`)
    : escHtml(t('console.dbg.vars'));
  $('#dbgVars').innerHTML = names.length
    ? names.map(k => `<tr class="${before[k] !== st.v[k] ? 'chg' : ''}"><th scope="row">${escHtml(k)}</th><td>${escHtml(st.v[k])}</td></tr>`).join('')
    : `<tr><td class="muted">${escHtml(t('console.dbg.noVars'))}</td></tr>`;
  $('#dbgStack').textContent = (st.s.length ? st.s : ['<module>']).map(f => (f === '<module>' ? t('console.dbg.main') : `${f}()`)).join(' → ');
  $('#dbgOut').textContent = dbg.out.slice(0, st.o) || '—';
  // what is happening in this step, in words
  let msg = '';
  if (st.e === 'line') msg = t('console.dbg.next').replace('{l}', st.l);
  else if (st.e === 'return') msg = t('console.dbg.returns').replace('{f}', st.s[st.s.length - 1]).replace('{v}', st.r);
  else if (st.e === 'error') msg = t('console.dbg.error').replace('{l}', st.l ?? '?').replace('{m}', dbg.error.m);
  else if (st.e === 'limit') msg = t('console.dbg.limit').replace('{n}', MAX_STEPS);
  else msg = t('console.dbg.end');
  const m = $('#dbgMsg');
  m.textContent = msg; m.className = `dbg-msg ${st.e}`;
  $('[data-dbg="first"]').disabled = $('[data-dbg="prev"]').disabled = dbg.i === 0;
  $('[data-dbg="next"]').disabled = $('[data-dbg="last"]').disabled = $('[data-dbg="cont"]').disabled = last;
}

function continueToBreakpoint() {
  const next = dbg.steps.findIndex((s, k) => k > dbg.i && s.e === 'line' && dbg.bps.has(s.l));
  showStep(next >= 0 ? next : dbg.steps.length - 1);
}

function initDebugger() {
  const box = $('#dbg');
  box.addEventListener('click', e => {
    if (!dbg) return;
    const bp = e.target.closest('[data-bp]');
    if (bp) {
      const n = Number(bp.dataset.bp);
      dbg.bps.has(n) ? dbg.bps.delete(n) : dbg.bps.add(n);
      bp.setAttribute('aria-pressed', String(dbg.bps.has(n)));
      bp.closest('li').classList.toggle('bp', dbg.bps.has(n));
      return;
    }
    const b = e.target.closest('[data-dbg]');
    if (!b) return;
    const go = { first: () => showStep(0), prev: () => showStep(dbg.i - 1), next: () => showStep(dbg.i + 1),
      last: () => showStep(dbg.steps.length - 1), cont: continueToBreakpoint, exit: () => toggleDebug(false) }[b.dataset.dbg];
    go?.();
  });
  $('#dbgRange').addEventListener('input', e => dbg && showStep(Number(e.target.value)));
  box.addEventListener('keydown', e => {
    if (!dbg || e.target.matches('input[type="range"]')) return;
    const keys = { ArrowRight: dbg.i + 1, ArrowLeft: dbg.i - 1, Home: 0, End: dbg.steps.length - 1 };
    if (e.key in keys) { e.preventDefault(); showStep(keys[e.key]); }
    if (e.key === 'Escape') toggleDebug(false);
  });
}

export function initConsole() {
  initDebugger();
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
  exitDebug();
  $('#pyEditor').value = '';
  loadSample(0);
  $('#pyOut').textContent = pyodide ? t('console.ready') + '\n' : '';
  $('#pyOut').dataset.state = 'ready';
}
