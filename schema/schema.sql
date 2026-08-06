-- inBFF — Production MySQL 8 schema
-- lib/db.ts talks to this database via `mysql2/promise` when MYSQL_URL is set.
-- Run once against a fresh database:
--   mysql --host=<host> --user=<user> -p <database> < schema/schema.sql
-- (docker-compose mounts this file as a MySQL init script and runs it
-- automatically the first time the db container starts with an empty volume.)
-- Table creation is safe to re-run (CREATE TABLE IF NOT EXISTS); the
-- CREATE INDEX statements are not — MySQL has no IF NOT EXISTS for indexes,
-- so re-running this file against an already-initialized database will
-- error with "Duplicate key name". Use a migration tool for later changes.

SET default_storage_engine = InnoDB;

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                        VARCHAR(40)  PRIMARY KEY,
  email                     VARCHAR(255) NOT NULL UNIQUE,
  password_hash             VARCHAR(255) NOT NULL,
  name                      VARCHAR(255) NOT NULL,
  created_at                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  role                      VARCHAR(20)  NOT NULL DEFAULT 'brand'
                              CHECK (role IN ('brand','creator')),
  email_verified            TINYINT(1)   NOT NULL DEFAULT 0,
  verification_token        VARCHAR(255) UNIQUE,
  verification_token_expiry TIMESTAMP(3) NULL,
  stripe_account_id         VARCHAR(255) -- affiliate Stripe Connect account
);

-- Migrate old role values if upgrading from a previous schema
UPDATE users SET role = 'brand'   WHERE role IN ('creator','both');
UPDATE users SET role = 'creator' WHERE role = 'affiliate';

