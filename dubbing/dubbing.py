#!/usr/bin/env python3
"""
Automatyczny dubbing filmików YouTube na język polski + publikacja na YT.
"""

import os
import subprocess
import tempfile
import json
from pathlib import Path

# ============================================================
# KONFIGURACJA — uzupełnij przed uruchomieniem
# ============================================================

ELEVENLABS_API_KEY  = "sk_2714880a517b7b27a694e595087cf172c5ce5da89e084495"
ELEVENLABS_VOICE_ID = "LaU8vObBJb1GS2SoBOWT"

DEEPL_API_KEY = "90134da7-52be-465c-a15d-691b4dfa2571:fx"

YOUTUBE_CLIENT_SECRETS = "/home/kuba/yt-automation/client_secret.json"
YOUTUBE_TOKEN_FILE     = Path(__file__).parent / "yt_token.json"

YOUTUBE_URL = "https://youtube.com/shorts/rXM6_AiisB4?si=3hKOy2_NnCBMCaB_"

# Głośność muzyki w tle (0.0 = cisza, 1.0 = pełna)
VOLUME_MUZYKA = 0.8

# Model Whisper: tiny / base / small / medium / large
WHISPER_MODEL = "base"

# ============================================================

OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def krok(nr: int, opis: str) -> None:
    print(f"\n{'='*60}")
    print(f"  KROK {nr}: {opis}")
    print(f"{'='*60}")


def run(cmd: list, **kwargs) -> subprocess.CompletedProcess:
    print(f"  $ {' '.join(str(c) for c in cmd)}")
    return subprocess.run(cmd, check=True, **kwargs)


def get_duration(sciezka: Path) -> float:
    wynik = subprocess.check_output([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(sciezka),
    ], text=True)
    return float(wynik.strip())


# ------------------------------------------------------------------
# 1. Pobierz filmik z YouTube
# ------------------------------------------------------------------
def pobierz_filmik(url: str, katalog: Path) -> tuple[Path, str, dict]:
    krok(1, "Pobieranie filmiku z YouTube")

    info_raw = subprocess.check_output(
        ["yt-dlp", "--dump-json", "--no-playlist", url],
        text=True,
    )
    info = json.loads(info_raw)
    video_id = info["id"]
    tytul    = info.get("title", video_id)
    print(f"  Tytuł: {tytul}")
    print(f"  ID:    {video_id}")

    sciezka_wideo = katalog / f"{video_id}.mp4"
    if not sciezka_wideo.exists():
        run([
            "yt-dlp",
            "--no-playlist",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", str(sciezka_wideo),
            url,
        ])
    else:
        print(f"  Plik już istnieje, pomijam pobieranie.")

    return sciezka_wideo, video_id, info


# ------------------------------------------------------------------
# 2. Wyciągnij audio z filmiku
# ------------------------------------------------------------------
def wyciagnij_audio(sciezka_wideo: Path, katalog: Path) -> Path:
    krok(2, "Wyciąganie audio z filmiku")

    sciezka_audio = katalog / (sciezka_wideo.stem + "_audio.wav")
    run([
        "ffmpeg", "-y",
        "-i", str(sciezka_wideo),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(sciezka_audio),
    ])
    print(f"  Audio zapisane: {sciezka_audio}")
    return sciezka_audio


# ------------------------------------------------------------------
# 3. Transkrybuj audio do tekstu (Whisper)
# ------------------------------------------------------------------
def transkrybuj(sciezka_audio: Path) -> list[dict]:
    krok(3, "Transkrypcja audio → tekst (Whisper)")

    import whisper
    print(f"  Ładuję model Whisper '{WHISPER_MODEL}'...")
    model = whisper.load_model(WHISPER_MODEL)

    print("  Transkrybuję...")
    wynik = model.transcribe(str(sciezka_audio), verbose=False)

    segmenty = wynik.get("segments", [])
    print(f"  Znaleziono {len(segmenty)} segmentów.")
    for s in segmenty[:3]:
        print(f"    [{s['start']:.1f}s – {s['end']:.1f}s] {s['text'].strip()}")
    if len(segmenty) > 3:
        print(f"    ... i {len(segmenty) - 3} więcej")

    return segmenty


