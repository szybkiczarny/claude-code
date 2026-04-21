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
    <div className="flex flex-col flex-1 items-center justify-center px-6 bg-app-bg">
      <div className="text-5xl mb-4">📧</div>
      <h2 className="text-xl font-bold text-app-text mb-2">Sprawdź email</h2>
      <p className="text-sm text-app-mid text-center">
        Wysłaliśmy link potwierdzający na <strong className="text-app-text">{email}</strong>.<br />
        Kliknij go, żeby aktywować konto.
      </p>
    </div>
  );

  const inputCls = 'w-full bg-app-hi border border-app-line rounded-2xl px-4 py-3 text-sm text-app-text placeholder-app-dim focus:outline-none focus:ring-2 focus:ring-app-primary';

  return (
    <div className="flex flex-col flex-1 bg-app-bg">
      <div className="bg-app-surface px-6 pt-16 pb-10 border-b border-app-line">
        <div className="text-4xl mb-3">🏗️</div>
        <h1 className="text-2xl font-bold text-app-text">ConstructAI</h1>
        <p className="text-app-mid text-sm mt-1">Raporty budowlane z AI</p>
      </div>

      <div className="flex-1 px-6 pt-8">
        <div className="flex bg-app-hi rounded-2xl p-1 mb-6">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === m ? 'bg-app-surface text-app-text shadow-sm' : 'text-app-dim'
              }`}
            >
              {m === 'login' ? 'Logowanie' : 'Rejestracja'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-app-mid mb-1">Imię i nazwisko</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Kowalski" className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-app-mid mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@firma.pl" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-app-mid mb-1">Hasło</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
          </div>

          {error && (
            <p className="text-sm text-app-danger bg-app-danger bg-opacity-10 border border-app-danger border-opacity-30 rounded-2xl px-4 py-3">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={loading || !email || !password}
            className="w-full bg-app-primary text-app-ink rounded-2xl py-4 font-semibold text-base disabled:opacity-40 active:opacity-80 min-h-[56px]"
          >
            {loading ? '...' : mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}
          </button>
        </div>
      </div>
    </div>
  );
}
