/* BGY Katrol Nilai — Service Worker v26.5.1 */
const CACHE_NAME = 'bgy-katrol-v1';
const CACHE_URLS = [
  '/katrol-nilai/',
  '/katrol-nilai/index.html',
  '/katrol-nilai/manifest.json',
  '/guru-cibisd2.png',
];

/* ── Install: cache semua asset utama ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('BGY SW: Partial cache error', err);
      });
    })
  );
  self.skipWaiting();
});

/* ── Activate: hapus cache lama ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: network-first, fallback ke cache ── */
self.addEventListener('fetch', event => {
  // Skip non-GET dan request ke CDN eksternal
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache response terbaru
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: ambil dari cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback ke index.html untuk navigasi
          if (event.request.mode === 'navigate') {
            return caches.match('/katrol-nilai/index.html');
          }
        });
      })
  );
});

/* ── Push notifikasi update ke client ── */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
