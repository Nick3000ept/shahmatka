import os
import requests
from datetime import datetime, timezone, timedelta
import anthropic

TELEGRAM_BOT_TOKEN = os.environ['TELEGRAM_BOT_TOKEN']
TELEGRAM_CHAT_ID = os.environ['TELEGRAM_CHAT_ID']

REPOS = [
    {'name': 'shahmatka', 'gh': 'Nick3000ept/shahmatka'},
    {'name': 'supply-form', 'gh': 'Nick3000ept/supply-form'},
]

# Пути к файлам кода (относительно корня shahmatka-репозитория)
CODE_FILES = {
    'shahmatka': ['index.html', 'script.gs'],
    'supply-form': ['supply-form/index.html', 'supply-form/Code.gs'],
}


def get_recent_commits(repo_slug):
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    url = f'https://api.github.com/repos/{repo_slug}/commits?since={since}&per_page=20'
    r = requests.get(url, headers={'Accept': 'application/vnd.github.v3+json'}, timeout=10)
    if r.status_code == 200:
        return [c['commit']['message'].split('\n')[0] for c in r.json()]
    return []


def read_code_sample(repo_name):
    for path in CODE_FILES.get(repo_name, []):
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                return path, f.read()[:3000]
    return None, None


def build_prompt(commits_by_repo, code_samples):
    has_commits = any(commits_by_repo.values())

    if has_commits:
        lines = []
        for repo, msgs in commits_by_repo.items():
            if msgs:
                lines.append(f"Репозиторий {repo}: {'; '.join(msgs)}")
        context = "Вчерашние коммиты:\n" + '\n'.join(lines)
        section_header = "Вчера ты трогал:"
    else:
        parts = []
        for fname, content in code_samples:
            if fname and content:
                parts.append(f"Файл {fname}:\n{content[:1500]}")
        context = "Код из проектов (вчера коммитов не было):\n\n" + '\n\n'.join(parts)
        section_header = "Что есть в твоих проектах:"

    return f"""Ты — ежедневный образовательный агент для основателя без технического бэкграунда. Он строит реальные проекты через AI-инструменты (Claude Code). Стек: Google Apps Script, HTML/CSS, Netlify, git. Код сам не пишет, но принимает продуктовые решения и понимает системы концептуально.

{context}

Напиши короткое образовательное сообщение на русском языке. Строго следуй этому формату — только обычный текст, без звёздочек и markdown-символов:

Ежедневный дайджест

{section_header}
• [название репо]: [что изменилось или что интересного есть в коде]

Что стоит понять лучше:
[Выбери ОДИН концепт из кода дня. Объясни просто, с аналогией из реальной жизни. Максимум 4 предложения. Примеры концептов: функция в GAS, деплой на Netlify, HTML-форма, git commit, fetch-запрос, Google Sheets как база данных, триггер в Apps Script, doGet/doPost, localStorage, event listener]

Твой уровень сегодня:
[Одно честное и конкретное предложение. Ободряющее, но по делу — что именно говорит код о его понимании.]"""


def send_telegram(text):
    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    r = requests.post(url, json={'chat_id': TELEGRAM_CHAT_ID, 'text': text}, timeout=10)
    return r.json().get('ok', False)


def main():
    commits_by_repo = {}
    for repo in REPOS:
        commits_by_repo[repo['name']] = get_recent_commits(repo['gh'])

    code_samples = []
    if not any(commits_by_repo.values()):
        for repo in REPOS:
            fname, content = read_code_sample(repo['name'])
            code_samples.append((fname, content))

    client = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
    prompt = build_prompt(commits_by_repo, code_samples)

    response = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=600,
        messages=[{'role': 'user', 'content': prompt}]
    )

    text = response.content[0].text
    ok = send_telegram(text)
    if not ok:
        send_telegram(text)


if __name__ == '__main__':
    main()
