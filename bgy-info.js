/* Bantu Guru Yuk — iklan antar-tools yang dipakai bersama semua halaman.
   1. Bar "Info"  : ubah INFO_ITEMS. Tampil di <div data-bgy-info></div> jika ada, kalau tidak di atas <footer>.
   2. Menu tools  : ubah MENU_ITEMS (maks 4 supaya tidak membingungkan). Tampil hanya jika halaman punya
      <div data-bgy-menu></div> di dalam menu hamburger. Tombol "Install BGY" ikut tampil di atasnya,
      kecuali slot diberi atribut data-bgy-install="off".
      Teks mengikuti warna teks menu, jadi pastikan wadah menu punya `color` yang sesuai tema.
   3. Bar Info menempel di bawah layar (kecuali slot diberi data-bgy-info-static, mis. Simpan Sandi).
   4. Judul header "BGY | ..." otomatis ditulis "Bantu Guru Yuk | ..." bila muat satu baris.
   5. Kartu di bawah layar muncul halus (fade + naik) saat digulir.
   Link ke halaman yang sedang dibuka otomatis disembunyikan. */
(function () {
  'use strict';

  var INFO_ITEMS = [
    { text: 'Bikin soal gak sampai 10 menit', url: 'https://www.bantuguruyuk.web.id/soal', path: '/soal' },
    { text: 'Bingung bikin prompt LKPD?', url: 'https://www.bantuguruyuk.web.id/lkpd', path: '/lkpd' },
    { text: 'Modul Ajar sat-set pakai AI', url: 'https://www.bantuguruyuk.web.id/modul-ajar', path: '/modul-ajar' },
    { text: 'Bingung buat prompt game IFP?', url: 'https://bmedia.bantuguruyuk.web.id/buat' },
    { text: 'Presensi & rekap gak ribet', url: 'https://presiswa.bantuguruyuk.web.id' },
    { text: 'Katrol nilai otomatis', url: 'https://www.bantuguruyuk.web.id/katrol-nilai/', path: '/katrol-nilai' },
    { text: 'Modul Ajar Kokurikuler sat-set', url: 'https://www.bantuguruyuk.web.id/kokurikuler', path: '/kokurikuler' },
    { text: 'Kumpulan Tujuan Pembelajaran terupdate', url: 'https://www.bantuguruyuk.web.id/?tool=draft-tp', path: '/draft-tp' },
    { text: 'Simpan akun digital guru, aman & offline', url: 'https://www.bantuguruyuk.web.id/sandi/', path: '/sandi' }
  ];
  // Ikon Lucide (lucide.dev, lisensi ISC) — isi <svg viewBox="0 0 24 24">
  var ICONS = {
    install: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    installed: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
    soal: '<path d="M14.364 13.634a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506l4.013-4.009a1 1 0 0 0-3.004-3.004z"/><path d="M14.487 7.858A1 1 0 0 1 14 7V2"/><path d="M20 19.645V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l2.516 2.516"/><path d="M8 18h1"/>',
    modul: '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2 5 5 0 0 1 4-2z"/>',
    lkpd: '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
    game: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>'
  };

  var MENU_ITEMS = [
    { icon: ICONS.soal, title: 'Buat Soal', desc: 'Buat soal gak sampai 10 menit', url: 'https://www.bantuguruyuk.web.id/soal', path: '/soal' },
    { icon: ICONS.modul, title: 'Modul Ajar', desc: 'Sat-set, anti bingung', url: 'https://www.bantuguruyuk.web.id/modul-ajar', path: '/modul-ajar' },
    { icon: ICONS.lkpd, title: 'Prompt LKPD', desc: 'Praktis buat prompt LKPD', url: 'https://www.bantuguruyuk.web.id/lkpd', path: '/lkpd' },
    { icon: ICONS.game, title: 'Prompt Game', desc: 'Sat-set buat prompt game IFP', url: 'https://bmedia.bantuguruyuk.web.id/buat' }
  ];
  var ALL_TOOLS_URL = 'https://www.bantuguruyuk.web.id';
  var ROTATE_MS = 6000;
  var MARQUEE_PX_PER_SEC = 50;

  if (window.__bgyInfoLoaded) return;
  window.__bgyInfoLoaded = true;

  var here = location.pathname.replace(/\/+$/, '') || '/';
  var page = here === '/' ? 'home' : here.split('/')[1].replace(/\.html$/, '');
  function notHere(it) {
    return !it.path || (here !== it.path && here.indexOf(it.path + '/') !== 0);
  }
  var items = INFO_ITEMS.filter(notHere);

  var css = [
    '.bgyi-wrap{position:relative;flex:none;display:flex;align-items:center;gap:10px;height:46px;padding:0 14px;overflow:hidden;',
    'background:linear-gradient(90deg,#fbbf24,#f59e0b);border-top:1px solid rgba(255,255,255,.3);font-family:inherit;box-sizing:border-box;width:100%;}',
    '.bgyi-wrap *{box-sizing:border-box;}',
    '.bgyi-badge{flex:none;background:#1e293b;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;',
    'padding:4px 11px;border-radius:999px;}',
    '.bgyi-box{position:relative;flex:1;min-width:0;height:100%;}',
    '.bgyi-track{position:absolute;inset:0;}',
    '.bgyi-item{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none!important;',
    'color:#1e293b!important;opacity:0;pointer-events:none;transition:opacity .6s ease;}',
    '.bgyi-item.bgyi-active{opacity:1;pointer-events:auto;}',
    '.bgyi-text{font-size:12.5px;font-weight:700;line-height:1.25;text-align:center;min-width:0;display:-webkit-box;',
    '-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.bgyi-cta{flex:none;background:#dc2626;color:#fff;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;}',
    '.bgyi-clone{display:none!important;}',
    '@media (min-width:768px){',
    '.bgyi-box{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent);',
    'mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent);}',
    '.bgyi-track{right:auto;display:flex;align-items:center;width:max-content;animation:bgyi-marquee var(--bgyi-dur,40s) linear infinite;}',
    '.bgyi-wrap:hover .bgyi-track,.bgyi-wrap:focus-within .bgyi-track{animation-play-state:paused;}',
    '.bgyi-item{position:static;opacity:1;pointer-events:auto;transition:none;flex:none;padding-right:40px;}',
    '.bgyi-text{display:block;white-space:nowrap;}',
    '.bgyi-clone{display:flex!important;}}',
    '@keyframes bgyi-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
    '@media (prefers-reduced-motion:reduce){.bgyi-track{animation:none}.bgyi-item{transition:none}}'
  ].join('');

  function withUtm(url, medium) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=bgy-' + encodeURIComponent(page) + '&utm_medium=' + (medium || 'info');
  }
  function track(kind, text, url) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'bgy_' + kind + '_click', { link_text: text, link_url: url, from_page: page });
    }
  }

  function makeItem(it, clone) {
    var a = document.createElement('a');
    a.className = 'bgyi-item' + (clone ? ' bgyi-clone' : '');
    a.href = withUtm(it.url);
    a.target = '_blank';
    a.rel = 'noopener';
    if (clone) { a.setAttribute('aria-hidden', 'true'); a.tabIndex = -1; }
    var t = document.createElement('span');
    t.className = 'bgyi-text';
    t.textContent = it.text;
    var c = document.createElement('span');
    c.className = 'bgyi-cta';
    c.textContent = 'Klik di sini';
    a.appendChild(t);
    a.appendChild(c);
    a.addEventListener('click', function () { track('info', it.text, it.url); });
    return a;
  }

  var menuCss = [
    '.bgym-label{padding:8px 16px 4px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;opacity:.65;}',
    '.bgym-item{display:flex;align-items:center;gap:10px;padding:8px 16px;text-decoration:none!important;color:inherit!important;}',
    '.bgym-item:hover,.bgym-item:active,.bgym-all:hover,.bgym-all:active{background:rgba(14,165,160,.1);}',
    '.bgym-icon{flex:none;width:32px;height:32px;border-radius:10px;background:rgba(14,165,160,.12);color:#0d9488;display:flex;align-items:center;justify-content:center;}',
    '.bgym-icon svg{width:18px;height:18px;}',
    '.bgym-title{display:block;font-size:13.5px;font-weight:700;line-height:1.3;}',
    '.bgym-desc{display:block;font-size:12px;opacity:.7;line-height:1.3;}',
    '.bgym-divider{height:1px;background:rgba(127,127,127,.2);margin:4px 0;}',
    '.bgym-all{display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:13px;font-weight:700;color:#0d9488!important;text-decoration:none!important;white-space:nowrap;}',
    '.bgym-all span{min-width:0;overflow:hidden;text-overflow:ellipsis;}',
    '.bgym-all svg{flex:none;width:18px;height:18px;}',
    '.bgym-install{display:flex;align-items:center;gap:10px;width:100%;padding:11px 16px;border:none;background:none;color:inherit;font:inherit;font-size:14px;font-weight:600;text-align:left;cursor:pointer;}',
    '.bgym-install:hover,.bgym-install:active{background:rgba(14,165,160,.1);}',
    '.bgym-install svg{flex:none;width:18px;height:18px;color:#0d9488;}',
    '.bgym-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);max-width:calc(100vw - 32px);width:max-content;background:#1f2937;color:#fff;',
    'padding:11px 16px;border-radius:12px;font-size:13.5px;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:100000;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;}',
    '.bgym-toast-show{opacity:1;transform:translate(-50%,0);}'
  ].join('');

  /* ---- Install aplikasi (PWA halaman ini) ---- */
  var deferredInstall = null;
  var installKey = 'bgy_installed_' + page;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; updateInstallItem(); });
  window.addEventListener('appinstalled', function () {
    deferredInstall = null;
    try { localStorage.setItem(installKey, '1'); } catch (e) {}
    updateInstallItem();
  });
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  function wasInstalled() {
    try { return localStorage.getItem(installKey) === '1'; } catch (e) { return false; }
  }
  function toast(msg) {
    var t = document.getElementById('bgym-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'bgym-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'bgym-toast bgym-toast-show';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = 'bgym-toast'; }, 4200);
  }
  function doInstall() {
    if (isStandalone()) { toast('Kamu sudah install aplikasi ini dan sedang memakainya.'); return; }
    if (deferredInstall) {
      var ev = deferredInstall;
      deferredInstall = null;
      try {
        ev.prompt();
        ev.userChoice.then(function (c) {
          if (c && c.outcome === 'accepted') { try { localStorage.setItem(installKey, '1'); } catch (e) {} }
          updateInstallItem();
        });
        return;
      } catch (e) { /* prompt sudah dipakai banner halaman; lanjut ke petunjuk */ }
    }
    if (wasInstalled()) { toast('Kamu sudah install aplikasi ini. Buka dari ikon di layar HP.'); return; }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(ios
      ? 'Buka di Safari, ketuk tombol Bagikan lalu pilih "Tambah ke Layar Utama".'
      : 'Buka menu ⋮ di browser lalu pilih "Instal aplikasi" / "Tambahkan ke layar utama". Kalau tidak ada, berarti sudah terinstall.');
  }
  var installBtn = null;
  function updateInstallItem() {
    if (!installBtn) return;
    var done = isStandalone() || (wasInstalled() && !deferredInstall);
    installBtn.querySelector('svg').innerHTML = done ? ICONS.installed : ICONS.install;
    installBtn.querySelector('.bgym-install-text').textContent = done ? 'Sudah terinstall' : 'Install BGY';
  }

  window.bgyInstall = doInstall;

  /* Halaman dengan menu bersama: tombol "Install" di banner pengingat halaman ikut memakai install PWA ini. */
  function takeOverPageInstall() {
    var hide = function () {
      var pop = document.getElementById('installPopup');
      if (pop) pop.classList.remove('show');
    };
    window.installApp = function () { hide(); doInstall(); };
  }

  function mountMenu() {
    var slot = document.querySelector('[data-bgy-menu]');
    if (!slot) return;
    if (slot.getAttribute('data-bgy-install') !== 'off') takeOverPageInstall();
    var style = document.createElement('style');
    style.textContent = menuCss;
    document.head.appendChild(style);
    slot.innerHTML = '';
    if (slot.getAttribute('data-bgy-install') !== 'off') {
      installBtn = document.createElement('button');
      installBtn.type = 'button';
      installBtn.className = 'bgym-install';
      installBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg><span class="bgym-install-text"></span>';
      installBtn.addEventListener('click', function () { track('menu', 'Install', page); doInstall(); });
      slot.appendChild(installBtn);
      updateInstallItem();
      var d0 = document.createElement('div');
      d0.className = 'bgym-divider';
      slot.appendChild(d0);
    }
    var label = document.createElement('div');
    label.className = 'bgym-label';
    label.textContent = 'Tools Bantu Guru Yuk lainnya';
    slot.appendChild(label);
    MENU_ITEMS.filter(notHere).forEach(function (it) {
      var a = document.createElement('a');
      a.className = 'bgym-item';
      a.href = withUtm(it.url, 'menu');
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<span class="bgym-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        it.icon + '</svg></span><span><span class="bgym-title"></span><span class="bgym-desc"></span></span>';
      a.querySelector('.bgym-title').textContent = it.title;
      a.querySelector('.bgym-desc').textContent = it.desc;
      a.addEventListener('click', function () { track('menu', it.title, it.url); });
      slot.appendChild(a);
    });
    var divider = document.createElement('div');
    divider.className = 'bgym-divider';
    slot.appendChild(divider);
    var all = document.createElement('a');
    all.className = 'bgym-all';
    all.href = withUtm(ALL_TOOLS_URL, 'menu');
    all.target = '_blank';
    all.rel = 'noopener';
    all.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg><span>Semua Tools Bantu Guru Yuk</span>';
    all.addEventListener('click', function () { track('menu', 'Semua Tools', ALL_TOOLS_URL); });
    slot.appendChild(all);
  }

  /* ---- 3. Bar Info menempel di bawah layar ---- */
  var dockCss = [
    'html.bgyi-docked .bgyi-wrap{position:fixed;left:0;right:0;bottom:0;z-index:900;height:calc(46px + env(safe-area-inset-bottom));',
    'padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -4px 16px rgba(0,0,0,.12);}',
    'html.bgyi-docked body{padding-bottom:calc(46px + env(safe-area-inset-bottom));}',
    'html.bgyi-docked #toast,html.bgyi-docked .toast,html.bgyi-docked .bgym-toast,html.bgyi-docked #installPopup[style*="bottom"],',
    'html.bgyi-docked [style*="position:fixed;bottom:24px"]{bottom:calc(70px + env(safe-area-inset-bottom))!important;}'
  ].join('');
  function dockBar(wrap, slot) {
    if (slot && slot.hasAttribute('data-bgy-info-static')) return;
    if (getComputedStyle(wrap).display === 'none') return;
    var st = document.createElement('style');
    st.textContent = dockCss;
    document.head.appendChild(st);
    document.documentElement.classList.add('bgyi-docked');
  }

  /* ---- 4. Judul header adaptif ---- */
  function adaptHeader() {
    var h1 = document.querySelector('header h1, .app-header h1');
    if (!h1) return;
    var st = document.createElement('style');
    st.textContent = '.bgyh-s{display:none}h1.bgyh-short .bgyh-l{display:none}h1.bgyh-short .bgyh-s{display:inline}.header-brand-text{min-width:0;overflow:hidden}h1.bgyh-tight{font-size:.86rem!important;letter-spacing:-.1px}';
    document.head.appendChild(st);
    var busy = false;
    function brand() {
      if (h1.querySelector('.bgyh')) return;
      var node = h1.firstChild;
      while (node && node.nodeType === 3 && !node.nodeValue.trim()) node = node.nextSibling;
      if (!node || node.nodeType !== 3) return;
      var m = node.nodeValue.match(/^(\s*)BGY\b/);
      if (!m) return;
      busy = true;
      var span = document.createElement('span');
      span.className = 'bgyh';
      span.innerHTML = '<span class="bgyh-l">Bantu Guru Yuk</span><span class="bgyh-s">BGY</span>';
      node.nodeValue = node.nodeValue.slice(m[0].length);
      h1.insertBefore(span, node);
      busy = false;
    }
    var hdr = h1.closest('header, .app-header');
    var actions = hdr && hdr.querySelector('.header-right, .header-actions');
    function tooWide() {
      if (h1.scrollWidth > h1.clientWidth + 1) return true;
      if (!actions) return false;
      return h1.getBoundingClientRect().right > actions.getBoundingClientRect().left - 4;
    }
    function fit() {
      if (!h1.clientWidth) return;
      h1.classList.remove('bgyh-short', 'bgyh-tight');
      if (tooWide()) h1.classList.add('bgyh-short');
      if (tooWide()) h1.classList.add('bgyh-tight');
    }
    brand();
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(h1);
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    if ('MutationObserver' in window) {
      new MutationObserver(function () { if (!busy) { brand(); fit(); } }).observe(h1, { childList: true });
    }
  }

  /* ---- 5. Animasi muncul saat digulir ---- */
  function revealOnScroll() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.documentElement.classList.contains('embed-mode')) return;
    var st = document.createElement('style');
    st.textContent = '.bgy-reveal{opacity:0;transform:translateY(16px);}' +
      '.bgy-reveal.bgy-in{opacity:1;transform:none;transition:opacity .45s ease,transform .45s ease;}';
    document.head.appendChild(st);
    var targets = document.querySelectorAll('.card, .page-card, .contoh-item, .tool-card, .settings-group, .feat-card');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add('bgy-in');
        el.addEventListener('transitionend', function done() {
          el.classList.remove('bgy-reveal', 'bgy-in');
          el.removeEventListener('transitionend', done);
        });
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    var vh = window.innerHeight;
    Array.prototype.forEach.call(targets, function (el) {
      var r = el.getBoundingClientRect();
      if (!r.height || r.top < vh) return;
      el.classList.add('bgy-reveal');
      io.observe(el);
    });
  }

  function mount() {
    adaptHeader();
    revealOnScroll();
    mountMenu();
    if (items.length < 2) return;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'bgyi-wrap';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Info tools Bantu Guru Yuk');
    var badge = document.createElement('span');
    badge.className = 'bgyi-badge';
    badge.textContent = 'Info';
    var box = document.createElement('div');
    box.className = 'bgyi-box';
    var track = document.createElement('div');
    track.className = 'bgyi-track';
    var slides = items.map(function (it, i) {
      var el = makeItem(it, false);
      if (i === 0) el.classList.add('bgyi-active');
      track.appendChild(el);
      return el;
    });
    items.forEach(function (it) { track.appendChild(makeItem(it, true)); });
    box.appendChild(track);
    wrap.appendChild(badge);
    wrap.appendChild(box);

    var slot = document.querySelector('[data-bgy-info]');
    var footer = document.querySelector('footer');
    if (slot) slot.appendChild(wrap);
    else if (footer) footer.parentNode.insertBefore(wrap, footer);
    else document.body.appendChild(wrap);
    dockBar(wrap, slot);

    var wide = window.matchMedia('(min-width: 768px)');
    function setSpeed() {
      if (wide.matches && track.scrollWidth) {
        track.style.setProperty('--bgyi-dur', Math.max(20, track.scrollWidth / 2 / MARQUEE_PX_PER_SEC) + 's');
      }
    }
    if ('ResizeObserver' in window) new ResizeObserver(setSpeed).observe(track);
    else window.addEventListener('load', setSpeed);
    if (wide.addEventListener) wide.addEventListener('change', setSpeed);

    var paused = false;
    wrap.addEventListener('mouseenter', function () { paused = true; });
    wrap.addEventListener('mouseleave', function () { paused = false; });
    wrap.addEventListener('focusin', function () { paused = true; });
    wrap.addEventListener('focusout', function () { paused = false; });

    var i = 0;
    setInterval(function () {
      if (paused || wide.matches) return;
      slides[i].classList.remove('bgyi-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('bgyi-active');
    }, ROTATE_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
