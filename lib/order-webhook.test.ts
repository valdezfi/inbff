import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/orders/route';
import { db } from './db';

describe('paid order attribution', () => {
  beforeEach(() => {
    vi.stubEnv('SHOPIFY_API_SECRET', 'test-secret');
    vi.spyOn(db, 'findStoreByDomain').mockResolvedValue({ id: 'store', shopDomain: 'test.myshopify.com', accessToken: 'token' } as never);
    vi.spyOn(db, 'findAffiliateByCode').mockResolvedValue({ id: 'affiliate', programId: 'program', status: 'active' } as never);
    vi.spyOn(db, 'findProgramById').mockResolvedValue({ id: 'program', storeId: 'store', status: 'active', allProducts: false, commissionRate: 10, attributionWindowDays: 30, currency: 'USD' } as never);
    vi.spyOn(db, 'findLatestClickByCode').mockResolvedValue(null);
    vi.spyOn(db, 'findProgramProductIds').mockResolvedValue(['product']);
    vi.spyOn(db, 'findProductsByStoreId').mockResolvedValue([{ id: 'product', shopifyProductId: 'gid://shopify/Product/123', handle: 'shirt' }] as never);
    vi.spyOn(db, 'createOrder').mockImplementation(async input => ({ ...input, createdAt: new Date().toISOString() }));
    vi.spyOn(db, 'findCommissionByOrderId').mockResolvedValue(null);
    vi.spyOn(db, 'createCommission').mockImplementation(async input => ({ ...input, createdAt: new Date().toISOString(), paidAt: null, stripeTransferId: null }));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  async function send(overrides = {}, topic = 'orders/paid') {
    const body = JSON.stringify({ id: 1234, total_price: '120.00', currency: 'USD', financial_status: 'paid', note_attributes: [{ name: 'ref', value: 'ABCDEFG' }], line_items: [{ product_id: 123, price: '50.00', quantity: 2, discount_allocations: [{ amount: '10.00' }] }], ...overrides });
    return POST(new NextRequest('https://inbff.com/api/webhooks/orders', { method: 'POST', body, headers: { 'x-shopify-shop-domain': 'test.myshopify.com', 'x-shopify-topic': topic, 'x-shopify-hmac-sha256': createHmac('sha256', 'test-secret').update(body).digest('base64') } }));
  }
  it('matches GraphQL product IDs to webhook IDs and deducts discounts', async () => {
    expect((await send()).status).toBe(200);
    expect(db.createCommission).toHaveBeenCalledWith(expect.objectContaining({ amount: 9 }));
  });
  it('does not record unpaid order-created events', async () => {
    await send({ financial_status: 'pending' }, 'orders/create');
    expect(db.createOrder).not.toHaveBeenCalled();
  });
  it('does not commission restricted programs when line items are absent', async () => {
    await send({ line_items: undefined });
    expect(db.createCommission).not.toHaveBeenCalled();
  });
  it('rejects malformed totals before writing financial records', async () => {
    expect((await send({ total_price: 'NaN' })).status).toBe(400);
    expect(db.createOrder).not.toHaveBeenCalled();
  });
  it('does not pay a USD program on an order in a different currency', async () => {
    await send({ currency: 'EUR' });
    expect(db.createCommission).not.toHaveBeenCalled();
  });
  it('does not create an unpayable zero commission after rounding', async () => {
    await send({ total_price: '0.01', line_items: [{ product_id: 123, price: '0.01', quantity: 1 }] });
    expect(db.createCommission).not.toHaveBeenCalled();
  });
});
