#!/bin/bash
# Generuje nowe pomysły urządzeń i zapisuje do ideas.json
# Uruchamiany przez crontab 3x dziennie: 8:03, 14:03, 20:03
# Ustaw ścieżkę w crontab: 3 8,14,20 * * * /home/TWOJ_USER/CLAUDE_CODE/generate_ideas.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.env"

SKILL="$SCRIPT_DIR/device-inventor/SKILL.md"
IDEAS="$SCRIPT_DIR/project-ideas/ideas.json"
LOG="$SCRIPT_DIR/project-ideas/generate.log"
CLAUDE_BIN="${CLAUDE_BIN:-$HOME/.local/bin/claude}"
TELEGRAM_CHAT="$TELEGRAM_CHAT_ID"

send_telegram() {
  if [ -n "$TELEGRAM_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT}&text=$1&parse_mode=HTML" > /dev/null
  fi
}

POMYSLOW_PRZED=$(python3 -c "import json; d=json.load(open('$IDEAS')); print(len(d['ideas']))" 2>/dev/null || echo "?")
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Generowanie pomysłów... (w bazie: $POMYSLOW_PRZED)" >> "$LOG"
send_telegram "⚙️ Generuję nowe pomysły... zaraz wyślę wyniki."

cat <<EOF | "$CLAUDE_BIN" -p --dangerously-skip-permissions --allowedTools Read,Write,Edit,WebSearch,WebFetch >> "$LOG" 2>&1
Przeczytaj skill z $SKILL i bazę pomysłów z $IDEAS.

## Krok 1: Zbierz świeże inspiracje z internetu
Przeszukaj sieć pod kątem:
- Nowych modułów elektronicznych dostępnych na AliExpress/Botland/Kamami (np. nowe czujniki, wyświetlacze, moduły komunikacyjne)
- Trendów w maker community: hackaday.com, instructables.com, reddit.com/r/arduino, reddit.com/r/raspberry_pi
- Ciekawych projektów z ostatnich miesięcy które możesz zainspirować się lub ulepszyć
- Nowych chipów/modułów które weszły na rynek (RP2040, ESP32-S3, nowe czujniki mmWave itp.)

## Krok 2: Przeanalizuj preferencje użytkownika
- Co zatwierdzono lub ma wysokie gwiazdki → kierunek który mu się podoba
- Co odrzucono BEZ notatki → tego unikaj (nie podobał się kierunek)
- Co odrzucono Z notatką → **bardzo ważne**: odrzucił konkretny pomysł, ale notatka wskazuje czego szuka — użyj notatki jako wytycznej i wygeneruj coś nowego w tym kierunku
- Odrzucone ale z gwiazdkami → był potencjał, spróbuj podobnego ale inaczej
- **Notatki przy pomysłach** (pole "notes") są najważniejszą wskazówką — czytaj je dla WSZYSTKICH pomysłów. To bezpośrednie instrukcje od użytkownika.
- **Pole "note" na zatwierdzonych projektach** — to notatki o stanie realizacji. Czytaj je i NIE generuj pomysłów które pokrywają to co już zostało zrobione.

## Krok 3: Wygeneruj 8 nowych pomysłów w proporcji 50/50

### Pula A — 4 pomysły bazujące na preferencjach użytkownika
Opieraj się na tym co już zatwierdzono, co ma wysokie gwiazdki, na notatkach i wizjach użytkownika.
- Podobna kategoria, techniczność, vibe do tego co lubi
- Rozwijaj wątki z notatek (np. "chcę wariant z radarem" → zrób go)

### Pula B — 4 pomysły z własnej inwencji agenta
Tu masz pełną swobodę twórczą. Nie oglądaj się na preferencje — zaproponuj coś czego użytkownik jeszcze nie widział.
- Inspiruj się tym co znalazłeś w internecie, ale idź dalej — kombinuj technologie, odwracaj założenia
- Możesz zaproponować coś z innych dziedzin (robotyka, audio, instalacje interaktywne, narzędzia z AI)
- Kryterium: czy sam byś chciał to zbudować? Jeśli tak — dodaj
- Unikaj tylko: projektów dla małych dzieci i tego co już odrzucono

Projekty dla nastolatków 14-16 lat i dorosłych — maker culture, projekty które można pokazać z dumą.

Zapisz nowe pomysły do bazy $IDEAS (dodaj do tablicy 'ideas', nie nadpisuj istniejących, użyj kolejnego wolnego id).

Działaj zgodnie z instrukcjami w SKILL.md.
EOF

EXIT_CODE=$?
POMYSLOW_PO=$(python3 -c "import json; d=json.load(open('$IDEAS')); print(len(d['ideas']))" 2>/dev/null || echo "?")
NOWE=$((POMYSLOW_PO - POMYSLOW_PRZED))
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Gotowe. Exit: $EXIT_CODE | Pomysłów przed: $POMYSLOW_PRZED, po: $POMYSLOW_PO, nowych: $NOWE" >> "$LOG"

# Nie wysyłaj między 1:00 a 7:00
HOUR=$(date +%H | sed 's/^0//')
if [ "${HOUR:-0}" -ge 1 ] && [ "${HOUR:-0}" -lt 7 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cisza nocna, pomijam Telegram." >> "$LOG"
  exit 0
fi

# Policz nowe pomysły dodane dzisiaj
COUNT=$(python3 -c "
import json
from datetime import date
with open('$IDEAS') as f:
    data = json.load(f)
today = str(date.today())
new = [i for i in data['ideas'] if i.get('added_date') == today and i.get('status') == 'nowy']
print(len(new))
")

if [ -n "$TELEGRAM_TOKEN" ] && [ "$COUNT" -gt 0 ]; then
  DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:8765}"
  send_telegram "💡 Dodałem $COUNT nowych pomysłów — sprawdź na dashboardzie: $DASHBOARD_URL"
fi
