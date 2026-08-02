# Affiliate Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Issue canonical referral links and award one correctly scoped commission when a referred Shopify order is received.

**Architecture:** Extract referral identity, link construction, and eligibility policy into a pure `lib/referrals.ts` module. Route handlers use this policy with repository operations that return explicit creation outcomes. A Shopify theme app embed saves a valid landing code in a first-party cookie and cart attribute, and the order webhook validates that code against the connected store.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod, MySQL/JSON fallback repository, Vitest, Shopify theme app extension (Liquid and browser JavaScript).

## Global Constraints

- Canonical public links are `https://<app-host>/r/<REFERRAL_CODE>`.
- Credit requires an active affiliate, active program, and the exact Shopify store connected to that program.
- The attribution window uses the latest referral click. A direct valid landing URL may be credited when no platform click exists.
- One `(store_id, shopify_order_id)` creates at most one order and one commission.
- Orders remain auditable when unattributed or ineligible.
- The storefront integration is a Shopify theme app embed; no merchant theme-file edits.
- The pre-existing `unified/` directory is user-owned and out of scope.

---

## File structure

| File | Responsibility |
| --- | --- |
| `lib/referrals.ts` | Code normalization/generation, canonical URLs, redirect target, and attribution eligibility. |
| `lib/referrals.test.ts` | Pure policy tests with literal fixtures. |
| `lib/db.ts`, `schema/schema.sql` | Explicit idempotent order/commission persistence and database constraint. |
| `app/r/[code]/route.ts` | Validates a referral visit, records it, and redirects safely. |
| `app/api/applications/route.ts`, `app/api/affiliates/route.ts`, `app/api/programs/[id]/applications/[appId]/approve/route.ts` | Shared referral-code issuance. |
| `app/api/webhooks/orders/route.ts`, `app/api/webhooks/orders/test/route.ts` | Strict production and local order attribution. |
| `extensions/referly-attribution/` | Shopify extension manifest, Liquid app embed, tracking asset. |
| `vitest.config.ts` | Test runner configuration. |

### Task 1: Referral policy and test harness

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/referrals.ts`
- Create: `lib/referrals.test.ts`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces `normalizeReferralCode(value: string): string | null`.
- Produces `generateUniqueReferralCode(find: (code: string) => Promise<Affiliate | null>): Promise<string>`.
- Produces `buildReferralUrl(appUrl: string, code: string): string`.
- Produces `buildStorefrontDestination(storeDomain: string, code: string, destinationPath?: string): string`.
- Produces `isAttributionEligible(input: AttributionInput): boolean`.

- [ ] **Step 1: Write failing policy tests**

```ts
it("normalizes a valid issued code and rejects malformed input", () => {
  expect(normalizeReferralCode(" abcd234 ")).toBe("ABCD234");
  expect(normalizeReferralCode("bad code!")).toBeNull();
});

it("adds one referral code to a safe storefront path", () => {
  expect(buildStorefrontDestination("shop.example", "ABCD234", "/products/hat?size=m"))
    .toBe("https://shop.example/products/hat?size=m&ref=ABCD234");
});

it("rejects an expired click", () => {
  expect(isAttributionEligible({
    affiliateActive: true, programActive: true, programStoreId: "store-a",
    webhookStoreId: "store-a", latestClickAt: "2026-06-30T00:00:00.000Z",
    attributionWindowDays: 30, now: Date.parse("2026-08-01T00:00:00.000Z"),
  })).toBe(false);
});
```

- [ ] **Step 2: Verify red**

Run: `npm test -- lib/referrals.test.ts`

Expected: fails because the runner or module is absent.

- [ ] **Step 3: Implement the smallest policy**

```ts
export function normalizeReferralCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{7,10}$/.test(code) ? code : null;
}

export function buildStorefrontDestination(storeDomain: string, code: string, destinationPath = "/"): string {
  const target = new URL(destinationPath, `https://${storeDomain}`);
  target.searchParams.set("ref", code);
  return target.toString();
}
```

Add Vitest with a `test` script of `vitest run` and an `@/` path alias.

- [ ] **Step 4: Verify green**

Run: `npm test -- lib/referrals.test.ts`

Expected: all policy tests pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/referrals.ts lib/referrals.test.ts
git commit -m "test: cover referral attribution policy"
```

### Task 2: Canonical issuance and secure redirect

**Files:**
- Modify: `app/r/[code]/route.ts`
- Modify: `app/api/applications/route.ts`
- Modify: `app/api/affiliates/route.ts`
- Modify: `app/api/programs/[id]/applications/[appId]/approve/route.ts`
- Create: `app/r/[code]/route.test.ts`

