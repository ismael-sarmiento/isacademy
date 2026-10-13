// Small DOM helpers shared by every module (one implementation, imported everywhere).
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = s => String(s).replace(/[&<>"']/g, c => ENTITIES[c]);
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isPhone = () => matchMedia('(max-width: 640px)').matches;
// smooth scrolling unless the visitor asked for less motion
export const scrollBehavior = () => (reducedMotion() ? 'auto' : 'smooth');
