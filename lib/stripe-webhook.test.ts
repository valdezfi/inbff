import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it('rejects unsigned Stripe events when the signing secret is missing', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_example');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
  const { POST } = await import('@/app/api/webhooks/stripe/route');
  const response = await POST(new NextRequest('https://inbff.com/api/webhooks/stripe', {
    method: 'POST', body: JSON.stringify({ type: 'account.updated', data: { object: { id: 'acct_fake' } } }),
  }));
  expect(response.status).toBe(503);
});
