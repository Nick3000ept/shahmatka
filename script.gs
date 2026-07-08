// ═══════════════════════════════════════════════════════════════════
// СБ3 Adminка — Google Apps Script
// ═══════════════════════════════════════════════════════════════════

const SHEET_NAME = 'СБ3_ОБЩАЯ';
const ADMIN_PASSWORD = 'adminACCB3';
const SK_PASSWORD    = 'priemkaCB3';
const TASKS_SHEET    = 'Поручения';
const PROTOCOLS_SHEET = 'Протоколы';

const C = {
  ROW_ID    : 1,
  CORPUS    : 2,
  FLOOR     : 3,
  EXTRA1    : 4,
  VOLUME    : 5,
  WORK      : 6,
  ORG       : 7,
  STATUS    : 8,
  DATE_END  : 9,
  DATE_RECV : 10,
  PCT       : 11,
  COMMENT   : 12,
  DATE_CHG  : 13,
  AUTHOR    : 14,
  // O+ не трогаем никогда
};

// Защита от formula injection: значение, начинающееся с =,+,-,@,
// Google Sheets воспринял бы как формулу — экранируем апострофом.
// Заодно ограничиваем длину пользовательского текста.
function safeCell_(v) {
  if (typeof v === 'number') return v; // числа (напр. %) не трогаем
  var s = String(v || '').trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, 1000);
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var action = p.action || '';

    if (action === 'getRows') return jsonOut(getRows(p.corpus || ''));
    if (action === 'ping')    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);

    if (action === 'getContractors') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Подрядчики');
      if (!sheet) return jsonOut({contractors: []});
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonOut({contractors: []});
      var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var list = vals.map(function(r){ return String(r[0]).trim(); }).filter(Boolean);
      var seen = {};
      list = list.filter(function(c){ if (seen[c]) return false; seen[c] = true; return true; });
      return jsonOut({contractors: list});
    }

    if (action === 'clearCache') { clearCache(); return jsonOut({ok: true}); }
    if (action === 'getCheckLists') return jsonOut(getCheckLists());
    if (action === 'getStaffing')   return jsonOut(getStaffing());
    if (action === 'getTasks')      return jsonOut(getTasks(p.all === '1'));
    if (action === 'getContractorEmails') return jsonOut(getContractorEmails());


    if (action === 'checkPassword') {
      var pwd = p.pwd || '';
      if (pwd === ADMIN_PASSWORD) return jsonOut({ok: true, role: 'admin'});
      if (pwd === SK_PASSWORD)    return jsonOut({ok: true, role: 'sk'});
      return jsonOut({ok: false});
    }

    try {
      return HtmlService.createHtmlOutputFromFile('index.html')
        .setTitle('СБ3 · Админ Панель')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (e2) {
      return HtmlService.createHtmlOutput('<body style="font-family:sans-serif;padding:40px"><h2>Добавьте index.html</h2></body>');
    }
  } catch (err) {
    return jsonOut({error: err.toString()});
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === 'saveRow') {
      saveOneRow(body);
      clearCache();
      return jsonOut({ok: true});
    }

    if (body.action === 'saveAll') {
      var rows = body.rows || [];
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = findSheet(ss);
      if (!sheet) return jsonOut({error: 'Лист не найден'});

      var lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        var lastRow = sheet.getLastRow();
        if (lastRow < 2) return jsonOut({ok: true, saved: 0});

        var now = new Date();
        var nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd.MM.yyyy');

        // Читаем rowId (столбец A) отдельно — для построения карты
        var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

        // Читаем только G-N (7 столбцов: org/status/dateEnd/dateRecv/pct/comment/dateChg/author)
        // A-F не трогаем — там dropdown-валидация, запись вызовет ошибку
        var EDIT_START = 7; // столбец G
        var EDIT_COLS  = 8; // G..N
        var allValues = sheet.getRange(2, EDIT_START, lastRow - 1, EDIT_COLS).getValues();

        // Строим карту rowId → индекс в массиве
        var rowMap = {};
        idValues.forEach(function(row, i) {
          var id = String(row[0]).trim();
          if (id) rowMap[id] = i;
        });

        // Смещение: индекс в allValues = C.X - EDIT_START
        var off = EDIT_START; // 7
        var changedIndices = [];
        rows.forEach(function(r) {
          var idx = rowMap[String(r.rowId)];
          if (idx === undefined) return;

          // Меняем ТОЛЬКО пришедшие поля — остальные остаются как были
          var anyChange = false;
          if (r.status  !== undefined) { allValues[idx][C.STATUS   - off] = safeCell_(r.status);  anyChange = true; }
          if (r.pct     !== undefined) { allValues[idx][C.PCT      - off] = r.pct === '' || r.pct === undefined ? '' : safeCell_(r.pct); anyChange = true; }
          if (r.comment !== undefined) { allValues[idx][C.COMMENT  - off] = safeCell_(r.comment); anyChange = true; }
          if (r.org     !== undefined) { allValues[idx][C.ORG      - off] = safeCell_(r.org);     anyChange = true; }
          if (r.dateEnd !== undefined) { allValues[idx][C.DATE_END - off] = safeCell_(r.dateEnd); anyChange = true; }
          if (r.author)                  allValues[idx][C.AUTHOR   - off] = safeCell_(r.author);
          // DATE_CHG только если действительно что-то изменилось
          if (anyChange) allValues[idx][C.DATE_CHG - off] = nowStr;
          if (anyChange) changedIndices.push(idx);
        });

        // Пишем ТОЛЬКО изменённые строки — не трогаем остальные (избегаем ошибок валидации)
        // G может иметь dropdown-валидацию: при ошибке fallback на H-N
        if (changedIndices.length > 0) {
          changedIndices.forEach(function(idx) {
            try {
              sheet.getRange(idx + 2, EDIT_START, 1, EDIT_COLS).setValues([allValues[idx]]);
            } catch(e) {
              // G (org) вызвал ошибку валидации — пишем только H-N
              sheet.getRange(idx + 2, 8, 1, 7).setValues([allValues[idx].slice(1)]);
            }
          });
          SpreadsheetApp.flush();
        }

        clearCache();
      } finally {
        lock.releaseLock();
      }
      return jsonOut({ok: true, saved: changedIndices.length, requested: rows.length});
    }

    if (body.action === 'addTask') {
      if (body.pwd !== ADMIN_PASSWORD) return jsonOut({error: 'Нет прав'});
      return jsonOut(addTask(body));
    }

    if (body.action === 'updateTask') {
      if (body.pwd !== ADMIN_PASSWORD) return jsonOut({error: 'Нет прав'});
      return jsonOut(updateTask(body));
    }

    if (body.action === 'saveProtocol') {
      if (body.pwd !== ADMIN_PASSWORD) return jsonOut({error: 'Нет прав'});
      return jsonOut(saveProtocol(body));
    }

    if (body.action === 'sendProtocol') {
      if (body.pwd !== ADMIN_PASSWORD) return jsonOut({error: 'Нет прав'});
      return jsonOut(sendProtocol(body));
    }

    return jsonOut({error: 'Unknown action: ' + body.action});
  } catch (err) {
    return jsonOut({error: err.toString()});
  }
}

