/**
 * Shopify Admin API helpers — fully multi-tenant.
 *
 * Every brand connects their own Shopify store via OAuth.
 * Shopify signs native app webhooks with this app's client secret.
 *
 * - syncProducts:            fetches the full product catalog (paginated) and upserts into DB
 * - registerOrderWebhook:    registers the orders/create webhook on the store
 * - getWebhookSecret:        returns the Shopify app client secret
 * - verifyWebhookHmac:       verifies a webhook payload for a specific store
 */
import { createHmac, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { db } from "./db";
import type { ShopifyStore } from "./types";

const SHOPIFY_API_VERSION = "2026-07";

interface ShopifyGraphqlProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage: { url: string } | null;
  variants: { nodes: Array<{ price: { amount: string } }> };
}

async function adminGraphql<T>(store: ShopifyStore, query: string, variables: Record<string, unknown>): Promise<T | null> {
  if (!store.accessToken) return null;
  const response = await fetch(`https://${store.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": store.accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    console.error(`[shopify] GraphQL request failed for ${store.shopDomain}:`, response.status, await response.text());
    return null;
  }
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (payload.errors?.length || !payload.data) {
    console.error(`[shopify] GraphQL errors for ${store.shopDomain}:`, payload.errors?.map(error => error.message).join("; "));
    return null;
  }
  return payload.data;
}

// ─── Product sync ─────────────────────────────────────────────────────────────

/** Fetch and cache the full product catalog from Shopify (handles pagination). */
export async function syncProducts(store: ShopifyStore): Promise<number> {
  if (!store.accessToken) return 0;

  let cursor: string | null | undefined = null;
  let total = 0;

  while (cursor !== undefined) {
    const data: {
      products: {
        nodes: ShopifyGraphqlProduct[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null = await adminGraphql(store, `query SyncProducts($cursor: String) {
      products(first: 100, after: $cursor) {
        nodes { id title handle featuredImage { url } variants(first: 1) { nodes { price { amount } } } }
        pageInfo { hasNextPage endCursor }
      }
    }`, { cursor });
    if (!data) break;
    const products = data.products.nodes;

    await db.upsertProducts(
      products.map((p) => ({
        id: nanoid(),
        storeId: store.id,
        shopifyProductId: p.id,
        title: p.title,
        imageUrl: p.featuredImage?.url ?? null,
        price: p.variants.nodes[0] ? parseFloat(p.variants.nodes[0].price.amount) : null,
        handle: p.handle,
      }))
    );

    total += products.length;
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : undefined;
  }

  console.log(`[shopify] synced ${total} products for ${store.shopDomain}`);
  return total;
}

/**
 * Fetch and cache the product catalog for a store connected via Unified.to.
 * (Unified-connected stores hold `unified:<connectionId>` in `accessToken`
 * instead of a real Shopify token, so they can never go through
 * `syncProducts` above — that would send an invalid token straight to
 * Shopify's Admin API and silently sync 0 products.)
 */
export async function syncUnifiedProducts(store: ShopifyStore): Promise<number> {
  if (!store.accessToken?.startsWith("unified:")) return 0;
  const connectionId = store.accessToken.slice("unified:".length);

  const apiKey = process.env.UNIFIED_API_KEY;
  if (!apiKey) {
    console.warn("[unified] UNIFIED_API_KEY not set — skipping product sync");
    return 0;
  }

  const res = await fetch(
    `https://api.unified.to/commerce/${connectionId}/item?limit=100`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) {
    console.error(`[unified] product sync failed for ${store.shopDomain}:`, res.status, await res.text());
    return 0;
  }

  const items = await res.json() as Array<{
    id: string;
    name?: string;
    title?: string;
    media?: { url?: string }[];
    variants?: { price?: number; currency?: string }[];
    raw?: { handle?: string };
  }>;

  await db.upsertProducts(
    items.map(item => ({
      id:               nanoid(),
      storeId:          store.id,
      shopifyProductId: String(item.id),
      title:            item.name ?? item.title ?? "Untitled",
      imageUrl:         item.media?.[0]?.url ?? null,
      price:            item.variants?.[0]?.price ?? null,
      handle:           item.raw?.handle ?? String(item.id),
    }))
  );

  console.log(`[unified] synced ${items.length} products for ${store.shopDomain}`);
  return items.length;
}

