import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const names = JSON.parse(await readFile(new URL('../data/names.json', import.meta.url), 'utf8'));

test('схема каждой записи полна', () => {
  for (const n of names) {
    assert.ok(Number.isInteger(n.id) && n.id >= 1 && n.id <= 99, `id: ${n.id}`);
    for (const f of ['arabic', 'translit', 'tafsir', 'fact']) {
      assert.equal(typeof n[f], 'string', `${n.id}.${f}`);
      assert.ok(n[f].length > 0, `${n.id}.${f} пустое`);
    }
    assert.ok(Array.isArray(n.translations) && n.translations.length >= 1, `${n.id}.translations`);
  }
});

test('у каждого имени есть аят с корректной ссылкой', () => {
  for (const n of names) {
    assert.ok(n.ayah && typeof n.ayah.text === 'string' && n.ayah.text.length > 10, `${n.id}.ayah.text`);
    assert.match(n.ayah.ref, /^\d+:\d+(-\d+)?$/, `${n.id}.ayah.ref`);
  }
});

test('у каждого имени есть тахаллук, тень эго и три вопроса муракабы', () => {
  for (const n of names) {
    assert.ok(typeof n.takhalluq === 'string' && n.takhalluq.length >= 200, `${n.id}.takhalluq`);
    assert.ok(typeof n.shadow === 'string' && n.shadow.length >= 80, `${n.id}.shadow`);
    assert.ok(Array.isArray(n.muraqaba) && n.muraqaba.length === 3, `${n.id}.muraqaba`);
    for (const q of n.muraqaba) assert.ok(q.trim().endsWith('?'), `${n.id}: вопрос без вопросительного знака`);
  }
});

test('id уникальны', () => {
  const ids = names.map(n => n.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('пары взаимны, текст примирения ровно у одного из двух', () => {
  const byId = new Map(names.map(n => [n.id, n]));
  for (const n of names) {
    if (!n.pairId) continue;
    const p = byId.get(n.pairId);
    assert.ok(p, `пара ${n.pairId} для ${n.id} отсутствует в данных`);
    assert.equal(p.pairId, n.id, `пара не взаимна: ${n.id}`);
    assert.equal([n, p].filter(x => x.pairText).length, 1, `pairText у пары ${n.id}/${p.id}`);
  }
});
