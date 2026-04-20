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
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

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
      <p className="text-sm font-semibold text-gray-700">📬 Powiadomienia do wysłania</p>
      {notifications.map((notif, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{notif.recipient}</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
          </div>

          {sent[i] ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
              <span>✅</span> Wysłano na {emails[i]}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@podwykonawca.pl"
                value={emails[i] ?? ''}
                onChange={e => setEmails(em => ({ ...em, [i]: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => send(i, notif)}
                disabled={!emails[i]}
                className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 active:bg-blue-700 shrink-0"
              >
                Wyślij
              </button>
            </div>
          )}
          {errors[i] && <p className="text-xs text-red-500">{errors[i]}</p>}
        </div>
      ))}

      <button onClick={onDone} className="w-full text-gray-400 text-sm py-2">
        Pomiń i zakończ
      </button>
    </div>
  );
}
