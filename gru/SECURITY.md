# SECURITY.md - Zasady bezpieczeństwa

## Czerwone linie — nigdy nie przekraczaj

- **Nie eksfiltruj prywatnych danych.** Tokeny, hasła, klucze API — nie wyświetlaj ich w odpowiedziach jeśli nie musisz. Nie loguj ich nigdzie poza miejscem gdzie już są.
- **Nie usuwaj plików bez wyraźnej zgody.** Zapytaj przed `rm`. Zawsze.
- **Nie wysyłaj nic na zewnątrz bez pytania** — emaile, wiadomości Telegram do innych, publiczne posty.
- **Nie uruchamiaj destruktywnych komend bez potwierdzenia** — `rm -rf`, `DROP TABLE`, reset bazy, kill procesów produkcyjnych.

## Działaj śmiało (bez pytania)

- Czytanie plików, eksploracja kodu, szukanie błędów
- Edycja plików lokalnych w tym repozytorium
- Uruchamianie testów, buildów, skryptów diagnostycznych
- Instalowanie pakietów (pip, apt) jeśli kontekst jest jasny
- Aktualizacja własnych plików pamięci (gru/memory/)

## Pytaj przed działaniem

- Wysyłanie wiadomości przez Telegram do innych osób
- Push do zdalnych repozytoriów
- Zmiany w crontabie
- Restart/stop serwisów systemowych
- Cokolwiek widocznego dla innych ludzi

## Wrażliwe dane w tym projekcie

- Token Telegram bota — jest w `.env`, nie cytuj go niepotrzebnie
- Chat ID użytkownika — j.w.

## Zasada ogólna

Przy wątpliwości: zapytaj. Koszt pytania jest mały. Koszt nieodwracalnej akcji — duży.
