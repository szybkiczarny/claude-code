import type { Report, Defect } from '../types';

const SEV_LABEL: Record<string, string> = {
  low: 'Niska', medium: 'Średnia', high: 'Wysoka', critical: 'KRYTYCZNA',
};
const SEV_COLOR: Record<string, string> = {
  low: '#3b82f6', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
};

export function printReport(
  report: Report & { location_desc?: string | null },
  defects: Defect[],
  projectName: string,
) {
  const date = new Date(report.created_at).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const time = new Date(report.created_at).toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit',
  });

  const defectsHtml = defects.length === 0
    ? '<p style="color:#6b7280">Brak usterek</p>'
    : defects.map((d, i) => `
      <div style="border-left:4px solid ${SEV_COLOR[d.severity] ?? '#e5e7eb'};padding:10px 14px;margin-bottom:10px;background:#f9fafb;border-radius:4px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <b style="font-size:13px">${i + 1}. ${d.description}</b>
          <span style="background:${SEV_COLOR[d.severity] ?? '#6b7280'};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap">${SEV_LABEL[d.severity] ?? d.severity}</span>
        </div>
        <div style="margin-top:6px;font-size:12px;color:#6b7280;display:flex;flex-wrap:wrap;gap:12px">
          ${d.location_desc ? `<span>📍 ${d.location_desc}</span>` : ''}
          ${d.subcontractor ? `<span>🏢 ${d.subcontractor}</span>` : ''}
          ${d.deadline ? `<span style="color:#f97316;font-weight:600">⏰ Termin: ${d.deadline}</span>` : ''}
        </div>
        ${d.action ? `<p style="margin:6px 0 0;font-size:12px;color:#374151;font-style:italic">${d.action}</p>` : ''}
      </div>
    `).join('');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8"/>
  <title>Raport inspekcji – ${date}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;font-size:13px;color:#1f2937;padding:32px;max-width:800px;margin:0 auto}
    @media print{body{padding:0}}
    h1{font-size:22px;color:#2563eb}
    .sub{font-size:12px;color:#6b7280;margin-top:2px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #2563eb;margin-bottom:20px}
    .section{margin-bottom:20px}
    .section-title{font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
    .summary{background:#eff6ff;border-left:3px solid #2563eb;padding:12px;border-radius:4px;font-size:13px;line-height:1.6;color:#1e40af}
    .meta{display:flex;gap:20px;margin-bottom:16px;font-size:12px}
    .meta span{color:#6b7280} .meta b{color:#111827}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between}
    .print-btn{position:fixed;bottom:20px;right:20px;background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    @media print{.print-btn{display:none}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>ConstructAI</h1>
      <div class="sub">Raport z inspekcji budowlanej</div>
    </div>
    <div style="text-align:right">
      <div style="font-weight:700">${date}, ${time}</div>
      <div class="sub">Projekt: ${projectName || '—'}</div>
    </div>
  </div>

  <div class="meta">
    ${report.location_desc ? `<div><span>Lokalizacja: </span><b>${report.location_desc}</b></div>` : ''}
    ${report.weather ? `<div><span>Pogoda: </span><b>${report.weather}</b></div>` : ''}
  </div>

  ${report.ai_summary ? `
  <div class="section">
    <div class="section-title">Podsumowanie</div>
    <div class="summary">${report.ai_summary}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Usterki (${defects.length})</div>
    ${defectsHtml}
  </div>

  ${report.transcript ? `
  <div class="section">
    <div class="section-title">Transkrypcja</div>
    <p style="font-size:12px;color:#6b7280;line-height:1.6">${report.transcript}</p>
  </div>` : ''}

  <div class="footer">
    <span>ConstructAI — wygenerowano automatycznie</span>
    <span>${new Date().toLocaleString('pl-PL')}</span>
  </div>

  <button class="print-btn" onclick="window.print()">Drukuj / Zapisz PDF</button>
  <script>setTimeout(() => window.print(), 800);</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export async function generateAndUploadPDF(
  report: any, defects: any[], projectName: string, _inspector: any, _supabase: any
): Promise<string> {
  printReport(report, defects, projectName);
  return '';
}
