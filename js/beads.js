import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TOTAL = 99;
const SPACING = 0.8;
const BEAD_R = 0.32;
const STRAND_Y = 1.6;
const SAG = 2.2;
const K = 14;
const XCLAMP = 13;

// нить статична (катенарная кривая), бусины скользят вдоль неё
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

  // чётки замкнуты в кольцо: за 99-й бусиной, через зазор с кисточкой, снова первая
  const GAP = 1.4;
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
      beads[i].scale.setScalar(Math.abs(circ(i - target)) < 0.5 ? 1.45 : 1);
    }
    for (const sep of separators) {
      const x = circ(sep.userData.s - 1 - offset) * SPACING;
      sep.position.set(x, catY(x), 0);
    }
    const tx = circ(TOTAL + 0.2 - offset) * SPACING;
    tassel.position.set(tx, catY(tx), 0);
    glow.position.copy(beads[currentId - 1].position).add(new THREE.Vector3(0, 0, 1.2));
  }

  function applyMaterials() {
    beads.forEach((b, i) => {
      b.material = i + 1 === currentId ? amberActive : i + 1 === pairIdCur ? amberPair : amber;
    });
  }

  function setCurrent(id, pairId = null) {
    currentId = id;
    pairIdCur = pairId;
    target += circ(id - 1 - target);
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
