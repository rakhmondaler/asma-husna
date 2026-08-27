# Аль-асма аль-хусна — план реализации v0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Статичный сайт с реалистичными 3D-чётками (99 бусин, Three.js): листание имя за именем, карточки первых девяти имён, включая пару-диптих аль-Кабид/аль-Басит.

**Architecture:** Статика без сборки. Three.js через importmap с CDN рисует чётки на полноэкранном canvas; DOM-слой поверх показывает карточку текущего имени. Чистая логика (навигация, localStorage) вынесена в `js/state.js` и покрыта `node --test`; данные — один `data/names.json` с тестом схемы.

**Tech Stack:** Three.js 0.170 (CDN, ES modules), ванильный JS, node:test для логики и данных, python3 http.server для локального запуска.

## Global Constraints

- Никаких сборщиков и npm-зависимостей: только CDN-импорты, пиновать версию `three@0.170.0`.
- Плоская структура репозитория: `index.html`, `css/`, `js/`, `data/`, `test/`, документы в корне.
- Палитра: фон `#05060a`, текст `#cfc9bd`, единственный акцент — янтарь `#d98e2b`. Никаких других цветовых кодировок.
- Никаких обучающих оверлеев и онбординг-подсказок поверх сцены.
- Все русские тексты контента (толкования, факты, тексты примирения) перед укладкой в JSON прогоняются через скилл `humanizer-ru`.
- Ключ localStorage: `asma-husna-progress`.
- Коммит после каждой задачи, сообщения на русском.

---

### Task 1: Каркас страницы

**Files:**
- Create: `index.html`
- Create: `css/styles.css`

**Interfaces:**
- Produces: `<canvas id="scene">` и `<main id="card">` — их используют Task 4 и Task 5; importmap с `three` и `three/addons/`.

- [ ] **Step 1: Написать index.html**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Аль-асма аль-хусна</title>
<link href="https://fonts.googleapis.com/css2?family=Amiri&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/styles.css">
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
</head>
<body>
<canvas id="scene"></canvas>
<main id="card" aria-live="polite"></main>
<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Написать css/styles.css**

```css
:root {
  --bg: #05060a;
  --text: #cfc9bd;
  --muted: #6f6a5e;
  --amber: #d98e2b;
}
* { margin: 0; box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font: 16px/1.55 system-ui, sans-serif; min-height: 100vh; }
#scene { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }
#card { position: relative; z-index: 1; max-width: 620px; margin: 46vh auto 0; padding: 0 24px 64px; }
.num { color: var(--muted); text-align: center; letter-spacing: 0.2em; font-size: 13px; }
.arabic { font-family: 'Amiri', serif; font-size: 64px; color: var(--amber); text-align: center; line-height: 1.3; }
.translit { text-align: center; font-style: italic; margin: 4px 0 12px; }
.tr { text-align: center; }
.tr small { display: block; color: var(--muted); }
.tafsir { margin-top: 20px; }
.fact { margin-top: 14px; color: #b9b2a4; }
.footnote { margin-top: 14px; color: var(--muted); font-size: 14px; }
.empty p { text-align: center; color: var(--muted); margin-top: 12px; }
.diptych { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
.reconcile { margin-top: 24px; border-top: 1px solid #2a2416; padding-top: 16px; }
@media (max-width: 640px) {
  .diptych { grid-template-columns: 1fr; }
  .arabic { font-size: 48px; }
}
```

- [ ] **Step 3: Проверить в браузере**

Run: `cd /Users/daler/asma-husna && python3 -m http.server 8000` (в фоне), открыть `http://localhost:8000`.
Expected: пустая тёмная страница без ошибок в консоли (404 по `js/app.js` пока допустим).

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "Каркас страницы: canvas, карточка, палитра"
```

---

### Task 2: Логика навигации и прогресса (state.js)

**Files:**
- Create: `js/state.js`
- Test: `test/state.test.mjs`

**Interfaces:**
- Produces: `TOTAL = 99`, `clamp(i)`, `next(i)`, `prev(i)`, `loadIndex(storage)`, `saveIndex(storage, i)` — все чистые, storage передаётся снаружи (в браузере это `localStorage`).

- [ ] **Step 1: Написать падающий тест**

```js
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

