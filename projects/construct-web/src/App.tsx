import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './lib/theme';
import type { User } from '@supabase/supabase-js';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import RecordingPage from './pages/RecordingPage';
import ReportsPage from './pages/ReportsPage';
import AddProjectPage from './pages/AddProjectPage';
import ReportDetailPage from './pages/ReportDetailPage';
import CameraPage from './pages/CameraPage';
import { Icons } from './components/Icons';

const T = {
  bg: '#0B1729', surface: '#142338', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F',
};

type Tab = 'projects' | 'record' | 'reports';
type Modal =
  | { type: 'add-project' }
  | { type: 'project-detail'; projectId: string; projectName: string }
  | { type: 'report-detail'; reportId: string }
  | { type: 'camera'; defectId: string; reportId: string }
  | { type: 'profile' }
  | null;

function TabBar({ current, onChange }: { current: Tab; onChange: (t: Tab) => void }) {
  const recording = current === 'record';

  return (
    <nav style={{
      flexShrink: 0, background: T.surface, borderTop: `1px solid ${T.line}`,
      display: 'flex', position: 'relative', overflow: 'visible',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* notch behind FAB */}
      <svg width="100%" height="28" viewBox="0 0 412 28" preserveAspectRatio="none"
        style={{ display: 'block', marginTop: -28, position: 'absolute', top: 0, left: 0 }}>
        <path d="M0 28 L0 4 L146 4 C160 4 160 28 206 28 C252 28 252 4 266 4 L412 4 L412 28 Z"
          fill={T.surface} stroke={T.line} strokeWidth="1" />
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', width: '100%', marginTop: 4, position: 'relative' }}>

        {/* Projekty */}
        <button onClick={() => onChange('projects')} style={{
          background: 'transparent', border: 0, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '10px 4px', color: current === 'projects' ? T.primary : T.textMid, fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Icons.Folder size={26} strokeWidth={current === 'projects' ? 2.4 : 2} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>Projekty</span>
        </button>

        {/* FAB — Nagraj */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <button onClick={() => onChange('record')} style={{
            width: 72, height: 72, borderRadius: '50%',
            background: recording
              ? `linear-gradient(180deg, ${T.danger} 0%, color-mix(in oklab, ${T.danger} 75%, #000) 100%)`
              : `linear-gradient(180deg, ${T.primary} 0%, color-mix(in oklab, ${T.primary} 75%, #000) 100%)`,
            border: `4px solid ${T.surface}`,
            marginTop: -30,
            color: recording ? '#fff' : T.primaryInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: recording
              ? `0 10px 24px color-mix(in oklab, ${T.danger} 40%, transparent)`
              : `0 10px 24px color-mix(in oklab, ${T.primary} 40%, transparent)`,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <Icons.Mic size={32} strokeWidth={2.2} />
          </button>
        </div>

        {/* Raporty */}
        <button onClick={() => onChange('reports')} style={{
          background: 'transparent', border: 0, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          padding: '10px 4px', color: current === 'reports' ? T.primary : T.textMid, fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Icons.Doc size={26} strokeWidth={current === 'reports' ? 2.4 : 2} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>Raporty</span>
        </button>
      </div>
    </nav>
  );
}

function AppInner() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('projects');
  const [project, setProject] = useState<{ id: string; name: string } | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [projectsKey, setProjectsKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <div className="w-10 h-10 border-4 border-app-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <AuthPage />;

  // Full-screen modals
  if (modal?.type === 'profile') return (
    <ProfilePage
      user={user}
      onBack={() => setModal(null)}
      onSaved={() => setModal(null)}
    />
  );

  if (modal?.type === 'add-project') return (
    <AddProjectPage
      onDone={() => { setModal(null); setProjectsKey(k => k + 1); }}
      onCancel={() => setModal(null)}
    />
  );

  if (modal?.type === 'project-detail') return (
    <ProjectDetailPage
      projectId={modal.projectId}
      onBack={() => setModal(null)}
      onOpenReport={(id) => setModal({ type: 'report-detail', reportId: id })}
      onRecord={() => {
        setProject({ id: modal.projectId, name: modal.projectName });
        setModal(null);
        setTab('record');
      }}
    />
  );

  if (modal?.type === 'report-detail') return (
    <ReportDetailPage
      reportId={modal.reportId}
      onBack={() => setModal(null)}
      onAddPhoto={(defectId) => setModal({ type: 'camera', defectId, reportId: modal.reportId })}
    />
  );

  if (modal?.type === 'camera') return (
    <CameraPage
      defectId={modal.defectId}
      onDone={() => setModal({ type: 'report-detail', reportId: modal.reportId })}
      onCancel={() => setModal({ type: 'report-detail', reportId: modal.reportId })}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: T.bg }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {tab === 'projects' && (
          <ProjectsPage
            key={projectsKey}
            displayName={user.user_metadata?.full_name ?? null}
            onDetail={(id, name) => setModal({ type: 'project-detail', projectId: id, projectName: name })}
            onAdd={() => setModal({ type: 'add-project' })}
            onProfile={() => setModal({ type: 'profile' })}
          />
        )}
        {tab === 'record' && (
          <RecordingPage
            projectId={project?.id ?? ''}
            projectName={project?.name ?? ''}
            onOpenReport={(id) => setModal({ type: 'report-detail', reportId: id })}
          />
        )}
        {tab === 'reports' && (
          <ReportsPage
            projectId={project?.id ?? ''}
            projectName={project?.name ?? ''}
            onOpenReport={(id) => setModal({ type: 'report-detail', reportId: id })}
          />
        )}
      </div>
      <TabBar current={tab} onChange={setTab} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
