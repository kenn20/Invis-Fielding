const emailPattern = /^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
    if (!origin || !allowed.includes(origin)) return reply(403, { ok: false, error: 'Request not allowed.' });
    headers['Access-Control-Allow-Origin'] = origin;
    if (new URL(request.url).pathname !== '/signup') return reply(404, { ok: false, error: 'Not found.' });
    if (request.method === 'OPTIONS') {
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
      headers['Access-Control-Max-Age'] = '600';
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') return reply(405, { ok: false, error: 'Method not allowed.' });
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply(415, { ok: false, error: 'JSON required.' });
    // Bound the actual body, including requests with absent or inaccurate Content-Length.
    let raw = '';
    if (Number(request.headers.get('Content-Length')) > 2048) return reply(413, { ok: false, error: 'Request too large.' });
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { ok: false, error: 'Invalid request.' });
    try {
      let bytes = 0;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 2048) { await reader.cancel(); return reply(413, { ok: false, error: 'Request too large.' }); }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } catch { return reply(400, { ok: false, error: 'Invalid request.' }); }
    let email;
    try {
      const payload = JSON.parse(raw);
      email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
    } catch { return reply(400, { ok: false, error: 'Invalid request.' }); }
    if (email.length > 254 || !emailPattern.test(email)) return reply(400, { ok: false, error: 'Valid email required.' });
    if (!env.APPS_SCRIPT_URL || !env.SIGNUP_SECRET) return reply(503, { ok: false, error: 'Registration unavailable.' });
    try {
      const url = new URL(env.APPS_SCRIPT_URL);
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error('Invalid configuration');
      const upstream = await fetch(url, {
        method: 'POST', redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, secret: env.SIGNUP_SECRET }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await upstream.json();
      if (!upstream.ok || result.ok !== true) throw new Error('Storage not acknowledged');
      return reply(200, { ok: true });
    } catch { return reply(503, { ok: false, error: 'Could not confirm signup. Please retry.' }); }
  },
};
