/* BGY foto — Service Worker */
const CACHE_NAME = 'bgy-foto-v1';
const CORE = [
  '/foto/',
  '/foto/manifest.json',
  '/guru-cibisd2.png',
  '/bgy-info.js',
  '/fonts/bgy-font.css?v=2',
  '/pdf/lib/jszip.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('bgy-foto-') && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // HTML dan info bersama: ambil terbaru saat online, cache saat offline.
  if (req.mode === 'navigate' || url.pathname === '/bgy-info.js') {
    const key = req.mode === 'navigate' ? '/foto/' : '/bgy-info.js';
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(key, copy)); }
        return res;
      }).catch(() => caches.match(key))
    );
    return;
  }

  // Aset statis: cache dulu.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && url.pathname.startsWith('/foto/')) { const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