# ------------------------------------------------------------------
# 4. Przetłumacz tekst na polski (DeepL)
# ------------------------------------------------------------------
def przetlumacz(segmenty: list[dict]) -> tuple[list[dict], str]:
    krok(4, "Tłumaczenie na polski (DeepL)")

    import deepl
    klient = deepl.Translator(DEEPL_API_KEY)

    teksty = [s["text"].strip() for s in segmenty]
    print(f"  Tłumaczę {len(teksty)} segmentów...")

    wyniki = klient.translate_text(teksty, target_lang="PL")

    segmenty_pl = []
    for s, wynik in zip(segmenty, wyniki):
        tlumaczenie = wynik.text
        segmenty_pl.append({"start": s["start"], "end": s["end"], "text": tlumaczenie})
        print(f"    [{s['start']:.1f}s – {s['end']:.1f}s] {tlumaczenie}")

    pelny_tekst_pl = " ".join(s["text"] for s in segmenty_pl)
    return segmenty_pl, pelny_tekst_pl


# ------------------------------------------------------------------
# 5. Wygeneruj polski głos (ElevenLabs)
# ------------------------------------------------------------------
def generuj_glos(segmenty_pl: list[dict], katalog: Path) -> Path:
    krok(5, "Generowanie polskiego głosu (ElevenLabs)")

    from elevenlabs.client import ElevenLabs
    from elevenlabs import VoiceSettings

    klient = ElevenLabs(api_key=ELEVENLABS_API_KEY)

    pelny_tekst = " ".join(s["text"] for s in segmenty_pl if s["text"].strip())
    print(f"  Tekst do syntezy ({len(pelny_tekst)} znaków): {pelny_tekst[:80]}...")

    sciezka_tts = katalog / "tts_polski.mp3"
    print("  Generuję mowę...")

    audio = klient.text_to_speech.convert(
        voice_id=ELEVENLABS_VOICE_ID,
        output_format="mp3_44100_128",
        text=pelny_tekst,
        model_id="eleven_multilingual_v2",
        voice_settings=VoiceSettings(
            stability=0.5,
            similarity_boost=0.8,
            style=0.0,
            use_speaker_boost=True,
        ),
    )

    with open(sciezka_tts, "wb") as f:
        for chunk in audio:
            if chunk:
                f.write(chunk)

    print(f"  Głos zapisany: {sciezka_tts}")
    return sciezka_tts


# ------------------------------------------------------------------
# 6. Dopasuj tempo głosu do długości wideo (ffmpeg atempo)
# ------------------------------------------------------------------
def dopasuj_tempo(sciezka_tts: Path, sciezka_wideo: Path, katalog: Path) -> Path:
    krok(6, "Dopasowanie tempa głosu do długości wideo")

    dlugosc_wideo = get_duration(sciezka_wideo)
    dlugosc_tts   = get_duration(sciezka_tts)
    print(f"  Długość wideo: {dlugosc_wideo:.2f}s")
    print(f"  Długość TTS:   {dlugosc_tts:.2f}s")

    wspolczynnik = dlugosc_tts / dlugosc_wideo
    print(f"  Współczynnik tempa: {wspolczynnik:.3f}x")

    sciezka_dopasowana = katalog / "tts_dopasowany.mp3"

    def filtry_atempo(wsp: float) -> str:
        filtry = []
        while wsp > 2.0:
            filtry.append("atempo=2.0")
            wsp /= 2.0
        while wsp < 0.5:
            filtry.append("atempo=0.5")
            wsp /= 0.5
        filtry.append(f"atempo={wsp:.4f}")
        return ",".join(filtry)

    run([
        "ffmpeg", "-y",
        "-i", str(sciezka_tts),
        "-filter:a", filtry_atempo(wspolczynnik),
        str(sciezka_dopasowana),
    ])

    print(f"  Dopasowany głos: {sciezka_dopasowana}")
    return sciezka_dopasowana, dlugosc_wideo


# ------------------------------------------------------------------
# 6b. Wyodrębnij samą muzykę (bez głosu) używając demucs
# ------------------------------------------------------------------
def wyodrebnij_muzyke(sciezka_wideo: Path, katalog: Path) -> Path:
    krok(7, "Separacja muzyki od głosu (demucs AI)")

    print("  Uruchamiam demucs — może potrwać ~30s...")
    subprocess.run([
        "python3", "-m", "demucs",
        "--two-stems", "vocals",
        "--out", str(katalog / "demucs"),
        str(sciezka_wideo),
    ], check=True)

    # demucs zapisuje do: katalog/demucs/htdemucs/<nazwa>/no_vocals.wav
    nazwa = sciezka_wideo.stem
    sciezka_muzyki = katalog / "demucs" / "htdemucs" / nazwa / "no_vocals.wav"

    if not sciezka_muzyki.exists():
        raise FileNotFoundError(f"Nie znaleziono no_vocals.wav: {sciezka_muzyki}")

    print(f"  Muzyka wyodrębniona: {sciezka_muzyki}")
    return sciezka_muzyki


