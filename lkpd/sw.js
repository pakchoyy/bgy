const CACHE_NAME = "bantu-guru-v2";

// FILE WAJIB CACHE
const CORE_ASSETS = [
  "/lkpd/",
  "/lkpd/index.html",
  "/lkpd/manifest.json",
  "/lkpd/guru-cibisd2.png"
];

// INSTALL
self.addEventListener("install", event => {
  console.log("SW: Install");
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  console.log("SW: Activate");

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("SW: Delete old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// FETCH (SMART STRATEGY)
self.addEventListener("fetch", event => {

  // SKIP API (biar tidak ganggu fetch Gemini kamu)
  if (event.request.url.includes("script.google.com")) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {

        // 🔥 kalau ada di cache → pakai cache
        if (cached) return cached;

        // 🔥 kalau tidak → ambil dari internet + simpan
        return fetch(event.request)
          .then(response => {

            // hanya cache file valid
            if (!response || response.status !== 200 || response.type !== "basic") {
              return response;
            }

            const responseClone = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));

            return response;
          })
          .catch(() => {
            // fallback kalau offline
            if (event.request.destination === "document") {
              return caches.match("/lkpd/index.html");
            }
          });
      })
  );
});
