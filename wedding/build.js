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

// Платье и костюм для дресс-кода
const DRESS = '<svg viewBox="0 0 76 96" aria-hidden="true"><defs><linearGradient id="dg" x1="0" x2="1"><stop offset="0" stop-color="#e3a7b4"/><stop offset=".5" stop-color="#f2c6c9"/><stop offset="1" stop-color="#d993a3"/></linearGradient></defs><path d="M30 6c2 4 14 4 16 0l3 18-4 6 22 60H9l22-60-4-6z" fill="url(#dg)"/><path d="M27 24c6 3 16 3 22 0" stroke="#fff" stroke-opacity=".7" stroke-width="1.5" fill="none"/><path d="M38 30v60M30 50l-10 40M46 50l10 40" stroke="#b9707f" stroke-opacity=".3" fill="none"/></svg>';
const SUIT = '<svg viewBox="0 0 76 96" aria-hidden="true"><path d="M18 8l20 6 20-6 12 10v74H6V18z" fill="#6c7350"/><path d="M28 10l10 30 10-30-10 4z" fill="#fbf7ee"/><path d="M38 14l-3 4 3 4 3-4z" fill="#3f3a36"/><path d="M38 22l-2 20 2 4 2-4z" fill="#a58a52"/><path d="M18 8l14 34-6 6 12 44M58 8L44 42l6 6-12 44" stroke="#4d5236" stroke-width="1.5" fill="none"/><circle cx="38" cy="58" r="1.6" fill="#3f3a36"/><circle cx="38" cy="68" r="1.6" fill="#3f3a36"/><path d="M50 30l6-1" stroke="#fbf7ee" stroke-width="2"/></svg>';

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


const SOCIAL = { phone: ph('phone-fill'), whatsapp: ph('whatsapp-logo-fill'), telegram: ph('telegram-logo-fill') };

const FLOURISH = '<svg class="flourish" viewBox="0 0 150 22" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M2 11h50M98 11h50"/><path d="M75 11c-6-8-16-9-21-4 5 6 15 6 21 4zM75 11c6-8 16-9 21-4-5 6-15 6-21 4z" fill="currentColor" fill-opacity=".15"/><circle cx="75" cy="11" r="2" fill="currentColor"/><circle cx="52" cy="11" r="1.4" fill="currentColor"/><circle cx="98" cy="11" r="1.4" fill="currentColor"/></svg>';

const MEDALLION = '<svg class="medallion" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><ellipse cx="32" cy="32" rx="22" ry="27"/><ellipse cx="32" cy="32" rx="19" ry="24" stroke-dasharray="1 3" stroke-linecap="round"/><path d="M24 45c0-6 1-9 4-11-3-1-4-4-3-7s4-4 6-2c1 2 1 5-1 7 2 1 3 3 3 6" fill="currentColor" fill-opacity=".85" stroke="none"/><path d="M40 45c0-6-1-9-4-11 3-1 4-4 3-7s-4-4-6-2" fill="currentColor" fill-opacity=".5" stroke="none"/></svg>';

const HEART_SHAPE = '<svg viewBox="0 0 300 276" aria-hidden="true"><path d="M150 268C70 214 10 160 10 92 10 42 48 8 92 8c28 0 46 14 58 34C162 22 180 8 208 8c44 0 82 34 82 84 0 68-60 122-140 176z" fill="#7c8257" stroke="#efe7d6" stroke-width="10"/><path d="M150 252C78 202 24 154 24 92 24 50 56 22 92 22c26 0 44 14 58 40 14-26 32-40 58-40 36 0 68 28 68 70 0 62-54 110-126 160z" fill="none" stroke="#fbf7ee" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="2 5" stroke-linecap="round"/></svg>';

// ---------- Конверт ----------
const PAPER_NOISE = '<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .28  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>';
const ENVELOPE_SVG = `<svg class="env-back" viewBox="0 0 420 290" preserveAspectRatio="none" aria-hidden="true">
        <defs>${PAPER_NOISE}<linearGradient id="inside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfc2a6"/><stop offset="1" stop-color="#e6dbc4"/></linearGradient></defs>
        <rect width="420" height="290" rx="6" fill="url(#inside)"/>
      </svg>`;
