# СБ3 · Шахматка — Административная панель

## Стек
- **Frontend**: `index.html` — один файл, чистый HTML/CSS/JS, без фреймворков
- **Backend**: `script.gs` — Google Apps Script (хранится локально для версионирования, деплоится вручную в GAS редактор)
- **Хостинг**: Netlify — `https://shahmatka.netlify.app`
- **Репозиторий**: `https://github.com/Nick3000ept/shahmatka`

## Деплой (все команды по запросу "задеплой")
```bash
cd "c:/Users/User/YandexDisk/VS_hub/СБ3_Шахматка"
# 1. Netlify (фронтенд)
netlify deploy --dir . --prod
# 2. Google Apps Script (бэкенд) — сначала пушим код, потом обновляем живой деплой
clasp push --force
clasp deploy --deploymentId AKfycbwBRlgDFkLzGfJngvBczEBLaXMxlr3l4jGai_-ZHw28EVJrogYvxsqnecuZbZS3EJdG
# 3. Git
git add index.html script.gs appsscript.json CLAUDE.md .gitignore
git commit -m "описание изменений"
git push
```

## Структура
```
СБ3_Шахматка/
  index.html   ← вся фронтенд-логика (шахматка, UI, запросы к GAS)
  script.gs    ← Apps Script бэкенд (хранится здесь, деплоится в Google)
  CLAUDE.md    ← этот файл
  .gitignore   ← исключает .netlify/
```

## Google Apps Script
- Лист данных: `СБ3_ОБЩАЯ`
- Лист подрядчиков: `Подрядчики`
- Лист работ: `Факт_работы`
- Столбцы A–N редактируемые, O+ не трогать никогда
- URL скрипта вводится пользователем в поле в шапке и сохраняется в localStorage

## Правила безопасности (СТРОГО)

### Файлы — разрешено редактировать ТОЛЬКО:
- `index.html`
- `script.gs`
- `CLAUDE.md`
- `appsscript.json`
- `.gitignore`

### Никогда НЕ делать:
- НЕ удалять файлы из проекта
- НЕ трогать файлы вне папки `СБ3_Шахматка/`
- НЕ использовать `git reset --hard`, `git push --force`, `git clean`
- НЕ удалять ветки git
- НЕ деплоить без явной команды "задеплой" от пользователя
- НЕ менять настройки GAS (права доступа, триггеры) — только код в `script.gs`
- НЕ трогать другие проекты в `VS_hub/`

### Google Sheets — никогда:
- НЕ добавлять код для записи в столбцы O+
- НЕ удалять строки/листы через скрипт
- Любые изменения данных только через существующий API (saveRow/saveAll)

### Перед деплоем — всегда:
- Убедиться что изменения только в разрешённых файлах
- Деплоить только по явной команде пользователя

## Важные правила
- Все изменения только в `index.html` и `script.gs`
- Пользователь не умеет кодить — работает полностью через Claude Code
- Пользователь описывает задачу словами, Claude сам решает где и что менять
- Если отступление от правил безопасности принесёт ощутимую пользу проекту — предложить пользователю на решение, не делать молча

## Workflow с пользователем
1. Пользователь описывает что хочет изменить
2. Claude вносит правки в нужные файлы
3. По команде "задеплой" — git commit + push + netlify deploy

## На новом компьютере
```bash
git clone https://github.com/Nick3000ept/shahmatka.git
cd shahmatka
netlify link --id 1e719907-2772-4c8b-8cd8-2cd888ff41ff
```
Netlify CLI должен быть установлен: `npm install -g netlify-cli` + `netlify login`

## Аккаунты
- Netlify: workcacc2025@gmail.com (команда plot), site ID: `1e719907-2772-4c8b-8cd8-2cd888ff41ff`
- GitHub: Nick3000ept
- GAS: аккаунт `kuzkin@acons.group`, deployment URL: `https://script.google.com/macros/s/AKfycbwBRlgDFkLzGfJngvBczEBLaXMxlr3l4jGai_-ZHw28EVJrogYvxsqnecuZbZS3EJdG/exec`
- GAS Script ID: `1Hb-7m3iixcoM18qokY-F6qakDTMwJ5usghV7u7IAgAvEv83zi-YN56DY`

