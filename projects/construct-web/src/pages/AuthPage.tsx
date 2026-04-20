import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setDone(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 bg-white">
      <div className="text-5xl mb-4">📧</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Sprawdź email</h2>
      <p className="text-sm text-gray-500 text-center">
        Wysłaliśmy link potwierdzający na <strong>{email}</strong>.<br />
        Kliknij go, żeby aktywować konto.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="bg-blue-600 px-6 pt-16 pb-10">
        <div className="text-4xl mb-3">🏗️</div>
        <h1 className="text-2xl font-bold text-white">ConstructAI</h1>
        <p className="text-blue-200 text-sm mt-1">Raporty budowlane z AI</p>
      </div>

      <div className="flex-1 px-6 pt-8">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {m === 'login' ? 'Logowanie' : 'Rejestracja'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imię i nazwisko</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan Kowalski"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@firma.pl"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 text-white rounded-xl py-4 font-semibold text-base disabled:opacity-50 active:bg-blue-700"
          >
            {loading ? '...' : mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
          </button>
        </div>
      </div>
    </div>
  );
}
