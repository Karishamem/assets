#!/usr/bin/env node
// Генерирует персональные страницы-приглашения из guests.json.
// Запуск: node wedding/build.js
// Результат: wedding/index.html (общая страница), wedding/<slug>/index.html
// для каждого гостя и wedding/links.md со списком ссылок для рассылки.

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(dir, 'guests.json'), 'utf8'));
const template = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const { couple } = data;
const event = data.event || {};

const GREETINGS = { m: 'Дорогой', f: 'Дорогая', pair: 'Дорогие', family: 'Дорогие' };
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
// Текст с абзацами: пустая строка или \n в JSON — новый абзац.
const paras = (s) => String(s ?? '').split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const slugify = (s) => s.toLowerCase()
  .split('').map((c) => TRANSLIT[c] ?? c).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ---------- Иконки (линейные, цвет берут из currentColor) ----------
const svg = (body, vb = '0 0 48 48') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICONS = {
  glasses: svg('<path d="M13 8h9l-1 10a3.5 3.5 0 0 1-7 0z" transform="rotate(-12 17 14)"/><path d="M26 8h9l-1 10a3.5 3.5 0 0 1-7 0z" transform="rotate(12 31 14)"/><path d="M18.5 22l-1.5 16M14 39h6M29.5 22l1.5 16M28 39h6"/><path d="M24 4v3M20 5l1.5 2.5M28 5l-1.5 2.5"/>'),
  rings: svg('<circle cx="19" cy="28" r="10"/><circle cx="29" cy="28" r="10"/><path d="M15 15l4-5 4 5-4 3z"/>'),
  dinner: svg('<circle cx="24" cy="25" r="11"/><circle cx="24" cy="25" r="7"/><path d="M7 12v8a2 2 0 0 0 4 0v-8M9 20v18M41 12c-3 2-3 9 0 11v15"/>'),
  cake: svg('<rect x="12" y="30" width="24" height="9" rx="1"/><rect x="15" y="22" width="18" height="8" rx="1"/><rect x="18" y="15" width="12" height="7" rx="1"/><path d="M8 39h32M24 15v-4M24 8c1 1 1 2 0 3-1-1-1-2 0-3z"/>'),
  candles: svg('<rect x="13" y="20" width="6" height="18" rx="1"/><rect x="27" y="16" width="6" height="22" rx="1"/><path d="M10 40h28M16 20v-3M30 16v-3"/><path d="M16 9c2 2 2 5 0 6-2-1-2-4 0-6zM30 5c2 2 2 5 0 6-2-1-2-4 0-6z"/>'),
  dance: svg('<path d="M18 34V12l16-4v22"/><circle cx="14" cy="34" r="4"/><circle cx="30" cy="30" r="4"/><path d="M18 18l16-4"/>'),
  camera: svg('<rect x="6" y="15" width="36" height="23" rx="3"/><circle cx="24" cy="26" r="7"/><path d="M17 15l3-5h8l3 5"/>'),
  fireworks: svg('<path d="M24 26v14M24 22l-8-8M24 22l8-8M24 20V8M20 22H8M28 22h12M18 28l-6 6M30 28l6 6"/><circle cx="24" cy="22" r="1.5"/>'),
  envelope: svg('<rect x="6" y="12" width="36" height="25" rx="2"/><path d="M6 14l18 13 18-13"/><path d="M24 23c-2-3-6-2-5 1 1 2 5 4 5 4s4-2 5-4c1-3-3-4-5-1z" fill="currentColor" stroke="none"/>'),
  flower: svg('<circle cx="24" cy="16" r="4"/><path d="M24 12c-3-5 3-7 3-3M28 16c5-3 7 3 3 3M24 20c3 5-3 7-3 3M20 16c-5 3-7-3-3-3"/><path d="M24 20v20M24 30c-4-1-7-5-8-8 4 0 7 3 8 8zM24 34c4-1 7-5 8-8-4 0-7 3-8 8z"/>'),
  heart: svg('<path d="M24 40S7 29 7 18a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 11-17 22-17 22z"/>'),
  people: svg('<circle cx="17" cy="16" r="5"/><circle cx="31" cy="16" r="5"/><path d="M7 38c0-7 4-12 10-12s10 5 10 12M21 38c0-7 4-12 10-12s10 5 10 12"/>'),
  kids: svg('<circle cx="16" cy="13" r="5"/><path d="M8 40c0-9 3-15 8-15s8 6 8 15"/><circle cx="33" cy="22" r="4"/><path d="M27 40c0-7 2-11 6-11s6 4 6 11"/>'),
  allergy: svg('<path d="M10 38C10 20 22 10 40 8c-2 18-12 30-30 30z"/><path d="M10 38l18-18M18 30h-6M22 26v-7M27 21h6"/>'),
  bus: svg('<rect x="8" y="10" width="32" height="24" rx="4"/><path d="M8 24h32M14 34v4M34 34v4M24 10v14"/><circle cx="15" cy="29" r="1.5" fill="currentColor"/><circle cx="33" cy="29" r="1.5" fill="currentColor"/>'),
  bed: svg('<path d="M6 36V12M6 28h36v8M42 28v-6a5 5 0 0 0-5-5H22v11"/><circle cx="14" cy="22" r="4"/>'),
  note: svg('<path d="M18 34V12l18-4v22"/><circle cx="14" cy="34" r="4"/><circle cx="32" cy="30" r="4"/>'),
  pen: svg('<path d="M30 8l10 10-20 20H10V28z"/><path d="M26 12l10 10"/>'),
  yes: svg('<path d="M24 40S7 29 7 18a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 11-17 22-17 22z"/><path d="M17 23l5 5 9-10"/>'),
  no: svg('<path d="M14 30c-6-3-8-12-2-15 4-2 7 0 9 3M34 30c6-3 8-12 2-15-4-2-7 0-9 3"/><path d="M24 22l-3 6 5 2-3 8"/>'),
  organizer: svg('<circle cx="24" cy="15" r="7"/><path d="M10 40c0-8 6-14 14-14s14 6 14 14"/><path d="M33 9l4-3M35 15h5"/>'),
};


