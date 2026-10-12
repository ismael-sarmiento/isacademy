// Wires the intro, the opening animation and the landing sections.
import { setLang, detectLang, currentLang, t, onLangChange } from './i18n.js?v=20261012g';
import { initTheme, toggleTheme } from './theme.js?v=20261012g';
import { runIntro } from './intro.js?v=20261012g';
import { openAcademy, revealSite, finish } from './opening.js?v=20261012g';
import { CONTACT } from './config.js?v=20261012g';
import { initConsole, openConsole, runCode, resetConsole, renderSamples } from './console.js?v=20261012g';
import { initAssistant, refreshAssistant, showAssistant } from './assistant.js?v=20261012g';

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let interest = null; // id of the subject chosen from a "book" button, used in the contact block
let factOrder = [], factIdx = 0;

// ---------- contact ----------
const interestName = () => (interest === 'open' ? t('open.interestName') : interest ? t('subjects.items').find(x => x.id === interest)?.name : null);
const external = label => `${esc(label)}<span class="sr-only"> ${esc(t('contact.newTab'))}</span>`;

function contactBlock() {
  const name = interestName();
  const live = CONTACT.whatsapp || CONTACT.phone;
  if (!live) {
    // no number yet: the provisional profile is the main, clickable channel
    return `<div class="contact-row"><a class="btn btn-primary btn-lg" href="${CONTACT.profileUrl}" target="_blank" rel="noopener">${external(t('contact.profile'))}</a></div>
      <p class="contact-note">${esc(t('contact.profileNote'))}</p>
      <p class="muted">${esc(t('contact.note'))}</p>
      <p class="muted">${esc(t('contact.soonLine'))}</p>`;
  }
  const waText = encodeURIComponent(t('contact.waText').replace('{aula}', name || 'IsAcademy'));
  const wa = CONTACT.whatsapp ? `<a class="btn btn-primary btn-lg" href="https://wa.me/${CONTACT.whatsapp}?text=${waText}" target="_blank" rel="noopener">${external(t('contact.whatsapp'))}</a>` : '';
  const call = CONTACT.phone ? `<a class="btn btn-lg" href="tel:${CONTACT.phone}">${esc(t('contact.call'))}</a>` : '';
  return `<div class="contact-row">${wa}${call}</div><p class="muted">${esc(t('contact.note'))}</p>`;
}

function renderContact() {
  $('#contactBlock').innerHTML = contactBlock();
  const tag = $('#interest'), name = interestName();
  tag.hidden = !name;
  if (name) tag.textContent = t('contact.interest').replace('{aula}', name);
}

// ---------- sections ----------
function renderLists() {
  $('#trust').innerHTML = t('hero.trust').map(x => `<li>${esc(x)}</li>`).join('');
  $('#aboutBadges').innerHTML = t('about.badges').map(x => `<li>${esc(x)}</li>`).join('');
  $('#pillars').innerHTML = t('method.pillars').map((p, i) =>
    `<article class="card pillar reveal" style="--d:${i * .08}s"><span class="n">${i + 1}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></article>`).join('');
  $('#steps').innerHTML = t('method.steps').map((s, i) => `<li class="reveal" style="--d:${i * .08}s"><h4>${esc(s.t)}</h4><p>${esc(s.d)}</p></li>`).join('');

  // one balanced 3×3 grid; each card carries its group label
  const items = t('subjects.items');
  $('#subjects').innerHTML = `<div class="subject-grid">${items.map((s, i) => `
      <details class="subject reveal" id="materia-${s.id}" style="--d:${(i % 3) * .06}s">
        <summary><span class="sgroup">${esc(t('subjects.groups.' + s.group))}</span><b>${esc(s.name)}</b><span>${esc(s.short)}</span></summary>
        <div class="body">
          <h4>${esc(t(s.alt ? 'subjects.learnAlt' : 'subjects.learn'))}</h4>
          <ul>${s.learn.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
          <h4>${esc(t('subjects.how'))}</h4><p>${esc(s.how)}</p>
          <a class="btn btn-primary" href="#contacto" data-book="${s.id}">${esc(s.cta)}</a>
        </div>
      </details>`).join('')}</div>`;

  $('#why').innerHTML = t('why.items').map((w, i) => `<article class="card reveal" style="--d:${(i % 3) * .08}s"><h3>${esc(w.t)}</h3><p>${esc(w.d)}</p></article>`).join('');

  const tr = t('reviews.translated');
  $('#reviews').innerHTML = t('reviews.items').map(r => `<figure class="card review reveal">
      <div class="stars" role="img" aria-label="${esc(t('reviews.starsLabel'))}">★★★★★</div>
      <blockquote>“${esc(r.text)}”</blockquote>
      <figcaption>${esc(r.name)} · ${esc(r.date)}${tr ? ` · ${esc(tr)}` : ''}</figcaption></figure>`).join('');
  $('#reviewsLink').href = CONTACT.profileUrl;
  $('#reviewsLink').innerHTML = external(t('reviews.source'));

  $('#faqList').innerHTML = t('faq.items').map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');

  const facts = t('resources.facts');
  if (factOrder.length !== facts.length) { factOrder = facts.map((_, i) => i).sort(() => Math.random() - .5); factIdx = 0; }
  $('#fact').textContent = facts[factOrder[factIdx]];

  renderContact();
  observeReveals();
}

function nextFact() {
  const el = $('#fact'), facts = t('resources.facts');
  factIdx = (factIdx + 1) % factOrder.length;
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = facts[factOrder[factIdx]]; el.style.opacity = 1; }, 200);
}

