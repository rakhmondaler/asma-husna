// щелчок бусины: сэмпл камня с вариацией высоты
// контекст и буфер готовятся сразу при загрузке; жест пользователя только снимает блокировку звука
let ctx = null;
let clickBuf = null;

const AC = window.AudioContext || window.webkitAudioContext;
if (AC) {
  ctx = new AC();
  fetch('assets/click.m4a')
    .then(r => r.arrayBuffer())
    .then(b => ctx.decodeAudioData(b))
    .then(buf => { clickBuf = buf; })
    .catch(() => {});
}

for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
  addEventListener(ev, () => { if (ctx?.state === 'suspended') ctx.resume(); }, { passive: true });
}

export function beadClick() {
  if (!ctx || ctx.state !== 'running' || !clickBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = clickBuf;
  src.playbackRate.value = 0.92 + Math.random() * 0.16;
  const gain = ctx.createGain();
  gain.gain.value = 0.55;
  src.connect(gain).connect(ctx.destination);
  src.start();
  navigator.vibrate?.(8);
}
