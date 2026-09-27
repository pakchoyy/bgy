// /api/generate-imagehf.js
// Hugging Face Inference API — FLUX.1-schnell (gratis)

export const config = { api: { bodyParser: true } };

const buckets = globalThis.__bgyHfRateBuckets || new Map();
globalThis.__bgyHfRateBuckets = buckets;
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

function guard(req, res) {
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
  if (req.method === 'OPTIONS') { res.status(200).end(); return false; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return false; }
  if (origin && !allowed.includes(origin)) { res.status(403).json({ error: 'Origin tidak diizinkan' }); return false; }
  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  // 🔑 Token Hugging Face — set di Vercel Environment Variables
  // Nama variable: HF_TOKEN (isi dengan token dari huggingface.co/settings/tokens)
  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'HF_TOKEN belum diset di environment variables' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const prompt = body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt kosong' });
    }
    if (prompt.length > 2000) return res.status(413).json({ error: 'Prompt terlalu panjang' });

    // Prompt diperkuat untuk ilustrasi soal SD
    const fullPrompt = `${prompt}, cartoon illustration style, colorful, child-friendly, Indonesian elementary school, clean white background, no text, no words, simple and clear`;

    const response = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            width: 512,
            height: 384,
            num_inference_steps: 4,  // FLUX schnell optimal di 4 steps
            guidance_scale: 0        // FLUX schnell tidak pakai guidance
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn('HF error:', response.status, errText);

      // Kalau model sedang loading (cold start) — kasih tau frontend
      if (response.status === 503) {
        return res.status(503).json({
          error: 'Model sedang loading, coba lagi 20 detik',
          loading: true
        });
      }

      return res.status(500).json({
        error: `Hugging Face error: ${response.status}`
      });
    }

    // HF return binary image langsung (bukan JSON)
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Deteksi mime type dari response header
    const contentType = response.headers.get('content-type') || 'image/png';

    return res.status(200).json({
      image: `data:${contentType};base64,${base64}`
    });

  } catch (err) {
    console.error('generate-imagehf error:', err);
    return res.status(500).json({ error: err.message });
  }
}
