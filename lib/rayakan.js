/* BGY — efek berhasil: confetti + maskot Pak Choy.
   Pakai: bgyRayakan({ wadah: elemen, pesan: 'Mantap, sudah jadi!', besar: false })
   confetti dari canvas-confetti (ISC, github.com/catdad/canvas-confetti), dimuat saat dibutuhkan. */
(function () {
  'use strict';
  var WARNA = ['#0ea5a0', '#5eead4', '#f59e0b', '#fbbf24', '#3b82f6', '#ef4444', '#ffffff'];
  var PESAN = ['Mantap, sudah jadi!', 'Sat-set, beres!', 'Keren, Bapak/Ibu Guru!', 'Sip, tinggal unduh!'];
  var css = '.bgym-wrap{display:flex;align-items:flex-end;gap:10px;margin:2px 0 10px}' +
    '.bgym-img{width:58px;height:58px;flex:none;animation:bgymLompat .9s cubic-bezier(.3,1.6,.5,1) both}' +
    '.bgym-bub{position:relative;background:#fff;color:#0d7a8a;border:2px solid #0ea5a0;border-radius:14px;padding:8px 12px;font-weight:800;font-size:.9rem;line-height:1.3;animation:bgymMuncul .45s .35s both;box-shadow:0 3px 10px rgba(14,165,160,.18)}' +
    '.bgym-bub::before{content:"";position:absolute;left:-9px;bottom:12px;border:8px solid transparent;border-right-color:#0ea5a0;border-left:0}' +
    '.bgym-bub::after{content:"";position:absolute;left:-6px;bottom:13px;border:7px solid transparent;border-right-color:#fff;border-left:0}' +
    'body.dark .bgym-bub{background:#0f172a;color:#5eead4}body.dark .bgym-bub::after{border-right-color:#0f172a}' +
    '.bgym-wrap.besar{justify-content:center}.bgym-wrap.besar .bgym-img{width:84px;height:84px}.bgym-wrap.besar .bgym-bub{font-size:1.05rem}' +
    '@keyframes bgymLompat{0%{transform:translateY(30px) scale(.6);opacity:0}60%{transform:translateY(-8px) scale(1.05);opacity:1}100%{transform:none}}' +
    '@keyframes bgymMuncul{from{opacity:0;transform:translateX(-6px) scale(.9)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.bgym-img,.bgym-bub{animation:none}}';
  var lib = null;
  function muat() {
    if (!lib) lib = new Promise(function (res, rej) {
      if (window.confetti) return res(window.confetti);
      var s = document.createElement('script');
      s.src = '/lib/confetti.js';
      s.onload = function () { res(window.confetti); };
      s.onerror = function () { lib = null; rej(); };
      document.head.appendChild(s);
    });
    return lib;
  }
  function tembak(besar) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    muat().then(function (confetti) {
      var o = { colors: WARNA, zIndex: 99999, disableForReducedMotion: true };
      if (besar) {
        confetti(Object.assign({}, o, { particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.75 } }));
        confetti(Object.assign({}, o, { particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.75 } }));
        setTimeout(function () { confetti(Object.assign({}, o, { particleCount: 120, spread: 100, startVelocity: 35, origin: { y: 0.4 } })); }, 300);
      } else {
        confetti(Object.assign({}, o, { particleCount: 70, spread: 75, startVelocity: 32, origin: { y: 0.7 } }));
      }
    }).catch(function () {});
  }
  function maskot(wadah, pesan, besar) {
    if (!wadah) return;
    if (!document.getElementById('bgym-css')) {
      var st = document.createElement('style'); st.id = 'bgym-css'; st.textContent = css; document.head.appendChild(st);
    }
    var lama = wadah.querySelector('.bgym-wrap'); if (lama) lama.remove();
    var w = document.createElement('div');
    w.className = 'bgym-wrap' + (besar ? ' besar' : '');
    w.innerHTML = '<img class="bgym-img" src="/guru-cibisd2.png" alt="Pak Choy"><div class="bgym-bub" role="status"></div>';
    w.querySelector('.bgym-bub').textContent = pesan || PESAN[Math.floor(Math.random() * PESAN.length)];
    wadah.insertBefore(w, wadah.firstChild);
  }
  window.bgyRayakan = function (o) {
    o = o || {};
    if (o.wadah) maskot(o.wadah, o.pesan, o.besar);
    if (o.confetti !== false) tembak(o.besar);
  };
})();
