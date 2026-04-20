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

  return (
    <div className="flex flex-col flex-1 bg-white">
      <div className="flex items-center gap-3 px-5 pt-14 pb-5 border-b border-gray-100">
        <button onClick={onCancel} className="text-blue-600 font-medium text-sm">Anuluj</button>
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900">Nowy projekt</h1>
        <button
          onClick={save}
          disabled={loading || !name || !address}
          className="text-blue-600 font-semibold text-sm disabled:opacity-40"
        >
          {loading ? '...' : 'Zapisz'}
        </button>
      </div>

      <div className="px-5 pt-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nazwa projektu *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Osiedle Zielona Górka"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Adres budowy *</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ul. Polna 12, Warszawa"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Klient / inwestor</label>
          <input
            type="text"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="opcjonalnie"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      </div>
    </div>
  );
}
