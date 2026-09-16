import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from './db';
import { POST } from '@/app/api/affiliate/payout/route';

const { transfer } = vi.hoisted(() => ({ transfer: vi.fn(async () => ({ id: 'tr_test' })) }));
vi.mock('@/lib/auth', () => ({ getSession: async () => ({ userId: 'creator' }) }));
vi.mock('stripe', () => ({ default: class { transfers = { create: transfer }; } }));
beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
  vi.spyOn(db, 'findUserById').mockResolvedValue({ id: 'creator', stripeAccountId: 'acct_test' } as never);
  vi.spyOn(db, 'findAffiliatesByUserId').mockResolvedValue([{ id: 'affiliate', programId: 'program', status: 'active' }] as never);
  vi.spyOn(db, 'findProgramById').mockResolvedValue({ id: 'program', name: 'Shirts', currency: 'USD', payoutThreshold: 5 } as never);
  vi.spyOn(db, 'findPendingCommissionsByAffiliateAndProgram').mockResolvedValue([
    { id: 'one', affiliateId: 'affiliate', programId: 'program', amount: 9, status: 'pending' },
    { id: 'two', affiliateId: 'affiliate', programId: 'program', amount: 12, status: 'pending' },
  ] as never);
  vi.spyOn(db, 'markCommissionPaid').mockResolvedValue({ id: 'one', status: 'paid' } as never);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); transfer.mockClear(); });
const request = () => new NextRequest('https://inbff.com/api/affiliate/payout', { method: 'POST', body: JSON.stringify({ programId: 'program' }) });

it('does not let creators mark themselves paid when Stripe is unavailable', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  expect((await POST(request())).status).toBe(409);
  expect(db.markCommissionPaid).not.toHaveBeenCalled();
});
it('uses the same per-commission Stripe contract as brand payouts', async () => {
  expect((await POST(request())).status).toBe(200);
  expect(transfer).toHaveBeenNthCalledWith(1, {
    amount: 900, currency: 'usd', destination: 'acct_test', description: 'inBFF commission payout — Shirts',
    metadata: { commissionId: 'one', programId: 'program', affiliateId: 'affiliate' },
  }, { idempotencyKey: 'payout-one' });
  expect(transfer).toHaveBeenNthCalledWith(2, expect.objectContaining({ amount: 1200 }), { idempotencyKey: 'payout-two' });
});

it('skips zero-value commissions without blocking positive earnings', async () => {
  vi.mocked(db.findPendingCommissionsByAffiliateAndProgram).mockResolvedValue([
    { id: 'zero', amount: 0 }, { id: 'positive', amount: 9 },
  ] as never);
  await POST(request());
  expect(transfer).toHaveBeenCalledTimes(1);
  expect(transfer).toHaveBeenCalledWith(expect.objectContaining({ amount: 900 }), { idempotencyKey: 'payout-positive' });
});

it('reports partial payment and the brand recovery path when a later transfer fails', async () => {
  transfer.mockResolvedValueOnce({ id: 'tr_first' }).mockRejectedValueOnce(new Error('Insufficient funds'));
  const response = await POST(request());
  expect(response.status).toBe(502);
  const result = await response.json();
  expect(result.paid).toBe(1);
  expect(result.total).toBe(9);
  expect(result.error).toMatch(/brand.*remaining/i);
  expect(db.markCommissionPaid).toHaveBeenCalledTimes(1);
});
