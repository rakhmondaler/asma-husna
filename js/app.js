import { createBeadsScene } from './beads.js';

const scene = createBeadsScene(document.getElementById('scene'), {
  onBeadClick: id => scene.setCurrent(id)
});
scene.setCurrent(1);
