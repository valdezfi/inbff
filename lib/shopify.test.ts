import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeOAuthState, getWebhookSecret, verifyWebhookHmac } from "./shopify";
import type { ShopifyStore } from "./types";

const store: ShopifyStore = {
  id: "store-1", userId: "brand-1", shopDomain: "brand.myshopify.com",
  accessToken: "token", webhookSecret: "obsolete-per-store-secret", connectedAt: "2026-09-06T00:00:00.000Z",
};

afterEach(() => vi.unstubAllEnvs());

describe("Shopify webhook verification", () => {
  it("uses the Shopify app client secret, not a generated store value", () => {
    vi.stubEnv("SHOPIFY_API_SECRET", "shopify-app-secret");
    const body = Buffer.from('{"id":1001}');
    const signature = createHmac("sha256", "shopify-app-secret").update(body).digest("base64");

    expect(getWebhookSecret(store)).toBe("shopify-app-secret");
    expect(verifyWebhookHmac(body, signature, store)).toBe(true);
  });
});

describe("Shopify OAuth state", () => {
  it("accepts only a state carrying a nonce and valid shop domain", () => {
    const state = Buffer.from(JSON.stringify({ nonce: "csrf-token-123456", shopDomain: "brand.myshopify.com" })).toString("base64url");
    expect(decodeOAuthState(state)).toEqual({ nonce: "csrf-token-123456", shopDomain: "brand.myshopify.com" });
    expect(decodeOAuthState("not-base64-state")).toBeNull();
  });
});
