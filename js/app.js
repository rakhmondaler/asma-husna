import { createBeadsScene } from './beads.js';
import { renderCard } from './card.js';
import { loadIndex, saveIndex, next, prev, clamp } from './state.js';

const canvas = document.getElementById('scene');
const cardEl = document.getElementById('card');

const names = await (await fetch('data/names.json')).json();
const byId = new Map(names.map(n => [n.id, n]));

let current = loadIndex(localStorage);
const scene = createBeadsScene(canvas, { onBeadClick: go });

function go(id) {
  current = clamp(id);
  saveIndex(localStorage, current);
  const rec = byId.get(current) ?? null;
  const pair = rec?.pairId ? byId.get(rec.pairId) ?? null : null;
  scene.setCurrent(current, rec?.pairId ?? null);
  renderCard(cardEl, rec, pair, current);
}

addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') go(next(current));
  if (e.key === 'ArrowLeft') go(prev(current));
});

let acc = 0, cooldownUntil = 0;
addEventListener('wheel', e => {
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
addEventListener('pointerdown', e => { px = e.clientX; });
addEventListener('pointerup', e => {
  if (px === null) return;
  const dx = e.clientX - px;
  px = null;
  if (Math.abs(dx) > 40) go(dx < 0 ? next(current) : prev(current));
});

go(current);