// Иллюстрация усадьбы для блока «Локация»
const MANOR = `<div class="manor"><svg viewBox="0 0 380 200" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3550"/><stop offset=".6" stop-color="#6d6a8a"/><stop offset="1" stop-color="#d8b9a8"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4e63"/><stop offset="1" stop-color="#2a2e3e"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe2a6" stop-opacity=".9"/><stop offset="1" stop-color="#ffe2a6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="380" height="200" fill="url(#sky)"/>
  <g fill="#fff" opacity=".8"><circle cx="40" cy="22" r="1"/><circle cx="90" cy="40" r=".8"/><circle cx="300" cy="18" r="1"/><circle cx="340" cy="44" r=".7"/><circle cx="210" cy="14" r=".8"/></g>
  <g fill="#232a24">
    <path d="M18 140c0-30 6-60 12-80 6 20 12 50 12 80z"/><path d="M44 140c0-26 5-50 10-66 5 16 10 40 10 66z"/>
    <path d="M318 140c0-26 5-50 10-66 5 16 10 40 10 66z"/><path d="M340 140c0-30 6-60 12-80 6 20 12 50 12 80z"/>
    <ellipse cx="90" cy="128" rx="26" ry="20"/><ellipse cx="290" cy="128" rx="26" ry="20"/>
  </g>
  <ellipse cx="190" cy="118" rx="140" ry="40" fill="url(#glow)"/>
  <g>
    <rect x="96" y="96" width="188" height="44" fill="#e9dfcc"/>
    <path d="M90 98l100-22 100 22z" fill="#4b4f5e"/>
    <rect x="164" y="80" width="52" height="60" fill="#f1e8d6"/>
    <path d="M158 82l32-16 32 16z" fill="#e9dfcc"/><path d="M158 82l32-16 32 16" stroke="#cbbd9f" fill="none"/>
    <g fill="#c9ba98"><rect x="168" y="86" width="4" height="54"/><rect x="180" y="86" width="4" height="54"/><rect x="196" y="86" width="4" height="54"/><rect x="208" y="86" width="4" height="54"/></g>
    <g fill="#ffd98a">${Array.from({ length: 8 }, (_, i) => `<rect x="${104 + i * 22 + (i > 3 ? 40 : 0)}" y="106" width="9" height="13" rx="4"/>`).join('')}
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${104 + i * 22 + (i > 3 ? 40 : 0)}" y="124" width="9" height="12" rx="1"/>`).join('')}</g>
    <rect x="186" y="118" width="8" height="22" fill="#ffd98a"/>
  </g>
  <rect y="140" width="380" height="60" fill="url(#water)"/>
  <g opacity=".35"><rect x="96" y="142" width="188" height="26" fill="#e9dfcc"/>
    <g fill="#ffd98a">${Array.from({ length: 8 }, (_, i) => `<rect x="${104 + i * 22 + (i > 3 ? 40 : 0)}" y="146" width="9" height="10"/>`).join('')}</g></g>
  <g stroke="#ffd98a" stroke-opacity=".5">${Array.from({ length: 7 }, (_, i) => `<path d="M${120 + i * 24} ${172 + (i % 3) * 6}h${10 + (i % 2) * 8}"/>`).join('')}</g>
  <g fill="#ffe7b0">${Array.from({ length: 13 }, (_, i) => `<circle cx="${70 + i * 20}" cy="141" r="1.6"/>`).join('')}</g>
