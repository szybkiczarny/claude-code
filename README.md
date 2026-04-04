# Kuba Starter — Device Inventor z Gru

Twój osobisty setup do odkrywania i budowania projektów elektronicznych z pomocą AI.

## Pierwsze uruchomienie

### 1. Zainstaluj Claude CLI
```bash
npm install -g @anthropic-ai/claude-code
```
Lub sprawdź aktualne instrukcje na: https://claude.ai/code

### 2. Skonfiguruj .env
```bash
cp .env.template .env
# Otwórz .env i wpisz swój klucz Anthropic API
```

### 3. Uruchom Claude w tym katalogu
```bash
cd kuba-starter
claude
```

Claude przywita się i przeprowadzi Cię przez resztę konfiguracji (GitHub, Telegram, dashboard).

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