---

## Логика бэкенда (script.gs) — актуальное состояние

> **Правило:** при любом изменении логики сохранения/загрузки — обновлять этот раздел.

### Эндпоинты

| Метод | action | Что делает |
|---|---|---|
| GET | `getRows` | Читает лист СБ3_ОБЩАЯ (столбцы A–P), обогащает данными из Факт_работы, возвращает JSON |
| GET | `getContractors` | Читает лист Подрядчики, столбец A с 2-й строки |
| GET | `clearCache` | Сбрасывает CacheService (ключи sb3_rows_*) |
| POST | `saveRow` | Сохраняет ≤20 строк параллельными одиночными запросами |
| POST | `saveAll` | Сохраняет >20 строк пакетом |

### Логика saveRow (построчная, для ≤20 ячеек)
1. Ищет строку по rowId в столбце A
2. Читает **одну строку** A–N (14 столбцов)
3. Перезаписывает **только пришедшие поля** (status/pct/dateEnd/org/comment)
4. Дописывает автора (col N) и дату изменения (col M)
5. Пишет строку обратно одним запросом

### Логика saveAll (пакетная, для >20 ячеек)
1. Читает **весь лист** A–N одним запросом (`getRange` всех строк)
2. Строит карту `rowId → индекс`
3. Для каждой пришедшей строки перезаписывает только изменённые поля
4. Пишет **весь лист** обратно одним запросом (`setValues`)

### Защита от одновременной записи — LockService
Только `saveAll` оборачивается в `LockService.getScriptLock()` (saveRow работает с одной строкой — лок не нужен, параллельные запросы не конфликтуют):
- Второй пользователь ждёт освобождения лока (до 15 сек)
- После получения лока **читает уже обновлённые данные** → пишет поверх них
- Перезапись чужих изменений исключена

`saveAll` делает read-all → modify → write-all, но **чтение происходит внутри лока** — поэтому всегда читаются актуальные данные после предыдущей записи.

### Поля строки (столбцы A–N)
```
A(1)=rowId  B(2)=corpus  C(3)=floor   D(4)=extra1  E(5)=volume
F(6)=work   G(7)=org     H(8)=status  I(9)=dateEnd J(10)=dateRecv
K(11)=pct   L(12)=comment M(13)=dateChg N(14)=author
O+= не трогать никогда (P(15)=baseDate, Q(16)=currentDate читаются только на чтение)
```

### Фронтенд → бэкенд: что передаётся при сохранении
Передаются **только изменённые поля** из объекта `MOD[rowId]`. Неизменённые поля не отправляются — бэкенд их не трогает.
```js
// Поля которые могут прийти в saveRow/saveAll:
{ rowId, author, status?, pct?, dateEnd?, comment?, org? }
```

---

## Карта функций index.html (для навигации без чтения всего файла)

### Глобальные переменные (строки 538–558)
- `BASE` — URL GAS-скрипта
- `ROWS[]` — все строки из Google Sheets
- `MOD{}` — несохранённые изменения {rowId: {status, pct, dateEnd, comment, org}}
- `SEL` — Set rowId выбранных ячеек (мультивыбор)
- `CUR` — текущая строка в одиночном попапе
- `FC` — Set корпусов для фильтра; `FO` — орг; `FM` — место; `FL2` — уровень; `FW` — Set работ; `FKP` — чекбокс КП
- `COL_KEYS[]` — порядок столбцов: [{corpus, place, lvl2, work, key, factNum}]
- `FLOOR_LIST[]` — порядок этажей (по убыванию)
- `CONTRACTORS[]` — список подрядчиков
- `WORKS[]` — список видов работ
- `MS_DRAFT` — черновик мультиредактирования {status, dateEnd, pct}
- `S2CSS{}` / `CSS2S{}` — маппинг статус↔CSS-класс
- `ZOOM` — текущий масштаб (10–150%)
- `AUTHOR` — имя пользователя для сохранения

