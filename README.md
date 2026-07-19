# Referly — Shopify affiliate program platform

A production-ready full-stack app: store owner connects Shopify → creates an
affiliate program → affiliates join and get a unique referral link →
customers click and get redirected to the real Shopify store → Shopify fires
an orders/create webhook → we verify it with HMAC, calculate the commission →
you pay it out via Stripe Connect.

---

## Running locally (dev, no Shopify or Stripe needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign up as a store owner, connect a store (the
OAuth flow runs for real but you can use any store name in dev), create a
program, then open the invite link in a new tab to join as an affiliate.

The local test storefront at `/store/[shopDomain]` simulates a purchase by
calling the test-only webhook endpoint (`/api/webhooks/orders/test`) which
skips HMAC verification.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Purpose |
|---|---|---|
| `POSTGRES_URL` | Production | Postgres connection string. If unset the app uses a local JSON file. |
| `AUTH_SECRET` | Always | Secret for signing JWT session tokens. Generate with `openssl rand -hex 32`. |
| `NEXT_PUBLIC_APP_URL` | Production | Full public URL, e.g. `https://referly.app`. |
| `SHOPIFY_API_KEY` | Production | From Shopify Partners → App setup. |
| `SHOPIFY_API_SECRET` | Production | Used to verify OAuth HMAC and token exchange. |
| `SHOPIFY_REDIRECT_URI` | Production | OAuth callback: `{APP_URL}/api/shopify/callback`. Must be registered in your app. |
| `SHOPIFY_SCOPES` | Production | Comma-separated scopes, e.g. `read_orders`. |
| `SHOPIFY_WEBHOOK_SECRET` | Production | Signing secret for verifying `orders/create` webhooks. |
| `STRIPE_SECRET_KEY` | Payouts | Stripe platform secret key for Connect transfers. |

---

## Setting up Postgres

Run `schema/schema.sql` against your database once to create all tables:

```bash
psql $POSTGRES_URL -f schema/schema.sql
```

The schema uses `IF NOT EXISTS` everywhere so it is safe to re-run.

---

## Shopify setup checklist

1. Create a Shopify Partner account at https://partners.shopify.com
2. Create a new app → get your API key and secret
3. Set `SHOPIFY_REDIRECT_URI` to `https://your-domain.com/api/shopify/callback`
   and register it in App setup → URLs
4. Set `SHOPIFY_SCOPES` to `read_orders` (add `write_script_tags` if you want
   to auto-install the tracking script)
5. In App setup → Webhooks, note your signing secret → set `SHOPIFY_WEBHOOK_SECRET`
6. The OAuth callback (`/api/shopify/callback`) automatically registers the
   `orders/create` webhook on each newly connected store

### Referral tracking on Shopify storefronts

When an affiliate's link is clicked, the visitor is redirected to:
```
https://{store}.myshopify.com?ref=CODE
```
To capture that code at checkout and pass it to our webhook you have two options:

**Option A — Script Tag API** (simpler, works on non-headless stores):
Install a small script tag via the Shopify Script Tag API (after OAuth) that
reads `?ref=` from the URL and sets it in a cookie, then injects it into the
order's `note_attributes` via the Ajax Cart API before checkout.

**Option B — Checkout UI Extension** (headless / Hydrogen):
Use a Checkout UI Extension to read the cookie/URL param and write it into
`note_attributes` during checkout.

Both approaches result in `note_attributes: [{ name: "ref", value: "CODE" }]`
in the order payload, which our webhook already reads.

---

## Stripe Connect payouts

1. Create a Stripe Platform account
2. Set `STRIPE_SECRET_KEY` to your platform secret key
3. Implement the affiliate Connect onboarding flow:
   - Create a Connect account for each affiliate (`stripe.accounts.create`)
   - Generate an account link (`stripe.accountLinks.create`) for them to
     complete KYC/payout details
   - Store the resulting `stripe_account_id` on their affiliate record
4. When you click Pay on the Payouts page, a real Stripe Transfer is created
   from your platform balance to their connected account

---

## Project structure

```
app/
  page.tsx                        landing page
  signup/, login/                 store owner auth
  dashboard/                      store owner's app (auth-guarded)
    connect-shopify/              initiates Shopify OAuth
    programs/, programs/[id]/
    payouts/
  join/[programId]/               public affiliate sign-up
  r/[code]/                       referral link redirect + click tracking
  store/[shopDomain]/             local dev test storefront only
  api/
    auth/login, signup, logout    JWT-based auth
    shopify/connect               OAuth step 1 (redirect to Shopify)
    shopify/callback              OAuth step 2 (token exchange + webhook reg)
    programs/                     create / get programs
    affiliates/                   affiliate registration
    payouts/[commissionId]/       Stripe Connect transfer + DB update
    webhooks/orders/              real Shopify webhook (HMAC verified)
    webhooks/orders/test/         dev-only webhook (no HMAC, blocked in prod)
lib/
  db.ts     Postgres (when POSTGRES_URL set) or JSON file fallback
  types.ts  TypeScript interfaces mirroring schema.sql
  auth.ts   JWT sessions, bcrypt password hashing
schema/
  schema.sql  Production Postgres schema
```
