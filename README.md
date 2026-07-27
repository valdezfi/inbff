# inBFF — Shopify Affiliate Program Platform

A production-ready full-stack app: store owner connects Shopify → creates an
affiliate program → affiliates join and get a unique referral link →
customers click and get redirected to the real Shopify store → Shopify fires
an `orders/create` webhook → we verify it with HMAC, calculate the commission →
pay it out via Stripe Connect.

---

## Running locally (no Shopify or Stripe needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app falls back to a local JSON file at
`data/db.json` — no database needed for dev.

**Demo login credentials:**

| Role      | Email                | Password   |
|-----------|----------------------|------------|
| Creator   | creator@demo.com     | demo1234   |
| Affiliate | affiliate@demo.com   | demo1234   |

---

## Deploying to a Linux server

### Option A — Docker (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/valdezfi/inbff.git
cd inbff

# 2. Create your env file
cp .env.example .env.local
nano .env.local   # fill in AUTH_SECRET and any optional services

# 3. Build and start
docker compose up -d --build

# App is now running on port 3000
```

### Option B — Direct Node.js (PM2)

```bash
# 1. Install Node 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone & install
git clone https://github.com/valdezfi/inbff.git
cd inbff
cp .env.example .env.local
nano .env.local

# 3. Make startup script executable and run
chmod +x scripts/start.sh
./scripts/start.sh          # builds + starts production server

# Optional: keep it running with PM2
npm install -g pm2
pm2 start "npm start" --name inbff
pm2 save
pm2 startup
```

### Option C — Bash script (dev mode)

```bash
chmod +x scripts/start.sh
./scripts/start.sh dev     # starts next dev
```

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in values:

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | **Always** | Secret for signing JWT session tokens. Run `openssl rand -hex 32`. |
| `POSTGRES_URL` | Production | Postgres connection string. If unset, uses `data/db.json`. |
| `NEXT_PUBLIC_APP_URL` | Production | Full public URL, e.g. `https://inbff.app`. |
| `SHOPIFY_API_KEY` | Shopify | From Shopify Partners → App setup. |
| `SHOPIFY_API_SECRET` | Shopify | Used to verify OAuth HMAC and token exchange. |
| `SHOPIFY_REDIRECT_URI` | Shopify | OAuth callback URL registered in your Shopify app. |
| `SHOPIFY_SCOPES` | Shopify | `read_orders` minimum. |
| `SHOPIFY_WEBHOOK_SECRET` | Shopify | Signing secret for verifying `orders/create` webhooks. |
| `STRIPE_SECRET_KEY` | Payouts | Stripe platform secret key for Connect transfers. |
| `MAILGUN_API_KEY` | Email | Mailgun private API key. If unset, emails are logged to stdout. |
| `MAILGUN_DOMAIN` | Email | Your verified Mailgun sending domain. |
| `MAILGUN_FROM` | Email | From address shown to recipients. |

---

## Setting up Postgres

Run `schema/schema.sql` against your database once to create all tables:

```bash
psql $POSTGRES_URL -f schema/schema.sql
```

The schema uses `IF NOT EXISTS` everywhere — safe to re-run.

---

## Project structure

```
app/
  page.tsx                        Landing page
  signup/, login/                 Auth pages
  dashboard/                      Creator dashboard (auth-guarded)
    connect-shopify/              Shopify OAuth initiation
    programs/, programs/[id]/     Program management
    payouts/                      Payout management
  affiliate/                      Affiliate dashboard (auth-guarded)
    dashboard/, programs/
    earnings/, payouts/
  marketplace/                    Public program marketplace
  join/[programId]/               Legacy public affiliate join page
  r/[code]/                       Referral link redirect + click tracking
  store/[shopDomain]/             Dev-only test storefront
  api/                            All API routes
lib/
  db.ts       Postgres (when POSTGRES_URL set) or JSON file fallback
  types.ts    TypeScript interfaces
  auth.ts     JWT sessions + bcrypt
  email.ts    Mailgun email sending
  shopify.ts  Shopify API helpers
schema/
  schema.sql  Production Postgres schema (idempotent)
scripts/
  start.sh    Linux startup script
Dockerfile    Docker image for Linux deployment
docker-compose.yml
```