### Инициализация (строка 638)
- `window.onload` — восстанавливает zoom/автора из localStorage, загружает данные, вешает хоткеи (Ctrl+S, Esc)

### Масштаб (строки 522–536)
- `changeZoom(delta)` — изменить масштаб на delta%; сохраняет в localStorage
- `applyZoom()` — применяет CSS zoom к #zoom-wrap

### Автор (строка 544)
- `saveAuthor(v)` — сохраняет имя автора в AUTHOR и localStorage

### Данные / загрузка (строки 666–725)
- `loadContractors()` — загружает список подрядчиков из GAS, кэширует в localStorage
- `renderContractorSelect(selected)` — обновляет <select#p-contractor> в попапе
- `selContractor(name, el)` — выбирает подрядчика по чипу (CUR_CONTRACTOR)
- `reload()` — вызывает loadData()
- `loadData()` — главная загрузка: fetch getRows → ROWS → buildFilters() → render()

### Фильтры (строки 728–813)
- `buildFilters()` — строит чипы корпусов + select орг/место/уровень + список работ из ROWS
- `setCorpus(el, v)` — переключает фильтр корпуса (FC); v='' → все
- `applyFilters()` — читает значения из DOM → FO/FM/FL2/FKP → render()
- `applyFiltersAndTags()` — то же + обновляет теги фильтров
- `renderFilterTags()` — рисует плашки активных фильтров под filterbar
- `clearFilterTag(i)` — сбрасывает i-й тег фильтра
- `toggleSP(on)` — переключает режим "показывать подрядчика" в ячейках (SHOW_SP)

### Дропдаун работ (строки 560–632)
- `renderWorkDrop(query)` — перерисовывает список работ с поиском
- `selWork(w)` — выбрать работу (w='') = сбросить все; обновляет FW
- `toggleWork(w)` — переключить одну работу в FW
- `updateWorkInp()` — обновляет теги выбранных работ в поле ввода
- `showWorkDrop()` / `hideWorkDrop()` — показать/скрыть дропдаун
- `workSearchFilter(q)` — фильтрация при вводе в поиск работ
- `renderDeferred()` — вызывает render() через 150мс дебаунс

### Главный рендер (строки 816–1072)
- `render()` — ОСНОВНАЯ ФУНКЦИЯ: фильтрует ROWS → строит HTML таблицы (thead 4 строки + tbody) → вставляет в #board; вызывает renderSB/renderUnsaved/updateMsBar
  - Строит COL_KEYS (уникальные колонки корпус→место→работа)
  - Строит FLOOR_LIST (этажи по убыванию)
  - Считает spans для colspan заголовков
  - В ячейках: отображает статус (цвет), даты базовая/текущая/фактическая, просрочку, отклонение (+Nд), прогресс-бар
