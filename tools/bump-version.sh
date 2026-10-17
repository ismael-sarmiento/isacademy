#!/usr/bin/env bash
# Sets the cache-busting version of the whole site in ONE place: index.html.
# - the import map lists every JS module as file.js?v=<version> (modules import each other without versions);
# - the stylesheet and the entry script get the same version; i18n.js reads it from its own URL;
# - the Content-Security-Policy hash of the inline import map is recomputed;
# - Alan (assistant + avatar) and his stylesheet come from the shared design system in /assets/ds/ (portada repository).
# Usage: tools/bump-version.sh [version]   (default: timestamp)
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:-$(date +%Y%m%d%H%M)}"
python3 - "$V" <<'PY'
import base64, hashlib, json, pathlib, re, sys
v = sys.argv[1]
root = pathlib.Path('.')
modules = sorted(p.as_posix() for p in root.glob('js/**/*.js'))
imports = {f'./{m}': f'./{m}?v={v}' for m in modules}
# Alan and his avatar come from the shared design system of ismael-sarmiento.github.io (same origin)
for m in ('/assets/ds/assistant.js', '/assets/ds/avatar.js', '/assets/ds/favicon.js'):
    imports[m] = f'{m}?v={v}'
importmap = json.dumps({'imports': imports}, indent=2)
html = (root / 'index.html').read_text()
html = re.sub(r'<script type="importmap">.*?</script>', lambda m: f'<script type="importmap">{importmap}</script>', html, flags=re.S)
html = re.sub(r'(css/main\.css|css/print\.css|js/app\.js|/assets/ds/assistant\.css|/assets/ds/tokens\.css)\?v=[0-9a-z]+', rf'\1?v={v}', html)
digest = base64.b64encode(hashlib.sha256(importmap.encode()).digest()).decode()
html = re.sub(r"'sha256-[A-Za-z0-9+/=]+'", f"'sha256-{digest}'", html)
(root / 'index.html').write_text(html)
print(f'version → {v} ({len(modules)} modules, import map sha256-{digest[:10]}…)')
PY
