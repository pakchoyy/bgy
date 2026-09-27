export const config = { api: { bodyParser: true } };

const buckets = globalThis.__bgySoalRateBuckets || new Map();
globalThis.__bgySoalRateBuckets = buckets;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;

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

  const keys = [
    process.env.GEMINI_SOAL_1,
    process.env.GEMINI_SOAL_2,
    process.env.GEMINI_SOAL_3,
    process.env.GEMINI_SOAL_4,
    process.env.GEMINI_SOAL_5,
    process.env.GEMINI_SOAL_6
  ];
  const models = (process.env.GEMINI_SOAL_MODEL || 'gemini-3.6-flash,gemini-2.5-flash,gemini-2.0-flash')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const prompt = body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Prompt kosong' });
    if (prompt.length > 60000) return res.status(413).json({ error: 'Prompt terlalu panjang' });

    let lastError = null;

    for (let apiKey of keys) {
      if (!apiKey) continue;

      for (let model of models) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: prompt }]
                  }
                ],
                generationConfig: {
                  response_mime_type: 'application/json'
                }
              })
            }
          );

          const data = await response.json();

          if (response.ok) {
            const text = (data.candidates || [])
              .flatMap(candidate => candidate.content?.parts || [])
              .map(part => part.text || '')
              .join('');
            if (!text) {
              lastError = { model, message: 'Respons Gemini kosong' };
              continue;
            }
            return res.status(200).json({ text, model });
          } else {
            lastError = { model, status: response.status, message: data?.error?.message || 'Request Gemini gagal' };
          }

        } catch (err) {
          lastError = { model, message: err.message };
        }
      }
    }

    return res.status(500).json({
      error: 'Semua API gagal',
      detail: lastError
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
