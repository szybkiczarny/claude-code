import type { Project, Report } from '../types';

export const DEMO_PROJECTS: Project[] = [
  { id: '1', name: 'Osiedle Zielona Górka', address: 'ul. Polna 12, Warszawa', client_name: 'Develia S.A.', status: 'active', manager_id: null, created_at: new Date().toISOString() },
  { id: '2', name: 'Centrum Handlowe Nowa Brama', address: 'al. Krakowska 45, Kraków', client_name: 'Atrium Poland', status: 'active', manager_id: null, created_at: new Date().toISOString() },
  { id: '3', name: 'Biurowiec Prosta Tower', address: 'ul. Prosta 20, Warszawa', client_name: 'HB Reavis', status: 'paused', manager_id: null, created_at: new Date().toISOString() },
  { id: '4', name: 'Hala Magazynowa Logistix', address: 'ul. Przemysłowa 3, Łódź', client_name: 'Panattoni', status: 'completed', manager_id: null, created_at: new Date().toISOString() },
];

export const DEMO_REPORTS: Report[] = [
  {
    id: 'r1', project_id: '1', inspector_id: 'u1',
    audio_url: null, pdf_url: null,
    transcript: null,
    ai_summary: 'Inspekcja 3. piętra — stwierdzono pęknięcia tynku przy osi C oraz opóźnienie w montażu instalacji elektrycznej. Pracownicy: 12 osób. Warunki pogodowe dobre.',
    weather: 'Słonecznie, 18°C',
    status: 'done', lat: null, lng: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'r2', project_id: '1', inspector_id: 'u1',
    audio_url: null, pdf_url: null,
    transcript: null,
    ai_summary: 'Kontrola fundamentów skrzydła B. Wszystkie elementy zgodne z projektem. Zalecono dodatkowe uszczelnienie przy dylatacji.',
    weather: 'Pochmurno, 12°C',
    status: 'done', lat: null, lng: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];
