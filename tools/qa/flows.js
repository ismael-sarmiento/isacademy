// Booking-form flows — paste into the browser console on the site with the landing visible (after the intro).
// Clicks every way into the form after every other one and checks the "¿Qué te interesa?" select:
// subject buttons preselect their subject, the open-class button preselects "open", generic links clear a
// preselection made by a button, and a value picked by hand survives generic links.
(async () => {
  const sel = () => document.getElementById('fInterest');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const click = async el => { el.click(); await wait(60); };
  const generic = [...document.querySelectorAll('a[href="#contacto"]:not([data-book])')];
  const booking = [...document.querySelectorAll('[data-book]')];
  const results = [];
  const expect = (label, want) => results.push({ step: label, want, got: sel().value, ok: sel().value === want });
  for (const b of booking) {
    await click(b); expect(`book "${b.dataset.book}"`, b.dataset.book);
    for (const g of generic) { await click(b); await click(g); expect(`book "${b.dataset.book}" → generic "${g.textContent.trim().slice(0, 30)}"`, ''); }
  }
  // a choice made by hand is never overwritten by a generic link
  sel().value = 'sql'; sel().dispatchEvent(new Event('change'));
  for (const g of generic) { await click(g); expect(`manual "sql" → generic "${g.textContent.trim().slice(0, 30)}"`, 'sql'); }
  sel().value = '';
  const failed = results.filter(r => !r.ok);
  console.table(failed.length ? failed : [{ all: `${results.length} checks passed` }]);
  return { total: results.length, failed };
})();
