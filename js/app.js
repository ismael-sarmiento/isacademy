// Wires the intro, the opening animation and the landing sections.
import { setLang, detectLang, currentLang, t, onLangChange } from './i18n.js?v=20261013k';
import { initTheme, toggleTheme } from './theme.js?v=20261013k';
import { runIntro } from './intro.js?v=20261013k';
import { openAcademy, revealSite, finish } from './opening.js?v=20261013k';
import { CONTACT } from './config.js?v=20261013k';
import { initConsole, openConsole, runCode, debugCode, resetConsole, renderSamples } from './console.js?v=20261013k';
import { initAssistant, refreshAssistant } from './assistant.js?v=20261013k';

const $ = sel => document.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let interest = null; // id of the subject chosen from a "book" button, used in the contact block
let factOrder = [], factIdx = 0;

// ---------- contact ----------
const external = label => `${esc(label)}<span class="sr-only"> ${esc(t('contact.newTab'))}</span>`;

// ---------- booking form (delivered by FormSubmit to CONTACT.formEmail) ----------
function renderContact() {
  const sel = $('#fInterest');
  const current = interest || sel.value;
  sel.innerHTML = `<option value="">${esc(t('contact.fChoose'))}</option>`
    + t('subjects.items').map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')
    + `<option value="open">${esc(t('contact.fOpen'))}</option><option value="other">${esc(t('contact.fOther'))}</option>`;
  if (current) sel.value = current;
  if (sel.value) fieldError(sel, '');
  syncMessageRequired();
  const mail = `<a href="mailto:${esc(CONTACT.publicEmail)}">${esc(CONTACT.publicEmail)}</a>`;
  $('#privacyText').innerHTML = esc(t('contact.privacy')).replace('{email}', mail);
  $('#footerMail').href = `mailto:${CONTACT.publicEmail}`;
  $('#footerMail').textContent = CONTACT.publicEmail;
}

// signing up for an open class needs no explanation: the message is only required for classes
function syncMessageRequired() {
  const form = $('#leadForm'), msg = form.elements.message;
  const optional = form.elements.interest.value === 'open';
  msg.required = !optional;
  msg.closest('label').querySelector('.req').hidden = optional;
  if (optional) fieldError(msg, '');
}

function fieldError(field, msg) {
  const label = field.closest('label');
  let err = label.querySelector('.f-error');
  if (!msg) { err?.remove(); field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); return; }
  if (!err) { err = document.createElement('span'); err.className = 'f-error'; err.id = `err-${field.name}`; label.appendChild(err); }
  err.textContent = msg;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', err.id);
}

function validate(form) {
  let first = null;
  for (const name of ['name', 'email', 'interest', 'message']) {
    const f = form.elements[name];
    const empty = f.required && !f.value.trim();
    const bad = name === 'email' && !empty && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.value.trim());
    fieldError(f, empty ? t('contact.fRequired') : bad ? t('contact.fBadEmail') : '');
    if ((empty || bad) && !first) first = f;
  }
  const priv = form.elements.privacy;
  fieldError(priv, priv.checked ? '' : t('contact.fNeedPrivacy'));
  if (!priv.checked && !first) first = priv;
  first?.focus();
  return !first;
}

async function submitForm(e) {
  e.preventDefault();
  const form = e.currentTarget, status = $('#formStatus'), btn = $('#formSend');
  status.textContent = ''; status.className = 'f-status';
  if (!validate(form)) return;
  if (form.elements._honey.value) return; // bots fill the invisible field
  const sel = form.elements.interest;
  // keys become the row labels of the email Ismael receives, so they are written for him in Spanish
  const data = {
    Nombre: form.elements.name.value.trim(),
    Email: form.elements.email.value.trim(),
    'Teléfono': form.elements.phone.value.trim() || '—',
    'Interés': sel.options[sel.selectedIndex].text,
    'Edad o nivel': form.elements.level.value.trim() || '—',
    Mensaje: form.elements.message.value.trim() || '—',
    Idioma: document.documentElement.lang === 'en' ? 'Inglés' : 'Español',
    _subject: `Nueva solicitud en IsAcademy: ${sel.options[sel.selectedIndex].text}${document.documentElement.lang === 'en' ? ' (EN)' : ''}`,
    _template: 'table',
    _replyto: form.elements.email.value.trim(),
  };
  btn.disabled = true; btn.textContent = t('contact.fSending');
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT.formEmail}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.status);
    form.reset(); interest = null; renderContact();
    status.textContent = t('contact.fOk'); status.classList.add('ok');
  } catch {
    status.textContent = t('contact.fError'); status.classList.add('err');
  } finally {
    btn.disabled = false; btn.textContent = t('contact.fSend');
  }
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
  const q = currentLang() === 'es' ? ['«', '»'] : ['“', '”'];
  $('#reviews').innerHTML = t('reviews.items').map(r => `<figure class="card review reveal">
      <div class="stars" role="img" aria-label="${esc(t('reviews.starsLabel'))}">★★★★★</div>
      <blockquote>${q[0]}${esc(r.text)}${q[1]}</blockquote>
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
    box.innerHTML = t('hero.lessons').map((l, i) => `<button type="button" role="tab" id="lesson-tab-${i}" aria-controls="heroCode" data-lesson="${i}">${esc(l.tab)}</button>`).join('');
  }
  // only flip the selected state: rebuilding would drop keyboard focus
  [...box.children].forEach((b, i) => { b.setAttribute('aria-selected', String(i === lessonIdx)); b.tabIndex = i === lessonIdx ? 0 : -1; });
  $('#heroCode').setAttribute('aria-labelledby', `lesson-tab-${lessonIdx}`);
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
  // anti-clickjacking: GitHub Pages cannot send frame-ancestors, so the page refuses to live inside another site's frame
  if (window.top !== window.self) {
    let sameOrigin = false;
    try { sameOrigin = window.top.location.origin === window.location.origin; } catch { /* cross-origin frame */ }
    if (!sameOrigin) { try { window.top.location.replace(window.location.href); } catch { document.body.hidden = true; } return; }
  }
  initTheme();
  await setLang(detectLang());
  renderLists();
  onLangChange(() => { renderLists(); renderSamples(); refreshAssistant(); if ($('#codeTabs').children.length) { renderTabs(true); showLesson(lessonIdx, false); } });
  scrollSpy();
  initConsole();
  $('#leadForm').addEventListener('submit', submitForm);
  $('#leadForm').addEventListener('input', e => { if (e.target.getAttribute('aria-invalid')) fieldError(e.target, ''); });
  $('#fInterest').addEventListener('change', syncMessageRequired);
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
      case 'console-debug': debugCode(); break;
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
