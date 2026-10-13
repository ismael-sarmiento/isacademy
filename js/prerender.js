// With ?prerender the rendered Spanish sections are exported so tools/prerender.py can write them into index.html:
// search engines and AI crawlers that do not run JavaScript then read the whole page.
const IDS = ['trust', 'aboutBadges', 'pillars', 'steps', 'subjects', 'why', 'reviews', 'reviewsLink', 'faqList', 'fact', 'fInterest', 'privacyText'];

export function exportPrerenderIfAsked() {
  if (!new URLSearchParams(location.search).has('prerender')) return;
  const out = {};
  IDS.forEach(id => {
    const clone = document.getElementById(id).cloneNode(true);
    clone.querySelectorAll('.in').forEach(el => el.classList.remove('in'));
    out[id] = clone.innerHTML;
  });
  const tag = document.createElement('script');
  tag.type = 'application/json';
  tag.id = 'prerender-out';
  tag.textContent = JSON.stringify(out);
  document.body.appendChild(tag);
}