// ─── Webhook registration ─────────────────────────────────────────────────────

/**
 * Register the orders/create webhook on the connected store.
 * Shopify owns webhook signature creation; subscriptions cannot define a
 * custom signing secret.
 */
export async function registerOrderWebhook(store: ShopifyStore): Promise<string | null> {
  if (!store.accessToken) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.warn("[shopify] NEXT_PUBLIC_APP_URL not set — skipping webhook registration");
    return null;
  }

  const webhookAddress = `${appUrl}/api/webhooks/orders`;

  const existing = await adminGraphql<{
    webhookSubscriptions: { nodes: Array<{ id: string; uri: string }> };
  }>(store, `query ExistingOrdersWebhooks($topics: [WebhookSubscriptionTopic!]) {
    webhookSubscriptions(first: 100, topics: $topics) { nodes { id uri } }
  }`, { topics: ["ORDERS_CREATE"] });
  const existingSubscription = existing?.webhookSubscriptions.nodes[0];
  if (existingSubscription?.uri === webhookAddress) return getWebhookSecret(store);

  if (existingSubscription) {
    const updated = await adminGraphql<{
      webhookSubscriptionUpdate: { webhookSubscription: { id: string } | null; userErrors: Array<{ message: string }> };
    }>(store, `mutation UpdateOrdersWebhook($id: ID!, $subscription: WebhookSubscriptionInput!) {
      webhookSubscriptionUpdate(id: $id, webhookSubscription: $subscription) {
        webhookSubscription { id }
        userErrors { message }
      }
    }`, { id: existingSubscription.id, subscription: { uri: webhookAddress } });
    if (updated?.webhookSubscriptionUpdate.webhookSubscription && updated.webhookSubscriptionUpdate.userErrors.length === 0) {
      console.log(`[shopify] updated webhook for ${store.shopDomain}`);
      return getWebhookSecret(store);
    }
    console.error(`[shopify] webhook update failed for ${store.shopDomain}:`, updated?.webhookSubscriptionUpdate.userErrors.map(error => error.message).join("; "));
    return null;
  }

  const data = await adminGraphql<{
    webhookSubscriptionCreate: { webhookSubscription: { id: string } | null; userErrors: Array<{ message: string }> };
  }>(store, `mutation CreateOrdersWebhook($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) {
      webhookSubscription { id }
      userErrors { message }
    }
  }`, {
    topic: "ORDERS_CREATE",
    subscription: { uri: webhookAddress },
  });
  const errors = data?.webhookSubscriptionCreate.userErrors ?? [];
  if (!data?.webhookSubscriptionCreate.webhookSubscription || errors.length) {
    console.error(`[shopify] webhook registration failed for ${store.shopDomain}:`, errors.map(error => error.message).join("; "));
    return null;
  }
  console.log(`[shopify] registered webhook for ${store.shopDomain}`);
  return getWebhookSecret(store);
}

// ─── Webhook HMAC verification ───────────────────────────────────────────────

/**
 * Shopify signs native app webhooks with the app client secret. Historical
 * per-store values are deliberately ignored because Shopify never uses them.
 */
export function getWebhookSecret(_store: ShopifyStore): string | null {
  void _store;
  return process.env.SHOPIFY_API_SECRET ?? process.env.SHOPIFY_WEBHOOK_SECRET ?? null;
}

/**
 * Verify the X-Shopify-Hmac-Sha256 header for an incoming webhook.
 * Uses Shopify's app client secret.
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

export function decodeOAuthState(state: string): { nonce: string; shopDomain: string } | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    if (!value || typeof value !== "object") return null;
    const { nonce, shopDomain } = value as Record<string, unknown>;
    if (typeof nonce !== "string" || nonce.length < 16) return null;
    if (typeof shopDomain !== "string" || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) return null;
    return { nonce, shopDomain };
  } catch {
    return null;
  }
}
