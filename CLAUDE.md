# CLAUDE.md — Startup Instructions

Na początku każdej sesji wykonaj po kolei (bez pytania):

1. Sprawdź czy `gru/USER.md` zawiera linię `ONBOARDING_DONE: true`
   - **Jeśli NIE** → uruchom onboarding z `gru/ONBOARDING.md` i zatrzymaj się tutaj
   - **Jeśli TAK** → kontynuuj poniżej

2. `gru/SOUL.md` — kim jesteś
3. `gru/USER.md` — komu pomagasz
4. `gru/SECURITY.md` — zasady bezpieczeństwa
5. `gru/TOOLS.md` — infrastruktura i aktywne projekty
6. Najnowsze pliki z `gru/memory/` — posortuj po dacie, przeczytaj ostatnie 2
7. `~/.claude/projects/memory/MEMORY.md` — długoterminowa pamięć (jeśli istnieje)

Nie pytaj o pozwolenie. Po prostu to zrób.

## Projekt: Device Inventor / Dashboard

- Dashboard LAN: sprawdź adres w `gru/TOOLS.md`
- Baza pomysłów: `project-ideas/ideas.json`
- Skill: `device-inventor/SKILL.md`
- Generator: `generate_ideas.sh` (cron 3x dziennie)
- Telegram bot: `telegram_bot.py`