</svg></div>`;
// Иконки Phosphor (MIT, https://phosphoricons.com) лежат в wedding/icons.
const ph = (file) => fs.readFileSync(path.join(dir, 'icons', `${file}.svg`), 'utf8')
  .trim().replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg aria-hidden="true" ');
Object.assign(ICONS, {
  glasses: ph('champagne-light'), dinner: ph('fork-knife-light'), cake: ph('cake-light'),
  dance: ph('music-notes-light'), note: ph('music-notes-light'), camera: ph('camera-light'),
  envelope: ph('gift-light'), flower: ph('flower-light'), heart: ph('heart-light'),
  people: ph('users-light'), kids: ph('baby-light'), allergy: ph('leaf-light'), bus: ph('bus-light'),
  bed: ph('bed-light'), pen: ph('pencil-simple-light'), yes: ph('hand-heart-light'), no: ph('heart-break-light'),
  organizer: ph('sparkle-light'), drinks: ph('wine-light'), fireworks: ph('confetti-light'),
});
const icon = (name) => ICONS[name] || ICONS.heart;


// Рукописный шрифт встраиваем прямо в страницу, чтобы он работал по любой ссылке.
const FONT_FACE = `@font-face {
  font-family: "Allegretto Script One";
  src: url(data:font/woff2;base64,${fs.readFileSync(path.join(dir, 'fonts', 'AllegrettoScriptOne.woff2')).toString('base64')}) format("woff2");
  font-display: swap;
}`;

const SOCIAL = { phone: ph('phone-fill'), whatsapp: ph('whatsapp-logo-fill'), telegram: ph('telegram-logo-fill') };




// ---------- Конверт ----------
const PAPER_NOISE = '<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .3  0 0 0 0 .3  0 0 0 .08 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>';
const ENVELOPE_SVG = `<svg class="env-back" viewBox="0 0 420 290" preserveAspectRatio="none" aria-hidden="true">
        <defs>${PAPER_NOISE}<linearGradient id="inside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e0a1c"/><stop offset="1" stop-color="#8c1230"/></linearGradient></defs>
        <rect width="420" height="290" rx="6" fill="url(#inside)"/>
      </svg>`;
const ENVELOPE_FRONT = `<svg class="env-front" viewBox="0 0 420 290" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="#f6ebe6"/><stop offset="1" stop-color="#e9d8d1"/></linearGradient>
          <linearGradient id="fr" x1="1" x2="0"><stop offset="0" stop-color="#f6ebe6"/><stop offset="1" stop-color="#e6d3cb"/></linearGradient>
          <linearGradient id="fb" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fbf3ef"/><stop offset="1" stop-color="#efe1db"/></linearGradient>
        </defs>
        <path d="M0 6Q0 0 6 0L200 150Q210 158 220 150L414 0Q420 0 420 6V284Q420 290 414 290H6Q0 290 0 284Z" fill="url(#fl)"/>
        <path d="M420 6L220 150Q210 158 200 150L0 6V284Q0 290 6 290H414Q420 290 420 284Z" fill="url(#fr)" opacity=".55"/>
        <path d="M0 290L196 136Q210 126 224 136L420 290Z" fill="url(#fb)"/>
        <path d="M0 290L196 136Q210 126 224 136L420 290" fill="none" stroke="#c9a9a0" stroke-opacity=".6" stroke-width="1"/>
        <path d="M2 4L200 150M418 4L220 150" stroke="#c9a9a0" stroke-opacity=".4" stroke-width="1"/>
        <rect width="420" height="290" rx="6" filter="url(#paper)" fill="#fff"/>
      </svg>`;
const ENVELOPE_FLAP = `<svg class="flap" viewBox="0 0 420 290" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="ft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ead9d2"/><stop offset="1" stop-color="#f8eee9"/></linearGradient>
        <filter id="fs" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#4a1020" flood-opacity=".25"/></filter></defs>
        <path d="M0 4Q0 0 6 0H414Q420 0 420 4L228 160Q210 174 192 160Z" fill="url(#ft)" filter="url(#fs)"/>
        <path d="M0 4Q0 0 6 0H414Q420 0 420 4L228 160Q210 174 192 160Z" filter="url(#paper)" fill="#fff"/>
      </svg>`;
// Сургучная печать неровной формы с монограммой
function sealSvg(initials) {
  const pts = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 46 + (Math.sin(i * 2.7) * 3 + Math.cos(i * 5.3) * 2.5);
    pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p1 = pts[(i + 1) % N];
    const m = [(pts[i][0] + p1[0]) / 2, (pts[i][1] + p1[1]) / 2];
    d += `Q${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return `<svg viewBox="-4 -4 108 108" aria-hidden="true">
        <defs>
          <radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#c0405c"/><stop offset=".55" stop-color="#8c1230"/><stop offset="1" stop-color="#4f0716"/></radialGradient>
          <radialGradient id="wax2" cx=".6" cy=".65" r=".6"><stop offset="0" stop-color="#6c0c23"/><stop offset="1" stop-color="#9c2340"/></radialGradient>
          <filter id="ws"><feDropShadow dx="1" dy="3" stdDeviation="2.5" flood-color="#200008" flood-opacity=".5"/></filter>
        </defs>
        <path d="${d}Z" fill="url(#wax)" filter="url(#ws)"/>
        <circle cx="50" cy="50" r="33" fill="url(#wax2)"/>
        <circle cx="50" cy="50" r="33" fill="none" stroke="#3a0410" stroke-opacity=".5" stroke-width="1.5"/>
        <circle cx="50" cy="50" r="28" fill="none" stroke="#f3c3cd" stroke-opacity=".45" stroke-width=".8" stroke-dasharray="1 3"/>
        <text x="50" y="58" text-anchor="middle" font-family="Allegretto Script One, Marck Script, cursive" font-size="24" fill="#3a0410" fill-opacity=".55">${esc(initials)}</text>
        <text x="49.4" y="57.2" text-anchor="middle" font-family="Allegretto Script One, Marck Script, cursive" font-size="24" fill="#fbe3e8" fill-opacity=".85">${esc(initials)}</text>
        <ellipse cx="34" cy="28" rx="10" ry="5" transform="rotate(-35 34 28)" fill="#fff" fill-opacity=".22"/>
      </svg>`;
}

