// щелчок бусины: живой сэмпл (камень) с вариацией высоты; до его загрузки - синтезированный тик
let ctx = null;
let clickBuf = null;
let loading = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (!loading) {
    loading = true;
    fetch('assets/click.m4a')
      .then(r => r.arrayBuffer())
      .then(b => ctx.decodeAudioData(b))
      .then(buf => { clickBuf = buf; })
      .catch(() => {});
  }
  return ctx;
}

// разблокировка звука первым жестом пользователя (требование браузеров)
for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
  addEventListener(ev, () => ensureCtx(), { once: true, passive: true });
}

function synthTick(c) {
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const f = 1500 + Math.random() * 400;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f, t);
  osc.frequency.exponentialRampToValueAtTime(f * 0.4, t + 0.055);
  gain.gain.setValueAtTime(0.14, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function beadClick() {
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  if (clickBuf) {
    const src = c.createBufferSource();
    src.buffer = clickBuf;
    src.playbackRate.value = 0.92 + Math.random() * 0.16;
    const gain = c.createGain();
    gain.gain.value = 0.55;
    src.connect(gain).connect(c.destination);
    src.start();
  } else {
    synthTick(c);
  }
  navigator.vibrate?.(8);
}
