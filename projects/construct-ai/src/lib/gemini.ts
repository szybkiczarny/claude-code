const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Jesteś asystentem do tworzenia raportów budowlanych.
Na podstawie transkrypcji głosowej inżyniera wyciągnij ustrukturyzowane dane w formacie JSON.

Zwróć TYLKO JSON bez żadnych komentarzy:
{
  "summary": "krótkie podsumowanie (2-3 zdania)",
  "defects": [
    {
      "description": "opis usterki",
      "severity": "low|medium|high|critical",
      "location": "lokalizacja na budowie"
    }
  ],
  "weather": "warunki pogodowe jeśli wspomniano",
  "workers_count": liczba pracowników jeśli wspomniano lub null,
  "next_steps": ["lista działań do podjęcia"]
}`;

export async function extractReportData(transcript: string): Promise<{
  summary: string;
  defects: Array<{ description: string; severity: string; location: string }>;
  weather: string | null;
  workers_count: number | null;
  next_steps: string[];
}> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nTranskrypcja:\n${transcript}` }] }
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini nie zwrócił JSON');

  return JSON.parse(jsonMatch[0]);
}
