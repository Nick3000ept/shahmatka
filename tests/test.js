// Тесты чистых функций из index.html
// Запуск: node tests/test.js
'use strict';
const assert = require('assert');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓', name); passed++; }
  catch(e) { console.error('  ✗', name, '\n    ', e.message); failed++; }
}
function section(name) { console.log('\n' + name); }

// ── Функции скопированы точно из index.html ───────────────────────

function parseDateMs(s){
  if(!s) return null;
  var p=s.split('.');
  if(p.length<3) return null;
  var d=new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));
  return isNaN(d.getTime())?null:d.getTime();
}

function fmtDate(d){
  if(!d) return '';
  if(/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return d;
  if(/^\d{4}-\d{2}-\d{2}$/.test(d)){var p=d.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
  var dt=new Date(d);
  if(!isNaN(dt)){var dd=String(dt.getDate()).padStart(2,'0'),mm=String(dt.getMonth()+1).padStart(2,'0');return dd+'.'+mm+'.'+dt.getFullYear();}
  return d;
}

function toIso(d){
  if(!d) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if(/^\d{2}\.\d{2}\.\d{4}$/.test(d)){var p=d.split('.');return p[2]+'-'+p[1]+'-'+p[0];}
  return d;
}

function e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function statusShort(s){
  if(s==='s-done')     return 'Окончены';
  if(s==='s-started')  return 'Начаты';
  if(s==='s-front')    return 'Фронт открыт';
  if(s==='s-onsite')   return 'На площадке';
  if(s==='s-remarks')  return 'Замечания';
  return '';
}

var S2CSS={'СМР окончены':'s-done','СМР начаты':'s-started','Фронт открыт':'s-front','Замечания':'s-remarks','На площадке':'s-onsite','':'s-empty'};
var CSS2S={'s-done':'СМР окончены','s-started':'СМР начаты','s-front':'Фронт открыт','s-remarks':'Замечания','s-onsite':'На площадке','s-empty':''};

var PLACE_ORDER={'Этаж':1,'МОП':2,'Квартира':3};
function colKeySort(a, b){
  var cc=a.corpus.localeCompare(b.corpus,undefined,{numeric:true,sensitivity:'base'});
  if(cc!==0) return cc;
  var po=(PLACE_ORDER[a.place]||99)-(PLACE_ORDER[b.place]||99);
  if(po!==0) return po;
  if(a.factNum!==b.factNum) return a.factNum-b.factNum;
  var lc=(a.lvl2||'').localeCompare(b.lvl2||'',undefined,{sensitivity:'base'});
  if(lc!==0) return lc;
  var wc=a.work.localeCompare(b.work,undefined,{sensitivity:'base'});
  if(wc!==0) return wc;
  return (a.extra1||'').localeCompare(b.extra1||'',undefined,{numeric:true,sensitivity:'base'});
}

// ── ТЕСТЫ ────────────────────────────────────────────────────────

section('parseDateMs');
test('валидная дата', () => {
  const ms = parseDateMs('01.05.2026');
  assert.ok(ms > 0);
  assert.strictEqual(new Date(ms).getFullYear(), 2026);
  assert.strictEqual(new Date(ms).getMonth(), 4);
  assert.strictEqual(new Date(ms).getDate(), 1);
});
test('пустая строка → null', () => assert.strictEqual(parseDateMs(''), null));
test('null → null', () => assert.strictEqual(parseDateMs(null), null));
test('undefined → null', () => assert.strictEqual(parseDateMs(undefined), null));
test('неверный формат → null', () => assert.strictEqual(parseDateMs('2026-05-01'), null));
test('31.12.2025 — последний день года', () => {
  const ms = parseDateMs('31.12.2025');
  assert.ok(ms > 0);
  assert.strictEqual(new Date(ms).getMonth(), 11);
  assert.strictEqual(new Date(ms).getDate(), 31);
});
test('сравнение дат — более ранняя < более поздней', () => {
  assert.ok(parseDateMs('01.01.2025') < parseDateMs('01.01.2026'));
});

section('fmtDate');
test('уже в формате дд.мм.гггг → без изменений', () => assert.strictEqual(fmtDate('15.03.2026'), '15.03.2026'));
test('ISO гггг-мм-дд → дд.мм.гггг', () => assert.strictEqual(fmtDate('2026-03-15'), '15.03.2026'));
test('пустая строка → ""', () => assert.strictEqual(fmtDate(''), ''));
test('null → ""', () => assert.strictEqual(fmtDate(null), ''));

section('toIso');
test('дд.мм.гггг → гггг-мм-дд', () => assert.strictEqual(toIso('15.03.2026'), '2026-03-15'));
test('уже ISO → без изменений', () => assert.strictEqual(toIso('2026-03-15'), '2026-03-15'));
test('пустая строка → ""', () => assert.strictEqual(toIso(''), ''));
test('null → ""', () => assert.strictEqual(toIso(null), ''));

section('e() — HTML-экранирование');
test('& экранируется', () => assert.ok(e('a&b').includes('&amp;')));
test('< экранируется', () => assert.ok(e('<script>').includes('&lt;')));
test('" экранируется', () => assert.ok(e('"test"').includes('&quot;')));
test('обычная строка без изменений', () => assert.strictEqual(e('hello'), 'hello'));
test('null → пустая строка', () => assert.strictEqual(e(null), ''));

section('statusShort');
test('s-done → Окончены', () => assert.strictEqual(statusShort('s-done'), 'Окончены'));
test('s-started → Начаты', () => assert.strictEqual(statusShort('s-started'), 'Начаты'));
test('s-front → Фронт открыт', () => assert.strictEqual(statusShort('s-front'), 'Фронт открыт'));
test('s-accepted → "" (статус удалён)', () => assert.strictEqual(statusShort('s-accepted'), ''));
test('s-onsite → На площадке', () => assert.strictEqual(statusShort('s-onsite'), 'На площадке'));
test('s-remarks → Замечания', () => assert.strictEqual(statusShort('s-remarks'), 'Замечания'));
test('s-empty → ""', () => assert.strictEqual(statusShort('s-empty'), ''));
test('неизвестный → ""', () => assert.strictEqual(statusShort('unknown'), ''));

section('S2CSS / CSS2S — консистентность маппинга');
test('все ключи S2CSS имеют обратный маппинг в CSS2S', () => {
  Object.entries(S2CSS).forEach(([s, css]) => {
    if(s === '') return; // пустой статус → s-empty, обратно s-empty → ''
    assert.strictEqual(CSS2S[css], s, `CSS2S['${css}'] должен быть '${s}'`);
  });
});
test('все ключи CSS2S имеют обратный маппинг в S2CSS', () => {
  Object.entries(CSS2S).forEach(([css, s]) => {
    assert.strictEqual(S2CSS[s], css, `S2CSS['${s}'] должен быть '${css}'`);
  });
});

section('COL_KEYS сортировка');
test('разные корпуса — сортировка по названию', () => {
  const keys = [
    {corpus:'К2',place:'Этаж',lvl2:'',work:'Вентиляция',extra1:'',factNum:1},
    {corpus:'К1',place:'Этаж',lvl2:'',work:'Вентиляция',extra1:'',factNum:1},
  ].sort(colKeySort);
  assert.strictEqual(keys[0].corpus, 'К1');
});
test('числовая сортировка корпусов (К9 < К10)', () => {
  const keys = [
    {corpus:'К10',place:'Этаж',lvl2:'',work:'А',extra1:'',factNum:1},
    {corpus:'К9', place:'Этаж',lvl2:'',work:'А',extra1:'',factNum:1},
  ].sort(colKeySort);
  assert.strictEqual(keys[0].corpus, 'К9');
});
test('порядок мест: Этаж → МОП → Квартира', () => {
  const keys = [
    {corpus:'К1',place:'Квартира',lvl2:'',work:'А',extra1:'',factNum:1},
    {corpus:'К1',place:'МОП',     lvl2:'',work:'А',extra1:'',factNum:1},
    {corpus:'К1',place:'Этаж',    lvl2:'',work:'А',extra1:'',factNum:1},
  ].sort(colKeySort);
  assert.strictEqual(keys[0].place, 'Этаж');
  assert.strictEqual(keys[1].place, 'МОП');
  assert.strictEqual(keys[2].place, 'Квартира');
});
test('одинаковый корпус+место — сортировка по factNum', () => {
  const keys = [
    {corpus:'К1',place:'Этаж',lvl2:'',work:'А',extra1:'',factNum:5},
    {corpus:'К1',place:'Этаж',lvl2:'',work:'А',extra1:'',factNum:2},
  ].sort(colKeySort);
  assert.strictEqual(keys[0].factNum, 2);
});
test('одинаковый factNum — сортировка по lvl2 (исправленный баг с группировкой)', () => {
  // Баг: противодымная и общеобменная с одинаковым номером шахты перемешивались
  const keys = [
    {corpus:'К1',place:'Этаж',lvl2:'противодымная',work:'Вентиляция',extra1:'Шахта 4Б',factNum:4},
    {corpus:'К1',place:'Этаж',lvl2:'общеобменная', work:'Вентиляция',extra1:'Шахта 4Б',factNum:4},
  ].sort(colKeySort);
  assert.strictEqual(keys[0].lvl2, 'общеобменная');
  assert.strictEqual(keys[1].lvl2, 'противодымная');
});
test('одинаковый factNum и lvl2 — сортировка по work', () => {
  const keys = [
    {corpus:'К1',place:'Этаж',lvl2:'вид',work:'Монтаж',  extra1:'',factNum:1},
    {corpus:'К1',place:'Этаж',lvl2:'вид',work:'Демонтаж',extra1:'',factNum:1},
  ].sort(colKeySort);
  assert.strictEqual(keys[0].work, 'Демонтаж');
});
test('числовая сортировка extra1 (Шахта 2 < Шахта 10)', () => {
  const keys = [
    {corpus:'К1',place:'Этаж',lvl2:'',work:'А',extra1:'Шахта 10',factNum:1},
    {corpus:'К1',place:'Этаж',lvl2:'',work:'А',extra1:'Шахта 2', factNum:1},
  ].sort(colKeySort);
  assert.strictEqual(keys[0].extra1, 'Шахта 2');
});

// ── Вход через портал acons.space (2026-09-15) ───────────────────
// Эти функции НЕ копируются руками, а вырезаются из index.html по имени — тест проверяет
// именно тот код, что уйдёт на сайт.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const PAGE = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function pageFunction(name) {
  const start = PAGE.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('В index.html нет функции ' + name);
  let depth = 0, i = PAGE.indexOf('{', start);
  for (; i < PAGE.length; i++) {
    if (PAGE[i] === '{') depth++;
    else if (PAGE[i] === '}' && --depth === 0) break;
  }
  return PAGE.slice(start, i + 1);
}
['isPortalHost', 'passInfo', 'passUsable', 'passIsAdmin', 'passNeedsRenew', 'searchWithoutPass']
  .forEach(n => vm.runInThisContext(pageFunction(n)));

// Пропуск как у портала: base64url(JSON) + '.' + подпись (подпись страница не проверяет)
function makePass(obj) { return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url') + '.sig'; }
const NOW = 1_800_000_000;

section('isPortalHost — режим портала по адресу');
test('sb3.acons.space → портал', () => assert.strictEqual(isPortalHost('sb3.acons.space'), true));
test('acons.space → портал', () => assert.strictEqual(isPortalHost('acons.space'), true));
test('SB3.ACONS.SPACE (регистр) → портал', () => assert.strictEqual(isPortalHost('SB3.ACONS.SPACE'), true));
test('nick3000ept.github.io → НЕ портал (всё как раньше)', () => assert.strictEqual(isPortalHost('nick3000ept.github.io'), false));
test('localhost / пусто → НЕ портал', () => { assert.strictEqual(isPortalHost('localhost'), false); assert.strictEqual(isPortalHost(''), false); });
test('подделка acons.space.evil.ru → НЕ портал', () => assert.strictEqual(isPortalHost('acons.space.evil.ru'), false));
test('подделка notacons.space → НЕ портал', () => assert.strictEqual(isPortalHost('notacons.space'), false));

section('passInfo — разбор пропуска');
test('кириллица в ФИО и роли читается', () => {
  const i = passInfo(makePass({ l: 'ivanov', n: 'Иванов Иван', a: 'sb3', r: 'администратор', exp: NOW + 10, iat: NOW }));
  assert.strictEqual(i.n, 'Иванов Иван');
  assert.strictEqual(i.r, 'администратор');
});
test('мусор → null', () => { assert.strictEqual(passInfo('%%%.x'), null); assert.strictEqual(passInfo(''), null); assert.strictEqual(passInfo(null), null); });

section('passUsable / passIsAdmin / passNeedsRenew');
const adm = { l: 'ivanov', n: 'Иванов', a: 'sb3', r: 'администратор', exp: NOW + 100, iat: NOW - 10 };
test('годный пропуск СБ3', () => assert.strictEqual(passUsable(adm, NOW), true));
test('просроченный → не годен', () => assert.strictEqual(passUsable(Object.assign({}, adm, { exp: NOW - 1 }), NOW), false));
test('пропуск другой админки (otdelka) → не годен', () => assert.strictEqual(passUsable(Object.assign({}, adm, { a: 'otdelka' }), NOW), false));
test('без логина или срока → не годен', () => {
  assert.strictEqual(passUsable(Object.assign({}, adm, { l: '' }), NOW), false);
  assert.strictEqual(passUsable(Object.assign({}, adm, { exp: 0 }), NOW), false);
  assert.strictEqual(passUsable(null, NOW), false);
});
test('роль администратор → админ', () => assert.strictEqual(passIsAdmin(adm), true));
test('роль просмотр → не админ', () => assert.strictEqual(passIsAdmin(Object.assign({}, adm, { r: 'просмотр' })), false));
test('роль СК / пусто → не админ', () => { assert.strictEqual(passIsAdmin({ r: 'sk' }), false); assert.strictEqual(passIsAdmin(null), false); });
test('выдан меньше суток назад → не продлевать', () => assert.strictEqual(passNeedsRenew(adm, NOW), false));
test('выдан больше суток назад → продлить', () => assert.strictEqual(passNeedsRenew(Object.assign({}, adm, { iat: NOW - 86401 }), NOW), true));
test('нет iat → продлить', () => assert.strictEqual(passNeedsRenew({ l: 'x' }, NOW), true));

section('searchWithoutPass — убрать ?p= из адреса');
test('только p → пустая строка', () => assert.strictEqual(searchWithoutPass('?p=abc.def'), ''));
test('p и contractor → contractor остаётся', () => {
  const s = searchWithoutPass('?p=abc.def&contractor=' + encodeURIComponent('Топ ИД'));
  assert.strictEqual(new URLSearchParams(s).get('contractor'), 'Топ ИД');
  assert.strictEqual(new URLSearchParams(s).has('p'), false);
});
test('нет p → null (адрес не трогаем)', () => { assert.strictEqual(searchWithoutPass('?contractor=X'), null); assert.strictEqual(searchWithoutPass(''), null); });

// ── Данные через сервер acons.space (2026-09-15, acons-server/TZ.md §15 шаг 3) ──
// Функции берутся прямо из index.html. gasFetch гоняется в отдельной «песочнице» с поддельным fetch.
function pageAsyncFunction(name) {
  const src = pageFunction(name);
  const at = PAGE.indexOf('async function ' + name + '(');
  if (at < 0) throw new Error('В index.html нет async function ' + name);
  return 'async ' + src;
}
['gasServerUrl', 'gasSrvUnreached', 'gasGetNeedsFallback', 'gasPostNotDelivered', 'gasPostRepeatable', 'syncedLabel']
  .forEach(n => vm.runInThisContext(pageFunction(n)));
const PAGE_BASE = (PAGE.match(/BASE='(https:\/\/script\.google\.com[^']+)'/) || [])[1];
const PAGE_API = (PAGE.match(/var SB3_API='([^']+)'/) || [])[1];
global.SB3_API = PAGE_API;   // gasServerUrl берёт адрес из глобальной переменной, как на странице (vm.runInThisContext — глобальный контекст, не модуль)

section('Адрес запросов: портал → /api/sb3, github.io → Google');
test('на странице адрес сервера /api/sb3 и адрес Google на месте', () => {
  assert.strictEqual(PAGE_API, '/api/sb3');
  assert.ok(PAGE_BASE && PAGE_BASE.endsWith('/exec'));
});
test('портал: чтение → /api/sb3 с той же строкой запроса', () =>
  assert.strictEqual(gasServerUrl(PAGE_BASE + '?action=getRows&fmt=2&t=1', PAGE_BASE, true), '/api/sb3?action=getRows&fmt=2&t=1'));
test('портал: запись (адрес без запроса) → /api/sb3', () => assert.strictEqual(gasServerUrl(PAGE_BASE, PAGE_BASE, true), '/api/sb3'));
test('github.io (не портал) → null, запрос уходит в Google', () =>
  assert.strictEqual(gasServerUrl(PAGE_BASE + '?action=getRows&fmt=2', PAGE_BASE, false), null));
test('чужой адрес / похожий префикс → null', () => {
  assert.strictEqual(gasServerUrl('https://acons.space/api/portal', PAGE_BASE, true), null);
  assert.strictEqual(gasServerUrl(PAGE_BASE + 'x?action=1', PAGE_BASE, true), null);
  assert.strictEqual(gasServerUrl(PAGE_BASE, '', true), null);
});
test('на странице не осталось прямых fetch к Google', () => {
  assert.strictEqual(/[^A-Za-z]fetch\(BASE/.test(PAGE), false, 'fetch(BASE… → должно быть gasFetch(BASE…');
  assert.ok(/async function fetchJson[\s\S]{0,300}await gasFetch\(url,opts\)/.test(PAGE), 'fetchJson ходит через gasFetch');
  assert.ok((PAGE.match(/gasFetch\(BASE/g) || []).length >= 8, 'все прямые запросы переведены');
});

section('Когда идти в Google запасным путём');
test('чтение: 200 JSON-данные → сервер', () => assert.strictEqual(gasGetNeedsFallback(200, '{"cols":[],"data":[]}'), false));
test('чтение: 502 / 404 / 504 / сеть-HTML → Google', () => {
  [502, 404, 504, 500, 429].forEach(s => assert.strictEqual(gasGetNeedsFallback(s, '{}'), true, 'HTTP ' + s));
  assert.strictEqual(gasGetNeedsFallback(200, '<!DOCTYPE html>'), true);
  assert.strictEqual(gasGetNeedsFallback(200, ''), true);
});
test('чтение: server_error / google_unavailable / not_ready → Google; bad_pass и ответ «OK» → как есть', () => {
  ['server_error', 'google_unavailable', 'not_ready'].forEach(er =>
    assert.strictEqual(gasGetNeedsFallback(200, JSON.stringify({ ok: false, error: er })), true, er));
  assert.strictEqual(gasGetNeedsFallback(200, '{"ok":false,"error":"bad_pass"}'), false);
  assert.strictEqual(gasGetNeedsFallback(200, 'OK'), false);
});
test('запись: не дошла до службы (404/405/429/502/503, not_ready) → Google', () => {
  [404, 405, 429, 502, 503].forEach(s => assert.strictEqual(gasPostNotDelivered(s, ''), true, 'HTTP ' + s));
  assert.strictEqual(gasPostNotDelivered(200, '{"ok":false,"error":"not_ready"}'), true);
});
test('запись: google_unavailable / server_error / 504 / 500 → НЕ повторять в Google', () => {
  assert.strictEqual(gasPostNotDelivered(200, '{"ok":false,"error":"google_unavailable"}'), false);
  assert.strictEqual(gasPostNotDelivered(200, '{"ok":false,"error":"server_error"}'), false);
  assert.strictEqual(gasPostNotDelivered(504, ''), false);
  assert.strictEqual(gasPostNotDelivered(500, ''), false);
  assert.strictEqual(gasPostNotDelivered(200, '{"ok":true,"saved":1}'), false);
});
test('«данные на ЧЧ:ММ»: сегодня — только время, иначе с датой; пусто → ""', () => {
  const now = new Date(2026, 8, 15, 12, 0);
  assert.strictEqual(syncedLabel(new Date(2026, 8, 15, 9, 5).toISOString(), now), ' · данные на 09:05');
  assert.strictEqual(syncedLabel(new Date(2026, 8, 14, 23, 50).toISOString(), now), ' · данные на 14.09 23:50');
  assert.strictEqual(syncedLabel('', now), '');
  assert.strictEqual(syncedLabel('мусор', now), '');
});

// gasFetch целиком — в песочнице: поддельный fetch записывает, куда ушёл запрос
function sandbox(portal, answers) {
  const calls = [];
  const ctx = vm.createContext({ Response, Date, JSON, String, console });
  ctx.fetch = async function (url, opts) {
    calls.push({ url, opts });
    const a = answers(url, opts, calls.length);
    if (a instanceof Error) throw a;
    return new Response(a.body, { status: a.status || 200, headers: a.headers || { 'Content-Type': 'application/json' } });
  };
  vm.runInContext("var BASE='" + PAGE_BASE + "', PORTAL_MODE=" + (portal ? 'true' : 'false') +
    ", SB3_API='" + PAGE_API + "', DATA_SYNCED_AT='', GAS_SRV_DOWN_UNTIL=0;", ctx);
  ['gasServerUrl', 'gasSrvUnreached', 'gasGetNeedsFallback', 'gasPostNotDelivered', 'gasPostRepeatable'].forEach(n => vm.runInContext(pageFunction(n), ctx));
  vm.runInContext(pageAsyncFunction('gasFetch'), ctx);
  return { ctx, calls };
}
const isSrv = u => u.indexOf('/api/sb3') === 0;
const POST = body => ({ method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
const atests = [];
function atest(name, fn) { atests.push([name, fn]); }

section('gasFetch (асинхронные проверки — ниже)');
atest('github.io: ровно тот же запрос в Google, тот же объект opts', async () => {
  const { ctx, calls } = sandbox(false, () => ({ body: '{"cols":[],"data":[]}' }));
  const opts = POST({ action: 'saveRows', rows: [] });
  await ctx.gasFetch(PAGE_BASE, opts);
  await ctx.gasFetch(PAGE_BASE + '?action=getRows&fmt=2&t=5');
  assert.deepStrictEqual(calls.map(c => c.url), [PAGE_BASE, PAGE_BASE + '?action=getRows&fmt=2&t=5']);
  assert.strictEqual(calls[0].opts, opts);
  assert.strictEqual(ctx.DATA_SYNCED_AT, '');
});
atest('портал: чтение с сервера, «данные на» из X-Synced-At, Google не спрашиваем', async () => {
  const { ctx, calls } = sandbox(true, () => ({ body: '{"cols":["rowId"],"data":[["1"]]}',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Synced-At': '2026-09-15T09:05:00Z' } }));
  const r = await ctx.gasFetch(PAGE_BASE + '?action=getRows&fmt=2&t=5');
  assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3?action=getRows&fmt=2&t=5']);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(JSON.parse(await r.text()), { cols: ['rowId'], data: [['1']] });
  assert.strictEqual(ctx.DATA_SYNCED_AT, '2026-09-15T09:05:00Z');
});
atest('портал: сервер ответил google_unavailable на чтение → тот же запрос в Google', async () => {
  const { ctx, calls } = sandbox(true, u => isSrv(u) ? { body: '{"ok":false,"error":"google_unavailable"}' } : { body: '{"tasks":[]}' });
  const r = await ctx.gasFetch(PAGE_BASE + '?action=getTasks&t=1');
  assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3?action=getTasks&t=1', PAGE_BASE + '?action=getTasks&t=1']);
  assert.deepStrictEqual(JSON.parse(await r.text()), { tasks: [] });
});
atest('портал: служба лежит (502) → Google, и минуту дальше сразу в Google', async () => {
  const { ctx, calls } = sandbox(true, u => isSrv(u) ? { status: 502, body: '<html>502</html>', headers: { 'Content-Type': 'text/html' } } : { body: '{"cols":[],"data":[]}' });
  await ctx.gasFetch(PAGE_BASE + '?action=getRows&fmt=2');
  await ctx.gasFetch(PAGE_BASE, POST({ action: 'saveRows', rows: [] }));
  assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3?action=getRows&fmt=2', PAGE_BASE + '?action=getRows&fmt=2', PAGE_BASE]);
  assert.strictEqual(ctx.DATA_SYNCED_AT, '');
});
atest('портал: сервер не ответил на запись (сеть) → запись уходит в Google с тем же телом', async () => {
  const { ctx, calls } = sandbox(true, u => isSrv(u) ? new TypeError('Failed to fetch') : { body: '{"ok":true,"saved":1}' });
  const opts = POST({ action: 'saveRows', rows: [{ rowId: '1', status: 'x' }] });
  const r = await ctx.gasFetch(PAGE_BASE, opts);
  assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3', PAGE_BASE]);
  assert.strictEqual(calls[1].opts.body, opts.body);
  assert.deepStrictEqual(JSON.parse(await r.text()), { ok: true, saved: 1 });
});
atest('портал: обрыв на поручении/протоколе → в Google НЕ повторяем (могло выполниться), следующее нажатие — сразу в Google', async () => {
  const { ctx, calls } = sandbox(true, u => isSrv(u) ? new TypeError('Failed to fetch') : { body: '{"ok":true}' });
  for (const action of ['addTasks', 'sendProtocol', 'sendTgNotify', 'updateTask', 'saveSysPreset']) {
    calls.length = 0; ctx.GAS_SRV_DOWN_UNTIL = 0;
    const r = await ctx.gasFetch(PAGE_BASE, POST({ action }));
    assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3'], action);
    const j = JSON.parse(await r.text());
    assert.ok(j.ok === false && /проверьте, прежде чем повторять/.test(j.error), action);
  }
  calls.length = 0;
  await ctx.gasFetch(PAGE_BASE, POST({ action: 'addTasks' }));
  assert.deepStrictEqual(calls.map(c => c.url), [PAGE_BASE], 'минуту после обрыва — прямо в Google');
});
test('gasPostRepeatable: только отметки клеток; мусор в теле → нет', () => {
  ['saveRows', 'saveAll', 'saveRow'].forEach(a => assert.strictEqual(gasPostRepeatable({ body: JSON.stringify({ action: a }) }), true, a));
  ['addTasks', 'sendProtocol', 'updateTask', ''].forEach(a => assert.strictEqual(gasPostRepeatable({ body: JSON.stringify({ action: a }) }), false, a));
  assert.strictEqual(gasPostRepeatable({ body: 'не json' }), false);
  assert.strictEqual(gasPostRepeatable(undefined), false);
});
atest('портал: google_unavailable на запись → в Google НЕ повторяем, понятный текст ошибки', async () => {
  const { ctx, calls } = sandbox(true, () => ({ body: '{"ok":false,"error":"google_unavailable"}' }));
  const r = await ctx.gasFetch(PAGE_BASE, POST({ action: 'addTasks', tasks: [{ text: 'x' }] }));
  assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3']);
  const j = JSON.parse(await r.text());
  assert.strictEqual(j.ok, false);
  assert.ok(/Google не ответил/.test(j.error) && /google_unavailable/.test(j.error));
});
atest('портал: 504 и server_error на запись → в Google НЕ повторяем, ответ как есть', async () => {
  let n = 0;
  const { ctx, calls } = sandbox(true, () => (++n === 1 ? { status: 504, body: '<html>504</html>', headers: { 'Content-Type': 'text/html' } }
    : { body: '{"ok":false,"error":"server_error"}' }));
  const r1 = await ctx.gasFetch(PAGE_BASE, POST({ action: 'sendProtocol' }));
  const r2 = await ctx.gasFetch(PAGE_BASE, POST({ action: 'sendProtocol' }));
  assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3', '/api/sb3']);
  assert.strictEqual(r1.status, 504);
  assert.strictEqual(JSON.parse(await r2.text()).error, 'server_error');
});
atest('портал: сервер без модуля (not_ready) → запись в Google', async () => {
  const { ctx, calls } = sandbox(true, u => isSrv(u) ? { body: '{"ok":false,"error":"not_ready"}' } : { body: '{"ok":true}' });
  await ctx.gasFetch(PAGE_BASE, POST({ action: 'updateTask', id: 't1' }));
  assert.deepStrictEqual(calls.map(c => c.url), ['/api/sb3', PAGE_BASE]);
});
atest('портал: ответ Google как есть (не-JSON «OK») отдаётся странице', async () => {
  const { ctx } = sandbox(true, () => ({ body: 'OK', headers: { 'Content-Type': 'text/plain' } }));
  const r = await ctx.gasFetch(PAGE_BASE + '?action=ping');
  assert.strictEqual(await r.text(), 'OK');
});

// ── Бэк: getRowsByIds отдаёт ровно те строки, что getRows (script.gs в песочнице с поддельной таблицей) ──
const GS = fs.readFileSync(path.join(__dirname, '..', 'script.gs'), 'utf8');
function gasSandbox(values, factRows) {
  const reads = [];
  const mkSheet = (name, rows, cols) => ({
    getName: () => name,
    getLastRow: () => rows.length + 1,
    getRange: (r, c, nr, nc) => ({ getValues: () => {
      reads.push([name, r, c, nr, nc]);
      const out = [];
      for (let i = 0; i < nr; i++) {
        const row = rows[r - 2 + i] || [];
        out.push(Array.from({ length: nc }, (_, j) => (row[c - 1 + j] === undefined ? '' : row[c - 1 + j])));
      }
      return out;
    } })
  });
  const main = mkSheet('СБ3_ОБЩАЯ', values), fact = mkSheet('Факт_работы', factRows);
  const ss = { getSheetByName: n => (n === 'СБ3_ОБЩАЯ' ? main : n === 'Факт_работы' ? fact : null), getSheets: () => [main, fact] };
  const ctx = vm.createContext({ Date, JSON, Math, String, Array, Object, parseFloat, parseInt, isNaN, console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    CacheService: { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) } });
  vm.runInContext(GS, ctx);
  return { ctx, reads };
}
function sheetValues(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const corp = 'К' + (1 + (i % 3)), floor = i % 11 === 0 ? 'П' : String(40 - (i % 17)) + (i % 13 === 0 ? ',5' : '');
    rows.push([i % 9 === 4 ? '' : String(1000 + (i % 37 === 5 ? 1 : i)), i % 29 === 7 ? '' : corp, floor, 'доп' + (i % 2), '10',
      i % 2 ? 'Штукатурка' : 'Стяжка', 'Орг' + (i % 4), i % 3 ? 'СМР начаты' : '', i % 5 ? new Date(2026, i % 12, 1 + (i % 27)) : '',
      '', String(i % 100), i % 7 ? '' : 'комм ' + i, new Date(2026, 8, 1), 'Автор', '01.10.2026', new Date(2026, 9, 5), '12', 'м2', '', 'F' + i]);
  }
  return rows;
}
const FACT = [['', '', 'Штукатурка', 'Этаж', 'Отделка', 'Стены', '', '', '', 'да', '3'], ['', '', 'Стяжка', 'МОП', 'Полы', 'Стяжка', '', '', '', '', '1']];

section('script.gs getRowsByIds ↔ getRows');
test('те же строки, колонки, обогащение и порядок; синтетические row_N, дубли rowId, пропуски', () => {
  const { ctx } = gasSandbox(sheetValues(120), FACT);
  const full = ctx.getRows('', true);
  const all = full.data.map(r => r[0]);
  const pick = [...new Set(all.filter((_, i) => i % 4 === 0).concat(['row_6', '1001', 'нет-такого']))];
  const by = ctx.getRowsByIds(JSON.stringify(pick), true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(by.cols)), JSON.parse(JSON.stringify(full.cols)));
  const want = full.data.filter(r => pick.indexOf(r[0]) >= 0);
  // Порядок сравниваем без строк с нечисловым этажом («П»): сортировка getRows для них зависит от набора строк
  // (сравнение с NaN), и в самом Google тоже; страница порядок строк не использует — раскладывает по корпусам/этажам сама.
  const sorted = a => a.map(r => JSON.stringify(r)).sort();
  assert.deepStrictEqual(sorted(by.data), sorted(want));
  const corpOrder = a => a.map(r => r[1]).join();   // корпуса идут по возрастанию одинаково
  assert.strictEqual(corpOrder(by.data), corpOrder(want));
  assert.ok(want.some(r => r[0] === 'row_6'), 'синтетический id найден');
  assert.ok(want.filter(r => r[0] === '1001').length >= 2, 'дубль rowId — все строки с ним');
  assert.strictEqual(by.data.filter(r => r[0] === '1001').length, want.filter(r => r[0] === '1001').length);
  assert.deepStrictEqual(Array.from(by.ids), pick);
});
test('все строки по id = getRows целиком; разрывы между строками читаются кусками', () => {
  const { ctx, reads } = gasSandbox(sheetValues(120), FACT);
  const full = ctx.getRows('', true);
  const ids = [...new Set(full.data.map(r => r[0]))];
  assert.strictEqual(JSON.stringify(ctx.getRowsByIds(JSON.stringify(ids), true).data), JSON.stringify(full.data));
  reads.length = 0;
  ctx.getRowsByIds(JSON.stringify(['1002', '1100']), true);
  const blocks = reads.filter(r => r[0] === 'СБ3_ОБЩАЯ' && r[4] === 20);
  assert.strictEqual(blocks.length, 2, 'далёкие строки — два маленьких чтения, а не весь лист');
  assert.ok(blocks.every(b => b[3] === 1));
});
test('формат без fmt=2, пустой список, ошибки параметра', () => {
  const { ctx } = gasSandbox(sheetValues(30), FACT);
  const rows = ctx.getRowsByIds('["1001"]', false).rows;
  assert.strictEqual(rows.length, 2, 'в листе два rowId 1001 (строки 3 и 7) — обе');
  assert.ok(rows.every(r => r.rowId === '1001'));
  assert.strictEqual(ctx.getRowsByIds('[]', true).data.length, 0);
  assert.ok(ctx.getRowsByIds('не json', true).error);
  assert.ok(ctx.getRowsByIds('{"a":1}', true).error);
  assert.ok(ctx.getRowsByIds(JSON.stringify(Array.from({ length: 1001 }, (_, i) => 'x' + i)), true).error);
});
test('doGet знает getRowsByIds (только чтение, в doPost не добавлено)', () => {
  assert.ok(/action === 'getRowsByIds'\) return jsonOut\(getRowsByIds\(p\.ids/.test(GS));
  const post = GS.slice(GS.indexOf('function doPost('), GS.indexOf('function getWorkDict('));
  assert.strictEqual(post.indexOf('getRowsByIds'), -1);
  const fn = GS.slice(GS.indexOf('function getRowsByIds('), GS.indexOf('// Построчное сохранение'));
  assert.strictEqual(/setValue|setValues|appendRow|clear|delete|insertSheet|LockService/.test(fn), false, 'ничего не пишет');
});

// ── ИТОГ ─────────────────────────────────────────────────────────
(async () => {
  for (const [name, fn] of atests) {
    try { await fn(); console.log('  ✓', name); passed++; }
    catch (e) { console.error('  ✗', name, '\n    ', e.message); failed++; }
  }
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Итого: ${passed + failed} тестов — ${passed} прошло, ${failed} упало`);
  if(failed > 0) process.exit(1);
})();
