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
const { couple, event } = data;

const GREETINGS = { m: 'Дорогой', f: 'Дорогая', pair: 'Дорогие', family: 'Дорогие' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const slugify = (s) => s.toLowerCase()
  .split('').map((c) => TRANSLIT[c] ?? c).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function dateBlock() {
  if (!event.dateText) return '';
  const d = new Date(event.date);
  const parts = event.dateText.split(' ');
  const day = isNaN(d) ? parts[0] : d.getDate();
  const month = parts[1] || '';
  return `<div class="date-block">
      <span class="side">${esc(event.weekday || month)}</span>
      <span class="day">${esc(day)}</span>
      <span class="side">${esc(event.time || parts[2] || '')}</span>
    </div>
    <p class="date-full">${esc(event.dateText)}</p>`;
}

function details() {
  const rows = [];
  if (event.place || event.address) {
    const addr = event.mapUrl
      ? `<a href="${esc(event.mapUrl)}" target="_blank" rel="noopener">${esc(event.address)}</a>`
      : esc(event.address);
    rows.push(`<li><b>Место</b><span>${esc(event.place)}${event.place && event.address ? '<br>' : ''}${addr}</span></li>`);
  }
  if (event.dressCode) rows.push(`<li><b>Дресс-код</b><span>${esc(event.dressCode)}</span></li>`);
  if (event.contact) rows.push(`<li><b>Вопросы</b><span>${esc(event.contact)}</span></li>`);
  return rows.length ? `<ul class="details">\n      ${rows.join('\n      ')}\n    </ul>` : '';
}

function render({ greeting, names, message, title }) {
  const vars = {
    TITLE: esc(title),
    DESCRIPTION: esc(`${couple.groom} и ${couple.bride} приглашают на свадьбу · ${event.dateText || ''}`),
    INITIALS: esc(couple.initials),
    GREETING: esc(greeting),
    NAMES: esc(names),
    MESSAGE: esc(message),
    GROOM: esc(couple.groom),
    BRIDE: esc(couple.bride),
    SIGNATURE: esc(couple.signature),
    DATE_BLOCK: dateBlock(),
    DETAILS: details(),
    EVENT_DATE: JSON.stringify(event.date || null),
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
  message: data.defaultText,
  title: `${couple.groom} и ${couple.bride} · свадьба`,
}));

for (const g of data.guests) {
  const slug = g.slug || slugify(g.names);
  if (!slug) throw new Error(`Не получилось придумать адрес для гостя: ${g.names}`);
  if (seen.has(slug)) throw new Error(`Адрес «${slug}» повторяется — задайте разный slug`);
  seen.add(slug);

  const greeting = g.greeting || GREETINGS[g.type] || 'Дорогие';
  const out = path.join(dir, slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, MARK), '');
  fs.writeFileSync(path.join(out, 'index.html'), render({
    greeting,
    names: g.names,
    message: g.text || data.defaultText,
    title: `${g.names} — приглашение на свадьбу`,
  }));
  links.push(`| ${g.names} | ${base}${slug}/ |`);
}

fs.writeFileSync(path.join(dir, 'links.md'),
  `# Ссылки для гостей\n\n| Гость | Ссылка |\n|---|---|\n${links.join('\n')}\n`);

console.log(`Готово: ${data.guests.length} персональных страниц + общая страница.`);
console.log(`Ссылки — в wedding/links.md`);
