#!/usr/bin/env python3
"""
Telegram bot — Device Inventor assistant
Używa claude-haiku-4-5 (tani model) do rozmów.
Uruchamiać: python3 telegram_bot.py &
"""
import os
import requests
import json
import subprocess
import time
import logging
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

TOKEN      = os.environ["TELEGRAM_TOKEN"]
CHAT_ID    = int(os.environ["TELEGRAM_CHAT_ID"])
IDEAS_FILE = BASE_DIR / "project-ideas/ideas.json"
CLAUDE_BIN = os.environ.get("CLAUDE_BIN", str(Path.home() / ".local/bin/claude"))
MODEL      = "claude-haiku-4-5-20251001"
TAVILY_KEY = os.environ.get("TAVILY_KEY", "")
LOG_FILE   = BASE_DIR / "project-ideas/bot.log"

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s %(message)s"
)

# Historia rozmowy (ostatnie 10 wiadomości)
conversation: list[dict] = []
MAX_HISTORY = 10


def api(method, **kwargs):
    r = requests.post(
        f"https://api.telegram.org/bot{TOKEN}/{method}",
        json=kwargs, timeout=10
    )
    return r.json()


def get_updates(offset=None):
    params = {"timeout": 25, "allowed_updates": ["message"]}
    if offset:
        params["offset"] = offset
    r = requests.get(
        f"https://api.telegram.org/bot{TOKEN}/getUpdates",
        params=params, timeout=30
    )
    return r.json()


def send(text, parse_mode="HTML"):
    api("sendMessage", chat_id=CHAT_ID, text=text[:4096], parse_mode=parse_mode)


def send_typing():
    api("sendChatAction", chat_id=CHAT_ID, action="typing")


def load_ideas_summary():
    try:
        data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
        ideas = data.get("ideas", [])
        approved   = [i for i in ideas if i["status"] == "zatwierdzony"]
        consider   = [i for i in ideas if i["status"] in ("do_rozważenia", "do_rozwinięcia")]
        new_ideas  = [i for i in ideas if i["status"] == "nowy"]
        rejected   = [i for i in ideas if i["status"] == "odrzucony"]

        lines = ["=== BAZA POMYSŁÓW ==="]
        if approved:
            lines.append("ZATWIERDZONE: " + ", ".join(f"{i['name']} ({i['rating']}★)" for i in approved))
        if consider:
            lines.append("DO ROZWAŻENIA: " + ", ".join(f"{i['name']}" for i in consider))
        if new_ideas:
            lines.append(f"NOWE (nieocenione): {len(new_ideas)} pomysłów")
        if rejected:
            lines.append(f"ODRZUCONE: {len(rejected)} pomysłów")
        return "\n".join(lines)
    except Exception:
        return "Baza pomysłów niedostępna."


def fetch_weather(city="Warsaw"):
    try:
        r = requests.get(f"https://wttr.in/{city}?format=j1", timeout=5)
        d = r.json()
        cur = d["current_condition"][0]
        desc = cur["weatherDesc"][0]["value"]
        temp = cur["temp_C"]
        feels = cur["FeelsLikeC"]
        wind = cur["windspeedKmph"]
        return f"Pogoda {city}: {desc}, {temp}°C (odczuwalna {feels}°C), wiatr {wind} km/h"
    except Exception:
        return None

def fetch_news():
    try:
        r = requests.get("https://feeds.bbci.co.uk/polish/rss.xml", timeout=5)
        import re
        titles = re.findall(r"<title><!\[CDATA\[(.*?)\]\]></title>", r.text)
        titles = [t for t in titles if "BBC" not in t][:5]
        return "Wiadomości BBC Polska:\n" + "\n".join(f"• {t}" for t in titles)
    except Exception:
        return None

def search_web(query: str) -> str:
    """Wyszukuje przez Tavily API — zwraca czyste wyniki dla AI."""
    try:
        r = requests.post(
            "https://api.tavily.com/search",
            json={"api_key": TAVILY_KEY, "query": query, "max_results": 5, "search_depth": "basic"},
            timeout=10
        )
        data = r.json()
        results = data.get("results", [])
        if not results:
            return ""
        lines = [f"Wyniki wyszukiwania dla: {query}"]
        for res in results:
            lines.append(f"• {res['title']}: {res['content'][:200]}")
        return "\n".join(lines)
    except Exception as e:
        return f"Błąd wyszukiwania: {e}"

def fetch_url(url: str) -> str:
    """Pobiera stronę przez Jina Reader — zwraca czysty markdown, mało tokenów."""
    try:
        jina_url = f"https://r.jina.ai/{url}"
        r = requests.get(jina_url, timeout=15, headers={
            "Accept": "text/plain",
            "X-Return-Format": "markdown"
        })
        text = r.text.strip()
        return text[:3000]
    except Exception as e:
        return f"Nie udało się pobrać strony: {e}"

