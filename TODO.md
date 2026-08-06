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