- `statusShort(s)` — CSS-класс → русское название статуса (для SB)
- `renderSB(rows)` — обновляет счётчики в статусбаре (#sb-total/done/left/start/rem)
- `renderUnsaved()` — показывает/скрывает бейдж "N несохр." и кнопку сохранить всё

### Выделение ячеек (строки 1108–1193)
- `cellClick(ev, rowId)` — клик по ячейке: Ctrl → мультивыбор, обычный → открывает попап
- `toggleRow(fl, ev)` — клик по номеру этажа: выделяет/снимает всю строку
- `toggleCol(colIdx, ev)` — клик по заголовку работы: выделяет/снимает весь столбец
- `isRowSelected(fl)` — проверяет, все ли ячейки строки выделены
- `isColSelected(colIdx)` — проверяет, все ли ячейки столбца выделены
- `clearSel()` — сбрасывает SEL, обновляет визуал и msbar
- `updateCellSel()` — синхронизирует CSS-классы sel/row-sel/col-sel с SET SEL

### Мультиредактирование — нижняя панель msbar (строки 1196–1280)
- `updateMsBar()` — показывает/скрывает #msbar (показывается при SEL.size > 1)
- `resetMsDraft()` — сбрасывает MS_DRAFT и все контролы в msbar
- `msDraftStatus(s)` — устанавливает статус в черновик; автосвязь: done/accepted → 100%
- `msPctUpd(v)` — слайдер % изменился; автосвязь: 100% → done
- `msPctResetToggle(checked)` — чекбокс "сбросить %" (блокирует слайдер)
- `msUpdatePreview()` — обновляет превью тегов в msbar
- `msCommit()` — применяет MS_DRAFT ко всем ячейкам SEL → MOD, сбрасывает черновик

### Попап одиночного редактирования (строки 1282–1416)
- `openPanel(rowId, anchorEl)` — открывает попап: заполняет статус/дату/% /комментарий/подрядчик из ROWS[rowId] или MOD[rowId]
- `positionPopover(anchor)` — позиционирует #popover рядом с anchorEl, не выходя за экран
- `closePanel()` — скрывает попап, CUR=null
- `selSt(s)` — выбрать статус в попапе (CUR_ST); автосвязь: done/accepted → 100%
- `selStMixed()` — режим "mixed" когда у выбранных ячеек разные статусы
- `updPct(v)` — слайдер % в попапе изменился; автосвязь: 100% → done
- `setPct(v)` — установить % программно (при смене статуса)
- `savePanel()` — читает поля попапа → пишет в MOD для всех rowId из SEL (или CUR)

### Сохранение в Google Sheets (строки 1418–1496)
- `updateSaveBtn()` — показывает/скрывает кнопку "Сохранить всё" и бейдж
- `batchSave(rowIds)` — отправляет изменения из MOD в GAS: ≤20 строк → параллельные saveRow, >20 → saveAll; обновляет ROWS, чистит MOD
- `saveAll()` — проверяет AUTHOR, берёт все ключи MOD → batchSave

### Утилиты (строки 1498–1529)
- `parseDateMs(s)` — "дд.мм.гггг" → timestamp ms
- `fmtDateMs(ms)` — timestamp ms → "дд.мм" (без года, для заголовков)
- `fmtDate(d)` — любой формат даты → "дд.мм.гггг"
- `toIso(d)` — "дд.мм.гггг" → "гггг-мм-дд" (для input type=date)
- `setSt(st, txt)` — обновляет индикатор синхронизации (#sdot / #stxt): 'ok'|'err'|'spin'
- `showLoader(txt)` / `hideLoader()` — показывает/скрывает оверлей загрузки
- `toast(msg, tp, dur)` — всплывающее уведомление: tp='ok'|'err'|'inf'
- `e(s)` — HTML-экранирование строки

### Ключевые ID элементов DOM
- `#board` — таблица шахматки (`<table>`)
- `#empty` — заглушка "нет данных"
- `#popover` — попап одиночного редактирования
- `#msbar` — нижняя панель мультиредактирования
- `#fc` — контейнер чипов корпусов
- `#forg` / `#fplace` / `#flvl2` — select-фильтры
- `#work-search-inp` / `#work-drop` / `#work-tags` — поле+дропдаун+теги работ
- `#filter-tags-bar` / `#filter-tags-list` — бар активных тегов фильтров
- `#pct-sl` / `#pct-val` — слайдер % в попапе
- `#ms-pct-sl` / `#ms-pct-val` / `#ms-pct-reset` — слайдер % в msbar
- `#ms-date` / `#ms-contractor` — дата и подрядчик в msbar
- `#ms-preview` — превью изменений в msbar
- `#p-date` / `#p-comment` / `#p-contractor` — поля попапа
- `#sb-total` / `#sb-done` / `#sb-left` / `#sb-start` / `#sb-rem` — счётчики статусбара
- `#ubadge` / `#save-all-btn` — бейдж несохранённых и кнопка сохранить всё
- `#author-inp` — поле имени автора
- `#sdot` / `#stxt` — индикатор синхронизации
- `#loader` / `#loader-txt` — оверлей загрузки
- `#toasts` — контейнер уведомлений
- `#zoom-wrap` / `#zoom-val` — зум-обёртка и отображение %
- `#contractor-chips` — чипы подрядчиков в filterbar
