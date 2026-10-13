#!/usr/bin/env python3
"""Writes the Spanish content into index.html so crawlers that do not run JavaScript read the whole page.

1. Static texts: every [data-i18n], [data-i18n-html], [data-i18n-ph], [data-i18n-aria] and [data-i18n-alt]
   gets its Spanish value from i18n/es.json.
2. Rendered sections (subjects, FAQ, reviews...): the page is opened in headless Chrome with ?prerender,
   js/app.js exports the HTML of those containers and it is copied between <!--pre--> markers.

The JavaScript renders the same markup again on load, so nothing changes for visitors.
Usage (with the site served locally):  python3 tools/prerender.py [http://127.0.0.1:8766/]
"""
import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
URL = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8766/').rstrip('/') + '/?prerender'

es = json.loads((ROOT / 'i18n/es.json').read_text())


def t(path):
    node = es
    for key in path.split('.'):
        node = node[key]
    return node


def set_attr(tag, name, value):
    value = html.escape(value, quote=True)
    if re.search(rf'\s{name}="', tag):
        return re.sub(rf'(\s{name}=")[^"]*(")', lambda m: m.group(1) + value + m.group(2), tag, count=1)
    return tag[:-1] + f' {name}="{value}">'


def static_texts(src):
    def text(m):
        return m.group(1) + html.escape(t(m.group(3)), quote=False) + m.group(5)
    src = re.sub(r'(<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)(.*?)(</\2>)', text, src, flags=re.S)

    def rich(m):
        return m.group(1) + t(m.group(3)) + m.group(5)
    src = re.sub(r'(<(\w+)\b[^>]*\sdata-i18n-html="([^"]+)"[^>]*>)(.*?)(</\2>)', rich, src, flags=re.S)

    for data_attr, attr in (('data-i18n-ph', 'placeholder'), ('data-i18n-aria', 'aria-label'), ('data-i18n-alt', 'alt')):
        src = re.sub(rf'<\w+\b[^>]*\s{data_attr}="([^"]+)"[^>]*>', lambda m: set_attr(m.group(0), attr, t(m.group(1))), src)
    return src


def rendered_sections():
    dom = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', URL],
                         capture_output=True, text=True, check=True).stdout
    m = re.search(r'<script type="application/json" id="prerender-out">(.*?)</script>', dom, flags=re.S)
    if not m:
        sys.exit('prerender: no export found. Is the site served at ' + URL + '?')
    return json.loads(m.group(1))  # script text is serialised raw, not HTML-escaped


def inject(src, element_id, inner):
    start = re.search(rf'<(\w+)\b[^>]*\sid="{element_id}"[^>]*>', src)
    if not start:
        sys.exit(f'prerender: #{element_id} not found in index.html')
    tag, pos = start.group(1), start.end()
    block = f'<!--pre-->{inner}<!--/pre-->'
    if src.startswith('<!--pre-->', pos):
        end = src.index('<!--/pre-->', pos) + len('<!--/pre-->')
    else:
        end = src.index(f'</{tag}>', pos)  # first run: the element is empty or holds plain text
    return src[:pos] + block + src[end:]


def main():
    index = ROOT / 'index.html'
    src = static_texts(index.read_text())
    for element_id, inner in rendered_sections().items():
        src = inject(src, element_id, inner)
    index.write_text(src)
    print(f'prerender: index.html updated ({len(src) // 1024} KB)')


if __name__ == '__main__':
    main()
