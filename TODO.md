# Task: Full bug sweep of the affiliate marketplace

Broad audit requested: brand connects Shopify → creates affiliate program →
creators join and get referral links → referred orders earn commissions →
brand pays out. Find and fix logic errors across the whole flow.

## Fixed so far

- [x] `schema/schema.sql` was written in **Postgres** DDL (`text`, `timestamptz`,
      `create type ... as enum`) while `lib/db.ts` talks to **MySQL** via
      `mysql2/promise` and docker-compose mounts this file as a MySQL
      init script. A fresh deploy's schema init would fail outright — no
      tables ever get created. Rewrote as valid MySQL 8 DDL matching every
      column `lib/db.ts` selects/inserts.
- [x] `README.md` still documented `POSTGRES_URL` / `psql` setup and listed
      fictional pre-seeded demo credentials (`creator@demo.com` /
      `affiliate@demo.com`) that don't exist anywhere in the codebase.
      Corrected to MySQL setup instructions and removed the fake demo creds.
- [x] Shopify OAuth callbacks (native `app/api/shopify/callback` and
      `app/api/shopify/unified/callback`) looked up the existing store by
      `findStoreByDomain(shop)` with **no userId scope**. If two different
      platform accounts ever connected the same shop domain, the second
      callback would reuse the first account's store `id` in its upsert,
      and in MySQL `ON DUPLICATE KEY UPDATE` would silently overwrite that
      *other brand's* store row with this user's access token — a
      cross-tenant store hijack. Added `findStoreByUserAndDomain` and
      switched both callbacks to it.
- [x] `generateUniqueReferralCode` was always passed `db.findAffiliateByCode`,
      which filters `status='active'`. That made the "is this code taken"
      check blind to paused affiliates, so a newly generated code could
      collide with a paused affiliate's code — violating the schema's
      global `UNIQUE` constraint on `referral_code` (insert throws in MySQL;
      silently creates a duplicate-code affiliate, misattributing clicks/
      commissions, in JSON mode). Added `findAffiliateByCodeAnyStatus` and
      wired it into all three issuance call sites (`/api/affiliates`,
      `/api/applications`, approve route).
- [x] Legacy public `POST /api/affiliates` (used by `/join/[programId]`)
      never checked `program.programType`, so anyone who knew a programId
      could instant-join an **approval-required** program too, completely
      bypassing brand review. Added the `programType === "open"` guard and
      updated the join page to show an "apply" CTA instead of the instant
      join form for approval programs.
- [x] `POST /api/programs/[id]/pause` blindly toggled
      `active ⇄ paused` based on "is it active". Calling it on a **draft**
      program flipped it straight to `active`, bypassing the
      "must have a name" validation enforced by `/publish`; calling it on a
      **deleted** program would resurrect it. Restricted the toggle to
      active/paused only.
- [x] `POST /api/payouts/bulk`: when Stripe was configured but a specific
      affiliate had no connected Stripe account, the loop fell through and
      still called `markCommissionPaid` with a null transfer id — marking
      the commission "paid" while the affiliate was never actually sent
      money. Also had no Stripe idempotency key, unlike the single-payout
      route, so a retried request could double-pay. Now skips (doesn't mark
      paid) when there's no Stripe account, adds the same
      `payout-<commissionId>` idempotency key as the single-payout route,
      and reports `{ paid, skipped, failed }`.
- [x] (from prior session) Nav auth-detection race condition — session user
      now passed as `initialUser` to `Nav` from every server page that
      renders it, so logged-in users don't flash "Sign in".
- [x] (from prior session) Unified.to Shopify integration error handling —
      pre-flight check + `error_redirect` + root-URL error catch.

- [x] Both Shopify OAuth callbacks (`app/api/shopify/callback`,
      `app/api/shopify/unified/callback`) trusted `userId` decoded straight
      out of the client-echoed `state` param. An attacker could call
      `/api/shopify/connect` (or `/unified/connect`) themselves to mint a
      valid `state` carrying *their own* userId, then send the resulting
      Shopify/Unified.to authorize link to a victim brand. If the victim
      completed the real consent screen for their own store, our callback
      would attribute that real access token / connection to the
      attacker's account — a store-hijack CSRF. Fixed both callbacks to
      take `userId` from the current session cookie (unforgeable) instead,
      only using decoded state for a same-shop consistency check.
- [x] The "Re-sync anytime from your program" promise on the primary
      (Unified.to) connect flow was broken: the manual `/api/shopify/sync`
      route always called the native-Shopify `syncProducts()`, which sends
      the store's `accessToken` straight to Shopify's Admin API. For a
      Unified-connected store that "token" is the literal string
      `unified:<connectionId>` — not a real Shopify token — so re-sync
      silently synced 0 products for every brand who used the primary
      connect method. Extracted `syncUnifiedProducts` into `lib/shopify.ts`
      and made the sync route branch on how the store was connected.

- [x] `POST /api/affiliate/payout` (the affiliate's own self-service payout
      request) had the exact same flaw as `/api/payouts/bulk`, but
      self-triggered by the affiliate: when Stripe was configured
      platform-wide but *this* affiliate had no connected Stripe account,
      the code skipped the transfer silently and still marked every
      pending commission "paid" with a null transfer id. Any affiliate
      could hit this endpoint directly (bypassing the disabled UI button)
      and get their own commissions marked paid for free, with no money
      ever moving. Now requires a connected Stripe account whenever Stripe
      is configured, and adds an idempotency key (hashed commission-id set)
      so a retried request can't double-pay.

## Still auditing (not yet started / in progress)

- [ ] `lib/auth.ts` — session/JWT issuance, cookie flags, password hashing
- [ ] `app/api/auth/*` — signup, login, verify-email, resend-verification
- [ ] `app/api/affiliate/*` — earnings, stats, stripe onboard
- [ ] `app/api/webhooks/unified/route.ts` — Unified.to order webhook path
      (does it share the same attribution rules as `app/api/webhooks/orders`?)
- [ ] `app/store/[shopDomain]` dev storefront + `app/api/webhooks/orders/test`
      local purchase simulation
- [ ] `extensions/referly-attribution/` theme app embed JS/Liquid
- [ ] Dashboard pages: programs list/detail, affiliate list, applications
      review UI — cross-check every number/status shown against the API
- [ ] Affiliate-side dashboard/earnings/programs/payouts pages
- [ ] `app/api/shopify/products`, `app/api/shopify/sync` — product catalog
      + program-product-eligibility UI wiring
- [ ] Re-run `npm run lint && npm test && npm run build` once the sweep is
      done and fix anything that surfaces
