# Task: Fix Unified.to Shopify integration error handling

## Steps

### Step 1: Update `app/api/shopify/unified/connect/route.ts`
- [x] Add pre-flight check: call Unified.to API to verify Shopify integration is enabled before redirecting
- [x] Add `error_redirect` param to the auth URL so errors redirect to connect-shopify page

### Step 2: Update `app/api/shopify/unified/callback/route.ts`
- [x] Handle `?error=` / `?error_description=` query params from Unified.to and redirect to `/dashboard/connect-shopify?error=unified-integration-disabled`

### Step 3: Update `app/dashboard/connect-shopify/page.tsx`
- [x] Add "unified-integration-disabled" to the error messages map with user-friendly text

