// utils.js — shared helpers (plain JS, no ES modules)

const fmt = n =>
  Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';

const fmtDt = d => {
  const dt = new Date(d);
  return dt.toLocaleDateString('ru-RU') + ' ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const genId = pfx => pfx + '-' + Math.random().toString(36).slice(2, 9).toUpperCase();

const reqIdGen = pfx =>
  pfx + '-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') +
  '-' + String(Math.floor(Math.random() * 900000 + 100000));

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('cdt_theme', theme); } catch(e) {}
}

function loadTheme() {
  try { return localStorage.getItem('cdt_theme') || 'light'; } catch(e) { return 'light'; }
}

const QR_SVG = `<svg width="110" height="110" viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 10px">
  <rect width="110" height="110" fill="white" rx="4"/>
  <rect x="7" y="7" width="30" height="30" rx="2" fill="none" stroke="#185FA5" stroke-width="2.5"/>
  <rect x="13" y="13" width="18" height="18" rx="1" fill="#185FA5"/>
  <rect x="73" y="7" width="30" height="30" rx="2" fill="none" stroke="#185FA5" stroke-width="2.5"/>
  <rect x="79" y="13" width="18" height="18" rx="1" fill="#185FA5"/>
  <rect x="7" y="73" width="30" height="30" rx="2" fill="none" stroke="#185FA5" stroke-width="2.5"/>
  <rect x="13" y="79" width="18" height="18" rx="1" fill="#185FA5"/>
  <rect x="45" y="7" width="5" height="5" fill="#185FA5"/><rect x="53" y="7" width="5" height="5" fill="#185FA5"/>
  <rect x="45" y="15" width="5" height="5" fill="#185FA5"/><rect x="61" y="15" width="5" height="5" fill="#185FA5"/>
  <rect x="53" y="23" width="5" height="5" fill="#185FA5"/><rect x="45" y="31" width="5" height="5" fill="#185FA5"/>
  <rect x="45" y="45" width="5" height="5" fill="#185FA5"/><rect x="55" y="45" width="5" height="5" fill="#185FA5"/>
  <rect x="65" y="45" width="5" height="5" fill="#185FA5"/><rect x="75" y="45" width="5" height="5" fill="#185FA5"/>
  <rect x="85" y="45" width="5" height="5" fill="#185FA5"/><rect x="95" y="45" width="5" height="5" fill="#185FA5"/>
  <rect x="45" y="55" width="5" height="5" fill="#185FA5"/><rect x="75" y="55" width="5" height="5" fill="#185FA5"/>
  <rect x="45" y="65" width="5" height="5" fill="#185FA5"/><rect x="65" y="65" width="5" height="5" fill="#185FA5"/>
  <rect x="85" y="65" width="5" height="5" fill="#185FA5"/><rect x="55" y="75" width="5" height="5" fill="#185FA5"/>
  <rect x="75" y="75" width="5" height="5" fill="#185FA5"/><rect x="95" y="75" width="5" height="5" fill="#185FA5"/>
  <rect x="45" y="85" width="5" height="5" fill="#185FA5"/><rect x="65" y="85" width="5" height="5" fill="#185FA5"/>
  <rect x="85" y="85" width="5" height="5" fill="#185FA5"/><rect x="95" y="85" width="5" height="5" fill="#185FA5"/>
</svg>`;
