// /api/generate-image.js

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  // 🔑 3 API KEY (set di Vercel Environment Variables)
  const keys = [
    process.env.GEMINI_IMG_1,
    process.env.GEMINI_IMG_2,
    process.env.GEMINI_IMG_3
  ].filter(Boolean);

  if (keys.length === 0) {
    return res.status(500).json({ error: 'API key belum diset di environment variables' });
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

    // Prompt diperkuat agar cocok untuk soal SD
    const fullPrompt = `${prompt}. Gaya ilustrasi kartun anak SD Indonesia, warna cerah dan ceria, background putih bersih, tanpa tulisan atau teks apapun di gambar, simple dan jelas.`;

    let lastError = null;

    // 🔁 Loop semua key — kalau satu kena rate limit, coba key berikutnya
    for (const apiKey of keys) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: fullPrompt }]
                }
              ],
              // ✅ WAJIB — tanpa ini Gemini tidak return gambar
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
              }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          lastError = data?.error?.message || `HTTP ${response.status}`;
          console.warn(`Key gagal (${response.status}):`, lastError);
          continue; // coba key berikutnya
        }

        // 🎯 Cari bagian gambar dari response
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

        if (!imagePart) {
          lastError = 'Gambar tidak ada di response';
          continue;
        }

        const base64 = imagePart.inlineData.data;
        const mime = imagePart.inlineData.mimeType || 'image/png';

        return res.status(200).json({
          image: `data:${mime};base64,${base64}`
        });

      } catch (err) {
        lastError = err.message;
      }
    }

    return res.status(500).json({
      error: 'Semua API key gagal',
      detail: lastError
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
