const SEV_LABEL: Record<string, string> = {
  low: 'Niska', medium: 'Srednia', high: 'Wysoka', critical: 'KRYTYCZNA',
};

interface DefectInfo {
  description: string;
  severity: string;
  location: string;
  deadline: string | null;
  action: string;
}

export function sendDefectEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  projectName: string;
  defects: DefectInfo[];
  message: string;
  reportDate: string;
}): void {
  const { to, recipientName, projectName, defects, message, reportDate } = params;

  const subject = `[ConstructAI] Usterki do naprawy - ${projectName} - ${reportDate}`;

  const body = [
    `Dzien dobry ${recipientName},`,
    '',
    message,
    '',
    `Projekt: ${projectName}`,
    `Data inspekcji: ${reportDate}`,
    '',
    `WYKRYTE USTERKI (${defects.length}):`,
    '─────────────────────────────',
    ...defects.map((d, i) => [
      `${i + 1}. ${d.description}`,
      `   Waga: ${SEV_LABEL[d.severity] ?? d.severity}`,
      d.location ? `   Lokalizacja: ${d.location}` : '',
      d.deadline ? `   Termin naprawy: ${d.deadline}` : '',
      d.action ? `   Do wykonania: ${d.action}` : '',
      '',
    ].filter(Boolean).join('\n')),
    '─────────────────────────────',
    'Prosimy o potwierdzenie przyjecia zgloszenia.',
    '',
    'Wiadomosc wyslana przez ConstructAI',
  ].join('\n');

  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank');
}
