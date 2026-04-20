export type RecordingState = 'idle' | 'recording' | 'uploading' | 'processing' | 'done' | 'error';

export interface Project {
  id: string;
  name: string;
  address: string;
  client_name: string | null;
  status: 'active' | 'completed' | 'paused';
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