const ENVELOPE_FRONT = `<svg class="env-front" viewBox="0 0 420 290" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="fl" x1="0" x2="1"><stop offset="0" stop-color="#efe6d3"/><stop offset="1" stop-color="#e3d7bd"/></linearGradient>
          <linearGradient id="fr" x1="1" x2="0"><stop offset="0" stop-color="#efe6d3"/><stop offset="1" stop-color="#e1d4b9"/></linearGradient>
          <linearGradient id="fb" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f6efe0"/><stop offset="1" stop-color="#ebe1cb"/></linearGradient>
        </defs>
        <path d="M0 6Q0 0 6 0L200 150Q210 158 220 150L414 0Q420 0 420 6V284Q420 290 414 290H6Q0 290 0 284Z" fill="url(#fl)"/>
        <path d="M420 6L220 150Q210 158 200 150L0 6V284Q0 290 6 290H414Q420 290 420 284Z" fill="url(#fr)" opacity=".55"/>
        <path d="M0 290L196 136Q210 126 224 136L420 290Z" fill="url(#fb)"/>
        <path d="M0 290L196 136Q210 126 224 136L420 290" fill="none" stroke="#bfae8b" stroke-opacity=".55" stroke-width="1"/>
        <path d="M2 4L200 150M418 4L220 150" stroke="#bfae8b" stroke-opacity=".35" stroke-width="1"/>
        <rect width="420" height="290" rx="6" filter="url(#paper)" fill="#fff"/>
      </svg>`;
const ENVELOPE_FLAP = `<svg class="flap" viewBox="0 0 420 290" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="ft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9dfca"/><stop offset="1" stop-color="#f7f0e2"/></linearGradient>
        <filter id="fs" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#5a4a30" flood-opacity=".22"/></filter></defs>
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
          <radialGradient id="wax" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#a4ab78"/><stop offset=".55" stop-color="#7c8257"/><stop offset="1" stop-color="#4f5436"/></radialGradient>
          <radialGradient id="wax2" cx=".6" cy=".65" r=".6"><stop offset="0" stop-color="#5f6542"/><stop offset="1" stop-color="#8c9265"/></radialGradient>
          <filter id="ws"><feDropShadow dx="1" dy="3" stdDeviation="2.5" flood-color="#2e2a1c" flood-opacity=".45"/></filter>
        </defs>
        <path d="${d}Z" fill="url(#wax)" filter="url(#ws)"/>
        <circle cx="50" cy="50" r="33" fill="url(#wax2)"/>
        <circle cx="50" cy="50" r="33" fill="none" stroke="#3f4329" stroke-opacity=".5" stroke-width="1.5"/>
        <circle cx="50" cy="50" r="28" fill="none" stroke="#c9cf9f" stroke-opacity=".5" stroke-width=".8" stroke-dasharray="1 3"/>
        <text x="50" y="58" text-anchor="middle" font-family="Marck Script, cursive" font-size="22" fill="#3f4329" fill-opacity=".55">${esc(initials)}</text>
        <text x="49.4" y="57.2" text-anchor="middle" font-family="Marck Script, cursive" font-size="22" fill="#e6e9c8" fill-opacity=".8">${esc(initials)}</text>
        <ellipse cx="34" cy="28" rx="10" ry="5" transform="rotate(-35 34 28)" fill="#fff" fill-opacity=".22"/>
      </svg>`;
}

