import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, title, body, data } = await req.json();

    if (!project_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Pobierz push token managera projektu
    const { data: project } = await supabase
      .from('projects')
      .select('manager_id')
      .eq('id', project_id)
      .single();

    if (!project?.manager_id) {
      return new Response(JSON.stringify({ ok: false, reason: 'no manager' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokenRow } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', project.manager_id)
      .single();

    if (!tokenRow?.token) {
      return new Response(JSON.stringify({ ok: false, reason: 'no token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = {
      to: tokenRow.token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
      channelId: 'default',
    };

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(message),
    });

    const result = await expoRes.json();
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
