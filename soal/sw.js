// BGY Buat Soal — Service Worker v1.0
// Cache: aset statis saja. API/generate tetap butuh internet.

const CACHE = 'bgy-soal-v1';
const OFFLINE_URL = '/soal/offline.html';

// Aset yang di-cache saat install
const PRECACHE = [
  '/soal/',
  '/soal/index.html',
  '/soal/guru-cibisd2.png',
  '/soal/manifest.json',
  // Library eksternal — cache supaya load lebih cepat
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.js',
];

// ── Install: pre-cache aset utama ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache satu-satu, jangan gagal total kalau satu error
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

// ── Fetch: strategi per tipe request ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. API request (generate soal, supabase, gtag) → network only, jangan cache
  if (
    url.pathname.includes('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('google-analytics')
  ) {
    return; // biarkan browser handle normal
  }

  // 2. Navigasi (buka halaman) → network first, fallback ke cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache dengan versi terbaru
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() =>
          caches.match(e.request)
            .then(cached => cached || caches.match('/soal/index.html'))
            .then(cached => cached || new Response(
              `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <title>BGY — Offline</title>
              <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f4f8;color:#334155;text-align:center;padding:20px;}
              .icon{font-size:4rem;margin-bottom:16px;}.title{font-size:1.4rem;font-weight:800;margin-bottom:8px;}
              .sub{font-size:.9rem;color:#64748b;margin-bottom:24px;line-height:1.7;}
              button{background:linear-gradient(135deg,#0ea5a0,#0d7a8a);color:#fff;border:none;border-radius:12px;padding:12px 28px;font-size:1rem;font-weight:700;cursor:pointer;}
              </style></head><body>
              <div class="icon">📶</div>
              <div class="title">Kamu sedang offline</div>
              <div class="sub">BGY — Buat Soal butuh koneksi internet<br>untuk generate soal dengan AI.<br>Cek koneksimu lalu coba lagi.</div>
              <button onclick="location.reload()">🔄 Coba Lagi</button>
              </body></html>`,
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            ))
        )
    );
    return;
  }

  // 3. Aset statis (JS, CSS, gambar) → cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => new Response('', { status: 408 }));
    })
  );
});
