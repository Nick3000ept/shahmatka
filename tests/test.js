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

// ── ИТОГ ─────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Итого: ${passed + failed} тестов — ${passed} прошло, ${failed} упало`);
if(failed > 0) process.exit(1);
