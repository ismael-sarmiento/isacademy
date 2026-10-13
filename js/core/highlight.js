// Syntax highlighting for the hero mini-lessons and the debugger: strings, comments and keywords.
import { esc } from './dom.js';

const KEYWORDS = {
  python: 'def|return|for|in|if|elif|else|while|import|from|as|print|True|False|None|class|and|or|not|try|except|finally|with|lambda|break|continue|pass|yield|range|len',
  sql: 'SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|SUM|COUNT|AVG|AS|DESC|ASC|JOIN|ON|AND|OR',
};
const COMMENT = { python: '#', sql: '--' };
const keywordRe = {};

// one line → HTML; a string that is still being typed (no closing quote) is coloured too
export function highlightLine(line, lang = 'python') {
  const kw = keywordRe[lang] ??= new RegExp(`\\b(${KEYWORDS[lang]})\\b`, 'g');
  let html = '', plain = '';
  const flush = () => { html += esc(plain).replace(kw, '<span class="k">$1</span>'); plain = ''; };
  for (let i = 0; i < line.length;) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      flush();
      const end = line.indexOf(ch, i + 1);
      const stop = end === -1 ? line.length : end + 1;
      html += `<span class="s">${esc(line.slice(i, stop))}</span>`;
      i = stop;
    } else if (line.startsWith(COMMENT[lang], i)) {
      flush();
      html += `<span class="c">${esc(line.slice(i))}</span>`;
      break;
    } else {
      plain += ch; i++;
    }
  }
  flush();
  return html;
}

export const highlight = (code, lang = 'python') => code.split('\n').map(line => highlightLine(line, lang)).join('\n');
export const langOf = filename => (filename.endsWith('.sql') ? 'sql' : 'python');
