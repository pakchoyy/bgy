// Gerbang pemakaian AI bersama untuk /api/generate-*: rate limit per menit + jatah gratis harian,
// dihitung di Supabase (fungsi bgy_ai_gate, migrasi 20261013_ai_quota.sql) supaya berlaku untuk semua instance.
// File berawalan "_" tidak dijadikan endpoint oleh Vercel.
// Jika Supabase tidak terjangkau / migrasi belum dijalankan, gerbang terbuka dan limiter memori di tiap API tetap jalan.
const SB_URL = process.env.SUPABASE_URL || 'https://xtmpiqpmwirsrcsphsto.supabase.co';
// Kunci anon publik (sama dengan yang dipakai halaman web); bukan rahasia.
const SB_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bXBpcXBtd2lyc3Jjc3Boc3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTkyODMsImV4cCI6MjA5MzA3NTI4M30.yk1ZW3fxKn2lLoalJt97l34a80ERaGiVTIt09titk-w';

export function clientIp(req) {
  const h = req.headers || {};
  const v = String(h['x-vercel-forwarded-for'] || h['x-real-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim();
  return v || req.socket?.remoteAddress || 'unknown';
}

// Mengembalikan null bila boleh lanjut, atau { status, body } bila harus ditolak.
export async function aiGate(req, tool, email) {
  let result;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(`${SB_URL}/rest/v1/rpc/bgy_ai_gate`, {
      method: 'POST',
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_tool: tool, p_ip: clientIp(req), p_email: typeof email === 'string' ? email.slice(0, 120) : null }),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    if (!r.ok) {
      console.error('[ai-gate] Supabase', r.status);
      return null;
    }
    result = await r.json();
  } catch (err) {
    console.error('[ai-gate] tidak terjangkau', err.name);
    return null;
  }
  if (result === 'rate') {
    return { status: 429, retryAfter: 60, body: { error: 'Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.' } };
  }
  if (result === 'quota') {
    console.warn('[ai-gate] jatah gratis habis', tool);
    return { status: 429, retryAfter: 3600, body: { error: 'Jatah gratis hari ini sudah habis. Coba lagi besok atau aktifkan Pro.', code: 'quota' } };
  }
  if (result === 'paket') {
    return { status: 429, body: { error: 'Kuota paket kamu sudah habis. Perpanjang paket di menu Upgrade.', code: 'paket' } };
  }
  if (result === 'invalid') return { status: 400, body: { error: 'Permintaan tidak valid' } };
  return null;
}
