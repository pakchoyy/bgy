// sw.js — Bantu Guru Yuk! Service Worker v2
// Strategy: Cache app shell → buka instant kayak app
//           API & dynamic content → selalu dari network

const CACHE = 'bgy-shell-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/guru-cibisd2.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API & external → network only
  if (url.hostname !== self.location.hostname) return;
  if (url.pathname.startsWith('/api/')) return;
  // Shell → cache first
  if (SHELL.includes(url.pathname) || url.pathname === '/') {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }
  // Lainnya → network
  e.respondWith(fetch(e.request));
});
