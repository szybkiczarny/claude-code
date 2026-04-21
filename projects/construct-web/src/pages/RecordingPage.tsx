import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { transcribeAudio } from '../lib/groq';
import { extractReportData } from '../lib/gemini';
import NotificationsPage from './NotificationsPage';
import { Icons } from '../components/Icons';
import { Card } from '../components/UI';
import type { RecordingState } from '../types';

const T = {
  bg: '#0B1729', surface: '#142338', surfaceHi: '#1C2F49', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2', textDim: '#667690',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F', success: '#3DDC97',
};

const TAG_DEFS = [
  { id: 'defect',   label: 'Usterka',  color: '#FF5A5F', Icon: Icons.Alert  },
  { id: 'progress', label: 'Postęp',   color: '#3DDC97', Icon: Icons.Check  },
  { id: 'safety',   label: 'BHP',      color: '#F6B93B', Icon: Icons.Shield },
  { id: 'material', label: 'Materiał', color: '#5BC0EB', Icon: Icons.Box    },
  { id: 'crew',     label: 'Ekipa',    color: '#A78BFA', Icon: Icons.Users  },
  { id: 'weather',  label: 'Pogoda',   color: '#9AA9C2', Icon: Icons.Cloud  },
];

interface Props {
  projectId: string;
  projectName: string;
  onOpenReport: (id: string) => void;
}

