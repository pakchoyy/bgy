# Pedoman Desain Bantu Guru Yuk (BGY)

Pedoman ini dipakai setiap kali membuat aplikasi baru di ekosistem Bantu Guru Yuk, supaya semua tools terasa **satu keluarga**: warna, header, menu, iklan, animasi, dan cara install sama.

Acuan hidup: **Katrol Nilai** (`/katrol-nilai/`) dan **Kokurikuler** (`/kokurikuler/`) — kalau ragu, tiru struktur di sana.

---

## 1. Identitas & penamaan

| Hal | Aturan |
|---|---|
| Nama brand | **Bantu Guru Yuk** — selalu pakai spasi, bukan "BantuGuruYuk" |
| Singkatan | **BGY** |
| Judul header | Tulis `BGY \| Nama Tool` di HTML. `bgy-info.js` otomatis menampilkan **"Bantu Guru Yuk \| Nama Tool"** kalau muat satu baris, kalau tidak tetap **"BGY \| Nama Tool"** |
| Nama tool | Singkat & jelas: *Buat Soal, Modul Ajar, Prompt LKPD, Prompt Game, Kokurikuler, Katrol Nilai, Draft TP, Teks Sekolah, Simpan Sandi* |
| Kredit | `Bantu Guru Yuk \| by pak.choyy` (splash/loading) dan `© 2026 Bantu Guru Yuk by pak.choyy • vXX` (footer) |
| `<title>` | `Bantu Guru Yuk \| Nama Tool` |

**Gaya bahasa:** santai, jelas, khas guru — "sat-set", "anti bingung", "gak sampai 10 menit". Hindari kata hype ("Premium", "✨ Fitur Unggulan", "🚀 Semua ada di…").

---

## 2. Warna

### Mode terang (default)
```css
:root{
  --grad:linear-gradient(135deg,#0ea5a0,#0d7a8a,#2d6a7f); /* header, tombol utama, footer */
  --blue:#0ea5a0;        /* teal utama: ikon, link, fokus, item menu aktif */
  --teal-dark:#0d7a8a;   /* teks teal di latar terang */
  --bg:#f0f4f8;          /* latar halaman */
  --card-bg:#fff;        /* kartu */
  --text:#1e293b;        /* teks utama */
  --text-light:#64748b;  /* label, keterangan */
  --border:#e2e8f0;
  --input-bg:#f8fafc;
  --radius:12px;
  --shadow:0 2px 12px rgba(0,0,0,.08);
  --shadow-lg:0 8px 32px rgba(0,0,0,.13);
}
```

### Mode gelap (class `dark` di `<body>`)
```css
body.dark{
  --bg:#0f172a; --card-bg:#1e293b; --text:#f1f5f9;
  --text-light:#94a3b8; --border:#334155; --input-bg:#0f172a;
}
body.dark header{background:linear-gradient(135deg,#0d4a47,#1a3a4a);}
```
Teks teal di latar gelap: `#5eead4`.

### Warna fungsi
| Fungsi | Warna |
|---|---|
| Pro / upgrade / aktivasi | amber `linear-gradient(135deg,#f59e0b,#d97706)` |
| Bahaya / hapus / habis limit | `#dc2626` (latar lembut `#fee2e2`) |
| Sukses | `#059669` |
| WhatsApp | `#25D366` · TikTok `#000` · ChatGPT `#10a37f` · Gemini `linear-gradient(90deg,#4285f4,#34a853)` · Claude `#d97706`-ish |
| Bar Info (iklan) | `linear-gradient(90deg,#fbbf24,#f59e0b)`, badge `#1e293b`, tombol "Klik di sini" `#dc2626` |

**Gradient hanya untuk:** header, tombol utama, footer, banner install. Kartu & tombol lain warna solid.

---

## 3. Tipografi

- Font: **font bawaan perangkat** (Roboto di Android, San Francisco di iPhone, Segoe UI di Windows). Pasang di `<head>` **setelah** style halaman:
  ```html
  <link rel="stylesheet" href="/fonts/bgy-font.css?v=2">
  ```
- Dokumen ekspor (PDF/Word soal) tetap Times New Roman — jangan diganti.
- Ukuran acuan:

