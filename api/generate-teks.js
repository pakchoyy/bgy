// Teks Sekolah: Sambutan & Naskah MC.
// Belum dipakai halaman sampai AI_AKTIF = true di /teks-sekolah/index.html.
// Isi GEMINI_TEKS_1 (opsional _2, _3) dan GEMINI_TEKS_MODEL di environment.
export const config = { api: { bodyParser: true } };

const buckets = globalThis.__bgyTeksRateBuckets || new Map();
globalThis.__bgyTeksRateBuckets = buckets;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 6;

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const now = Date.now();
  const key = clientIp(req);
  const recent = (buckets.get(key) || []).filter(t => now - t < RATE_WINDOW_MS);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 1000) {
    for (const [ip, times] of buckets) {
      if (!times.some(t => now - t < RATE_WINDOW_MS)) buckets.delete(ip);
    }
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (origin && !allowed.includes(origin)) return res.status(403).json({ error: 'Origin tidak diizinkan' });
  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.' });
  }

  const keys = [process.env.GEMINI_TEKS_1, process.env.GEMINI_TEKS_2, process.env.GEMINI_TEKS_3]
    .filter((k, i, arr) => k && arr.indexOf(k) === i);
  const models = (process.env.GEMINI_TEKS_MODEL || 'gemini-2.5-flash,gemini-2.5-flash-lite')
    .split(',').map(m => m.trim()).filter(Boolean);

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const prompt = body?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Prompt kosong' });
  if (prompt.length > 8000) return res.status(413).json({ error: 'Prompt terlalu panjang' });
  if (!keys.length) return res.status(503).json({ error: 'Fitur AI Teks Sekolah belum diaktifkan' });

  const attempts = [];
  const deadline = Date.now() + 55000;
  for (const apiKey of keys) {
    for (const model of models) {
      const remaining = deadline - Date.now();
      if (remaining < 5000) break;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(40000, remaining));
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
          })
        });
        const data = await r.json();
        if (r.ok) {
          const text = (data.candidates || []).flatMap(c => c.content?.parts || []).map(p => p.text || '').join('');
          if (text) return res.status(200).json({ text, model });
          attempts.push({ model, message: 'Respons kosong' });
        } else {
          attempts.push({ model, status: r.status, message: data?.error?.message || r.statusText });
        }
      } catch (err) {
        attempts.push({ model, message: err.name === 'AbortError' ? 'Waktu respons habis' : err.message });
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return res.status(502).json({ error: 'Semua API gagal', detail: attempts.slice(-4) });
}
