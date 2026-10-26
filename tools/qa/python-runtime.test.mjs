import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';

const runtimeSource = (await readFile(new URL('../../js/core/python-runtime.js', import.meta.url), 'utf8'))
  .replaceAll('export ', '').replaceAll('import.meta.url', JSON.stringify('https://example.test/isacademy/js/core/python-runtime.js?v=qa'));
const workerSource = await readFile(new URL('../../js/python-worker.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture({ fetcher, autoReady = true, supported = true } = {}) {
  const workers = [], requests = [], blobs = [], revoked = [], output = [], phases = [], timers = new Map();
  let timerId = 0;
  class FakeBlob { constructor(parts) { this.parts = parts; } }
  class FakeURL extends URL {
    static createObjectURL(blob) { blobs.push(blob); return `blob:session-${blobs.length}`; }
    static revokeObjectURL(url) { revoked.push(url); }
  }
  class FakeWorker {
    constructor(url) { this.url = url; this.sent = []; this.terminated = false; workers.push(this); }
    postMessage(message) {
      this.sent.push(message);
      if (message.type === 'init' && autoReady) queueMicrotask(() => this.emit({ type: 'ready', id: 0 }));
    }
    emit(data) { this.onmessage({ data }); }
    terminate() { this.terminated = true; }
    job() { return this.sent.at(-1); }
  }
  const api = runInNewContext(runtimeSource + '\ncreatePythonRuntime', {
    URL: FakeURL, Blob: FakeBlob, Worker: supported ? FakeWorker : undefined, AbortController,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetcher ? fetcher(url, options) : { ok: true, text: async () => '/* verified bootstrap */' };
    },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  })({ onOutput: (text, cls) => output.push({ text, cls }), onPhase: phase => phases.push(phase) });
  const fire = delay => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } };
  return { api, workers, requests, blobs, revoked, output, phases, timers, fire };
}

