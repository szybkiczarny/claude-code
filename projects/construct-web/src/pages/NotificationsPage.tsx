import { useState } from 'react';
import { sendDefectEmail } from '../lib/email';

interface Notification {
  recipient: string;
  message: string;
}

interface Defect {
  description: string;
  severity: string;
  location: string;
  deadline: string | null;
  action: string;
  subcontractor: string | null;
}

interface Props {
  notifications: Notification[];
  defects: Defect[];
  projectName: string;
  senderName: string;
  reportDate: string;
  onDone: () => void;
}

export default function NotificationsPage({ notifications, defects, projectName, senderName, reportDate, onDone }: Props) {
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [sent, setSent] = useState<Record<number, boolean>>({});
  const [errors] = useState<Record<number, string>>({});

  const send = (i: number, notif: Notification) => {
    const email = emails[i]?.trim();
    if (!email) return;
    const relatedDefects = defects.filter(d =>
      !d.subcontractor || d.subcontractor.toLowerCase().includes(notif.recipient.toLowerCase().split(' ')[0].toLowerCase())
    );
    sendDefectEmail({
      to: email,
      recipientName: notif.recipient,
      senderName,
      projectName,
      defects: relatedDefects.length > 0 ? relatedDefects : defects,
      message: notif.message,
      reportDate,
    });
    setSent(s => ({ ...s, [i]: true }));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      <p className="text-sm font-semibold text-app-mid">📬 Powiadomienia do wysłania</p>
      {notifications.map((notif, i) => (
        <div key={i} className="bg-app-surface border border-app-line rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-semibold text-app-text text-sm">{notif.recipient}</p>
            <p className="text-xs text-app-dim mt-0.5 line-clamp-2">{notif.message}</p>
          </div>

          {sent[i] ? (
            <div className="flex items-center gap-2 text-app-success text-sm font-semibold">
              <span>✅</span> Wysłano na {emails[i]}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@podwykonawca.pl"
                value={emails[i] ?? ''}
                onChange={e => setEmails(em => ({ ...em, [i]: e.target.value }))}
                className="flex-1 bg-app-hi border border-app-line rounded-xl px-3 py-2 text-sm text-app-text placeholder-app-dim focus:outline-none focus:ring-2 focus:ring-app-primary"
              />
              <button
                onClick={() => send(i, notif)}
                disabled={!emails[i]}
                className="bg-app-primary text-app-ink rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 active:opacity-80 shrink-0 min-h-[44px]"
              >
                Wyślij
              </button>
            </div>
          )}
          {errors[i] && <p className="text-xs text-app-danger">{errors[i]}</p>}
        </div>
      ))}

      <button onClick={onDone} className="w-full text-app-dim text-sm py-2">
        Pomiń i zakończ
      </button>
    </div>
  );
}
