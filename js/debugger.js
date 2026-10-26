// Step-by-step debugger for the Python console. The student's code runs under sys.settrace; every line is
// recorded in a separate Worker. This module only replays the transferable trace
// forwards and backwards (breakpoints, keyboard, 1000-step limit).
import { $, $$, esc } from './core/dom.js';
import { highlightLine } from './core/highlight.js';
import { t } from './i18n.js';

let run = null; // { steps, out, error, lines, i, bps }

export function startDebug(result, src) {
  run = { ...result, lines: src.split('\n'), i: 0, bps: new Set() };
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
    case 'limit': return t('console.dbg.limit').replace('{n}', run.stepLimit);
    case 'output-limit': return t('console.outputLimit');
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
