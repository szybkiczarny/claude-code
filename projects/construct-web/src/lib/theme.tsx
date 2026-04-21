import React, { createContext, useCallback, useContext, useState } from 'react';

export const TWEAK_DEFAULTS = {
  primary:        '#F5B800',
  primaryInk:     '#0B1628',
  bg:             '#0B1628',
  surface:        '#142339',
  surfaceElevated:'#1B2E4A',
  border:         '#24395A',
  textHi:         '#F4F7FB',
  textMid:        '#9AB0CC',
  textLo:         '#6A819E',
  danger:         '#FF5A5A',
  warning:        '#FFB02E',
  success:        '#22C08A',
  radius:         16,
  radiusSm:       10,
  shadow:         '0 8px 24px rgba(0,0,0,0.35)',
  fontFamily:     'Inter',
  fontBase:       16,
  gloveMode:      false,
  density:        'comfortable' as 'comfortable' | 'compact',
  language:       'pl' as 'pl' | 'en',
};

export type Tweaks = typeof TWEAK_DEFAULTS;

export const I18N: Record<string, Record<string, string>> = {
  pl: {
    tabProjects: 'Projekty', tabRecord: 'Nagraj', tabReports: 'Raporty',
    search: 'Szukaj projektu…', activeProjects: 'Aktywne projekty',
    openDefects: 'otwartych usterek', lastEntry: 'Ostatni wpis', progress: 'Postęp',
    recording: 'Nagrywam', tapToStart: 'Dotknij, aby nagrać', tapToStop: 'Dotknij, aby zakończyć',
    quickTags: 'Szybkie tagi', tagDefect: 'Usterka', tagProgress: 'Postęp', tagSafety: 'BHP',
    tagMaterial: 'Materiał', tagCrew: 'Ekipa', tagWeather: 'Pogoda',
    todayReports: 'Dziś', earlier: 'Wcześniej', defects: 'Usterki',
    entries: 'Wpisy dziennika', weather: 'Pogoda', crew: 'Ekipa', machines: 'Maszyny',
    materials: 'Materiały', exportPdf: 'Eksport PDF', siteDiary: 'Dziennik budowy',
    newEntry: 'Nowy wpis', open: 'Otwarta', inProgress: 'W toku', closed: 'Zamknięta',
    review: 'Weryfikacja', delegate: 'Deleguj', markFixed: 'Oznacz jako naprawione',
    fixedBy: 'Naprawione przez', offlineSaved: 'Zapisano offline · wyśle się automatycznie',
    aiExtracted: 'AI rozpoznało', signed: 'Podpisano', version: 'wersja',
    weatherAlert: 'Uwaga: Betonowanie w niskiej temperaturze, sprawdź domieszki',
    proofOfRepair: 'Dowód naprawy', sendVia: 'Wyślij przez',
    whatsapp: 'WhatsApp', sms: 'SMS', email: 'E-mail', copyLink: 'Kopiuj link',
    priority: 'Priorytet', high: 'Wysoki', medium: 'Średni', low: 'Niski',
    assignedTo: 'Odp.', due: 'Termin', location: 'Lokalizacja', trade: 'Branża',
    electrical: 'Elektryka', plumbing: 'Hydraulika', hvac: 'HVAC',
    concrete: 'Beton', carpentry: 'Stolarka', addPhoto: 'Dodaj zdjęcie',
    tweaks: 'Tweaks', gloveMode: 'Tryb rękawiczek', density: 'Gęstość',
    compact: 'Kompakt', comfortable: 'Komfort', language: 'Język',
    primaryColor: 'Kolor akcentu', bgColor: 'Tło', surfaceColor: 'Karty',
    fontSize: 'Rozmiar tekstu', font: 'Font', back: 'Wstecz',
    play: 'Odtwórz', transcription: 'Transkrypcja', summary: 'Podsumowanie',
    dailyLog: 'Dziennik dzienny', noSignal: 'Zapis offline', saved: 'Zapisano',
    duration: 'Czas', new: 'Nowa', reminder: 'Przypomnienie: dziennik nie został wypełniony',
  },
  en: {
    tabProjects: 'Projects', tabRecord: 'Record', tabReports: 'Reports',
    search: 'Search projects…', activeProjects: 'Active projects',
    openDefects: 'open defects', lastEntry: 'Last entry', progress: 'Progress',
    recording: 'Recording', tapToStart: 'Tap to record', tapToStop: 'Tap to stop',
    quickTags: 'Quick tags', tagDefect: 'Defect', tagProgress: 'Progress', tagSafety: 'Safety',
    tagMaterial: 'Material', tagCrew: 'Crew', tagWeather: 'Weather',
    todayReports: 'Today', earlier: 'Earlier', defects: 'Defects',
    entries: 'Log entries', weather: 'Weather', crew: 'Crew', machines: 'Machines',
    materials: 'Materials', exportPdf: 'Export PDF', siteDiary: 'Site diary',
    newEntry: 'New entry', open: 'Open', inProgress: 'In progress', closed: 'Closed',
    review: 'Review', delegate: 'Delegate', markFixed: 'Mark as fixed',
    fixedBy: 'Fixed by', offlineSaved: 'Saved offline · will sync automatically',
    aiExtracted: 'AI detected', signed: 'Signed', version: 'version',
    weatherAlert: 'Warning: concreting in low temperature, check additives',
    proofOfRepair: 'Proof of repair', sendVia: 'Send via',
    whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email', copyLink: 'Copy link',
    priority: 'Priority', high: 'High', medium: 'Medium', low: 'Low',
    assignedTo: 'Assignee', due: 'Due', location: 'Location', trade: 'Trade',
    electrical: 'Electrical', plumbing: 'Plumbing', hvac: 'HVAC',
    concrete: 'Concrete', carpentry: 'Carpentry', addPhoto: 'Add photo',
    tweaks: 'Tweaks', gloveMode: 'Glove mode', density: 'Density',
    compact: 'Compact', comfortable: 'Comfortable', language: 'Language',
    primaryColor: 'Accent color', bgColor: 'Background', surfaceColor: 'Cards',
    fontSize: 'Text size', font: 'Font', back: 'Back',
    play: 'Play', transcription: 'Transcription', summary: 'Summary',
    dailyLog: 'Daily log', noSignal: 'Saved offline', saved: 'Saved',
    duration: 'Duration', new: 'New', reminder: 'Reminder: diary not filled in',
  },
};

