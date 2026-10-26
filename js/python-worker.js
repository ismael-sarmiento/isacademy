// Classic Worker entry. The controller supplies the SRI-verified Pyodide bootstrap before importing this file.
// Python and trace generation never execute on the page's rendering thread.
const TRACER = `
import sys, io, json, types
def __isa_trace(src, max_steps, max_output):
    try:
        code = compile(src, "<alumno>", "exec")
    except SyntaxError as exc:
        err = {"l": exc.lineno, "m": "SyntaxError: " + str(exc.msg)}
        return json.dumps({"steps": [{"l": exc.lineno, "e": "error", "s": [], "v": {}, "o": 0}], "out": "", "error": err, "limited": False})
    def units(text): return len(text.encode("utf-16-le", "surrogatepass")) // 2
    class TooMuchOutput(Exception): pass
    class BoundedOutput(io.StringIO):
        def __init__(self):
            super().__init__()
            self.written = 0
        def write(self, text):
            remaining = max_output - self.written
            size = units(text)
            if size > remaining:
                part = text.encode("utf-16-le", "surrogatepass")[:remaining * 2].decode("utf-16-le", "ignore")
                self.written += units(part)
                super().write(part)
                raise TooMuchOutput()
            self.written += size
            return super().write(text)
    buf, steps, g = BoundedOutput(), [], {"__name__": "__main__"}
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
            step = {"l": frame.f_lineno, "e": event, "s": stack(frame), "v": snap(frame.f_locals), "o": units(buf.getvalue())}
            if event == "return": step["r"] = show(arg)
            steps.append(step)
        return tracer
    error, limited, output_limited = None, False, False
    old = sys.stdout
    sys.stdout = buf
    sys.settrace(tracer)
    try:
        exec(code, g)
    except TooMany:
        limited = True
    except TooMuchOutput:
        output_limited = True
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
    steps.append({"l": error["l"] if error else None, "e": "error" if error else ("limit" if limited else ("output-limit" if output_limited else "end")),
                  "s": [], "v": snap(g), "o": units(buf.getvalue())})
    return json.dumps({"steps": steps, "out": buf.getvalue(), "error": error, "limited": limited, "outputLimited": output_limited})
`;

let python = null, limits = null, active = null;
const send = (type, id, fields = {}) => self.postMessage({ type, id, ...fields });

function output(text, stream) {
  if (!active) return;
  const remaining = limits.output - active.output;
  const chunk = text.slice(0, remaining);
  active.output += chunk.length;
  if (chunk) send(stream, active.id, { text: chunk });
  if (text.length > remaining) {
    send('limit', active.id);
    throw new Error('outputLimit');
  }
}

function usefulError(error) {
  const lines = String(error?.message || error).split('\n').filter(Boolean);
  const from = lines.map(line => line.includes('File "<exec>"')).lastIndexOf(true);
  return (from >= 0 ? lines.slice(from) : lines.slice(-1)).join('\n');
}

self.onmessage = async ({ data }) => {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'init') {
    if (!python) {
      python = (async () => {
        limits = data.limits;
        if (!limits || !['code', 'output', 'steps'].every(key => Number.isInteger(limits[key]) && limits[key] > 0)) throw new Error('Invalid limits');
        const py = await loadPyodide({ indexURL: data.indexURL });
        py.setStdout({ batched: text => output(text + '\n', 'stdout') });
        py.setStderr({ batched: text => output(text + '\n', 'stderr') });
        py.runPython('import warnings\nwarnings.filterwarnings("ignore", category=DeprecationWarning)');
        py.runPython(TRACER);
        return py;
      })();
    }
    try { await python; send('ready', 0); }
    catch { send('error', 0, { kind: 'load' }); }
    return;
  }
  if (!['run', 'debug'].includes(data.type) || !Number.isSafeInteger(data.id) || data.id < 1) return;
  if (active) { send('error', data.id, { kind: 'busy', message: 'Python is busy' }); return; }
  active = { id: data.id, output: 0 };
  let result = null, trace = null;
  try {
    const py = await python;
    if (!py || typeof data.code !== 'string') throw new Error('Python is not ready');
    if (data.code.length > limits.code) { send('error', data.id, { kind: 'codeLimit' }); return; }
    send('phase', data.id, { phase: 'preparing' });
    await py.loadPackagesFromImports(data.code);
    send('phase', data.id, { phase: 'executing' });
    if (data.type === 'debug') {
      trace = py.globals.get('__isa_trace');
      const value = JSON.parse(trace(data.code, limits.steps, limits.output));
      send('result', data.id, { value: { ...value, stepLimit: limits.steps } });
    } else {
      result = await py.runPythonAsync(data.code);
      if (result !== undefined && result !== null) output(String(result) + '\n', 'stdout');
      send('result', data.id, { value: null });
    }
  } catch (error) {
    send('error', data.id, { kind: 'python', message: usefulError(error) });
  } finally {
    result?.destroy?.(); trace?.destroy?.();
    active = null;
  }
};
