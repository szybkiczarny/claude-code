import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { transcribeAudio } from '../lib/groq';
import { extractReportData } from '../lib/gemini';
import NotificationsPage from './NotificationsPage';
import type { RecordingState } from '../types';

interface Props {
  projectId: string;
  projectName: string;
  onOpenReport: (id: string) => void;
}

export default function RecordingPage({ projectId, projectName, onOpenReport }: Props) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
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
      mr.stream.getTracks().forEach((t) => t.stop());
    });

    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

      setState('uploading');
      const transcript = await transcribeAudio(blob);

      setState('processing');
      const reportData = await extractReportData(transcript);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: report, error: rErr } = await supabase
        .from('reports')
        .insert({
          project_id: projectId,
          inspector_id: user?.id,
          transcript,
          ai_summary: reportData.summary,
          weather: reportData.weather,
          location_desc: reportData.location ?? null,
          notifications: reportData.notifications ?? [],
          status: 'done',
        })
        .select()
        .single();

      if (rErr) throw rErr;

      if (reportData.defects.length > 0) {
        await supabase.from('defects').insert(
          reportData.defects.map((d) => ({
            report_id: report.id,
            project_id: projectId,
            description: d.description,
            severity: d.severity,
            location_desc: d.location,
            subcontractor: d.subcontractor ?? null,
            deadline: d.deadline ?? null,
            action: d.action ?? null,
          }))
        );
      }

      setReportId(report.id);
      setSummary(reportData.summary);
      setNotifications(reportData.notifications ?? []);
      setReportDate(new Date(report.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }));
      setSavedDefects(reportData.defects.map((d: any) => ({
        description: d.description, severity: d.severity,
        location: d.location, deadline: d.deadline ?? null, action: d.action ?? '',
        subcontractor: d.subcontractor ?? null,
      })));
      setState('done');

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nieznany błąd';
      setError(msg);
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setError(null);
    setSummary(null);
    setReportId(null);
    setDuration(0);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nowy raport</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1 rounded-full border border-blue-100">
            {projectName ? `🏗️ ${projectName}` : '⚠️ Wybierz projekt'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-10 pb-8 gap-8">

        {/* No project warning */}
        {noProject && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-amber-700 font-semibold text-sm">Najpierw wybierz projekt w zakładce Projekty</p>
          </div>
        )}

        {/* Mic button */}
        {!noProject && (
          <>
            {state === 'idle' && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={startRecording}
                  className="w-44 h-44 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center shadow-2xl shadow-blue-200 active:scale-95 transition-transform"
                >
                  <span className="text-5xl">🎙️</span>
                  <span className="text-sm font-bold mt-2">Naciśnij i mów</span>
                </button>
                <p className="text-sm text-gray-400 text-center">Opisz co widzisz na budowie</p>
              </div>
            )}

            {state === 'recording' && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={stopAndProcess}
                  className="w-44 h-44 rounded-full bg-red-500 text-white flex flex-col items-center justify-center shadow-2xl shadow-red-200 active:scale-95 transition-transform relative"
                >
                  <span className="absolute top-5 right-5 w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="text-5xl">⏹</span>
                  <span className="text-sm font-bold mt-2">Zatrzymaj</span>
                  <span className="text-xl font-mono font-bold mt-1">{fmt(duration)}</span>
                </button>
                <p className="text-sm text-red-400 font-medium animate-pulse">● Nagrywanie…</p>
              </div>
            )}

            {(state === 'uploading' || state === 'processing') && (
              <div className="flex flex-col items-center gap-5 py-10">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-base font-semibold text-gray-700">
                  {state === 'uploading' ? '⬆️ Wysyłanie audio…' : '🤖 AI analizuje raport…'}
                </p>
                <p className="text-sm text-gray-400">To może potrwać kilka sekund</p>
              </div>
            )}

            {state === 'done' && (
              <div className="w-full flex flex-col items-center gap-5">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">✅</span>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">Raport gotowy!</p>
                  {summary && (
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs">{summary}</p>
                  )}
                </div>
                <div className="w-full space-y-3">
                  {reportId && (
                    <button
                      onClick={() => reportId && onOpenReport(reportId)}
                      className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 flex items-center gap-4 active:bg-gray-50"
                    >
                      <span className="text-3xl">📸</span>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Dodaj zdjęcia usterek</p>
                        <p className="text-xs text-gray-400">Zrób foto przez aparat</p>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="w-full bg-blue-600 text-white rounded-2xl p-4 font-semibold active:bg-blue-700"
                  >
                    🎙️ Nagraj kolejny raport
                  </button>
                  <NotificationsPage
                    notifications={notifications}
                    defects={savedDefects}
                    projectName={projectName}
                    senderName="Kierownik budowy"
                    reportDate={reportDate}
                    onDone={reset}
                  />
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="w-full flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">❌</span>
                </div>
                <p className="text-sm text-red-600 text-center font-medium px-4">{error}</p>
                <button
                  onClick={reset}
                  className="bg-gray-900 text-white rounded-2xl px-8 py-3 font-semibold"
                >
                  Spróbuj ponownie
                </button>
              </div>
            )}
          </>
        )}

        {/* Tips */}
        {state === 'idle' && !noProject && (
          <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-700">💡 Jak nagrywać?</p>
            <ul className="space-y-1">
              {[
                'Powiedz gdzie jesteś (np. „3. piętro, oś C")',
                'Opisz co widzisz i co wymaga naprawy',
                'Wspomnij liczbę pracowników jeśli ważne',
                'AI automatycznie wyciągnie usterki',
              ].map((tip) => (
                <li key={tip} className="text-sm text-blue-600 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
