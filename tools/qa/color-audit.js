// Colour audit — paste into the browser console on the site (or run it from an agent).
// Lists every warm/gold colour in use per theme and the elements using it. Expected result per theme:
// one brand gold (logo, buttons, script notes, numbers, stars, borders) + one text gold (small labels),
// plus the light gold reserved for always-dark surfaces (code card, contact card, editor).
(async () => {
  const gold = c => {
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return false;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).map(Number);
    return a > 0.05 && r > g && g > b && r - b > 60;
  };
  const audit = async theme => {
    document.documentElement.dataset.theme = theme;
    await new Promise(r => setTimeout(r, 300));
    const groups = {};
    for (const el of document.querySelectorAll('body *')) {
      // closed <details> keep stale styles until opened: skip their hidden content
      if (el.closest('[hidden], .hand, svg.avatar-svg, #intro') || el.closest('details:not([open])') && !el.closest('summary')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const name = (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : el.tagName.toLowerCase());
      const checks = [['text', cs.color], ['background', cs.backgroundColor], ['border', cs.borderTopColor], ['fill', cs.fill]];
      for (const [kind, value] of checks) {
        if (!gold(value)) continue;
        if (kind === 'text' && ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        if (kind === 'border' && parseFloat(cs.borderTopWidth) === 0) continue;
        (groups[`${value} (${kind})`] ??= new Set()).add(name);
      }
    }
    return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, [...v].slice(0, 10)]));
  };
  const result = { light: await audit('light'), dark: await audit('dark') };
  delete document.documentElement.dataset.theme;
  console.table(result.light); console.table(result.dark);
  return result;
})();
