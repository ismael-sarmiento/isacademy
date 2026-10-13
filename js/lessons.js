// Hero mini-lessons: code typed tab by tab, rotating every few seconds unless the visitor is reading.
import { $, esc, sleep, reducedMotion } from './core/dom.js';
import { highlight, langOf } from './core/highlight.js';
import { t } from './i18n.js';

const ROTATE_MS = 6000;
let index = 0, typingToken = 0, rotateTimer = null, started = false;
const lessons = () => t('hero.lessons');

function renderTabs(rebuild = false) {
  const box = $('#codeTabs');
  if (rebuild || box.children.length !== lessons().length) {
    box.innerHTML = lessons().map((l, i) => `<button type="button" role="tab" id="lesson-tab-${i}" aria-controls="heroCode" data-lesson="${i}">${esc(l.tab)}</button>`).join('');
  }
  // only flip the selected state: rebuilding would drop keyboard focus
  [...box.children].forEach((b, i) => { b.setAttribute('aria-selected', String(i === index)); b.tabIndex = i === index ? 0 : -1; });
  $('#heroCode').setAttribute('aria-labelledby', `lesson-tab-${index}`);
  // keep the active tab visible by scrolling the tab strip only (never the page)
  const active = box.children[index];
  if (active && box.scrollWidth > box.clientWidth) box.scrollTo({ left: active.offsetLeft - box.offsetLeft - 8, behavior: 'smooth' });
}

async function show(i, typed = true) {
  index = i;
  const token = ++typingToken;
  const lesson = lessons()[i];
  const lang = langOf(lesson.tab);
  renderTabs();
  const note = $('#heroNote');
  note.style.opacity = 0;
  setTimeout(() => { note.textContent = lesson.note; note.style.opacity = 1; }, 250);
  const pre = $('#heroCode');
  const caret = '<span class="caret"></span>';
  if (typed && !reducedMotion()) {
    for (let n = 0; n <= lesson.code.length; n += 2) {
      if (token !== typingToken) return;
      pre.innerHTML = highlight(lesson.code.slice(0, n), lang) + caret;
      await sleep(22);
    }
  }
  if (token !== typingToken) return;
  pre.innerHTML = highlight(lesson.code, lang) + caret;
  scheduleRotation();
}

function scheduleRotation() {
  clearTimeout(rotateTimer);
  rotateTimer = setTimeout(() => {
    if ($('.code-card').matches(':hover, :focus-within') || document.hidden) { scheduleRotation(); return; }
    show((index + 1) % lessons().length);
  }, ROTATE_MS);
}

export function startLessons() {
  if (started) return;
  started = true;
  const tabs = $('#codeTabs');
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-lesson]'); if (b) show(Number(b.dataset.lesson)); });
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = lessons().length;
    show((index + (e.key === 'ArrowRight' ? 1 : n - 1)) % n);
    tabs.children[index].focus();
  });
  show(0);
}

// language change: same lesson, new texts, no typing animation
export function refreshLessons() {
  if (!started) return;
  renderTabs(true);
  show(index, false);
}