test('next/prev не выходят за края', () => {
  assert.equal(next(TOTAL), TOTAL);
  assert.equal(prev(1), 1);
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
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `node --test test/`
Expected: FAIL, `Cannot find module .../js/state.js`

- [ ] **Step 3: Написать js/state.js**

```js
export const TOTAL = 99;
const KEY = 'asma-husna-progress';

export function clamp(i) {
  return Math.min(TOTAL, Math.max(1, i));
}

export function next(i) {
  return clamp(i + 1);
}

export function prev(i) {
  return clamp(i - 1);
}

export function loadIndex(storage) {
  const v = parseInt(storage.getItem(KEY), 10);
  return Number.isInteger(v) ? clamp(v) : 1;
}

export function saveIndex(storage, i) {
  storage.setItem(KEY, String(clamp(i)));
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `node --test test/`
Expected: PASS, 4 теста.

- [ ] **Step 5: Commit**

```bash
git add js/state.js test/state.test.mjs
git commit -m "Навигация и прогресс: state.js с тестами"
```

---

### Task 3: Схема данных и черновой names.json

**Files:**
- Create: `data/names.json`
- Test: `test/data.test.mjs`

**Interfaces:**
- Produces: массив записей `{id, arabic, translit, translations[{text, note|null}], tafsir, fact, pairId|null, pairText|null, listNote|null, abjad|null}`. Task 5 читает его через `fetch('data/names.json')`; Task 6 заменяет черновые тексты на финальные.

- [ ] **Step 1: Написать падающий тест схемы**

```js
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
```

Run: `node --test test/data.test.mjs`
Expected: FAIL, файла `data/names.json` нет.

- [ ] **Step 2: Создать черновой data/names.json с тремя записями**

Черновые тексты — только чтобы собрать механику; финальные тексты придут в Task 6.

```json
[
  {
    "id": 1,
    "arabic": "الرَّحْمَٰن",
    "translit": "Ар-Рахман",
    "translations": [{ "text": "Милостивый", "note": null }],
    "tafsir": "Черновик толкования — будет заменён в задаче контента.",
    "fact": "Черновик факта — будет заменён в задаче контента.",
    "pairId": null,
    "pairText": null,
    "listNote": null,
    "abjad": null
  },
  {
    "id": 20,
    "arabic": "الْقَابِض",
    "translit": "Аль-Кабид",
    "translations": [{ "text": "Сжимающий", "note": null }],
    "tafsir": "Черновик толкования — будет заменён в задаче контента.",
    "fact": "Черновик факта — будет заменён в задаче контента.",
    "pairId": 21,
    "pairText": "Черновик текста примирения пары — будет заменён в задаче контента.",
    "listNote": null,
    "abjad": null
  },
  {
    "id": 21,
    "arabic": "الْبَاسِط",
    "translit": "Аль-Басит",
    "translations": [{ "text": "Расширяющий", "note": null }],
    "tafsir": "Черновик толкования — будет заменён в задаче контента.",
    "fact": "Черновик факта — будет заменён в задаче контента.",
    "pairId": 20,
    "pairText": null,
    "listNote": null,
    "abjad": null
  }
]
```

- [ ] **Step 3: Убедиться, что тесты проходят**

Run: `node --test test/`
Expected: PASS, 7 тестов (4 из state + 3 из data).

- [ ] **Step 4: Commit**

```bash
git add data/names.json test/data.test.mjs
git commit -m "Схема данных names.json с тестами, черновые записи 1, 20, 21"
```

---

### Task 4: 3D-сцена чёток (beads.js)

**Files:**
- Create: `js/beads.js`
- Create: `js/app.js` (временная обвязка, полная версия в Task 5)

**Interfaces:**
- Consumes: `<canvas id="scene">` из Task 1.
- Produces: `createBeadsScene(canvas, {onBeadClick})` → `{ setCurrent(id, pairId|null) }`. `onBeadClick(id)` вызывается с номером бусины 1..99.

- [ ] **Step 1: Написать js/beads.js**

Геометрия: нить — статичная катенарная кривая (провисание, как будто чётки держат за края экрана); бусины скользят вдоль неё при листании. Разделители после 33-й и 66-й бусины, кисточка после 99-й.

```js
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TOTAL = 99;
const SPACING = 0.8;
const BEAD_R = 0.32;
const STRAND_Y = 1.6;
const SAG = 2.2;
const K = 14;
const XCLAMP = 13;

const catY = x => {
  const xe = Math.max(-XCLAMP, Math.min(XCLAMP, x));
  return STRAND_Y + SAG * (Math.cosh(xe / K) - 1);
};

export function createBeadsScene(canvas, { onBeadClick }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, STRAND_Y - 2.2, 18);
  camera.lookAt(0, STRAND_Y - 2.2, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff2dd, 2.2);
  key.position.set(4, 8, 6);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x222233, 1.2));
  const glow = new THREE.PointLight(0xffa03a, 6, 6);
  scene.add(glow);

  const amber = new THREE.MeshPhysicalMaterial({
    color: 0xb35b12, roughness: 0.18, transmission: 0.55, thickness: 0.9,
    ior: 1.5, clearcoat: 0.7, clearcoatRoughness: 0.2
  });
  const amberActive = amber.clone();
  amberActive.emissive = new THREE.Color(0xff8c1e);
  amberActive.emissiveIntensity = 0.7;
  const amberPair = amber.clone();
  amberPair.emissive = new THREE.Color(0xff8c1e);
  amberPair.emissiveIntensity = 0.25;

  const beadGeo = new THREE.SphereGeometry(BEAD_R, 32, 32);
  const beads = [];
  for (let i = 1; i <= TOTAL; i++) {
    const m = new THREE.Mesh(beadGeo, amber);
    m.userData.id = i;
    scene.add(m);
    beads.push(m);
  }

  const sepGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 24);
  const woodMat = new THREE.MeshPhysicalMaterial({ color: 0x7a3c0a, roughness: 0.3, clearcoat: 0.5 });
  const separators = [33.5, 66.5].map(s => {
    const m = new THREE.Mesh(sepGeo, woodMat);
    m.rotation.z = Math.PI / 2;
    m.userData.s = s;
    scene.add(m);
    return m;
  });

  const tassel = new THREE.Group();
  tassel.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), woodMat));
  for (let t = 0; t < 7; t++) {
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 1.1, 6), woodMat);
    thread.position.set(Math.cos(t) * 0.08, -0.75, Math.sin(t) * 0.08);
    tassel.add(thread);
  }
  scene.add(tassel);

  const pts = [];
  for (let x = -XCLAMP; x <= XCLAMP; x += 0.5) pts.push(new THREE.Vector3(x, catY(x), 0));
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.045, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a1a0c, roughness: 0.8 })
  ));

  let target = 0;
  let offset = 0;
  let currentId = 1;
  let pairIdCur = null;

  function layout() {
    for (let i = 0; i < TOTAL; i++) {
      const x = (i - offset) * SPACING;
      beads[i].position.set(x, catY(x), 0);
      beads[i].scale.setScalar(i === target ? 1.45 : 1);
    }
    for (const sep of separators) {
      const x = (sep.userData.s - 1 - offset) * SPACING;
      sep.position.set(x, catY(x), 0);
    }
    const tx = (TOTAL + 0.7 - offset) * SPACING;
    tassel.position.set(tx, catY(tx), 0);
    glow.position.copy(beads[target].position).add(new THREE.Vector3(0, 0, 1.2));
  }

  function applyMaterials() {
    beads.forEach((b, i) => {
      b.material = i + 1 === currentId ? amberActive : i + 1 === pairIdCur ? amberPair : amber;
    });
  }

  function setCurrent(id, pairId = null) {
    currentId = id;
    pairIdCur = pairId;
    target = id - 1;
    applyMaterials();
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener('click', e => {
    ndc.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(beads)[0];
    if (hit) onBeadClick(hit.object.userData.id);
  });

  renderer.setAnimationLoop(() => {
    offset += (target - offset) * 0.07;
    layout();
    renderer.render(scene, camera);
  });

  return { setCurrent };
}
```

- [ ] **Step 2: Временный js/app.js для проверки сцены**

```js
import { createBeadsScene } from './beads.js';