// Атласный бантик
let bowId = 0;
function bow() {
  const id = `rb${bowId++}`;
  return `<svg viewBox="0 0 140 172" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b42a48"/><stop offset=".45" stop-color="#8c1230"/><stop offset="1" stop-color="#5a0819"/></linearGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      </defs>
      <path d="M64 56C58 84 38 102 44 130c4 18-8 30-16 38l12 3c8-10 22-22 16-42-4-22 12-44 14-71z" fill="url(#${id})"/>
      <path d="M76 56c8 30 30 44 26 70-2 16 10 28 18 38l-11 4c-8-12-20-22-17-40 3-22-18-40-22-70z" fill="url(#${id})"/>
      <path d="M70 50C50 20 16 6 10 30c-4 22 30 32 60 24z" fill="url(#${id})"/>
      <path d="M70 50C92 18 128 8 131 32c3 22-32 30-61 22z" fill="url(#${id})"/>
      <path d="M70 50C52 32 28 22 18 30" fill="none" stroke="#4a0614" stroke-opacity=".5" stroke-width="2"/>
      <path d="M70 50C90 32 114 22 124 30" fill="none" stroke="#4a0614" stroke-opacity=".5" stroke-width="2"/>
      <path d="M14 26c8-12 26-8 40 6" fill="none" stroke="url(#${id}s)" stroke-width="5" stroke-linecap="round"/>
      <path d="M126 26c-8-12-26-8-40 6" fill="none" stroke="url(#${id}s)" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="70" cy="53" rx="10" ry="9" fill="#7a0f27"/>
      <ellipse cx="67" cy="50" rx="4" ry="3" fill="#fff" fill-opacity=".25"/>
    </svg>`;
}

const HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21.5S0 14 0 6.5A6 6 0 0 1 12 4a6 6 0 0 1 12 2.5C24 14 12 21.5 12 21.5z" fill="currentColor"/></svg>';
const BIG_HEART = '<svg viewBox="0 0 78 70" aria-hidden="true"><path d="M39 68S2 47 2 22A19 19 0 0 1 39 13a19 19 0 0 1 37 9c0 25-37 46-37 46z" fill="currentColor"/></svg>';

// Картинки (фон, фото пары и площадки) встраиваем в страницу, чтобы они открывались по любой ссылке.
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
function dataUri(file) {
  if (!file) return '';
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) { console.warn(`Нет файла ${file}, пропускаю`); return ''; }
  return `data:${MIME[path.extname(file).toLowerCase()] || 'image/jpeg'};base64,${fs.readFileSync(full).toString('base64')}`;
}

// Дата свадьбы без учёта часового пояса: берём YYYY-MM-DD из строки.
function weddingDay() {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(event.date || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

// Первая буква строки крупно и бордовым, как в образце.
const capFirst = (s) => { const t = esc(s); return t ? `<b class="cap">${t[0]}</b>${t.slice(1)}` : ''; };

function hero(greeting, names) {
  const parts = names.split(/\s+и\s+/);
  const nameHtml = parts.length === 2
    ? `<span>${capFirst(parts[0])}</span><i>&amp;</i><span>${capFirst(parts[1])}</span>`
    : `<span>${capFirst(names)}</span>`;
  const photos = (couple.photos || []).map(dataUri).filter(Boolean);
  const frame = (cls, i) => photos[i]
    ? `<div class="photo ${cls}"><img src="${photos[i]}" alt="${esc(couple.groom)} и ${esc(couple.bride)}"></div>`
    : `<div class="photo ${cls}"><div class="ph">${i === 0 ? HEART : ''}<span>${i === 0 ? esc(couple.groom[0]) : esc(couple.bride[0])}</span></div></div>`;
  const line = Array(6).fill('I love you').join('   ');
  return `<section class="panel hero">
      ${greeting ? `<p class="dear">${esc(greeting)}</p>` : ''}
      <h1 class="guest-names">${nameHtml}</h1>
      <div class="loves" aria-hidden="true">
        <div class="lines">${Array(12).fill(`<span>${line}</span>`).join('')}</div>
        ${frame('p1', 0)}${frame('p2', 1)}
      </div>
    </section>`;
}

function intro(message) {
  return `<section class="panel">
      <h2>${esc(data.introTitle || 'Мы женимся!')}</h2>
      <div class="text">${paras(message)}</div>
    </section>`;
}

function ourDay() {
  const wd = weddingDay();
  if (!wd) return '';
  const days = [];
  for (let i = -2; i <= 2; i++) {
    const d = new Date(Date.UTC(wd.y, wd.m - 1, wd.d + i)).getUTCDate();
    days.push(i === 0 ? `<span class="on" aria-label="${d}, наш день">${BIG_HEART}<em>${d}</em></span>` : `<span>${d}</span>`);
  }
  const items = (data.program || []).map((p) => `<li><span class="heart">${HEART}</span><div class="item"><time>${esc(p.time)}</time><b>${esc(p.title)}</b></div></li>`).join('');
  return `<section class="panel">
      <h2>${esc(data.dayTitle || 'Наш день')}</h2>
      <p class="month">${MONTHS[wd.m - 1]}</p>
      <p class="year">${wd.y}</p>
      <div class="days">${days.join('')}</div>
      ${items ? `<ol class="timeline">${items}</ol>` : ''}
      ${location()}
    </section>`;
}

function location() {
  if (!event.place && !event.address) return '';
  const photo = dataUri(event.photo);
  return `<div class="block">
        <h2>Ждём вас</h2>
        <p class="text">${esc(event.locationText || 'по адресу:')}<br>${event.place ? `${esc(event.place)}, ` : ''}${esc(event.address)}</p>
        <div class="venue">${photo ? `<img src="${photo}" alt="${esc(event.place)}" loading="lazy">` : MANOR}</div>
        ${event.mapUrl ? `<a class="pill" href="${esc(event.mapUrl)}" target="_blank" rel="noopener">посмотреть на карте</a>` : ''}
      </div>`;
}

function dressCode() {
  const dc = data.dressCode;
  if (!dc) return '';
  const sw = (dc.colors || []).map((c) => `<li style="background:${esc(c)}"></li>`).join('');
  return `<section class="panel">
      <span class="bow left">${bow()}</span>
      <h2>Дресс-код</h2>
      <div class="text">${paras(dc.text)}</div>
      ${sw ? `<ul class="swatches" aria-label="Цвета праздника">${sw}</ul>` : ''}
    </section>`;
}

function giftsAndChat() {
  const w = data.wishes || [];
  const chat = data.chat;
  if (!w.length && !chat) return '';
  const wishHtml = w.map((x) => `<h2>${esc(x.title)}</h2><div class="text">${paras(x.text)}</div>`).join('');
  const chatHtml = chat ? `<h2>${esc(chat.title || 'Чат')}</h2><div class="text">${paras(chat.text)}</div>
        ${chat.url ? `<a class="pill" href="${esc(chat.url)}" target="_blank" rel="noopener">присоединиться</a>` : ''}` : '';
  return `<section class="panel"><div class="block">${wishHtml}${chatHtml}</div></section>`;
}

function countdown() {
  if (!event.date) return '';
  return `<section class="panel countdown">
      <h2>Увидимся с вами через…</h2>
      <div class="units" id="countdown" aria-live="off"></div>
      <span class="bow right">${bow()}</span>
    </section>`;
}

function organiser() {
  const o = data.organizer;
  if (!o) return '';
  const digits = (o.phone || '').replace(/[^\d+]/g, '');
  const links = [];
  if (digits) links.push(`<a href="tel:${esc(digits)}" aria-label="Позвонить">${SOCIAL.phone}</a>`);
  if (o.whatsapp) links.push(`<a href="https://wa.me/${esc(o.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener" aria-label="WhatsApp">${SOCIAL.whatsapp}</a>`);
  if (o.telegram) links.push(`<a href="https://t.me/${esc(o.telegram.replace(/^@/, ''))}" target="_blank" rel="noopener" aria-label="Telegram">${SOCIAL.telegram}</a>`);
  return `<section class="panel">
      <h2>Организатор</h2>
      <div class="text">
        <p>${esc(o.text || 'Если появятся вопросы, обращайтесь к нашему свадебному организатору:')}</p>
        ${o.name ? `<p><b>${esc(o.name)}</b></p>` : ''}
        ${o.phone ? `<p class="phone">${esc(o.phone)}</p>` : ''}
      </div>
      ${links.length ? `<div class="socials">${links.join('')}</div>` : ''}
    </section>`;
}

function rsvp(guest) {
  const r = data.rsvp;
  if (!r) return '';
  const many = guest && (guest.type === 'pair' || guest.type === 'family');
  const tick = ph('check-bold').replace('<svg ', '<svg class="tick" ');
  const chip = (type, name, value, label = value) => `<label class="chip"><input type="${type}" name="${name}" value="${esc(value)}"><span>${tick}${esc(label)}</span></label>`;
  const card = (ic, title, hint, body, forId) => `<div class="q-card">
            <div class="q-head">${ICONS[ic]}<${forId ? `label for="${forId}"` : 'p'} class="q-title">${title}${hint ? `<small>${hint}</small>` : ''}</${forId ? 'label' : 'p'}></div>
            ${body}
          </div>`;
  const yesNo = (name, yes, no) => `<div class="chips">${chip('radio', name, 'Да', yes)}${chip('radio', name, 'Нет', no)}</div>`;
  const cards = [];
  cards.push(card('people', guest ? 'Кто придёт' : 'Ваше имя и фамилия', guest ? 'Поправьте, если придёте не все или со спутником' : '',
    `<input type="text" id="names" name="names" value="${guest ? esc(guest.names) : ''}" autocomplete="name">`, 'names'));
  if (r.askKids) cards.push(card('kids', 'Будете ли вы с детьми?', 'Если да, напишите, сколько им лет',
    `${yesNo('kids', 'Да, с детьми', 'Нет')}<input type="text" id="kidsInfo" name="kidsInfo" aria-label="Сколько детей и сколько им лет" placeholder="Например: 2 ребёнка, 4 и 9 лет">`));
  if (r.mains && r.mains.length) cards.push(card('dinner', 'Какое горячее предпочитаете?', '',
    `<div class="chips">${r.mains.map((m) => chip('radio', 'main', m)).join('')}</div>`));
  if (r.drinks && r.drinks.length) cards.push(card('drinks', 'Что будете пить?', 'Можно выбрать несколько',
    `<div class="chips">${r.drinks.map((d) => chip('checkbox', 'drinks', d)).join('')}</div>`));
  cards.push(card('allergy', 'Есть ли аллергии или ограничения в еде?', '',
    `<input type="text" id="food" name="food" placeholder="Например: не ем орехи, без глютена">`, 'food'));
  if (r.askTransfer) cards.push(card('bus', 'Нужен ли трансфер?', 'Организуем автобус от города и обратно',
    yesNo('transfer', 'Да, нужен', 'Нет, доберёмся сами')));
  if (r.askStay) cards.push(card('bed', 'Нужна ли помощь с ночлегом?', '', yesNo('stay', 'Да, нужна', 'Нет')));
  if (r.askSong) cards.push(card('note', 'Какая песня точно поднимет вас на танцпол?', 'Добавим в плейлист вечера',
    `<input type="text" id="song" name="song" placeholder="Исполнитель и название">`, 'song'));

  return `<section class="panel" id="anketa">
      <h2>Анкета гостя</h2>
      <p class="text">Чтобы мы всё подготовили и позаботились о вашем комфорте, заполните, пожалуйста, анкету${r.deadline ? ` до ${esc(r.deadline)}` : ''}.</p>
      <form class="rsvp" id="rsvp" novalidate>
        <div class="q-card">
          <div class="q-head">${ICONS.heart}<p class="q-title">Сможете ли Вы прийти?</p></div>
          <div class="attend">
            <label class="chip"><input type="radio" name="attend" value="Придёт"><span>${ICONS.yes}${many ? 'Да, с удовольствием придём!' : 'Да, с удовольствием приду!'}</span></label>
            <label class="chip"><input type="radio" name="attend" value="Не придёт"><span>${ICONS.no}${many ? 'К сожалению, не сможем' : 'К сожалению, не смогу'}</span></label>
          </div>
        </div>
        <div class="when-yes">
          ${cards.join('\n          ')}
        </div>
        ${card('pen', 'Пожелание молодым', 'Или любой комментарий для нас',
          '<textarea id="comment" name="comment" rows="3"></textarea>', 'comment')}
        <div class="actions">
          <button class="btn" type="submit">Отправить анкету</button>
          <p class="status" role="status" aria-live="polite"></p>
        </div>
      </form>
      <div class="thanks" id="rsvp-thanks" hidden>
        <p class="big"></p><p class="small"></p>
        <button class="btn ghost" type="button" id="rsvp-again">Изменить ответ</button>
      </div>
    </section>`;
}

function closing() {
  return `<section class="panel">
      <p class="signature">${esc(couple.signature)}</p>
      <button class="replay" id="replay" type="button">${ph('arrow-counter-clockwise-light')}Открыть конверт заново</button>
    </section>`;
}

const BG = dataUri(data.background || 'bg.jpg');

function render({ greeting, names, envelopeNames, message, title, guest }) {
  bowId = 0;
  const content = [
    hero(greeting, names), intro(message), ourDay(), dressCode(), giftsAndChat(), countdown(),
    rsvp(guest), organiser(), closing(),
  ].filter(Boolean).map((s) => `    ${s}`).join('\n');
  const vars = {
    TITLE: esc(title),
    DESCRIPTION: esc(`${couple.groom} и ${couple.bride} приглашают на свадьбу, ${event.dateText || ''}`),
    INITIALS: esc(couple.initials),
    ENVELOPE_NAMES: esc(envelopeNames),
    ENVELOPE_SVG,
    ENVELOPE_FRONT,
    ENVELOPE_FLAP,
    SEAL_SVG: sealSvg(couple.initials),
    BOW: bow(),
    BG_IMAGE: BG ? `url(${BG})` : '',
    HAND_ICON: ph('hand-pointing-light'),
    FONT_FACE,
    COUPLE_SHORT: `${esc(couple.groom)} &amp; ${esc(couple.bride)}`,
    CONTENT: content,
    EVENT_DATE: JSON.stringify(event.date || null),
    RSVP_CONFIG: JSON.stringify({
      endpoint: (data.rsvp && data.rsvp.endpoint) || '',
      guest: guest ? guest.names : 'Общая страница',
    }).replace(/</g, '\\u003c'),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? vars[key] : m));
}

// Удаляем старые сгенерированные папки, чтобы переименованные гости не оставались.
const MARK = '.generated';
for (const name of fs.readdirSync(dir)) {
  const p = path.join(dir, name);
  if (fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, MARK))) {
    fs.rmSync(p, { recursive: true });
  }
}

