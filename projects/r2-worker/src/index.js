export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const contentType = request.headers.get('content-type') ?? 'image/jpeg';
      const fileName = request.headers.get('x-file-name') ?? `${Date.now()}.jpg`;
      const key = `photos/${Date.now()}_${fileName}`;

      const body = await request.arrayBuffer();
      if (!body || body.byteLength === 0) {
        return new Response('Empty body', { status: 400 });
      }

      await env.BUCKET.put(key, body, {
        httpMetadata: { contentType },
      });

      const publicUrl = `https://pub-c0fe3c02ab734fc09e9ea203d9544974.r2.dev/${key}`;

      return new Response(JSON.stringify({ url: publicUrl, key }), {
        headers: { 'content-type': 'application/json', ...corsHeaders() },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json', ...corsHeaders() },
      });
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-file-name',
  };
}
