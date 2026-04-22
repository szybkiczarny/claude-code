import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { to, defect_description, location, deadline, subcontractor, project_name } = await req.json();

    if (!to) return new Response(JSON.stringify({ error: 'Brak adresu email' }), { status: 400, headers: corsHeaders });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #F6A623;">🔧 Zgłoszenie usterki — ${project_name ?? 'Budowa'}</h2>
        <p>Dzień dobry,</p>
        <p>Zgłaszamy usterkę wymagającą Państwa interwencji:</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:8px; background:#f5f5f5; font-weight:bold;">Usterka</td><td style="padding:8px;">${defect_description}</td></tr>
          ${location ? `<tr><td style="padding:8px; background:#f5f5f5; font-weight:bold;">Lokalizacja</td><td style="padding:8px;">${location}</td></tr>` : ''}
          ${deadline ? `<tr><td style="padding:8px; background:#f5f5f5; font-weight:bold;">Termin naprawy</td><td style="padding:8px; color:#E53935; font-weight:bold;">${deadline}</td></tr>` : ''}
          ${subcontractor ? `<tr><td style="padding:8px; background:#f5f5f5; font-weight:bold;">Wykonawca</td><td style="padding:8px;">${subcontractor}</td></tr>` : ''}
        </table>
        <p>Prosimy o potwierdzenie przyjęcia zgłoszenia i podanie planowanego terminu realizacji.</p>
        <p style="color:#999; font-size:12px;">Wiadomość wygenerowana przez Construct AI</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Construct AI <onboarding@resend.dev>',
        to: [to],
        subject: `Usterka: ${defect_description.slice(0, 60)}${defect_description.length > 60 ? '...' : ''}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Resend error');

    return new Response(JSON.stringify({ ok: true, id: data.id }), { headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
