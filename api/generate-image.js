// /api/generate-image.js
// Google Gemini — generate gambar dengan key rotation (IMG_1/2/3)
// Model: gemini-2.0-flash-exp (lebih stabil, gratis)
export const config = { api: { bodyParser: true } };

// Model candidates — dicoba berurutan jika satu gagal
const MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash-preview-05-20',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

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
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt kosong' });
  }

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
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
