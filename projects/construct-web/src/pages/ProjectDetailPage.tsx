import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { Card, Progress, PriorityBar, MiniStat, SectionLabel, ScreenHeader, TradeIcon, PhotoThumb } from '../components/UI';
import { DelegateSheet } from '../components/DelegateSheet';
import type { Project, Defect, Report, CrewEntry, MaterialEntry } from '../types';

const T = {
  bg: '#0B1729', surface: '#142338', surfaceHi: '#1C2F49', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2', textDim: '#667690',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F', success: '#3DDC97',
  warning: '#FFB02E',
};

function projectColor(id: string) {
  const palette = ['#F6B93B', '#5BC0EB', '#22C08A', '#FF7A45', '#A78BFA', '#FB7185'];
  const hue = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return palette[hue % palette.length];
}

function projectCode(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') + '-' + new Date().getFullYear();
}


interface Props {
  projectId: string;
  onBack: () => void;
  onOpenReport: (id: string) => void;
  onRecord: () => void;
}

type TabId = 'diary' | 'todo' | 'defects' | 'crew' | 'materials';

export default function ProjectDetailPage({ projectId, onBack, onOpenReport, onRecord }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('diary');
  const [delegateFor, setDelegateFor] = useState<Defect | null>(null);

  const reload = () => {
    Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('defects').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('reports').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(10),
      supabase.from('crew').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('materials').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]).then(([{ data: p }, { data: d }, { data: r }, { data: c }, { data: m }]) => {
      if (p) setProject(p);
      if (d) setDefects(d);
      if (r) setReports(r);
      if (c) setCrew(c);
      if (m) setMaterials(m);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [projectId]);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <div className="w-8 h-8 border-4 border-app-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!project) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, gap: 12 }}>
      <p style={{ color: T.textMid, fontWeight: 600 }}>Nie znaleziono projektu</p>
      <button onClick={onBack} style={{ color: T.primary, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Wróć</button>
    </div>
  );

  const color = projectColor(project.id);
  const code = projectCode(project.name);
  const openDefects = defects.filter(d => d.status === 'open' || d.status === 'in_progress').length;
  const resolvedDefects = defects.filter(d => d.status === 'resolved').length;
  const progress = defects.length > 0 ? resolvedDefects / defects.length : 0;

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'diary',     label: 'Dziennik' },
    { id: 'todo',      label: 'Do zrobienia', count: openDefects },
    { id: 'defects',   label: 'Usterki',      count: defects.length },
    { id: 'crew',      label: 'Ekipa' },
    { id: 'materials', label: 'Materiały' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, position: 'relative' }}>

      <ScreenHeader
        onBack={onBack}
        subtitle={`${code}${project.client_name ? ` · ${project.client_name}` : ''}`}
        title={project.name}
        right={
          <button style={{
            width: 44, height: 44, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`,
            color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.More size={22} />
          </button>
        }
      />

      {/* Hero stats */}
      <div style={{ padding: '0 20px 14px' }}>
        <Card padded={false}>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                Postęp napraw
              </span>
              <span style={{ fontSize: 13, color: T.text, fontWeight: 700 }}>{Math.round(progress * 100)}%</span>
            </div>
            <Progress value={progress} color={color} height={8} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
              <MiniStat icon={<Icons.Alert size={14} />} value={openDefects} label="Do zrobienia" color={T.danger} />
              <MiniStat icon={<Icons.Doc size={14} />} value={reports.length} label="Raporty" />
              <MiniStat icon={<Icons.Box size={14} />} value={defects.length} label="Usterki" />
              <MiniStat icon={<Icons.Check size={14} />} value={resolvedDefects} label="Napraw." color={T.success} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px 0', display: 'flex', borderBottom: `1px solid ${T.line}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(tabDef => (
          <button key={tabDef.id} onClick={() => setTab(tabDef.id)} style={{
            padding: '12px 10px', background: 'transparent', border: 0, cursor: 'pointer',
            color: tab === tabDef.id ? T.text : T.textMid,
            fontWeight: tab === tabDef.id ? 700 : 500, fontSize: 14, fontFamily: 'inherit',
            borderBottom: `2px solid ${tab === tabDef.id ? T.primary : 'transparent'}`,
            marginBottom: -1, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
            WebkitTapHighlightColor: 'transparent',
          }}>
            {tabDef.label}
            {tabDef.count != null && tabDef.count > 0 && (
              <span style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 999,
                background: tab === tabDef.id ? T.danger : T.line,
                color: tab === tabDef.id ? '#fff' : T.textMid, fontWeight: 700,
              }}>{tabDef.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px 120px' }}>
        {tab === 'diary' && (
          <DiaryTab reports={reports} onOpenReport={onOpenReport} onRecord={onRecord} />
        )}
        {tab === 'todo' && (
          <TodoTab defects={defects.filter(d => d.status === 'open' || d.status === 'in_progress')} onDelegate={setDelegateFor} onReload={reload} />
        )}
        {tab === 'defects' && (
          <DefectsTab defects={defects} onDelegate={setDelegateFor} onReload={reload} />
        )}
        {tab === 'crew' && <CrewTab projectId={projectId} crew={crew} onReload={reload} />}
        {tab === 'materials' && <MaterialsTab projectId={projectId} materials={materials} onReload={reload} />}
      </div>

      <DelegateSheet open={!!delegateFor} onClose={() => setDelegateFor(null)} defect={delegateFor} onAssigned={reload} />
    </div>
  );
}

function DiaryTab({ reports, onOpenReport, onRecord }: { reports: Report[]; onOpenReport: (id: string) => void; onRecord: () => void }) {
  return (
    <>
      <button onClick={onRecord} style={{
        width: '100%', padding: '14px', marginBottom: 14,
        background: T.primary, color: T.primaryInk,
        border: 0, borderRadius: 14, fontWeight: 700, fontFamily: 'inherit', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', minHeight: 48,
      }}>
        <Icons.Mic size={18} /> Nagraj raport głosowy
      </button>

      {reports.length > 0 ? (
        <>
          <SectionLabel>Raporty · {reports.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map(r => (
              <Card key={r.id} onClick={() => onOpenReport(r.id)} padded={false}>
                <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `color-mix(in oklab, ${T.primary} 18%, transparent)`,
                    color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icons.Mic size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                      {new Date(r.created_at).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    {r.ai_summary && (
                      <div style={{ fontSize: 12, color: T.textMid, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.ai_summary}
                      </div>
                    )}
                  </div>
                  <Icons.ChevRight size={18} style={{ color: T.textDim, flexShrink: 0 }} />
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState icon={<Icons.Mic size={40} strokeWidth={1.5} />} title="Brak raportów" sub="Nagraj pierwszy raport głosowy powyżej" />
      )}
    </>
  );
}

function TodoTab({ defects, onDelegate, onReload }: { defects: Defect[]; onDelegate: (d: Defect) => void; onReload: () => void }) {
  if (defects.length === 0) return (
    <EmptyState icon={<Icons.Check size={40} strokeWidth={1.5} />} title="Nic do zrobienia" sub="Usterki z raportów głosowych pojawią się tutaj" />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {defects.map(d => <DefectCard key={d.id} defect={d} onDelegate={onDelegate} onStatusChange={onReload} />)}
    </div>
  );
}

function DefectsTab({ defects, onDelegate, onReload }: { defects: Defect[]; onDelegate: (d: Defect) => void; onReload: () => void }) {
  const [filter, setFilter] = useState('all');
  const filters = [
    { id: 'all',         label: 'Wszystkie',  count: defects.length },
    { id: 'open',        label: 'Otwarte',    count: defects.filter(d => d.status === 'open').length },
    { id: 'in_progress', label: 'W toku',     count: defects.filter(d => d.status === 'in_progress').length },
    { id: 'resolved',    label: 'Naprawione', count: defects.filter(d => d.status === 'resolved').length },
  ];
  const visible = filter === 'all' ? defects : defects.filter(d => d.status === filter);

  if (defects.length === 0) return (
    <EmptyState icon={<Icons.Alert size={40} strokeWidth={1.5} />} title="Brak usterek" sub="Usterki wykryte przez AI z raportów pojawią się tutaj" />
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 12px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
            background: filter === f.id ? T.primary : T.surface,
            color: filter === f.id ? T.primaryInk : T.textMid,
            border: `1px solid ${filter === f.id ? T.primary : T.line}`,
            fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {f.label}
            <span style={{ padding: '1px 6px', borderRadius: 999, background: filter === f.id ? 'rgba(11,22,40,0.2)' : T.line, fontSize: 11, fontWeight: 700 }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(d => <DefectCard key={d.id} defect={d} onDelegate={onDelegate} onStatusChange={onReload} />)}
      </div>
    </>
  );
}

const STATUS_CYCLE: Record<string, Defect['status']> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'open',
};

function StatusToggle({ defect, onChanged }: { defect: Defect; onChanged: (updated: Defect) => void }) {
  const [busy, setBusy] = useState(false);
  const cycle = async () => {
    if (busy) return;
    const next = STATUS_CYCLE[defect.status];
    setBusy(true);
    await supabase.from('defects').update({ status: next }).eq('id', defect.id);
    setBusy(false);
    onChanged({ ...defect, status: next });
  };
  const label = defect.status === 'open' ? 'Otwarta' : defect.status === 'in_progress' ? 'W toku' : 'Naprawiona';
  const color = defect.status === 'open' ? T.danger : defect.status === 'in_progress' ? T.warning : T.success;
  return (
    <button onClick={cycle} disabled={busy} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: `color-mix(in oklab, ${color} 18%, transparent)`,
      color, border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
      cursor: 'pointer', fontFamily: 'inherit',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {busy ? '…' : label}
    </button>
  );
}

function DefectCard({ defect: initialD, onDelegate, onStatusChange }: { defect: Defect; onDelegate: (d: Defect) => void; onStatusChange: (updated: Defect) => void }) {
  const [d, setD] = useState(initialD);
  useEffect(() => { setD(initialD); }, [initialD]);
  const handleStatusChange = (updated: Defect) => { setD(updated); onStatusChange(updated); };
  return (
    <Card padded={false} style={{ opacity: d.status === 'resolved' ? 0.65 : 1 }}>
      <div style={{ padding: 14, display: 'flex', gap: 12 }}>
        <PhotoThumb id={d.id} kind={d.severity === 'high' || d.severity === 'critical' ? 'crack' : 'bathroom'} size={64} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <PriorityBar level={d.severity} />
            <div style={{ flex: 1 }} />
            <StatusToggle defect={d} onChanged={handleStatusChange} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3, textDecoration: d.status === 'resolved' ? 'line-through' : 'none' }}>
            {d.description}
          </div>
          {d.location_desc && (
            <div style={{ fontSize: 11, color: T.textMid, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icons.Pin size={12} />{d.location_desc}
            </div>
          )}
        </div>
      </div>
      <div style={{
        padding: '10px 14px', borderTop: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', gap: 10,
        background: `color-mix(in oklab, ${T.bg} 30%, transparent)`,
      }}>
        <TradeIcon trade="concrete" size={14} />
        {d.subcontractor ? (
          <span style={{ fontSize: 11, color: T.textMid, fontWeight: 600 }}>{d.subcontractor}</span>
        ) : (
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600 }}>Brak wykonawcy</span>
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
        <button
          onClick={() => onDelegate(d)}
          style={{
            width: 32, height: 32, borderRadius: 8, background: T.primary, color: T.primaryInk,
            border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icons.Send size={15} />
        </button>
      </div>
    </Card>
  );
}

function CrewTab({ projectId, crew, onReload }: { projectId: string; crew: CrewEntry[]; onReload: () => void }) {
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!role.trim()) return;
    setSaving(true);
    await supabase.from('crew').insert({
      project_id: projectId, report_id: null,
      role: role.trim(), company: company.trim() || null,
      count: parseInt(count) || 1,
      recorded_at: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    setRole(''); setCompany(''); setCount('1');
    setAdding(false);
    onReload();
  };

  const total = crew.reduce((a, c) => a + c.count, 0);

  return (
    <>
      <button onClick={() => setAdding(v => !v)} style={{
        width: '100%', padding: '13px', marginBottom: 14,
        background: adding ? T.surface : T.primary,
        color: adding ? T.text : T.primaryInk,
        border: adding ? `1px solid ${T.line}` : 'none',
        borderRadius: 14, fontWeight: 700, fontFamily: 'inherit', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer',
      }}>
        <Icons.Plus size={18} strokeWidth={2.5} /> {adding ? 'Anuluj' : 'Dodaj osobę / ekipę'}
      </button>

      {adding && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              placeholder="Rola / zawód (np. Murarz, Elektryk)"
              value={role} onChange={e => setRole(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Firma / podwykonawca (opcjonalnie)"
              value={company} onChange={e => setCompany(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Liczba osób"
              type="number" min="1"
              value={count} onChange={e => setCount(e.target.value)}
              style={inputStyle}
            />
            <button onClick={save} disabled={saving || !role.trim()} style={{
              background: T.primary, color: T.primaryInk, border: 'none',
              borderRadius: 12, padding: '12px', fontWeight: 700, fontFamily: 'inherit',
              fontSize: 14, cursor: 'pointer', opacity: !role.trim() ? 0.5 : 1,
            }}>
              {saving ? 'Zapisuję…' : 'Zapisz'}
            </button>
          </div>
        </Card>
      )}

      {crew.length > 0 ? (
        <>
          <SectionLabel>Ekipa · {total} osób</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {crew.map(c => (
              <Card key={c.id} padded={false}>
                <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `color-mix(in oklab, ${T.primary} 18%, transparent)`,
                    color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 18,
                  }}>{c.count}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.role}</div>
                    <div style={{ fontSize: 11, color: T.textMid }}>
                      {c.company ?? 'Brak firmy'} · {new Date(c.recorded_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  {c.report_id && (
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: T.surfaceHi, color: T.textDim, fontWeight: 700 }}>
                      AUTO
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : !adding && (
        <EmptyState icon={<Icons.Users size={40} strokeWidth={1.5} />} title="Brak ekipy" sub="Nagraj raport głosowy lub dodaj ręcznie" />
      )}
    </>
  );
}

function MaterialsTab({ projectId, materials, onReload }: { projectId: string; materials: MaterialEntry[]; onReload: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [delivery, setDelivery] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('materials').insert({
      project_id: projectId, report_id: null,
      name: name.trim(), qty: qty.trim() || null, delivery: delivery.trim() || null,
    });
    setSaving(false);
    setName(''); setQty(''); setDelivery('');
    setAdding(false);
    onReload();
  };

  return (
    <>
      <button onClick={() => setAdding(v => !v)} style={{
        width: '100%', padding: '13px', marginBottom: 14,
        background: adding ? T.surface : T.primary,
        color: adding ? T.text : T.primaryInk,
        border: adding ? `1px solid ${T.line}` : 'none',
        borderRadius: 14, fontWeight: 700, fontFamily: 'inherit', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer',
      }}>
        <Icons.Plus size={18} strokeWidth={2.5} /> {adding ? 'Anuluj' : 'Dodaj materiał'}
      </button>

      {adding && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              placeholder="Nazwa materiału (np. Beton C25/30)"
              value={name} onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Ilość (np. 12 m3, 500 szt)"
              value={qty} onChange={e => setQty(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Dostawa (opcjonalnie, np. 25.04)"
              value={delivery} onChange={e => setDelivery(e.target.value)}
              style={inputStyle}
            />
            <button onClick={save} disabled={saving || !name.trim()} style={{
              background: T.primary, color: T.primaryInk, border: 'none',
              borderRadius: 12, padding: '12px', fontWeight: 700, fontFamily: 'inherit',
              fontSize: 14, cursor: 'pointer', opacity: !name.trim() ? 0.5 : 1,
            }}>
              {saving ? 'Zapisuję…' : 'Zapisz'}
            </button>
          </div>
        </Card>
      )}

      {materials.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {materials.map(m => (
            <Card key={m.id} padded={false}>
              <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `color-mix(in oklab, ${T.primary} 18%, transparent)`,
                  color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icons.Box size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: T.textMid }}>
                    {m.delivery ? `Dostawa: ${m.delivery}` : 'Brak terminu dostawy'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.qty && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: `color-mix(in oklab, ${T.primary} 18%, transparent)`,
                      color: T.primary, border: `1px solid color-mix(in oklab, ${T.primary} 40%, transparent)`,
                    }}>{m.qty}</span>
                  )}
                  {m.report_id && (
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: T.surfaceHi, color: T.textDim, fontWeight: 700 }}>
                      AUTO
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !adding && (
        <EmptyState icon={<Icons.Box size={40} strokeWidth={1.5} />} title="Brak materiałów" sub="Nagraj raport głosowy lub dodaj ręcznie" />
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  background: T.surfaceHi, border: `1px solid ${T.line}`, borderRadius: 12,
  padding: '12px 14px', color: T.text, fontSize: 14, fontFamily: 'inherit',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

function EmptyState({ icon, title, sub, action }: { icon: React.ReactNode; title: string; sub: string; action?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: 12, color: T.textDim }}>
      <div style={{ color: T.textDim }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, color: T.textDim, margin: 0, textAlign: 'center' }}>{sub}</p>
      {action && (
        <button style={{
          marginTop: 8, padding: '10px 20px', borderRadius: 12,
          background: T.surface, border: `1px solid ${T.line}`,
          color: T.primary, fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icons.Plus size={16} strokeWidth={2.5} /> {action}
        </button>
      )}
    </div>
  );
}
