#!/usr/bin/env bash
# Bumps the cache-busting version of CSS, JS modules and i18n files.
# Run it before publishing changes so visitors never mix old and new files.
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:-$(date +%Y%m%d%H%M)}"
sed -i.bak -E "s#(css/main\.css|js/app\.js)\?v=[0-9a-z]+#\1?v=$V#g" index.html
sed -i.bak -E "s#(from '\./[a-z0-9]+\.js)\?v=[0-9a-z]+'#\1?v=$V'#g; s#(\.json)\?v=[0-9a-z]+#\1?v=$V#g" js/*.js
rm -f index.html.bak js/*.js.bak
echo "version → $V"
