import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Report } from '../types';

const STATUS: Record<string, { label: string; cls: string; icon: string }> = {
  done:       { label: 'Gotowy',    cls: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  processing: { label: 'W trakcie', cls: 'bg-amber-100 text-amber-700',     icon: '⏳' },
  draft:      { label: 'Szkic',     cls: 'bg-gray-100 text-gray-500',       icon: '📝' },
  failed:     { label: 'Błąd',      cls: 'bg-red-100 text-red-600',         icon: '❌' },
};

interface Props {
  projectId: string;
  projectName: string;
  onOpenReport: (id: string) => void;
}

export default function ReportsPage({ projectId, projectName, onOpenReport }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase
      .from('reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setReports(data);
        setLoading(false);
      });
  }, [projectId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Raporty</h1>
        {projectName && (
          <p className="text-sm text-gray-400">📁 {projectName}</p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {!projectId && (
          <div className="flex flex-col items-center py-20 gap-3">
            <span className="text-5xl">📁</span>
            <p className="text-base font-semibold text-gray-600">Wybierz projekt</p>
            <p className="text-sm text-gray-400 text-center">Przejdź do zakładki Projekty i wybierz projekt</p>
          </div>
        )}

        {projectId && loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {projectId && !loading && reports.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-3">
            <span className="text-5xl">📋</span>
            <p className="text-lg font-semibold text-gray-700">Brak raportów</p>
            <p className="text-sm text-gray-400">Nagraj pierwszy raport głosowy</p>
          </div>
        )}

        {reports.map((r) => {
          const s = STATUS[r.status] ?? STATUS.draft;
          return (
            <button key={r.id} onClick={() => onOpenReport(r.id)} className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{formatDate(r.created_at)}</p>
                  <p className="text-xs text-gray-400">{formatTime(r.created_at)}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${s.cls}`}>
                  {s.label}
                </span>
              </div>

              {r.ai_summary && (
                <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">
                  {r.ai_summary}
                </p>
              )}

              <div className="flex items-center justify-between">
                {r.weather ? (
                  <span className="text-xs text-gray-400">☁️ {r.weather}</span>
                ) : <span />}
                {r.pdf_url && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600"
                  >
                    📄 Pobierz PDF
                  </a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
