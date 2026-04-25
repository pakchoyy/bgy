// /api/generate-image.js
// Google Gemini 2.0 Flash — generate gambar dengan key rotation (IMG_1/2/3)
export const config = { api: { bodyParser: true } };

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

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const prompt = body?.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt kosong' });
    }

    const fullPrompt = `${prompt}, flat cartoon illustration style, bright colors, child-friendly, clean white background, no text, no letters, no numbers, simple and clear, Indonesian elementary school educational illustration`;

    // Coba key satu per satu sampai berhasil
    let lastError = null;
    for (const apiKey of keys) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                temperature: 1,
              }
            })
          }
        );

        // Quota habis / rate limit → coba key berikutnya
        if (response.status === 429 || response.status === 403) {
          lastError = `Key quota habis (${response.status})`;
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Gemini error ${response.status}: ${errText}`;
          continue;
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

        if (!imagePart?.inlineData?.data) {
          lastError = 'Gemini tidak menghasilkan gambar';
          continue;
        }

        const mimeType = imagePart.inlineData.mimeType || 'image/png';
        const base64 = imagePart.inlineData.data;

        return res.status(200).json({
          image: `data:${mimeType};base64,${base64}`
        });

      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    console.error('Semua GEMINI_IMG key gagal:', lastError);
    return res.status(500).json({ error: 'Semua key gagal: ' + lastError });

  } catch (err) {
    console.error('generate-image error:', err);
    return res.status(500).json({ error: err.message });
  }
}
