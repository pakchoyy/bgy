// /api/generate-image.js
// Google Gemini — generate gambar dengan key rotation (IMG_1/2/3)
// Model: gemini-2.0-flash-exp (lebih stabil, gratis)
export const config = { api: { bodyParser: true } };

const buckets = globalThis.__bgyImgRateBuckets || new Map();
globalThis.__bgyImgRateBuckets = buckets;
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

// Model candidates — dicoba berurutan jika satu gagal
const MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-preview-05-20',
];

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  // 🔑 Key rotation — pakai GEMINI_IMG_1/2/3 bergantian
  const keys = [
    process.env.GEMINI_IMG_1,
    process.env.GEMINI_IMG_2,
    process.env.GEMINI_IMG_3,
  ].filter(Boolean);

  if (keys.length === 0) {
    return res.status(500).json({ error: 'Tidak ada GEMINI_IMG key yang tersedia' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }

  const prompt = body?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt kosong' });
  }
  if (prompt.length > 2000) return res.status(413).json({ error: 'Prompt terlalu panjang' });

  const fullPrompt = `${prompt}, flat cartoon illustration style, bright colors, child-friendly, clean white background, no text, no letters, no numbers, simple and clear, Indonesian elementary school educational illustration`;

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      temperature: 1,
    }
  });

  let lastError = null;

  // Coba setiap kombinasi model × key
  for (const model of MODELS) {
    for (const apiKey of keys) {
      try {
        const controller = new AbortController();
        // Timeout 20 detik per request
        const tid = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: requestBody,
            signal: controller.signal,
          }
        );
        clearTimeout(tid);

        // Quota habis / rate limit / forbidden → coba key berikutnya
        if (response.status === 429 || response.status === 403) {
          lastError = `${model} key quota habis (${response.status})`;
          continue;
        }

        // Model tidak tersedia → coba model berikutnya
        if (response.status === 404 || response.status === 400) {
          lastError = `${model} tidak tersedia (${response.status})`;
          break; // break inner loop, coba model berikutnya
        }

        if (!response.ok) {
          const errText = await response.text();
          lastError = `${model} error ${response.status}: ${errText}`;
          continue;
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

        if (!imagePart?.inlineData?.data) {
          lastError = `${model} tidak menghasilkan gambar`;
          continue;
        }

        const mimeType = imagePart.inlineData.mimeType || 'image/png';
        const base64 = imagePart.inlineData.data;

        return res.status(200).json({
          image: `data:${mimeType};base64,${base64}`
        });

      } catch (err) {
        if (err.name === 'AbortError') {
          lastError = `${model} timeout (>20s)`;
        } else {
          lastError = `${model}: ${err.message}`;
        }
        continue;
      }
    }
  }

  console.error('Semua model/key gagal:', lastError);
  return res.status(500).json({ error: 'Semua model gagal: ' + lastError });
}
