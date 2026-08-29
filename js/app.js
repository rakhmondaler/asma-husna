import { createBeadsScene } from './beads.js';
import { renderCard, renderPage } from './card.js';
import { loadIndex, saveIndex, next, prev, clamp } from './state.js';
import { beadClick } from './sound.js';
import { renderMenu } from './menu.js';

const canvas = document.getElementById('scene');
const cardEl = document.getElementById('card');
const pageEl = document.getElementById('page');
const calligraphyEl = document.getElementById('calligraphy');

const names = await (await fetch('data/names.json')).json();
const byId = new Map(names.map(n => [n.id, n]));

let current = loadIndex(localStorage);
const scene = createBeadsScene(canvas, { onBeadClick: go });

function openPage() {
  const rec = byId.get(current);
  const pair = rec?.pairId ? byId.get(rec.pairId) ?? null : null;
  renderPage(pageEl, rec, pair, {
    onClose: closePage,
    onGoPair: id => { closePage(); go(id); openPage(); }
  });
  pageEl.hidden = false;
  pageEl.scrollTop = 0;
}

function closePage() {
  pageEl.hidden = true;
}

function go(id, { silent = false } = {}) {
  if (!pageEl.hidden) closePage();
  const changed = clamp(id) !== current;
  current = clamp(id);
  saveIndex(localStorage, current);
  const rec = byId.get(current);
  scene.setCurrent(current, rec?.pairId ?? null);
  calligraphyEl.textContent = rec.arabic;
  renderCard(cardEl, rec, openPage);
  if (changed && !silent) beadClick();
  if (!silent) dismissHint();
}

// онбординг: одна подсказка при первом визите, гаснет после первого листания
const hintEl = document.getElementById('hint');
const HINT_KEY = 'asma-husna-hint-shown';
if (!localStorage.getItem(HINT_KEY)) hintEl.hidden = false;
let hintDismissed = false;
function dismissHint() {
  if (hintDismissed || hintEl.hidden) return;
  hintDismissed = true;
  localStorage.setItem(HINT_KEY, '1');
  hintEl.classList.add('fade');
  setTimeout(() => { hintEl.hidden = true; }, 600);
}

const menuEl = document.getElementById('menu');
const menuBtn = document.getElementById('menuBtn');

function openMenu() {
  renderMenu(menuEl, names, {
    onPick: id => { closeMenu(); go(id); },
    onClose: closeMenu
  });
  menuEl.hidden = false;
  menuEl.scrollTop = 0;
}

function closeMenu() {
  menuEl.hidden = true;
}

menuBtn.addEventListener('click', openMenu);

document.getElementById('randomBtn').addEventListener('click', () => {
  let id;
  do { id = 1 + Math.floor(Math.random() * 99); } while (id === current);
  go(id);
});

addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!menuEl.hidden) { closeMenu(); return; }
    if (!pageEl.hidden) { closePage(); return; }
  }
  if (e.target.closest?.('#menu')) return;
  if (e.key === 'ArrowRight') go(next(current));
  if (e.key === 'ArrowLeft') go(prev(current));
});

let acc = 0, cooldownUntil = 0;
addEventListener('wheel', e => {
  if (!pageEl.hidden || !menuEl.hidden) return;
  if (e.target.closest?.('#card')) return;
  const now = performance.now();
  if (now < cooldownUntil) return;
  acc += e.deltaY + e.deltaX;
  if (Math.abs(acc) > 60) {
    go(acc > 0 ? next(current) : prev(current));
    acc = 0;
    cooldownUntil = now + 220;
  }
}, { passive: true });

// свайп работает по всему экрану (кроме страницы имени); вертикальный жест - это прокрутка, не листание
let px = null, py = null;
addEventListener('pointerdown', e => {
  if (e.target.closest?.('#page, #menu, #menuBtn, #randomBtn')) { px = null; return; }
  px = e.clientX;
  py = e.clientY;
});
addEventListener('pointercancel', () => { px = null; });
addEventListener('pointerup', e => {
  if (px === null) return;
  const dx = e.clientX - px;
  const dy = e.clientY - py;
  px = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? next(current) : prev(current));
});

go(current, { silent: true });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