# ------------------------------------------------------------------
# 7. Zmontuj wideo z polskim głosem + muzyką
# ------------------------------------------------------------------
def montuj_wideo(
    sciezka_wideo: Path,
    sciezka_dubbing: Path,
    sciezka_muzyki: Path,
    dlugosc_wideo: float,
    video_id: str,
) -> Path:
    krok(8, "Montaż — polski głos + muzyka + wideo")

    sciezka_wynikowa = OUTPUT_DIR / f"{video_id}_dubbing_pl.mp4"

    run([
        "ffmpeg", "-y",
        "-i", str(sciezka_wideo),
        "-i", str(sciezka_dubbing),
        "-i", str(sciezka_muzyki),
        "-filter_complex",
        (
            f"[2:a]volume={VOLUME_MUZYKA},apad[muz];"
            "[1:a]volume=1.0,apad[dub];"
            "[muz][dub]amix=inputs=2:duration=first:dropout_transition=0[audio_mix]"
        ),
        "-map", "0:v",
        "-map", "[audio_mix]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", str(dlugosc_wideo),
        str(sciezka_wynikowa),
    ])

    print(f"\n  Gotowe! Plik wynikowy: {sciezka_wynikowa}")
    return sciezka_wynikowa


# ------------------------------------------------------------------
# 8. Opublikuj na YouTube
# ------------------------------------------------------------------
def opublikuj_na_youtube(sciezka_wideo: Path, tytul_pl: str, opis_pl: str) -> str:
    krok(9, "Publikacja na YouTube")

    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

    creds = None
    if YOUTUBE_TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(YOUTUBE_TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                YOUTUBE_CLIENT_SECRETS, SCOPES
            )
            creds = flow.run_console()
        YOUTUBE_TOKEN_FILE.write_text(creds.to_json())

    youtube = build("youtube", "v3", credentials=creds)

    print(f"  Tytuł: {tytul_pl}")
    print(f"  Przesyłam plik: {sciezka_wideo}")

    request = youtube.videos().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title": tytul_pl,
                "description": opis_pl,
                "tags": ["dubbing", "polski", "shorts"],
                "categoryId": "22",
                "defaultLanguage": "pl",
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False,
            },
        },
        media_body=MediaFileUpload(
            str(sciezka_wideo),
            mimetype="video/mp4",
            resumable=True,
        ),
    )

    response = None
    print("  Przesyłam... ", end="", flush=True)
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"{int(status.progress() * 100)}%... ", end="", flush=True)
    print("100%")

    video_url = f"https://www.youtube.com/watch?v={response['id']}"
    print(f"\n  Opublikowano: {video_url}")
    return video_url


# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------
def main() -> None:
    print("\n🎬 Automatyczny dubbing YouTube → Polski + publikacja")
    print(f"   URL: {YOUTUBE_URL}\n")

    with tempfile.TemporaryDirectory(prefix="dubbing_") as tmp:
        tmp_dir = Path(tmp)

        sciezka_wideo, video_id, info    = pobierz_filmik(YOUTUBE_URL, tmp_dir)
        sciezka_audio                    = wyciagnij_audio(sciezka_wideo, tmp_dir)
        segmenty                         = transkrybuj(sciezka_audio)
        segmenty_pl, pelny_tekst_pl      = przetlumacz(segmenty)
        sciezka_tts                      = generuj_glos(segmenty_pl, tmp_dir)
        sciezka_dopasowana, dl_wideo     = dopasuj_tempo(sciezka_tts, sciezka_wideo, tmp_dir)
        sciezka_muzyki                   = wyodrebnij_muzyke(sciezka_wideo, tmp_dir)
        wynik                            = montuj_wideo(sciezka_wideo, sciezka_dopasowana, sciezka_muzyki, dl_wideo, video_id)

        tytul_oryginalny = info.get("title", video_id)
        tytul_pl = f"[PL] {tytul_oryginalny}"
        opis_pl  = f"Polski dubbing | Oryginał: {YOUTUBE_URL}\n\n{pelny_tekst_pl}"

        url_yt = opublikuj_na_youtube(wynik, tytul_pl, opis_pl)

    print(f"\n✅ Gotowe! Film opublikowany: {url_yt}\n")


if __name__ == "__main__":
    main()
