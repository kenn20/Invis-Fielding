import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import worker from '../services/worker.js';

// Real local D1 and rate-limit bindings, isolated from production and dev data.
const directory = await mkdtemp(join(tmpdir(), 'invis-d1-test-'));
let platform;
try {
  platform = await getPlatformProxy({ configPath: 'services/wrangler.toml', persist: { path: directory } });
  const env = platform.env;
  const migration = await readFile(new URL('../services/migrations/0001_signups.sql', import.meta.url), 'utf8');
  await env.DB.exec(migration.replace(/\n/g, ' '));
  const submit = (email, ip = '192.0.2.1') => worker.fetch(new Request('https://worker.example/signup', {
    method: 'POST', headers: { Origin: 'https://kenn20.github.io', 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify({ email }),
  }), env);
  assert.equal((await submit(' Person@Example.com ')).status, 200);
  const first = await env.DB.prepare('SELECT * FROM signups WHERE email = ?').bind('person@example.com').first();
  assert.match(first.registered_at, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  assert.equal((await submit('PERSON@example.com')).status, 200);
  const concurrent = await Promise.all(Array.from({ length: 5 }, () => submit('Concurrent@Example.com')));
  assert.ok(concurrent.every(response => response.status === 200));
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS count FROM signups').first()).count, 2);
  assert.deepEqual(await env.DB.prepare('SELECT * FROM signups WHERE email = ?').bind('person@example.com').first(), first);
  const statuses = [];
  for (let index = 0; index < 11; index++) statuses.push((await submit('rate@example.com', '192.0.2.2')).status);
  assert.deepEqual(statuses, [...Array(10).fill(200), 429]);
  await env.DB.exec('DROP TABLE signups');
  assert.equal((await submit('failure@example.com', '192.0.2.3')).status, 503);
  console.log('Local D1 verified: storage, normalization, concurrent duplicates, original timestamp, rate limiting, and storage failure.');
} finally {
  await platform?.dispose();
  await rm(directory, { recursive: true, force: true });
}
