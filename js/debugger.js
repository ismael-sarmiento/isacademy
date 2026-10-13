// Step-by-step debugger for the Python console. The student's code runs under sys.settrace; every line is
// recorded with its variables, the call stack and the output printed so far, and the UI replays the run
// forwards and backwards (breakpoints, keyboard, 1000-step limit for infinite loops).
import { $, $$, esc } from './core/dom.js';
import { highlightLine } from './core/highlight.js';
import { t } from './i18n.js';

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
let run = null; // { steps, out, error, lines, i, bps }

export async function startDebug(pyodide, src) {
  await pyodide.loadPackagesFromImports(src);
  if (!pyodide.globals.get('__isa_trace')) pyodide.runPython(TRACER);
  const res = JSON.parse(pyodide.globals.get('__isa_trace')(src, MAX_STEPS));
  run = { ...res, lines: src.split('\n'), i: 0, bps: new Set() };
  renderCode();
  toggle(true);
  showStep(0);
  $('[data-dbg="next"]').focus();
}

function toggle(on) {
  $('#dbg').hidden = !on;
  ['#pyEditor', '#pyOut', '.console-label', '.console-bar'].forEach(sel => { $(sel).hidden = on; });
  if (!on) { run = null; $('#pyEditor').focus(); }
}
export function exitDebug() { if (run) toggle(false); }

function renderCode() {
  $('#dbgCode').innerHTML = run.lines.map((line, i) =>
    `<li data-line="${i + 1}"><button type="button" class="ln" data-bp="${i + 1}" aria-pressed="false" aria-label="${esc(t('console.dbg.bp').replace('{l}', i + 1))}">${i + 1}</button><code>${highlightLine(line) || ' '}</code></li>`).join('');
}

// what is happening in this step, in words
function describe(st) {
  const fn = st.s[st.s.length - 1];
  switch (st.e) {
    case 'line': return t('console.dbg.next').replace('{l}', st.l);
    case 'return': return t('console.dbg.returns').replace('{f}', fn).replace('{v}', st.r);
    case 'error': return t('console.dbg.error').replace('{l}', st.l ?? '?').replace('{m}', run.error.m);
    case 'limit': return t('console.dbg.limit').replace('{n}', MAX_STEPS);
    default: return t('console.dbg.end');
  }
}

function showStep(i) {
  const steps = run.steps;
  run.i = Math.max(0, Math.min(steps.length - 1, i));
  const st = steps[run.i], prev = steps[run.i - 1];
  const last = run.i === steps.length - 1;
  $('#dbgCount').textContent = t('console.dbg.step').replace('{i}', run.i + 1).replace('{n}', steps.length);
  const range = $('#dbgRange');
  range.max = String(steps.length - 1); range.value = String(run.i);
  // code: current line, the one just executed and the error line
  $$('#dbgCode li').forEach(li => {
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
    ? esc(t('console.dbg.varsIn')).replace('{f}()', `<span class="fn">${esc(fn)}()</span>`)
    : esc(t('console.dbg.vars'));
  $('#dbgVars').innerHTML = names.length
    ? names.map(k => `<tr class="${before[k] !== st.v[k] ? 'chg' : ''}"><th scope="row">${esc(k)}</th><td>${esc(st.v[k])}</td></tr>`).join('')
    : `<tr><td class="muted">${esc(t('console.dbg.noVars'))}</td></tr>`;
  $('#dbgStack').textContent = (st.s.length ? st.s : ['<module>']).map(f => (f === '<module>' ? t('console.dbg.main') : `${f}()`)).join(' → ');
  $('#dbgOut').textContent = run.out.slice(0, st.o) || '—';
  const msg = $('#dbgMsg');
  msg.textContent = describe(st); msg.className = `dbg-msg ${st.e}`;
  $('[data-dbg="first"]').disabled = $('[data-dbg="prev"]').disabled = run.i === 0;
  $('[data-dbg="next"]').disabled = $('[data-dbg="last"]').disabled = $('[data-dbg="cont"]').disabled = last;
}

function continueToBreakpoint() {
  const next = run.steps.findIndex((s, k) => k > run.i && s.e === 'line' && run.bps.has(s.l));
  showStep(next >= 0 ? next : run.steps.length - 1);
}

function toggleBreakpoint(button) {
  const n = Number(button.dataset.bp);
  run.bps.has(n) ? run.bps.delete(n) : run.bps.add(n);
  button.setAttribute('aria-pressed', String(run.bps.has(n)));
  button.closest('li').classList.toggle('bp', run.bps.has(n));
}

export function initDebugger() {
  const box = $('#dbg');
  const go = { first: () => showStep(0), prev: () => showStep(run.i - 1), next: () => showStep(run.i + 1),
    last: () => showStep(run.steps.length - 1), cont: continueToBreakpoint, exit: () => toggle(false) };
  box.addEventListener('click', e => {
    if (!run) return;
    const bp = e.target.closest('[data-bp]');
    if (bp) { toggleBreakpoint(bp); return; }
    go[e.target.closest('[data-dbg]')?.dataset.dbg]?.();
  });
  $('#dbgRange').addEventListener('input', e => run && showStep(Number(e.target.value)));
  box.addEventListener('keydown', e => {
    if (!run || e.target.matches('input[type="range"]')) return;
    const keys = { ArrowRight: run.i + 1, ArrowLeft: run.i - 1, Home: 0, End: run.steps.length - 1 };
    if (e.key in keys) { e.preventDefault(); showStep(keys[e.key]); }
    if (e.key === 'Escape') toggle(false);
  });
}
