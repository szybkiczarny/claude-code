import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

const signOut = () => supabase.auth.signOut();

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktywny',
  completed: 'Zakończony',
  paused: 'Wstrzymany',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-500',
  paused: 'bg-amber-100 text-amber-700',
};

interface Props {
  onSelect: (id: string, name: string) => void;
  onAdd: () => void;
  selectedId: string | null;
}

export default function ProjectsPage({ onSelect, onAdd, selectedId }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setProjects(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Projekty</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onAdd}
              className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-light shadow-md active:bg-blue-700"
            >
              +
            </button>
            <button
              onClick={signOut}
              className="text-gray-400 text-xs border border-gray-200 rounded-full px-3 py-1.5 active:bg-gray-50"
            >
              Wyloguj
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          {loading ? '...' : `${projects.length} projektów`}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center py-20 gap-3">
            <span className="text-5xl">🏗️</span>
            <p className="text-lg font-semibold text-gray-700">Brak projektów</p>
            <p className="text-sm text-gray-400 text-center">Kliknij + żeby dodać pierwszy projekt</p>
          </div>
        )}

        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id, p.name)}
            className={`w-full text-left bg-white rounded-2xl p-4 border-2 transition-all shadow-sm active:scale-[0.98] ${
              selectedId === p.id ? 'border-blue-500 shadow-blue-100 shadow-md' : 'border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="font-semibold text-gray-900 text-base leading-snug">{p.name}</span>
              <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[p.status]}`}>
                {STATUS_LABEL[p.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <span>📍</span> {p.address}
            </p>
            {p.client_name && (
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                <span>👤</span> {p.client_name}
              </p>
            )}
            {selectedId === p.id && (
              <div className="mt-3 pt-3 border-t border-blue-100">
                <p className="text-xs font-semibold text-blue-600">✓ Wybrany projekt</p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
