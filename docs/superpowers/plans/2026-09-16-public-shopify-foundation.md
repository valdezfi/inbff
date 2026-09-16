# Public Shopify Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Unified.to store authorization with native public Shopify OAuth and establish the MySQL-backed data foundation for discount-code affiliate attribution.

**Architecture:** The browser initiates `/api/shopify/connect`; Shopify calls `/api/shopify/callback`; the callback persists a native token, syncs products, and registers Shopify subscriptions. The existing `lib/db.ts` MySQL adapter remains unchanged as requested.

**Tech Stack:** Next.js 16, TypeScript, Zod, MySQL 8/mysql2, Shopify Admin GraphQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-public-shopify-affiliate-design.md`

## Global Constraints

- Use native public Shopify OAuth; no new store connection may use Unified.to.
- Do not add a MySQL health route, mandatory-production database check, or JSON-data migration.
- Keep tokens and secrets server-only; verify Shopify webhooks over raw bytes.
- Write and observe a failing Vitest test before each behavior change.

---

### Task 1: Native OAuth connection UI

**Files:**
- Modify: `app/dashboard/connect-shopify/page.tsx`
- Modify: `app/api/shopify/connect/route.ts`
- Modify: `app/api/shopify/sync/route.ts`
- Test: `lib/shopify.test.ts`

**Interfaces:** `POST /api/shopify/connect` consumes `{ shopDomain: string }` and returns `{ redirectUrl: string }`.

- [ ] **Step 1: Write the failing callback-origin test.**

```ts
expect(getShopifyRedirectUri("https://inbff.com", "http://localhost:3000/api/shopify/connect"))
  .toBe("https://inbff.com/api/shopify/callback");
```

- [ ] **Step 2: Run `npm test -- lib/shopify.test.ts`; confirm it fails for the target behavior.**

- [ ] **Step 3: Implement the native store-name form.**

```ts
const res = await fetch("/api/shopify/connect", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ shopDomain: normalizedDomain }),
});
window.location.assign((await res.json()).redirectUrl);
```

Normalize a bare store name or a full `.myshopify.com` address; remove the Unified call and all `unified:` sync branches.

- [ ] **Step 4: Run `npm test -- lib/shopify.test.ts && npx tsc --noEmit`; commit `feat: use native Shopify OAuth for store connections`.**

### Task 2: Campaign and affiliate-code data model

**Files:**
- Modify: `schema/schema.sql`, `lib/types.ts`, `lib/db.ts`, `app/api/programs/route.ts`
- Create: `schema/migrations/001_public_shopify_campaigns.sql`, `lib/db.test.ts`

**Interfaces:** `CommissionType = "percent" | "fixed"`; campaign fields include `commissionValue`, `productScope`, `collectionIds`, `startsAt`, and `endsAt`; affiliate fields include `shopifyDiscountCode`, `shopifyDiscountId`, and `trackingLink`.

- [ ] **Step 1: Write the failing row-mapping and commission tests.**

```ts
expect(calculateCommission(200, "percent", 10)).toBe(20);
expect(calculateCommission(200, "fixed", 25)).toBe(25);
```

- [ ] **Step 2: Run `npm test -- lib/db.test.ts`; confirm failure.**

- [ ] **Step 3: Add schema fields and an explicit upgrade migration.**

```sql
ALTER TABLE affiliate_programs ADD COLUMN commission_type VARCHAR(12) NOT NULL DEFAULT 'percent';
ALTER TABLE affiliate_programs ADD COLUMN commission_value DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN shopify_discount_code VARCHAR(255) NULL;
ALTER TABLE affiliates ADD UNIQUE KEY affiliates_discount_code_unique (shopify_discount_code);
```

- [ ] **Step 4: Extend typed DB mappings and Zod validation.**

```ts
commissionType: z.enum(["percent", "fixed"]),
commissionValue: z.number().positive(),
productScope: z.enum(["all", "products", "collections"]),
```

- [ ] **Step 5: Run `npm test -- lib/db.test.ts lib/referrals.test.ts && npx tsc --noEmit`; commit `feat: add campaign attribution fields`.**

### Task 3: Shopify discount codes and webhook lifecycle

**Files:**
- Modify: `lib/shopify.ts`, `app/api/shopify/callback/route.ts`, `app/api/webhooks/orders/route.ts`
- Create: `app/api/webhooks/shopify/route.ts`
- Modify: affiliate approval/join route and corresponding tests

**Interfaces:** `createAffiliateDiscountCode(store, affiliate, program)` returns `{ id, code }`; `registerStoreWebhooks(store)` registers `ORDERS_PAID`, `ORDERS_CANCELLED`, `REFUNDS_CREATE`, and `APP_UNINSTALLED`.

- [ ] **Step 1: Write failing GraphQL-input and attribution-precedence tests.**

```ts
expect(buildDiscountCodeInput({ code: "MAYA-ABC123", commissionType: "percent", commissionValue: 12 }))
  .toMatchObject({ code: "MAYA-ABC123" });
expect(resolveAttribution({ discountCodes: ["MAYA-ABC123"], referralCode: "OTHER01" }))
  .toEqual({ source: "discount" });
```

- [ ] **Step 2: Run `npm test -- lib/shopify.test.ts lib/referrals.test.ts`; confirm failure.**

- [ ] **Step 3: Implement `discountCodeBasicCreate`; create the local affiliate only after Shopify returns a code.**

```graphql
mutation CreateCode($basicCodeDiscount: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
    codeDiscountNode { id }
    userErrors { field message code }
  }
}
```

- [ ] **Step 4: Register paid/cancelled/refund/uninstall subscriptions.** Paid orders create idempotent commissions; cancellation/refund reverses only non-paid commissions; uninstall deactivates the store.

- [ ] **Step 5: Run `npm test && npx tsc --noEmit`; commit `feat: attribute Shopify orders through creator codes`.**

### Task 4: Runbook and live verification

**Files:**
- Modify: `README.md`, `.env.example`
- Create: `docs/SHOPIFY_PUBLIC_APP_RUNBOOK.md`

- [ ] **Step 1: Document native variables.**

```env
MYSQL_URL=mysql://user:password@host:3306/inbff
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_products,read_orders,write_discounts
NEXT_PUBLIC_APP_URL=https://inbff.com
```

- [ ] **Step 2: Document Shopify configuration:** application URL `https://inbff.com`; allowed redirect `https://inbff.com/api/shopify/callback`; required scopes; migration execution; and reconnecting after scope changes.

- [ ] **Step 3: Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `git diff --check`.**

- [ ] **Step 4: Manually verify the supplied test store:** connect, create a campaign, approve a creator, confirm Shopify created the discount code, submit a paid order, refund it, and inspect the brand/creator commission views.

## Follow-on Plans

Create separate plans after this foundation for (1) brand/creator campaign UX and QR/link copy, (2) payout requests, Stripe Connect lifecycle, and platform fees, and (3) platform-admin analytics, hashed-IP rate limiting, self-referral review, and disputes. They are deliberately separated so public Shopify attribution ships first.
