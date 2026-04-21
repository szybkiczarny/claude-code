import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { Card } from '../components/UI';

const T = {
  bg: '#0B1729', surface: '#142338', surfaceHi: '#1C2F49', line: '#24385A',
  text: '#F2F5FA', textMid: '#9AA9C2', textDim: '#667690',
  primary: '#F6B93B', primaryInk: '#1A1205', danger: '#FF5A5F',
};

interface Props {
  user: User;
  onBack: () => void;
  onSaved: () => void;
}

export default function ProfilePage({ user, onBack, onSaved }: Props) {
  const [name, setName] = useState<string>(user.user_metadata?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0, 2).join('')
    : (user.email?.[0]?.toUpperCase() ?? '?');

  const hue = [...(user.id ?? 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const avatarBg = `oklch(0.55 0.12 ${hue})`;

  const save = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px' }}>
        <button onClick={onBack} style={{
          width: 44, height: 44, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`,
          color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.ChevLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>USTAWIENIA</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, color: T.text }}>Profil</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 8px' }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%', background: avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 700, color: '#fff',
            border: `3px solid ${T.line}`,
          }}>{initials}</div>
        </div>

        {/* Imię */}
        <Card>
          <div style={{ marginBottom: 8, fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
            Imię i nazwisko
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jan Kowalski"
            style={{
              width: '100%', background: T.surfaceHi, border: `1px solid ${T.line}`,
              borderRadius: 12, padding: '12px 14px', color: T.text, fontSize: 16,
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </Card>

        {/* Email (readonly) */}
        <Card>
          <div style={{ marginBottom: 8, fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
            Email
          </div>
          <div style={{ fontSize: 15, color: T.textDim, fontWeight: 500 }}>{user.email}</div>
        </Card>

        {error && (
          <div style={{
            padding: '12px 14px', borderRadius: 12, fontSize: 13, color: T.danger, fontWeight: 600,
            background: `color-mix(in oklab, ${T.danger} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${T.danger} 35%, transparent)`,
          }}>{error}</div>
        )}

        {/* Zapisz */}
        <button onClick={save} disabled={saving} style={{
          width: '100%', padding: 16, borderRadius: 14, border: 'none',
          background: T.primary, color: T.primaryInk, fontWeight: 700, fontSize: 16,
          fontFamily: 'inherit', cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Zapisywanie…' : 'Zapisz'}
        </button>

        {/* Wyloguj */}
        <button onClick={() => supabase.auth.signOut()} style={{
          width: '100%', padding: 16, borderRadius: 14,
          background: 'transparent', border: `1px solid ${T.line}`,
          color: T.danger, fontWeight: 600, fontSize: 15,
          fontFamily: 'inherit', cursor: 'pointer',
        }}>
          Wyloguj się
        </button>
      </div>
    </div>
  );
}
