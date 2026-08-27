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

  const loader = new THREE.TextureLoader();
  const beadMaps = [1, 2, 3, 4].map(n => {
    const t = loader.load(`assets/beads/bead_${n}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  const tasselMap = loader.load('assets/tassel.png');
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

  // кисточка стоит вверх от нити, колпачком к шнуру
  const tassel = new THREE.Sprite(new THREE.SpriteMaterial({ map: tasselMap, rotation: Math.PI }));
  const TASSEL_H = 3.4;
  tassel.scale.set(TASSEL_H * (844 / 2224), TASSEL_H, 1);
  scene.add(tassel);

  // шнур — тонкая тёмно-зелёная нить по кривой
  const pts = [];
  for (let x = -XCLAMP; x <= XCLAMP; x += 0.5) pts.push(new THREE.Vector3(x, catY(x), -0.1));
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0x1c5a3a })
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

  function layout() {
    for (let i = 0; i < TOTAL; i++) {
      const x = circ(i - offset) * SPACING;
      beads[i].position.set(x, catY(x), 0);
      const active = Math.abs(circ(i - target)) < 0.5;
      const pair = i + 1 === pairIdCur;
      const sc = active ? BEAD_SCALE * 1.3 : pair ? BEAD_SCALE * 1.12 : BEAD_SCALE;
      beads[i].scale.set(sc, sc, 1);
      beads[i].material.color.copy(active || pair ? LIT : DIM);
    }
    const tx = circ(TOTAL - 1 + (GAP + 1) / 2 - offset) * SPACING;
    tassel.position.set(tx, catY(tx) + TASSEL_H * 0.42, 0.1);
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
