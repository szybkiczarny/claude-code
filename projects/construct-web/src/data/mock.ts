export interface MockProject {
  id: string; name: string; code: string; client: string; phase: string;
  progress: number; defectsOpen: number; defectsTotal: number; crewToday: number;
  lastEntry: string; weather: { temp: number; cond: string; icon: 'sun' | 'cloud' };
  location: string; color: string; overdue?: boolean; reminder?: boolean;
}

export interface MockAssignee { name: string; initials: string; }
export interface MockProof { author: string; when: string; note: string; }

export interface MockDefect {
  id: string; title: string;
  trade: 'electrical' | 'plumbing' | 'hvac' | 'concrete' | 'carpentry';
  priority: 'high' | 'medium' | 'low'; status: 'open' | 'inProgress' | 'review' | 'closed';
  location: string; assignee: MockAssignee; due: string;
  photos: number; thumb: string; created: string; source: 'recording' | 'manual';
  proof?: MockProof;
}

export interface MockReport {
  id: string; date: string; short: string; project: string;
  duration: string; defects: number; entries: number; crew: number;
  weather: { temp: number; cond: string }; badge?: string;
}

export interface MockDiaryEntry {
  id: string; time: string; type: string; title: string; note: string;
  tag: string; defectId?: string; auto?: boolean; qty?: string;
}

export interface MockCrewGroup { role: string; count: number; company: string; }
export interface MockMachine { name: string; hours: number; status: 'active' | 'standby'; }
export interface MockMaterial { name: string; qty: string; delivery: string; }
export interface MockTranscriptLine { t: string; text: string; }

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'osiedle-nadrzeczne', name: 'Osiedle Nadrzeczne — Budynek C', code: 'NDR-C',
    client: 'Atal S.A.', phase: 'Stan surowy zamknięty', progress: 0.62,
    defectsOpen: 14, defectsTotal: 47, crewToday: 23, lastEntry: 'dziś, 07:45',
    weather: { temp: 12, cond: 'Pochmurno', icon: 'cloud' },
    location: 'Warszawa, ul. Nadrzeczna 12', color: '#F5B800', overdue: true,
  },
  {
    id: 'biurowiec-mokotow', name: 'Biurowiec Mokotów Park', code: 'MOK-A',
    client: 'Echo Investment', phase: 'Wykończenia', progress: 0.81,
    defectsOpen: 8, defectsTotal: 112, crewToday: 41, lastEntry: 'dziś, 06:20',
    weather: { temp: 14, cond: 'Słonecznie', icon: 'sun' },
    location: 'Warszawa, Domaniewska 44', color: '#5BC0EB',
  },
  {
    id: 'hala-logistyczna', name: 'Hala logistyczna Pruszków II', code: 'PRU-2',
    client: 'Panattoni', phase: 'Fundamenty', progress: 0.18,
    defectsOpen: 3, defectsTotal: 6, crewToday: 12, lastEntry: 'wczoraj, 16:10',
    weather: { temp: 10, cond: 'Deszcz', icon: 'cloud' },
    location: 'Pruszków, Przemysłowa 3', color: '#22C08A',
  },
  {
    id: 'szkola-zacisze', name: 'Szkoła podstawowa Zacisze', code: 'ZAC-1',
    client: 'Miasto Warszawa', phase: 'Instalacje', progress: 0.44,
    defectsOpen: 21, defectsTotal: 38, crewToday: 18, lastEntry: 'dziś, 08:02',
    weather: { temp: 12, cond: 'Pochmurno', icon: 'cloud' },
    location: 'Warszawa, Lechicka 5', color: '#FF7A45', reminder: true,
  },
];

export const MOCK_DEFECTS: MockDefect[] = [
  {
    id: 'D-142', title: 'Pęknięcie w ścianie działowej — kuchnia M.3.04',
    trade: 'concrete', priority: 'high', status: 'open',
    location: 'Bud. C · 3 piętro · M.3.04',
    assignee: { name: 'Marek Kowalski', initials: 'MK' },
    due: '22.04', photos: 3, thumb: 'crack', created: 'dziś, 09:12', source: 'recording',
  },
  {
    id: 'D-141', title: 'Brak uszczelnienia przepustu kablowego',
    trade: 'electrical', priority: 'high', status: 'open',
    location: 'Bud. C · Piwnica · Pom. techniczne',
    assignee: { name: 'Ewa Nowak', initials: 'EN' },
    due: '21.04', photos: 2, thumb: 'cable', created: 'dziś, 08:55', source: 'recording',
  },
  {
    id: 'D-140', title: 'Niewłaściwe spadki w łazience M.2.11',
    trade: 'plumbing', priority: 'medium', status: 'inProgress',
    location: 'Bud. C · 2 piętro · M.2.11',
    assignee: { name: 'Piotr Wiśniewski', initials: 'PW' },
    due: '24.04', photos: 4, thumb: 'bathroom', created: 'dziś, 08:30', source: 'manual',
  },
  {
    id: 'D-139', title: 'Uszkodzona izolacja rury CO — pion W3',
    trade: 'plumbing', priority: 'medium', status: 'review',
    location: 'Bud. C · 3 piętro · Pion W3',
    assignee: { name: 'Piotr Wiśniewski', initials: 'PW' },
    due: '20.04', photos: 2, thumb: 'bathroom', created: 'wczoraj, 13:10', source: 'recording',
    proof: { author: 'Piotr W.', when: 'dziś, 11:20', note: 'Izolacja wymieniona, pianka PUR + taśma.' },
  },
  {
    id: 'D-138', title: 'Uszkodzony kanał wentylacyjny klatka B',
    trade: 'hvac', priority: 'medium', status: 'open',
    location: 'Bud. C · 4 piętro · Klatka B',
    assignee: { name: 'Tomasz Lis', initials: 'TL' },
    due: '25.04', photos: 1, thumb: 'vent', created: 'wczoraj, 15:42', source: 'recording',
  },
  {
    id: 'D-135', title: 'Odpryski farby na ościeżnicy D.1.08',
    trade: 'carpentry', priority: 'low', status: 'inProgress',
    location: 'Bud. C · 1 piętro · D.1.08',
    assignee: { name: 'Anna Zając', initials: 'AZ' },
    due: '28.04', photos: 2, thumb: 'door', created: 'wczoraj, 11:15', source: 'manual',
  },
  {
    id: 'D-133', title: 'Brak etykiet w rozdzielnicy RG-C',
    trade: 'electrical', priority: 'low', status: 'closed',
    location: 'Bud. C · Parter · Rozdzielnia',
    assignee: { name: 'Ewa Nowak', initials: 'EN' },
    due: '18.04', photos: 1, thumb: 'panel', created: 'pn., 10:22', source: 'manual',
  },
];

