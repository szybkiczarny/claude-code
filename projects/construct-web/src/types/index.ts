export type RecordingState = 'idle' | 'recording' | 'uploading' | 'processing' | 'done' | 'error';

export interface Project {
  id: string;
  name: string;
  address: string;
  client_name: string | null;
  status: 'active' | 'completed' | 'paused';
  manager_id: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  project_id: string;
  inspector_id: string;
  audio_url: string | null;
  transcript: string | null;
  ai_summary: string | null;
  pdf_url: string | null;
  weather: string | null;
  status: 'draft' | 'processing' | 'done' | 'failed';
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface CrewEntry {
  id: string;
  project_id: string;
  report_id: string | null;
  role: string;
  company: string | null;
  count: number;
  recorded_at: string;
  created_at: string;
}

export interface MaterialEntry {
  id: string;
  project_id: string;
  report_id: string | null;
  name: string;
  qty: string | null;
  delivery: string | null;
  created_at: string;
}

export interface Contractor {
  id: string;
  manager_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  trade: string | null;
  created_at: string;
}

export interface Defect {
  id: string;
  report_id: string;
  project_id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  photo_url: string | null;
  location_desc: string | null;
  subcontractor: string | null;
  deadline: string | null;
  action: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: string;
}