| Elemen | Ukuran |
|---|---|
| Judul header | `1rem`, 800, satu baris (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`) |
| Judul kartu | `.82–.9rem`, 700 |
| Label form | `.69rem`, 700, **HURUF BESAR**, `letter-spacing:.5px`, warna `--text-light` |
| Isi / input | `.83–.88rem` |
| Keterangan kecil | `.7–.76rem`, `--text-light` |

---

## 4. Ikon

- Pakai **Lucide** (lucide.dev, lisensi ISC) sebagai **SVG sprite inline** di awal `<body>`:
  ```html
  <svg xmlns="http://www.w3.org/2000/svg" style="display:none"><defs>
    <symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></symbol>
    <!-- ikon lain -->
  </defs></svg>

  <svg class="ic" aria-hidden="true"><use href="#i-menu"/></svg>
  ```
  ```css
  .ic{width:1.15em;height:1.15em;vertical-align:-.2em;flex:none;display:inline-block;}
  .card-title .ic,.dropdown-item .ic{color:var(--blue);width:18px;height:18px;}
  ```
- Garis `stroke-width:2`, ukuran 16–20px, warna teal.
- **Emoji tidak dipakai di UI** (judul, tombol, menu, toast). Emoji boleh hanya untuk: isi konten (mis. pilihan perasaan 😍😊😐), teks pesan WhatsApp, dan teks prompt AI.
- Tombol yang teksnya diganti JS: taruh ikon **di luar** span teks, atau simpan/pulihkan pakai `innerHTML` (bukan `textContent`) supaya ikon tidak hilang.

Ikon yang sudah dipakai: menu, moon/sun, house, history, info, mail, message-circle, music, smartphone, x, copy, check, wand-sparkles, rotate-ccw, lightbulb, lock, key-round, download, trash-2, file-text, file-pen-line, book-open, notebook-pen, gamepad-2, chart-column, clipboard-check, list-checks, calendar-days.

---

## 5. Header (top bar)

```html
<header>
  <div class="header-inner">
    <div class="header-brand">
      <img src="/guru-cibisd2.png" alt="Logo">
      <div class="header-brand-text"><h1>BGY | Nama Tool <span class="badge-free">FREE</span></h1></div>
    </div>
    <div class="header-right">
      <button id="darkBtn" class="hdr-btn" onclick="toggleDark()" aria-label="Mode gelap/terang">
        <svg class="ic" aria-hidden="true"><use id="darkIcon" href="#i-moon"/></svg></button>
      <button class="hdr-btn" onclick="toggleMenu()" aria-label="Menu"><svg class="ic"><use href="#i-menu"/></svg></button>
      <div class="dropdown-menu" id="dropdownMenu"> … lihat bagian 6 … </div>
    </div>
  </div>
</header>
<div id="menuOverlay" onclick="closeMenu()"></div>
```
```css
header{position:sticky;top:0;z-index:300;background:var(--grad);padding:0 16px;box-shadow:0 2px 10px rgba(0,0,0,.18);}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:60px;}
.header-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1;}
.header-brand img{width:36px;height:36px;border-radius:10px;}
.hdr-btn{height:32px;width:36px;border-radius:8px;border:1.5px solid rgba(255,255,255,.3);
  background:rgba(255,255,255,.1);color:#fff;display:flex;align-items:center;justify-content:center;}
```
- Tinggi **60px**, menempel di atas (sticky), gradient teal.
- Kanan: tombol **mode gelap** lalu **hamburger**, keduanya kotak ber-border tipis ("pelindung").
- Badge `FREE` (abu transparan) / `PRO` (amber) di samping judul bila tool punya versi Pro.

---

## 6. Menu hamburger (dropdown)

Muncul **tepat di bawah header**, lebar 280px, radius 12px.

Urutan isi:
1. **Home**
2. Menu khas tool (mis. **Histori**, **Petunjuk**) — seperlunya
3. **Tentang & Kontak** (satu halaman: info aplikasi di atas, kartu Kontak WhatsApp/TikTok di bawah)
4. garis pemisah
5. `<div data-bgy-menu></div>` → otomatis diisi `bgy-info.js`:
   - **Install BGY** (install PWA; tertulis "Sudah terinstall" bila sudah)
   - **Tools Bantu Guru Yuk lainnya** — maks **4** tools (tool halaman sendiri otomatis disembunyikan)
   - **Semua Tools Bantu Guru Yuk** (satu baris)

```css
.dropdown-menu{position:absolute;top:calc(100% + 8px);right:0;background:var(--card-bg);color:var(--text);
  border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);width:280px;
  max-width:calc(100vw - 24px);max-height:calc(100vh - 90px);overflow-y:auto;display:none;z-index:400;}
