// Google Apps Script: принимает ответы анкеты и записывает их в Google Таблицу.
// Как подключить — см. wedding/README.md, раздел «Анкета гостей».

var COLUMNS = [
  ['Время ответа', 'time'], ['Страница гостя', 'guest'], ['Придёт?', 'attend'], ['Кто придёт', 'names'],
  ['Дети', 'kids'], ['Про детей', 'kidsInfo'], ['Горячее', 'main'], ['Напитки', 'drinks'],
  ['Аллергии', 'food'], ['Трансфер', 'transfer'], ['Ночлег', 'stay'], ['Песня', 'song'], ['Пожелание', 'comment']
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map(function (c) { return c[0]; }));
      sheet.setFrozenRows(1);
    }
    var p = e.parameter || {};
    p.time = new Date();
    sheet.appendRow(COLUMNS.map(function (c) { return p[c[1]] || ''; }));
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