-- ─── Shopify stores ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopify_stores (
  id             VARCHAR(40)  PRIMARY KEY,
  user_id        VARCHAR(40)  NOT NULL,
  shop_domain    VARCHAR(255) NOT NULL,
  access_token   VARCHAR(255),
  webhook_secret VARCHAR(255),                    -- per-store webhook signing secret
  connected_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY shopify_stores_user_domain_unique (user_id, shop_domain),
  CONSTRAINT shopify_stores_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Shopify product cache ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopify_products (
  id                  VARCHAR(40)   PRIMARY KEY,
  store_id            VARCHAR(40)   NOT NULL,
  shopify_product_id  VARCHAR(64)   NOT NULL,
  title               VARCHAR(500)  NOT NULL,
  image_url           TEXT,
  price               DECIMAL(12,2),
  handle              VARCHAR(255)  NOT NULL,
  synced_at           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY shopify_products_store_product_unique (store_id, shopify_product_id),
  CONSTRAINT shopify_products_store_fk FOREIGN KEY (store_id) REFERENCES shopify_stores(id) ON DELETE CASCADE
);
CREATE INDEX products_store_idx ON shopify_products (store_id);

-- ─── Affiliate programs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_programs (
  id                      VARCHAR(40)   PRIMARY KEY,
  user_id                 VARCHAR(40)   NOT NULL,
  store_id                VARCHAR(40)   NOT NULL,
  name                    VARCHAR(255)  NOT NULL,
  description             TEXT,
  category                VARCHAR(100)  NOT NULL DEFAULT 'Other',
  banner_url              TEXT,
  commission_rate         DECIMAL(5,2)  NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  program_type            VARCHAR(20)   NOT NULL DEFAULT 'open'
                            CHECK (program_type IN ('open','approval')),
  attribution_window_days INT           NOT NULL DEFAULT 30,
  payout_threshold        DECIMAL(12,2) NOT NULL DEFAULT 50,
  payout_schedule         VARCHAR(20)   NOT NULL DEFAULT 'manual'
                            CHECK (payout_schedule IN ('manual','weekly','monthly')),
  currency                VARCHAR(10)   NOT NULL DEFAULT 'USD',
  status                  VARCHAR(20)   NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','paused','deleted')),
  all_products            TINYINT(1)    NOT NULL DEFAULT 1,
  created_at              TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT affiliate_programs_user_fk  FOREIGN KEY (user_id)  REFERENCES users(id)           ON DELETE CASCADE,
  CONSTRAINT affiliate_programs_store_fk FOREIGN KEY (store_id) REFERENCES shopify_stores(id)   ON DELETE CASCADE
);
CREATE INDEX programs_status_idx   ON affiliate_programs (status);
CREATE INDEX programs_category_idx ON affiliate_programs (category);
CREATE INDEX programs_user_idx     ON affiliate_programs (user_id);

-- ─── Program ↔ product eligibility ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS program_products (
  program_id  VARCHAR(40) NOT NULL,
  product_id  VARCHAR(40) NOT NULL,
  PRIMARY KEY (program_id, product_id),
  CONSTRAINT program_products_program_fk FOREIGN KEY (program_id) REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  CONSTRAINT program_products_product_fk FOREIGN KEY (product_id) REFERENCES shopify_products(id)   ON DELETE CASCADE
);

-- ─── Affiliates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliates (
  id            VARCHAR(40)  PRIMARY KEY,
  program_id    VARCHAR(40)  NOT NULL,
  user_id       VARCHAR(40),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  referral_code VARCHAR(16)  NOT NULL UNIQUE,
  status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused')),
  joined_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY affiliates_program_email_unique (program_id, email),
  CONSTRAINT affiliates_program_fk FOREIGN KEY (program_id) REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  CONSTRAINT affiliates_user_fk    FOREIGN KEY (user_id)    REFERENCES users(id)              ON DELETE SET NULL
);
CREATE INDEX affiliates_referral_code_idx ON affiliates (referral_code);
CREATE INDEX affiliates_user_id_idx       ON affiliates (user_id);

-- ─── Affiliate applications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS affiliate_applications (
  id           VARCHAR(40)  PRIMARY KEY,
  program_id   VARCHAR(40)  NOT NULL,
  user_id      VARCHAR(40)  NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  pitch        TEXT,
  applied_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_at  TIMESTAMP(3) NULL,
  UNIQUE KEY affiliate_applications_program_user_unique (program_id, user_id),
  CONSTRAINT affiliate_applications_program_fk FOREIGN KEY (program_id) REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  CONSTRAINT affiliate_applications_user_fk    FOREIGN KEY (user_id)    REFERENCES users(id)              ON DELETE CASCADE
);
CREATE INDEX applications_user_idx    ON affiliate_applications (user_id);
CREATE INDEX applications_program_idx ON affiliate_applications (program_id, status);

-- ─── Referral clicks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_clicks (
  id            VARCHAR(40)  PRIMARY KEY,
  referral_code VARCHAR(16)  NOT NULL,
  affiliate_id  VARCHAR(40)  NOT NULL,
  program_id    VARCHAR(40)  NOT NULL,
  ip_address    VARCHAR(64),
  user_agent    VARCHAR(500),
  created_at    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT referral_clicks_affiliate_fk FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)         ON DELETE CASCADE,
  CONSTRAINT referral_clicks_program_fk   FOREIGN KEY (program_id)   REFERENCES affiliate_programs(id)  ON DELETE CASCADE
);
CREATE INDEX referral_clicks_affiliate_id_idx ON referral_clicks (affiliate_id);
CREATE INDEX referral_clicks_program_id_idx   ON referral_clicks (program_id);
CREATE INDEX referral_clicks_code_time_idx    ON referral_clicks (referral_code, created_at DESC);

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               VARCHAR(40)   PRIMARY KEY,
  program_id       VARCHAR(40),
  store_id         VARCHAR(40)   NOT NULL,
  shopify_order_id VARCHAR(64)   NOT NULL,
  referral_code    VARCHAR(16),
  affiliate_id     VARCHAR(40),
  amount           DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency         VARCHAR(10)   NOT NULL DEFAULT 'USD',
  created_at       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY orders_store_shopify_order_unique (store_id, shopify_order_id),
  CONSTRAINT orders_program_fk    FOREIGN KEY (program_id)   REFERENCES affiliate_programs(id) ON DELETE SET NULL,
  CONSTRAINT orders_store_fk      FOREIGN KEY (store_id)     REFERENCES shopify_stores(id)     ON DELETE CASCADE,
  CONSTRAINT orders_affiliate_fk  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)         ON DELETE SET NULL
);
CREATE INDEX orders_affiliate_idx ON orders (affiliate_id);
CREATE INDEX orders_program_idx   ON orders (program_id);

-- ─── Commissions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id                 VARCHAR(40)   PRIMARY KEY,
  order_id           VARCHAR(40)   NOT NULL UNIQUE,
  affiliate_id       VARCHAR(40)   NOT NULL,
  program_id         VARCHAR(40)   NOT NULL,
  amount             DECIMAL(12,2) NOT NULL,
  rate               DECIMAL(5,2)  NOT NULL,
  status             ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  paid_at            TIMESTAMP(3)  NULL,
  stripe_transfer_id VARCHAR(255),
  CONSTRAINT commissions_order_fk     FOREIGN KEY (order_id)     REFERENCES orders(id)             ON DELETE CASCADE,
  CONSTRAINT commissions_affiliate_fk FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)          ON DELETE CASCADE,
  CONSTRAINT commissions_program_fk   FOREIGN KEY (program_id)   REFERENCES affiliate_programs(id)  ON DELETE CASCADE
);
CREATE INDEX commissions_affiliate_status_idx ON commissions (affiliate_id, status);
CREATE INDEX commissions_program_id_idx       ON commissions (program_id);
