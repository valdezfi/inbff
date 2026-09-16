import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let directory: string;
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('MYSQL_URL', '');
  directory = mkdtempSync(join(tmpdir(), 'inbff-db-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(directory, { recursive: true, force: true }); });

it('creates one commission when the same order arrives concurrently', async () => {
  const { createCommission, read } = await import('./db');
  const input = { orderId: 'order', affiliateId: 'affiliate', programId: 'program', amount: 9, rate: 10, status: 'pending' as const };
  const results = await Promise.all([createCommission({ ...input, id: 'one' }), createCommission({ ...input, id: 'two' })]);
  expect(read().commissions).toHaveLength(1);
  expect(results[0].id).toBe(results[1].id);
});

it('preserves corrupted data instead of silently replacing financial records', async () => {
  mkdirSync(join(directory, 'data'));
  const file = join(directory, 'data', 'db.json');
  writeFileSync(file, '{broken');
  const { read } = await import('./db');
  expect(() => read()).toThrow();
  expect(readFileSync(file, 'utf8')).toBe('{broken');
});
