import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../services/worker.js';

const run = vi.fn();
const bind = vi.fn(() => ({ run }));
const prepare = vi.fn(() => ({ bind }));
const limit = vi.fn();
const env = { ALLOWED_ORIGINS: 'https://shield.example', DB: { prepare }, SIGNUP_RATE_LIMITER: { limit } };
const request = (body = { email: 'Person@Example.com' }, options = {}) => new Request('https://worker.example/signup', {
  method: 'POST', headers: { Origin: 'https://shield.example', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...options.headers }, body: JSON.stringify(body),
});
beforeEach(() => { vi.clearAllMocks(); run.mockResolvedValue({ success: true }); limit.mockResolvedValue({ success: true }); });
afterEach(() => vi.unstubAllGlobals());
describe('signup Worker', () => {
  it('stores normalized email with a parameterized insert', async () => {
    const response = await worker.fetch(request({ email: ' Person@Example.com ' }), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(prepare).toHaveBeenCalledWith('INSERT INTO signups (email) VALUES (?) ON CONFLICT(email) DO NOTHING');
    expect(bind).toHaveBeenCalledWith('person@example.com');
    expect(limit).toHaveBeenCalledWith({ key: 'signup:192.0.2.1' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://shield.example');
  });
  it('acknowledges an already stored email', async () => {
    run.mockResolvedValue({ success: true, meta: { changes: 0 } });
    expect((await worker.fetch(request(), env)).status).toBe(200);
  });
  it('limits requests before writing', async () => {
    limit.mockResolvedValue({ success: false });
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect((await response.json()).error).toMatch(/wait a minute/);
    expect(prepare).not.toHaveBeenCalled();
  });
  it('fails closed when rate limiting fails', async () => {
    limit.mockRejectedValue(new Error('unavailable'));
    expect((await worker.fetch(request(), env)).status).toBe(503);
    expect(prepare).not.toHaveBeenCalled();
  });
  it('does not use untrusted forwarded headers as the client IP', async () => {
    const req = request(); req.headers.delete('CF-Connecting-IP');
    req.headers.set('X-Forwarded-For', '192.0.2.1');
    expect((await worker.fetch(req, env)).status).toBe(503);
    expect(prepare).not.toHaveBeenCalled();
  });
  it('handles allowed preflight', async () => {
    const response = await worker.fetch(new Request('https://worker.example/signup', { method: 'OPTIONS', headers: { Origin: 'https://shield.example' } }), env);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    expect(limit).not.toHaveBeenCalled();
  });
  it('rejects invalid origins before forwarding', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const response = await worker.fetch(request(undefined, { headers: { Origin: 'https://attacker.example' } }), env);
    expect(response.status).toBe(403); expect(fetch).not.toHaveBeenCalled(); expect(prepare).not.toHaveBeenCalled();
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
    () => Promise.resolve({ success: false }),
    () => Promise.reject(new Error('database unavailable')),
  ])('does not acknowledge failed database writes', async failure => {
    run.mockImplementation(failure);
    const response = await worker.fetch(request(), env);
    expect(response.status).toBe(503); expect((await response.json()).ok).toBe(false);
  });
});
