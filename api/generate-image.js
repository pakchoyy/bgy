// /api/generate-image.js
// Menggunakan Hugging Face Inference API — FLUX.1-schnell
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  // Pengaturan Header agar bisa diakses dari web (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  // 🔑 Ambil token dari Vercel Environment Variables
  // Pastikan Anda sudah membuat variabel HF_TOKEN di Vercel Settings
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

    // Prompt dioptimalkan untuk ilustrasi soal sekolah dasar
    const fullPrompt = `${prompt}, cartoon illustration style, colorful, child-friendly, clean white background, no text, simple and clear`;

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
            num_inference_steps: 4, // FLUX schnell optimal di 4 steps
          }
        })
      }
    );

    if (!response.ok) {
      // Jika model sedang loading (cold start)
      if (response.status === 503) {
        return res.status(503).json({
          error: 'Model sedang pemanasan, silakan klik lagi dalam 20 detik',
          loading: true
        });
      }

      return res.status(500).json({
        error: `Hugging Face error: ${response.status}`
      });
    }

    // Mengubah hasil gambar (binary) menjadi format Base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';

    return res.status(200).json({
      image: `data:${contentType};base64,${base64}`
    });

  } catch (err) {
    console.error('generate-image error:', err);
    return res.status(500).json({ error: err.message });
  }
}
