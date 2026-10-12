// Opening: a human hand takes the "Is" to the left, a robotic hand takes "Academy" to the right,
// and the academy landing appears in between.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_OUT = 'cubic-bezier(.2, .8, .2, 1)';
const EASE_IN_OUT = 'cubic-bezier(.65, 0, .35, 1)';
import { burst, ink, pixels } from './fx.js?v=20261012j';

let running = false;

// Hand art v3: viewBox 320×160, pointing right; the robot is mirrored. Fingertips pinch at ~(302, 86).
// Illustrated look: gradient volume, rim light, nail and knuckle detail; the robot has metallic plates and LED joints.
function humanHand() {
  const contour = 'M70 58 C105 50 140 38 180 38 C200 38 214 42 226 48 C246 56 268 64 286 72 C294 75 300 77 303 79 C308 82 305 88 299 87 C288 86 274 83 260 83 C252 83 246 87 248 94 C262 92 282 90 296 90 C304 90 305 98 298 100 C284 103 266 107 250 111 C236 117 220 124 200 124 C160 124 110 116 70 108 Z';
  const cuff = 'M-60 50 H70 Q82 50 82 62 V104 Q82 116 70 116 H-60 Z';
  return `
  <defs>
    <linearGradient id="hh-skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7e2ae"/><stop offset=".45" stop-color="#e2b25c"/><stop offset="1" stop-color="#9c6a22"/>
    </linearGradient>
    <linearGradient id="hh-cuff" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2e3c74"/><stop offset="1" stop-color="#121833"/>
    </linearGradient>
    <filter id="hh-shadow" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#05081a" flood-opacity=".38"/></filter>
    <radialGradient id="hh-shade" cx="70%" cy="80%" r="60%">
      <stop offset="0" stop-color="#5a3a10" stop-opacity=".45"/><stop offset="1" stop-color="#5a3a10" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g stroke-linecap="round" stroke-linejoin="round" filter="url(#hh-shadow)">
    <!-- curled middle, ring and little fingers peeking under the palm -->
    <g fill="url(#hh-skin)" stroke="#7a5212" stroke-width="2">
      <ellipse cx="208" cy="126" rx="11" ry="8"/>
      <ellipse cx="224" cy="123" rx="11.5" ry="8.5"/>
      <ellipse cx="240" cy="117" rx="11" ry="8.5"/>
    </g>
    <path d="${contour}" fill="url(#hh-skin)" stroke="#7a5212" stroke-width="2.2"/>
    <path d="${contour}" fill="url(#hh-shade)"/>
    <path d="M96 56 C132 46 168 38 196 40 C214 42 232 48 252 58" fill="none" stroke="#fff6dc" stroke-opacity=".7" stroke-width="3"/>
    <g fill="none" stroke="#7a5212" stroke-width="1.8" opacity=".8">
      <path d="M222 73 C240 71 254 76 256 84"/>
      <path d="M250 111 C246 105 246 99 250 95"/>
      <path d="M249 95 C236 104 222 113 204 119" opacity=".85"/>
      <path d="M214 74 C226 70 238 72 246 78" opacity=".5"/>
      <path d="M190 40 C194 44 194 49 190 53" opacity=".6"/>
      <path d="M228 50 C231 53 231 57 228 61" opacity=".6"/>
      <path d="M264 62 C266 65 266 69 264 72" opacity=".55"/>
      <path d="M120 104 C160 108 196 108 228 104" opacity=".35"/>
    </g>
    <path d="M286 72 C294 74 300 77 302 81 C298 82 292 80 286 77 Z" fill="#fff3d6" stroke="#7a5212" stroke-width="1.2"/>
    <path d="M285 91 C292 91 297 93 298 97 C293 97 288 95 285 94 Z" fill="#fff3d6" stroke="#7a5212" stroke-width="1.2"/>
    <path d="${cuff}" fill="url(#hh-cuff)" stroke="#e2b25c" stroke-width="2.2"/>
    <path d="M-60 56 H72" stroke="#e2b25c" stroke-opacity=".35" stroke-width="2"/>
    <g fill="none" stroke="#e2b25c" stroke-width="1.6" opacity=".7"><path d="M62 52 V114" stroke-dasharray="3 4"/></g>
    <circle cx="44" cy="82" r="5" fill="#e2b25c" stroke="#7a5212" stroke-width="1.2"/>
  </g>`;
}

