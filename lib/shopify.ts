/**
 * Shopify Admin API helpers.
 * - syncProducts: fetches the full product catalog from Shopify and upserts into DB
 * - registerWebhook: registers the orders/create webhook on a connected store
 */
import { nanoid } from "nanoid";
import { db } from "./db";
import type { ShopifyStore } from "./types";

interface ShopifyProductRaw {
  id: number;
  title: string;
  handle: string;
  images: { src: string }[];
  variants: { price: string }[];
}

/** Fetch and cache the full product catalog from Shopify (handles pagination). */
export async function syncProducts(store: ShopifyStore): Promise<number> {
  if (!store.accessToken) return 0;

  let url: string | null =
    `https://${store.shopDomain}/admin/api/2024-01/products.json?limit=250&fields=id,title,handle,images,variants`;
  let total = 0;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { "X-Shopify-Access-Token": store.accessToken },
    });

    if (!res.ok) {
      console.error(`[shopify] product sync failed for ${store.shopDomain}:`, res.status);
      break;
    }

    const data = (await res.json()) as { products: ShopifyProductRaw[] };
    const products = data.products ?? [];

    await db.upsertProducts(
      products.map((p) => ({
        id: nanoid(),
        storeId: store.id,
        shopifyProductId: String(p.id),
        title: p.title,
        imageUrl: p.images[0]?.src ?? null,
        price: p.variants[0] ? parseFloat(p.variants[0].price) : null,
        handle: p.handle,
      }))
    );

    total += products.length;

    // Follow Shopify Link header pagination
    const link: string | null = res.headers.get("Link");
    const next: string | null = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  return total;
}

/** Register orders/create webhook on the connected store. Non-fatal if it already exists. */
export async function registerOrderWebhook(store: ShopifyStore): Promise<void> {
  if (!store.accessToken) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return;

  await fetch(`https://${store.shopDomain}/admin/api/2024-01/webhooks.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": store.accessToken,
    },
    body: JSON.stringify({
      webhook: {
        topic: "orders/create",
        address: `${appUrl}/api/webhooks/orders`,
        format: "json",
      },
    }),
  });
  // 422 = already registered — that's fine
}