// Кружевная рамка: овал с фестонами по краю и цветами снизу.
function laceFrame() {
  const cx = 160, cy = 192, rx = 132, ry = 172;
  const scallops = [];
  const holes = [];
  const N = 64;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = cx + (rx + 5) * Math.cos(t), y = cy + (ry + 5) * Math.sin(t);
    scallops.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9"/>`);
    const hx = cx + (rx + 6) * Math.cos(t), hy = cy + (ry + 6) * Math.sin(t);
    holes.push(`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="1.6"/>`);
  }
  const rose = (x, y, r, c) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${c}"/>`
    + `<path d="M0 ${-r * 0.55}a${r * 0.55} ${r * 0.55} 0 1 1 ${-r * 0.5} ${r * 0.3}M${-r * 0.2} ${-r * 0.15}a${r * 0.25} ${r * 0.25} 0 1 1 ${r * 0.3} ${r * 0.25}" stroke="#fff" stroke-opacity=".7" stroke-width="1.2" fill="none"/></g>`;
  const lavender = (x, y, h, rot) => {
    let dots = '';
    for (let k = 0; k < 7; k++) dots += `<ellipse cx="${(k % 2 ? 2.5 : -2.5)}" cy="${-k * h / 8}" rx="3" ry="4.2" fill="${k % 2 ? '#a99bd0' : '#c3b6e2'}"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 8V${-h}" stroke="#8f9a6c" stroke-width="1.2"/>${dots}</g>`;
  };
  const leaf = (x, y, rot) => `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0c8-10 22-10 28 0-8 7-20 7-28 0z" fill="#9aa47a"/>`;
  const flowers = [
    leaf(64, 352, -150), leaf(250, 352, -30), leaf(120, 372, 160), leaf(196, 372, 20),
    lavender(84, 344, 40, -28), lavender(238, 344, 40, 28), lavender(110, 352, 34, -12), lavender(212, 352, 34, 12),
    rose(128, 360, 17, '#e8b7bd'), rose(194, 360, 17, '#e8b7bd'), rose(160, 368, 21, '#f2d0cf'),
    rose(98, 368, 12, '#efe3d2'), rose(224, 368, 12, '#efe3d2'), rose(142, 384, 10, '#d9a3ab'), rose(178, 384, 10, '#d9a3ab'),
  ].join('');
  return `<svg class="frame" viewBox="0 0 320 400" aria-hidden="true">
        <g fill="#fffdf8" stroke="currentColor" stroke-width="1">${scallops.join('')}</g>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fffdf8" stroke="currentColor" stroke-width="1"/>
        <g fill="currentColor" fill-opacity=".55">${holes.join('')}</g>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx - 9}" ry="${ry - 9}" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1 4" stroke-linecap="round"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx - 15}" ry="${ry - 15}" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width=".8"/>
        ${flowers}
      </svg>`;
}

