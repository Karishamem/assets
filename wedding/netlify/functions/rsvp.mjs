// Netlify Function: принимает ответ анкеты и пересылает его в Telegram-бот.
// Токен бота хранится в переменных окружения Netlify (TELEGRAM_TOKEN), на страницу он не попадает.
// TELEGRAM_CHAT_ID можно не задавать: тогда ответы уйдут в последний чат, где боту написали /start.

const field = (f, k) => (f.get(k) || '').trim().slice(0, 1000);

async function findChatId(token) {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`).then((r) => r.json());
  const list = (res && res.result) || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const chat = (list[i].message || list[i].my_chat_member || {}).chat;
    if (chat) return chat.id;
  }
  return null;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const form = new URLSearchParams(await req.text());
  if (form.get('bot-field')) return new Response('ok');          // ловушка для спам-ботов

  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return new Response('TELEGRAM_TOKEN is not set', { status: 500 });
  const chatId = process.env.TELEGRAM_CHAT_ID || (await findChatId(token));
  if (!chatId) return new Response('Write /start to the bot first', { status: 500 });

  const coming = field(form, 'attend') === 'Придёт';
  const lines = [
    (coming ? '💌 Придут: ' : '😔 Не смогут прийти: ') + (field(form, 'names') || field(form, 'guest')),
    `Приглашение: ${field(form, 'guest')}`,
  ];
  if (coming && field(form, 'drinks')) lines.push(`🥂 Напитки: ${field(form, 'drinks')}`);
  if (field(form, 'song')) lines.push(`🎵 Песня: ${field(form, 'song')}`);
  if (field(form, 'comment')) lines.push(`💬 Пожелание: ${field(form, 'comment')}`);

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
  });
  return new Response(tg.ok ? 'ok' : 'telegram error', { status: tg.ok ? 200 : 502 });
};

export const config = { path: '/api/rsvp' };