**Interfaces:**
- Consumes the Task 1 helpers.
- Produces a redirect only for an active affiliate, active program, and connected program store.

- [ ] **Step 1: Write failing redirect tests**

```ts
it("does not record or redirect a paused program referral", async () => {
  const response = await requestReferral("ABCD234", { affiliateStatus: "active", programStatus: "paused" });
  expect(response.headers.get("location")).toContain("error=inactive-referral-link");
  expect(recordedClicks()).toHaveLength(0);
});

it("redirects an active referral to its connected store", async () => {
  const response = await requestReferral("ABCD234", {
    affiliateStatus: "active", programStatus: "active", storeDomain: "brand.myshopify.com",
  });
  expect(response.headers.get("location")).toBe("https://brand.myshopify.com/?ref=ABCD234");
});
```

Use a real `NextRequest` and a temporary JSON database fixture; do not assert mocked function calls.

- [ ] **Step 2: Verify red**

Run: `npm test -- app/r/[code]/route.test.ts`

Expected: paused programs currently record a click and redirect.

- [ ] **Step 3: Implement**

Normalize the input code, resolve affiliate/program/store, reject inactive or missing records before click creation, and await click persistence. In development redirect to `/store/<encoded-store-domain>?ref=<code>`; in production use `buildStorefrontDestination`. Replace each route-local code generator with `generateUniqueReferralCode` and each hand-built URL with `buildReferralUrl`.

- [ ] **Step 4: Verify green**

Run: `npm test -- app/r/[code]/route.test.ts lib/referrals.test.ts`

Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/r/[code]/route.ts app/api/applications/route.ts app/api/affiliates/route.ts app/api/programs/[id]/applications/[appId]/approve/route.ts app/r/[code]/route.test.ts lib/referrals.ts
git commit -m "feat: harden affiliate link issuance and redirects"
```

### Task 3: Idempotent persistence

**Files:**
- Modify: `lib/db.ts`
- Modify: `schema/schema.sql`
- Create: `lib/db.test.ts`

**Interfaces:**
- Produces `createOrderIfAbsent(order): Promise<{ order: Order; created: boolean }>`.
- Produces `createCommissionIfAbsent(commission): Promise<{ commission: Commission; created: boolean }>`.
- Adds a unique `commissions(order_id)` constraint.

- [ ] **Step 1: Write failing idempotency tests**

```ts
it("reports false when the same Shopify order is delivered twice", async () => {
  const first = await db.createOrderIfAbsent(orderFixture("shop-1", "1001"));
  const repeated = await db.createOrderIfAbsent(orderFixture("shop-1", "1001"));
  expect(first.created).toBe(true);
  expect(repeated.created).toBe(false);
  expect(repeated.order.id).toBe(first.order.id);
});

it("creates one commission for an order", async () => {
  const order = (await db.createOrderIfAbsent(orderFixture("shop-1", "1002"))).order;
  expect((await db.createCommissionIfAbsent(commissionFixture(order.id))).created).toBe(true);
  expect((await db.createCommissionIfAbsent(commissionFixture(order.id))).created).toBe(false);
});
```

- [ ] **Step 2: Verify red**

Run: `npm test -- lib/db.test.ts`

Expected: fails because explicit idempotent methods do not exist.

- [ ] **Step 3: Implement**

In JSON mode perform duplicate checks inside the transaction. In MySQL add the database constraint, use the natural order key or order ID to query after `INSERT IGNORE`, and return the exact `created` outcome. Retain compatibility wrappers only while existing callers still need them.

- [ ] **Step 4: Verify green**

Run: `npm test -- lib/db.test.ts`

Expected: both idempotency tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/db.test.ts schema/schema.sql
git commit -m "fix: enforce idempotent affiliate commissions"
```

### Task 4: Strict webhook attribution

**Files:**
- Modify: `app/api/webhooks/orders/route.ts`
- Modify: `app/api/webhooks/orders/test/route.ts`
- Create: `app/api/webhooks/orders/route.test.ts`

**Interfaces:**
- Consumes `isAttributionEligible`, `createOrderIfAbsent`, and `createCommissionIfAbsent`.
- Produces a commission only for a newly created eligible order.

- [ ] **Step 1: Write failing webhook tests**