function robotHand() {
  const seg = (x1, y1, x2, y2, w) => `
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="#0b1026" stroke-width="${w + 5}"/>
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="url(#rh-metal)" stroke-width="${w}"/>
    <path d="M${x1} ${y1 - w * .28} L${x2} ${y2 - w * .28}" stroke="#e8eeff" stroke-opacity=".55" stroke-width="1.6"/>`;
  const g = `
  <defs>
    <linearGradient id="rh-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fb0e8"/><stop offset=".35" stop-color="#3a4a8a"/><stop offset="1" stop-color="#121833"/>
    </linearGradient>
    <linearGradient id="rh-plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a5ca8"/><stop offset=".5" stop-color="#25336e"/><stop offset="1" stop-color="#0e1430"/>
    </linearGradient>
    <filter id="rh-shadow" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#05081a" flood-opacity=".4"/></filter>
    <filter id="rh-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#rh-shadow)">
    ${seg(212, 96, 232, 98, 13)}
    ${seg(212, 82, 240, 85, 15)}
    <rect x="-60" y="58" width="140" height="48" rx="8" fill="url(#rh-plate)" stroke="#c9d4ff" stroke-width="1.6"/>
    <path d="M-56 63 H76" stroke="#e8eeff" stroke-opacity=".45" stroke-width="2"/>
    <g stroke="#5fd0ff" stroke-width="1.6" opacity=".9" filter="url(#rh-glow)"><path d="M-10 60 V104 M30 60 V104"/></g>
    <rect x="64" y="52" width="18" height="60" rx="5" fill="url(#rh-metal)" stroke="#c9d4ff" stroke-width="1.6"/>
    <path d="M92 56 L194 48 L214 60 L214 98 L196 116 L92 110 Z" fill="url(#rh-plate)" stroke="#c9d4ff" stroke-width="1.8"/>
    <path d="M96 60 L192 52 L208 61" stroke="#e8eeff" stroke-opacity=".55" stroke-width="2"/>
    <g stroke="#c9d4ff" stroke-width="1.4" opacity=".5"><path d="M112 102 L184 106"/><rect x="128" y="72" width="44" height="22" rx="5"/></g>
    <rect x="134" y="78" width="32" height="10" rx="3" fill="#5fd0ff" fill-opacity=".85" filter="url(#rh-glow)"/>
    ${seg(220, 62, 246, 67, 19)}
    ${seg(252, 68, 276, 73, 17)}
    ${seg(282, 74, 297, 78, 14)}
    ${seg(220, 104, 252, 98, 19)}
    ${seg(258, 97, 294, 90, 15)}
    <g class="joints" filter="url(#rh-glow)">
      <circle cx="249" cy="68" r="3.6"/><circle cx="279" cy="74" r="3.2"/><circle cx="255" cy="97" r="3.6"/>
      <circle cx="96" cy="66" r="2.6"/><circle cx="96" cy="100" r="2.6"/>
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
  document.getElementById('assistantFab').hidden = false;
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
  const safety = setTimeout(() => { revealSite({ animate: false }); finish(intro); }, 6500);

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
  const phone = innerWidth < 640;

  // 1) clear everything but the logo; the scene darkens like a cinema
  intro.querySelectorAll('.hook, .intro-actions, .intro-top, #circuit, .cursor')
    .forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
  intro.classList.add('cinema');

  // 2) shrink the logo to leave room for the hands on both sides
  const room = Math.min(1, (innerWidth * (phone ? .5 : .56)) / logo.getBoundingClientRect().width);
  await done(logo.animate([{ transform: 'none' }, { transform: `scale(${room})` }], { duration: 450, easing: EASE_OUT, fill: 'forwards' }));

  // 3) the hands come in with motion blur and settle on the words
  const isBox = gIs.getBoundingClientRect();
  const acBox = gAc.getBoundingClientRect();
  const acWord = gAc.querySelector('.academy').getBoundingClientRect();
  const logoBox = logo.getBoundingClientRect();
  const hw = Math.max(phone ? 170 : 220, Math.min(460, isBox.height * 2.2));
  [human, robot].forEach(h => { h.style.width = `${hw}px`; });
  const k = hw / 320;
  const hTip = { x: isBox.left + isBox.width * .3, y: isBox.top + isBox.height * .5 };
  const rTip = { x: acWord.right + 2, y: acWord.top + acWord.height * .5 };
  Object.assign(human.style, { left: `${hTip.x - 302 * k}px`, top: `${hTip.y - 86 * k}px`, transformOrigin: '94% 54%' });
  Object.assign(robot.style, { left: `${rTip.x - 24 * k}px`, top: `${rTip.y - 84 * k}px`, transformOrigin: '6% 52%' });
  const inFromLeft = -(hTip.x + 40);
  const inFromRight = innerWidth - rTip.x + 320 * k + 40;
  const enter = { duration: 950, delay: 120, easing: EASE_OUT, fill: 'forwards' };
  await Promise.all([
    done(human.animate([
      { opacity: 0, transform: `translate(${inFromLeft}px, 46px) rotate(-12deg)`, filter: 'blur(6px)' },
      { opacity: 1, transform: 'translateX(-6px) rotate(1deg)', filter: 'blur(0)', offset: .85 },
      { opacity: 1, transform: 'none', filter: 'blur(0)' }], enter)),
    done(robot.animate([
      { opacity: 0, transform: `translate(${inFromRight}px, 46px) rotate(12deg)`, filter: 'blur(6px)' },
      { opacity: 1, transform: 'translateX(6px) rotate(-1deg)', filter: 'blur(0)', offset: .85 },
      { opacity: 1, transform: 'none', filter: 'blur(0)' }], enter)),
  ]);

  // 4) pinch: the fingers close and the contact points spark (gold = human, cyan = machine)
  const pinch = { duration: 180, fill: 'forwards', easing: 'ease-in' };
  robot.animate([{ transform: 'none' }, { transform: 'scale(.96)' }], pinch);
  await done(human.animate([{ transform: 'none' }, { transform: 'scale(.96)' }], pinch));
  // a discreet glint where the fingers touch the letters
  burst(hTip.x, hTip.y, { color: '#f2d18b', count: 6, speed: 1.6 });
  burst(rTip.x, rTip.y, { color: '#9fe6ff', count: 6, speed: 1.6 });
  await new Promise(r => setTimeout(r, 140));

  // 5) pull apart: a faint ink trail behind the "Is", a few pixels behind "Academy"; the site fades in underneath
  const userPerPx = 1000 / logoBox.width; // svg user units per CSS px
  const outLeft = -(isBox.right + 80);
  const outRight = innerWidth - acBox.left + 80;
  const pull = { duration: 1050, easing: EASE_IN_OUT, fill: 'forwards' };
  // the site shows up only once the words are well apart, so it never competes with the logo
  setTimeout(() => revealSite(), 600);
  const bg = getComputedStyle(intro).backgroundColor;
  let emitting = true, frame = 0;
  (function emit() {
    if (!emitting) return;
    // every third frame only: a hint of material, not fireworks
    if (frame++ % 3 === 0) {
      const a = gIs.getBoundingClientRect(), b = gAc.getBoundingClientRect();
      if (a.right > 0) ink(a.right - a.width * .15, a.top + a.height * .55, 1, 1);
      if (b.left < innerWidth) pixels(b.left + 4, b.top + b.height * .5, b.height * .6, -1, 2);
    }
    requestAnimationFrame(emit);
  })();
  await Promise.all([
    done(human.animate([{ transform: 'scale(.96)' }, { transform: `translateX(${outLeft}px) scale(.96) rotate(-4deg)` }], pull)),
    done(gIs.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${outLeft * userPerPx}px)` }], pull)),
    done(robot.animate([{ transform: 'scale(.96)' }, { transform: `translateX(${outRight}px) scale(.96) rotate(4deg)` }], pull)),
    done(gAc.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${outRight * userPerPx}px)` }], pull)),
    done(gAc.animate([{ opacity: 1 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 1050, fill: 'forwards' })),
    done(gIs.animate([{ opacity: 1 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 1050, fill: 'forwards' })),
    done(intro.animate([{ backgroundColor: bg }, { backgroundColor: 'transparent' }], { ...pull, duration: 700, delay: 520 })),
  ]);
  emitting = false;
  finish(intro);
  clearTimeout(safety);
}
