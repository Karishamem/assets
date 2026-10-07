// Google Apps Script: принимает ответы анкеты, записывает их в Google Таблицу
// и сразу присылает каждый ответ сообщением в Telegram.
// Токен бота хранится в настройках скрипта, а не на странице, поэтому гости его не видят.
// Настройка: wedding/README.md, раздел «Анкета: ответы в Telegram и таблицу».

var COLUMNS = [
  ['Время ответа', 'time'], ['Страница гостя', 'guest'], ['Придёт?', 'attend'], ['Кто придёт', 'names'],
  ['Напитки', 'drinks'], ['Песня', 'song'], ['Пожелание', 'comment']
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var p = e.parameter || {};
    p.time = new Date();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map(function (c) { return c[0]; }));
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(COLUMNS.map(function (c) { return p[c[1]] || ''; }));
    sendTelegram(p);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function sendTelegram(p) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  var coming = p.attend === 'Придёт';
  var lines = [
    (coming ? '💌 Придут: ' : '😔 Не смогут: ') + (p.names || p.guest),
    'Страница: ' + p.guest
  ];
  if (coming && p.drinks) lines.push('Напитки: ' + p.drinks);
  if (p.song) lines.push('Песня: ' + p.song);
  if (p.comment) lines.push('Пожелание: ' + p.comment);
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    payload: { chat_id: chatId, text: lines.join('\n') },
    muteHttpExceptions: true
  });
}

// Запустите один раз из редактора после того, как написали боту /start:
// функция найдёт ваш chat_id и сохранит его в настройки скрипта.
function findChatId() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_TOKEN');
  var res = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates').getContentText());
  var last = res.result && res.result.length ? res.result[res.result.length - 1] : null;
  if (!last) throw new Error('Сначала напишите своему боту в Telegram команду /start');
  var chat = (last.message || last.my_chat_member || {}).chat;
  props.setProperty('TELEGRAM_CHAT_ID', String(chat.id));
  Logger.log('Сохранён chat_id: ' + chat.id);
}
