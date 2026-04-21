import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { Card } from '../components/UI';
import type { Report } from '../types';

const T = {
  bg: '#0B1729', surface: '#142338', surfaceHi: '#1C2F49', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2', textDim: '#667690',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F', success: '#3DDC97',
};

function isToday(iso: string) {
  const d = new Date(iso), now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isYesterday(iso: string) {
  const d = new Date(iso), now = new Date();
  now.setDate(now.getDate() - 1);
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatDate(iso: string) {
  if (isToday(iso)) return 'dziś';
  if (isYesterday(iso)) return 'wczoraj';
  return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDuration(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface Props {
  projectId: string;
  projectName: string;
  onOpenReport: (id: string) => void;
}

interface ReportWithMeta extends Report {
  defectCount?: number;
}

export default function ReportsPage({ projectId, projectName, onOpenReport }: Props) {
  const [reports, setReports] = useState<ReportWithMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      let data: Report[] | null = null;

      if (projectId) {
        const res = await supabase
          .from('reports').select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        data = res.data;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: ps } = await supabase
          .from('projects').select('id').eq('manager_id', user.id);
        const projectIds = (ps ?? []).map(p => p.id);
        if (!projectIds.length) { setReports([]); setLoading(false); return; }
        const res = await supabase
          .from('reports').select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });
        data = res.data;
      }

      if (!data) { setLoading(false); return; }
      const ids = data.map(r => r.id);
      const { data: defects } = ids.length
        ? await supabase.from('defects').select('report_id').in('report_id', ids)
        : { data: [] };
      const counts: Record<string, number> = {};
      for (const d of defects ?? []) counts[d.report_id] = (counts[d.report_id] ?? 0) + 1;
      setReports(data.map(r => ({ ...r, defectCount: counts[r.id] ?? 0 })));
      setLoading(false);
    };
    load();
  }, [projectId]);

  const todayList = reports.filter(r => isToday(r.created_at));
  const earlierList = reports.filter(r => !isToday(r.created_at));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>RAPORTY</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4, color: T.text, lineHeight: 1.15 }}>
            {projectName || 'Wszystkie raporty'}
          </div>
        </div>
        <button style={{
          width: 44, height: 44, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`,
          color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.Filter size={22} />
        </button>
      </div>

      {/* Stats strip */}
      {!loading && reports.length > 0 && (
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8 }}>
          {[
            { label: 'Wszystkich', value: reports.length, color: T.text },
            { label: 'Dziś', value: todayList.length, color: T.primary },
            { label: 'Usterek', value: reports.reduce((a, r) => a + (r.defectCount ?? 0), 0), color: T.danger },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: T.surface, border: `1px solid ${T.line}`,
              borderRadius: 12, padding: '10px 12px',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: T.textMid, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="w-8 h-8 border-[3px] border-app-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12, color: T.textDim }}>
          <Icons.Doc size={52} strokeWidth={1.5} />
          <p style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>Brak raportów</p>
          <p style={{ fontSize: 13, color: T.textDim, margin: 0 }}>Nagraj pierwszy raport głosowy</p>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 120px' }}>
        {todayList.length > 0 && (
          <>
            <SectionLabel>Dziś · {todayList.length}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {todayList.map(r => <ReportCard key={r.id} report={r} isNew onClick={() => onOpenReport(r.id)} />)}
            </div>
          </>
        )}
        {earlierList.length > 0 && (
          <>
            <SectionLabel>Wcześniej · {earlierList.length}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {earlierList.map(r => <ReportCard key={r.id} report={r} onClick={() => onOpenReport(r.id)} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700, padding: '8px 0 10px' }}>
      {children}
    </div>
  );
}

function ReportCard({ report: r, isNew, onClick }: { report: ReportWithMeta; isNew?: boolean; onClick: () => void }) {
  return (
    <Card onClick={onClick} padded={false}>
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: `color-mix(in oklab, ${T.primary} 18%, transparent)`,
          border: `1px solid color-mix(in oklab, ${T.primary} 30%, transparent)`,
          color: T.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.Mic size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              {formatFull(r.created_at)}
            </span>
            {isNew && (
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: `color-mix(in oklab, ${T.primary} 18%, transparent)`,
                color: T.primary, border: `1px solid color-mix(in oklab, ${T.primary} 40%, transparent)`,
              }}>NOWY</span>
            )}
          </div>
          {r.ai_summary && (
            <div style={{
              fontSize: 13, color: T.textMid, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{r.ai_summary}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: T.textMid, fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icons.Clock size={13} /> {formatDate(r.created_at)}, {formatDuration(r.created_at)}
            </span>
            {(r.defectCount ?? 0) > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: T.danger }}>
                <Icons.Alert size={13} /> {r.defectCount}
              </span>
            )}
            {r.weather && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icons.Cloud size={13} /> {r.weather}
              </span>
            )}
          </div>
        </div>
        <Icons.ChevRight size={20} style={{ color: T.textDim, flexShrink: 0 }} />
      </div>
    </Card>
  );
}
