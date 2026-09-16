import { afterEach, expect, it, vi } from 'vitest';
import { db } from './db';
import { syncProducts } from './shopify';
import type { ShopifyStore } from './types';

const store: ShopifyStore = { id: 's', userId: 'u', shopDomain: 'example.myshopify.com', accessToken: 'test', webhookSecret: null, connectedAt: '' };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('imports Shopify scalar prices and paginates the catalog', async () => {
  const save = vi.spyOn(db, 'upsertProducts').mockResolvedValue(undefined);
  const request = vi.fn().mockResolvedValueOnce(Response.json({ data: { products: {
    nodes: [{ id: 'gid://shopify/Product/42', title: 'Hat', handle: 'hat', featuredImage: null, variants: { nodes: [{ price: '19.95' }] } }],
    pageInfo: { hasNextPage: true, endCursor: 'next' },
  } } })).mockResolvedValueOnce(Response.json({ data: { products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } }));
  vi.stubGlobal('fetch', request);
  expect(await syncProducts(store)).toBe(1);
  expect(save.mock.calls[0][0][0].price).toBe(19.95);
  expect(JSON.parse(request.mock.calls[1][1].body).variables.cursor).toBe('next');
});

it('reports Shopify errors instead of reporting an empty successful sync', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ errors: [{ message: 'Access denied' }] })));
  await expect(syncProducts(store)).rejects.toThrow();
});

it('requires reconnection for a legacy Unified token', async () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  await expect(syncProducts({ ...store, accessToken: 'unified:old' })).rejects.toThrow(/reconnect/i);
  expect(request).not.toHaveBeenCalled();
});
