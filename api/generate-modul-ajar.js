export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
    if (!keys.some(Boolean)) {
      return res.status(500).json({ error: 'API Gemini modul ajar belum diisi di environment' });
    }

    let lastError = null;
    const attempts = [];
    const requestedModel = typeof body?.model === 'string' ? body.model.trim() : '';
    const selectedModels = requestedModel && models.includes(requestedModel)
      ? [requestedModel, ...models.filter(model => model !== requestedModel)]
      : models;

    for (let apiKey of keys) {
      if (!apiKey) continue;

      for (let model of selectedModels) {
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
          lastError = { model, message: err.message };
          attempts.push(lastError);
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
