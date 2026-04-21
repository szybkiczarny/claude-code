const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

const SYSTEM_PROMPT = `Jesteś asystentem kierownika budowy. Analizujesz transkrypcje głosowe z placu budowy i wyciągasz ustrukturyzowane dane.

Zwróć TYLKO poprawny JSON (bez komentarzy, bez markdown):
{
  "summary": "zwięzłe podsumowanie inspekcji (2-3 zdania, po polsku)",
  "location": "lokalizacja z nagrania (np. 'Sekcja B, 2. piętro') lub null",
  "weather": "warunki pogodowe jeśli wspomniano lub null",
  "workers_count": liczba_pracowników_lub_null,
  "crew": [
    {
      "role": "zawód / rola (np. 'Murarz', 'Elektryk', 'Operator dźwigu')",
      "company": "nazwa firmy lub podwykonawcy lub null",
      "count": liczba_osób
    }
  ],
  "materials": [
    {
      "name": "nazwa materiału (np. 'Beton C25/30', 'Cegła klinkierowa')",
      "qty": "ilość z jednostką (np. '12 m3', '500 szt') lub null",
      "delivery": "data lub opis dostawy lub null"
    }
  ],
  "defects": [
    {
      "description": "opis usterki",
      "severity": "low|medium|high|critical",
      "location": "dokładna lokalizacja usterki",
      "subcontractor": "nazwa podwykonawcy odpowiedzialnego lub null",
      "deadline": "termin naprawy w formacie YYYY-MM-DD lub null",
      "action": "co dokładnie trzeba zrobić"
    }
  ],
  "next_steps": ["lista działań do podjęcia"],
  "notifications": [
    {
      "recipient": "nazwa firmy lub podwykonawcy",
      "message": "gotowa wiadomość do wysłania po polsku"
    }
  ]
}

Zasady:
- Wyciągaj ekipę: każda wzmianka o grupie pracowników (np. "5 murarzy z firmy ABC") = wpis w crew
- Wyciągaj materiały: każda wzmianka o dostawie lub użyciu materiału = wpis w materials
- severity "critical" = zagrożenie bezpieczeństwa lub blokuje postęp prac
- severity "high" = ważna usterka wymagająca szybkiej reakcji
- severity "medium" = standardowa usterka
- severity "low" = drobna uwaga
- Dla każdej usterki z przypisanym podwykonawcą i terminem utwórz wpis w notifications
- Jeśli wspomniano "jutro" jako deadline, ustaw datę na jutrzejszy dzień`;

export async function extractReportData(transcript: string): Promise<{
  summary: string;
  location: string | null;
  defects: Array<{
    description: string;
    severity: string;
    location: string;
    subcontractor: string | null;
    deadline: string | null;
    action: string;
  }>;
  crew: Array<{ role: string; company: string | null; count: number }>;
  materials: Array<{ name: string; qty: string | null; delivery: string | null }>;
  weather: string | null;
  workers_count: number | null;
  next_steps: string[];
  notifications: Array<{ recipient: string; message: string }>;
}> {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Dzisiaj jest ${today}. Jutro to ${tomorrow}.\n\nTranskrypcja:\n${transcript}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) throw new Error(`Groq LLM error: ${response.status}`);

  const data = await response.json();
  const text = data.choices[0].message.content;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Brak JSON w odpowiedzi');
  return JSON.parse(jsonMatch[0]);
}
