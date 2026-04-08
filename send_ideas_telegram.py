#!/usr/bin/env python3
"""
Wysyła 4 pomysły z bazy na Telegram.
Uruchamiany przez cron: o 7:00 i 15:00.
"""
import os
import json
import random
import requests
from pathlib import Path
from datetime import date
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

TOKEN    = os.environ["TELEGRAM_TOKEN"]
CHAT_ID  = os.environ["TELEGRAM_CHAT_ID"]
IDEAS_FILE = BASE_DIR / "project-ideas/ideas.json"
DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "http://192.168.1.34:8765")
COUNT = 4


def send(text):
    requests.post(
        f"https://api.telegram.org/bot{TOKEN}/sendMessage",
        json={"chat_id": CHAT_ID, "text": text[:4096], "parse_mode": "HTML"},
        timeout=10
    )


def pick_ideas():
    data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
    ideas = data.get("ideas", [])

    # Priorytet: nowe z dzisiaj, potem wszystkie nowe, potem do_rozważenia
    today = str(date.today())
    new_today  = [i for i in ideas if i.get("status") == "nowy" and i.get("added_date") == today]
    new_all    = [i for i in ideas if i.get("status") == "nowy" and i.get("added_date") != today]
    consider   = [i for i in ideas if i.get("status") in ("do_rozważenia", "do_rozwinięcia")]

    pool = new_today + new_all + consider
    random.shuffle(pool)
    return pool[:COUNT]


def format_idea(idx, idea):
    stars = ("★" * idea["rating"]) if idea.get("rating") else ""
    cost = f"💰 ~{idea['estimated_cost_pln']} PLN" if idea.get("estimated_cost_pln") else ""
    diff = idea.get("difficulty", "")
    lines = [
        f"<b>{idx}. {idea['name']}</b> {stars}",
        idea.get("tagline", ""),
    ]
    if cost or diff:
        lines.append(f"{cost}  🔧 {diff}".strip())
    return "\n".join(l for l in lines if l.strip())


def main():
    ideas = pick_ideas()
    if not ideas:
        send("📭 Brak nowych pomysłów w bazie.")
        return

    hour = int(os.popen("date +%H").read().strip())
    label = "🌅 Poranne" if hour < 12 else "🌆 Popołudniowe"

    lines = [f"{label} pomysły ({date.today().strftime('%d.%m')}):\n"]
    for i, idea in enumerate(ideas, 1):
        lines.append(format_idea(i, idea))
        lines.append("")

    lines.append(f"👉 <a href='{DASHBOARD_URL}'>Dashboard</a>")
    send("\n".join(lines))


if __name__ == "__main__":
    main()
