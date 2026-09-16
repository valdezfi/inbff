# Correctness fixes and verification — 2026-09-16

This is a verified correctness patch, not completion of the full PRD.

## Fixed and covered by regression tests

- Shopify catalog GraphQL scalar price, pagination, failure reporting, and rejection of legacy Unified tokens.
- Paid-order processing, Shopify product-ID matching, allocated discount deduction, restricted-product handling, currency matching, and zero-commission avoidance.
- Concurrent duplicate commission creation in the local database. MySQL uses its existing unique order key with an idempotent insert; live MySQL execution was not tested.
- Local database read failures preserve existing data instead of resetting it.
- Creator payouts use the same per-commission Stripe request and retry key as brand payouts.
- Missing Stripe credentials no longer let creators mark their own earnings paid.
- Zero-value commissions are skipped in creator payout batches; partial failures report progress and refresh the displayed balances.
- Stripe webhook requests fail closed without the signing secret.

OAuth setup now waits for catalog sync and webhook registration, and surfaces failures. Existing stores must reconnect to install the paid-order subscription. Update provider configuration before testing: native application URL `https://inbff.com`, callback `https://inbff.com/api/shopify/callback`.

## Verification

- `npm test`: 30 tests passed (9 files); external provider requests are simulated.
- `npm run build`: passed, including TypeScript and page generation.
- Targeted ESLint: passed for the changed application files before the final Stripe signature guard; final guard checked separately.
- Hosted test login: HTTP 200; authenticated `/` redirects HTTP 307 to `/dashboard`; dashboard and connection page return HTTP 200.
- Hosted `/api/shopify/connect`: HTTP 504 on two attempts. Root cause is not established; hosting logs are needed. Successful deployment of this patch has not been verified.
- Local environment contains no MySQL, Shopify app, or Stripe credentials. Existing database selection was retained; no database migration was run.

## Remaining work / release gates

- Diagnose hosted Shopify connection timeout and verify real OAuth installation, product sync, signed paid-order delivery, and checkout/cart attribution.
- Add Shopify discount-code provisioning, fixed commissions, campaign dates/collections/invite mode, and verify the complete creator/marketplace lifecycle against the PRD.
- Implement uninstall handling, refunds and reversals, self-referral/fraud handling, and customer-specific attribution expiry (the existing latest-click lookup is not customer-specific).
- Implement persistent payout requests and brand funding/fee accounting. Stripe idempotency alone is not a durable payment ledger; partial payouts below the threshold currently need brand settlement. Review reversal retry behavior and freeze the payout currency for earned commissions.
- Implement platform-admin/dispute functionality and creator QR/marketing tooling.
- Run live MySQL integration tests and Stripe test-mode end-to-end settlement tests before public use.

Do not describe this patch or the current platform as fully production-ready.
