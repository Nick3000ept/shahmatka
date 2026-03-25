# СБ3 · Шахматка — Административная панель

## Стек
- **Frontend**: `index.html` — один файл, чистый HTML/CSS/JS, без фреймворков
- **Backend**: `script.gs` — Google Apps Script (хранится локально для версионирования, деплоится вручную в GAS редактор)
- **Хостинг**: Netlify — `https://regal-lebkuchen-9947f5.netlify.app`
- **Репозиторий**: `https://github.com/Nick3000ept/shahmatka`

## Деплой
```bash
cd "c:/Users/User/YandexDisk/VS_hub/СБ3_Шахматка"
netlify deploy --dir . --prod
```

## Git (после изменений)
```bash
cd "c:/Users/User/YandexDisk/VS_hub/СБ3_Шахматка"
git add index.html script.gs
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

## Важные правила
- Не трогать столбцы O+ в таблице
- `script.gs` редактируется здесь, затем копируется в GAS редактор вручную
- Все изменения только в `index.html` и `script.gs`
- После правок — коммит + деплой

## Автор / аккаунт
- Netlify: workcacc2025@gmail.com (команда plot)
- GitHub: Nick3000ept
