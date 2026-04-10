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

  // 🔑 3 API KEY (ganti di .env)
  const keys = [
    process.env.GEMINI_IMG_1,
    process.env.GEMINI_IMG_2,
    process.env.GEMINI_IMG_3
  ];

  try {
    let body = req.body;

    // handle kalau body string
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const prompt = body?.prompt;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt kosong' });
    }

    let lastError = null;

    // 🔁 loop key (anti limit)
    for (let apiKey of keys) {
      if (!apiKey) continue;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt }
                  ]
                }
              ]
            })
          }
        );

        const data = await response.json();

        if (response.ok) {
          // 🎯 ambil bagian gambar (base64)
          const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

          if (!imagePart) {
            lastError = 'Gambar tidak ditemukan';
            continue;
          }

          const base64 = imagePart.inlineData.data;

          return res.status(200).json({
            image: `data:image/png;base64,${base64}`
          });

        } else {
          lastError = data;
        }

      } catch (err) {
        lastError = err;
      }
    }

    return res.status(500).json({
      error: 'Semua API gagal',
      detail: lastError
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