const base = (data.siteUrl || '').replace(/\/?$/, '/');
const links = [];
const seen = new Set();

fs.writeFileSync(path.join(dir, 'index.html'), render({
  greeting: '',
  names: data.generalGreeting || 'Дорогие гости!',
  envelopeNames: data.generalGreeting || 'Дорогие гости!',
  message: data.defaultText,
  title: `${couple.groom} и ${couple.bride}: свадьба`,
}));

for (const g of data.guests) {
  const slug = g.slug || slugify(g.names);
  if (!slug) throw new Error(`Не получилось придумать адрес для гостя: ${g.names}`);
  if (seen.has(slug)) throw new Error(`Адрес «${slug}» повторяется, задайте разный slug`);
  seen.add(slug);

  const out = path.join(dir, slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, MARK), '');
  fs.writeFileSync(path.join(out, 'index.html'), render({
    greeting: g.greeting || GREETINGS[g.type] || 'Дорогие',
    names: g.names,
    envelopeNames: g.names,
    message: g.text || data.defaultText,
    title: `${g.names}: приглашение на свадьбу`,
    guest: g,
  }));
  links.push(`| ${g.names} | ${base}${slug}/ |`);
}

fs.writeFileSync(path.join(dir, 'links.md'),
  `# Ссылки для гостей\n\n| Гость | Ссылка |\n|---|---|\n${links.join('\n')}\n`);

console.log(`Готово: ${data.guests.length} персональных страниц + общая страница.`);
console.log('Ссылки лежат в wedding/links.md');
