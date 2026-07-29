/**
 * Shopify Admin API helpers — fully multi-tenant.
 *
 * Every brand connects their own Shopify store via OAuth.
 * Each store gets its own webhook signing secret stored in shopify_stores.webhook_secret.
 *
 * - syncProducts:            fetches the full product catalog (paginated) and upserts into DB
 * - registerOrderWebhook:    registers the orders/create webhook on the store, stores its secret
 * - getWebhookSecret:        returns the per-store webhook secret (fallback: env SHOPIFY_WEBHOOK_SECRET)
 * - verifyWebhookHmac:       verifies a webhook payload for a specific store
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
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

interface ShopifyWebhook {
  id: number;
  topic: string;
  address: string;
  api_version: string;
}

// ─── Product sync ─────────────────────────────────────────────────────────────

/** Fetch and cache the full product catalog from Shopify (handles pagination). */
export async function syncProducts(store: ShopifyStore): Promise<number> {
  if (!store.accessToken) return 0;

  let url: string | null =
    `https://${store.shopDomain}/admin/api/2024-01/products.json` +
    `?limit=250&fields=id,title,handle,images,variants`;
  let total = 0;

  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": store.accessToken },
    });

    if (!res.ok) {
      console.error(`[shopify] product sync failed for ${store.shopDomain}:`, res.status, await res.text());
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

    // Follow Shopify Link-header pagination
    const link = res.headers.get("Link");
    const next = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
    url = next;
  }

  console.log(`[shopify] synced ${total} products for ${store.shopDomain}`);
  return total;
}

// ─── Webhook registration ─────────────────────────────────────────────────────

/**
 * Register the orders/create webhook on the connected store.
 * Generates a cryptographically random secret per store and saves it to DB.
 * If the webhook already exists (422), fetches and returns the existing secret.
 */
export async function registerOrderWebhook(store: ShopifyStore): Promise<string | null> {
  if (!store.accessToken) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.warn("[shopify] NEXT_PUBLIC_APP_URL not set — skipping webhook registration");
    return null;
  }

  // Generate a per-store webhook secret
  const secret = randomBytes(32).toString("hex");
  const webhookAddress = `${appUrl}/api/webhooks/orders`;

  const res = await fetch(
    `https://${store.shopDomain}/admin/api/2024-01/webhooks.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": store.accessToken,
      },
      body: JSON.stringify({
        webhook: {
          topic: "orders/create",
          address: webhookAddress,
          format: "json",
          metafield_namespaces: ["affiliates"],
        },
      }),
    }
  );

  if (res.ok) {
    // Save the newly generated secret to the store record
    await db.upsertStore({ ...store, webhookSecret: secret });
    console.log(`[shopify] registered webhook for ${store.shopDomain}`);
    return secret;
  }

  if (res.status === 422) {
    // Already registered — find the existing webhook and keep existing secret
    console.log(`[shopify] webhook already registered for ${store.shopDomain}, fetching existing`);
    await ensureWebhookUpdated(store, webhookAddress);
    return store.webhookSecret ?? null;
  }

  console.error(`[shopify] webhook registration failed for ${store.shopDomain}:`, res.status, await res.text());
  return null;
}

/** Update existing webhook address if app URL changed (e.g. new deployment). */
async function ensureWebhookUpdated(store: ShopifyStore, webhookAddress: string): Promise<void> {
  if (!store.accessToken) return;
  try {
    const listRes = await fetch(
      `https://${store.shopDomain}/admin/api/2024-01/webhooks.json?topic=orders%2Fcreate`,
      { headers: { "X-Shopify-Access-Token": store.accessToken } }
    );
    if (!listRes.ok) return;
    const { webhooks } = await listRes.json() as { webhooks: ShopifyWebhook[] };
    for (const wh of webhooks) {
      if (wh.address !== webhookAddress) {
        await fetch(
          `https://${store.shopDomain}/admin/api/2024-01/webhooks/${wh.id}.json`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": store.accessToken,
            },
            body: JSON.stringify({ webhook: { id: wh.id, address: webhookAddress } }),
          }
        );
      }
    }
  } catch (e) {
    console.error("[shopify] ensureWebhookUpdated error:", e);
  }
}

// ─── Webhook HMAC verification (per-store) ────────────────────────────────────

/**
 * Returns the webhook secret for a specific store.
 * Priority: per-store secret in DB → fallback env SHOPIFY_WEBHOOK_SECRET.
 */
export function getWebhookSecret(store: ShopifyStore): string | null {
  return store.webhookSecret ?? process.env.SHOPIFY_WEBHOOK_SECRET ?? null;
}

/**
 * Verify the X-Shopify-Hmac-Sha256 header for an incoming webhook.
 * Uses the per-store secret stored in the DB.
 */
export function verifyWebhookHmac(
  rawBody: Buffer,
  hmacHeader: string,
  store: ShopifyStore
): boolean {
  const secret = getWebhookSecret(store);
  if (!secret) return false;
  try {
    const digest = createHmac("sha256", secret).update(rawBody).digest("base64");
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

/** Verify Shopify OAuth HMAC on the callback query params. */
export function verifyOAuthHmac(
  searchParams: URLSearchParams,
  apiSecret: string
): boolean {
  const hmac = searchParams.get("hmac") ?? "";
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => { if (k !== "hmac") params[k] = v; });
  const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const digest = createHmac("sha256", apiSecret).update(message).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  } catch {
    return false;
  }
}
