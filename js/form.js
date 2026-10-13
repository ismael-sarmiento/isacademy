// Booking form: options, validation and delivery by FormSubmit to CONTACT.formEmail.
import { $, esc } from './core/dom.js';
import { t, currentLang } from './i18n.js';
import { CONTACT } from './config.js';

let interest = null; // subject chosen from a "book" button, kept until the visitor sends or changes it
const form = () => $('#leadForm');

// ---------- rendering (also called when the language changes) ----------
export function renderForm() {
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

export function setInterest(id) {
  interest = id;
  renderForm();
}

// signing up for an open class needs no explanation: the message is only required for classes
function syncMessageRequired() {
  const msg = form().elements.message;
  const optional = form().elements.interest.value === 'open';
  msg.required = !optional;
  msg.closest('label').querySelector('.req').hidden = optional;
  if (optional) fieldError(msg, '');
}

// ---------- validation ----------
function fieldError(field, msg) {
  const label = field.closest('label');
  let err = label.querySelector('.f-error');
  if (!msg) { err?.remove(); field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); return; }
  if (!err) { err = document.createElement('span'); err.className = 'f-error'; err.id = `err-${field.name}`; label.appendChild(err); }
  err.textContent = msg;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', err.id);
}

function validate(f) {
  let first = null;
  for (const name of ['name', 'email', 'interest', 'message']) {
    const field = f.elements[name];
    const empty = field.required && !field.value.trim();
    const bad = name === 'email' && !empty && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(field.value.trim());
    fieldError(field, empty ? t('contact.fRequired') : bad ? t('contact.fBadEmail') : '');
    if ((empty || bad) && !first) first = field;
  }
  const privacy = f.elements.privacy;
  fieldError(privacy, privacy.checked ? '' : t('contact.fNeedPrivacy'));
  if (!privacy.checked && !first) first = privacy;
  first?.focus();
  return !first;
}

// ---------- the email Ismael receives ----------
// FormSubmit turns each key into a row of its "box" template, so keys are labels written for him in Spanish
function buildEmail(f) {
  const v = name => f.elements[name].value.trim();
  const sel = f.elements.interest;
  const subject = sel.options[sel.selectedIndex].text;
  const language = currentLang() === 'en' ? 'Inglés' : 'Español';
  const summary = `${v('name')} quiere información sobre «${subject}».${v('level') ? ` Edad o nivel: ${v('level')}.` : ''} Idioma: ${language}.`;
  return {
    Resumen: summary,
    Nombre: v('name'),
    Email: v('email'),
    'Teléfono': v('phone') || '—',
    'Interés': subject,
    'Edad o nivel': v('level') || '—',
    Mensaje: v('message') || '—',
    Idioma: language,
    _subject: `Nueva solicitud: ${subject} — ${v('name')}`,
    _template: 'box',
    _replyto: v('email'),
  };
}

async function submit(e) {
  e.preventDefault();
  const f = e.currentTarget, status = $('#formStatus'), btn = $('#formSend');
  status.textContent = ''; status.className = 'f-status';
  if (!validate(f)) return;
  if (f.elements._honey.value) return; // bots fill the invisible field
  btn.disabled = true; btn.textContent = t('contact.fSending');
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${CONTACT.formEmail}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(buildEmail(f)),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.status);
    f.reset(); interest = null; renderForm();
    status.textContent = t('contact.fOk'); status.classList.add('ok');
  } catch {
    status.textContent = t('contact.fError'); status.classList.add('err');
  } finally {
    btn.disabled = false; btn.textContent = t('contact.fSend');
  }
}

export function initForm() {
  const f = form();
  f.addEventListener('submit', submit);
  f.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid')) fieldError(e.target, ''); });
  $('#fInterest').addEventListener('change', syncMessageRequired);
}
