import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import AuthPage from './pages/AuthPage';
import ProjectsPage from './pages/ProjectsPage';
import RecordingPage from './pages/RecordingPage';
import ReportsPage from './pages/ReportsPage';
import AddProjectPage from './pages/AddProjectPage';
import ReportDetailPage from './pages/ReportDetailPage';
import CameraPage from './pages/CameraPage';

type Tab = 'projects' | 'record' | 'reports';
type Modal =
  | { type: 'add-project' }
  | { type: 'report-detail'; reportId: string }
  | { type: 'camera'; defectId: string; reportId: string }
  | null;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'projects', label: 'Projekty', icon: '🏗️' },
  { id: 'record',   label: 'Nagraj',   icon: '🎙️' },
  { id: 'reports',  label: 'Raporty',  icon: '📋' },
];

export default function App() {
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
    <div className="flex flex-col flex-1 items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <AuthPage />;

  // Full-screen modals (no bottom nav)
  if (modal?.type === 'add-project') return (
    <AddProjectPage
      onDone={() => { setModal(null); setProjectsKey(k => k + 1); }}
      onCancel={() => setModal(null)}
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
    <div className="flex flex-col flex-1" style={{ height: '100dvh' }}>
      <div className="flex-1 overflow-auto min-h-0">
        {tab === 'projects' && (
          <ProjectsPage
            key={projectsKey}
            onSelect={(id, name) => { setProject({ id, name }); setTab('record'); }}
            selectedId={project?.id ?? null}
            onAdd={() => setModal({ type: 'add-project' })}
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

      <nav className="shrink-0 bg-white border-t border-gray-100 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 relative ${
              tab === t.id ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            {tab === t.id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
            )}
            <span className="text-2xl leading-none">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
