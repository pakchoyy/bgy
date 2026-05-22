// BGY Modul Ajar — Service Worker v1.0
// Cache: aset statis saja. API/generate tetap butuh internet.

const CACHE = 'bgy-modul-ajar-v1';

// Aset yang di-cache saat install (disesuaikan dengan jalur modul-ajar)
const PRECACHE = [
  '/modul-ajar/',
  '/modul-ajar/index.html',
  '../guru-cibisd2.png',
  '/modul-ajar/manifest.json'
];

// ── Install: pre-cache aset utama ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: hapus cache lama ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache First / Network Fallback untuk aset statis ──
self.addEventListener('fetch', e => {
  // Hanya tangani request HTTP/HTTPS (hindari chrome-extension dll)
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