def enrich_with_data(user_msg: str) -> str:
    """Dodaj dane z zewnątrz jeśli pytanie ich dotyczy."""
    msg_lower = user_msg.lower()
    extra = []
    if any(w in msg_lower for w in ["pogoda", "temperatura", "deszcz", "słońce", "weather"]):
        city = "Warsaw"
        if "krak" in msg_lower: city = "Krakow"
        elif "gdańsk" in msg_lower or "gdansk" in msg_lower: city = "Gdansk"
        w = fetch_weather(city)
        if w: extra.append(w)
    if any(w in msg_lower for w in ["wiadomości", "news", "aktualności", "co się dzieje", "świat"]):
        n = fetch_news()
        if n: extra.append(n)
    # Wykryj URL w wiadomości
    import re
    urls = re.findall(r"https?://[^\s]+", user_msg)
    for url in urls[:2]:
        content = fetch_url(url)
        extra.append(f"Treść strony {url}:\n{content}")

    # Wyszukiwanie ogólne — gdy brak pogody/newsów/URL ale pytanie wymaga internetu
    search_triggers = ["znajdź", "wyszukaj", "sprawdź", "co to", "kim jest", "kiedy", "ile kosztuje", "gdzie", "jak działa", "najnowsze", "ostatnie", "2025", "2026"]
    if not extra and any(w in msg_lower for w in search_triggers):
        results = search_web(user_msg)
        if results:
            extra.append(results)

    return "\n".join(extra)

def ask_claude(user_msg: str) -> str:
    global conversation

    conversation.append({"role": "user", "content": user_msg})
    if len(conversation) > MAX_HISTORY:
        conversation = conversation[-MAX_HISTORY:]

    ideas_ctx = load_ideas_summary()

    history_text = ""
    for msg in conversation[:-1]:
        role = "Użytkownik" if msg["role"] == "user" else "Odpowiedź"
        history_text += f"{role}: {msg['content']}\n"

    live_data = enrich_with_data(user_msg)

    user_name = os.environ.get("USER_NAME", "Użytkownik")
    dashboard_url = os.environ.get("DASHBOARD_URL", "http://localhost:8765")
    prompt = f"""Jesteś Gru — asystent ogólny z kontekstem projektu Device Inventor. Pomagasz {user_name}.

Stan bazy projektów elektronicznych:
{ideas_ctx}

Dashboard: {dashboard_url}
{f'Aktualne dane:{chr(10)}{live_data}' if live_data else ''}
{f'Poprzednie wiadomości:{chr(10)}{history_text}' if history_text else ''}
{user_name} pyta: {user_msg}

Odpowiedz krótko po polsku (wiadomość na Telegram)."""

    try:
        result = subprocess.run(
            [CLAUDE_BIN, "-p", prompt, "--allowedTools", "WebSearch,WebFetch"],
            capture_output=True, text=True, timeout=90
        )
        response = result.stdout.strip() if result.returncode == 0 else "Błąd odpowiedzi."
    except subprocess.TimeoutExpired:
        response = "Przekroczono limit czasu — spróbuj ponownie."
    except Exception as e:
        response = f"Błąd: {e}"

    conversation.append({"role": "assistant", "content": response})
    return response


def handle_message(text: str):
    text = text.strip()
    logging.info(f"MSG: {text[:80]}")

    # Komendy specjalne
    if text in ("/start", "/help"):
        send(
            "👋 Cześć! Jestem asystentem Device Inventor.\n\n"
            "Możesz:\n"
            "• Pytać o pomysły na projekty elektroniczne\n"
            "• Prosić o rozwinięcie konkretnego projektu\n"
            "• Pytać o komponenty, koszty, trudność\n"
            "• /lista — pokaż zatwierdzone projekty\n"
            "• /nowe — pokaż nowe propozycje\n\n"
            "Dashboard: http://192.168.1.112:8765"
        )
        return

    if text == "/lista":
        try:
            data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
            approved = [i for i in data["ideas"] if i["status"] == "zatwierdzony"]
            if approved:
                lines = ["🏆 <b>Projekty godne uwagi:</b>\n"]
                for i in sorted(approved, key=lambda x: -(x.get("rating") or 0)):
                    stars = "★" * (i.get("rating") or 0)
                    lines.append(f"<b>{i['name']}</b> {stars}\n{i['tagline']}\n💰 ~{i['estimated_cost_pln']} PLN\n")
                send("\n".join(lines))
            else:
                send("Brak zatwierdzonych projektów.")
        except Exception:
            send("Błąd odczytu bazy.")
        return

    if text == "/nowe":
        try:
            data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
            new = [i for i in data["ideas"] if i["status"] == "nowy"]
            if new:
                lines = [f"🆕 <b>Nowe propozycje ({len(new)}):</b>\n"]
                for i in new:
                    lines.append(f"• <b>{i['name']}</b> — {i['tagline']}")
                lines.append(f"\n👉 http://192.168.1.112:8765")
                send("\n".join(lines))
            else:
                send("Brak nowych propozycji.")
        except Exception:
            send("Błąd odczytu bazy.")
        return

    # Normalna rozmowa
    send_typing()
    response = ask_claude(text)
    send(response)


def main():
    logging.info("Bot uruchomiony")
    send("🤖 Bot Device Inventor aktywny!\nNapisz coś lub użyj /help")

    offset = None
    while True:
        try:
            data = get_updates(offset)
            for update in data.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message", {})
                if msg.get("chat", {}).get("id") == CHAT_ID:
                    text = msg.get("text", "")
                    if text:
                        handle_message(text)
        except requests.exceptions.Timeout:
            pass  # normalne przy long-polling
        except Exception as e:
            logging.error(f"Błąd: {e}")
            time.sleep(5)


if __name__ == "__main__":
    import os, sys
    # Nie uruchamiaj jeśli już działa
    pid_file = Path("/tmp/telegram_bot.pid")
    if pid_file.exists():
        old_pid = int(pid_file.read_text())
        if Path(f"/proc/{old_pid}").exists():
            print(f"Bot już działa (PID {old_pid}), wychodzę.")
            sys.exit(0)
    pid_file.write_text(str(os.getpid()))
    try:
        main()
    finally:
        pid_file.unlink(missing_ok=True)
