/* BGY Draft TP — Service Worker: HTML/JS network-first supaya update langsung sampai */
const CACHE = 'bgy-draft-tp-v4';
const ASSETS = ['./', './index.html', './perangkat.js?v=1', './guru-cibisd2.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('bgy-draft-tp-') && k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname === '/bgy-info.js' || url.hostname !== self.location.hostname) return;
  const fresh = e.request.mode === 'navigate' || /\.(html|js)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (fresh) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res && res.status === 200) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
    return res;
  })));
});