function getWorkDict() {
  // CacheService: справочник работ кешируется на 2 часа (~20-36 КБ, хорошо укладывается в лимит 100 КБ/ключ)
  // clearCache() сбрасывает ключ sb3_work_dict при любом сохранении данных
  var cache = CacheService.getScriptCache();
  var cached = cache.get('sb3_work_dict');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Факт_работы');
  if (!sheet) return {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  var values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  var dict = {};
  values.forEach(function(row) {
    var name = String(row[2]).trim();
    if (!name) return;
    var place   = String(row[3]).trim();
    var lvl1    = String(row[4]).trim();
    var lvl2    = String(row[5]).trim();
    var kp      = String(row[9]).trim();
    var factNum = String(row[10]).trim();
    // Не перезаписываем уже заполненную запись пустой (защита от дублей без данных)
    var existing = dict[name];
    if (existing && (existing.place || existing.lvl1 || existing.lvl2) && !place && !lvl1 && !lvl2) return;
    dict[name] = {place: place, lvl1: lvl1, lvl2: lvl2, kp: kp, factNum: factNum};
  });

  try { cache.put('sb3_work_dict', JSON.stringify(dict), 7200); } catch(e) {}
  return dict;
}

function getRows(filterCorpus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || findSheet(ss);
  if (!sheet) return {error: 'Лист не найден'};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {rows: []};
  var dict = getWorkDict();
  var values = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var corpus = String(row[1]).trim();
    var floor  = String(row[2]).trim();
    var work   = String(row[5]).trim();
    if (!corpus || !floor || !work) continue;
    if (filterCorpus && corpus !== filterCorpus) continue;
    var rowId = String(row[0]).trim() || ('row_' + (i + 2));
    var attrs = dict[work] || {place: '', lvl1: '', lvl2: '', kp: '', factNum: ''};
    rows.push({
      rowId      : rowId,
      corpus     : corpus,
      floor      : parseFloor(floor),
      work       : work,
      extra1     : String(row[3]).trim(),
      org        : String(row[6]).trim(),
      status     : String(row[7]).trim(),
      dateEnd    : formatDateOut(row[8]),
      pct        : String(row[10]).trim(),
      comment    : String(row[11]).trim(),
      dateChg    : formatDateOut(row[12]),
      author     : String(row[13]).trim(),
      place      : attrs.place,
      lvl1       : attrs.lvl1,
      lvl2       : attrs.lvl2,
      kp         : attrs.kp,
      factNum    : attrs.factNum,
      baseDate   : formatDateOut(row[14]),
      currentDate: formatDateOut(row[15]),
      volume     : String(row[16]).trim(),
      unit       : String(row[17]).trim(),
      idFact     : String(row[19]).trim()
    });
  }
  rows.sort(function(a, b) {
    var cc = a.corpus < b.corpus ? -1 : a.corpus > b.corpus ? 1 : 0;
    return cc !== 0 ? cc : (b.floor || 0) - (a.floor || 0);
  });
  return {rows: rows};
}

