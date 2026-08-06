# Task: Fix Unified.to Shopify integration error handling + Nav auth detection

## Completed Steps

### Step 1: Update `app/api/shopify/unified/connect/route.ts`
- [x] Add pre-flight check: call Unified.to API to verify Shopify integration is enabled before redirecting
- [x] Add `error_redirect` param to the auth URL so errors redirect to connect-shopify page

### Step 2: Update `app/api/shopify/unified/callback/route.ts`
- [x] Handle `?error=` query param from Unified.to and redirect to `/dashboard/connect-shopify?error=unified-integration-disabled`

### Step 3: Update `app/dashboard/connect-shopify/page.tsx`
- [x] Add "unified-integration-disabled" to the error messages map with user-friendly text

### Step 4: Fix Nav auth-detection race condition (marketplace showing "Sign in")
- [x] Update `app/components/landing/Nav.tsx` to accept `initialUser` prop
- [x] Update `app/marketplace/page.tsx` to pass session user to Nav
- [x] Update `app/marketplace/[programId]/page.tsx` to pass session user to Nav
- [x] Update `app/page.tsx` (home) to pass session user to Nav
- [x] Update `app/creators/page.tsx` + `app/creators/CreatorsLanding.tsx` to pass session user to Nav
- [x] Update `app/page.tsx` to also handle Unified.to root error redirect
