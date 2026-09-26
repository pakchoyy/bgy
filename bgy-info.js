/* Bantu Guru Yuk — iklan antar-tools yang dipakai bersama semua halaman.
   1. Bar "Info"  : ubah INFO_ITEMS. Tampil di <div data-bgy-info></div> jika ada, kalau tidak di atas <footer>.
   2. Menu tools  : ubah MENU_ITEMS. Tampil hanya jika halaman punya <div data-bgy-menu></div> (di dalam menu hamburger).
      Teks mengikuti warna teks menu, jadi pastikan wadah menu punya `color` gelap/terang yang sesuai tema.
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
  var MENU_ITEMS = [
    { emoji: '📝', title: 'Buat Soal', desc: 'Buat soal gak sampai 10 menit', url: 'https://www.bantuguruyuk.web.id/soal', path: '/soal' },
    { emoji: '🗓️', title: 'Modul Ajar', desc: 'Sat-set, anti bingung', url: 'https://www.bantuguruyuk.web.id/modul-ajar', path: '/modul-ajar' },
    { emoji: '📘', title: 'Prompt LKPD', desc: 'Praktis buat prompt LKPD', url: 'https://www.bantuguruyuk.web.id/lkpd', path: '/lkpd' },
    { emoji: '📋', title: 'Presensi Digital', desc: 'Presensi & rekap sat-set', url: 'https://presiswa.bantuguruyuk.web.id' },
    { emoji: '🎮', title: 'Prompt Game', desc: 'Sat-set buat prompt game IFP', url: 'https://bmedia.bantuguruyuk.web.id/buat' },
    { emoji: '🔐', title: 'Simpan Sandi', desc: 'Simpan akun digital, aman & offline', url: 'https://www.bantuguruyuk.web.id/sandi/', path: '/sandi' }
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
    'padding:4px 11px;border-radius:999px;animation:bgyi-pulse 2s ease-in-out infinite;}',
    '@keyframes bgyi-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
    '.bgyi-box{position:relative;flex:1;min-width:0;height:100%;}',
    '.bgyi-track{position:absolute;inset:0;}',
    '.bgyi-item{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none!important;',
    'color:#1e293b!important;opacity:0;pointer-events:none;transition:opacity .6s ease;}',
    '.bgyi-item.bgyi-active{opacity:1;pointer-events:auto;}',
    '.bgyi-text{font-size:12.5px;font-weight:700;line-height:1.25;text-align:center;min-width:0;display:-webkit-box;',
    '-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
    '.bgyi-cta{flex:none;background:#dc2626;color:#fff;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;',
    'animation:bgyi-glow 2s ease-in-out infinite;}',
    '@keyframes bgyi-glow{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.45)}50%{box-shadow:0 0 0 5px rgba(220,38,38,0)}}',
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
    '@media (prefers-reduced-motion:reduce){.bgyi-badge,.bgyi-cta,.bgyi-track{animation:none}.bgyi-item{transition:none}}'
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
    '.bgym-emoji{flex:none;width:32px;height:32px;border-radius:10px;background:rgba(14,165,160,.12);display:flex;align-items:center;justify-content:center;font-size:16px;}',
    '.bgym-title{display:block;font-size:13.5px;font-weight:700;line-height:1.3;}',
    '.bgym-desc{display:block;font-size:12px;opacity:.7;line-height:1.3;}',
    '.bgym-divider{height:1px;background:rgba(127,127,127,.2);margin:4px 0;}',
    '.bgym-all{display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:13px;font-weight:700;color:#0d9488!important;text-decoration:none!important;white-space:nowrap;}',
    '.bgym-all span{min-width:0;overflow:hidden;text-overflow:ellipsis;}',
    '.bgym-all svg{flex:none;width:18px;height:18px;}'
  ].join('');

  function mountMenu() {
    var slot = document.querySelector('[data-bgy-menu]');
    if (!slot) return;
    var style = document.createElement('style');
    style.textContent = menuCss;
    document.head.appendChild(style);
    var html = '<div class="bgym-label">Tools Bantu Guru Yuk lainnya</div>';
    slot.innerHTML = html;
    MENU_ITEMS.filter(notHere).forEach(function (it) {
      var a = document.createElement('a');
      a.className = 'bgym-item';
      a.href = withUtm(it.url, 'menu');
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<span class="bgym-emoji"></span><span><span class="bgym-title"></span><span class="bgym-desc"></span></span>';
      a.querySelector('.bgym-emoji').textContent = it.emoji;
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

  function mount() {
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