const scene = createBeadsScene(document.getElementById('scene'), {
  onBeadClick: id => scene.setCurrent(id)
});
scene.setCurrent(1);
```

- [ ] **Step 3: Проверить в браузере со скриншотом**

Run: сервер из Task 1, открыть `http://localhost:8000`, снять скриншот.
Expected: тёмный фон; нить с янтарными бусинами протянута слева направо с провисанием; первая бусина крупнее и светится; в консоли чисто. Клик по бусине — нить протягивается к ней с плавной анимацией. Если нить стоит по вертикали неудачно (слишком центр/край) — подстроить `camera.position.y` и `margin-top` карточки, снять скриншот повторно.

- [ ] **Step 4: Commit**

```bash
git add js/beads.js js/app.js
git commit -m "3D-сцена чёток: 99 бусин, разделители, кисточка, листание к бусине"
```

---

### Task 5: Карточка имени и полная навигация

**Files:**
- Create: `js/card.js`
- Modify: `js/app.js` (заменить целиком)

**Interfaces:**
- Consumes: `createBeadsScene` из Task 4; `loadIndex/saveIndex/next/prev/clamp` из Task 2; `data/names.json` из Task 3; `<main id="card">` из Task 1.
- Produces: `renderCard(el, rec|null, pair|null, id)` — рендерит карточку, диптих или заглушку.

