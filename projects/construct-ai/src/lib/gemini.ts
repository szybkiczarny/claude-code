const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY!;

const SYSTEM_PROMPT = `Jesteś asystentem kierownika budowy w Polsce. Analizujesz transkrypcje głosowe z placu budowy i wyciągasz ustrukturyzowane dane.

WAŻNE — jak rozpoznawać firmy i ekipy w polskiej mowie:
- "firma Nowacki", "ekipa Nowackiego", "Nowaccy", "podwykonawca X" → company: "Nowacki", role: "Podwykonawca"
- "murarze z Kowalski Bud", "hydraulicy od Wodniak" → company: nazwa firmy, role: zawód
- "ma to ogarnąć", "ma to naprawić", "odpowiada za to", "zadzwoń do X" → X to subcontractor w usterce ORAZ wpis w crew
- "pracownicy", "robotnicy", "chłopaki" bez nazwy → role: "Robotnicy ogólni", company: null
- Jeśli firma jest wymieniona w kontekście usterki → wpisz ją w defect.subcontractor ORAZ dodaj do crew

Zwróć TYLKO poprawny JSON (bez komentarzy, bez markdown):
{
  "summary": "zwięzłe podsumowanie inspekcji (2-3 zdania, po polsku)",
  "location": "lokalizacja z nagrania (np. 'Sekcja B, 2. piętro') lub null",
  "weather": "warunki pogodowe jeśli wspomniano lub null",
  "workers_count": liczba_pracowników_lub_null,
  "crew": [
    {
      "role": "zawód/rola LUB 'Podwykonawca' jeśli nieznany (np. 'Murarz', 'Elektryk', 'Podwykonawca')",
      "company": "nazwa firmy lub nazwisko — ZAWSZE wyciągaj jeśli padło jakiekolwiek nazwisko/firma",
      "count": liczba_osób_lub_1_jeśli_nieznana
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
      "location": "dokładna lokalizacja usterki lub null",
      "subcontractor": "firma/nazwisko odpowiedzialne — wyciągaj nawet z 'firma X ma to ogarnąć'",
      "deadline": "termin naprawy w formacie YYYY-MM-DD lub null",
      "action": "co dokładnie trzeba zrobić"
    }
  ],
  "progress": {
    "percent": liczba_0_do_100_lub_null,
    "stage": "nazwa etapu prac (np. 'Stan surowy', 'Instalacje', 'Wykończenie') lub null",
    "note": "krótki opis postępu lub null"
  },
  "next_steps": [
    {
      "description": "co trzeba zrobić (konkretna czynność)",
      "location": "gdzie to zrobić lub null",
      "deadline": "termin w formacie YYYY-MM-DD lub null"
    }
  ],
  "notifications": [
    {
      "recipient": "nazwa firmy lub podwykonawcy",
      "message": "gotowa wiadomość do wysłania po polsku"
    }
  ]
}`;

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
  progress: { percent: number; stage: string | null; note: string | null } | null;
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
