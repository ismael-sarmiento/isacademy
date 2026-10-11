// Opening: a human hand takes the "Is" to the left, a robotic hand takes "Academy" to the right,
// and the academy landing appears in between.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_OUT = 'cubic-bezier(.2, .8, .2, 1)';
const EASE_IN_OUT = 'cubic-bezier(.65, 0, .35, 1)';
let running = false;

// Hand art: viewBox 320×160, pointing right; the robot is mirrored. Fingertips pinch at ~(302, 86).
function humanHand() {
  const contour = 'M70 58 C105 50 140 38 180 38 C200 38 214 42 226 48 C246 56 268 64 286 72 C294 75 300 77 303 79 C308 82 305 88 299 87 C288 86 274 83 260 83 C252 83 246 87 248 94 C262 92 282 90 296 90 C304 90 305 98 298 100 C284 103 266 107 250 111 C236 117 220 124 200 124 C160 124 110 116 70 108 Z';
  return `
  <g stroke-linecap="round" stroke-linejoin="round">
    <path d="${contour}" fill="var(--bg)" stroke="currentColor" stroke-width="3"/>
    <path d="${contour}" fill="currentColor" fill-opacity=".10" stroke="none"/>
    <g fill="none" stroke="currentColor" stroke-width="2" opacity=".75">
      <path d="M222 73 C240 71 254 76 256 84"/>
      <path d="M250 111 C246 105 246 99 250 95"/>
      <path d="M289 73 C295 75 300 77 302 81"/>
      <path d="M286 92 C292 92 297 94 298 97"/>
      <path d="M190 39 C194 44 194 49 190 53" opacity=".7"/>
      <path d="M228 49 C231 53 231 57 228 61" opacity=".7"/>
      <path d="M264 62 C266 65 266 69 264 72" opacity=".6"/>
      <path d="M282 70 C283 72 283 75 282 77" opacity=".5"/>
      <path d="M100 62 C134 54 166 50 192 50" opacity=".3"/>
      <path d="M120 104 C160 108 196 108 228 104" opacity=".35"/>
    </g>
    <path d="M-60 50 H70 Q82 50 82 62 V104 Q82 116 70 116 H-60 Z" fill="var(--bg)" stroke="currentColor" stroke-width="3"/>
    <path d="M-60 50 H70 Q82 50 82 62 V104 Q82 116 70 116 H-60 Z" fill="currentColor" fill-opacity=".18" stroke="none"/>
    <g fill="none" stroke="currentColor" stroke-width="2" opacity=".7"><path d="M62 52 V114"/><path d="M-20 50 V116" opacity=".5"/></g>
    <circle cx="44" cy="82" r="4.5" fill="currentColor"/>
  </g>`;
}