- [ ] **Step 1: Написать js/card.js**

```js
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function nameBlock(rec) {
  const translations = rec.translations.map(t =>
    `<div class="tr"><span>${esc(t.text)}</span>${t.note ? `<small>${esc(t.note)}</small>` : ''}</div>`
  ).join('');
  return `<article class="name">
    <div class="num">${rec.id}</div>
    <div class="arabic">${rec.arabic}</div>
    <div class="translit">${esc(rec.translit)}</div>
    ${translations}
    <p class="tafsir">${esc(rec.tafsir)}</p>
    <p class="fact">${esc(rec.fact)}</p>
    ${rec.listNote ? `<p class="footnote">${esc(rec.listNote)}</p>` : ''}
  </article>`;
}

export function renderCard(el, rec, pair, id) {
  if (!rec) {
    el.innerHTML = `<article class="name empty">
      <div class="num">${id}</div>
      <p>Текст этого имени ещё в работе — в текущей версии заполнены девять.</p>
    </article>`;
    return;
  }
  if (pair) {
    const pairText = rec.pairText ?? pair.pairText ?? '';
    el.innerHTML = `<div class="diptych">${nameBlock(rec)}${nameBlock(pair)}</div>
      <p class="reconcile">${esc(pairText)}</p>`;
    return;
  }
  el.innerHTML = nameBlock(rec);
}
```

- [ ] **Step 2: Заменить js/app.js на полную версию**

```js
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
```

- [ ] **Step 3: Прогнать тесты и проверить в браузере**

Run: `node --test test/`
Expected: PASS.

В браузере проверить и снять скриншоты:
1. Открытие — имя 1, карточка Ар-Рахман под чётками.
2. Стрелка вправо → имя 2, бусина 2 в центре, карточка-заглушка «текст в работе».
3. Клик по бусине ~20 → диптих: два имени рядом, обе бусины пары светятся, под ними текст примирения.
4. Колесо и свайп листают в обе стороны, у краёв (1 и 99) не заклинивает.
5. Перезагрузка страницы — открывается та же бусина (localStorage).

- [ ] **Step 4: Commit**

```bash
git add js/card.js js/app.js
git commit -m "Карточка имени, диптих пары, листание и сохранение прогресса"
```

---

### Task 6: Контент девяти имён

**Files:**
- Modify: `data/names.json` (заменить черновые записи, добавить недостающие — итого 9)

**Interfaces:**
- Consumes: схема из Task 3. Никакого кода — только данные.

Состав v0: имена 1–7 и пара 20–21.

