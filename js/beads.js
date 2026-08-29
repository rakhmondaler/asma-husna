import * as THREE from 'three';

const TOTAL = 99;
const SPACING = 1.9;
// в PNG бусины ~28% прозрачных полей: спрайт крупнее шага, чтобы камни почти касались
const BEAD_SCALE = 2.58;
const STRAND_Y = 1.6;
const SAG = 2.6;
const K = 9;
const XCLAMP = 14;

// нить статична (катенарная кривая), бусины скользят вдоль неё
const catY = x => {
  const xe = Math.max(-XCLAMP, Math.min(XCLAMP, x));
  return STRAND_Y + SAG * (Math.cosh(xe / K) - 1);
};

// детерминированный псевдослучай по номеру бусины: вариант камня и поворот блика
const variantOf = i => (i * 7 + 3) % 4;
const rotationOf = i => (((i * 37) % 100) / 100 - 0.5) * (50 * Math.PI / 180);

export function createBeadsScene(canvas, { onBeadClick }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, STRAND_Y - 0.2, 18);
  camera.lookAt(0, STRAND_Y - 0.2, 0);

  const manager = new THREE.LoadingManager();
  const ready = new Promise(res => { manager.onLoad = res; });
  const loader = new THREE.TextureLoader(manager);
  const beadMaps = [1, 2, 3, 4].map(n => {
    const t = loader.load(`assets/beads/bead_${n}.webp`);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  const tasselMap = loader.load('assets/tassel.webp');
  tasselMap.colorSpace = THREE.SRGBColorSpace;

  const DIM = new THREE.Color(0xc9c9c9);
  const LIT = new THREE.Color(0xffffff);

  const beads = [];
  for (let i = 0; i < TOTAL; i++) {
    const mat = new THREE.SpriteMaterial({
      map: beadMaps[variantOf(i)],
      rotation: rotationOf(i),
      color: DIM.clone()
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(BEAD_SCALE, BEAD_SCALE, 1);
    s.userData.id = i + 1;
    scene.add(s);
    beads.push(s);
  }

  // кисточка стоит вверх от нити; якорь вращения - в колпачке (точке крепления к шнуру)
  const tassel = new THREE.Sprite(new THREE.SpriteMaterial({ map: tasselMap, rotation: Math.PI }));
  const TASSEL_H = 3.4;
  tassel.scale.set(TASSEL_H * (844 / 2224), TASSEL_H, 1);
  // в PNG кисточки 6% прозрачного поля сверху: якорь ставим на сам колпачок
  tassel.center.set(0.5, 0.93);
  scene.add(tassel);

  // шнур — кручёная нить: процедурная текстура прядей + свет для объёма
  // (свет влияет только на шнур: спрайты бусин его игнорируют)
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const cordLight = new THREE.DirectionalLight(0xfff0e0, 1.6);
  cordLight.position.set(2, 6, 8);
  scene.add(cordLight);

  function makeCordTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#123a26';
    g.fillRect(0, 0, 64, 64);
    // диагональные пряди кручёного шнура: тень, тело, блик
    for (const [offset, color, width] of [[0, '#0c2a1b', 13], [5, '#1d5c3c', 9], [8, '#2f8557', 4]]) {
      g.strokeStyle = color;
      g.lineWidth = width;
      for (let i = -2; i <= 6; i++) {
        g.beginPath();
        g.moveTo(i * 16 + offset - 32, 96);
        g.lineTo(i * 16 + offset + 32, -32);
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(90, 1.5);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const pts = [];
  for (let x = -XCLAMP; x <= XCLAMP; x += 0.5) pts.push(new THREE.Vector3(x, catY(x), -0.1));
  const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.06, 12);
  const tubeBase = tubeGeo.attributes.position.array.slice();
  scene.add(new THREE.Mesh(
    tubeGeo,
    new THREE.MeshStandardMaterial({ map: makeCordTexture(), roughness: 0.85, metalness: 0 })
  ));

  // чётки замкнуты в кольцо: за 99-й бусиной, через зазор с кисточкой, снова первая
  const GAP = 1.6;
  const PERIOD = TOTAL + GAP;
  const circ = d => {
    d = ((d % PERIOD) + PERIOD) % PERIOD;
    return d > PERIOD / 2 ? d - PERIOD : d;
  };

  let target = 0;
  let offset = 0;
  let currentId = 1;
  let pairIdCur = null;

  // нить отзывается на курсор: ближние бусины приподнимаются и светлеют
  let cursor = null;
  canvas.addEventListener('pointermove', e => {
    const nx = (e.clientX / canvas.clientWidth) * 2 - 1;
    const ny = -(e.clientY / canvas.clientHeight) * 2 + 1;
    const halfH = Math.tan(camera.fov * Math.PI / 360) * camera.position.z;
    cursor = { x: nx * halfH * camera.aspect, y: camera.position.y + ny * halfH };
  });
  canvas.addEventListener('pointerleave', () => { cursor = null; });
  canvas.addEventListener('pointerup', () => { if (matchMedia('(hover: none)').matches) cursor = null; });

  // нить - живой организм: дыхание (wobble), прогиб под курсором и под активной бусиной;
  // бусины всегда сидят на нити и движутся вместе с ней
  let cursAmp = 0;
  const sparks = [];
  let nextSpark = 2000;
  // маятник кисточки: раскачивается от листания, затухает пружиной
  let swing = 0, swingV = 0, prevOffset = 0;

  function layout(t) {
    const breath = 0.94 + 0.06 * Math.sin(t / 480);
    cursAmp += ((cursor ? 1 : 0) - cursAmp) * 0.08;
    const activeX = circ(target - offset) * SPACING;

    // случайный блик, пробегающий по бусинам
    if (t > nextSpark) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      sparks.push({ x: dir > 0 ? -XCLAMP - 4 : XCLAMP + 4, dir, v: 7 + Math.random() * 6, t0: t });
      nextSpark = t + 4000 + Math.random() * 6000;
    }
    for (let s = sparks.length - 1; s >= 0; s--) {
      sparks[s].pos = sparks[s].x + sparks[s].dir * sparks[s].v * (t - sparks[s].t0) / 1000;
      if (Math.abs(sparks[s].pos) > XCLAMP + 6) sparks.splice(s, 1);
    }

    // деформация нити в точке x
    const dyStrand = x => {
      let dy = 0.04 * Math.sin(x * 0.5 + t / 1400) + 0.025 * Math.sin(x * 1.15 - t / 900);
      if (cursor && cursAmp > 0.01) {
        const dx = x - cursor.x;
        const dyc = catY(x) - cursor.y;
        dy += cursAmp * 0.42 * Math.exp(-(dx * dx + dyc * dyc) / 2.4);
      }
      const da = x - activeX;
      dy += 0.3 * Math.exp(-(da * da) / 1.1);
      return dy;
    };

    // нить следует деформации: кольца трубки смещаются по своим базовым x
    const pos = tubeGeo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      pos.array[v * 3 + 1] = tubeBase[v * 3 + 1] + dyStrand(tubeBase[v * 3]);
    }
    pos.needsUpdate = true;

    for (let i = 0; i < TOTAL; i++) {
      const x = circ(i - offset) * SPACING;
      const active = Math.abs(circ(i - target)) < 0.5;
      const pair = i + 1 === pairIdCur;
      const y = catY(x) + dyStrand(x);

      // отклик камня на курсор: масштаб и свет (позицию ведёт нить)
      let touch = 0;
      if (cursor) {
        const dx = x - cursor.x;
        const dyc = y - cursor.y;
        touch = Math.exp(-(dx * dx + dyc * dyc) / 2.4);
      }
      const inf = beads[i].userData.inf = (beads[i].userData.inf ?? 0) + (touch - (beads[i].userData.inf ?? 0)) * 0.16;

      // бегущий блик
      let spark = 0;
      for (const sp of sparks) {
        const d = x - sp.pos;
        spark += Math.exp(-(d * d) / 1.2);
      }

      const sc = (active ? BEAD_SCALE * 1.12 : BEAD_SCALE) * (1 + inf * 0.06);
      beads[i].position.set(x, y, active ? 0.2 : inf * 0.1);
      beads[i].scale.set(sc, sc, 1);
      if (active) {
        beads[i].material.color.setScalar(breath + spark * 0.12);
        beads[i].material.rotation += 0.0025;
      } else {
        beads[i].material.color.copy(pair ? LIT : DIM).lerp(LIT, Math.min(1, inf * 0.8 + spark * 0.55));
      }
    }
    const dOff = offset - prevOffset;
    prevOffset = offset;
    swingV += -swing * 0.018 - swingV * 0.07 - dOff * 0.34;
    swing = Math.max(-0.4, Math.min(0.4, swing + swingV));
    tassel.material.rotation = Math.PI + swing + 0.018 * Math.sin(t / 1300);
    const tx = circ(TOTAL - 1 + (GAP + 1) / 2 - offset) * SPACING;
    tassel.position.set(tx, catY(tx) + dyStrand(tx) + 0.02, 0.1);
  }

  function setCurrent(id, pairId = null) {
    currentId = id;
    pairIdCur = pairId;
    target += circ(id - 1 - target);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // на узких экранах камера отъезжает, чтобы в кадре оставалось ~7 бусин
    camera.position.z = Math.min(42, Math.max(18, 21.6 / camera.aspect));
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

  renderer.setAnimationLoop(t => {
    offset += (target - offset) * 0.07;
    layout(t);
    renderer.render(scene, camera);
  });

  return { setCurrent, ready };
}
