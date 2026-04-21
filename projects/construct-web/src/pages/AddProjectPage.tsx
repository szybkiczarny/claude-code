import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export default function AddProjectPage({ onDone, onCancel }: Props) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [client, setClient] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !address.trim()) return;
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('projects').insert({
      name: name.trim(),
      address: address.trim(),
      client_name: client.trim() || null,
      status: 'active',
      manager_id: user?.id,
    });
    setLoading(false);
    if (error) setError(error.message);
    else onDone();
  };

  const inputCls = 'w-full bg-app-hi border border-app-line rounded-2xl px-4 py-3 text-sm text-app-text placeholder-app-dim focus:outline-none focus:ring-2 focus:ring-app-primary';

  return (
    <div className="flex flex-col flex-1 bg-app-bg">
      <div className="flex items-center gap-3 px-5 pt-14 pb-5 border-b border-app-line bg-app-surface">
        <button onClick={onCancel} className="text-app-primary font-medium text-sm min-h-[44px] flex items-center">Anuluj</button>
        <h1 className="flex-1 text-center text-lg font-bold text-app-text">Nowy projekt</h1>
        <button
          onClick={save}
          disabled={loading || !name || !address}
          className="text-app-primary font-semibold text-sm disabled:opacity-40 min-h-[44px] flex items-center"
        >
          {loading ? '...' : 'Zapisz'}
        </button>
      </div>

      <div className="px-5 pt-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-app-mid mb-1">Nazwa projektu *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Osiedle Zielona Górka"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-app-mid mb-1">Adres budowy *</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ul. Polna 12, Warszawa"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-app-mid mb-1">Klient / inwestor</label>
          <input
            type="text"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="opcjonalnie"
            className={inputCls}
          />
        </div>

        {error && <p className="text-sm text-app-danger bg-app-danger bg-opacity-10 border border-app-danger border-opacity-30 rounded-2xl px-4 py-3">{error}</p>}
      </div>
    </div>
  );
}
