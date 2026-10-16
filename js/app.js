// Entry point: boots the language, the sections and the interactive pieces, then the intro or a deep link.
// Each feature lives in its own module; this file only wires them together.
import { $, $$, scrollBehavior } from './core/dom.js';
import { escapeForeignFrame } from './core/frame-guard.js';
import { setLang, detectLang, currentLang, onLangChange } from './i18n.js';
import { initTheme, toggleTheme } from './theme.js';
import { runIntro } from './intro.js';
import { openAcademy, revealSite, finish } from './opening.js';
import { renderSections, nextFact } from './sections.js';
import { initForm, renderForm, setInterest } from './form.js';
import { startLessons, refreshLessons } from './lessons.js';
import { initNav, observeReveals } from './nav.js';
import { initConsole, openConsole, runCode, debugCode, resetConsole, renderSamples } from './console.js';
import { initAssistant, refreshAssistant } from './assistant.js';
import { exportPrerenderIfAsked } from './prerender.js';
import { initPdfLinks } from './pdf.js';

function render() {
  renderSections();
  renderForm();
  observeReveals();
}

// buttons and links anywhere on the page declare what they do with data-action / data-book
const ACTIONS = {
  enter: () => openAcademy($('#intro')).then(startLessons),
  lang: () => setLang(currentLang() === 'es' ? 'en' : 'es', true),
  theme: toggleTheme,
  fact: nextFact,
  'console-open': openConsole,
  'console-run': runCode,
  'console-debug': debugCode,
  'console-reset': resetConsole,
};

function onClick(e) {
  const el = e.target.closest('[data-action], [data-book], a[href="#contacto"]');
  if (!el) return;
  // every way into the form says what it books: a subject, the open class, or nothing specific
  if (el.matches('[data-book], a[href="#contacto"]')) { setInterest(el.dataset.book || null); return; }
  ACTIONS[el.dataset.action]?.();
}

// the assistant's answer buttons reuse the same navigation as the page
function onAssistantAction({ href, action, book }) {
  if (book || href === '#contacto') setInterest(book || null);
  if (action === 'console-open') { $('#consola').scrollIntoView({ behavior: scrollBehavior() }); openConsole(); return; }
  if (!href) return;
  const target = document.getElementById(href.slice(1));
  if (target?.tagName === 'DETAILS') target.open = true;
  target?.scrollIntoView({ behavior: scrollBehavior() });
}

async function boot() {
  if (escapeForeignFrame()) return;
  initTheme();
  await setLang(detectLang());
  render();
  exportPrerenderIfAsked();
  onLangChange(() => { render(); renderSamples(); refreshAssistant(); refreshLessons(); });
  initAssistant(onAssistantAction);  // first: nav.js tucks Alan's button over the form
  initNav();
  initForm();
  initConsole();
  document.addEventListener('click', onClick);
  initPdfLinks();

  // ?pdf: the page as the brochure prints it (tools/pdf.py, css/print.css): no intro, everything revealed;
  // ?pdf=dark prints it in the dark theme
  const pdfMode = new URLSearchParams(location.search).get('pdf');
  if (pdfMode !== null) {
    if (pdfMode === 'dark') document.documentElement.dataset.theme = 'dark';
    revealSite({ animate: false, scroll: false });
    finish($('#intro'));
    $$('.reveal').forEach(el => el.classList.add('in'));
    return;
  }

  // #hero is the start of the page, not a deep link: a refresh there plays the intro again
  if (location.hash === '#hero') history.replaceState(history.state, '', location.pathname + location.search);
  // deep links (e.g. /#contacto from WhatsApp or an ad) go straight to their section
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) {
    revealSite({ animate: false, scroll: false });
    finish($('#intro'));
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant' }));
    startLessons();
    return;
  }
  $$('.topbar, #site, .footer').forEach(el => { el.inert = true; });
  runIntro($('#intro'));
}

boot();