| id | Арабский | Транслит | Варианты перевода | Абджад (проверить при написании) |
|----|----------|----------|-------------------|-------|
| 1 | الرَّحْمَٰن | Ар-Рахман | Милостивый; Всемилостивый | 298 |
| 2 | الرَّحِيم | Ар-Рахим | Милосердный; Милующий | 258 |
| 3 | الْمَلِك | Аль-Малик | Царь; Властелин | 90 |
| 4 | الْقُدُّوس | Аль-Куддус | Пресвятой; Пречистый | 170 |
| 5 | السَّلَام | Ас-Салям | Мир; Дарующий мир | 131 |
| 6 | الْمُؤْمِن | Аль-Мумин | Дарующий безопасность; Верный завету | 136 |
| 7 | الْمُهَيْمِن | Аль-Мухаймин | Хранитель; Свидетель всего сущего | 145 |
| 20 | الْقَابِض | Аль-Кабид | Сжимающий; Удерживающий | 903 |
| 21 | الْبَاسِط | Аль-Басит | Расширяющий; Простирающий | 72 |

- [ ] **Step 1: Написать черновики текстов**

Для каждого имени: `tafsir` (3–5 предложений с опорой на аль-Газали «аль-Максад аль-асна»; термины пояснять в скобках), `fact` (1–3 предложения: этимология, место в Коране, абджад), у пары 1–2 — `note` в translations о разнице оттенков (Рахман — милость как сущность, Рахим — милость в действии к верующим), у пары 20–21 — `pairText` (у записи 20) о примирении полюсов: сжатие и расширение как одно дыхание, ссылка на Коран 2:245. Факты и значения абджад сверить через веб-поиск; спорное — выбрасывать, не украшать.

- [ ] **Step 2: Прогнать тексты через humanizer-ru**

Собрать все русские тексты (tafsir, fact, pairText, notes) в один документ, вызвать скилл `humanizer-ru`, вычищенные версии использовать вместо черновиков. Это требование Далера: тексты не должны звучать как типичные ИИ-тексты.

- [ ] **Step 3: Уложить в data/names.json и прогнать тесты**

Заполнить все 9 записей по схеме Task 3 (у имён без пары `pairId: null`; `listNote` — только там, где имя реально отсутствует в одном из канонических списков).

Run: `node --test test/`
Expected: PASS.

- [ ] **Step 4: Проверить в браузере**

Пройти все 9 имён стрелками и кликами, диптих 20–21, вязь читается, переносы не ломают строки.

- [ ] **Step 5: Commit**

```bash
git add data/names.json
git commit -m "Контент девяти имён: толкования, факты, диптих аль-Кабид/аль-Басит"
```

---

### Task 7: README и финальный прогон

**Files:**
- Create: `README.md`

- [ ] **Step 1: Написать README.md**

```markdown
# Аль-асма аль-хусна

Интерактивные 3D-чётки: 99 имён Аллаха, имя за именем. Толкования, примирение
кажущихся противоречий (парные имена — диптихами), расхождения списков и
переводов — честными сносками.

Родственник [Philosophical Cosmos](https://github.com/rakhmondaler/philosophers-map),
но вместо карты — путь: чтение как перебирание чёток.

## Запуск

Статический сайт без сборки:

​```bash
python3 -m http.server 8000
# затем http://localhost:8000
​```

## Структура

- `index.html` — страница
- `js/beads.js` — 3D-сцена чёток (Three.js)
- `js/card.js` — карточка имени и диптих
- `js/state.js` — навигация и прогресс (localStorage)
- `data/names.json` — данные имён
- `test/` — тесты: `node --test test/`
- `DESIGN.md` — дизайн-документ, `PLAN.md` — план реализации

## Статус

v0: сцена целиком, заполнены 9 имён из 99.
```

(Убрать экранирование ​`​ в блоке bash при записи файла.)

- [ ] **Step 2: Финальный прогон**

Run: `node --test test/`
Expected: PASS, все тесты.

В браузере: полный проход из Task 5 Step 3 ещё раз, включая перезагрузку. Скриншот главного экрана — показать Далеру.

- [ ] **Step 3: Commit и push**

```bash
git add README.md
git commit -m "README: запуск, структура, статус v0"
git push
```
