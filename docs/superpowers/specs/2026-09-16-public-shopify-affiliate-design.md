# Public Shopify Affiliate Platform Design

## Goal

Deliver the PRD's multi-brand Shopify affiliate platform using Shopify's native public-app OAuth and Admin GraphQL API. The application will not use Unified.to for Shopify connections.

## Decisions

- **Distribution:** Public multi-brand Shopify app. Any brand can authorize its own store through Shopify OAuth.
- **Database:** Retain the existing MySQL data-access implementation. This scope does not add a health endpoint, mandatory-production guard, migration runner, or JSON-data migration, per the user's request.
- **Shopify API:** Use `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `NEXT_PUBLIC_APP_URL`, and the official GraphQL Admin API endpoints already used by `lib/shopify.ts`.
- **Attribution:** Use a creator-specific Shopify discount code as the primary attribution channel and the existing referral redirect/cart attribute as a secondary channel.
- **Payouts:** Keep existing manual and Stripe Connect transfer paths. A creator can request a payout only for approved, payable commissions after the requested amount reaches the program threshold.

## Public Shopify Connection Flow

1. A signed-in brand opens `/dashboard/connect-shopify` and supplies its `*.myshopify.com` store name.
2. `/api/shopify/connect` validates the domain, creates a nonce-backed state value and HttpOnly state cookie, and redirects to Shopify OAuth using the canonical app callback `/api/shopify/callback`.
3. The callback verifies the Shopify HMAC, validates the cookie/state/session binding, exchanges the authorization code, upserts the store for that brand, syncs products, and creates required webhook subscriptions.
4. Connection status and actionable setup errors are displayed on the dashboard. Unified routes are no longer used by the UI.

## Campaign and Creator Model

The current `affiliate_programs` model is extended rather than replaced. A campaign supports percentage or fixed commission, all-products, explicit-product, or collection scope, open or approval-gated joining, and optional start/end timestamps.

An approved creator has one affiliate membership per campaign. The membership contains an unguessable referral code, a unique Shopify discount code, and a tracking link. Creating a membership calls Shopify's GraphQL discount-code mutation and persists the returned code identifier locally. If Shopify rejects code creation, membership approval fails without creating a partially usable affiliate.

## Attribution and Lifecycle

`orders/paid` is the source of truth for commissions. The webhook resolves a campaign/creator first by Shopify discount code and then by the referral/cart attribution metadata. It persists an idempotent order and commission only when the campaign is active, product eligibility is satisfied, the attribution window is valid, and fraud checks pass.

`orders/cancelled` and refund events reverse a non-paid commission. `app/uninstalled` deactivates the store connection and prevents additional syncs and webhooks from producing commissions. Referral clicks are rate-limited per hashed IP, and self-referral indicators are stored as flags rather than silently discarding evidence.

## Dashboards and Admin

- **Brand:** campaign management, creator applications, creator/code/link details, order and commission analytics, payout review.
- **Creator:** marketplace applications, approved campaign links/codes, clicks, conversions, pending/paid earnings, payout requests.
- **Platform admin:** an explicitly provisioned `platform_admin` role with global counts for active brands, active creators, GMV, platform revenue, flagged clicks/orders, and unresolved disputes.

## Data Changes

MySQL schema and TypeScript types add campaign fields (`commission_type`, `commission_value`, `product_scope`, `collection_ids`, `starts_at`, `ends_at`), creator discount-code fields, order attribution/fraud/refund status, commission statuses (`pending`, `approved`, `paid`, `reversed`), payout requests, and platform-admin user role support. Existing MySQL tables remain the source of truth whenever `MYSQL_URL` is configured.

## Failure Handling and Security

- OAuth uses HMAC validation, state cookie comparison, canonical callback URL generation, and store-domain validation.
- Shopify access tokens and API secrets remain server-only.
- Webhook handlers verify the Shopify HMAC over raw request bytes before parsing JSON.
- Store ownership is checked on every brand action; creators cannot approve themselves or inspect another creator's earnings.
- Shopify API failure is surfaced to the initiating dashboard action and does not leave half-created database records.

## Verification

Automated tests cover OAuth redirect/state logic, campaign commission calculation, discount-code payload construction, paid/refund/uninstall webhook transitions, idempotency, attribution precedence, fraud rules, MySQL query mapping, and authorization boundaries. A manual production checklist covers installing the public Shopify app in the supplied test store, generating a code/link, placing a paid test order, refunding it, and confirming the creator/brand/admin dashboards update correctly.
