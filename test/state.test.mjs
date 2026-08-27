import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, next, prev, loadIndex, saveIndex, TOTAL } from '../js/state.js';

const fakeStorage = () => {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

test('clamp держит индекс в 1..99', () => {
  assert.equal(clamp(0), 1);
  assert.equal(clamp(100), TOTAL);
  assert.equal(clamp(42), 42);
});

test('next/prev идут по кругу', () => {
  assert.equal(next(TOTAL), 1);
  assert.equal(prev(1), TOTAL);
  assert.equal(next(1), 2);
  assert.equal(prev(3), 2);
});

test('loadIndex возвращает 1 на пустом хранилище и мусоре', () => {
  const s = fakeStorage();
  assert.equal(loadIndex(s), 1);
  s.setItem('asma-husna-progress', 'abc');
  assert.equal(loadIndex(s), 1);
});

test('saveIndex/loadIndex — круговой путь', () => {
  const s = fakeStorage();
  saveIndex(s, 21);
  assert.equal(loadIndex(s), 21);
});
