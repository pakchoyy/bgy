// Aktivasi Prompt LKPD lewat domain sendiri. Halaman memanggil /api/lkpd-validate, server meneruskan ke
// Cloudflare Worker (kode Pro tetap disimpan di env Worker). Dengan begitu pengguna yang jaringannya
// tidak bisa membuka *.workers.dev tetap bisa aktivasi.
export const config = { api: { bodyParser: true } };

const WORKER_URL = process.env.LKPD_WORKER_URL || 'https://bgypro.pulsachoy.workers.dev';
const buckets = globalThis.__bgyLkpdValidateBuckets || new Map();
globalThis.__bgyLkpdValidateBuckets = buckets;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 8; // kode berupa 4 angka bisa ditebak; batasi percobaan per IP

function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const now = Date.now();
  const key = clientIp(req);
  const recent = (buckets.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 1000) {
    for (const [ip, times] of buckets) if (!times.some(t => now - t < RATE_WINDOW_MS)) buckets.delete(ip);
  }
  return recent.length > RATE_MAX;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = String(req.headers.origin || '');
  const allowed = (process.env.BGY_ALLOWED_ORIGINS || 'https://bantuguruyuk.web.id,https://www.bantuguruyuk.web.id')
    .split(',').map(v => v.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ valid: false, message: 'Method not allowed' });
  if (!allowed.includes(origin)) return res.status(403).json({ valid: false, message: 'Origin tidak diizinkan' });
  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ valid: false, message: 'Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const code = typeof body?.code === 'string' ? body.code.trim().slice(0, 40) : '';
  if (!code) return res.status(400).json({ valid: false, message: 'Masukkan kode aktivasi dulu!' });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(`${WORKER_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    const data = await r.json();
    return res.status(200).json({ valid: data.valid === true, message: String(data.message || '').slice(0, 200) });
  } catch (err) {
    console.error('[lkpd-validate] worker tidak terjangkau', err.name);
    return res.status(502).json({ valid: false, message: 'Server aktivasi sedang sibuk. Coba lagi sebentar.' });
  }
}
