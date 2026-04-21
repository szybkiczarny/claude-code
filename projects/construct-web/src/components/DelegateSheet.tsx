import { Icons } from './Icons';
import { T } from './UI';
import type { Defect } from '../types';

function AvatarSm({ initials }: { initials: string }) {
  const palette = ['#F5B800', '#5BC0EB', '#22C08A', '#FF7A45', '#A78BFA', '#FB7185'];
  const hash = initials.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: palette[hash % palette.length], color: '#0B1628',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 13, flexShrink: 0,
    }}>{initials}</div>
  );
}

const OPTIONS = [
  { id: 'whatsapp', label: 'WhatsApp',    color: '#25D366', Icon: Icons.Msg   },
  { id: 'sms',      label: 'SMS',         color: '#5BC0EB', Icon: Icons.SmsSq },
  { id: 'email',    label: 'E-mail',      color: '#F5B800', Icon: Icons.Mail  },
  { id: 'copy',     label: 'Kopiuj link', color: '#A78BFA', Icon: Icons.Link  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  defect: Defect | null;
}

export function DelegateSheet({ open, onClose, defect }: Props) {
  if (!open || !defect) return null;

  const initials = (defect.subcontractor ?? '?')
    .split(' ').map((w: string) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: T.surface,
          borderTop: `1px solid ${T.line}`, borderRadius: '18px 18px 0 0',
          padding: '18px 20px 28px',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: T.line, margin: '0 auto 14px' }} />

        <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
          Deleguj · {defect.id}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 14, lineHeight: 1.3 }}>
          {defect.description}
        </div>

        {/* Assignee row */}
        <div style={{
          padding: '10px 12px', background: T.bg,
          border: `1px solid ${T.line}`, borderRadius: 12, marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AvatarSm initials={initials} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
              {defect.subcontractor ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: T.textMid }}>
              {defect.deadline ? `Termin: ${defect.deadline}` : 'Brak terminu'}
            </div>
          </div>
        </div>

        {/* Send via */}
        <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>
          Wyślij przez
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {OPTIONS.map(({ id, label, color, Icon }) => (
            <button key={id} onClick={onClose} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '14px 4px', cursor: 'pointer', minHeight: 80,
              background: T.bg, border: `1px solid ${T.line}`,
              borderRadius: 14, color: T.text, fontFamily: 'inherit',
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 12,
                background: `color-mix(in oklab, ${color} 20%, transparent)`,
                color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={22} />
              </span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Message preview */}
        <div style={{
          padding: '12px 14px', background: T.bg,
          border: `1px dashed ${T.line}`, borderRadius: 12,
          fontSize: 11, color: T.textMid, lineHeight: 1.5,
        }}>
          <span style={{ color: T.primary, fontWeight: 700 }}>Podgląd wiadomości:</span><br />
          „{defect.description}. {defect.location_desc ? `Lokalizacja: ${defect.location_desc}. ` : ''}
          {defect.deadline ? `Termin: ${defect.deadline}.` : ''}
          Link do usterki: buildsite.app/d/{defect.id}"
        </div>
      </div>
    </div>
  );
}
