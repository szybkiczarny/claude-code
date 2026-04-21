import type { CSSProperties, ReactNode } from 'react';
import React from 'react';
import { Icons } from './Icons';

// Tokens (static — matches DEFAULT_TOKENS from Claude Design)
export const T = {
  bg:         '#0B1729',
  surface:    '#142338',
  surfaceHi:  '#1C2F49',
  line:       '#24385A',
  text:       '#F2F5FA',
  textMid:    '#9AA9C2',
  textDim:    '#667690',
  primary:    '#F6B93B',
  primaryInk: '#1A1205',
  danger:     '#FF5A5F',
  success:    '#3DDC97',
  info:       '#5AA9FF',
  radius:     16,
  cardShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 20px rgba(0,0,0,0.25)',
} as const;

export function IconBtn({
  children, onClick, bg, color, size = 44, style,
}: {
  children: ReactNode; onClick?: () => void;
  bg?: string; color?: string; size?: number; style?: CSSProperties;
}) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: size / 2,
      background: bg ?? 'rgba(255,255,255,0.06)',
      color: color ?? T.text,
      border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0, padding: 0,
      WebkitTapHighlightColor: 'transparent',
      ...style,
    }}>
      {children}
    </button>
  );
}

export function Chip({
  children, active, onClick, icon,
}: {
  children: ReactNode; active: boolean; onClick: () => void; icon?: ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      height: 36, padding: '0 14px', borderRadius: 18,
      background: active ? T.primary : 'rgba(255,255,255,0.05)',
      color: active ? T.primaryInk : T.textMid,
      border: active ? 'none' : `1px solid ${T.line}`,
      fontSize: 14, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      cursor: 'pointer', whiteSpace: 'nowrap',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {icon}{children}
    </button>
  );
}

export function Badge({
  children, color, bg, style,
}: {
  children: ReactNode; color?: string; bg?: string; style?: CSSProperties;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6,
      background: bg ?? 'rgba(255,255,255,0.08)',
      color: color ?? T.textMid,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
      textTransform: 'uppercase', lineHeight: 1.2,
      ...style,
    }}>
      {children}
    </span>
  );
}

export function Card({
  children, onClick, style, padded = true,
}: {
  children: ReactNode; onClick?: () => void; style?: CSSProperties; padded?: boolean;
}) {
  return (
    <div onClick={onClick} style={{
      background: T.surface,
      border: `1px solid ${T.line}`,
      borderRadius: T.radius,
      padding: padded ? 16 : 0,
      boxShadow: T.cardShadow,
      cursor: onClick ? 'pointer' : 'default',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const h = [...(name || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `oklch(0.55 0.12 ${h})`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.4), fontWeight: 700, color: '#fff',
      flexShrink: 0, border: `1px solid ${T.bg}`,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

export function PhotoPlaceholder({ w = '100%', h = 80, label, radius = 10 }: {
  w?: number | string; h?: number; label?: string; radius?: number;
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, flexShrink: 0,
      background: `repeating-linear-gradient(135deg, ${T.surfaceHi} 0 8px, ${T.surface} 8px 16px)`,
      border: `1px solid ${T.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: T.textDim, fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace',
      letterSpacing: 0.5,
    }}>
      {label ?? 'PHOTO'}
    </div>
  );
}

export function Progress({ value, color = T.primary, height = 6 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{ width: '100%', height, borderRadius: height / 2, background: T.line, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.round(value * 100)}%`, height: '100%',
        background: color, borderRadius: height / 2,
        transition: 'width .4s ease',
      }} />
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const color = status === 'open' ? T.danger
    : status === 'in_progress' ? T.primary
    : status === 'resolved' ? T.success
    : T.textDim;
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

export function PriorityBar({ level }: { level: string }) {
  const n = level === 'critical' || level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  const color = level === 'critical' || level === 'high' ? T.danger : level === 'medium' ? T.primary : T.success;
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ width: 3, height: 4 + i * 2, background: i <= n ? color : T.line, borderRadius: 1 }} />
      ))}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700, padding: '8px 0 10px' }}>
      {children}
    </div>
  );
}