test('verified bytes become the Worker entry, with pinned SRI, no credentials and a versioned own script', async () => {
  const h = fixture(); await Promise.all([h.api.ready(), h.api.ready()]);
  assert.equal(h.requests.length, 1); assert.equal(h.workers.length, 1);
  assert.equal(h.requests[0].url, 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
  assert.equal(h.requests[0].options.integrity, 'sha384-i3R37b3tF+HWudsUf1VSEOY2YxwSNMqY8DQa9Z0O3xh+NkJ9o+yjcGyIi5huj+nB');
  assert.equal(h.requests[0].options.credentials, 'omit');
  assert.match(h.blobs[0].parts.join(''), /^\/\* verified bootstrap \*\/[\s\S]*importScripts\("https:\/\/example.test\/isacademy\/js\/python-worker.js\?v=qa"\)/);
  assert.deepEqual(h.revoked, ['blob:session-1']); assert.equal(h.timers.size, 0);
});

test('bootstrap integrity/network failure creates no Worker and a later retry can prepare', async () => {
  let failed = true;
  const h = fixture({ fetcher: () => { if (failed) throw new Error('integrity failure'); return { ok: true, text: async () => 'verified' }; } });
  await assert.rejects(h.api.ready(), { kind: 'load' }); assert.equal(h.workers.length, 0);
  failed = false; await h.api.ready(); assert.equal(h.workers.length, 1);
});

test('Stop during bootstrap aborts the fetch and ignores its late response', async () => {
  let release;
  const h = fixture({ fetcher: () => new Promise(resolve => { release = resolve; }) });
  const pending = assert.rejects(h.api.ready(), { kind: 'stopped' });
  h.api.stop(); assert.equal(h.requests[0].options.signal.aborted, true);
  release({ ok: true, text: async () => 'late source' }); await pending; await flush();
  assert.equal(h.workers.length, 0); assert.equal(h.timers.size, 0);
});

test('Stop terminates a run; late messages cannot leak into a new session', async () => {
  const h = fixture(); await h.api.ready();
  const first = h.api.run('while True: pass'); const rejected = assert.rejects(first, { kind: 'stopped' }); await flush();
  const old = h.workers[0], oldId = old.job().id;
  h.api.stop(); await rejected; assert.equal(old.terminated, true);
  const next = h.api.run('print(2)'); await flush(); const worker = h.workers[1], id = worker.job().id;
  old.emit({ type: 'stdout', id: oldId, text: 'old output' });
  worker.emit({ type: 'stdout', id, text: '2\n' }); worker.emit({ type: 'result', id, value: null }); await next;
  assert.deepEqual(h.output, [{ text: '2\n', cls: '' }]); assert.equal(h.timers.size, 0);
});

test('execution deadline terminates its Worker and clears the preparation timer', async () => {
  const h = fixture(); await h.api.ready(); const pending = h.api.run('costly()');
  const rejected = assert.rejects(pending, { kind: 'timeout' }); await flush(); const worker = h.workers[0], id = worker.job().id;
  worker.emit({ type: 'phase', id, phase: 'executing' });
  assert.deepEqual([...h.timers.values()].map(x => x.delay), [15000]); h.fire(15000); await rejected;
  assert.equal(worker.terminated, true); assert.equal(h.timers.size, 0);
});

test('initialisation and package preparation each have a bounded 60-second deadline', async () => {
  const init = fixture({ autoReady: false }); const preparing = assert.rejects(init.api.ready(), { kind: 'timeout' }); await flush();
  init.fire(60000); await preparing; assert.equal(init.workers[0].terminated, true);
  assert.deepEqual(init.revoked, ['blob:session-1']);
  const h = fixture(); await h.api.ready(); const pending = assert.rejects(h.api.run('import pandas'), { kind: 'timeout' }); await flush();
  h.fire(60000); await pending; assert.equal(h.workers[0].terminated, true);
});

test('a Python error leaves the session usable for a subsequent program', async () => {
  const h = fixture(); await h.api.ready(); const bad = h.api.run('1/0'); const rejected = assert.rejects(bad, { kind: 'python', message: 'ZeroDivisionError' }); await flush();
  const worker = h.workers[0]; worker.emit({ type: 'error', id: worker.job().id, message: 'ZeroDivisionError' }); await rejected;
  const good = h.api.run('2+2'); await flush(); worker.emit({ type: 'result', id: worker.job().id, value: null }); await good;
  assert.equal(h.workers.length, 1); assert.equal(worker.terminated, false);
});

test('debug data is transferred as plain data and only matching messages complete a request', async () => {
  const h = fixture(); await h.api.ready(); const pending = h.api.debug('x=1'); await flush(); const worker = h.workers[0], id = worker.job().id;
  const trace = { steps: [{ l: 1, e: 'line', v: {}, s: [], o: 0 }], out: '', stepLimit: 1000 };
  worker.emit({ type: 'stdout', id: id + 1, text: 'wrong job' }); worker.emit({ type: 'result', id, value: structuredClone(trace) });
  assert.deepEqual(await pending, trace); assert.equal(h.output.length, 0);
});

test('code size is checked before any network or Worker is created', async () => {
  const h = fixture(); await assert.rejects(h.api.run('x'.repeat(50001)), { kind: 'codeLimit' });
  assert.equal(h.requests.length, 0); assert.equal(h.workers.length, 0);
});

test('output is bounded in the controller even if a faulty Worker sends an oversized chunk', async () => {
  const h = fixture(); await h.api.ready(); const rejected = assert.rejects(h.api.run('print(big)'), { kind: 'outputLimit' }); await flush();
  const worker = h.workers[0]; worker.emit({ type: 'stdout', id: worker.job().id, text: 'x'.repeat(65000) }); await rejected;
  assert.equal(h.output[0].text.length, 64000); assert.equal(worker.terminated, true);
});

test('a Worker output limit signal stops execution instead of merely hiding further output', async () => {
  const h = fixture(); await h.api.ready(); const rejected = assert.rejects(h.api.run('printing()'), { kind: 'outputLimit' }); await flush();
  const worker = h.workers[0]; worker.emit({ type: 'limit', id: worker.job().id }); await rejected;
  assert.equal(worker.terminated, true);
});

test('many short lines are coalesced without losing order or leaving a pending UI timer', async () => {
  const h = fixture(); await h.api.ready(); const pending = h.api.run('printing()'); await flush();
  const worker = h.workers[0], id = worker.job().id;
  for (let i = 0; i < 1000; i++) worker.emit({ type: 'stdout', id, text: 'x\n' });
  assert.equal(h.output.length, 0);
  worker.emit({ type: 'stderr', id, text: 'error\n' }); worker.emit({ type: 'result', id, value: null }); await pending;
  assert.deepEqual(h.output, [{ text: 'x\n'.repeat(1000), cls: '' }, { text: 'error\n', cls: 'err' }]);
  assert.equal(h.timers.size, 0);
});

test('concurrent execution is rejected and does not replace the active request', async () => {
  const h = fixture(); await h.api.ready(); const first = h.api.run('first()'); const rejected = assert.rejects(first, { kind: 'stopped' });
  await assert.rejects(h.api.debug('second()'), { kind: 'busy' }); h.api.stop(); await rejected;
});

test('unavailable Workers fail safely without executing Python on the page', async () => {
  const h = fixture({ supported: false }); await assert.rejects(h.api.ready(), { kind: 'unsupported' }); assert.equal(h.requests.length, 0);
});

test('dispose cleans resources and prevents another session', async () => {
  const h = fixture({ autoReady: false }); const rejected = assert.rejects(h.api.ready(), { kind: 'stopped' }); await flush();
  h.api.dispose(); h.api.dispose(); await rejected; await assert.rejects(h.api.ready(), { kind: 'stopped' });
  assert.equal(h.workers[0].terminated, true); assert.equal(h.timers.size, 0); assert.deepEqual(h.revoked, ['blob:session-1']);
});

test('Worker errors reject active work and a replacement session can be created', async () => {
  const h = fixture(); await h.api.ready(); const pending = assert.rejects(h.api.run('work()'), { kind: 'runtime' }); await flush();
  let prevented = false; h.workers[0].onerror({ preventDefault() { prevented = true; } }); await pending;
  assert.equal(prevented, true); await h.api.ready(); assert.equal(h.workers.length, 2);
});

function workerFixture() {
  const messages = []; let stdout, stderr, destroyed = 0, tracerSource = '';
  const proxy = { toString: () => '[1, 2]', destroy: () => { destroyed++; } };
  const trace = () => JSON.stringify({ steps: [{ e: 'end', l: null, v: {}, s: [], o: 0 }], out: '', error: null });
  trace.destroy = () => { destroyed++; };
  const py = {
    setStdout: options => { stdout = options.batched; }, setStderr: options => { stderr = options.batched; },
    runPython: code => { if (code.includes('__isa_trace')) tracerSource = code; },
    loadPackagesFromImports: async () => {},
    runPythonAsync: async () => { stdout('hello'); stderr('warning'); return proxy; },
    globals: { get: () => trace },
  };
  const self = { postMessage: message => messages.push(structuredClone(message)) };
  runInNewContext(workerSource, { self, loadPyodide: async () => py });
  const send = data => self.onmessage({ data });
  return { send, messages, get destroyed() { return destroyed; }, get tracerSource() { return tracerSource; } };
}

test('the actual Worker protocol forwards streams/results and destroys Python proxies', async () => {
  const h = workerFixture(); await h.send({ type: 'init', id: 0, indexURL: 'https://cdn.example/', limits: { code: 50000, output: 64000, steps: 1000 } });
  await h.send({ type: 'run', id: 1, code: 'print(1)' });
  assert.deepEqual(h.messages.filter(x => x.type === 'phase').map(x => x.phase), ['preparing', 'executing']);
  assert.deepEqual(h.messages.filter(x => ['stdout', 'stderr'].includes(x.type)).map(x => x.text), ['hello\n', 'warning\n', '[1, 2]\n']);
  assert.equal(h.destroyed, 1);
  await h.send({ type: 'debug', id: 2, code: 'x=1' }); assert.equal(h.destroyed, 2);
  assert.equal(h.messages.at(-1).value.stepLimit, 1000); assert.match(h.tracerSource, /sys.settrace/);
});

async function trace(code, maxOutput = 64000) {
  const h = workerFixture(); await h.send({ type: 'init', id: 0, indexURL: 'https://cdn.example/', limits: { code: 50000, output: 64000, steps: 1000 } });
  const script = h.tracerSource + '\nprint(__isa_trace(' + JSON.stringify(code) + ',1000,' + maxOutput + '))';
  return JSON.parse(execFileSync('python3', ['-c', script], { timeout: 3000, encoding: 'utf8' }));
}

test('real Python tracing preserves function steps, variables and output', async () => {
  const result = await trace('def doble(n):\n    return n*2\nx=doble(3)\nprint(x)');
  assert.equal(result.error, null); assert.equal(result.out, '6\n');
  assert.equal(result.steps.at(-1).v.x, '6'); assert.ok(result.steps.some(step => step.e === 'return' && step.s.includes('doble')));
});

test('real Python tracing handles syntax errors, step limits and bounded output', async () => {
  const syntax = await trace('def broken('); assert.match(syntax.error.m, /SyntaxError/);
  const loop = await trace('while True:\n    pass'); assert.equal(loop.limited, true); assert.equal(loop.steps.length, 1001);
  const output = await trace('print("x"*65000)'); assert.equal(output.outputLimited, true); assert.equal(output.out.length, 64000);
  assert.equal(output.steps.at(-1).e, 'output-limit');
});

test('trace output offsets and limits agree with the browser for non-BMP Unicode', async () => {
  const normal = await trace('print("😀")\nx=1'); assert.equal(normal.steps.at(-1).o, normal.out.length);
  const capped = await trace('print("😀"*40000)'); assert.equal(capped.outputLimited, true); assert.ok(capped.out.length <= 64000);
  assert.equal(capped.steps.at(-1).o, capped.out.length);
});