// Построчное сохранение — для малого числа строк
function saveOneRow(data) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findSheet(ss);
  if (!sheet) throw new Error('Лист не найден');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Таблица пуста');

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var targetRowSheet = -1;
  for (var i = 0; i < ids.length; i++) {
    var rowId = String(ids[i][0]).trim();
    if (rowId && rowId === String(data.rowId)) { targetRowSheet = i + 2; break; }
  }
  // Запасной вариант для синтетических ID (row_N) — только в пределах данных (не заголовок, не за концом)
  if (targetRowSheet < 0 && String(data.rowId).startsWith('row_')) {
    var synRow = parseInt(String(data.rowId).replace('row_', ''));
    if (!isNaN(synRow) && synRow >= 2 && synRow <= lastRow) targetRowSheet = synRow;
  }
  if (targetRowSheet < 0) throw new Error('Строка не найдена: ' + data.rowId);

  // Читаем только G-N (org/status/dateEnd/dateRecv/pct/comment/dateChg/author)
  // A-F не трогаем — там dropdown-валидация, запись вызовет ошибку
  var EDIT_START = 7; // столбец G
  var EDIT_COLS  = 8; // G..N
  var rowValues = sheet.getRange(targetRowSheet, EDIT_START, 1, EDIT_COLS).getValues()[0];
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy');

  var off = EDIT_START; // 7 — смещение: индекс в rowValues = C.X - off
  var anyChange = false;
  if (data.status  !== undefined) { rowValues[C.STATUS   - off] = safeCell_(data.status);  anyChange = true; }
  if (data.dateEnd !== undefined) { rowValues[C.DATE_END - off] = safeCell_(data.dateEnd); anyChange = true; }
  if (data.pct     !== undefined) { rowValues[C.PCT      - off] = data.pct === '' || data.pct === undefined ? '' : safeCell_(data.pct); anyChange = true; }
  if (data.org     !== undefined) { rowValues[C.ORG      - off] = safeCell_(data.org);     anyChange = true; }
  if (data.comment !== undefined) { rowValues[C.COMMENT  - off] = safeCell_(data.comment); anyChange = true; }
  if (data.author)                  rowValues[C.AUTHOR   - off] = safeCell_(data.author);
  // DATE_CHG только если действительно что-то изменилось
  if (anyChange) rowValues[C.DATE_CHG - off] = nowStr;
  if (!anyChange) return; // нечего писать — выходим без записи в таблицу

  // G (org) может иметь dropdown-валидацию: при ошибке fallback на H-N
  try {
    sheet.getRange(targetRowSheet, EDIT_START, 1, EDIT_COLS).setValues([rowValues]);
  } catch(e) {
    sheet.getRange(targetRowSheet, 8, 1, 7).setValues([rowValues.slice(1)]);
  }
  SpreadsheetApp.flush();
}

function findSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().indexOf('общ') >= 0) return sheets[i];
  }
  return null;
}

function parseFloor(v) {
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? v : n;
}

function formatDateOut(v) {
  if (!v) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return pad(v.getDate()) + '.' + pad(v.getMonth() + 1) + '.' + v.getFullYear();
  }
  return String(v).trim();
}

function pad(n) { return n < 10 ? '0' + n : String(n); }

function getStaffing() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Численность_монтажников');
  if (!sheet) return {items: []};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {items: []};
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var items = [];
  values.forEach(function(row) {
    var date = formatDateOut(row[0]);
    var contractor = String(row[1]).trim();
    var count = parseFloat(String(row[2]).replace(',', '.'));
    if (!date || !contractor || isNaN(count) || count <= 0) return;
    items.push({date: date, contractor: contractor, count: count});
  });
  return {items: items};
}

function getCheckLists() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('sb3_checklists');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Чек_листы');
  if (!sheet) return {items: []};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {items: []};
  // A:AB = 28 столбцов
  var values = sheet.getRange(2, 1, lastRow - 1, 28).getValues();
  var items = [];
  values.forEach(function(row) {
    var idFact = String(row[27]).trim(); // AB
    if (!idFact) return;
    var corpus = String(row[2]).trim();  // C
    var floor  = String(row[3]).trim();  // D
    if (!corpus || !floor) return;
    items.push({
      corpus       : corpus,
      floor        : floor,
      razdel       : String(row[4]).trim(),   // E
      podrazdel    : String(row[5]).trim(),   // F
      work         : String(row[6]).trim(),   // G
      actNum       : String(row[7]).trim(),   // H
      date         : formatDateOut(row[8]),   // I
      status       : String(row[9]).trim(),   // J
      contractor   : String(row[10]).trim(),  // K
      remarksTotal : String(row[12]).trim(),  // M
      remarksOpen  : String(row[13]).trim(),  // N
      linkS3       : String(row[14]).trim(),  // O
      linkDrive    : String(row[15]).trim(),  // P
      comment      : String(row[16]).trim(),  // Q
      remarksText  : String(row[18]).trim(),  // S - текст замечаний
      idCl         : String(row[26]).trim(),  // AA
      idFact       : idFact
    });
  });
  var result = {items: items};
  try { cache.put('sb3_checklists', JSON.stringify(result), 7200); } catch(e) {}
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// ПОРУЧЕНИЯ (лист «Поручения») — ручные задачи для протокола
// Столбцы: A=id | B=Подрядчик | C=Текст | D=Срок | E=Статус | F=Создано | G=Автор
// Статус: 'открыто' | 'выполнено'
// ═══════════════════════════════════════════════════════════════════
function ensureTasksSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TASKS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TASKS_SHEET);
    sheet.appendRow(['id', 'Подрядчик', 'Текст', 'Срок', 'Статус', 'Создано', 'Автор']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getTasks(includeAll) {
  var sheet = ensureTasksSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {tasks: []};
  var values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var tasks = [];
  values.forEach(function(row) {
    var id = String(row[0]).trim();
    if (!id) return;
    var status = String(row[4]).trim() || 'открыто';
    if (!includeAll && status !== 'открыто') return;
    tasks.push({
      id      : id,
      org     : String(row[1]).trim(),
      text    : String(row[2]).trim(),
      due     : formatDateOut(row[3]),
      status  : status,
      created : formatDateOut(row[5]),
      author  : String(row[6]).trim()
    });
  });
  return {tasks: tasks};
}

function addTask(body) {
  var org  = String(body.org || '').trim();
  var text = String(body.text || '').trim();
  if (!org || !text) return {error: 'Укажите подрядчика и текст поручения'};
  var sheet = ensureTasksSheet_();
  var id = 't' + Date.now() + Math.floor(Math.random() * 1000);
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy');
  sheet.appendRow([id, safeCell_(org), safeCell_(text), safeCell_(body.due), 'открыто', nowStr, safeCell_(body.author)]);
  SpreadsheetApp.flush();
  return {ok: true, id: id};
}

function updateTask(body) {
  var id = String(body.id || '').trim();
  if (!id) return {error: 'Нет id поручения'};
  var sheet = ensureTasksSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {error: 'Поручение не найдено'};
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      var r = i + 2;
      if (body.status !== undefined) sheet.getRange(r, 5).setValue(safeCell_(body.status));
      if (body.org    !== undefined) sheet.getRange(r, 2).setValue(safeCell_(body.org));
      if (body.text   !== undefined) sheet.getRange(r, 3).setValue(safeCell_(body.text));
      if (body.due    !== undefined) sheet.getRange(r, 4).setValue(safeCell_(body.due));
      SpreadsheetApp.flush();
      return {ok: true};
    }
  }
  return {error: 'Поручение не найдено'};
}

