const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('modul-ajar/index.html', 'utf8');
const api = fs.readFileSync('api/generate-modul-ajar.js', 'utf8');

function loadApiHandler() {
  const source = api
    .replace('export const config', 'const config')
    .replace('export default async function handler', 'async function handler');
  return vm.runInNewContext(`${source}; handler;`, {
    console,
    process: { env: {} },
    AbortController,
    fetch: async () => { throw new Error('fetch tidak boleh dipanggil dalam tes validasi'); },
    setTimeout,
    clearTimeout
  });
}

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
    end() { return this; }
  };
}

function extractFunction(name, nextName) {
  const start = html.indexOf(`function ${name}(`);
  const end = html.indexOf(`function ${nextName}(`, start);
  assert.ok(start >= 0 && end > start, `Tidak dapat mengekstrak ${name}`);
  const source = `${html.slice(start, end)}; ${name};`;
  return vm.runInNewContext(source, {
    document: {
      getElementById(id) {
        return { value: id === 'jumlahPertemuan' ? '2' : '2 x 35 menit' };
      }
    }
  });
}

const auditModule = extractFunction('auditModule', 'confirmModuleExport');

function completeModule() {
  const material = 'Materi kontekstual yang terukur dan relevan bagi peserta didik. '.repeat(90);
  return `# MODUL AJAR KURIKULUM MERDEKA
| Waktu per Pertemuan | 2 x 35 menit |
| Jumlah Pertemuan | 2 |
## Sumber/Acuan CP atau KD
CP diselaraskan dengan panduan mata pelajaran nasional.
## Capaian Pembelajaran
Peserta didik memahami konsep secara utuh.
## Tujuan Pembelajaran
TP-1: peserta didik dapat menjelaskan konsep.
TP-2: peserta didik dapat menerapkan konsep.
## KKTP
| TP | Bukti belajar | Kriteria |
| --- | --- | --- |
| TP-1 | Penjelasan | Terukur |
| TP-2 | Produk | Terukur |
## Kegiatan Pembelajaran
Memahami, Mengaplikasi, dan Merefleksi melalui diferensiasi konten, proses, dan produk.
Pendahuluan 10 menit, inti 50 menit, penutup 10 menit.
10 + 50 + 10 = 70 menit
Pendahuluan 10 menit, inti 50 menit, penutup 10 menit.
10 + 50 + 10 = 70 menit
${material}
## Asesmen dan Penilaian
TP-1 dinilai melalui penjelasan. TP-2 dinilai melalui produk.
Instrumen evaluasi:
1. Jelaskan konsep yang dipelajari.
Kunci jawaban dan pedoman penskoran tersedia.
## Lampiran
LKPD, lembar kerja, dan rubrik keterampilan tersedia.`;
}

test('modul lengkap lolos seluruh pemeriksaan otomatis', () => {
  const failed = auditModule(completeModule()).filter(check => !check.ok);
  assert.equal(failed.length, 0);
});

test('waktu harus benar untuk setiap pertemuan', () => {
  const raw = completeModule().replace('10 + 50 + 10 = 70 menit\nPendahuluan', 'Pendahuluan');
  const time = auditModule(raw).find(check => check.label === 'Waktu kegiatan tepat');
  assert.equal(time.ok, false);
});

test('semua kode TP harus muncul pada asesmen', () => {
  const raw = completeModule().replace('TP-1 dinilai melalui penjelasan. TP-2 dinilai melalui produk.', 'TP-1 dinilai melalui penjelasan.');
  const alignment = auditModule(raw).find(check => check.label === 'Semua TP terhubung ke asesmen');
  assert.equal(alignment.ok, false);
});

test('form dan endpoint memiliki pagar pengaman utama', () => {
  assert.match(html, /id="jumlahPertemuan"/);
  assert.match(html, /KONTEKS HASIL TAHAP LAIN/);
  assert.match(html, /Preview diringkas agar halaman tetap lancar/);
  assert.match(api, /isRateLimited\(req\)/);
  assert.match(api, /prompt\.length > 100000/);
  assert.match(api, /Origin tidak diizinkan/);
  assert.match(api, /requestDeadline/);
});

test('endpoint menolak origin asing dan prompt terlalu panjang', async () => {
  const handler = loadApiHandler();
  const foreign = mockResponse();
  await handler({ method: 'POST', headers: { origin: 'https://contoh.invalid' }, body: { prompt: 'uji' }, socket: {} }, foreign);
  assert.equal(foreign.statusCode, 403);

  const oversized = mockResponse();
  await handler({ method: 'POST', headers: {}, body: { prompt: 'x'.repeat(100001) }, socket: { remoteAddress: '127.0.0.2' } }, oversized);
  assert.equal(oversized.statusCode, 413);
});

test('endpoint membatasi lonjakan permintaan per alamat', async () => {
  const handler = loadApiHandler();
  let last;
  for (let i = 0; i < 13; i++) {
    last = mockResponse();
    await handler({ method: 'POST', headers: {}, body: { prompt: 'uji' }, socket: { remoteAddress: '127.0.0.3' } }, last);
  }
  assert.equal(last.statusCode, 429);
});
