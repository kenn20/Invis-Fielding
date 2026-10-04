import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../services/worker.js';

const env = { ALLOWED_ORIGINS: 'https://shield.example', APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec', SIGNUP_SECRET: 'test-secret' };
const request = (body = { email: 'Person@Example.com' }, options = {}) => new Request('https://worker.example/signup', {
  method: 'POST', headers: { Origin: 'https://shield.example', 'Content-Type': 'application/json', ...options.headers }, body: JSON.stringify(body),
});
afterEach(() => vi.unstubAllGlobals());
describe('signup Worker', () => {
  it('passes normalized email and server secret, acknowledges confirmed storage', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal('fetch', fetch);
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'person@example.com', secret: 'test-secret' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://shield.example');
  });
  it('handles allowed preflight', async () => {
    const response = await worker.fetch(new Request('https://worker.example/signup', { method: 'OPTIONS', headers: { Origin: 'https://shield.example' } }), env);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });
  it('rejects invalid origins before forwarding', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const response = await worker.fetch(request(undefined, { headers: { Origin: 'https://attacker.example' } }), env);
    expect(response.status).toBe(403); expect(fetch).not.toHaveBeenCalled();
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
  it.each(['invalid', '=formula@example.com', 'a@localhost', 'a'.repeat(255) + '@example.com'])('rejects invalid address %s', async email => {
    expect((await worker.fetch(request({ email }), env)).status).toBe(400);
  });
  it('bounds the body even without Content-Length', async () => {
    expect((await worker.fetch(request({ email: 'a'.repeat(3000) }), env)).status).toBe(413);
  });
  it('returns generic error for missing configuration', async () => {
    expect((await worker.fetch(request(), { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS })).status).toBe(503);
  });
  it.each([
    () => Promise.resolve(new Response(JSON.stringify({ ok: false }))),
    () => Promise.resolve(new Response('<html>Error</html>')),
    () => Promise.reject(new Error('timeout')),
  ])('does not acknowledge failed upstream writes', async upstream => {
    vi.stubGlobal('fetch', vi.fn(upstream));
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(503); expect((await response.json()).ok).toBe(false);
  });
});