.dropdown-menu.open{display:block;}
.dropdown-item{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:.83rem;font-weight:600;}
.dropdown-item.active{color:var(--blue);}
```
Menu tertutup saat: ikon ditekan lagi, ketuk di luar (`#menuOverlay`), atau klik salah satu item.
```js
document.addEventListener('click',e=>{
  if(e.target.closest('#dropdownMenu [data-bgy-menu] a, #dropdownMenu [data-bgy-menu] button'))closeMenu();
});
```

---

## 7. Isi halaman

- Konten di `<main>`, lebar maks 760px (form) atau 1280px (dua kolom).
- **Kartu**: `background:var(--card-bg); border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow); padding:18px;` (HP: `14px 12px`).
- **Judul kartu**: ikon teal + teks tebal + garis bawah tipis.
- **Hint bar** di atas form: langkah singkat `Isi form → Generate → Salin → Paste ke …`
  ```css
  .hint-bar{background:rgba(14,165,160,.08);border:1.5px solid rgba(14,165,160,.25);border-radius:10px;
    padding:10px 14px;font-size:.76rem;}
  ```
- **Input**: border 1.5px, radius 8px, latar `--input-bg`; fokus → border teal + `box-shadow:0 0 0 3px rgba(14,165,160,.12)`.
- **Tombol utama**: gradient, radius 10–12px, lebar penuh, `box-shadow:0 4px 14px rgba(14,165,160,.25)`.
- **Tombol sekunder** (Reset, Batal): latar abu muda + border.
- **Kotak limit/kuota**: latar teal lembut, angka tebal teal; merah bila habis.
- **Label Gratis** di Beranda: `Gratis Full` (hijau) = tanpa batas, `Gratis · Ada Limit` (amber) = ada batas harian. **Angka limit di teks harus sama dengan konstanta di kode** (`DAILY_LIMIT`, `FREE_LIMIT`).

---

## 8. Bar Info (iklan antar-tools)

Semua otomatis dari **`/bgy-info.js`** — cukup pasang di `<head>`:
```html
<script src="/bgy-info.js"></script>
```
- Menempel di **bawah layar** (46px), selalu terlihat. Tidak tampil di Beranda.
- HP: satu kalimat per **6 detik** dengan fade. PC (≥768px): teks berjalan ±50px/detik. Keduanya **berhenti saat disentuh/di-hover**.
- Badge **INFO** + tombol merah **Klik di sini** di tiap kalimat, link ke tool masing-masing (+ `utm_source=bgy-<halaman>&utm_medium=info`, event GA `bgy_info_click`).
- Kalimat maks **2 baris di HP 360px** (±35 huruf). Revisi kalimat di `INFO_ITEMS`, daftar menu di `MENU_ITEMS` (maks 4) — **satu file untuk semua halaman**.
- Posisi khusus: `<div data-bgy-info></div>` (default: di atas `<footer>`). Kalau aplikasi punya navigasi bawah sendiri, beri `data-bgy-info-static` dan atur posisinya sendiri (contoh: Simpan Sandi).

---

## 9. Footer

```html
<footer>
  <div class="footer-title">Nama Tool</div>
  <div class="footer-sub">© 2026 Bantu Guru Yuk by <a href="https://tiktok.com/@pak.choyy">pak.choyy</a> • v26.x.x</div>
</footer>
```
```css
footer{background:var(--grad);color:#fff;text-align:center;padding:14px 20px 12px;margin-top:auto;}
footer .footer-title{font-size:.84rem;font-weight:700;}
footer .footer-sub{font-size:.7rem;color:rgba(255,255,255,.85);}
```

---

## 10. Animasi

