#!/usr/bin/env python3
import http.server
import json
import subprocess
import threading
from pathlib import Path

import os
BASE_DIR     = Path(__file__).parent.parent
IDEAS_FILE   = BASE_DIR / "project-ideas/ideas.json"
SKILL_FILE   = BASE_DIR / "device-inventor/SKILL.md"
STATIC_DIR   = Path(__file__).parent
PROJECTS_DIR = BASE_DIR / "projects"
PORT = 8765
CLAUDE_BIN = os.environ.get("CLAUDE_BIN", str(Path.home() / ".local/bin/claude"))


def get_idea(idea_id):
    data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
    return next((i for i in data["ideas"] if i["id"] == idea_id), None)


def init_project_dir(idea):
    project_dir = PROJECTS_DIR / str(idea["id"])
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "memory").mkdir(exist_ok=True)

    claude_md = f"""# Projekt: {idea['name']}

Jesteś agentem pomagającym Czarkowi opracować i zbudować konkretny projekt elektroniczny.
Mów po polsku. Bądź konkretny i techniczny — Czarek to doświadczony maker.

## Projekt
**Nazwa:** {idea['name']}
**Tagline:** {idea.get('tagline', '')}
**Opis oryginalny:** {idea.get('description', '')}
**Komponenty:** {', '.join(idea.get('modules', []))}
**Szacowany koszt:** {idea.get('estimated_cost_pln', '?')} PLN
**Poziom trudności:** {idea.get('difficulty', '?')}

## Wizja Czarka
{idea.get('notes', '(brak)')}

## Plan wstępny
{idea.get('preliminary_plan', '(nie wygenerowano jeszcze)')}

## Twoje możliwości
Masz dostęp do narzędzi: Read, Write, Edit, Glob, Grep, Bash.
Możesz edytować pliki projektu i bazę pomysłów.

**Lista komponentów:** `/home/cezkra/CLAUDE_CODE/projects/{idea['id']}/memory/components.json`
Gdy ustalisz konkretne komponenty — zapisz je w tym pliku JSON. Aktualizuj gdy coś się zmienia.
Format (tablica obiektów):
```json
[
  {{"name": "ESP32-S3 DevKit", "qty": 2, "price_pln": 45, "shop": "AliExpress", "category": "Elektronika", "notes": "główny kontroler", "purchased": false}},
  {{"name": "Silnik NEMA17 42x40", "qty": 2, "price_pln": 38, "shop": "Botland", "category": "Mechanika", "notes": "moment 4kg·cm", "purchased": false}}
]
```
Pola statusu dostawy:
- `"purchased": true` — zamówione
- `"order_date": "2026-04-04"` — data zamówienia (YYYY-MM-DD)
- `"delivery_days": 14` — przewidywany czas dostawy w dniach
- `"delivered": true` — towar dotarł

Gdy Czarek wspomni że coś zamówił → ustaw `purchased: true`, `order_date` = dziś, zapytaj ile dni zajmie dostawa.
Gdy Czarek wspomni że coś dotarło → ustaw `delivered: true`.
Na początku sesji sprawdź czy są zamówione ale niedostarczone komponenty — jeśli tak, zapytaj czy już dotarły.

**Lista zadań:** `/home/cezkra/CLAUDE_CODE/projects/{idea['id']}/memory/tasks.json`
Format:
```json
{{
  "prototype": [{{"text": "opis zadania", "done": false}}],
  "commercial": [{{"text": "opis zadania", "done": false}}],
  "docs": [{{"text": "opis zadania", "done": false}}]
}}
```
- `prototype` — zadania do działającego prototypu
- `commercial` — zadania do wersji produkcyjnej
- `docs` — schematy, BOM, README, kod opisany

Gdy coś zostanie zrobione → ustaw `"done": true`. Dodawaj nowe zadania gdy je odkrywasz w rozmowie. Aktualizuj ten plik regularnie — paski postępu w dashboardzie wyliczają się automatycznie z done/total.

**Baza pomysłów:** `/home/cezkra/CLAUDE_CODE/project-ideas/ideas.json`
- Żeby zmienić opis, tagline, komponenty itp. tego projektu (id={idea['id']}) — edytuj ten plik.
- Zachowaj strukturę JSON, nie usuwaj innych pomysłów.

**Katalog projektu:** `/home/cezkra/CLAUDE_CODE/projects/{idea['id']}/`
- Zapisuj postęp w `memory/progress.md`
- Możesz tworzyć pliki: schematy, listy zakupów, kod, notatki

## Pamięć projektu
Czytaj `memory/progress.md` na początku każdej sesji żeby wiedzieć gdzie skończyliśmy.
Aktualizuj go po każdej znaczącej zmianie.
"""
    (project_dir / "CLAUDE.md").write_text(claude_md, encoding="utf-8")

    progress = project_dir / "memory" / "progress.md"
    if not progress.exists():
        progress.write_text("# Postęp projektu\n\n(brak zapisów)\n", encoding="utf-8")

    time_file = project_dir / "memory" / "time.json"
    if not time_file.exists():
        time_file.write_text(json.dumps({"total_seconds": 0, "sessions": []}), encoding="utf-8")

    comp_file = project_dir / "memory" / "components.json"
    if not comp_file.exists():
        comp_file.write_text("[]", encoding="utf-8")

    tasks_file = project_dir / "memory" / "tasks.json"
    if not tasks_file.exists():
        tasks_file.write_text(json.dumps({
            "prototype": [],
            "commercial": [],
            "docs": []
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    return project_dir


class Handler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.serve_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
        elif self.path == "/api/ideas":
            self.serve_json(IDEAS_FILE.read_text(encoding="utf-8"))
        elif self.path.startswith("/project/"):
            self.serve_file(STATIC_DIR / "project.html", "text/html; charset=utf-8")
        elif self.path.startswith("/api/ideas/") and self.path.endswith("/components"):
            try:
                idea_id = int(self.path.split("/")[3])
                f = PROJECTS_DIR / str(idea_id) / "memory" / "components.json"
                self.serve_json(f.read_text(encoding="utf-8") if f.exists() else "[]")
            except Exception:
                self.serve_json("[]")
        elif self.path.startswith("/api/ideas/") and self.path.endswith("/tasks"):
            try:
                idea_id = int(self.path.split("/")[3])
                f = PROJECTS_DIR / str(idea_id) / "memory" / "tasks.json"
                self.serve_json(f.read_text(encoding="utf-8") if f.exists() else '{"prototype":[],"commercial":[],"docs":[]}')
            except Exception:
                self.serve_json('{"prototype":[],"commercial":[],"docs":[]}')
        elif self.path.startswith("/api/ideas/") and self.path.endswith("/time"):
            try:
                idea_id = int(self.path.split("/")[3])
                time_file = PROJECTS_DIR / str(idea_id) / "memory" / "time.json"
                text = time_file.read_text(encoding="utf-8") if time_file.exists() else '{"total_seconds":0,"sessions":[]}'
                self.serve_json(text)
            except Exception:
                self.serve_json('{"total_seconds":0,"sessions":[]}')
        elif self.path.startswith("/api/ideas/") and self.path.endswith("/progress"):
            try:
                idea_id = int(self.path.split("/")[3])
                progress_file = PROJECTS_DIR / str(idea_id) / "memory" / "progress.md"
                text = progress_file.read_text(encoding="utf-8") if progress_file.exists() else "(brak zapisów)"
                data = text.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", len(data))
                self.end_headers()
                self.wfile.write(data)
            except Exception:
                self.send_error(404)
        else:
            self.send_error(404)

    def do_POST(self):
        parts = self.path.strip("/").split("/")
        if len(parts) >= 3 and parts[0] == "api" and parts[1] == "ideas":
            try:
                idea_id = int(parts[2])
            except ValueError:
                self.send_error(400)
                return
            if len(parts) == 4 and parts[3] == "rate":
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length))
                self.handle_rate(idea_id, body)
            elif len(parts) == 4 and parts[3] == "elaborate":
                self.handle_elaborate(idea_id)
            elif len(parts) == 4 and parts[3] == "describe":
                self.handle_describe(idea_id)
            elif len(parts) == 4 and parts[3] == "chat":
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length))
                self.handle_chat(idea_id, body)
            elif len(parts) == 4 and parts[3] == "init-project":
                self.handle_init_project(idea_id)
            elif len(parts) == 5 and parts[3] == "components" and parts[4] == "toggle":
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length))
                self.handle_component_toggle(idea_id, body)
            elif len(parts) == 5 and parts[3] == "time" and parts[4] == "start":
                self.handle_time_start(idea_id)
            elif len(parts) == 5 and parts[3] == "time" and parts[4] == "end":
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length)) if length else {}
                self.handle_time_end(idea_id, body)
            else:
                self.send_error(404)
        else:
            self.send_error(404)

    def handle_rate(self, idea_id, body):
        data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
        for idea in data["ideas"]:
            if idea["id"] == idea_id:
                for key in ("status", "rating", "negative_rating", "notes", "note", "preliminary_plan"):
                    if key in body:
                        idea[key] = body[key]
                break
        IDEAS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        self.serve_json('{"ok":true}')

    def handle_elaborate(self, idea_id):
        data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
        idea = next((i for i in data["ideas"] if i["id"] == idea_id), None)
        if not idea:
            self.send_error(404)
            return

        # Zwróć od razu 202, generowanie idzie w tle
        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "generating"}).encode())

        threading.Thread(target=self._run_elaborate, args=(idea_id, idea), daemon=True).start()

    def _run_elaborate(self, idea_id, idea):
        user_vision = idea.get('notes', '').strip()
        vision_section = f"""
WIZJA UŻYTKOWNIKA (priorytet — uwzględnij to przede wszystkim):
{user_vision}

""" if user_vision else ""

        prompt = f"""Opracuj wstępny plan realizacji projektu elektronicznego.

{vision_section}Projekt: {idea['name']}
Opis oryginalny: {idea['description']}
Komponenty: {', '.join(idea.get('modules', []))}
Szczegóły: {idea.get('detailed_description', '')}

{"Uwaga: użytkownik chce rozwinąć projekt w swoim kierunku — trzymaj się jego wizji jako głównego punktu odniesienia, a oryginalny opis traktuj jako punkt wyjścia." if user_vision else ""}

Przygotuj wstępny plan w języku polskim zawierający:
1. Cel projektu i co dokładnie ma robić gotowe urządzenie
2. Lista wszystkich potrzebnych komponentów z konkretnymi modelami i cenami w PLN (gdzie kupić: Botland, Kamami, AliExpress)
3. Fazy budowy — od prototypu do gotowego urządzenia (co robić w jakiej kolejności)
4. Schemat połączeń (opisz słownie które piny do czego)
5. Oprogramowanie — jakie biblioteki, frameworki, jak zacząć
6. Szacowany czas realizacji każdej fazy
7. Główne ryzyka i jak je mitygować
8. Co można zrobić jako pierwsze żeby zobaczyć efekt w ciągu jednego weekendu

Odpowiedź sformatuj w Markdown."""

        try:
            result = subprocess.run(
                [CLAUDE_BIN, "-p", prompt],
                capture_output=True, text=True, timeout=180
            )
            plan = result.stdout.strip() if result.returncode == 0 else f"Błąd generowania: {result.stderr}"
        except subprocess.TimeoutExpired:
            plan = "Przekroczono limit czasu generowania (180s)."
        except Exception as e:
            plan = f"Błąd: {e}"

        # Zapisz do ideas.json
        data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
        for i in data["ideas"]:
            if i["id"] == idea_id:
                i["preliminary_plan"] = plan
                break
        IDEAS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def handle_describe(self, idea_id):
        data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
        idea = next((i for i in data["ideas"] if i["id"] == idea_id), None)
        if not idea:
            self.send_error(404)
            return

        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "generating"}).encode())

        threading.Thread(target=self._run_describe, args=(idea_id, idea), daemon=True).start()

    def _run_describe(self, idea_id, idea):
        prompt = f"""Opisz szczegółowo projekt elektroniczny w przystępny sposób.

Projekt: {idea['name']}
Tagline: {idea['tagline']}
Opis: {idea['description']}
Komponenty: {', '.join(idea.get('modules', []))}
Poziom trudności: {idea.get('difficulty', '')}
Szacowany koszt: {idea.get('estimated_cost_pln', '')} PLN

Napisz rozszerzony opis w języku polskim (ok. 150-200 słów) zawierający:
- Co konkretnie robi gotowe urządzenie i jak wygląda w działaniu
- Dlaczego jest interesujące technicznie (co się tu naprawdę dzieje "pod maską")
- Jakie umiejętności można przy tym ćwiczyć/zdobyć
- Co można by rozbudować lub zmodyfikować żeby było jeszcze ciekawiej

Pisz dla kogoś technicznego (nastolatek 14-16 lat lub dorosły maker). Bez owijania w bawełnę, bez "To świetny projekt!". Konkretnie i z pasją."""

        try:
            result = subprocess.run(
                [CLAUDE_BIN, "-p", prompt],
                capture_output=True, text=True, timeout=120
            )
            desc = result.stdout.strip() if result.returncode == 0 else f"Błąd: {result.stderr}"
        except subprocess.TimeoutExpired:
            desc = "Przekroczono limit czasu."
        except Exception as e:
            desc = f"Błąd: {e}"

        data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
        for i in data["ideas"]:
            if i["id"] == idea_id:
                i["detailed_description"] = desc
                break
        IDEAS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def handle_component_toggle(self, idea_id, body):
        f = PROJECTS_DIR / str(idea_id) / "memory" / "components.json"
        if not f.exists():
            self.serve_json('{"ok":false}')
            return
        items = json.loads(f.read_text(encoding="utf-8"))
        idx = body.get("index")
        fields = body.get("fields", {})
        if isinstance(idx, int) and 0 <= idx < len(items):
            if fields:
                items[idx].update(fields)
            else:
                # legacy toggle purchased
                items[idx]["purchased"] = not items[idx].get("purchased", False)
            f.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        self.serve_json('{"ok":true}')

    def handle_time_start(self, idea_id):
        import time as _time
        project_dir = PROJECTS_DIR / str(idea_id)
        project_dir.mkdir(parents=True, exist_ok=True)
        (project_dir / "memory").mkdir(exist_ok=True)
        time_file = project_dir / "memory" / "time.json"
        data = json.loads(time_file.read_text()) if time_file.exists() else {"total_seconds": 0, "sessions": []}
        data["session_start"] = _time.time()
        time_file.write_text(json.dumps(data), encoding="utf-8")
        self.serve_json('{"ok":true}')

    def handle_time_end(self, idea_id, body):
        import time as _time
        time_file = PROJECTS_DIR / str(idea_id) / "memory" / "time.json"
        if not time_file.exists():
            self.serve_json('{"ok":true}')
            return
        data = json.loads(time_file.read_text())
        start = data.pop("session_start", None)
        if start:
            duration = int(_time.time() - start)
            data["total_seconds"] = data.get("total_seconds", 0) + duration
            data.setdefault("sessions", []).append({
                "date": __import__("datetime").date.today().isoformat(),
                "seconds": duration
            })
        time_file.write_text(json.dumps(data), encoding="utf-8")
        self.serve_json('{"ok":true}')

    def handle_init_project(self, idea_id):
        idea = get_idea(idea_id)
        if not idea:
            self.send_error(404)
            return
        init_project_dir(idea)
        self.serve_json('{"ok":true}')

    def handle_chat(self, idea_id, body):
        idea = get_idea(idea_id)
        if not idea:
            self.send_error(404)
            return

        message = body.get("message", "").strip()
        if not message:
            self.send_error(400)
            return

        project_dir = PROJECTS_DIR / str(idea_id)
        if not project_dir.exists():
            init_project_dir(idea)

        session_file = project_dir / ".session_id"

        cmd = [
            CLAUDE_BIN, "-p", message,
            "--output-format", "json",
            "--dangerously-skip-permissions",
            "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash",
            "--add-dir", str(IDEAS_FILE.parent),
        ]
        if session_file.exists():
            session_id = session_file.read_text().strip()
            cmd += ["--resume", session_id]

        try:
            result = subprocess.run(
                cmd, cwd=str(project_dir),
                capture_output=True, text=True, timeout=300
            )
            if result.returncode != 0:
                self.serve_json(json.dumps({"error": result.stderr or "Błąd procesu"}))
                return

            data = json.loads(result.stdout)
            session_id = data.get("session_id", "")
            if session_id:
                session_file.write_text(session_id, encoding="utf-8")

            response_text = data.get("result", "")
            self.serve_json(json.dumps({
                "response": response_text,
                "session_id": session_id
            }, ensure_ascii=False))

        except subprocess.TimeoutExpired:
            self.serve_json(json.dumps({"error": "Timeout (300s)"}))
        except Exception as e:
            self.serve_json(json.dumps({"error": str(e)}))

    def serve_file(self, path, content_type):
        content = Path(path).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", len(content))
        self.end_headers()
        self.wfile.write(content)

    def serve_json(self, text):
        data = text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Dashboard: http://localhost:{PORT}")
    server.serve_forever()