export default function RecordingPage({ projectId, projectName, onOpenReport }: Props) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Array<{ recipient: string; message: string }>>([]);
  const [savedDefects, setSavedDefects] = useState<any[]>([]);
  const [reportDate, setReportDate] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const noProject = !projectId;
  const isRecording = state === 'recording';

  const toggleTag = (id: string) => setSelectedTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setGps({ lat: coords.latitude, lng: coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      setState('recording');
    } catch {
      setError('Brak dostępu do mikrofonu. Zezwól w ustawieniach przeglądarki.');
      setState('error');
    }
  };

  const stopAndProcess = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
      mr.stream.getTracks().forEach(t => t.stop());
    });
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setState('uploading');
      const transcript = await transcribeAudio(blob);
      setState('processing');
      const reportData = await extractReportData(transcript);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: report, error: rErr } = await supabase
        .from('reports').insert({
          project_id: projectId, inspector_id: user?.id, transcript,
          ai_summary: reportData.summary, weather: reportData.weather,
          location_desc: reportData.location ?? null,
          lat: gps?.lat ?? null, lng: gps?.lng ?? null,
          notifications: reportData.notifications ?? [], status: 'done',
        }).select().single();
      if (rErr) throw rErr;
      if (reportData.defects.length > 0) {
        await supabase.from('defects').insert(
          reportData.defects.map((d: any) => ({
            report_id: report.id, project_id: projectId, description: d.description,
            severity: d.severity, location_desc: d.location,
            subcontractor: d.subcontractor ?? null, deadline: d.deadline ?? null, action: d.action ?? null,
          }))
        );
      }
      if (reportData.crew?.length > 0) {
        await supabase.from('crew').insert(
          reportData.crew.map((c: any) => ({
            project_id: projectId, report_id: report.id,
            role: c.role, company: c.company ?? null, count: c.count ?? 1,
            recorded_at: new Date().toISOString().split('T')[0],
          }))
        );
      }
      if (reportData.materials?.length > 0) {
        await supabase.from('materials').insert(
          reportData.materials.map((m: any) => ({
            project_id: projectId, report_id: report.id,
            name: m.name, qty: m.qty ?? null, delivery: m.delivery ?? null,
          }))
        );
      }
      setReportId(report.id);
      setSummary(reportData.summary);
      setNotifications(reportData.notifications ?? []);
      setReportDate(new Date(report.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }));
      setSavedDefects(reportData.defects.map((d: any) => ({
        description: d.description, severity: d.severity, location: d.location,
        deadline: d.deadline ?? null, action: d.action ?? '', subcontractor: d.subcontractor ?? null,
      })));
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      setState('error');
    }
  };

  const reset = () => { setState('idle'); setError(null); setSummary(null); setReportId(null); setDuration(0); setSelectedTags([]); setGps(null); };

  if (state === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>RAPORT GOTOWY</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, color: T.text }}>Zapisano pomyślnie</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: '50%', alignSelf: 'center', margin: '24px 0 8px',
            background: `color-mix(in oklab, ${T.success} 18%, transparent)`, color: T.success,
          }}>
            <Icons.Check size={40} strokeWidth={2.5} />
          </div>
          {summary && (
            <Card>
              <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6, margin: 0 }}>{summary}</p>
            </Card>
          )}
          {reportId && (
            <button onClick={() => onOpenReport(reportId)} style={{
              width: '100%', background: T.surface, border: `1px solid ${T.line}`,
              borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', color: T.text, textAlign: 'left',
            }}>
              <span style={{ color: T.primary }}><Icons.Camera size={28} /></span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Dodaj zdjęcia usterek</p>
                <p style={{ fontSize: 11, color: T.textDim, margin: '2px 0 0' }}>Otwórz raport i zrób foto</p>
              </div>
            </button>
          )}
          <button onClick={reset} style={{
            width: '100%', background: T.primary, color: T.primaryInk,
            borderRadius: 14, padding: 16, fontWeight: 700, fontSize: 16,
            border: 'none', cursor: 'pointer',
          }}>
            Nagraj kolejny raport
          </button>
          <NotificationsPage notifications={notifications} defects={savedDefects}
            projectName={projectName} senderName="Kierownik budowy" reportDate={reportDate} onDone={reset} />
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: `color-mix(in oklab, ${T.danger} 18%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.danger }}>
          <Icons.Alert size={40} />
        </div>
        <p style={{ fontSize: 14, color: T.danger, textAlign: 'center', fontWeight: 600 }}>{error}</p>
        <button onClick={reset} style={{
          background: T.surface, border: `1px solid ${T.line}`, color: T.text,
          borderRadius: 14, padding: '12px 32px', fontWeight: 600, cursor: 'pointer',
        }}>Spróbuj ponownie</button>
      </div>
    );
  }

  if (state === 'uploading' || state === 'processing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div className="w-16 h-16 border-4 border-app-primary border-t-transparent rounded-full animate-spin" />
        <p style={{ fontSize: 16, fontWeight: 600, color: T.text }}>
          {state === 'uploading' ? 'Wysyłanie audio…' : 'AI analizuje raport…'}
        </p>
        <p style={{ fontSize: 13, color: T.textDim }}>To może potrwać kilka sekund</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: isRecording ? T.danger : T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>
            {isRecording ? 'NAGRYWANIE' : 'NOWE NAGRANIE'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, color: T.text }}>
            {isRecording ? 'Nagrywam…' : 'Głosowy raport'}
          </div>
        </div>
      </div>

      {/* Project chip */}
      <div style={{ padding: '0 20px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          borderRadius: 14, background: T.surface, border: `1px solid ${T.line}`,
        }}>
          <Icons.Folder size={20} style={{ color: T.primary, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>PROJEKT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: noProject ? T.danger : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {projectName || 'Wybierz projekt w zakładce Projekty'}
            </div>
          </div>
        </div>
      </div>

      {/* Timer + waveform */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 24px' }}>
        <div style={{
          fontSize: 64, fontWeight: 300, color: T.text,
          fontVariantNumeric: 'tabular-nums', letterSpacing: -1, fontFamily: 'inherit',
        }}>{fmt(duration)}</div>
        <div style={{
          fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
        }}>
          {isRecording && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.danger }} className="animate-pulse" />}
          {isRecording ? 'NAGRYWANIE' : 'GOTOWE'}
        </div>
        <Waveform active={isRecording} />
      </div>

      {/* Quick tags */}
      {!noProject && (
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 10 }}>
            Szybkie tagi
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {TAG_DEFS.map(({ id, label, color, Icon }) => {
              const active = selectedTags.includes(id);
              return (
                <button key={id} onClick={() => toggleTag(id)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                  minHeight: 72,
                  background: active ? `color-mix(in oklab, ${color} 18%, transparent)` : T.surface,
                  border: `1.5px solid ${active ? color : T.line}`,
                  color: active ? color : T.textMid,
                }}>
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Big mic */}
      {!noProject && (
        <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          {isRecording && (
            <button style={{
              width: 64, height: 64, borderRadius: '50%', background: T.surface, border: `1px solid ${T.line}`,
              color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Pause size={28} />
            </button>
          )}
          <button
            onClick={isRecording ? stopAndProcess : startRecording}
            style={{
              width: 112, height: 112, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isRecording ? T.danger : `linear-gradient(180deg, ${T.primary} 0%, color-mix(in oklab, ${T.primary} 75%, #000) 100%)`,
              color: isRecording ? '#fff' : T.primaryInk,
              boxShadow: isRecording
                ? `0 0 0 8px color-mix(in oklab, ${T.danger} 25%, transparent), 0 12px 36px rgba(0,0,0,0.4)`
                : `0 14px 40px color-mix(in oklab, ${T.primary} 45%, transparent)`,
              transition: 'all .2s ease',
            }}
          >
            {isRecording ? <Icons.Stop size={40} /> : <Icons.Mic size={48} strokeWidth={2.4} />}
          </button>
          {isRecording && (
            <button style={{
              width: 64, height: 64, borderRadius: '50%', background: T.surface, border: `1px solid ${T.line}`,
              color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Camera size={28} />
            </button>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', paddingBottom: 12, fontSize: 11, color: T.textMid, letterSpacing: 0.5 }}>
        {isRecording ? 'Dotknij aby zakończyć' : 'Dotknij aby nagrać'}
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  const BARS = 48;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setPhase(p => p + 1), 80);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 72, width: '100%', justifyContent: 'center', marginTop: 20, marginBottom: 8 }}>
      {Array.from({ length: BARS }).map((_, i) => {
        const s1 = Math.sin(i * 0.7 + phase * 0.4) * 0.5 + 0.5;
        const s2 = Math.sin(i * 1.3 + phase * 0.2) * 0.5 + 0.5;
        const h = active ? Math.max(6, s1 * s2 * 64) : 4;
        const isAccent = active && i > BARS - 6;
        return (
          <div key={i} style={{
            width: 3, height: h, borderRadius: 2,
            background: isAccent ? T.primary : active ? T.text : T.line,
            transition: 'height .1s ease',
          }} />
        );
      })}
    </div>
  );
}
