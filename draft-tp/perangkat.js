/* Bantu Guru Yuk — Draft TP: ATP, Rincian Minggu Efektif, Prota & Prosem.
   Data disimpan di perangkat (localStorage), dihitung di browser tanpa AI. */
(function () {
  'use strict';

  var LS = 'bgy_perangkat_v1';
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /* ─── util ─── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function mondayOnOrAfter(d) { var x = new Date(d); while (x.getDay() !== 1) x = addDays(x, 1); return x; }
  function tglPanjang(d) { return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
  function num(v, def) { var n = parseInt(v, 10); return isNaN(n) || n < 0 ? def : n; }
  function faseOf(k) { k = +k; return k <= 2 ? 'A' : k <= 4 ? 'B' : k <= 6 ? 'C' : k <= 9 ? 'D' : k === 10 ? 'E' : 'F'; }
  function toast(m) { if (typeof window.toast === 'function') window.toast(m); }
  function track(n, p) { if (typeof window.gtag === 'function') window.gtag('event', n, p || {}); }
  function askReview() { if (window.bgyAskReview) window.bgyAskReview({ delay: 3000 }); }

  /* Perkiraan JP/minggu dari struktur kurikulum SD; guru tetap bisa mengubah. */
  function defaultJP(mapel, kelas) {
    var k = +kelas, m = String(mapel || '').toLowerCase();
    if (k > 6) return 4;
    if (/agama|pai\b|budi pekerti/.test(m)) return 3;
    if (/pancasila/.test(m)) return 4;
    if (/indonesia/.test(m)) return 6;
    if (/matematika/.test(m)) return k === 1 ? 4 : 5;
    if (/ipas/.test(m)) return 5;
    if (/pjok|jasmani/.test(m)) return 3;
    if (/seni|musik|tari|rupa|teater/.test(m)) return 3;
    return 2;
  }
  function defaultTA() { var d = new Date(), y = d.getFullYear(); return d.getMonth() >= 5 ? y + '/' + (y + 1) : (y - 1) + '/' + y; }
  function defaultSem(ta) {
    var y = parseInt(String(ta).split('/')[0], 10) || new Date().getFullYear();
    return {
      1: { mulai: iso(mondayOnOrAfter(new Date(y, 6, 13))), selesai: iso(new Date(y, 11, 19)), libur: [], tp: [] },
      2: { mulai: iso(mondayOnOrAfter(new Date(y + 1, 0, 5))), selesai: iso(new Date(y + 1, 5, 19)), libur: [], tp: [] }
    };
  }
  function identitasAwal() {
    var t = {};
    try { t = JSON.parse(localStorage.getItem('bgy_teks_identitas') || '{}') || {}; } catch (e) {}
    return { sekolah: t.sekolah || '', guru: '', nipGuru: '', kepsek: t.kepsek || '', nipKepsek: t.nipKepsek || '', kota: t.kota || '' };
  }

  /* ─── state ─── */
  var P;
  function fresh() {
    var ta = defaultTA();
    return { idt: identitasAwal(), ta: ta, mapel: '', kelas: '2', jp: 4, sem: defaultSem(ta), tab: 'atp', doc: 'semua' };
  }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(LS) || 'null');
      if (v && v.sem && v.sem[1] && v.sem[2]) { P = Object.assign(fresh(), v); return; }
    } catch (e) {}
    P = fresh();
  }
  var saveT;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(LS, JSON.stringify(P)); } catch (e) {} }, 250); }

  /* ─── minggu efektif ─── */
  function weeks(s) {
    var a = parse(s.mulai), b = parse(s.selesai), out = [];
    if (!a || !b || b < a) return out;
    var ws = addDays(a, -((a.getDay() + 6) % 7));
    var guard = 0;
    while (ws <= b && guard++ < 60) {
      var days = [];
      for (var i = 0; i < 5; i++) { var d = addDays(ws, i); if (d >= a && d <= b) days.push(d); }
      if (days.length) {
        var off = 0, ket = '';
        days.forEach(function (d) {
          var L = (s.libur || []).find(function (l) {
            var x = parse(l.mulai), y = parse(l.selesai) || x;
            return x && d >= x && d <= y;
          });
          if (L) { off++; if (!ket) ket = L.ket || 'Tidak efektif'; }
        });
        var ref = days[Math.floor(days.length / 2)];
        out.push({ start: ws, month: ref.getMonth(), year: ref.getFullYear(), efektif: off * 2 <= days.length, ket: ket });
      }
      ws = addDays(ws, 7);
    }
    var prev = '', n = 0;
    out.forEach(function (w) { var k = w.year + '-' + w.month; if (k !== prev) { n = 0; prev = k; } w.no = ++n; });
    return out;
  }
  function months(ws) {
    var list = [];
    ws.forEach(function (w, i) {
      var last = list[list.length - 1];
      if (!last || last.month !== w.month || last.year !== w.year) { last = { month: w.month, year: w.year, weeks: [] }; list.push(last); }
      last.weeks.push(i);
    });
    return list;
  }
  function info(k) {
    var s = P.sem[k], ws = weeks(s);
    var ef = ws.filter(function (w) { return w.efektif; }).length;
    var jpTotal = s.tp.reduce(function (a, t) { return a + num(t.jp, 0); }, 0);
    return { ws: ws, efektif: ef, tersedia: ef * num(P.jp, 0), jpTotal: jpTotal };
  }
  function allocate(k) {
    var inf = info(k), cap = num(P.jp, 0), cells = [], w = 0, left = cap, over = 0;
    var eff = inf.ws.map(function (x, i) { return x.efektif ? i : -1; }).filter(function (i) { return i >= 0; });
    P.sem[k].tp.forEach(function (t, ti) {
      cells[ti] = {};
      var rem = num(t.jp, 0);
      while (rem > 0 && w < eff.length && cap > 0) {
        var take = Math.min(rem, left);
        cells[ti][eff[w]] = (cells[ti][eff[w]] || 0) + take;
        rem -= take; left -= take;
        if (left === 0) { w++; left = cap; }
      }
      over += rem;
    });
    return { inf: inf, cells: cells, over: over };
  }
  function bagiRata(k) {
    var s = P.sem[k], inf = info(k);
    if (!s.tp.length) { toast('Belum ada TP di semester ' + k + '.'); return; }
    if (!inf.tersedia) { toast('Isi tanggal semester & JP/minggu dulu.'); return; }
    var base = Math.floor(inf.tersedia / s.tp.length), sisa = inf.tersedia % s.tp.length;
    s.tp.forEach(function (t, i) { t.jp = base + (i < sisa ? 1 : 0); });
    save(); render();
    toast('JP semester ' + k + ' dibagi rata: ' + inf.tersedia + ' JP.');
  }

  /* ─── ambil TP ─── */
  function fromBank(scroll) {
    var bank = typeof BANK !== 'undefined' ? BANK : null;
    var cp = document.getElementById('jenisCp').value;
    var kelas = document.getElementById('kelas').value;
    var sel = document.getElementById('mapelSelect').value;
    var mapel = sel === '__manual__' ? document.getElementById('manualMapelInput').value.trim() : sel;
    if (!mapel || sel === '__empty__') { toast('Pilih mapel di form atas dulu.'); return; }
    if (P.sem[1].tp.length + P.sem[2].tp.length && !confirm('Ganti daftar TP yang sudah ada dengan TP ' + mapel + ' kelas ' + kelas + '?')) return;
    var jp = defaultJP(mapel, kelas);
    [1, 2].forEach(function (k) {
      var list = (bank && bank[cp] && bank[cp][kelas] && bank[cp][kelas][k] && bank[cp][kelas][k][mapel]) || [];
      P.sem[k].tp = list.map(function (t) { return { t: t, jp: 0 }; });
    });
    P.mapel = mapel; P.kelas = kelas; P.jp = jp; P.tab = 'atp';
    [1, 2].forEach(function (k) { if (P.sem[k].tp.length) bagiRataDiam(k); });
    save(); render();
    var n = P.sem[1].tp.length + P.sem[2].tp.length;
    toast(n ? n + ' TP dimuat. Cek & sesuaikan JP-nya.' : 'TP mapel ini belum ada di bank. Tempel TP sendiri ya.');
    track('perangkat_dari_bank', { mapel: mapel, kelas: kelas });
    if (scroll) document.getElementById('perangkat').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function bagiRataDiam(k) {
    var s = P.sem[k], inf = info(k);
    if (!s.tp.length || !inf.tersedia) return;
    var base = Math.floor(inf.tersedia / s.tp.length), sisa = inf.tersedia % s.tp.length;
    s.tp.forEach(function (t, i) { t.jp = base + (i < sisa ? 1 : 0); });
  }
  var MAXTP = 100;
  var RINGKAS = [
    [/\s*dalam kehidupan sehari-hari\b/gi, ''], [/\bsesuai dengan\b/gi, 'sesuai'], [/\bdi lingkungan sekitar(nya)?\b/gi, 'di sekitar'],
    [/\b(baik )?secara lisan maupun (tulisan|tertulis)\b/gi, 'lisan dan tulis'], [/\bdengan baik dan benar\b/gi, 'dengan benar'],
    [/\byang (ada|terdapat) (di|pada|dalam)\b/gi, '$2'], [/\bmelalui kegiatan\b/gi, 'melalui'], [/\bdengan menggunakan\b/gi, 'dengan'],
    [/\bberdasarkan\b/gi, 'sesuai'], [/\bdengan memperhatikan (penggunaan )?/gi, 'memakai '], [/\bmengidentifikasi\b/gi, 'mengenali'], [/\bmendeskripsikan\b/gi, 'menjelaskan'],
    [/\bmendemonstrasikan\b/gi, 'memperagakan'], [/\bmengimplementasikan\b/gi, 'menerapkan'], [/\bmenginterpretasikan\b/gi, 'menafsirkan'],
    [/\bberbagai macam\b/gi, 'beragam'], [/\bsecara (sederhana|tepat|baik|benar|runtut|mandiri)\b/gi, ''], [/\bdengan (baik|tepat|benar)\b/gi, '']
  ];
  function padatkan(t) {
    var s = String(t || '').replace(/\s+/g, ' ').trim();
    var rapi = function (x) { x = x.replace(/\s+([,.;])/g, '$1').replace(/\s{2,}/g, ' ').replace(/[\s,;:]+$/, '').trim(); return x.charAt(0).toUpperCase() + x.slice(1); };
    s = rapi(s.replace(/^(peserta didik|murid|siswa|anak)\s+(diharapkan\s+)?(dapat|mampu|bisa)\s+/i, '').replace(/\.$/, ''));
    if (s.length <= MAXTP) return s;
    for (var i = 0; i < RINGKAS.length && s.length > MAXTP; i++) s = rapi(s.replace(RINGKAS[i][0], RINGKAS[i][1]));
    for (var j = 0; j < 8 && s.length > MAXTP; j++) {
      var u = s.replace(/\b([A-Za-z-]+) ([A-Za-z-]+)((?:, [A-Za-z-]+)*)(,?)( dan| atau)? \1 /i, '$1 $2$3$4$5 ');
      if (u === s) break; s = rapi(u);
    }
    if (s.length > MAXTP) s = rapi(s.replace(/\s*\([^)]*\)/g, ''));
    var anak = /\s(sehingga|agar|supaya|untuk|melalui|dengan cara|yang)\s/gi, m, pot = -1;
    while (s.length > MAXTP) {
      pot = -1; anak.lastIndex = 0;
      while ((m = anak.exec(s))) if (m.index >= 30) pot = m.index;
      if (pot < 0) break;
      s = rapi(s.slice(0, pot));
    }
    if (s.length > MAXTP) s = rapi(s.slice(0, MAXTP + 1).replace(/\s+\S*$/, '').replace(/(\s+(dan|atau|serta|yang|di|ke|dari|pada|dengan|sesuai|untuk|secara))+$/i, ''));
    return s;
  }
  function ccHtml(t) { var n = String(t || '').length; return '<span class="pk-cc' + (n > MAXTP ? ' bad' : '') + '">' + n + '/' + MAXTP + '</span>'; }
  function tempel() {
    var k = document.getElementById('pkPasteSem').value;
    var mode = document.getElementById('pkPasteMode').value;
    var lines = document.getElementById('pkPasteTxt').value.split('\n')
      .map(function (l) { return l.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim(); })
      .filter(Boolean);
    if (!lines.length) { toast('Tempel minimal satu TP.'); return; }
    var dipadat = 0;
    var rows = lines.map(function (t) { var p = padatkan(t); if (p !== t.replace(/\s+/g, ' ').trim() && t.length > MAXTP) dipadat++; return { t: p, jp: 0 }; });
    P.sem[k].tp = mode === 'ganti' ? rows : P.sem[k].tp.concat(rows);
    bagiRataDiam(k);
    document.getElementById('pkPasteTxt').value = '';
    document.getElementById('pkPaste').hidden = true;
    save(); render();
    toast(dipadat ? dipadat + ' TP dipadatkan jadi ≤ ' + MAXTP + ' karakter. Cek lagi ya.' : rows.length + ' TP ditambahkan ke semester ' + k + '.');
  }

  /* ─── dokumen (pratinjau, cetak, Word) ─── */
  function idtRows(extra) {
    var r = [
      ['Satuan Pendidikan', P.idt.sekolah || '…'],
      ['Mata Pelajaran', P.mapel || '…'],
      ['Fase / Kelas', faseOf(P.kelas) + ' / ' + P.kelas],
      ['Tahun Ajaran', P.ta || '…']
    ].concat(extra || []);
    return '<table class="pk-idt">' + r.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td>:</td><td>' + esc(x[1]) + '</td></tr>'; }).join('') + '</table>';
  }
  function ttd() {
    var I = P.idt;
    return '<table class="pk-ttd"><tr><td>Mengetahui,<br>Kepala Sekolah<div class="pk-nm">' + esc(I.kepsek || '……………………') + '</div>' +
      (I.nipKepsek ? 'NIP. ' + esc(I.nipKepsek) : '') + '</td><td>' + esc(I.kota || '……………') + ', ' + tglPanjang(new Date()) +
      '<br>Guru Kelas/Mata Pelajaran<div class="pk-nm">' + esc(I.guru || '……………………') + '</div>' + (I.nipGuru ? 'NIP. ' + esc(I.nipGuru) : '') + '</td></tr></table>';
  }
  function docATP() {
    var h = '<div class="pk-doc"><div class="pk-title">ALUR TUJUAN PEMBELAJARAN (ATP)</div>' + idtRows() +
      '<table class="pk-tbl"><thead><tr><th style="width:36px">No</th><th>Tujuan Pembelajaran</th><th style="width:80px">Semester</th><th style="width:80px">Alokasi (JP)</th></tr></thead><tbody>';
    var no = 0, total = 0;
    [1, 2].forEach(function (k) {
      var sub = 0;
      P.sem[k].tp.forEach(function (t) { no++; sub += num(t.jp, 0); h += '<tr><td class="c">' + no + '</td><td>' + esc(t.t) + '</td><td class="c">' + k + '</td><td class="c">' + num(t.jp, 0) + '</td></tr>'; });
      if (P.sem[k].tp.length) h += '<tr class="pk-sub"><td></td><td>Jumlah Semester ' + k + '</td><td></td><td class="c">' + sub + '</td></tr>';
      total += sub;
    });
    if (!no) h += '<tr><td colspan="4" class="c">Belum ada TP.</td></tr>';
    return h + '<tr class="pk-sub"><td></td><td>Jumlah 1 Tahun</td><td></td><td class="c">' + total + '</td></tr></tbody></table>' + ttd() + '</div>';
  }
  function docEfektif() {
    var h = '<div class="pk-doc"><div class="pk-title">RINCIAN MINGGU EFEKTIF</div>' + idtRows();
    [1, 2].forEach(function (k) {
      var inf = info(k), ms = months(inf.ws);
      h += '<div class="pk-subtitle">Semester ' + k + '</div><table class="pk-tbl"><thead><tr><th style="width:36px">No</th><th>Bulan</th><th>Jumlah Minggu</th><th>Minggu Tidak Efektif</th><th>Minggu Efektif</th><th>Keterangan</th></tr></thead><tbody>';
      var tM = 0, tO = 0;
      ms.forEach(function (m, i) {
        var list = m.weeks.map(function (x) { return inf.ws[x]; });
        var off = list.filter(function (w) { return !w.efektif; });
        tM += list.length; tO += off.length;
        var ket = off.map(function (w) { return 'Mg ' + w.no + ': ' + w.ket; }).join('; ');
        h += '<tr><td class="c">' + (i + 1) + '</td><td>' + BULAN[m.month] + ' ' + m.year + '</td><td class="c">' + list.length + '</td><td class="c">' + off.length + '</td><td class="c">' + (list.length - off.length) + '</td><td>' + esc(ket) + '</td></tr>';
      });
      if (!ms.length) h += '<tr><td colspan="6" class="c">Isi tanggal mulai & selesai semester.</td></tr>';
      h += '<tr class="pk-sub"><td></td><td>Jumlah</td><td class="c">' + tM + '</td><td class="c">' + tO + '</td><td class="c">' + (tM - tO) + '</td><td></td></tr></tbody></table>' +
        '<p class="pk-calc">Jumlah jam pelajaran efektif = ' + inf.efektif + ' minggu × ' + num(P.jp, 0) + ' JP = <b>' + inf.tersedia + ' JP</b></p>';
    });
    return h + ttd() + '</div>';
  }
  function docProta() {
    var h = '<div class="pk-doc"><div class="pk-title">PROGRAM TAHUNAN (PROTA)</div>' + idtRows() +
      '<table class="pk-tbl"><thead><tr><th style="width:80px">Semester</th><th style="width:36px">No</th><th>Tujuan Pembelajaran</th><th style="width:80px">Alokasi (JP)</th></tr></thead><tbody>';
    var total = 0;
    [1, 2].forEach(function (k) {
      var tp = P.sem[k].tp, sub = 0;
      tp.forEach(function (t, i) {
        sub += num(t.jp, 0);
        h += '<tr>' + (i === 0 ? '<td class="c" rowspan="' + tp.length + '">' + k + '</td>' : '') + '<td class="c">' + (i + 1) + '</td><td>' + esc(t.t) + '</td><td class="c">' + num(t.jp, 0) + '</td></tr>';
      });
      if (tp.length) h += '<tr class="pk-sub"><td></td><td></td><td>Jumlah Semester ' + k + ' (tersedia ' + info(k).tersedia + ' JP)</td><td class="c">' + sub + '</td></tr>';
      total += sub;
    });
    return h + '<tr class="pk-sub"><td></td><td></td><td>Jumlah 1 Tahun</td><td class="c">' + total + '</td></tr></tbody></table>' + ttd() + '</div>';
  }
  function docProsem(k) {
    var A = allocate(k), ws = A.inf.ws, ms = months(ws), tp = P.sem[k].tp;
    var h = '<div class="pk-doc pk-land"><div class="pk-title">PROGRAM SEMESTER (PROSEM) — SEMESTER ' + k + '</div>' +
      idtRows([['Semester', String(k)], ['JP per Minggu', String(num(P.jp, 0))]]) + '<div class="pk-scroll"><table class="pk-tbl pk-grid"><thead><tr>' +
      '<th rowspan="2" style="width:30px">No</th><th rowspan="2" class="pk-tpcol">Tujuan Pembelajaran</th><th rowspan="2" style="width:36px">JP</th>' +
      ms.map(function (m) { return '<th colspan="' + m.weeks.length + '">' + BLN3[m.month] + ' ' + String(m.year).slice(2) + '</th>'; }).join('') +
      '</tr><tr>' + ws.map(function (w) { return '<th class="' + (w.efektif ? '' : 'off') + '">' + w.no + '</th>'; }).join('') + '</tr></thead><tbody>';
    tp.forEach(function (t, ti) {
      h += '<tr><td class="c">' + (ti + 1) + '</td><td>' + esc(t.t) + '</td><td class="c">' + num(t.jp, 0) + '</td>' +
        ws.map(function (w, wi) { var v = A.cells[ti] && A.cells[ti][wi]; return '<td class="c' + (w.efektif ? (v ? ' on' : '') : ' off') + '">' + (v || '') + '</td>'; }).join('') + '</tr>';
    });
    if (!tp.length) h += '<tr><td colspan="' + (3 + ws.length) + '" class="c">Belum ada TP semester ' + k + '.</td></tr>';
    h += '<tr class="pk-ket"><td></td><td>Keterangan minggu tidak efektif</td><td></td>' + ws.map(function (w) { return '<td class="' + (w.efektif ? '' : 'off') + '"><span>' + esc(w.efektif ? '' : w.ket) + '</span></td>'; }).join('') + '</tr>';
    h += '</tbody></table></div><p class="pk-calc">Minggu efektif: <b>' + A.inf.efektif + '</b> · JP tersedia: <b>' + A.inf.tersedia + '</b> · JP direncanakan: <b>' + A.inf.jpTotal + '</b>' +
      (A.over ? ' · <span class="pk-warn">' + A.over + ' JP tidak muat, kurangi JP atau tambah minggu efektif.</span>' : '') + '</p>';
    return h + ttd() + '</div>';
  }
  function docs(which) {
    var map = { atp: docATP, efektif: docEfektif, prota: docProta, prosem1: function () { return docProsem(1); }, prosem2: function () { return docProsem(2); } };
    if (which === 'semua') return ['atp', 'efektif', 'prota', 'prosem1', 'prosem2'].map(function (k) { return map[k](); });
    if (which === 'prosem') return [map.prosem1(), map.prosem2()];
    return [map[which]()];
  }

  /* ─── Excel ─── */
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function idtAoa() { return [['Satuan Pendidikan', P.idt.sekolah], ['Mata Pelajaran', P.mapel], ['Fase / Kelas', faseOf(P.kelas) + ' / ' + P.kelas], ['Tahun Ajaran', P.ta], []]; }
  function unduhExcel() {
    loadXlsx().then(function () {
      var X = window.XLSX, wb = X.utils.book_new();
      var atp = [['ALUR TUJUAN PEMBELAJARAN (ATP)'], []].concat(idtAoa(), [['No', 'Tujuan Pembelajaran', 'Semester', 'Alokasi (JP)']]);
      var no = 0;
      [1, 2].forEach(function (k) { P.sem[k].tp.forEach(function (t) { atp.push([++no, t.t, k, num(t.jp, 0)]); }); });
      var s1 = X.utils.aoa_to_sheet(atp); s1['!cols'] = [{ wch: 5 }, { wch: 70 }, { wch: 10 }, { wch: 12 }];
      X.utils.book_append_sheet(wb, s1, 'ATP');
      var ef = [['RINCIAN MINGGU EFEKTIF'], []].concat(idtAoa());
      [1, 2].forEach(function (k) {
        var inf = info(k);
        ef.push(['Semester ' + k], ['Bulan', 'Jumlah Minggu', 'Tidak Efektif', 'Efektif', 'Keterangan']);
        months(inf.ws).forEach(function (m) {
          var list = m.weeks.map(function (x) { return inf.ws[x]; }), off = list.filter(function (w) { return !w.efektif; });
          ef.push([BULAN[m.month] + ' ' + m.year, list.length, off.length, list.length - off.length, off.map(function (w) { return 'Mg ' + w.no + ': ' + w.ket; }).join('; ')]);
        });
        ef.push(['JP efektif', inf.efektif + ' minggu x ' + num(P.jp, 0) + ' JP', '', inf.tersedia], []);
      });
      var s2 = X.utils.aoa_to_sheet(ef); s2['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 13 }, { wch: 10 }, { wch: 50 }];
      X.utils.book_append_sheet(wb, s2, 'Minggu Efektif');
      var pr = [['PROGRAM TAHUNAN (PROTA)'], []].concat(idtAoa(), [['Semester', 'No', 'Tujuan Pembelajaran', 'Alokasi (JP)']]);
      [1, 2].forEach(function (k) { P.sem[k].tp.forEach(function (t, i) { pr.push([k, i + 1, t.t, num(t.jp, 0)]); }); });
      var s3 = X.utils.aoa_to_sheet(pr); s3['!cols'] = [{ wch: 10 }, { wch: 5 }, { wch: 70 }, { wch: 12 }];
      X.utils.book_append_sheet(wb, s3, 'Prota');
      [1, 2].forEach(function (k) {
        var A = allocate(k), ws = A.inf.ws, ms = months(ws);
        var head1 = ['No', 'Tujuan Pembelajaran', 'JP'], head2 = ['', '', ''], merges = [];
        var col = 3, top = 7;
        ms.forEach(function (m) {
          head1.push(BULAN[m.month] + ' ' + m.year); for (var i = 1; i < m.weeks.length; i++) head1.push('');
          if (m.weeks.length > 1) merges.push({ s: { r: top, c: col }, e: { r: top, c: col + m.weeks.length - 1 } });
          col += m.weeks.length;
        });
        ws.forEach(function (w) { head2.push(w.no); });
        var rows = [['PROGRAM SEMESTER (PROSEM) - SEMESTER ' + k], []].concat(idtAoa().slice(0, 4), [['JP per Minggu', num(P.jp, 0)]], [head1, head2]);
        P.sem[k].tp.forEach(function (t, ti) {
          rows.push([ti + 1, t.t, num(t.jp, 0)].concat(ws.map(function (w, wi) { return w.efektif ? ((A.cells[ti] && A.cells[ti][wi]) || '') : '-'; })));
        });
        rows.push(['', 'Keterangan', ''].concat(ws.map(function (w) { return w.efektif ? '' : w.ket; })));
        var sh = X.utils.aoa_to_sheet(rows); sh['!merges'] = merges;
        sh['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 5 }].concat(ws.map(function () { return { wch: 4 }; }));
        X.utils.book_append_sheet(wb, sh, 'Prosem ' + k);
      });
      X.writeFile(wb, 'Perangkat-' + (P.mapel || 'Mapel').replace(/[^a-z0-9]+/gi, '-') + '-Kelas-' + P.kelas + '.xlsx');
      toast('File Excel diunduh.'); track('perangkat_excel'); askReview();
    }).catch(function () { toast('Gagal memuat Excel. Cek internet lalu coba lagi.'); });
  }

  /* ─── Word & cetak ─── */
  var DOC_CSS = '.pk-title{text-align:center;font-weight:bold;font-size:13pt;margin-bottom:8pt;}.pk-subtitle{font-weight:bold;margin:10pt 0 4pt;}' +
    '.pk-idt td{padding:0 6pt 0 0;font-size:11pt;}.pk-tbl{border-collapse:collapse;width:100%;margin-top:8pt;}' +
    '.pk-tbl th,.pk-tbl td{border:1px solid #000;padding:3pt 4pt;font-size:10pt;vertical-align:top;}.pk-tbl th{background:#d9f2f0;text-align:center;}' +
    '.c{text-align:center;}.pk-sub td{font-weight:bold;}.off{background:#e5e7eb;}.on{background:#ccfbf1;font-weight:bold;}.pk-calc{font-size:10pt;margin-top:6pt;}' +
    '.pk-ttd{width:100%;margin-top:18pt;}.pk-ttd td{width:50%;vertical-align:top;font-size:11pt;border:none;}.pk-nm{margin-top:48pt;font-weight:bold;text-decoration:underline;}.pk-warn{color:#b91c1c;}';
  function unduhWord() {
    var list = docs(P.doc), body = '';
    list.forEach(function (d, i) {
      var land = d.indexOf('pk-land') > -1;
      body += (i ? '<br clear=all style="page-break-before:always">' : '') + '<div class="' + (land ? 'Section2' : 'Section1') + '">' + d + '</div>';
    });
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Perangkat</title><style>' +
      '@page Section1{size:21cm 29.7cm;margin:1.5cm;}div.Section1{page:Section1;}@page Section2{size:29.7cm 21cm;mso-page-orientation:landscape;margin:1.2cm;}div.Section2{page:Section2;}' +
      'body{font-family:"Times New Roman",serif;}' + DOC_CSS + '.pk-ket span{font-size:7pt;}</style></head><body>' + body + '</body></html>';
    var blob = new Blob(['﻿', html], { type: 'application/msword' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = ({ atp: 'ATP', efektif: 'Minggu-Efektif', prota: 'Prota', prosem: 'Prosem', semua: 'Perangkat' }[P.doc] || 'Perangkat') + '-' + (P.mapel || 'Mapel').replace(/[^a-z0-9]+/gi, '-') + '-Kelas-' + P.kelas + '.doc';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('File Word diunduh.'); track('perangkat_word', { doc: P.doc }); askReview();
  }
  function siapCetak() { document.getElementById('pkPrint').innerHTML = docs(P.doc).join(''); }
  function cetak() {
    siapCetak();
    document.documentElement.classList.add('pk-printing');
    track('perangkat_cetak', { doc: P.doc });
    setTimeout(function () { window.print(); }, 50);
    askReview();
  }

  /* ─── tampilan ─── */
  var CSS = [
    '#perangkat{margin-top:16px;}',
    '#perangkat input[type=number],#perangkat input[type=date]{width:100%;padding:9px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:.84rem;color:var(--text);background:var(--input-bg);outline:none;font-family:inherit;min-height:38px;}',
    '#perangkat input[type=number]:focus,#perangkat input[type=date]:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(14,165,160,.12);}',
    '.pk-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}',
    '.pk-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:14px;-webkit-overflow-scrolling:touch;}',
    '.pk-tab{flex:none;padding:9px 13px;border-radius:10px;border:1.5px solid var(--border);background:var(--input-bg);color:var(--text);font-weight:700;font-size:.78rem;cursor:pointer;font-family:inherit;}',
    '.pk-tab.active{border-color:var(--blue);background:rgba(14,165,160,.1);color:var(--blue-dark);}',
    'body.dark .pk-tab.active{color:#5eead4;}',
    '.pk-grid3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;}',
    '@media(max-width:560px){.pk-grid3{grid-template-columns:1fr 1fr;}.pk-grid3>:first-child{grid-column:1/-1;}}',
    '.pk-sem{border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:12px;}',
    '.pk-sem-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;font-weight:800;font-size:.84rem;}',
    '.pk-sum{font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:99px;background:rgba(14,165,160,.1);color:var(--blue-dark);}',
    '.pk-sum.bad{background:#fee2e2;color:#b91c1c;}',
    'body.dark .pk-sum{color:#5eead4;}body.dark .pk-sum.bad{background:rgba(220,38,38,.18);color:#fca5a5;}',
    '.pk-row{display:grid;grid-template-columns:24px 1fr 58px auto;gap:6px;align-items:start;margin-bottom:6px;}',
    '.pk-row .n{font-size:.72rem;font-weight:800;color:var(--blue-dark);padding-top:10px;text-align:center;}',
    '.pk-row textarea{min-height:40px;font-size:.8rem;padding:7px 9px;line-height:1.4;}',
    '.pk-row input{text-align:center;padding:8px 4px;}',
    '.pk-tw{display:flex;flex-direction:column;min-width:0;}',
    '.pk-cc{align-self:flex-end;font-size:.62rem;font-weight:700;color:var(--text-light);margin-top:2px;}',
    '.pk-cc.bad{color:#dc2626;}body.dark .pk-cc.bad{color:#fca5a5;}',
    '.pk-act{display:flex;gap:3px;}',
    '.pk-ib{width:30px;height:36px;border:1.5px solid var(--border);border-radius:7px;background:var(--card-bg);color:var(--text-light);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-family:inherit;}',
    '.pk-ib:hover{border-color:var(--blue);color:var(--blue);}.pk-ib.del:hover{border-color:#dc2626;color:#dc2626;}',
    '@media(max-width:480px){.pk-row{grid-template-columns:20px 1fr 52px;}.pk-act{grid-column:2/-1;justify-content:flex-end;}}',
    '.pk-btns{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;}',
    '.pk-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:8px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--card-bg);color:var(--text);font-weight:700;font-size:.76rem;cursor:pointer;font-family:inherit;}',
    '.pk-btn:hover{border-color:var(--blue);color:var(--blue);}',
    '.pk-btn.pri{background:var(--grad);color:#fff;border-color:transparent;}',
    '.pk-btn.pri:hover{color:#fff;opacity:.9;}',
    '.pk-hint{font-size:.7rem;color:var(--text-light);line-height:1.5;margin-top:6px;}',
    '.pk-lib{display:grid;grid-template-columns:1fr 1fr 1.4fr 30px;gap:6px;margin-bottom:6px;align-items:center;}',
    '@media(max-width:560px){.pk-lib{grid-template-columns:1fr 1fr 30px;}.pk-lib .ket{grid-column:1/3;grid-row:2;}}',
    '.pk-lib input{padding:7px 8px;font-size:.8rem;}',
    'input[type=date].pk-d{color-scheme:light;}body.dark input[type=date].pk-d{color-scheme:dark;}',
    '.pk-preview{background:#fff;color:#000;border:1px solid var(--border);border-radius:8px;padding:16px;overflow-x:auto;font-family:"Times New Roman",serif;}',
    '.pk-preview .pk-doc+.pk-doc{margin-top:24px;padding-top:18px;border-top:2px dashed #cbd5e1;}',
    '.pk-title{text-align:center;font-weight:bold;font-size:1.02rem;margin-bottom:8px;}',
    '.pk-subtitle{font-weight:bold;margin:12px 0 4px;}',
    '.pk-idt{border-collapse:collapse;font-size:.85rem;}.pk-idt td{padding:0 8px 1px 0;}',
    '.pk-tbl{border-collapse:collapse;width:100%;margin-top:8px;font-size:.8rem;}',
    '.pk-tbl th,.pk-tbl td{border:1px solid #334155;padding:4px 5px;vertical-align:top;}',
    '.pk-tbl th{background:#d9f2f0;text-align:center;}',
    '.pk-tbl .c{text-align:center;}.pk-sub td{font-weight:bold;}',
    '.pk-grid td.off,.pk-grid th.off{background:#e5e7eb;}.pk-grid td.on{background:#ccfbf1;font-weight:bold;}',
    '.pk-grid th,.pk-grid td{min-width:22px;}.pk-tpcol{min-width:200px;}',
    '.pk-ket td span{display:block;writing-mode:vertical-rl;transform:rotate(180deg);font-size:.62rem;max-height:110px;margin:0 auto;}',
    '.pk-scroll{overflow-x:auto;}',
    '.pk-calc{font-size:.8rem;margin-top:6px;}.pk-warn{color:#b91c1c;font-weight:bold;}',
    '.pk-ttd{width:100%;margin-top:20px;font-size:.85rem;}.pk-ttd td{width:50%;vertical-align:top;}',
    '.pk-nm{margin-top:52px;font-weight:bold;text-decoration:underline;}',
    '.pk-out{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--border);}',
    '.pk-out select{width:auto;flex:1;min-width:150px;}',
    '#pkPrint{display:none;}',
    '@media print{',
    '@page{size:A4;margin:1.5cm;}@page land{size:A4 landscape;margin:1.2cm;}',
    'html.pk-printing,html.pk-printing body{background:#fff!important;padding:0!important;margin:0!important;display:block!important;}',
    'html.pk-printing body>*:not(#pkPrint){display:none!important;}',
    'html.pk-printing #pkPrint{display:block!important;color:#000;font-family:"Times New Roman",serif;}',
    '#pkPrint .pk-doc+.pk-doc{break-before:page;}',
    '#pkPrint .pk-land{page:land;}',
    '#pkPrint .pk-scroll{overflow:visible;}',
    '#pkPrint .pk-tbl{font-size:9.5pt;}#pkPrint .pk-grid{font-size:8pt;}#pkPrint .pk-tpcol{min-width:0;width:30%;}',
    '#pkPrint .pk-tbl th,#pkPrint .pk-tbl td{-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
    '#pkPrint tr,#pkPrint .pk-ttd{break-inside:avoid;}',
    '}'
  ].join('');

  function field(label, html) { return '<div class="form-group"><label>' + label + '</label>' + html + '</div>'; }
  function inp(id, val, ph, type) { return '<input type="' + (type || 'text') + '" id="' + id + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' autocomplete="off"/>'; }

  function tabATP() {
    var kelasOpt = '';
    for (var i = 1; i <= 12; i++) kelasOpt += '<option value="' + i + '"' + (String(P.kelas) === String(i) ? ' selected' : '') + '>Kelas ' + i + '</option>';
    var h = '<div class="pk-grid3">' +
      field('Mata Pelajaran', inp('pkMapel', P.mapel, 'mis. Matematika')) +
      field('Kelas', '<select id="pkKelas">' + kelasOpt + '</select>') +
      field('JP / Minggu', inp('pkJp', P.jp, '', 'number')) + '</div>' +
      '<div class="pk-btns"><button type="button" class="pk-btn pri" data-a="bank">Ambil TP dari bank (Sem 1 & 2)</button>' +
      '<button type="button" class="pk-btn" data-a="paste">Tempel TP sendiri</button></div>' +
      '<div class="pk-hint">Tiap TP maksimal 100 karakter (e-Rapor). TP yang lebih panjang otomatis dipadatkan, intinya tetap. "Ambil dari bank" memakai Jenis CP, Kelas &amp; Mapel di form atas. JP/minggu terisi perkiraan struktur kurikulum; sesuaikan dengan sekolahmu.</div>' +
      '<div id="pkPaste" class="pk-sem" hidden><div class="pk-sem-h">Tempel TP (satu baris satu TP)</div>' +
      '<textarea id="pkPasteTxt" rows="5" placeholder="Peserta didik dapat ...&#10;Peserta didik dapat ..."></textarea>' +
      '<div class="pk-btns"><select id="pkPasteSem" style="width:auto"><option value="1">Semester 1</option><option value="2">Semester 2</option></select>' +
      '<select id="pkPasteMode" style="width:auto"><option value="tambah">Tambahkan</option><option value="ganti">Ganti semua</option></select>' +
      '<button type="button" class="pk-btn pri" data-a="pasteOk">Masukkan</button><button type="button" class="pk-btn" data-a="pasteX">Batal</button></div></div>';
    [1, 2].forEach(function (k) {
      var inf = info(k), bad = inf.tersedia && inf.jpTotal > inf.tersedia;
      h += '<div class="pk-sem"><div class="pk-sem-h">Semester ' + k +
        ' <span class="pk-sum' + (bad ? ' bad' : '') + '" id="pkSum' + k + '">' + inf.jpTotal + ' / ' + inf.tersedia + ' JP</span>' +
        '<button type="button" class="pk-btn" data-a="rata" data-k="' + k + '" style="margin-left:auto">Bagi JP rata</button></div>';
      P.sem[k].tp.forEach(function (t, i) {
        h += '<div class="pk-row"><span class="n">' + (i + 1) + '</span><div class="pk-tw"><textarea rows="2" data-k="' + k + '" data-i="' + i + '" data-f="t">' + esc(t.t) + '</textarea>' + ccHtml(t.t) + '</div>' +
          '<input type="number" min="0" max="200" value="' + num(t.jp, 0) + '" data-k="' + k + '" data-i="' + i + '" data-f="jp" aria-label="JP"/>' +
          '<span class="pk-act"><button type="button" class="pk-ib" data-a="up" data-k="' + k + '" data-i="' + i + '" aria-label="Naik">&#8593;</button>' +
          '<button type="button" class="pk-ib" data-a="down" data-k="' + k + '" data-i="' + i + '" aria-label="Turun">&#8595;</button>' +
          '<button type="button" class="pk-ib del" data-a="del" data-k="' + k + '" data-i="' + i + '" aria-label="Hapus">&#10005;</button></span></div>';
      });
      if (!P.sem[k].tp.length) h += '<div class="pk-hint">Belum ada TP. Ambil dari bank atau tempel sendiri.</div>';
      h += '<div class="pk-btns"><button type="button" class="pk-btn" data-a="add" data-k="' + k + '">+ Tambah TP</button></div></div>';
    });
    return h + '<div class="pk-hint">Angka di label = JP direncanakan / JP tersedia (minggu efektif × JP per minggu). Atur tanggal & libur di tab <b>Minggu Efektif</b>.</div>';
  }
  function tabEfektif() {
    var h = '<div class="pk-grid3">' + field('Tahun Ajaran', inp('pkTa', P.ta, '2026/2027')) + '</div>';
    [1, 2].forEach(function (k) {
      var s = P.sem[k], inf = info(k);
      h += '<div class="pk-sem"><div class="pk-sem-h">Semester ' + k + ' <span class="pk-sum" id="pkEf' + k + '">' + inf.efektif + ' minggu efektif · ' + inf.tersedia + ' JP</span></div>' +
        '<div class="row-2">' + field('Mulai', '<input type="date" class="pk-d" data-k="' + k + '" data-f="mulai" value="' + esc(s.mulai) + '"/>') +
        field('Selesai', '<input type="date" class="pk-d" data-k="' + k + '" data-f="selesai" value="' + esc(s.selesai) + '"/>') + '</div>' +
        '<label>Minggu tidak efektif (libur, asesmen, MPLS, dll.)</label>';
      s.libur.forEach(function (l, i) {
        h += '<div class="pk-lib"><input type="date" class="pk-d" data-k="' + k + '" data-i="' + i + '" data-f="lm" value="' + esc(l.mulai) + '" aria-label="Mulai"/>' +
          '<input type="date" class="pk-d" data-k="' + k + '" data-i="' + i + '" data-f="ls" value="' + esc(l.selesai) + '" aria-label="Sampai"/>' +
          '<input type="text" class="ket" data-k="' + k + '" data-i="' + i + '" data-f="lk" value="' + esc(l.ket) + '" placeholder="Keterangan, mis. Libur semester"/>' +
          '<button type="button" class="pk-ib del" data-a="ldel" data-k="' + k + '" data-i="' + i + '" aria-label="Hapus">&#10005;</button></div>';
      });
      h += '<div class="pk-btns"><button type="button" class="pk-btn" data-a="ladd" data-k="' + k + '">+ Tambah minggu tidak efektif</button></div></div>';
    });
    return h + '<div class="pk-hint">Satu minggu dihitung tidak efektif bila lebih dari separuh hari sekolahnya (Senin–Jumat) masuk rentang libur/kegiatan. Sesuaikan dengan kalender pendidikan daerahmu.</div>' +
      '<div class="pk-preview" id="pkEfPrev" style="margin-top:12px">' + docEfektif() + '</div>';
  }
  function tabDoc(which) { return '<div class="pk-preview">' + docs(which).join('') + '</div>'; }
  function tabIdt() {
    var I = P.idt;
    return '<div class="row-2">' + field('Nama Sekolah', inp('pkI_sekolah', I.sekolah, 'SD Negeri ...')) + field('Kota/Tempat', inp('pkI_kota', I.kota, 'mis. Cibinong')) + '</div>' +
      '<div class="row-2">' + field('Nama Guru', inp('pkI_guru', I.guru, 'Nama & gelar')) + field('NIP Guru', inp('pkI_nipGuru', I.nipGuru, 'Kosongkan jika tidak ada')) + '</div>' +
      '<div class="row-2">' + field('Kepala Sekolah', inp('pkI_kepsek', I.kepsek, 'Nama & gelar')) + field('NIP Kepala Sekolah', inp('pkI_nipKepsek', I.nipKepsek, 'Kosongkan jika tidak ada')) + '</div>' +
      '<div class="pk-hint">Dipakai di kop & tanda tangan semua dokumen. Tersimpan di perangkat ini saja.</div>';
  }

  var TABS = [['atp', 'Daftar TP & ATP'], ['efektif', 'Minggu Efektif'], ['prota', 'Prota'], ['prosem', 'Prosem'], ['idt', 'Identitas']];
  function render() {
    var root = document.getElementById('perangkat');
    if (!root) return;
    var body = P.tab === 'atp' ? tabATP() : P.tab === 'efektif' ? tabEfektif() : P.tab === 'idt' ? tabIdt() : tabDoc(P.tab);
    var docOpt = [['semua', 'Semua dokumen'], ['atp', 'ATP'], ['efektif', 'Rincian Minggu Efektif'], ['prota', 'Prota'], ['prosem', 'Prosem (Sem 1 & 2)']]
      .map(function (o) { return '<option value="' + o[0] + '"' + (P.doc === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    root.innerHTML = '<div class="card"><div class="card-title pk-head"><span><svg class="ic" aria-hidden="true"><use href="#i-list"/></svg> ATP, Prota &amp; Prosem</span>' +
      '<button type="button" class="pk-btn" data-a="reset" style="font-size:.7rem">Mulai baru</button></div>' +
      '<div class="pk-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" class="pk-tab' + (P.tab === t[0] ? ' active' : '') + '" data-tab="' + t[0] + '" role="tab">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="pkBody">' + body + '</div>' +
      '<div class="pk-out"><select id="pkDoc" aria-label="Dokumen">' + docOpt + '</select>' +
      '<button type="button" class="pk-btn pri" data-a="print">Cetak / PDF</button><button type="button" class="pk-btn" data-a="word">Word</button><button type="button" class="pk-btn" data-a="excel">Excel</button></div>' +
      '<div class="pk-hint">Prosem dicetak mendatar (landscape). Excel berisi semua dokumen, satu sheet per dokumen.</div></div>';
  }
  function refreshSums() {
    [1, 2].forEach(function (k) {
      var inf = info(k), el = document.getElementById('pkSum' + k);
      if (el) { el.textContent = inf.jpTotal + ' / ' + inf.tersedia + ' JP'; el.classList.toggle('bad', !!inf.tersedia && inf.jpTotal > inf.tersedia); }
      var ef = document.getElementById('pkEf' + k);
      if (ef) ef.textContent = inf.efektif + ' minggu efektif · ' + inf.tersedia + ' JP';
    });
    var pv = document.getElementById('pkEfPrev');
    if (pv) pv.innerHTML = docEfektif();
  }

  function onClick(e) {
    var tab = e.target.closest('[data-tab]');
    if (tab) { P.tab = tab.dataset.tab; save(); render(); return; }
    var b = e.target.closest('[data-a]');
    if (!b) return;
    var a = b.dataset.a, k = b.dataset.k, i = +b.dataset.i;
    var list = k ? P.sem[k].tp : null;
    if (a === 'bank') return fromBank(false);
    if (a === 'paste') { var p = document.getElementById('pkPaste'); p.hidden = !p.hidden; if (!p.hidden) document.getElementById('pkPasteTxt').focus(); return; }
    if (a === 'pasteX') { document.getElementById('pkPaste').hidden = true; return; }
    if (a === 'pasteOk') return tempel();
    if (a === 'rata') return bagiRata(k);
    if (a === 'add') { list.push({ t: '', jp: defaultJP(P.mapel, P.kelas) * 2 }); save(); render(); var ts = document.querySelectorAll('textarea[data-k="' + k + '"]'); if (ts.length) ts[ts.length - 1].focus(); return; }
    if (a === 'up' && i > 0) { var t = list[i]; list[i] = list[i - 1]; list[i - 1] = t; }
    else if (a === 'down' && i < list.length - 1) { var t2 = list[i]; list[i] = list[i + 1]; list[i + 1] = t2; }
    else if (a === 'del') { if (list[i].t && !confirm('Hapus TP ini?')) return; list.splice(i, 1); }
    else if (a === 'ladd') { P.sem[k].libur.push({ mulai: '', selesai: '', ket: '' }); }
    else if (a === 'ldel') { P.sem[k].libur.splice(i, 1); }
    else if (a === 'reset') { if (!confirm('Kosongkan semua TP, libur, dan pengaturan perangkat? Identitas tetap disimpan.')) return; var idt = P.idt; P = fresh(); P.idt = idt; }
    else if (a === 'print') return cetak();
    else if (a === 'word') return unduhWord();
    else if (a === 'excel') return unduhExcel();
    else return;
    save(); render();
  }
  function onInput(e) {
    var el = e.target, f = el.dataset.f, k = el.dataset.k, i = +el.dataset.i;
    if (el.id === 'pkMapel') { P.mapel = el.value; save(); return; }
    if (el.id === 'pkJp') { P.jp = num(el.value, 0); save(); refreshSums(); return; }
    if (el.id === 'pkTa') { P.ta = el.value; save(); return; }
    if (el.id && el.id.indexOf('pkI_') === 0) { P.idt[el.id.slice(4)] = el.value; save(); return; }
    if (!f || !k) return;
    if (f === 't') { P.sem[k].tp[i].t = el.value; var cc = el.nextElementSibling; if (cc) cc.outerHTML = ccHtml(el.value); }
    else if (f === 'jp') P.sem[k].tp[i].jp = num(el.value, 0);
    else if (f === 'mulai' || f === 'selesai') P.sem[k][f] = el.value;
    else if (f === 'lm') P.sem[k].libur[i].mulai = el.value;
    else if (f === 'ls') P.sem[k].libur[i].selesai = el.value;
    else if (f === 'lk') P.sem[k].libur[i].ket = el.value;
    save(); refreshSums();
  }
  function onChange(e) {
    var el = e.target;
    if (el.dataset.f === 't' && el.value.length > MAXTP) {
      el.value = padatkan(el.value);
      toast('TP dipadatkan jadi ' + el.value.length + ' karakter. Cek lagi ya.');
    }
    if (e.target.id === 'pkKelas') { P.kelas = e.target.value; save(); return; }
    if (e.target.id === 'pkDoc') { P.doc = e.target.value; save(); return; }
    onInput(e);
  }

  function init() {
    var root = document.getElementById('perangkat');
    if (!root) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var pr = document.createElement('div'); pr.id = 'pkPrint'; document.body.appendChild(pr);
    window.addEventListener('afterprint', function () { document.documentElement.classList.remove('pk-printing'); pr.innerHTML = ''; });
    load();
    render();
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
  }

  window.Perangkat = { fromBank: fromBank, _state: function () { return P; }, _weeks: weeks, _allocate: allocate };
  init();
})();