// ═══════════════════════════════════════════════════════════════════
// ПРОТОКОЛЫ (лист «Протоколы») — история сформированных протоколов
// Столбцы: A=№ | B=Дата | C=Автор | D=Содержимое (текст)
// ═══════════════════════════════════════════════════════════════════
function ensureProtocolsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROTOCOLS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PROTOCOLS_SHEET);
    sheet.appendRow(['№', 'Дата', 'Автор', 'Содержимое', 'Отправлено']);
    sheet.setFrozenRows(1);
  }
  if (String(sheet.getRange(1, 5).getValue()) === '') sheet.getRange(1, 5).setValue('Отправлено');
  return sheet;
}

// Подрядчики с почтой: лист «Подрядчики», A=название, E=email
function getContractorEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Подрядчики');
  if (!sheet) return {items: []};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {items: []};
  var vals = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var items = [], seen = {};
  vals.forEach(function(r) {
    var name = String(r[0]).trim();
    if (!name || seen[name]) return;
    seen[name] = 1;
    items.push({name: name, email: String(r[4]).trim()});
  });
  return {items: items};
}

// Разовый тест авторизации почты: запустить в редакторе GAS → придёт письмо самому себе
function testMailAuth() {
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Тест почты СБ3', 'Авторизация MailApp работает.');
}