- **Muncul saat digulir** (otomatis dari `bgy-info.js`): elemen `.card`, `.page-card`, `.contoh-item`, `.tool-card`, `.settings-group` di bawah layar muncul dengan fade + naik 16px, 0,45 detik, sekali saja.
- **Loading/splash**: latar gradient teal, logo, nama tool, spinner/bar. Maks ±1 detik.
- **Toast**: kapsul gelap `#1f2937`, teks putih, di bawah tengah (otomatis naik di atas bar Info).
- **Hindari**: elemen berdenyut/berpendar terus-menerus, terlalu banyak gradient, animasi saat mengetik.
- Hormati `prefers-reduced-motion` (animasi dimatikan otomatis).

---

## 11. Mode gelap

```js
function toggleDark(){
  document.body.classList.toggle('dark');
  const d=document.body.classList.contains('dark');
  document.getElementById('darkIcon').setAttribute('href',d?'#i-sun':'#i-moon');
  localStorage.setItem('theme',d?'dark':'light');   // kunci bersama semua tools
}
if(localStorage.getItem('theme')==='dark'){document.body.classList.add('dark');/* + ganti ikon */}
```
Semua warna lewat variabel CSS supaya otomatis ikut berganti.

---

## 12. PWA & install

- Tiap tool punya folder sendiri: `/nama-tool/index.html`, `manifest.json`, `sw.js`.
- **manifest**: `name`, `short_name`, `start_url`, `scope` folder tool, `display:"standalone"`, `theme_color:"#0ea5a0"`, ikon 192 & 512 (versi `any` dan `maskable`).
- **Service worker**: HTML **network-first** (update langsung sampai), aset cache-first. **Wajib melewati** `/bgy-info.js`:
  ```js
  if (new URL(e.request.url).pathname === '/bgy-info.js') return;
  ```
- **Banner pengingat install** `#installPopup` (class `show`), muncul 2 detik setelah buka bila belum terinstall, ditutup → muncul lagi setelah 24 jam. Tombol Install cukup memanggil `installApp()` — `bgy-info.js` otomatis mengarahkannya ke dialog install PWA asli.
- Aset versi: tambahkan `?v=N` di CSS/JS dan naikkan nama cache SW setiap rilis besar.
- `_headers`: HTML & `sw.js` `no-cache`; ikon cache panjang.

---

## 13. Checklist aplikasi baru

- [ ] Folder `/nama-tool/` + `index.html`, `manifest.json`, `sw.js`, ikon
- [ ] `<title>Bantu Guru Yuk | Nama Tool</title>`, `theme-color #0ea5a0`
- [ ] `<head>`: `/bgy-info.js` dan (paling akhir) `/fonts/bgy-font.css?v=2`
- [ ] Variabel warna + mode gelap (bagian 2 & 11)
- [ ] Header 60px `BGY | Nama Tool` + tombol gelap + hamburger (bagian 5)
- [ ] Menu: Home, (khas tool), Tentang & Kontak, pemisah, `<div data-bgy-menu></div>` (bagian 6)
- [ ] Kartu + hint bar + label huruf besar + tombol utama gradient (bagian 7)
- [ ] Ikon Lucide, tanpa emoji di UI (bagian 4)
- [ ] Footer gradient dengan kredit pak.choyy (bagian 9)
- [ ] SW melewati `/bgy-info.js`, banner install `#installPopup` (bagian 12)
- [ ] Teks limit = konstanta di kode
- [ ] Daftarkan di **Beranda** (`/index.html`): kartu tool + label Gratis, item sidebar; angka statistik terhitung otomatis
- [ ] Tambahkan ke `INFO_ITEMS` (dan `MENU_ITEMS` bila termasuk 4 tools utama) di `bgy-info.js`
- [ ] Tambahkan ke `sitemap.xml`
- [ ] Panggil `window.bgyAskReview&&bgyAskReview({delay:3000})` setelah pengguna **berhasil** mendapat hasil (unduh/salin/cetak), bukan saat halaman dibuka. Form ulasan, jeda tanya ulang, dan pengiriman sudah diurus `bgy-info.js`; tambahkan nama tool di `TOOL_NAMES` pada `/admin` dan Beranda
- [ ] Tes di HP 360px & 390px, mode gelap, dan offline
- [ ] Fitur AI yang belum siap: bangun lengkap, tapi sembunyikan dengan saklar di kode (contoh: `AI_AKTIF` di Teks Sekolah) supaya tinggal dinyalakan
