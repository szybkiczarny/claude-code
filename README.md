# Kuba Starter — Device Inventor z Gru

Twój osobisty setup do odkrywania i budowania projektów elektronicznych z pomocą AI.

## Pierwsze uruchomienie

### 1. Zainstaluj Claude CLI
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Zaloguj się (subskrypcja Pro — bez klucza API)
```bash
claude login
```
Otworzy się przeglądarka — zaloguj się swoim kontem claude.ai. To wystarczy, żadnego klucza API nie potrzebujesz.

### 3. Uruchom Claude w tym katalogu
```bash
cd ~/CLAUDE_CODE
claude
```

Gru przywita się i przeprowadzi Cię przez resztę konfiguracji (GitHub, Telegram, dashboard).

> `.env` potrzebujesz dopiero gdy będziesz chciał bota Telegram — wtedy `cp .env.template .env` i uzupełnij tylko `TELEGRAM_TOKEN` i `TELEGRAM_CHAT_ID`.

## Co tu jest

- **dashboard/** — przeglądarka pomysłów na projekty (web UI)
- **device-inventor/** — definicja skilla generatora pomysłów
- **project-ideas/** — baza pomysłów (JSON)
- **projects/** — tu trafiają aktywne projekty
- **gru/** — pamięć i konfiguracja asystenta
- **generate_ideas.sh** — skrypt generujący nowe pomysły (cron 3x dziennie)
- **telegram_bot.py** — bot Telegram

## Uruchomienie dashboardu

```bash
python3 dashboard/server.py &
# Otwórz http://localhost:8765
```
