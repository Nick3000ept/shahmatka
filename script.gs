// ═══════════════════════════════════════════════════════════════════
// СБ3 Adminка — Google Apps Script
// ═══════════════════════════════════════════════════════════════════

const SHEET_NAME = 'СБ3_ОБЩАЯ';
const ADMIN_PASSWORD = 'adminACCB3';

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

    if (action === 'checkPassword') {
      var pwd = p.pwd || '';
      return jsonOut({ok: pwd === ADMIN_PASSWORD});
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
      var lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        saveOneRow(body);
        clearCache();
      } finally {
        lock.releaseLock();
      }
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

        // Читаем A-N (14 столбцов) одним запросом — O+ не трогаем
        // Чтение ВНУТРИ лока: гарантируем что читаем актуальные данные
        var numCols = 14;
        var allValues = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

        // Строим карту rowId → индекс в массиве
        var rowMap = {};
        allValues.forEach(function(row, i) {
          var id = String(row[0]).trim();
          if (id) rowMap[id] = i;
        });

        var changed = false;
        rows.forEach(function(r) {
          var idx = rowMap[String(r.rowId)];
          if (idx === undefined) return;

          // Меняем ТОЛЬКО пришедшие поля — остальные остаются как были
          if (r.status  !== undefined) allValues[idx][C.STATUS   - 1] = r.status  || '';
          if (r.pct     !== undefined) allValues[idx][C.PCT      - 1] = r.pct     || '';
          if (r.comment !== undefined) allValues[idx][C.COMMENT  - 1] = r.comment || '';
          if (r.org     !== undefined) allValues[idx][C.ORG      - 1] = r.org     || '';
          if (r.dateEnd !== undefined) allValues[idx][C.DATE_END - 1] = parseDate(r.dateEnd) || r.dateEnd || '';
          if (r.author)                allValues[idx][C.AUTHOR   - 1] = r.author;
          allValues[idx][C.DATE_CHG - 1] = nowStr;
          changed = true;
        });

        // Один запрос на запись A-N — O+ не трогаем
        if (changed) {
          sheet.getRange(2, 1, allValues.length, numCols).setValues(allValues);
          SpreadsheetApp.flush();
        }

        clearCache();
      } finally {
        lock.releaseLock();
      }
      return jsonOut({ok: true, saved: rows.length});
    }

    return jsonOut({error: 'Unknown action: ' + body.action});
  } catch (err) {
    return jsonOut({error: err.toString()});
  }
}

var _workDict = null;

function getWorkDict() {
  if (_workDict) return _workDict;
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
    dict[name] = {
      place  : String(row[3]).trim(),
      lvl1   : String(row[4]).trim(),
      lvl2   : String(row[5]).trim(),
      kp     : String(row[9]).trim(),
      factNum: String(row[10]).trim()
    };
  });
  _workDict = dict;
  return dict;
}

function getRows(filterCorpus) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || findSheet(ss);
  if (!sheet) return {error: 'Лист не найден'};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {rows: []};
  var dict = getWorkDict();
  var values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
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
      org        : String(row[6]).trim(),
      status     : String(row[7]).trim(),
      dateEnd    : formatDateOut(row[8]),
      pct        : String(row[10]).trim(),
      comment    : String(row[11]).trim(),
      place      : attrs.place,
      lvl2       : attrs.lvl2,
      kp         : attrs.kp,
      factNum    : attrs.factNum,
      baseDate   : formatDateOut(row[14]),
      currentDate: formatDateOut(row[15])
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
  // Запасной вариант для синтетических ID (row_N)
  if (targetRowSheet < 0 && String(data.rowId).startsWith('row_')) {
    var synRow = parseInt(String(data.rowId).replace('row_', ''));
    if (!isNaN(synRow)) targetRowSheet = synRow;
  }
  if (targetRowSheet < 0) throw new Error('Строка не найдена: ' + data.rowId);

  // Читаем всю строку A-N одним запросом, меняем нужные поля, пишем обратно
  var rowValues = sheet.getRange(targetRowSheet, 1, 1, 14).getValues()[0];
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy');

  if (data.status  !== undefined) rowValues[C.STATUS   - 1] = data.status  || '';
  if (data.dateEnd !== undefined) rowValues[C.DATE_END - 1] = parseDate(data.dateEnd) || data.dateEnd || '';
  if (data.pct     !== undefined) rowValues[C.PCT      - 1] = data.pct     || '';
  if (data.org     !== undefined) rowValues[C.ORG      - 1] = data.org     || '';
  if (data.comment !== undefined) rowValues[C.COMMENT  - 1] = data.comment || '';
  if (data.author)                rowValues[C.AUTHOR   - 1] = data.author;
  rowValues[C.DATE_CHG - 1] = nowStr;

  sheet.getRange(targetRowSheet, 1, 1, 14).setValues([rowValues]);
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

function parseDate(s) {
  if (!s) return '';
  var m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  var m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]));
  return '';
}

function pad(n) { return n < 10 ? '0' + n : String(n); }

function clearCache() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove('sb3_rows_all');
    ['К1','К2','К3','К4','К5','К6','К7','К8','К9','К10','К11','К12'].forEach(function(c) {
      cache.remove('sb3_rows_' + c);
    });
  } catch(e) {}
}
