import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

function harness({ failWrite = false } = {}) {
  const rows = [];
  let flushed = false;
  let held = false;
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange: (row, column) => ({
      getValue: () => column === 1 ? 'email' : 'registered_at',
      createTextFinder: email => {
        const finder = { matchEntireCell: () => finder, matchCase: () => finder, useRegularExpression: () => finder, findNext: () => rows.some(value => value[0] === email) ? {} : null };
        return finder;
      },
    }),
    appendRow: row => { if (failWrite) throw new Error('storage failed'); rows.push(row); },
  };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'SIGNUP_SECRET' ? 'secret' : 'sheet-id' }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ setMimeType: () => JSON.parse(value) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { held = true; return true; }, hasLock: () => held, releaseLock: () => { held = false; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: () => { flushed = true; } },
  });
  vm.runInContext(readFileSync(new URL('../services/Code.gs', import.meta.url), 'utf8'), context);
  return { rows, call: payload => context.doPost({ postData: { contents: JSON.stringify(payload) } }), flushed: () => flushed, held: () => held };
}

describe('Apps Script storage contract (mocked Google services)', () => {
  it('flushes new writes and deduplicates normalized email', () => {
    const h = harness();
    expect(h.call({ secret: 'secret', email: 'Person@Example.com' }).ok).toBe(true);
    expect(h.flushed()).toBe(true); expect(h.held()).toBe(false);
    expect(h.call({ secret: 'secret', email: 'person@example.com' }).ok).toBe(true);
    expect(h.rows).toHaveLength(1); expect(h.rows[0][0]).toBe('person@example.com');
  });
  it('rejects incorrect secrets and formula inputs without writing', () => {
    const h = harness();
    expect(h.call({ secret: 'wrong', email: 'a@example.com' }).ok).toBe(false);
    expect(h.call({ secret: 'secret', email: '=formula@example.com' }).ok).toBe(false);
    expect(h.rows).toHaveLength(0);
  });
  it('never acknowledges failed writes and releases the lock', () => {
    const h = harness({ failWrite: true });
    expect(h.call({ secret: 'secret', email: 'a@example.com' }).ok).toBe(false);
    expect(h.held()).toBe(false);
  });
});