export function MiniStat({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: color ?? T.textMid }}>
        {icon}
        <span style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: -0.3 }}>{value}</span>
      </div>
      <span style={{ fontSize: 11, color: T.textMid, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
    </div>
  );
}

export function ScreenHeader({
  onBack, subtitle, title, right,
}: {
  onBack?: () => void; subtitle?: string; title: string; right?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0 }}>
      {onBack && (
        <button onClick={onBack} style={{
          width: 44, height: 44, borderRadius: 12, background: T.surface, border: `1px solid ${T.line}`,
          color: T.text, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Icons.ChevLeft size={22} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <div style={{ fontSize: 11, color: T.textMid, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>
            {subtitle}
          </div>
        )}
        <div style={{
          fontSize: subtitle ? 22 : 28, fontWeight: 700, letterSpacing: -0.4, color: T.text, lineHeight: 1.15,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

export function TradeIcon({ trade, size = 18 }: { trade: string; size?: number }) {
  const map: Record<string, { Icon: React.ElementType; color: string }> = {
    electrical: { Icon: Icons.Zap,    color: '#F5B800' },
    plumbing:   { Icon: Icons.Drop,   color: '#5BC0EB' },
    hvac:       { Icon: Icons.Cloud,  color: '#9AB0CC' },
    concrete:   { Icon: Icons.Box,    color: '#D4A574' },
    carpentry:  { Icon: Icons.Hammer, color: '#FF7A45' },
    safety:     { Icon: Icons.Shield, color: '#22C08A' },
  };
  const entry = map[trade] ?? { Icon: Icons.Box, color: T.textMid };
  const { Icon, color } = entry;
  return (
    <span style={{
      width: size + 10, height: size + 10, borderRadius: 8,
      background: `color-mix(in oklab, ${color} 18%, transparent)`,
      color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}

export function PhotoThumb({
  id, kind = 'crack', size = 56, radius = 10, watermark = false,
}: {
  id: string; kind?: string; size?: number; radius?: number; watermark?: boolean;
}) {
  const palettes: Record<string, string[]> = {
    crack:    ['#3a3024', '#6b5a45', '#a48763'],
    cable:    ['#1a1a1a', '#3a3020', '#6b5a2a'],
    bathroom: ['#3a4a5a', '#6b8ba5', '#b8d0e0'],
    vent:     ['#2a2a30', '#4a5060', '#8a95a5'],
    door:     ['#2a1f17', '#5a3a24', '#8a5a3a'],
    panel:    ['#1a2030', '#3a4560', '#6b7a95'],
  };
  const p = palettes[kind] ?? ['#30383f', '#4a5560', '#6b7885'];
  const hash = (id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = (hash % 90) + 15;
  const nId = `n-${id}`;
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: `linear-gradient(${angle}deg, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`,
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id={nId}>
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed={hash} />
            <feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.9  0 0 0 0 0.9  0 0 0 0.12 0" />
          </filter>
        </defs>
        <rect width={size} height={size} filter={`url(#${nId})`} />
        {kind === 'crack' && (
          <path
            d={`M${size * 0.2} ${size * 0.15} Q ${size * 0.35} ${size * 0.45} ${size * 0.45} ${size * 0.55} T ${size * 0.85} ${size * 0.9}`}
            stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" fill="none"
          />
        )}
        {kind === 'cable' && (
          <>
            <circle cx={size * 0.35} cy={size * 0.5} r={size * 0.18} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
            <circle cx={size * 0.65} cy={size * 0.5} r={size * 0.12} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
          </>
        )}
        {kind === 'bathroom' && (
          <rect x={size * 0.2} y={size * 0.55} width={size * 0.6} height={size * 0.3} fill="rgba(255,255,255,0.15)" rx={2} />
        )}
      </svg>
      {watermark && size >= 60 && (
        <div style={{
          position: 'absolute', bottom: 4, left: 4, right: 4,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: Math.max(7, size * 0.085), lineHeight: 1.1,
          color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 2px rgba(0,0,0,0.85)',
          fontWeight: 600, letterSpacing: 0.2, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          <span>20.04.26 · 09:12</span>
          <span>52.2319°N 21.0067°E</span>
        </div>
      )}
    </div>
  );
}

export function StatusLabelChip({ status, label }: { status: string; label: string }) {
  const map: Record<string, { bg: string; color: string; bd: string }> = {
    open:       { bg: `color-mix(in oklab, ${T.danger} 15%, transparent)`,   color: T.danger,   bd: `color-mix(in oklab, ${T.danger} 40%, transparent)` },
    inProgress: { bg: `color-mix(in oklab, ${T.primary} 15%, transparent)`,  color: T.primary,  bd: `color-mix(in oklab, ${T.primary} 40%, transparent)` },
    in_progress:{ bg: `color-mix(in oklab, ${T.primary} 15%, transparent)`,  color: T.primary,  bd: `color-mix(in oklab, ${T.primary} 40%, transparent)` },
    review:     { bg: 'color-mix(in oklab, #A78BFA 15%, transparent)',        color: '#A78BFA',  bd: 'color-mix(in oklab, #A78BFA 40%, transparent)' },
    closed:     { bg: `color-mix(in oklab, ${T.success} 15%, transparent)`,  color: T.success,  bd: `color-mix(in oklab, ${T.success} 40%, transparent)` },
    resolved:   { bg: `color-mix(in oklab, ${T.success} 15%, transparent)`,  color: T.success,  bd: `color-mix(in oklab, ${T.success} 40%, transparent)` },
  };
  const s = map[status] ?? map.open;
  const dotColor = status === 'review' ? '#A78BFA' : s.color;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', borderRadius: 999,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.2, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      {label}
    </span>
  );
}

export function OfflineBadge({ children }: { children: ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 10,
      background: `color-mix(in oklab, ${T.primary} 14%, transparent)`,
      border: `1px solid color-mix(in oklab, ${T.primary} 35%, transparent)`,
      color: T.primary, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/>
        <path d="M5 12.5a10 10 0 0 1 5-2.7"/><path d="M14 10.2a10 10 0 0 1 5 2.3"/>
        <path d="M2 8.8A15 15 0 0 1 6.5 6.5"/><path d="M12 20v.01"/>
      </svg>
      {children}
    </div>
  );
}

export function TouchRow({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      width: '100%', minHeight: 48, padding: '12px 16px',
      background: 'transparent', border: 0, color: 'inherit',
      textAlign: 'left', cursor: 'pointer',
      WebkitTapHighlightColor: 'transparent',
      ...style,
    }}>{children}</button>
  );
}

// Utility: priority → colors
export function priColor(p: 'high' | 'med' | 'low') {
  return {
    high: { bg: 'rgba(255,90,95,0.14)',  fg: '#FF8086',  dot: T.danger },
    med:  { bg: 'rgba(246,185,59,0.14)', fg: T.primary,  dot: T.primary },
    low:  { bg: 'rgba(90,169,255,0.14)', fg: T.info,     dot: T.info },
  }[p];
}

// Utility: defect status → colors
export function statusColor(s: 'open' | 'inprog' | 'closed') {
  return {
    open:   { bg: 'rgba(255,90,95,0.14)',  fg: '#FF8086',  label: 'Otwarta' },
    inprog: { bg: 'rgba(246,185,59,0.14)', fg: T.primary,  label: 'W toku' },
    closed: { bg: 'rgba(61,220,151,0.14)', fg: T.success,  label: 'Zamknięta' },
  }[s];
}
