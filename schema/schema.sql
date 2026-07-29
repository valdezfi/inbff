-- inBFF — Production Postgres schema (full, idempotent)
-- Run: psql $POSTGRES_URL -f schema/schema.sql

-- ─── Users ────────────────────────────────────────────────────────────────────
create table if not exists users (
  id                        text        primary key,
  email                     text        unique not null,
  password_hash             text        not null,
  name                      text        not null,
  created_at                timestamptz not null default now(),
  role                      text        not null default 'creator'
                              check (role in ('creator','affiliate','both')),
  email_verified            boolean     not null default false,
  verification_token        text        unique,
  verification_token_expiry timestamptz,
  stripe_account_id         text        -- affiliate Stripe Connect account
);

-- ─── Shopify stores ───────────────────────────────────────────────────────────
create table if not exists shopify_stores (
  id             text        primary key,
  user_id        text        not null references users(id) on delete cascade,
  shop_domain    text        not null,
  access_token   text,
  webhook_secret text,                           -- per-store webhook signing secret
  connected_at   timestamptz not null default now(),
  unique (user_id, shop_domain)
);

-- Add webhook_secret if upgrading from an older schema
alter table shopify_stores add column if not exists webhook_secret text;

-- ─── Shopify product cache ────────────────────────────────────────────────────
create table if not exists shopify_products (
  id                  text         primary key,
  store_id            text         not null references shopify_stores(id) on delete cascade,
  shopify_product_id  text         not null,
  title               text         not null,
  image_url           text,
  price               numeric(12,2),
  handle              text         not null,
  synced_at           timestamptz  not null default now(),
  unique (store_id, shopify_product_id)
);
create index if not exists products_store_idx on shopify_products (store_id);

-- ─── Affiliate programs ───────────────────────────────────────────────────────
create table if not exists affiliate_programs (
  id                      text         primary key,
  user_id                 text         not null references users(id) on delete cascade,
  store_id                text         not null references shopify_stores(id) on delete cascade,
  name                    text         not null,
  description             text,
  category                text         not null default 'Other',
  banner_url              text,
  commission_rate         numeric(5,2) not null check (commission_rate >= 0 and commission_rate <= 100),
  program_type            text         not null default 'open'
                            check (program_type in ('open','approval')),
  attribution_window_days integer      not null default 30,
  payout_threshold        numeric(12,2) not null default 50,
  payout_schedule         text         not null default 'manual'
                            check (payout_schedule in ('manual','weekly','monthly')),
  currency                text         not null default 'USD',
  status                  text         not null default 'draft'
                            check (status in ('draft','active','paused','deleted')),
  all_products            boolean      not null default true,
  created_at              timestamptz  not null default now()
);
create index if not exists programs_status_idx   on affiliate_programs (status);
create index if not exists programs_category_idx on affiliate_programs (category);
create index if not exists programs_user_idx     on affiliate_programs (user_id);

-- ─── Program ↔ product eligibility ───────────────────────────────────────────
create table if not exists program_products (
  program_id  text not null references affiliate_programs(id) on delete cascade,
  product_id  text not null references shopify_products(id)   on delete cascade,
  primary key (program_id, product_id)
);

-- ─── Affiliates ───────────────────────────────────────────────────────────────
create table if not exists affiliates (
  id            text        primary key,
  program_id    text        not null references affiliate_programs(id) on delete cascade,
  user_id       text        references users(id) on delete set null,
  name          text        not null,
  email         text        not null,
  referral_code text        unique not null,
  status        text        not null default 'active'
                  check (status in ('active','paused')),
  joined_at     timestamptz not null default now(),
  unique (program_id, email)
);
create index if not exists affiliates_referral_code_idx on affiliates (referral_code);
create index if not exists affiliates_user_id_idx       on affiliates (user_id);

-- ─── Affiliate applications ───────────────────────────────────────────────────
create table if not exists affiliate_applications (
  id           text        primary key,
  program_id   text        not null references affiliate_programs(id) on delete cascade,
  user_id      text        not null references users(id) on delete cascade,
  status       text        not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  pitch        text,
  applied_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  unique (program_id, user_id)
);
create index if not exists applications_user_idx    on affiliate_applications (user_id);
create index if not exists applications_program_idx on affiliate_applications (program_id, status);

-- ─── Referral clicks ──────────────────────────────────────────────────────────
create table if not exists referral_clicks (
  id            text        primary key,
  referral_code text        not null,
  affiliate_id  text        not null references affiliates(id) on delete cascade,
  program_id    text        not null references affiliate_programs(id) on delete cascade,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index if not exists referral_clicks_affiliate_id_idx on referral_clicks (affiliate_id);
create index if not exists referral_clicks_program_id_idx   on referral_clicks (program_id);
create index if not exists referral_clicks_code_time_idx    on referral_clicks (referral_code, created_at desc);

-- ─── Orders ───────────────────────────────────────────────────────────────────
create table if not exists orders (
  id               text          primary key,
  program_id       text          references affiliate_programs(id) on delete set null,
  store_id         text          not null references shopify_stores(id) on delete cascade,
  shopify_order_id text          not null,
  referral_code    text,
  affiliate_id     text          references affiliates(id) on delete set null,
  amount           numeric(12,2) not null check (amount > 0),
  currency         text          not null default 'USD',
  created_at       timestamptz   not null default now(),
  unique (store_id, shopify_order_id)
);
create index if not exists orders_affiliate_idx on orders (affiliate_id);
create index if not exists orders_program_idx   on orders (program_id);

-- ─── Commissions ─────────────────────────────────────────────────────────────
create type if not exists commission_status as enum ('pending', 'paid');

create table if not exists commissions (
  id                 text              primary key,
  order_id           text              not null references orders(id) on delete cascade,
  affiliate_id       text              not null references affiliates(id) on delete cascade,
  program_id         text              not null references affiliate_programs(id) on delete cascade,
  amount             numeric(12,2)     not null,
  rate               numeric(5,2)      not null,
  status             commission_status not null default 'pending',
  created_at         timestamptz       not null default now(),
  paid_at            timestamptz,
  stripe_transfer_id text
);
create index if not exists commissions_affiliate_status_idx on commissions (affiliate_id, status);
create index if not exists commissions_program_id_idx       on commissions (program_id);
