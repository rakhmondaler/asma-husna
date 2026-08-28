import { createBeadsScene } from './beads.js';
import { renderCard, renderPage } from './card.js';
import { loadIndex, saveIndex, next, prev, clamp } from './state.js';

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

function go(id) {
  if (!pageEl.hidden) closePage();
  current = clamp(id);
  saveIndex(localStorage, current);
  const rec = byId.get(current);
  scene.setCurrent(current, rec?.pairId ?? null);
  calligraphyEl.textContent = rec.arabic;
  renderCard(cardEl, rec, openPage);
}

addEventListener('keydown', e => {
  if (e.key === 'Escape' && !pageEl.hidden) { closePage(); return; }
  if (e.key === 'ArrowRight') go(next(current));
  if (e.key === 'ArrowLeft') go(prev(current));
});

let acc = 0, cooldownUntil = 0;
addEventListener('wheel', e => {
  if (!pageEl.hidden) return;
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

let px = null;
canvas.addEventListener('pointerdown', e => { px = e.clientX; });
canvas.addEventListener('pointerup', e => {
  if (px === null) return;
  const dx = e.clientX - px;
  px = null;
  if (Math.abs(dx) > 40) go(dx < 0 ? next(current) : prev(current));
});

go(current);