// Дата свадьбы без учёта часового пояса: берём YYYY-MM-DD из строки.
function weddingDay() {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(event.date || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

function hero() {
  const wd = weddingDay();
  const dateLine = wd
    ? `${String(wd.d).padStart(2, '0')}<i>|</i>${String(wd.m).padStart(2, '0')}<i>|</i>${wd.y}`
    : esc(event.dateText);
  return `<section class="panel hero">
      <div class="lace">
        ${laceFrame()}
        <div class="inner">
          <p class="kicker">Приглашение<small>на свадьбу</small></p>
          <h1 class="couple">${esc(couple.groom)}<br>&amp; ${esc(couple.bride)}</h1>
          <p class="date">${dateLine}</p>
        </div>
      </div>
    </section>`;
}

function greetingPanel(greeting, names, message) {
  return `<section class="panel">
      ${MEDALLION}
      <h2 class="greeting">${greeting ? `<small>${esc(greeting)}</small>` : ''}${esc(names)}</h2>
      <div class="text">${paras(message)}</div>
      ${FLOURISH}
    </section>`;
}

function calendar() {
  const wd = weddingDay();
  if (!wd) return '';
  const date = new Date(Date.UTC(wd.y, wd.m - 1, wd.d));
  const dow = (date.getUTCDay() + 6) % 7; // 0 = понедельник
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(date.getTime() + (i - dow) * 864e5).getUTCDate();
    days.push(i === dow
      ? `<b class="on" aria-label="${d}, наш день">${ph('heart-fill')}<em>${d}</em></b>`
      : `<b>${d}</b>`);
  }
  return `<section class="panel">
      <h2>Наш ${MONTHS[wd.m - 1]}</h2>
      <div class="week">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}${days.join('')}</div>
      ${event.dateText || event.time ? `<p class="muted">${esc([event.weekday, event.dateText, event.time && `в ${event.time}`].filter(Boolean).join(', '))}</p>` : ''}
    </section>`;
}

function countdown() {
  if (!event.date) return '';
  return `<section class="panel olive">
      <h2>Мы скажем «да» через…</h2>
      <div class="units" id="countdown" aria-live="off"></div>
    </section>`;
}

function program() {
  if (!data.program || !data.program.length) return '';
  const items = data.program.map((p) => `<li>
          ${p.icon ? icon(p.icon).replace('<svg ', '<svg class="ico" ') : '<span></span>'}
          <span class="rail"></span>
          <div class="what"><div class="head"><b>${esc(p.title)}</b><time>${esc(p.time)}</time></div>${p.note ? `<p>${esc(p.note)}</p>` : ''}</div>
        </li>`).join('');
  return `<section class="panel">
      <h2>Программа дня</h2>
      <ol class="program">${items}</ol>
    </section>`;
}

function location() {
  if (!event.place && !event.address) return '';
  return `<section class="panel">
      <h2>Локация</h2>
      <div class="text">
        <p>${esc(event.locationText || 'Наша свадьба пройдёт по адресу:')}</p>
        ${event.place ? `<p class="place-name">${esc(event.place)}</p>` : ''}
        ${event.address ? `<p>${esc(event.address)}</p>` : ''}
      </div>
      ${event.mapUrl ? `<a class="btn" href="${esc(event.mapUrl)}" target="_blank" rel="noopener">Построить маршрут</a>` : ''}
      ${event.photo ? `<img class="venue-photo" src="${esc(event.photo)}" alt="${esc(event.place)}" loading="lazy">` : MANOR}
    </section>`;
}

function wishes() {
  if (!data.wishes || !data.wishes.length) return '';
  const items = data.wishes.map((w) => `<div class="wish">${icon(w.icon)}<h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join('');
  return `<section class="panel olive">
      <h2>Пожелания</h2>
      ${items}
    </section>`;
}

function dressCode() {
  const dc = data.dressCode;
  if (!dc || (!dc.text && !(dc.colors && dc.colors.length))) return '';
  const sw = (dc.colors || []).map((c) => `<li style="background:${esc(c)}"></li>`).join('');
  return `<section class="panel">
      <h2>Дресс-код</h2>
      <div class="text">${paras(dc.text)}</div>
      ${dc.ladies || dc.gentlemen ? `<div class="dress-cards">
        ${dc.ladies ? `<div class="dress-card"><div class="arch">${DRESS}</div><h3>Дамам</h3><p>${esc(dc.ladies)}</p></div>` : ''}
        ${dc.gentlemen ? `<div class="dress-card"><div class="arch">${SUIT}</div><h3>Джентльменам</h3><p>${esc(dc.gentlemen)}</p></div>` : ''}
      </div>` : ''}
      ${sw ? `<ul class="palette" aria-label="Цвета праздника">${sw}</ul>` : ''}
      ${dc.inspirationUrl ? `<a class="btn" href="${esc(dc.inspirationUrl)}" target="_blank" rel="noopener">Вдохновиться</a>` : ''}
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
      <div class="avatar">${ICONS.organizer}</div>
      <div class="text">
        <p>${esc(o.text || 'Если появятся вопросы, обращайтесь к нашему свадебному организатору:')}</p>
        ${o.name ? `<p class="contact-name">${esc(o.name)}</p>` : ''}
        ${o.phone ? `<p class="phone">${esc(o.phone)}</p>` : ''}
      </div>
      ${links.length ? `<div class="socials">${links.join('')}</div>` : ''}
    </section>`;
}

function quote() {
  if (!data.quote) return '';
  return `<section class="panel"><div class="heart">${HEART_SHAPE}<p>${esc(data.quote)}</p></div></section>`;
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
    `${yesNo('kids', 'Да, с детьми', 'Нет')}<input type="text" id="kidsInfo" name="kidsInfo" placeholder="Например: 2 ребёнка, 4 и 9 лет">`));
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
      ${FLOURISH}
      <p class="signature">${esc(couple.signature)}</p>
      <button class="replay" id="replay" type="button">${ph('arrow-counter-clockwise-light')}Открыть конверт заново</button>
    </section>`;
}

function render({ greeting, names, envelopeNames, message, title, guest }) {
  const content = [
    hero(), greetingPanel(greeting, names, message), calendar(), countdown(), program(),
    location(), wishes(), dressCode(), organiser(), quote(), rsvp(guest), closing(),
  ].filter(Boolean).map((s) => `    ${s}`).join('\n');
  const vars = {
    TITLE: esc(title),
    DESCRIPTION: esc(`${couple.groom} и ${couple.bride} приглашают на свадьбу · ${event.dateText || ''}`),
    INITIALS: esc(couple.initials),
    ENVELOPE_NAMES: esc(envelopeNames),
    ENVELOPE_SVG,
    ENVELOPE_FRONT,
    ENVELOPE_FLAP,
    SEAL_SVG: sealSvg(couple.initials),
    HAND_ICON: ph('hand-pointing-light'),
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
  envelopeNames: 'Нашим дорогим гостям',
  message: data.defaultText,
  title: `${couple.groom} и ${couple.bride} · свадьба`,
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
