/* Bantu Guru Yuk — kontak WhatsApp Pak Choy.
   SATU-SATUNYA tempat nomor WA di seluruh web BGY. Mau ganti nomor? Ubah BGY_WA di bawah, selesai.
   (Format: kode negara tanpa +, tanpa 0 di depan, tanpa spasi/strip. Contoh: 6285600410357)
   Nomor sebelumnya: 6289530713597
   Pemakaian:
   - JavaScript : window.open(bgyWaUrl('teks pesan'))  atau  bgyWaUrl() tanpa pesan.
   - Link HTML  : <a href="https://wa.me/" data-bgy-wa="teks pesan (boleh kosong)">, href diisi otomatis saat halaman dimuat.
   Halaman cukup memuat <script src="/kontak.js"></script>; bgy-info.js memuatnya sendiri kalau belum ada.
   Data di database (mis. Link Bio /k) tersimpan terpisah: ubah lewat /admin → Link Bio. */
(function () {
  'use strict';
  var BGY_WA = '6285600410357';

  window.BGY_WA = BGY_WA;
  window.bgyWaUrl = function (teks) {
    return 'https://wa.me/' + BGY_WA + (teks ? '?text=' + encodeURIComponent(teks) : '');
  };

  // Isi href semua <a data-bgy-wa> (juga yang ditambahkan kemudian lewat bgyWaIsi(wadah)).
  window.bgyWaIsi = function (wadah) {
    var els = (wadah || document).querySelectorAll('a[data-bgy-wa]');
    for (var i = 0; i < els.length; i++) els[i].href = window.bgyWaUrl(els[i].getAttribute('data-bgy-wa'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.bgyWaIsi(); });
  else window.bgyWaIsi();
})();