function escHtml_(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Рассылка протокола: сохраняет/находит строку в «Протоколы», строит PDF,
// шлёт каждому получателю отдельное письмо через MailApp (отправитель — аккаунт GAS)
function sendProtocol(body) {
  var recipients = body.recipients || [];
  if (!recipients.length) return {error: 'Нет получателей'};
  var num     = String(body.num || '').trim();
  var date    = String(body.date || '').trim();
  var title   = String(body.title || 'Протокол').trim();
  var content = String(body.content || '');
  var sections = body.sections || [];

  var sheet = ensureProtocolsSheet_();
  if (!num) num = String(sheet.getLastRow()); // строка 1 — шапка

  // PDF из HTML
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;padding:10px 14px;}' +
    'h1{font-size:18px;text-align:center;margin:0 0 4px;}' +
    '.meta{text-align:center;font-size:12px;margin-bottom:18px;}' +
    'h2{font-size:13px;border-bottom:1px solid #000;padding-bottom:2px;margin:16px 0 5px;}' +
    'p{margin:4px 0;line-height:1.5;}' +
    '</style></head><body>' +
    '<h1>' + escHtml_(title) + '</h1>' +
    '<div class="meta">№ ' + escHtml_(num) + ' от ' + escHtml_(date) + '</div>';
  sections.forEach(function(sec) {
    html += '<h2>' + escHtml_(sec.org) + '</h2>';
    (sec.items || []).forEach(function(it) { html += '<p>— ' + escHtml_(it) + '</p>'; });
  });
  html += '</body></html>';
  var pdf = Utilities.newBlob('', 'text/html', 'p.html')
    .setDataFromString(html, 'UTF-8')
    .getAs('application/pdf')
    .setName('Протокол_' + num + '_' + date.replace(/\./g, '-') + '.pdf');

  // Каждому получателю — отдельное письмо
  var sent = [], errors = [];
  recipients.forEach(function(rc) {
    var em = String(rc.email || '').trim();
    var nm = String(rc.name || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { errors.push(nm + ': некорректный адрес'); return; }
    try {
      MailApp.sendEmail({
        to: em,
        subject: title + ' № ' + num + ' от ' + date,
        body: 'Добрый день!\n\nНаправляем протокол (во вложении).\n\n' + content,
        attachments: [pdf],
        name: 'СБ3 Шахматка'
      });
      sent.push(em);
    } catch (e) { errors.push(nm + ': ' + e); }
  });

  // Фиксируем в листе «Протоколы»: обновляем строку с этим № или добавляем новую
  var sentStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm') + ' → ' + sent.join(', ');
  var lastRow = sheet.getLastRow(), found = -1;
  if (lastRow >= 2) {
    var nums = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < nums.length; i++) {
      if (String(nums[i][0]).trim() === num) { found = i + 2; break; }
    }
  }
  if (found > 0) {
    sheet.getRange(found, 5).setValue(sentStr);
  } else {
    var safeContent = /^[=+\-@]/.test(content) ? "'" + content : content;
    sheet.appendRow([safeCell_(num), safeCell_(date), safeCell_(body.author), safeContent.slice(0, 45000), sentStr]);
  }
  SpreadsheetApp.flush();
  return {ok: true, num: num, sent: sent, errors: errors};
}

function saveProtocol(body) {
  var sheet = ensureProtocolsSheet_();
  var num = String(body.num || '').trim();
  if (!num) num = String(sheet.getLastRow()); // строка 1 — шапка, значит следующий номер = кол-во протоколов + 1
  // Содержимое протокола длинное — обычный safeCell_ (лимит 1000) не подходит,
  // экранируем формулы вручную и режем по лимиту ячейки Sheets
  var content = String(body.content || '');
  if (/^[=+\-@]/.test(content)) content = "'" + content;
  content = content.slice(0, 45000);
  sheet.appendRow([safeCell_(num), safeCell_(body.date), safeCell_(body.author), content]);
  SpreadsheetApp.flush();
  return {ok: true, num: num};
}

function clearCache() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('sb3_rows_all');
    cache.remove('sb3_work_dict');
    cache.remove('sb3_checklists');
    cache.remove('sb3_staffing');
    ['К1','К2','К3','К4','К5','К6','К7','К8','К9','К10','К11','К12'].forEach(function(c) {
      cache.remove('sb3_rows_' + c);
    });
  } catch(e) {}
}
