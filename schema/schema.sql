-- Production schema for Postgres.
-- Run this once against your database to create all tables.
-- Every table maps 1:1 to a type in lib/types.ts.

create extension if not exists pgcrypto;

create table if not exists users (
  id          text        primary key,
  email       text        unique not null,
  password_hash text      not null,
  name        text        not null,
  created_at  timestamptz not null default now()
);

create table if not exists shopify_stores (
  id           text        primary key,
  user_id      text        not null references users(id) on delete cascade,
  shop_domain  text        not null,
  -- The real Shopify OAuth access token. Treat as a secret at rest.
  access_token text,
  connected_at timestamptz not null default now(),
  unique (user_id, shop_domain)
);

create table if not exists affiliate_programs (
  id              text         primary key,
  user_id         text         not null references users(id) on delete cascade,
  store_id        text         not null references shopify_stores(id) on delete cascade,
  name            text         not null,
  commission_rate numeric(5,2) not null check (commission_rate >= 0 and commission_rate <= 100),
  created_at      timestamptz  not null default now()
);

create table if not exists affiliates (
  id            text        primary key,
  program_id    text        not null references affiliate_programs(id) on delete cascade,
  name          text        not null,
  email         text        not null,
  referral_code text        unique not null,
  joined_at     timestamptz not null default now(),
  unique (program_id, email)
);
create index if not exists affiliates_referral_code_idx on affiliates (referral_code);

create table if not exists referral_clicks (
  id            text        primary key,
  referral_code text        not null,
  affiliate_id  text        not null references affiliates(id) on delete cascade,
  program_id    text        not null references affiliate_programs(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists referral_clicks_affiliate_id_idx on referral_clicks (affiliate_id);
create index if not exists referral_clicks_program_id_idx   on referral_clicks (program_id);

create table if not exists orders (
  id               text         primary key,
  program_id       text         references affiliate_programs(id) on delete set null,
  store_id         text         not null references shopify_stores(id) on delete cascade,
  shopify_order_id text         not null,
  referral_code    text,
  affiliate_id     text         references affiliates(id) on delete set null,
  amount           numeric(12,2) not null check (amount > 0),
  currency         text          not null default 'USD',
  created_at       timestamptz   not null default now(),
  unique (store_id, shopify_order_id)
);

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
  -- Stripe transfer ID returned after a real payout
  stripe_transfer_id text
);
create index if not exists commissions_affiliate_id_status_idx on commissions (affiliate_id, status);
create index if not exists commissions_program_id_idx          on commissions (program_id);
