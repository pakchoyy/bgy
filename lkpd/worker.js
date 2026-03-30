/**
 * BGY Cloudflare Worker — Pro Code Validator
 * 
 * SETUP:
 * 1. Buka Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. Paste kode ini → Save & Deploy
 * 3. Catat URL worker kamu (misal: https://bgy-pro.namakamu.workers.dev)
 * 4. Isi WORKER_URL di index.html dengan URL itu
 * 
 * TAMBAH KODE PRO:
 * Di Cloudflare Worker → Settings → Variables → Add variable:
 *   Nama : PRO_CODES
 *   Value: BGY-XXXX-AAAA,BGY-YYYY-BBBB,BGY-ZZZZ-CCCC
 *   (pisahkan dengan koma, tanpa spasi)
 * 
 * FORMAT KODE REKOMENDASI: BGY-[4 huruf]-[4 angka]
 * Contoh: BGY-GURU-2025, BGY-PAKC-1234
 * Kamu generate manual dan jual via WA/TikTok
 */

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    // Hanya terima POST ke /validate
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/validate") {
      return cors(new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      }));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return cors(jsonRes({ valid: false, message: "Request tidak valid" }, 400));
    }

    const { code } = body;
    if (!code || typeof code !== "string") {
      return cors(jsonRes({ valid: false, message: "Kode tidak boleh kosong" }));
    }

    // Ambil daftar kode dari environment variable PRO_CODES
    // Format di env: BGY-GURU-2025,BGY-PAKC-1234,BGY-ABCD-5678
    const rawCodes = env.PRO_CODES || "";
    const validCodes = rawCodes
      .split(",")
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length > 0);

    const inputCode = code.trim().toUpperCase();

    if (validCodes.includes(inputCode)) {
      return cors(jsonRes({
        valid: true,
        message: "Aktivasi berhasil! Selamat menikmati BGY Pro 🎉"
      }));
    } else {
      return cors(jsonRes({
        valid: false,
        message: "Kode tidak valid atau sudah tidak aktif"
      }));
    }
  }
};

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function cors(response) {
  const r = new Response(response.body, response);
  r.headers.set("Access-Control-Allow-Origin", "*");
  r.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return r;
}