interface ThemeCtxType {
  tweaks: Tweaks;
  setKey: (k: keyof Tweaks, v: Tweaks[keyof Tweaks]) => void;
  t: (k: string) => string;
  scale: number;
  densityPad: number;
}

const ThemeCtx = createContext<ThemeCtxType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS);

  const setKey = useCallback((k: keyof Tweaks, v: Tweaks[keyof Tweaks]) => {
    setTweaks(prev => ({ ...prev, [k]: v }));
  }, []);

  const t = useCallback(
    (k: string) => I18N[tweaks.language]?.[k] ?? I18N.pl[k] ?? k,
    [tweaks.language],
  );

  const scale = tweaks.gloveMode ? 1.12 : 1;
  const densityPad = tweaks.density === 'compact' ? 12 : 16;

  return (
    <ThemeCtx.Provider value={{ tweaks, setKey, t, scale, densityPad }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme(): ThemeCtxType {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function themeVars(tweaks: Tweaks, scale: number): Record<string, string> {
  return {
    '--primary':      tweaks.primary,
    '--primary-ink':  tweaks.primaryInk,
    '--bg':           tweaks.bg,
    '--surface':      tweaks.surface,
    '--surface-2':    tweaks.surfaceElevated,
    '--border':       tweaks.border,
    '--ink-hi':       tweaks.textHi,
    '--ink-mid':      tweaks.textMid,
    '--ink-lo':       tweaks.textLo,
    '--danger':       tweaks.danger,
    '--warning':      tweaks.warning,
    '--success':      tweaks.success,
    '--radius':       `${tweaks.radius}px`,
    '--radius-sm':    `${tweaks.radiusSm}px`,
    '--shadow':       tweaks.shadow,
    '--font':         `'${tweaks.fontFamily}', system-ui, -apple-system, sans-serif`,
    '--fs-xs':        `${Math.round(12 * scale)}px`,
    '--fs-sm':        `${Math.round(14 * scale)}px`,
    '--fs-base':      `${Math.round(tweaks.fontBase * scale)}px`,
    '--fs-md':        `${Math.round(18 * scale)}px`,
    '--fs-lg':        `${Math.round(22 * scale)}px`,
    '--fs-xl':        `${Math.round(28 * scale)}px`,
    '--touch':        `${Math.round(48 * scale)}px`,
    '--touch-lg':     `${Math.round(64 * scale)}px`,
  };
}
