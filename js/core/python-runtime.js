// A terminable browser session: verified Pyodide bytes run only inside a Worker.
// This is an availability boundary, not a separate security origin or a hard RAM limit.
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const PYODIDE_SRI = 'sha384-i3R37b3tF+HWudsUf1VSEOY2YxwSNMqY8DQa9Z0O3xh+NkJ9o+yjcGyIi5huj+nB';
export const PYTHON_LIMITS = Object.freeze({ prepareMs: 60000, executeMs: 15000, code: 50000, output: 64000, steps: 1000 });
const workerURL = new URL('../python-worker.js', import.meta.url);
workerURL.search = new URL(import.meta.url).search;

const failure = (kind, message = kind) => Object.assign(new Error(message), { kind });

export function createPythonRuntime({ onOutput = () => {}, onPhase = () => {} } = {}) {
  let session = null, active = null, sequence = 0, disposed = false;

  function flush(job) {
    clearTimeout(job.flushTimer);
    job.flushTimer = null;
    const chunks = job.buffer.splice(0);
    chunks.forEach(chunk => onOutput(chunk.text, chunk.cls));
  }

  function queueOutput(job, text, cls) {
    const previous = job.buffer.at(-1);
    if (previous?.cls === cls) previous.text += text;
    else job.buffer.push({ text, cls });
    // Many short print() lines must not force a DOM update and layout for every Worker message.
    job.flushTimer ??= setTimeout(() => flush(job), 16);
  }

  function stop(reason = 'stopped') {
    const current = session, job = active;
    session = null; active = null;
    if (current) {
      clearTimeout(current.timer);
      current.controller.abort();
      current.worker?.terminate();
      if (current.url) URL.revokeObjectURL(current.url);
      if (!current.ready) current.reject(failure(reason));
    }
    if (job) { clearTimeout(job.timer); flush(job); job.reject?.(failure(reason)); }
  }

  function arm(job, milliseconds) {
    clearTimeout(job.timer);
    job.timer = setTimeout(() => { if (active === job) stop('timeout'); }, milliseconds);
  }

  function message(current, data) {
    if (session !== current || !data || typeof data !== 'object') return;
    if (data.type === 'ready' && !current.ready) {
      current.ready = true;
      clearTimeout(current.timer);
      URL.revokeObjectURL(current.url); current.url = null;
      current.resolve(current);
      onPhase('ready');
      return;
    }
    if (data.type === 'error' && data.id === 0 && !current.ready) { stop('load'); return; }
    const job = active;
    if (!job || job.session !== current || data.id !== job.id) return;
    if (data.type === 'phase') {
      if (!['preparing', 'executing'].includes(data.phase)) return;
      arm(job, data.phase === 'executing' ? PYTHON_LIMITS.executeMs : PYTHON_LIMITS.prepareMs);
      onPhase(data.phase);
    } else if (data.type === 'stdout' || data.type === 'stderr') {
      if (typeof data.text !== 'string') return;
      const remaining = PYTHON_LIMITS.output - job.output;
      const text = data.text.slice(0, remaining);
      job.output += text.length;
      if (text) queueOutput(job, text, data.type === 'stderr' ? 'err' : '');
      if (data.text.length > remaining) stop('outputLimit');
    } else if (data.type === 'limit') {
      stop('outputLimit');
    } else if (data.type === 'result') {
      flush(job);
      job.resolve(data.value);
    } else if (data.type === 'error') {
      flush(job);
      job.reject(failure(data.kind === 'codeLimit' ? 'codeLimit' : 'python', String(data.message || 'Python error')));
    }
  }

  async function bootstrap(current) {
    try {
      const response = await fetch(`${PYODIDE_URL}pyodide.js`, {
        integrity: PYODIDE_SRI, credentials: 'omit', signal: current.controller.signal,
      });
      if (!response.ok) throw failure('load');
      const source = await response.text();
      if (session !== current) return;
      // worker-src already permits blob:. No eval, CSP relaxation or unverified import of the CDN bootstrap.
      current.url = URL.createObjectURL(new Blob([
        source, '\n;importScripts(', JSON.stringify(workerURL.href), ');\n',
      ], { type: 'application/javascript' }));
      current.worker = new Worker(current.url);
      current.worker.onmessage = event => message(current, event.data);
      current.worker.onerror = event => { event.preventDefault(); if (session === current) stop(current.ready ? 'runtime' : 'load'); };
      current.worker.onmessageerror = () => { if (session === current) stop('runtime'); };
      current.worker.postMessage({ type: 'init', id: 0, indexURL: PYODIDE_URL, limits: PYTHON_LIMITS });
    } catch {
      if (session === current) stop('load');
    }
  }

  function prepare() {
    if (disposed) return Promise.reject(failure('stopped'));
    if (typeof Worker === 'undefined') return Promise.reject(failure('unsupported'));
    if (session) return session.promise;
    const current = { controller: new AbortController(), ready: false, worker: null, url: null };
    current.promise = new Promise((resolve, reject) => { current.resolve = resolve; current.reject = reject; });
    session = current;
    current.timer = setTimeout(() => { if (session === current) stop('timeout'); }, PYTHON_LIMITS.prepareMs);
    onPhase('preparing');
    void bootstrap(current);
    return current.promise;
  }

  async function execute(type, code) {
    if (active) throw failure('busy');
    if (typeof code !== 'string' || code.length > PYTHON_LIMITS.code) throw failure('codeLimit');
    const job = { id: ++sequence, output: 0, session: null, buffer: [], flushTimer: null };
    active = job;
    try {
      const current = await prepare();
      if (active !== job || session !== current) throw failure('stopped');
      job.session = current;
      return await new Promise((resolve, reject) => {
        job.resolve = resolve; job.reject = reject;
        arm(job, PYTHON_LIMITS.prepareMs);
        onPhase('preparing');
        current.worker.postMessage({ type, id: job.id, code });
      });
    } finally {
      clearTimeout(job.timer);
      clearTimeout(job.flushTimer);
      if (active === job) active = null;
    }
  }

  return {
    ready: async () => { await prepare(); },
    run: code => execute('run', code),
    debug: code => execute('debug', code),
    stop,
    dispose: () => { disposed = true; stop(); },
  };
}
