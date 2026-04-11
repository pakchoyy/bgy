// /api/generate-imagehf.js
// Hugging Face Inference API — FLUX.1-schnell (gratis)

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  // 🔑 Token Hugging Face — set di Vercel Environment Variables
  // Nama variable: HF_TOKEN (isi dengan token dari huggingface.co/settings/tokens)
  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'HF_TOKEN belum diset di environment variables' });
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

    // Prompt diperkuat untuk ilustrasi soal SD
    const fullPrompt = `${prompt}, cartoon illustration style, colorful, child-friendly, Indonesian elementary school, clean white background, no text, no words, simple and clear`;

    const response = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            width: 512,
            height: 384,
            num_inference_steps: 4,  // FLUX schnell optimal di 4 steps
            guidance_scale: 0        // FLUX schnell tidak pakai guidance
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn('HF error:', response.status, errText);

      // Kalau model sedang loading (cold start) — kasih tau frontend
      if (response.status === 503) {
        return res.status(503).json({
          error: 'Model sedang loading, coba lagi 20 detik',
          loading: true
        });
      }

      return res.status(500).json({
        error: `Hugging Face error: ${response.status}`,
        detail: errText
      });
    }

    // HF return binary image langsung (bukan JSON)
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Deteksi mime type dari response header
    const contentType = response.headers.get('content-type') || 'image/png';

    return res.status(200).json({
      image: `data:${contentType};base64,${base64}`
    });

  } catch (err) {
    console.error('generate-imagehf error:', err);
    return res.status(500).json({ error: err.message });
  }
}
