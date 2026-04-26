#!/usr/bin/env python3
"""Jednorazowa autoryzacja YouTube."""
import json
import requests
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qs

CLIENT_SECRETS = "/home/kuba/yt-automation/client_secret.json"
TOKEN_FILE     = Path(__file__).parent / "yt_token.json"
REDIRECT_URI   = "http://localhost:8766"
SCOPE          = "https://www.googleapis.com/auth/youtube.upload"

secrets = json.loads(Path(CLIENT_SECRETS).read_text())["installed"]
CLIENT_ID     = secrets["client_id"]
CLIENT_SECRET = secrets["client_secret"]

# 1. Zbuduj URL autoryzacji (bez PKCE)
auth_url = "https://accounts.google.com/o/oauth2/auth?" + urlencode({
    "client_id":     CLIENT_ID,
    "redirect_uri":  REDIRECT_URI,
    "response_type": "code",
    "scope":         SCOPE,
    "access_type":   "offline",
    "prompt":        "consent",
})

print("\n" + "="*60)
print("Otwórz ten link w przeglądarce:")
print("="*60)
print(auth_url)
print("="*60)
print("\nPo autoryzacji przeglądarka przekieruje na localhost i pokaże błąd.")
print("Skopiuj CAŁY URL z paska adresu i wklej poniżej.\n")

redirect = input("Wklej URL z paska adresu: ").strip()

# 2. Wyciągnij kod
if "code=" in redirect:
    code = parse_qs(urlparse(redirect).query)["code"][0]
else:
    code = redirect  # zakładamy że wkleił sam kod

# 3. Wymień kod na token
resp = requests.post("https://oauth2.googleapis.com/token", data={
    "code":          code,
    "client_id":     CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri":  REDIRECT_URI,
    "grant_type":    "authorization_code",
})
resp.raise_for_status()
token_data = resp.json()

# 4. Zapisz w formacie kompatybilnym z google-auth
creds_json = {
    "token":         token_data["access_token"],
    "refresh_token": token_data.get("refresh_token"),
    "token_uri":     "https://oauth2.googleapis.com/token",
    "client_id":     CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "scopes":        [SCOPE],
}
TOKEN_FILE.write_text(json.dumps(creds_json))
print(f"\n✅ Token zapisany: {TOKEN_FILE}")
print("Możesz teraz uruchomić dubbing.py")
