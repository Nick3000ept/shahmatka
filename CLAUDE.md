# СБ3 · Шахматка — Административная панель

## Стек
- **Frontend**: `index.html` — один файл, чистый HTML/CSS/JS, без фреймворков
- **Backend**: `script.gs` — Google Apps Script (хранится локально для версионирования, деплоится вручную в GAS редактор)
- **Хостинг**: Netlify — `https://regal-lebkuchen-9947f5.netlify.app`
- **Репозиторий**: `https://github.com/Nick3000ept/shahmatka`

## Деплой (все три команды по запросу "задеплой")
```bash
cd "c:/Users/User/YandexDisk/VS_hub/СБ3_Шахматка"
# 1. Netlify (фронтенд)
netlify deploy --dir . --prod
# 2. Google Apps Script (бэкенд)
clasp push --force
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
