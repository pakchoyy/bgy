/* BantuGuruYuk — bar "Info" (iklan antar-tools).
   Ubah daftar INFO_ITEMS di bawah untuk merevisi kalimat di SEMUA halaman sekaligus.
   Tempat tampil: elemen <div data-bgy-info></div> jika ada, kalau tidak di atas <footer>. */
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
  var ROTATE_MS = 6000;
  var MARQUEE_PX_PER_SEC = 50;

  if (document.querySelector('.bgyi-wrap')) return;

  var here = location.pathname.replace(/\/+$/, '') || '/';
  var page = here === '/' ? 'home' : here.split('/')[1].replace(/\.html$/, '');
  var items = INFO_ITEMS.filter(function (it) {
    return !it.path || (here !== it.path && here.indexOf(it.path + '/') !== 0);
  });
  if (items.length < 2) return;

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

  function withUtm(url) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=bgy-' + encodeURIComponent(page) + '&utm_medium=info';
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
    a.addEventListener('click', function () {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'bgy_info_click', { link_text: it.text, link_url: it.url, from_page: page });
      }
    });
    return a;
  }

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.className = 'bgyi-wrap';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Info tools BantuGuruYuk');
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
