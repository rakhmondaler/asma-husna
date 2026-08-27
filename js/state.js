export const TOTAL = 99;
const KEY = 'asma-husna-progress';

export function clamp(i) {
  return Math.min(TOTAL, Math.max(1, i));
}

export function next(i) {
  return i % TOTAL + 1;
}

export function prev(i) {
  return (i + TOTAL - 2) % TOTAL + 1;
}

export function loadIndex(storage) {
  const v = parseInt(storage.getItem(KEY), 10);
  return Number.isInteger(v) ? clamp(v) : 1;
}

export function saveIndex(storage, i) {
  storage.setItem(KEY, String(clamp(i)));
}
