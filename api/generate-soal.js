export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const keys = [
    process.env.GEMINI_SOAL_1,
    process.env.GEMINI_SOAL_2,
    process.env.GEMINI_SOAL_3,
    process.env.GEMINI_SOAL_4,
    process.env.GEMINI_SOAL_5,
    process.env.GEMINI_SOAL_6
  ];
  const model = process.env.GEMINI_SOAL_MODEL || 'gemini-3.6-flash';

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const prompt = body?.prompt;
    if (!prompt) return res.status(400).json({ error: 'Prompt kosong' });

    let lastError = null;

    for (let apiKey of keys) {
      if (!apiKey) continue;

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
            lastError = { error: 'Respons Gemini kosong', detail: data };
            continue;
          }
          return res.status(200).json({ text });
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
    return res.status(500).json({ error: err.message });
  }
}
