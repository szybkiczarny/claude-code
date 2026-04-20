import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { printReport } from '../lib/pdf';
import type { Report, Defect } from '../types';

const SEVERITY: Record<string, { label: string; cls: string }> = {
  low:      { label: 'Niska',     cls: 'bg-blue-100 text-blue-700' },
  medium:   { label: 'Średnia',   cls: 'bg-amber-100 text-amber-700' },
  high:     { label: 'Wysoka',    cls: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Krytyczna', cls: 'bg-red-100 text-red-700' },
};

interface Props {
  reportId: string;
  onBack: () => void;
  onAddPhoto: (defectId: string) => void;
}

export default function ReportDetailPage({ reportId, onBack, onAddPhoto }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('reports').select('*').eq('id', reportId).single(),
      supabase.from('defects').select('*').eq('report_id', reportId).order('created_at'),
    ]).then(([{ data: r }, { data: d }]) => {
      if (r) { setReport(r); setPdfUrl(r.pdf_url); }
      if (d) setDefects(d);
      setLoading(false);
    });
  }, [reportId]);

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const handleGeneratePDF = () => {
    if (!report) return;
    printReport(report as any, defects, '');
  };

  if (!report) return (
    <div className="flex flex-col flex-1 items-center justify-center bg-white gap-3 px-6">
      <span className="text-4xl">📋</span>
      <p className="text-gray-600 font-semibold">Nie znaleziono raportu</p>
      <button onClick={onBack} className="text-blue-600 font-medium text-sm">Wróć</button>
    </div>
  );

  const date = new Date(report.created_at).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const time = new Date(report.created_at).toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-blue-600 text-2xl leading-none">‹</button>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{date}</p>
          <p className="text-xs text-gray-400">{time} {report.weather ? `· ${report.weather}` : ''}</p>
        </div>
        <button onClick={handleGeneratePDF}
          className="bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl active:bg-blue-700">
          📄 PDF
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* AI Summary */}
        {report.ai_summary && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">🤖 Podsumowanie AI</p>
            <p className="text-sm text-gray-700 leading-relaxed">{report.ai_summary}</p>
          </div>
        )}

        {/* Defects */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Usterki</p>
            <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-1 rounded-full">
              {defects.length}
            </span>
          </div>

          {defects.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">Brak usterek w tym raporcie</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {defects.map((d, i) => {
                const sev = SEVERITY[d.severity] ?? SEVERITY.medium;
                return (
                  <div key={d.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-gray-400 text-sm font-bold mt-0.5 shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium leading-snug">{d.description}</p>
                        {d.location_desc && (
                          <p className="text-xs text-gray-400 mt-1">📍 {d.location_desc}</p>
                        )}
                        {d.subcontractor && (
                          <p className="text-xs text-gray-500 mt-1">🏢 {d.subcontractor}</p>
                        )}
                        {d.deadline && (
                          <p className="text-xs text-orange-500 font-semibold mt-1">⏰ Do: {d.deadline}</p>
                        )}
                        {d.action && (
                          <p className="text-xs text-gray-500 mt-1 italic">{d.action}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.cls}`}>
                            {sev.label}
                          </span>
                          {d.status === 'resolved' && (
                            <span className="text-xs text-emerald-600 font-semibold">✓ Naprawiona</span>
                          )}
                        </div>
                        {d.photo_url ? (
                          <img
                            src={d.photo_url}
                            alt="Zdjęcie usterki"
                            className="mt-2 w-full rounded-xl object-cover max-h-48"
                          />
                        ) : (
                          <button
                            onClick={() => onAddPhoto(d.id)}
                            className="mt-2 text-xs text-blue-600 font-semibold flex items-center gap-1"
                          >
                            📷 Dodaj zdjęcie
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transcript */}
        {report.transcript && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowTranscript(v => !v)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <p className="font-semibold text-gray-900">Transkrypcja</p>
              <span className="text-gray-400">{showTranscript ? '▲' : '▼'}</span>
            </button>
            {showTranscript && (
              <div className="px-4 pb-4 border-t border-gray-50">
                <p className="text-sm text-gray-500 leading-relaxed pt-3">{report.transcript}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
