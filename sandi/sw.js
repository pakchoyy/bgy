'use strict';

/* SANDI service worker — caches core assets for offline use. */

const CACHE_NAME = 'sandi-cache-v6';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css?v=6',
  './app.js?v=6',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  '../guru-cibisd2.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isPage = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isPage) {
    // Network-first untuk HTML: user selalu dapat versi terbaru saat online,
    // dan tetap bisa buka aplikasi saat offline lewat cache.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first untuk aset statis (css/js/icon)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