export const MOCK_DIARY_ENTRIES: MockDiaryEntry[] = [
  { id: 'E-07', time: '09:12', type: 'defect', title: 'Usterka: pęknięcie w ścianie M.3.04', note: 'Obejście do wykonania do końca tygodnia, zgłoszone wykonawcy.', tag: 'defect', defectId: 'D-142' },
  { id: 'E-06', time: '08:55', type: 'defect', title: 'Usterka: przepust kablowy bez uszczelnienia', note: 'Rygiel p.poż. brak — do poprawy przed odbiorem SSP.', tag: 'defect', defectId: 'D-141' },
  { id: 'E-05', time: '08:30', type: 'progress', title: 'Beton stropu 4 piętro — zakończony', note: 'Wylano 142 m³ klasy C30/37. Protokół podpisany.', tag: 'progress', qty: '142 m³' },
  { id: 'E-04', time: '08:00', type: 'crew', title: 'Odprawa poranna — 23 osoby', note: 'Tynkarze 8, elektrycy 6, hydraulicy 4, kierownik 1, pomocnicy 4.', tag: 'crew' },
  { id: 'E-03', time: '07:50', type: 'weather', title: 'Warunki atmosferyczne', note: 'Pochmurno, 12°C, wilgotność 68%, wiatr 3 m/s — brak przeciwwskazań do prac zewnętrznych.', tag: 'weather', auto: true },
  { id: 'E-02', time: '07:45', type: 'safety', title: 'Kontrola BHP — rusztowanie klatka A', note: 'Brak 1 kotwy, uzupełniono. Podpis: Kowalski.', tag: 'safety' },
  { id: 'E-01', time: '07:30', type: 'material', title: 'Dostawa: stal zbrojeniowa B500SP', note: '4,2 t, dokument WZ-04213, rozładunek plac 2.', tag: 'material', qty: '4,2 t' },
];

export const MOCK_CREW: MockCrewGroup[] = [
  { role: 'Tynkarze', count: 8, company: 'Budokor' },
  { role: 'Elektrycy', count: 6, company: 'Elektro-Mont' },
  { role: 'Hydraulicy', count: 4, company: 'AquaSys' },
  { role: 'Pomocnicy', count: 4, company: 'Budokor' },
  { role: 'Kierownik', count: 1, company: 'Generalny' },
];

export const MOCK_MACHINES: MockMachine[] = [
  { name: 'Żuraw wieżowy Liebherr 140 EC-H', hours: 6.5, status: 'active' },
  { name: 'Pompa do betonu Schwing S28', hours: 3.2, status: 'active' },
  { name: 'Wózek widłowy Manitou MT 1840', hours: 4.0, status: 'active' },
  { name: 'Agregat prądotwórczy 60 kVA', hours: 8.0, status: 'standby' },
];

export const MOCK_MATERIALS: MockMaterial[] = [
  { name: 'Beton C30/37', qty: '142 m³', delivery: 'dziś 07:20' },
  { name: 'Stal zbrojeniowa B500SP', qty: '4,2 t', delivery: 'dziś 07:30' },
  { name: 'Bloczki silikatowe 24', qty: '820 szt.', delivery: 'wczoraj' },
  { name: 'Wełna mineralna 15 cm', qty: '180 m²', delivery: 'wczoraj' },
];

export const MOCK_TRANSCRIPT: MockTranscriptLine[] = [
  { t: '00:03', text: 'Jestem na trzecim piętrze, Osiedle Nadrzeczne, budynek C.' },
  { t: '00:11', text: 'W mieszkaniu M trzy zero cztery, w ścianie działowej kuchni widzę pęknięcie, wyraźne, idzie skośnie od narożnika okna.' },
  { t: '00:28', text: 'Długość pęknięcia — około metr dwadzieścia, szerokość rozwarcia do dwóch milimetrów.' },
  { t: '00:41', text: 'Oznaczam jako usterka, priorytet wysoki, branża beton, odpowiedzialny Marek Kowalski, termin dwudziesty drugi.' },
  { t: '00:58', text: 'Robię zdjęcia z trzech ujęć — całość, narożnik, miarka.' },
  { t: '01:15', text: 'Idę do piwnicy, pomieszczenie techniczne — jest problem z przepustem kablowym, brak uszczelnienia ppoż.' },
];
