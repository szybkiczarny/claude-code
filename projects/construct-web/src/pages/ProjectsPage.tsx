import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { Card, Progress } from '../components/UI';
import type { Project } from '../types';

const T = {
  bg: '#0B1729', surface: '#142338', surfaceHi: '#1C2F49', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2', textDim: '#667690',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F', success: '#3DDC97',
};

const TODAY_LABEL = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

function isToday(iso: string) {
  const d = new Date(iso), now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000), d = Math.floor(diff / 86_400_000);
  if (h < 1) return 'przed chwilą';
  if (h < 24) return `${h}h temu`;
  return `${d}d temu`;
}

function projectCode(name: string) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return `${letters}-${new Date().getFullYear()}`;
}

function projectColor(id: string) {
  const hue = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const palette = ['#F6B93B', '#5BC0EB', '#22C08A', '#FF7A45', '#A78BFA', '#FB7185'];
  return palette[hue % palette.length];
}

interface ProjectMeta {
  openDefects: number;
  totalDefects: number;
  resolvedDefects: number;
  lastReport: string | null;
}

interface Props {
  displayName: string | null;
  onAdd: () => void;
  onDetail: (id: string, name: string) => void;
  onProfile: () => void;
}

export default function ProjectsPage({ displayName, onAdd, onDetail, onProfile }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [meta, setMeta] = useState<Record<string, ProjectMeta>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [todayReports, setTodayReports] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) return;

      const { data: ps } = await supabase
        .from('projects').select('*')
        .eq('manager_id', uid)
        .order('created_at', { ascending: false });

      const projectIds = (ps ?? []).map(p => p.id);

      const [{ data: defects }, { data: reports }] = await Promise.all([
        projectIds.length
          ? supabase.from('defects').select('project_id, status').in('project_id', projectIds)
          : Promise.resolve({ data: [] }),
        projectIds.length
          ? supabase.from('reports').select('project_id, created_at').in('project_id', projectIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      if (ps) setProjects(ps);
      const m: Record<string, ProjectMeta> = {};
      if (defects) {
        for (const d of defects) {
          if (!m[d.project_id]) m[d.project_id] = { openDefects: 0, totalDefects: 0, resolvedDefects: 0, lastReport: null };
          m[d.project_id].totalDefects++;
          if (d.status !== 'resolved') m[d.project_id].openDefects++;
          else m[d.project_id].resolvedDefects++;
        }
      }
      if (reports) {
        for (const r of reports) {
          if (!m[r.project_id]) m[r.project_id] = { openDefects: 0, totalDefects: 0, resolvedDefects: 0, lastReport: null };
          if (!m[r.project_id].lastReport) m[r.project_id].lastReport = r.created_at;
        }
        setTodayReports(reports.filter(r => isToday(r.created_at)).length);
      }
      setMeta(m);
      setLoading(false);
    };
    load();
  }, []);

  const totalOpen = Object.values(meta).reduce((s, m) => s + m.openDefects, 0);
  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.client_name ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>
            {TODAY_LABEL}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4, color: T.text, lineHeight: 1.15 }}>
            {displayName ? `Cześć, ${displayName.split(' ')[0]}` : 'Projekty'}
          </div>
        </div>
        <button onClick={onProfile} style={{
          width: 44, height: 44, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`,
          color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.User size={20} />
        </button>
        <button onClick={onAdd} style={{
          width: 44, height: 44, borderRadius: 12, background: T.primary,
          color: T.primaryInk, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Summary strip */}
      {!loading && (
        <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <StatTile value={projects.length} label="Projekty" color={T.text} />
          <StatTile value={totalOpen} label="Usterki" color={T.danger} />
          <StatTile value={todayReports} label="Dziś" color={T.primary} />
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 48, padding: '0 16px',
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14,
        }}>
          <Icons.Search size={20} style={{ color: T.textMid }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj projektu…"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none',
              color: T.text, fontSize: 16, fontFamily: 'inherit',
            }}
          />
          <button onClick={onAdd} style={{
            width: 34, height: 34, borderRadius: 10, background: T.surfaceHi,
            border: 0, color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Icons.Filter size={18} />
          </button>
        </div>
      </div>

      {/* Section label */}
      <div style={{ padding: '8px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>
          AKTYWNE PROJEKTY · {filtered.length}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="w-8 h-8 border-[3px] border-app-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 12, color: T.textDim }}>
          <Icons.Hardhat size={52} strokeWidth={1.5} />
          <p style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>Brak projektów</p>
          <p style={{ fontSize: 13, color: T.textDim, margin: 0, textAlign: 'center' }}>Kliknij + żeby dodać pierwszy projekt</p>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            meta={meta[p.id] ?? { openDefects: 0, totalDefects: 0, resolvedDefects: 0, lastReport: null }}
            onOpen={() => onDetail(p.id, p.name)}
          />
        ))}
      </div>
    </div>
  );
}

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontSize: 34, fontWeight: 800, color, lineHeight: 1, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.textMid, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ProjectCard({ project: p, meta, onOpen }: { project: Project; meta: ProjectMeta; onOpen: () => void }) {
  const color = projectColor(p.id);
  const code = projectCode(p.name);
  const progress = meta.totalDefects > 0 ? meta.resolvedDefects / meta.totalDefects : 0;
  const alertTone = meta.openDefects > 10 ? T.danger : T.primary;

  return (
    <Card onClick={onOpen} padded={false} style={{ overflow: 'hidden' }}>
      <div style={{ height: 4, background: color, width: '100%' }} />
      <div style={{ padding: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `color-mix(in oklab, ${color} 20%, transparent)`,
            border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
            color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 11, letterSpacing: 0.5,
          }}>{code}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, color: T.text, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.2 }}>
              {p.name}
            </div>
            <div style={{ fontSize: 11, color: T.textMid, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {p.client_name && <span>{p.client_name}</span>}
              {p.address && <><span style={{ width: 3, height: 3, borderRadius: '50%', background: T.textDim }} /><span>{p.address}</span></>}
            </div>
          </div>
          <Icons.ChevRight size={20} style={{ color: T.textDim, marginTop: 6 }} />
        </div>

        {/* Progress */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Postęp usterek</span>
            <span style={{ fontSize: 11, color: T.text, fontWeight: 700 }}>{Math.round(progress * 100)}%</span>
          </div>
          <Progress value={progress} color={color} />
        </div>

        {/* Meta chips */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {meta.openDefects > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 999,
              background: `color-mix(in oklab, ${alertTone} 15%, transparent)`,
              color: alertTone, border: `1px solid color-mix(in oklab, ${alertTone} 40%, transparent)`,
              fontSize: 11, fontWeight: 700,
            }}>
              <Icons.Alert size={12} /> {meta.openDefects} otwartych usterek
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 999,
            background: T.surfaceHi, color: T.textMid, border: `1px solid ${T.line}`,
            fontSize: 11, fontWeight: 600,
          }}>
            <Icons.Clock size={12} /> {meta.lastReport ? relativeTime(meta.lastReport) : 'brak raportów'}
          </span>
        </div>
      </div>
    </Card>
  );
}
