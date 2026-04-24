import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from './Icons';
import { T } from './UI';
import type { Contractor, Defect } from '../types';

const inputStyle: React.CSSProperties = {
  background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12,
  padding: '12px 14px', color: T.text, fontSize: 14, fontFamily: 'inherit',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

interface Props {
  open: boolean;
  onClose: () => void;
  defect: Defect | null;
  onAssigned: () => void;
}

export function DelegateSheet({ open, onClose, defect, onAssigned }: Props) {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selected, setSelected] = useState<Contractor | null>(null);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setDeadline(defect?.deadline ?? '');
    setAdding(false);
    supabase.from('contractors').select('*').order('name').then(({ data }) => {
      if (data) {
        setContractors(data);
        if (defect?.subcontractor) {
          const match = data.find(c => c.name === defect.subcontractor);
          if (match) setSelected(match);
        }
      }
    });
  }, [open]);

  if (!open || !defect) return null;

  const saveContractor = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('contractors').insert({
      name: newName.trim(),
      phone: newPhone.trim() || null,
      email: newEmail.trim() || null,
      manager_id: user!.id,
    }).select().single();
    if (data) {
      setContractors(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(data);
    }
    setAdding(false);
    setNewName(''); setNewPhone(''); setNewEmail('');
  };

  const assign = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from('defects').update({
      subcontractor: selected.name,
      deadline: deadline || null,
      status: 'in_progress',
    }).eq('id', defect.id);
    setSaving(false);
    onAssigned();
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: T.surface,
        borderTop: `1px solid ${T.line}`, borderRadius: '18px 18px 0 0',
        padding: '18px 20px 36px', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.line, margin: '0 auto 14px' }} />

        <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
          Przydziel usterkę
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 18, lineHeight: 1.3 }}>
          {defect.description}
        </div>

        {/* Contractor list */}
        <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>
          Wykonawca
        </div>

        {contractors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {contractors.map(c => {
              const active = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelected(active ? null : c)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                  background: active ? `color-mix(in oklab, ${T.primary} 15%, transparent)` : T.bg,
                  border: `1px solid ${active ? T.primary : T.line}`,
                  color: T.text, fontFamily: 'inherit', textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: active ? T.primary : T.surfaceHi,
                    color: active ? T.primaryInk : T.textMid,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                    {c.phone && <div style={{ fontSize: 11, color: T.textMid }}>{c.phone}</div>}
                  </div>
                  {active && <Icons.Check size={18} style={{ color: T.primary, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}

        {!adding ? (
          <button onClick={() => setAdding(true)} style={{
            width: '100%', padding: '10px', borderRadius: 12,
            background: T.bg, border: `1px dashed ${T.line}`,
            color: T.textMid, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, marginBottom: 18,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <Icons.Plus size={16} strokeWidth={2.5} /> Dodaj wykonawcę
          </button>
        ) : (
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Nazwa firmy / wykonawcy *" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
            <input placeholder="Telefon (opcjonalnie)" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={inputStyle} />
            <input placeholder="E-mail (opcjonalnie)" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAdding(false)} style={{
                flex: 1, padding: '12px', borderRadius: 12, background: T.bg,
                color: T.text, border: `1px solid ${T.line}`, fontWeight: 600,
                fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
              }}>Anuluj</button>
              <button onClick={saveContractor} disabled={!newName.trim()} style={{
                flex: 2, padding: '12px', borderRadius: 12, background: T.primary,
                color: T.primaryInk, border: 'none', fontWeight: 700,
                fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
                opacity: !newName.trim() ? 0.5 : 1,
              }}>Zapisz</button>
            </div>
          </div>
        )}

        {/* Deadline */}
        <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>
          Termin (opcjonalnie)
        </div>
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          style={{ ...inputStyle, marginBottom: 20, colorScheme: 'dark' }}
        />

        <button onClick={assign} disabled={!selected || saving} style={{
          width: '100%', padding: '15px', borderRadius: 14,
          background: !selected ? T.line : T.primary,
          color: !selected ? T.textMid : T.primaryInk,
          border: 'none', fontWeight: 700, fontFamily: 'inherit', fontSize: 15,
          cursor: !selected || saving ? 'default' : 'pointer',
        }}>
          {saving ? 'Przydzielam…' : selected ? `Przydziel → ${selected.name}` : 'Wybierz wykonawcę'}
        </button>
      </div>
    </div>
  );
}
