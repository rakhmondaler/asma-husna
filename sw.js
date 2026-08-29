const CACHE = 'asma-husna-v1';
const CORE = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/beads.js',
  'js/card.js',
  'js/state.js',
  'js/sound.js',
  'js/menu.js',
  'data/names.json',
  'manifest.json',
  'assets/beads/bead_1.png',
  'assets/beads/bead_2.png',
  'assets/beads/bead_3.png',
  'assets/beads/bead_4.png',
  'assets/tassel.png',
  'assets/space-bg.mp4'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// код и данные - сеть в приоритете (свежие версии), ассеты - кэш в приоритете; офлайн работает целиком
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const fresh = ['document', 'script', 'style'].includes(e.request.destination) || e.request.url.endsWith('.json');
  const fromNet = () => fetch(e.request).then(res => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  });
  const fromCache = () => caches.match(e.request, { ignoreSearch: true });
  e.respondWith(
    fresh
      ? fromNet().catch(() => fromCache().then(hit => hit || caches.match('index.html')))
      : fromCache().then(hit => hit || fromNet()).catch(() => caches.match('index.html'))
  );
});
