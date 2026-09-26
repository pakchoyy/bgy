'use strict';

/* =========================================================
   SANDI — app.js
   Vanilla JS. No framework, no backend, no encryption.
   Storage: IndexedDB (fallback: localStorage) for accounts.
   PIN + settings: localStorage (small values only).
   ========================================================= */

/* ---------- Constants ---------- */
const DB_NAME = 'sandi-db';
const DB_VERSION = 1;
const STORE_ACCOUNTS = 'accounts';
const LS_FALLBACK_KEY = 'sandi_accounts_fallback';
const LS_PIN = 'sandi_pin';
const LS_THEME = 'sandi_theme';
const LS_AUTOLOCK = 'sandi_autolock_minutes';
const LS_ONBOARDED = 'sandi_onboarded';

const DEFAULT_CATEGORIES = ['Sekolah', 'Email', 'Administrasi', 'AI', 'Desain', 'Media', 'Lainnya'];

/* ---------- Tiny storage layer ---------- */
let dbInstance = null;
let useFallback = false;

function openDB() {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      useFallback = true;
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
          db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => { dbInstance = req.result; resolve(dbInstance); };
      req.onerror = () => { useFallback = true; resolve(null); };
    } catch (e) {
      useFallback = true;
      resolve(null);
    }
  });
}

function fallbackRead() {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function fallbackWrite(list) {
  localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(list));
}