function robotHand() {
  const seg = (x1, y1, x2, y2, w) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="currentColor" stroke-width="${w + 6}"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="var(--bg)" stroke-width="${w}"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="currentColor" stroke-opacity=".12" stroke-width="${w}"/>`;
  const g = `
  <g stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${seg(212, 96, 232, 98, 13)}
    ${seg(212, 82, 240, 85, 15)}
    <rect x="-60" y="58" width="140" height="48" rx="6" fill="var(--bg)" stroke="currentColor" stroke-width="3"/>
    <rect x="-60" y="58" width="140" height="48" rx="6" fill="currentColor" fill-opacity=".12"/>
    <g stroke="currentColor" stroke-width="2" opacity=".55"><path d="M-10 58 V106 M30 58 V106 M-60 82 H66"/></g>
    <rect x="64" y="52" width="18" height="60" rx="4" fill="var(--bg)" stroke="currentColor" stroke-width="3"/>
    <path d="M92 56 L194 48 L214 60 L214 98 L196 116 L92 110 Z" fill="var(--bg)" stroke="currentColor" stroke-width="3"/>
    <path d="M92 56 L194 48 L214 60 L214 98 L196 116 L92 110 Z" fill="currentColor" fill-opacity=".14"/>
    <g stroke="currentColor" stroke-width="2" opacity=".55"><path d="M112 64 L188 58 M112 102 L184 106"/><rect x="128" y="72" width="44" height="22" rx="4"/></g>
    ${seg(220, 62, 246, 67, 19)}
    ${seg(252, 68, 276, 73, 17)}
    ${seg(282, 74, 297, 78, 14)}
    ${seg(220, 104, 252, 98, 19)}
    ${seg(258, 97, 294, 90, 15)}
    <g class="joints">
      <circle cx="249" cy="68" r="4"/><circle cx="279" cy="74" r="3.5"/><circle cx="255" cy="97" r="4"/>
      <circle cx="96" cy="66" r="3"/><circle cx="96" cy="100" r="3"/><circle cx="150" cy="83" r="5"/>
    </g>
  </g>`;
  return `<g transform="translate(320 0) scale(-1 1)">${g}</g>`;
}

function buildHands(intro) {
  intro.querySelector('#handHuman').innerHTML = humanHand();
  intro.querySelector('#handRobot').innerHTML = robotHand();
}

const done = anim => anim.finished.catch(() => {});

export function revealSite({ animate = true, scroll = true } = {}) {
  document.body.classList.add('entered');
  document.querySelectorAll('.topbar, #site, .footer').forEach(el => { el.inert = false; });
  if (scroll) window.scrollTo(0, 0);
  if (!animate) return;
  ['.topbar', '#site'].forEach(sel => document.querySelector(sel)
    .animate([{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: EASE_OUT }));
}

export function finish(intro) {
  if (intro.classList.contains('gone')) return;
  intro.inert = true;
  intro.classList.add('gone');
  const h1 = document.querySelector('.hero h1');
  h1.setAttribute('tabindex', '-1');
  h1.focus({ preventScroll: true });
}

export async function openAcademy(intro) {
  if (running) return;
  running = true;
  // safety net: never leave the visitor stuck on the intro if animations stall
  const safety = setTimeout(() => { revealSite({ animate: false }); finish(intro); }, 5000);

  if (reduced) {
    revealSite();
    await done(intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
    finish(intro);
    clearTimeout(safety);
    return;
  }

  buildHands(intro);
  const logo = intro.querySelector('svg.logo');
  const gIs = intro.querySelector('#gIs');
  const gAc = intro.querySelector('#gAc');
  const human = intro.querySelector('#handHuman');
  const robot = intro.querySelector('#handRobot');

  // 1) clear everything but the logo
  intro.querySelectorAll('.hook, .intro-actions, .intro-top, #circuit')
    .forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));

  // phones: no room for hands, just split the two words apart
  if (innerWidth < 640) {
    const userPerPx0 = 1000 / logo.getBoundingClientRect().width;
    const split = { duration: 900, delay: 250, easing: EASE_IN_OUT, fill: 'forwards' };
    revealSite();
    const bg0 = getComputedStyle(intro).backgroundColor;
    await Promise.all([
      done(gIs.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-innerWidth * userPerPx0}px)`, opacity: 0 }], split)),
      done(gAc.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${innerWidth * userPerPx0}px)`, opacity: 0 }], split)),
      done(intro.animate([{ backgroundColor: bg0 }, { backgroundColor: 'transparent' }], split)),
    ]);
    finish(intro);
    clearTimeout(safety);
    return;
  }

  // 2) shrink the logo to leave room for the hands on both sides
  const room = Math.min(1, (innerWidth * .56) / logo.getBoundingClientRect().width);
  await done(logo.animate([{ transform: 'none' }, { transform: `scale(${room})` }], { duration: 450, easing: EASE_OUT, fill: 'forwards' }));

  // 3) place the hands so their fingertips meet the words
  const isBox = gIs.getBoundingClientRect();
  const acBox = gAc.getBoundingClientRect();
  const logoBox = logo.getBoundingClientRect();
  // hands scale with the logo so they read as hands, not as decorations
  const hw = Math.max(220, Math.min(460, isBox.height * 2.1));
  [human, robot].forEach(h => { h.style.width = `${hw}px`; });
  const k = hw / 320;
  const hTip = { x: isBox.left + isBox.width * .3, y: isBox.top + isBox.height * .5 };
  const rTip = { x: acBox.right + 6, y: acBox.top + acBox.height * .42 };
  Object.assign(human.style, { left: `${hTip.x - 302 * k}px`, top: `${hTip.y - 86 * k}px` });
  Object.assign(robot.style, { left: `${rTip.x - 24 * k}px`, top: `${rTip.y - 84 * k}px` });

  const inFromLeft = -(hTip.x + 40);
  const inFromRight = innerWidth - rTip.x + 320 * k + 40;
  await Promise.all([
    done(human.animate([{ opacity: 0, transform: `translateX(${inFromLeft}px)` }, { opacity: 1, transform: 'none' }], { duration: 750, delay: 150, easing: EASE_OUT, fill: 'forwards' })),
    done(robot.animate([{ opacity: 0, transform: `translateX(${inFromRight}px)` }, { opacity: 1, transform: 'none' }], { duration: 750, delay: 150, easing: EASE_OUT, fill: 'forwards' })),
  ]);

  // 4) pinch
  const pinch = { duration: 180, fill: 'forwards', easing: 'ease-in' };
  robot.animate([{ transform: 'none' }, { transform: 'scale(.97)' }], pinch);
  await done(human.animate([{ transform: 'none' }, { transform: 'scale(.97)' }], pinch));

  // 5) pull apart and reveal the landing
  const userPerPx = 1000 / logoBox.width; // svg user units per CSS px
  const outLeft = -(isBox.right + 80);
  const outRight = innerWidth - acBox.left + 80;
  const pull = { duration: 1000, easing: EASE_IN_OUT, fill: 'forwards' };
  revealSite();
  const bg = getComputedStyle(intro).backgroundColor;
  await Promise.all([
    done(human.animate([{ transform: 'scale(.97)' }, { transform: `translateX(${outLeft}px) scale(.97)` }], pull)),
    done(gIs.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${outLeft * userPerPx}px)` }], pull)),
    done(robot.animate([{ transform: 'scale(.97)' }, { transform: `translateX(${outRight}px) scale(.97)` }], pull)),
    done(gAc.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${outRight * userPerPx}px)` }], pull)),
    done(intro.animate([{ backgroundColor: bg }, { backgroundColor: 'transparent' }], { ...pull, duration: 800, delay: 200 })),
  ]);
  finish(intro);
  clearTimeout(safety);
}
