import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { printReport } from '../lib/pdf';
import { Icons } from '../components/Icons';
import { Card, ScreenHeader, PhotoThumb, PriorityBar, StatusLabelChip, TradeIcon, MiniStat } from '../components/UI';
import { DelegateSheet } from '../components/DelegateSheet';
import type { Report, Defect } from '../types';

const T = {
  bg: '#0B1729', surface: '#142338', surfaceHi: '#1C2F49', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2', textDim: '#667690',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F', success: '#3DDC97',
  warning: '#FFB02E',
};

function statusLabel(s: string) {
  return s === 'open' ? 'Otwarta' : s === 'in_progress' ? 'W toku' : s === 'review' ? 'Weryfikacja' : 'Naprawiona';
}


interface Props {
  reportId: string;
  onBack: () => void;
  onAddPhoto: (defectId: string) => void;
}

export default function ReportDetailPage({ reportId, onBack, onAddPhoto }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'defects' | 'transcript'>('defects');
  const [delegateFor, setDelegateFor] = useState<Defect | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('reports').select('*').eq('id', reportId).single(),
      supabase.from('defects').select('*').eq('report_id', reportId).order('created_at'),
    ]).then(([{ data: r }, { data: d }]) => {
      if (r) setReport(r);
      if (d) setDefects(d);
      setLoading(false);
    });
  }, [reportId]);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <div className="w-8 h-8 border-4 border-app-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!report) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, gap: 12 }}>
      <p style={{ color: T.textMid, fontWeight: 600 }}>Nie znaleziono raportu</p>
      <button onClick={onBack} style={{ color: T.primary, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Wróć</button>
    </div>
  );

  const date = new Date(report.created_at).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = new Date(report.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const TABS = [
    { id: 'defects' as const, label: 'Usterki', count: defects.length },
    { id: 'transcript' as const, label: 'Transkrypcja', count: null },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, position: 'relative' }}>

      <ScreenHeader
        onBack={onBack}
        subtitle={`${time}${report.weather ? ` · ${report.weather}` : ''}`}
        title={date}
        right={
          <button onClick={() => printReport(report as any, defects, '')} style={{
            padding: '0 14px', height: 44, borderRadius: 12, background: T.primary, color: T.primaryInk,
            border: 0, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
          }}>
            <Icons.Pdf size={18} /> PDF
          </button>
        }
      />

      {/* Weather alert */}
      {report.weather && (report.weather.includes('ront') || report.weather.includes('eszcz') || report.weather.includes('nieg')) && (
        <div style={{ padding: '0 20px 10px' }}>
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: `color-mix(in oklab, ${T.warning} 14%, transparent)`,
            border: `1px solid color-mix(in oklab, ${T.warning} 35%, transparent)`,
            display: 'flex', alignItems: 'center', gap: 10, color: T.warning,
          }}>
            <Icons.Alert size={18} />
            <div style={{ fontSize: 11, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
              Uwaga: warunki atmosferyczne mogą wpłynąć na prace na zewnątrz
            </div>
          </div>
        </div>
      )}

      {/* Context card */}
      <div style={{ padding: '0 20px 14px' }}>
        <Card padded={false}>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
            <MiniStat icon={<Icons.Alert size={14} />} value={defects.length} label="Usterki" color={T.danger} />
            <MiniStat icon={<Icons.Alert size={14} />} value={defects.filter(d => d.status === 'open').length} label="Otwarte" color={T.danger} />
            <MiniStat icon={<Icons.Cloud size={14} />} value={report.weather ?? '—'} label="Pogoda" />
            <MiniStat icon={<Icons.Check size={14} />} value={defects.filter(d => d.status === 'resolved').length} label="Napraw." color={T.success} />
          </div>
          {report.lat && report.lng && (
            <a
              href={`https://www.google.com/maps?q=${report.lat},${report.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderTop: `1px solid ${T.line}`,
                color: T.primary, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              <Icons.MapPin size={16} />
              {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textDim }}>Otwórz w Maps →</span>
            </a>
          )}
          {report.ai_summary && (
            <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.line}`, fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>
              {report.ai_summary}
            </div>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px 0', display: 'flex', gap: 4, borderBottom: `1px solid ${T.line}` }}>
        {TABS.map(tabDef => (
          <button key={tabDef.id} onClick={() => setTab(tabDef.id)} style={{
            flex: 1, padding: '12px 6px', background: 'transparent', border: 0, cursor: 'pointer',
            color: tab === tabDef.id ? T.text : T.textMid,
            fontWeight: tab === tabDef.id ? 700 : 500, fontSize: 14, fontFamily: 'inherit',
            borderBottom: `2px solid ${tab === tabDef.id ? T.primary : 'transparent'}`,
            marginBottom: -1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {tabDef.label}
            {tabDef.count != null && (
              <span style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 999,
                background: tab === tabDef.id ? T.primary : T.line,
                color: tab === tabDef.id ? T.primaryInk : T.textMid, fontWeight: 700,
              }}>{tabDef.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px 120px' }}>
        {tab === 'defects' && (
          <DefectsList defects={defects} onAddPhoto={onAddPhoto} onDelegate={setDelegateFor} />
        )}
        {tab === 'transcript' && <TranscriptView transcript={report.transcript} />}
      </div>

      <DelegateSheet open={!!delegateFor} onClose={() => setDelegateFor(null)} defect={delegateFor} />
    </div>
  );
}

function DefectsList({
  defects, onAddPhoto, onDelegate,
}: {
  defects: Defect[];
  onAddPhoto: (id: string) => void;
  onDelegate: (d: Defect) => void;
}) {
  const [filter, setFilter] = useState<string>('all');
  const filters = [
    { id: 'all',         label: 'Wszystkie', count: defects.length },
    { id: 'open',        label: 'Otwarte',   count: defects.filter(d => d.status === 'open').length },
    { id: 'in_progress', label: 'W toku',    count: defects.filter(d => d.status === 'in_progress').length },
    { id: 'resolved',    label: 'Naprawione',count: defects.filter(d => d.status === 'resolved').length },
  ];
  const visible = filter === 'all' ? defects : defects.filter(d => d.status === filter);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
            background: filter === f.id ? T.primary : T.surface,
            color: filter === f.id ? T.primaryInk : T.textMid,
            border: `1px solid ${filter === f.id ? T.primary : T.line}`,
            fontSize: 11, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {f.label}
            <span style={{ padding: '1px 6px', borderRadius: 999, background: filter === f.id ? 'rgba(11,22,40,0.2)' : T.line, fontSize: 11, fontWeight: 700 }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>
      {defects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 14 }}>
          Brak usterek w tym raporcie
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(d => <DefectCard key={d.id} defect={d} onAddPhoto={onAddPhoto} onDelegate={onDelegate} />)}
      </div>
    </>
  );
}

function DefectCard({
  defect: d, onAddPhoto, onDelegate,
}: {
  defect: Defect;
  onAddPhoto: (id: string) => void;
  onDelegate: (d: Defect) => void;
}) {
  const sl = statusLabel(d.status);
  const thumbKind = d.severity === 'high' || d.severity === 'critical' ? 'crack' : 'bathroom';

  return (
    <Card padded={false} style={{ opacity: d.status === 'resolved' ? 0.65 : 1 }}>
      <div style={{ padding: 14, display: 'flex', gap: 12 }}>
        <PhotoThumb id={d.id} kind={thumbKind} size={72} radius={12} watermark />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: T.textDim, fontWeight: 700, letterSpacing: 0.6 }}>{d.id.slice(0, 8)}</span>
            <PriorityBar level={d.severity} />
            <div style={{ flex: 1 }} />
            <StatusLabelChip status={d.status} label={sl} />
          </div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3,
            textDecoration: d.status === 'resolved' ? 'line-through' : 'none',
          }}>
            {d.description}
          </div>
          {d.location_desc && (
            <div style={{ fontSize: 11, color: T.textMid, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icons.Pin size={12} />{d.location_desc}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 14px', borderTop: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', gap: 10,
        background: `color-mix(in oklab, ${T.bg} 30%, transparent)`,
      }}>
        <TradeIcon trade={d.severity === 'high' || d.severity === 'critical' ? 'concrete' : 'plumbing'} size={14} />
        {d.subcontractor && (
          <>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.textDim }} />
            <span style={{ fontSize: 11, color: T.textMid, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
              {d.subcontractor}
            </span>
          </>
        )}
        <div style={{ flex: 1 }} />
        {d.deadline && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: T.surfaceHi, color: T.textMid, border: `1px solid ${T.line}`,
          }}>
            <Icons.Calendar size={11} /> {d.deadline}
          </span>
        )}
        {d.photo_url ? (
          <img src={d.photo_url} alt="" style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 160 }} />
        ) : (
          <button onClick={() => onAddPhoto(d.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: `color-mix(in oklab, ${T.primary} 15%, transparent)`,
            color: T.primary, border: `1px solid color-mix(in oklab, ${T.primary} 40%, transparent)`,
            cursor: 'pointer',
          }}>
            <Icons.Camera size={12} /> Zdjęcie
          </button>
        )}
        <button
          onClick={() => onDelegate(d)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.primary, color: T.primaryInk,
            border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Deleguj"
        >
          <Icons.Send size={15} />
        </button>
      </div>
    </Card>
  );
}

function TranscriptView({ transcript }: { transcript: string | null }) {
  if (!transcript) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: T.textDim, fontSize: 14 }}>Brak transkrypcji</div>
  );
  return (
    <Card>
      <p style={{ fontSize: 14, color: T.textMid, lineHeight: 1.6, margin: 0 }}>{transcript}</p>
    </Card>
  );
}
