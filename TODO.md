# Deployment Fix — Track Progress

## Completed ✓

### Step 1: Unified.to Shopify integration error handling
- [x] `app/api/shopify/unified/connect/route.ts` — added pre-flight check (integration status) + `error_redirect` param
- [x] `app/api/shopify/unified/callback/route.ts` — handle `?error=` param → redirect to `/dashboard/connect-shopify?error=unified-integration-disabled`
- [x] `app/dashboard/connect-shopify/page.tsx` — added friendly error message for `unified-integration-disabled`

### Step 2: Fix Heroku build type error
- [x] `lib/db.ts` — added missing `findPendingCommissionsByAffiliateAndProgram()` method + registered it on `_db` export

### Step 3: Fix Linux server deploy `yarn: command not found`
- [x] `package.json` — added `packageManager: npm@10.9.0` + `engines.node >=20`
- [x] `Procfile` (new) — `web: npm start`
- [x] `nixpacks.toml` (new) — force npm provider, `npm ci` / `npm run build` / `npm start`
- [x] `.dockerignore` (new) — exclude `node_modules`, `.next`, `data`, `.env`, `.git`, nested folder

## Pushed to `main` on github.com/valdezfi/inbff
- `c9c0024` — fix: force npm for all deployments (fixes 'yarn: command not found')
- `1c0d929` — fix: add missing findPendingCommissionsByAffiliateAndProgram db method
- `9ee1bf2` — fix: add pre-flight check and error handling for Unified.to Shopify integration

