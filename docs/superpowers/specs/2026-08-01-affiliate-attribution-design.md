# Affiliate Link Attribution Design

## Goal

Make every issued affiliate link reliably identify its affiliate, preserve that attribution through a Shopify storefront and checkout, and create no more than one valid commission for a completed order.

## Scope

This change covers referral-code issuance, redirect handling, storefront persistence, order-webhook attribution, and local end-to-end testing. It does not introduce multi-touch attribution, customer-level identity tracking, recurring commissions, or a new payout model.

## Integration choice

Use a Shopify theme app extension with an app embed. This is Shopify's supported storefront integration model and lets one version of the tracking script work across compatible storefront themes without editing theme files. The embed stores a referral code in a first-party cookie and sends it to Shopify as a cart attribute. Cart attributes are copied to completed orders as note/custom attributes.

The app embed is activated by the merchant from the Shopify theme editor. The existing OAuth connection remains responsible for registering the signed order webhook.

## Referral-link contract

Canonical public links are `https://<app-host>/r/<REFERRAL_CODE>`.

- A referral code is uppercase, drawn from an unambiguous alphabet, and unique across all affiliates.
- All creation paths use one shared code generator: instant joins, approval decisions, and the legacy public join endpoint.
- A request to `/r/<code>` succeeds only when the affiliate is active, its program is active, and the program has a connected store.
- A successful request records the click before redirecting. It redirects to the connected storefront with `ref=<code>` while preserving any safe destination path and query parameters supplied by the link.
- Invalid, paused, deleted, or disconnected links redirect to a controlled app error page and never create a click or a commission.

## Storefront persistence

The app embed runs on the merchant's storefront, not on the platform domain.

1. It reads `ref` from the landing URL.
2. It validates the code format, stores it in a first-party `referly_ref` cookie for the program's configured attribution window, and removes `ref` from the visible URL with `history.replaceState`.
3. It obtains the current valid code from the URL or cookie and writes it to the existing Shopify cart as the private `referly_ref` cart attribute using the Ajax Cart API.
4. It repeats the cart-attribute write after cart-changing storefront events so regular add-to-cart and checkout flows retain attribution.

The cart attribute is an attribution hint, not an authorization mechanism. The order webhook is the authoritative validator. Accelerated checkout flows can bypass cart-attribute propagation in Shopify; the platform will use the order landing URL fallback where present and will not create a commission when it cannot prove a valid program/store/code match.

## Order-attribution rules

For every signed `orders/create` webhook:

1. Verify the HMAC against the connected store's secret.
2. Resolve the referral code from the `referly_ref`/legacy `ref` note attribute, then from `landing_site` as a fallback.
3. Resolve the affiliate and program. Credit it only if the affiliate is active, the program is active, and the program's store equals the webhook's store.
4. Enforce the program attribution window using the latest recorded click. A direct valid landing URL without an observable platform click may be credited, but a known expired click may not.
5. Calculate the commission only from eligible products for restricted programs; otherwise use the order total.
6. Persist the order idempotently by `(store_id, shopify_order_id)`. Create a commission only if the newly stored order is eligible and has no existing commission.

Orders are always recorded once for auditability, including ineligible or unattributed orders. Commissions are immutable once paid and have a database uniqueness constraint on `order_id`.

## Data and boundaries

- `lib/referrals.ts` owns referral code generation, code normalization, canonical URL construction, redirect destination construction, and attribution eligibility decisions that do not require HTTP handling.
- `lib/db.ts` exposes explicit idempotent order creation results and commission lookup/creation behavior rather than relying on timestamps or an ignored insert.
- `app/r/[code]/route.ts` validates and records a referral visit, then redirects.
- `app/api/webhooks/orders/route.ts` verifies the source, calls the attribution service, and returns the acknowledgement.
- `extensions/referly-attribution/` contains the Shopify theme app extension: the embed Liquid entry point, storefront JavaScript, and extension manifest.

## Error handling and observability

Referral and webhook failures must be distinguishable in structured logs without leaking secrets or full personal data. Log a reason code for invalid link, inactive affiliate, inactive program, store mismatch, expired attribution, no eligible products, duplicate order, and duplicate commission. A webhook must acknowledge a duplicate safely and never create a second commission.

## Verification

Automated tests will prove:

- codes are normalized and canonical URLs are generated consistently;
- referral redirects accept active referrals and reject inactive/missing-store cases;
- the theme asset writes and refreshes the cart attribute without overwriting unrelated attributes;
- webhook attribution rejects wrong-store, inactive, expired, invalid, and ineligible cases;
- repeated delivery of the same Shopify order yields one order and one commission;
- local development redirects to the test storefront and completes the same attribution lifecycle.

Run linting, the full test suite, and a production build after implementation. Use a fresh local development flow to exercise instant join, redirect, purchase, and credited commission.