```ts
it("never credits a referral from another connected store", async () => {
  const response = await postSignedOrder({
    shopDomain: "store-b.myshopify.com",
    note_attributes: [{ name: "referly_ref", value: "ABCD234" }],
  });
  expect((await response.json()).commission).toBeNull();
  expect(commissions()).toHaveLength(0);
});

it("acknowledges duplicate delivery with only one commission", async () => {
  await postSignedOrder(validOrder({ id: 101 }));
  const repeated = await postSignedOrder(validOrder({ id: 101 }));
  expect((await repeated.json()).commission).toBeNull();
  expect(commissions()).toHaveLength(1);
});
```

- [ ] **Step 2: Verify red**

Run: `npm test -- app/api/webhooks/orders/route.test.ts`

Expected: the old path credits cross-store codes or repeats commissions.

- [ ] **Step 3: Implement**

Read `referly_ref` first and legacy `ref` second, then use `landing_site` only as fallback. Require affiliate/program activity and `program.storeId === store.id`; calculate the window and eligible subtotal; persist with Task 3 methods. Attempt commission creation only for a newly created eligible order. Log one reason code for store mismatch, inactive state, expired click, no eligible items, and duplicate delivery. Apply the same policy to the development endpoint and remove its timestamp-based duplicate heuristic.

- [ ] **Step 4: Verify green**

Run: `npm test -- app/api/webhooks/orders/route.test.ts && npm test`

Expected: all webhook and suite tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/orders/route.ts app/api/webhooks/orders/test/route.ts app/api/webhooks/orders/route.test.ts lib/referrals.ts lib/db.ts
git commit -m "fix: validate Shopify referral attribution"
```

### Task 5: Shopify theme app embed

**Files:**
- Create: `extensions/referly-attribution/shopify.extension.toml`
- Create: `extensions/referly-attribution/blocks/referly-attribution.liquid`
- Create: `extensions/referly-attribution/assets/referly-attribution.js`
- Create: `extensions/referly-attribution/assets/referly-attribution.test.ts`
- Modify: `README.md`

**Interfaces:**
- Reads `ref` and the `referly_ref` cookie.
- Posts `{ attributes: { referly_ref: code } }` to `/cart/update.js`.

- [ ] **Step 1: Write a failing browser-asset test**

```ts
it("stores a valid landing code, removes it from the URL, and writes it to the cart", async () => {
  const cartUpdate = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  await runEmbed("https://brand.myshopify.com/products/hat?ref=ABCD234", cartUpdate);
  expect(document.cookie).toContain("referly_ref=ABCD234");
  expect(window.location.search).not.toContain("ref=");
  expect(String(cartUpdate.mock.calls[0][1].body)).toContain('"referly_ref":"ABCD234"');
});
```

The only mock is `fetch`, the external Shopify boundary. The test asserts observable browser state and emitted request content.

- [ ] **Step 2: Verify red**

Run: `npm test -- extensions/referly-attribution/assets/referly-attribution.test.ts`

Expected: fails because the asset module is absent.

- [ ] **Step 3: Implement**

Create a `target: "body"` app embed. Its JavaScript uses the shared code format, writes a `SameSite=Lax; Path=/; Max-Age=<configured days>` first-party cookie, removes only the `ref` parameter with `history.replaceState`, and posts the cart attribute. On failure it leaves the visitor's flow uninterrupted; it retries on `cart:refresh`, `cart:updated`, and `product:added` custom events. Document Shopify CLI deployment, activation in Theme Settings > App embeds, and accelerated-checkout limitation.

- [ ] **Step 4: Verify green**

Run: `npm test -- extensions/referly-attribution/assets/referly-attribution.test.ts && npm test`

Expected: all asset and suite tests pass.

- [ ] **Step 5: Commit**

```bash
git add extensions/referly-attribution README.md package.json package-lock.json vitest.config.ts
git commit -m "feat: persist referrals with Shopify app embed"
```

### Task 6: End-to-end verification

**Files:**
- Modify: `README.md` only if verification reveals a missing operator instruction.

- [ ] **Step 1: Run static verification**

Run: `npm run lint && npm test && npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Exercise the local lifecycle**

Run: `npm run dev`

Use the demo creator to publish an open program, use the demo affiliate to join, open the generated referral link, complete the local purchase, and verify one pending commission appears in the program dashboard.

- [ ] **Step 3: Check duplicate protection**

Post the same development order identifier twice to `/api/webhooks/orders/test`. Confirm the second response returns `commission: null` and the dashboard still shows one commission.

- [ ] **Step 4: Commit an operator-doc correction if verification needed one**

```bash
git add README.md
git commit -m "docs: clarify affiliate attribution setup"
```

