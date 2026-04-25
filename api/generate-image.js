// /api/generate-image.js
// Menggunakan Google Gemini 2.0 Flash — generate gambar GRATIS via AI Studio
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  // 🔑 Simpan API key di Vercel Environment Variables dengan nama GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY belum diset di environment variables' });
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

    // Prompt dioptimalkan untuk ilustrasi soal SD Indonesia
    const fullPrompt = `${prompt}, flat cartoon illustration style, bright colors, child-friendly, clean white background, no text, no letters, no numbers, simple and clear, Indonesian elementary school educational illustration`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 1,
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini error:', response.status, errText);
      return res.status(500).json({
        error: `Gemini API error: ${response.status}`,
        detail: errText
      });
    }

    const data = await response.json();

    // Ambil bagian image dari response Gemini
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart?.inlineData?.data) {
      console.error('Gemini response tidak mengandung gambar:', JSON.stringify(data));
      return res.status(500).json({ error: 'Gemini tidak menghasilkan gambar' });
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    const base64 = imagePart.inlineData.data;

    // Kembalikan format sama seperti sebelumnya agar HTML tidak perlu diubah
    return res.status(200).json({
      image: `data:${mimeType};base64,${base64}`
    });

  } catch (err) {
    console.error('generate-image error:', err);
    return res.status(500).json({ error: err.message });
  }
}