// ---------- hero mini-lessons ----------
const KEYWORDS = /\b(import|from|as|def|return|for|in|if|else|print|SELECT|FROM|GROUP BY|ORDER BY|LIMIT|SUM|AS|DESC)\b/g;
function highlight(code) {
  return code.split('\n').map(line => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('#') || trimmed.startsWith('--')) return `<span class="c">${esc(line)}</span>`;
    // strings first, then keywords outside strings; a trailing comment is greyed out
    const [body, ...rest] = line.split(/(?=\s#\s)/);
    const parts = body.split(/("[^"]*"?)/).map((part, i) => (i % 2
      ? `<span class="s">${esc(part)}</span>`
      : esc(part).replace(KEYWORDS, '<span class="k">$1</span>')));
    return parts.join('') + (rest.length ? `<span class="c">${esc(rest.join(''))}</span>` : '');
  }).join('\n');
}

let lessonIdx = 0, typingToken = 0, rotateTimer = null;
function renderTabs(rebuild = false) {
  const box = $('#codeTabs');
  if (rebuild || box.children.length !== t('hero.lessons').length) {
    box.innerHTML = t('hero.lessons').map((l, i) => `<button type="button" role="tab" data-lesson="${i}">${esc(l.tab)}</button>`).join('');
  }
  // only flip the selected state: rebuilding would drop keyboard focus
  [...box.children].forEach((b, i) => { b.setAttribute('aria-selected', String(i === lessonIdx)); b.tabIndex = i === lessonIdx ? 0 : -1; });
  // keep the active tab visible by scrolling the tab strip only (never the page)
  const active = box.children[lessonIdx];
  if (active && box.scrollWidth > box.clientWidth) box.scrollTo({ left: active.offsetLeft - box.offsetLeft - 8, behavior: 'smooth' });
}
async function showLesson(i, typed = true) {
  lessonIdx = i;
  const token = ++typingToken;
  const lesson = t('hero.lessons')[i];
  renderTabs();
  const note = $('#heroNote');
  note.style.opacity = 0;
  setTimeout(() => { note.textContent = lesson.note; note.style.opacity = 1; }, 250);
  const pre = $('#heroCode');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typed && !reduced) {
    for (let n = 0; n <= lesson.code.length; n += 2) {
      if (token !== typingToken) return;
      pre.innerHTML = highlight(lesson.code.slice(0, n)) + '<span class="caret"></span>';
      await new Promise(r => setTimeout(r, 22));
    }
  }
  if (token !== typingToken) return;
  pre.innerHTML = highlight(lesson.code) + '<span class="caret"></span>';
  scheduleRotation();
}
function scheduleRotation() {
  clearTimeout(rotateTimer);
  rotateTimer = setTimeout(() => {
    if ($('.code-card').matches(':hover, :focus-within') || document.hidden) { scheduleRotation(); return; }
    showLesson((lessonIdx + 1) % t('hero.lessons').length);
  }, 6000);
}
function typeCode() {
  $('#codeTabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = t('hero.lessons').length;
    showLesson((lessonIdx + (e.key === 'ArrowRight' ? 1 : n - 1)) % n);
    $('#codeTabs').children[lessonIdx].focus();
  });
  showLesson(0);
}

// ---------- scroll behaviour ----------
let revealObserver;
function observeReveals() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
  }
  document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}

function scrollSpy() {
  const links = [...document.querySelectorAll('.sections a:not(.btn)')];
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.remove('active'));
    const a = map.get(e.target.id);
    if (!a) return;
    a.classList.add('active');
    // on phones the menu scrolls sideways: move only the menu, never the page
    const nav = a.parentElement;
    if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));
}

// ---------- boot ----------
async function boot() {
  initTheme();
  await setLang(detectLang());
  renderLists();
  onLangChange(() => { renderLists(); renderSamples(); refreshAssistant(); if ($('#codeTabs').children.length) { renderTabs(true); showLesson(lessonIdx, false); } });
  scrollSpy();
  initConsole();
  initAssistant(({ href, action, book }) => {
    if (book) { interest = book; renderContact(); }
    if (action === 'console-open') { document.getElementById('consola').scrollIntoView({ behavior: 'smooth' }); openConsole(); return; }
    if (href) {
      const target = document.getElementById(href.slice(1));
      if (target?.tagName === 'DETAILS') target.open = true;
      target?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  document.addEventListener('click', e => {
    const lesson = e.target.closest('[data-lesson]');
    if (lesson) { showLesson(Number(lesson.dataset.lesson)); return; }
    const el = e.target.closest('[data-action], [data-book]');
    if (!el) return;
    if (el.hasAttribute('data-book')) { interest = el.dataset.book; renderContact(); return; }
    switch (el.dataset.action) {
      case 'enter': openAcademy($('#intro')).then(typeCode); break;
      case 'lang': setLang(currentLang() === 'es' ? 'en' : 'es', true); break;
      case 'theme': toggleTheme(); break;
      case 'fact': nextFact(); break;
      case 'console-open': openConsole(); break;
      case 'console-run': runCode(); break;
      case 'console-reset': resetConsole(); break;
    }
  });

  // deep links (e.g. /#contacto from WhatsApp or an ad) go straight to their section
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) {
    revealSite({ animate: false, scroll: false });
    finish($('#intro'));
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }));
    typeCode();
    return;
  }
  document.querySelectorAll('.topbar, #site, .footer').forEach(el => { el.inert = true; });
  runIntro($('#intro'));
}

boot();
