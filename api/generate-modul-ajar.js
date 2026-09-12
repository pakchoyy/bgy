export const config = { api: { bodyParser: true } };

const requestBuckets = globalThis.__bgyModulRateBuckets || new Map();
globalThis.__bgyModulRateBuckets = requestBuckets;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 12;

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const recent = (requestBuckets.get(key) || []).filter(time => now - time < RATE_WINDOW_MS);
  recent.push(now);
  requestBuckets.set(key, recent);
  if (requestBuckets.size > 1000) {
    for (const [ip, times] of requestBuckets) {
      if (!times.some(time => now - time < RATE_WINDOW_MS)) requestBuckets.delete(ip);
    }
  }
  return recent.length > RATE_MAX;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const requestOrigin = String(req.headers.origin || '');
  const allowedOrigins = (process.env.BGY_ALLOWED_ORIGINS || 'https://bantuguruyuk.web.id,https://www.bantuguruyuk.web.id')
    .split(',').map(value => value.trim()).filter(Boolean);
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    return res.status(403).json({ error: 'Origin tidak diizinkan' });
  }
  if (isRateLimited(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.' });
  }

  const keys = [
    process.env.GEMINI_MA_1,
    process.env.GEMINI_MA1,
    process.env.GEMINI_MA_2,
    process.env.GEMINI_MA2,
    process.env.GEMINI_MA_3,
    process.env.GEMINI_MA3,
    process.env.GEMINI_MA_4,
    process.env.GEMINI_MA4,
    process.env.GEMINI_MA_5,
    process.env.GEMINI_MA5,
    process.env.GEMINI_MA_6
  ].filter((key, index, arr) => key && arr.indexOf(key) === index);
  const models = (process.env.GEMINI_MA_MODEL || 'gemini-2.5-flash,gemini-2.5-flash-lite')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const prompt = body?.prompt;
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });
    if (typeof prompt !== 'string' || prompt.length > 100000) {
      return res.status(413).json({ error: 'Prompt terlalu panjang' });
    }
    if (body?.stage != null && (!Number.isInteger(Number(body.stage)) || Number(body.stage) < 1 || Number(body.stage) > 4)) {
      return res.status(400).json({ error: 'Tahap pembuatan tidak valid' });
    }
    if (!keys.some(Boolean)) {
      return res.status(500).json({ error: 'API Gemini modul ajar belum diisi di environment' });
    }

    let lastError = null;
    const attempts = [];
    const requestedModel = typeof body?.model === 'string' ? body.model.trim() : '';
    const selectedModels = requestedModel && models.includes(requestedModel)
      ? [requestedModel, ...models.filter(model => model !== requestedModel)]
      : models;
    const requestDeadline = Date.now() + 105000;

    attemptsLoop:
    for (let apiKey of keys) {
      if (!apiKey) continue;

      for (let model of selectedModels) {
        const remainingMs = requestDeadline - Date.now();
        if (remainingMs < 5000) break attemptsLoop;
        let timeout;
        try {
          const controller = new AbortController();
          timeout = setTimeout(() => controller.abort(), Math.min(50000, remainingMs));
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.45,
                  maxOutputTokens: body?.stage ? 12288 : 32768
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
              lastError = { error: 'Respons Gemini kosong', model, detail: data };
              continue;
            }
            return res.status(200).json({ text, model });
          } else {
            lastError = {
              model,
              status: response.status,
              message: data?.error?.message || response.statusText || 'Request Gemini gagal'
            };
            attempts.push(lastError);
          }

        } catch (err) {
          lastError = { model, message: err.name === 'AbortError' ? 'Waktu respons model habis' : err.message };
          attempts.push(lastError);
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    return res.status(500).json({
      error: 'Semua API gagal',
      detail: { last: lastError, attempts: attempts.slice(-6) }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