function getAllAccounts() {
  return new Promise((resolve) => {
    if (useFallback || !dbInstance) { resolve(fallbackRead()); return; }
    try {
      const tx = dbInstance.transaction(STORE_ACCOUNTS, 'readonly');
      const store = tx.objectStore(STORE_ACCOUNTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(fallbackRead());
    } catch (e) {
      resolve(fallbackRead());
    }
  });
}

function putAccount(account) {
  return new Promise((resolve) => {
    if (useFallback || !dbInstance) {
      const list = fallbackRead();
      const idx = list.findIndex((a) => a.id === account.id);
      if (idx >= 0) list[idx] = account; else list.push(account);
      fallbackWrite(list);
      resolve(true);
      return;
    }
    try {
      const tx = dbInstance.transaction(STORE_ACCOUNTS, 'readwrite');
      tx.objectStore(STORE_ACCOUNTS).put(account);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

function deleteAccountById(id) {
  return new Promise((resolve) => {
    if (useFallback || !dbInstance) {
      fallbackWrite(fallbackRead().filter((a) => a.id !== id));
      resolve(true);
      return;
    }
    try {
      const tx = dbInstance.transaction(STORE_ACCOUNTS, 'readwrite');
      tx.objectStore(STORE_ACCOUNTS).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

function clearAllAccounts() {
  return new Promise((resolve) => {
    if (useFallback || !dbInstance) { fallbackWrite([]); resolve(true); return; }
    try {
      const tx = dbInstance.transaction(STORE_ACCOUNTS, 'readwrite');
      tx.objectStore(STORE_ACCOUNTS).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
}

/* ---------- Helpers ---------- */
function makeId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
function nowIso() { return new Date().toISOString(); }

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through to fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch (e) {
    return false;
  }
}

/* Null-safe listener binding: if an element is missing (e.g. an old
   cached HTML mismatched with a newer app.js), skip it instead of
   throwing and blanking the whole app. */
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

/* ---------- App state ---------- */
const state = {
  accounts: [],
  currentCategory: 'Semua',
  searchQuery: '',
  currentView: 'dashboard',
  activeDetailId: null,
  editingId: null,
  autoLockTimer: null,
  pendingDeleteAction: null,
};

/* =========================================================
   PIN / AUTH
   ========================================================= */
function hasPin() { return !!localStorage.getItem(LS_PIN); }
function savePin(pin) { localStorage.setItem(LS_PIN, pin); }
function checkPin(pin) { return localStorage.getItem(LS_PIN) === pin; }

function showScreen(id) {
  ['screen-pin-setup', 'screen-pin-lock'].forEach((s) => {
    document.getElementById(s).hidden = (s !== id);
  });
  document.getElementById('app-shell').hidden = true;
}

function showApp() {
  document.getElementById('screen-pin-setup').hidden = true;
  document.getElementById('screen-pin-lock').hidden = true;
  document.getElementById('app-shell').hidden = false;
  resetAutoLockTimer();
}

function initAuthFlow() {
  if (hasPin()) {
    showScreen('screen-pin-lock');
    document.getElementById('pin-unlock').focus();
  } else {
    showScreen('screen-pin-setup');
    document.getElementById('pin-new').focus();
  }
}

/* PIN setup */
let pendingNewPin = '';
on('btn-pin-next', 'click', () => {
  const val = document.getElementById('pin-new').value.trim();
  if (val.length < 4 || val.length > 6 || !/^\d+$/.test(val)) {
    showToast('PIN harus 4-6 digit angka');
    return;
  }
  pendingNewPin = val;
  document.getElementById('pin-setup-step-1').hidden = true;
  document.getElementById('pin-setup-step-2').hidden = false;
  document.getElementById('pin-confirm').focus();
});

on('btn-pin-start', 'click', async () => {
  const confirmVal = document.getElementById('pin-confirm').value.trim();
  const errEl = document.getElementById('pin-setup-error');
  if (confirmVal !== pendingNewPin) {
    errEl.textContent = 'PIN tidak cocok, coba lagi.';
    errEl.hidden = false;
    return;
  }
  errEl.hidden = true;
  savePin(pendingNewPin);
  showApp();
  await boot();
  if (!localStorage.getItem(LS_ONBOARDED)) {
    localStorage.setItem(LS_ONBOARDED, '1');
    if (state.accounts.length === 0) {
      document.getElementById('modal-sample-data').hidden = false;
    }
  }
});

/* PIN unlock */
on('btn-unlock', 'click', unlockWithPin);
on('pin-unlock', 'keydown', (e) => {
  if (e.key === 'Enter') unlockWithPin();
});
async function unlockWithPin() {
  const val = document.getElementById('pin-unlock').value.trim();
  const errEl = document.getElementById('pin-unlock-error');
  if (checkPin(val)) {
    errEl.hidden = true;
    document.getElementById('pin-unlock').value = '';
    showApp();
    await boot();
  } else {
    errEl.hidden = false;
  }
}

/* Forgot PIN */
on('btn-forgot-pin', 'click', () => {
  document.getElementById('modal-forgot-pin').hidden = false;
});
on('btn-forgot-cancel', 'click', () => {
  document.getElementById('modal-forgot-pin').hidden = true;
});
on('btn-close-forgot', 'click', () => {
  document.getElementById('modal-forgot-pin').hidden = true;
});
on('btn-forgot-reset', 'click', async () => {
  await clearAllAccounts();
  localStorage.removeItem(LS_PIN);
  localStorage.removeItem(LS_ONBOARDED);
  document.getElementById('modal-forgot-pin').hidden = true;
  location.reload();
});

/* Lock now / auto lock */
function lockApp() {
  document.getElementById('pin-unlock').value = '';
  showScreen('screen-pin-lock');
}
on('btn-lock-now', 'click', lockApp);

function resetAutoLockTimer() {
  clearTimeout(state.autoLockTimer);
  const minutes = parseInt(localStorage.getItem(LS_AUTOLOCK) || '5', 10);
  if (!minutes) return;
  state.autoLockTimer = setTimeout(lockApp, minutes * 60 * 1000);
}
['click', 'keydown', 'touchstart'].forEach((evt) => {
  document.addEventListener(evt, () => {
    if (!document.getElementById('app-shell').hidden) resetAutoLockTimer();
  });
});

/* Change PIN */
on('btn-change-pin', 'click', () => {
  document.getElementById('change-pin-old').value = '';
  document.getElementById('change-pin-new').value = '';
  document.getElementById('change-pin-confirm').value = '';
  document.getElementById('change-pin-error').hidden = true;
  document.getElementById('modal-change-pin').hidden = false;
});
on('btn-close-change-pin', 'click', () => {
  document.getElementById('modal-change-pin').hidden = true;
});
on('btn-save-change-pin', 'click', () => {
  const oldPin = document.getElementById('change-pin-old').value.trim();
  const newPin = document.getElementById('change-pin-new').value.trim();
  const confirmPin = document.getElementById('change-pin-confirm').value.trim();
  const errEl = document.getElementById('change-pin-error');

  if (!checkPin(oldPin)) { errEl.textContent = 'PIN lama salah.'; errEl.hidden = false; return; }
  if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
    errEl.textContent = 'PIN baru harus 4-6 digit angka.'; errEl.hidden = false; return;
  }
  if (newPin !== confirmPin) { errEl.textContent = 'Konfirmasi PIN tidak cocok.'; errEl.hidden = false; return; }

  savePin(newPin);
  document.getElementById('modal-change-pin').hidden = true;
  showToast('PIN berhasil diubah ✓');
});

/* =========================================================
   THEME
   ========================================================= */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  const use = document.getElementById('theme-icon-use');
  if (use) use.setAttribute('href', isDark ? '#icon-sun' : '#icon-moon');
  const label = document.getElementById('theme-label');
  if (label) {
    label.innerHTML = isDark
      ? '<svg class="icon icon-sm"><use href="#icon-moon"></use></svg> Gelap'
      : '<svg class="icon icon-sm"><use href="#icon-sun"></use></svg> Terang';
  }
}
function toggleTheme() {
  const current = localStorage.getItem(LS_THEME) || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(LS_THEME, next);
  applyTheme(next);
}
on('btn-theme-toggle', 'click', toggleTheme);
on('btn-theme-toggle-2', 'click', toggleTheme);

/* =========================================================
   HAMBURGER MENU
   ========================================================= */
function closeHamburgerMenu() {
  document.getElementById('hamburger-menu').hidden = true;
}
on('btn-hamburger', 'click', (e) => {
  e.stopPropagation();
  const menu = document.getElementById('hamburger-menu');
  menu.hidden = !menu.hidden;
});
document.addEventListener('click', (e) => {
  const menu = document.getElementById('hamburger-menu');
  if (!menu.hidden && !menu.contains(e.target) && e.target.id !== 'btn-hamburger') {
    closeHamburgerMenu();
  }
});
on('menu-tentang', 'click', () => {
  closeHamburgerMenu();
  switchView('settings');
});
on('menu-lock', 'click', () => {
  closeHamburgerMenu();
  lockApp();
});
on('menu-install', 'click', () => {
  closeHamburgerMenu();
  triggerInstallPrompt();
});
on('menu-bgy', 'click', () => {
  closeHamburgerMenu();
  window.open('https://www.bantuguruyuk.web.id', '_blank');
});

/* =========================================================
   PWA INSTALL PROMPT
   ========================================================= */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!localStorage.getItem('sandi_install_dismissed')) {
    document.getElementById('install-banner').hidden = false;
  }
});

async function triggerInstallPrompt() {
  if (!deferredInstallPrompt) {
    showToast('Aplikasi sudah terinstall atau browser tidak mendukung install otomatis.');
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-banner').hidden = true;
}

on('btn-install', 'click', triggerInstallPrompt);
on('btn-install-close', 'click', () => {
  document.getElementById('install-banner').hidden = true;
  localStorage.setItem('sandi_install_dismissed', '1');
});
window.addEventListener('appinstalled', () => {
  document.getElementById('install-banner').hidden = true;
  deferredInstallPrompt = null;
});

/* =========================================================
   VIEWS / NAVIGATION
   ========================================================= */
function switchView(viewName) {
  state.currentView = viewName;
  ['dashboard', 'favorite', 'settings'].forEach((v) => {
    document.getElementById('view-' + v).hidden = (v !== viewName);
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('nav-active', btn.dataset.view === viewName);
  });
  document.getElementById('fab-add').hidden = (viewName === 'settings');
  if (viewName === 'favorite') renderFavoriteList();
}
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

/* =========================================================
   RENDERING
   ========================================================= */
function getFilteredAccounts() {
  let list = state.accounts.slice();
  if (state.currentCategory !== 'Semua') {
    list = list.filter((a) => a.category === state.currentCategory);
  }
  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((a) =>
      (a.serviceName || '').toLowerCase().includes(q) ||
      (a.username || '').toLowerCase().includes(q) ||
      (a.category || '').toLowerCase().includes(q) ||
      (a.notes || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => {
    if (!!b.favorite !== !!a.favorite) return b.favorite ? 1 : -1;
    return (a.serviceName || '').localeCompare(b.serviceName || '');
  });
  return list;
}

function accountCardHtml(acc) {
  const initial = (acc.icon || acc.serviceName || '?').slice(0, 2).toUpperCase();
  const star = acc.favorite ? '<span class="account-fav-star"><svg class="icon"><use href="#icon-star-filled"></use></svg></span>' : '';
  const maskedPw = acc.password ? '••••••••••' : '(kosong)';
  return `
    <button class="account-card" data-id="${acc.id}">
      <div class="account-icon">${escapeHtml(initial)}</div>
      <div class="account-info">
        <div class="account-service">${escapeHtml(acc.serviceName)} ${star}</div>
        <div class="account-username">${escapeHtml(acc.username || maskedPw)}</div>
      </div>
      <div class="account-chevron">›</div>
    </button>
  `;
}

function renderDashboard() {
  const listEl = document.getElementById('account-list');
  const emptyEl = document.getElementById('empty-state');
  const noResultEl = document.getElementById('no-result-state');
  const filtered = getFilteredAccounts();

  renderCategoryChips();

  if (state.accounts.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    noResultEl.hidden = true;
    return;
  }
  emptyEl.hidden = true;

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    noResultEl.hidden = false;
    return;
  }
  noResultEl.hidden = true;
  listEl.innerHTML = filtered.map(accountCardHtml).join('');
  listEl.querySelectorAll('.account-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function renderFavoriteList() {
  const favs = state.accounts.filter((a) => a.favorite);
  const listEl = document.getElementById('favorite-list');
  const emptyEl = document.getElementById('favorite-empty');
  if (favs.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = favs.map(accountCardHtml).join('');
  listEl.querySelectorAll('.account-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function renderCategoryChips() {
  const container = document.getElementById('category-chips');
  const categoriesInUse = Array.from(new Set(state.accounts.map((a) => a.category).filter(Boolean)));
  const allCats = Array.from(new Set([...DEFAULT_CATEGORIES.filter((c) =>
    state.accounts.some((a) => a.category === c)), ...categoriesInUse]));
  const cats = ['Semua', ...allCats];
  container.innerHTML = cats.map((c) =>
    `<button class="chip ${c === state.currentCategory ? 'chip-active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');
  container.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.currentCategory = chip.dataset.category;
      renderDashboard();
    });
  });
}

on('search-input', 'input', (e) => {
  state.searchQuery = e.target.value;
  renderDashboard();
});

/* =========================================================
   ADD / EDIT FORM
   ========================================================= */
function openAddForm() {
  state.editingId = null;
  document.getElementById('form-modal-title').textContent = 'Tambah Akun';
  document.getElementById('account-form').reset();
  document.getElementById('field-id').value = '';
  document.getElementById('field-password').type = 'password';
  document.getElementById('modal-form').hidden = false;
  document.getElementById('field-service').focus();
}
on('fab-add', 'click', openAddForm);
on('btn-empty-add', 'click', openAddForm);
on('btn-close-form', 'click', () => {
  document.getElementById('modal-form').hidden = true;
});

function openEditForm(acc) {
  state.editingId = acc.id;
  document.getElementById('form-modal-title').textContent = 'Edit Akun';
  document.getElementById('field-id').value = acc.id;
  document.getElementById('field-service').value = acc.serviceName || '';
  document.getElementById('field-username').value = acc.username || '';
  document.getElementById('field-password').value = acc.password || '';
  document.getElementById('field-password').type = 'password';
  document.getElementById('field-url').value = acc.url || '';
  document.getElementById('field-category').value = acc.category || 'Lainnya';
  document.getElementById('field-notes').value = acc.notes || '';
  document.getElementById('field-favorite').checked = !!acc.favorite;
  document.getElementById('modal-detail').hidden = true;
  document.getElementById('modal-form').hidden = false;
}

on('btn-toggle-password', 'click', () => {
  const input = document.getElementById('field-password');
  input.type = input.type === 'password' ? 'text' : 'password';
});

on('account-form', 'submit', async (e) => {
  e.preventDefault();
  const serviceName = document.getElementById('field-service').value.trim();
  if (!serviceName) { showToast('Nama layanan wajib diisi'); return; }

  const id = document.getElementById('field-id').value || makeId();
  const existing = state.accounts.find((a) => a.id === id);

  const account = {
    id,
    serviceName,
    username: document.getElementById('field-username').value.trim(),
    password: document.getElementById('field-password').value,
    url: document.getElementById('field-url').value.trim(),
    category: document.getElementById('field-category').value,
    icon: serviceName.slice(0, 1).toUpperCase(),
    notes: document.getElementById('field-notes').value.trim(),
    favorite: document.getElementById('field-favorite').checked,
    createdAt: existing ? existing.createdAt : nowIso(),
    updatedAt: nowIso(),
  };

  await putAccount(account);
  await refreshAccounts();
  document.getElementById('modal-form').hidden = true;
  showToast(existing ? 'Akun diperbarui ✓' : 'Akun disimpan ✓');
});

/* =========================================================
   DETAIL MODAL
   ========================================================= */
function openDetail(id) {
  const acc = state.accounts.find((a) => a.id === id);
  if (!acc) return;
  state.activeDetailId = id;

  document.getElementById('detail-service-name').textContent = acc.serviceName;
  document.getElementById('detail-username').textContent = acc.username || '-';
  document.getElementById('detail-password').textContent = '••••••••••';
  document.getElementById('detail-password').dataset.revealed = 'false';
  document.getElementById('detail-password').dataset.value = acc.password || '';

  const urlEl = document.getElementById('detail-url');
  if (acc.url) {
    urlEl.textContent = acc.url.replace(/^https?:\/\//, '');
    urlEl.href = acc.url;
  } else {
    urlEl.textContent = '-';
    urlEl.removeAttribute('href');
  }
  document.getElementById('detail-notes').textContent = acc.notes || '-';

  const favBtn = document.getElementById('btn-detail-favorite');
  favBtn.innerHTML = acc.favorite
    ? '<svg class="icon icon-sm"><use href="#icon-star-filled"></use></svg> Favorit'
    : '<svg class="icon icon-sm"><use href="#icon-star"></use></svg> Favorit';

  document.getElementById('modal-detail').hidden = false;
}
on('btn-close-detail', 'click', () => {
  document.getElementById('modal-detail').hidden = true;
});

on('btn-toggle-detail-password', 'click', () => {
  const el = document.getElementById('detail-password');
  const revealed = el.dataset.revealed === 'true';
  el.textContent = revealed ? '••••••••••' : (el.dataset.value || '(kosong)');
  el.dataset.revealed = revealed ? 'false' : 'true';
});

on('btn-copy-username', 'click', async () => {
  const acc = state.accounts.find((a) => a.id === state.activeDetailId);
  if (!acc || !acc.username) { showToast('Tidak ada username untuk disalin'); return; }
  const ok = await copyToClipboard(acc.username);
  showToast(ok ? 'Tersalin ✓' : 'Tidak bisa menyalin otomatis. Silakan salin secara manual.');
});
on('btn-copy-password', 'click', async () => {
  const acc = state.accounts.find((a) => a.id === state.activeDetailId);
  if (!acc || !acc.password) { showToast('Tidak ada password untuk disalin'); return; }
  const ok = await copyToClipboard(acc.password);
  showToast(ok ? 'Password disalin ✓' : 'Tidak bisa menyalin otomatis. Silakan salin secara manual.');
});

on('btn-detail-favorite', 'click', async () => {
  const acc = state.accounts.find((a) => a.id === state.activeDetailId);
  if (!acc) return;
  acc.favorite = !acc.favorite;
  acc.updatedAt = nowIso();
  await putAccount(acc);
  await refreshAccounts();
  document.getElementById('btn-detail-favorite').innerHTML = acc.favorite
    ? '<svg class="icon icon-sm"><use href="#icon-star-filled"></use></svg> Favorit'
    : '<svg class="icon icon-sm"><use href="#icon-star"></use></svg> Favorit';
});

on('btn-edit-account', 'click', () => {
  const acc = state.accounts.find((a) => a.id === state.activeDetailId);
  if (acc) openEditForm(acc);
});

on('btn-delete-account', 'click', () => {
  askConfirm('Hapus akun?', 'Data akun ini akan dihapus dari perangkat ini.', async () => {
    await deleteAccountById(state.activeDetailId);
    await refreshAccounts();
    document.getElementById('modal-detail').hidden = true;
    showToast('Akun dihapus ✓');
  });
});

/* =========================================================
   GENERIC CONFIRM MODAL
   ========================================================= */
function askConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  state.pendingDeleteAction = onConfirm;
  document.getElementById('modal-confirm').hidden = false;
}
on('btn-confirm-cancel', 'click', () => {
  document.getElementById('modal-confirm').hidden = true;
  state.pendingDeleteAction = null;
});
on('btn-confirm-ok', 'click', async () => {
  const action = state.pendingDeleteAction;
  document.getElementById('modal-confirm').hidden = true;
  state.pendingDeleteAction = null;
  if (action) await action();
});

/* =========================================================
   SETTINGS: export / import / delete all / autolock
   ========================================================= */
on('btn-export', 'click', async () => {
  const data = { app: 'SANDI', version: 1, exportedAt: nowIso(), accounts: state.accounts };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sandi-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data berhasil di-export ✓');
});

on('btn-import', 'click', () => {
  document.getElementById('import-file-input').click();
});

let pendingImportData = null;
on('import-file-input', 'change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.accounts)) throw new Error('invalid');
      pendingImportData = parsed.accounts;
      document.getElementById('modal-import-confirm').hidden = false;
    } catch (err) {
      showToast('File backup tidak valid.');
    }
    e.target.value = '';
  };
  reader.onerror = () => showToast('File backup tidak valid.');
  reader.readAsText(file);
});
on('btn-import-cancel', 'click', () => {
  document.getElementById('modal-import-confirm').hidden = true;
  pendingImportData = null;
});
on('btn-import-ok', 'click', async () => {
  if (pendingImportData) {
    for (const acc of pendingImportData) {
      if (!acc.id) acc.id = makeId();
      await putAccount(acc);
    }
    await refreshAccounts();
    showToast('Data berhasil dipulihkan.');
  }
  document.getElementById('modal-import-confirm').hidden = true;
  pendingImportData = null;
});

on('btn-delete-all', 'click', () => {
  askConfirm('Hapus semua data?', 'Semua akun tersimpan akan dihapus permanen dari perangkat ini.', async () => {
    await clearAllAccounts();
    await refreshAccounts();
    showToast('Semua data dihapus ✓');
  });
});

on('autolock-select', 'change', (e) => {
  localStorage.setItem(LS_AUTOLOCK, e.target.value);
  resetAutoLockTimer();
});

/* =========================================================
   SAMPLE DATA (first launch)
   ========================================================= */
on('btn-skip-sample', 'click', () => {
  document.getElementById('modal-sample-data').hidden = true;
});
on('btn-use-sample', 'click', async () => {
  const samples = [
    { id: makeId(), serviceName: 'Google', username: 'demo@example.com', password: 'demo1234', url: 'https://google.com', category: 'Email', icon: 'G', notes: 'Contoh akun', favorite: true, createdAt: nowIso(), updatedAt: nowIso() },
    { id: makeId(), serviceName: 'Canva', username: 'demo@example.com', password: 'demo1234', url: 'https://canva.com', category: 'Desain', icon: 'C', notes: 'Contoh akun', favorite: false, createdAt: nowIso(), updatedAt: nowIso() },
  ];
  for (const s of samples) await putAccount(s);
  await refreshAccounts();
  document.getElementById('modal-sample-data').hidden = true;
  showToast('Contoh data ditambahkan ✓');
});

/* =========================================================
   BOOT
   ========================================================= */
async function refreshAccounts() {
  state.accounts = await getAllAccounts();
  if (state.currentView === 'dashboard') renderDashboard();
  if (state.currentView === 'favorite') renderFavoriteList();
}

async function boot() {
  await refreshAccounts();
  renderDashboard();

  const autolockVal = localStorage.getItem(LS_AUTOLOCK) || '5';
  document.getElementById('autolock-select').value = autolockVal;
}

function init() {
  const theme = localStorage.getItem(LS_THEME) || 'light';
  applyTheme(theme);

  openDB().then(() => {
    initAuthFlow();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* offline support degrades gracefully if SW fails */
      });
    });
  }
}

init();
