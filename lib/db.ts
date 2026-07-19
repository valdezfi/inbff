/**
 * Data-access layer.
 *
 * When POSTGRES_URL is set the app talks to real Postgres via the `postgres`
 * package.  When it is absent (local dev without a DB) it falls back to the
 * JSON file so the prototype still runs with zero setup.
 *
 * Every exported function mirrors a query in schema/schema.sql, keeping the
 * contract identical for all callers regardless of which backend is active.
 */

import type {
  User,
  ShopifyStore,
  AffiliateProgram,
  Affiliate,
  ReferralClick,
  Order,
  Commission,
  CommissionStatus,
  DB,
} from "./types";

// ─── Postgres backend ──────────────────────────────────────────────────────────

let _sql: ReturnType<typeof import("postgres")> | null = null;

function getSql() {
  if (!_sql) {
    // Dynamic require so the JSON fallback path never touches the `postgres` module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("postgres") as typeof import("postgres");
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("POSTGRES_URL is not set");
    _sql = postgres(url, { ssl: "require", max: 10 });
  }
  return _sql;
}

const usePostgres = !!process.env.POSTGRES_URL;

// ─── JSON file fallback (development / prototype) ─────────────────────────────

let _jsonDb: (() => DB) | null = null;
let _jsonTransaction: (<T>(fn: (db: DB) => T) => Promise<T>) | null = null;

function getJsonDb() {
  if (!_jsonDb) {
    // Loaded lazily so the postgres path never touches `fs`
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");

    const DB_PATH = path.join(process.cwd(), "data", "db.json");

    function emptyDb(): DB {
      return {
        users: [],
        stores: [],
        programs: [],
        affiliates: [],
        clicks: [],
        orders: [],
        commissions: [],
      };
    }

    function readDb(): DB {
      if (!fs.existsSync(DB_PATH)) {
        const db = emptyDb();
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        return db;
      }
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as DB;
    }

    function writeDb(db: DB) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    }

    let queue: Promise<unknown> = Promise.resolve();

    _jsonDb = readDb;
    _jsonTransaction = function transaction<T>(fn: (db: DB) => T): Promise<T> {
      const run = queue.then(() => {
        const db = readDb();
        const result = fn(db);
        writeDb(db);
        return result;
      });
      queue = run.catch(() => {});
      return run;
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { read: _jsonDb!, transaction: _jsonTransaction! };
}

// ─── Unified API ──────────────────────────────────────────────────────────────

/**
 * For the JSON fallback path only — kept for backwards compat so existing
 * page/route code that calls `db.read()` still works.
 */
function read(): DB {
  if (usePostgres) {
    throw new Error(
      "db.read() is not available when POSTGRES_URL is set. " +
        "Use the async query helpers instead."
    );
  }
  return getJsonDb().read();
}

/**
 * For the JSON fallback path only.
 */
async function transaction<T>(fn: (db: DB) => T): Promise<T> {
  if (usePostgres) {
    throw new Error(
      "db.transaction() is not available when POSTGRES_URL is set. " +
        "Use the async query helpers instead."
    );
  }
  return getJsonDb().transaction(fn);
}

// ─── Users ────────────────────────────────────────────────────────────────────

async function findUserByEmail(email: string): Promise<User | null> {
  if (!usePostgres) {
    return (
      getJsonDb()
        .read()
        .users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
    );
  }
  const sql = getSql();
  const rows = await sql<User[]>`
    SELECT id, email, password_hash AS "passwordHash", name,
           created_at::text AS "createdAt"
    FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
  return rows[0] ?? null;
}

async function findUserById(id: string): Promise<User | null> {
  if (!usePostgres) {
    return getJsonDb().read().users.find((u) => u.id === id) ?? null;
  }
  const sql = getSql();
  const rows = await sql<User[]>`
    SELECT id, email, password_hash AS "passwordHash", name,
           created_at::text AS "createdAt"
    FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

async function createUser(user: Omit<User, "createdAt">): Promise<User> {
  if (!usePostgres) {
    const newUser: User = { ...user, createdAt: new Date().toISOString() };
    await getJsonDb().transaction((db) => {
      db.users.push(newUser);
    });
    return newUser;
  }
  const sql = getSql();
  const rows = await sql<User[]>`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${user.id}, ${user.email}, ${user.passwordHash}, ${user.name})
    RETURNING id, email, password_hash AS "passwordHash", name, created_at::text AS "createdAt"`;
  return rows[0];
}

// ─── Stores ───────────────────────────────────────────────────────────────────

async function findStoresByUserId(userId: string): Promise<ShopifyStore[]> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .stores.filter((s) => s.userId === userId);
  }
  const sql = getSql();
  return sql<ShopifyStore[]>`
    SELECT id, user_id AS "userId", shop_domain AS "shopDomain",
           access_token AS "accessToken", connected_at::text AS "connectedAt"
    FROM shopify_stores WHERE user_id = ${userId}`;
}

async function findStoreByDomain(shopDomain: string): Promise<ShopifyStore | null> {
  if (!usePostgres) {
    return (
      getJsonDb()
        .read()
        .stores.find((s) => s.shopDomain === shopDomain) ?? null
    );
  }
  const sql = getSql();
  const rows = await sql<ShopifyStore[]>`
    SELECT id, user_id AS "userId", shop_domain AS "shopDomain",
           access_token AS "accessToken", connected_at::text AS "connectedAt"
    FROM shopify_stores WHERE shop_domain = ${shopDomain} LIMIT 1`;
  return rows[0] ?? null;
}

async function findStoreByUserAndDomain(
  userId: string,
  shopDomain: string
): Promise<ShopifyStore | null> {
  if (!usePostgres) {
    return (
      getJsonDb()
        .read()
        .stores.find((s) => s.userId === userId && s.shopDomain === shopDomain) ?? null
    );
  }
  const sql = getSql();
  const rows = await sql<ShopifyStore[]>`
    SELECT id, user_id AS "userId", shop_domain AS "shopDomain",
           access_token AS "accessToken", connected_at::text AS "connectedAt"
    FROM shopify_stores
    WHERE user_id = ${userId} AND shop_domain = ${shopDomain}
    LIMIT 1`;
  return rows[0] ?? null;
}

async function upsertStore(
  store: Omit<ShopifyStore, "connectedAt">
): Promise<ShopifyStore> {
  if (!usePostgres) {
    let result: ShopifyStore;
    await getJsonDb().transaction((db) => {
      const existing = db.stores.find(
        (s) => s.userId === store.userId && s.shopDomain === store.shopDomain
      );
      if (existing) {
        existing.accessToken = store.accessToken;
        result = existing;
      } else {
        const newStore: ShopifyStore = {
          ...store,
          connectedAt: new Date().toISOString(),
        };
        db.stores.push(newStore);
        result = newStore;
      }
    });
    return result!;
  }
  const sql = getSql();
  const rows = await sql<ShopifyStore[]>`
    INSERT INTO shopify_stores (id, user_id, shop_domain, access_token)
    VALUES (${store.id}, ${store.userId}, ${store.shopDomain}, ${store.accessToken})
    ON CONFLICT (user_id, shop_domain)
    DO UPDATE SET access_token = EXCLUDED.access_token
    RETURNING id, user_id AS "userId", shop_domain AS "shopDomain",
              access_token AS "accessToken", connected_at::text AS "connectedAt"`;
  return rows[0];
}

// ─── Programs ─────────────────────────────────────────────────────────────────

async function findProgramsByUserId(userId: string): Promise<AffiliateProgram[]> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .programs.filter((p) => p.userId === userId);
  }
  const sql = getSql();
  return sql<AffiliateProgram[]>`
    SELECT id, user_id AS "userId", store_id AS "storeId", name,
           commission_rate::float AS "commissionRate", created_at::text AS "createdAt"
    FROM affiliate_programs WHERE user_id = ${userId}`;
}

async function findProgramById(id: string): Promise<AffiliateProgram | null> {
  if (!usePostgres) {
    return getJsonDb().read().programs.find((p) => p.id === id) ?? null;
  }
  const sql = getSql();
  const rows = await sql<AffiliateProgram[]>`
    SELECT id, user_id AS "userId", store_id AS "storeId", name,
           commission_rate::float AS "commissionRate", created_at::text AS "createdAt"
    FROM affiliate_programs WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

async function createProgram(
  program: Omit<AffiliateProgram, "createdAt">
): Promise<AffiliateProgram> {
  if (!usePostgres) {
    const newProgram: AffiliateProgram = {
      ...program,
      createdAt: new Date().toISOString(),
    };
    await getJsonDb().transaction((db) => {
      db.programs.push(newProgram);
    });
    return newProgram;
  }
  const sql = getSql();
  const rows = await sql<AffiliateProgram[]>`
    INSERT INTO affiliate_programs (id, user_id, store_id, name, commission_rate)
    VALUES (${program.id}, ${program.userId}, ${program.storeId}, ${program.name}, ${program.commissionRate})
    RETURNING id, user_id AS "userId", store_id AS "storeId", name,
              commission_rate::float AS "commissionRate", created_at::text AS "createdAt"`;
  return rows[0];
}

// ─── Affiliates ───────────────────────────────────────────────────────────────

async function findAffiliatesByProgramId(programId: string): Promise<Affiliate[]> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .affiliates.filter((a) => a.programId === programId);
  }
  const sql = getSql();
  return sql<Affiliate[]>`
    SELECT id, program_id AS "programId", name, email, referral_code AS "referralCode",
           joined_at::text AS "joinedAt"
    FROM affiliates WHERE program_id = ${programId}`;
}

async function findAffiliateByCode(referralCode: string): Promise<Affiliate | null> {
  if (!usePostgres) {
    return (
      getJsonDb()
        .read()
        .affiliates.find((a) => a.referralCode === referralCode) ?? null
    );
  }
  const sql = getSql();
  const rows = await sql<Affiliate[]>`
    SELECT id, program_id AS "programId", name, email, referral_code AS "referralCode",
           joined_at::text AS "joinedAt"
    FROM affiliates WHERE referral_code = ${referralCode} LIMIT 1`;
  return rows[0] ?? null;
}

async function findAffiliateByProgramAndEmail(
  programId: string,
  email: string
): Promise<Affiliate | null> {
  if (!usePostgres) {
    return (
      getJsonDb()
        .read()
        .affiliates.find(
          (a) =>
            a.programId === programId &&
            a.email.toLowerCase() === email.toLowerCase()
        ) ?? null
    );
  }
  const sql = getSql();
  const rows = await sql<Affiliate[]>`
    SELECT id, program_id AS "programId", name, email, referral_code AS "referralCode",
           joined_at::text AS "joinedAt"
    FROM affiliates
    WHERE program_id = ${programId} AND lower(email) = lower(${email})
    LIMIT 1`;
  return rows[0] ?? null;
}

async function createAffiliate(affiliate: Omit<Affiliate, "joinedAt">): Promise<Affiliate> {
  if (!usePostgres) {
    const newAffiliate: Affiliate = {
      ...affiliate,
      joinedAt: new Date().toISOString(),
    };
    await getJsonDb().transaction((db) => {
      db.affiliates.push(newAffiliate);
    });
    return newAffiliate;
  }
  const sql = getSql();
  const rows = await sql<Affiliate[]>`
    INSERT INTO affiliates (id, program_id, name, email, referral_code)
    VALUES (${affiliate.id}, ${affiliate.programId}, ${affiliate.name}, ${affiliate.email}, ${affiliate.referralCode})
    RETURNING id, program_id AS "programId", name, email, referral_code AS "referralCode",
              joined_at::text AS "joinedAt"`;
  return rows[0];
}

// ─── Clicks ───────────────────────────────────────────────────────────────────

async function createClick(
  click: Omit<ReferralClick, "createdAt">
): Promise<ReferralClick> {
  if (!usePostgres) {
    const newClick: ReferralClick = { ...click, createdAt: new Date().toISOString() };
    await getJsonDb().transaction((db) => {
      db.clicks.push(newClick);
    });
    return newClick;
  }
  const sql = getSql();
  const rows = await sql<ReferralClick[]>`
    INSERT INTO referral_clicks (id, referral_code, affiliate_id, program_id)
    VALUES (${click.id}, ${click.referralCode}, ${click.affiliateId}, ${click.programId})
    RETURNING id, referral_code AS "referralCode", affiliate_id AS "affiliateId",
              program_id AS "programId", created_at::text AS "createdAt"`;
  return rows[0];
}

async function countClicksByAffiliateId(affiliateId: string): Promise<number> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .clicks.filter((c) => c.affiliateId === affiliateId).length;
  }
  const sql = getSql();
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM referral_clicks WHERE affiliate_id = ${affiliateId}`;
  return parseInt(rows[0].count, 10);
}

async function countClicksByProgramId(programId: string): Promise<number> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .clicks.filter((c) => c.programId === programId).length;
  }
  const sql = getSql();
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM referral_clicks WHERE program_id = ${programId}`;
  return parseInt(rows[0].count, 10);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

async function findOrdersByProgramId(programId: string): Promise<Order[]> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .orders.filter((o) => o.programId === programId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sql = getSql();
  return sql<Order[]>`
    SELECT id, program_id AS "programId", store_id AS "storeId",
           shopify_order_id AS "shopifyOrderId", referral_code AS "referralCode",
           affiliate_id AS "affiliateId", amount::float AS amount, currency,
           created_at::text AS "createdAt"
    FROM orders
    WHERE program_id = ${programId}
    ORDER BY created_at DESC`;
}

async function createOrder(order: Omit<Order, "createdAt">): Promise<Order> {
  if (!usePostgres) {
    const newOrder: Order = { ...order, createdAt: new Date().toISOString() };
    await getJsonDb().transaction((db) => {
      db.orders.push(newOrder);
    });
    return newOrder;
  }
  const sql = getSql();
  const rows = await sql<Order[]>`
    INSERT INTO orders (id, program_id, store_id, shopify_order_id, referral_code, affiliate_id, amount, currency)
    VALUES (${order.id}, ${order.programId}, ${order.storeId}, ${order.shopifyOrderId},
            ${order.referralCode}, ${order.affiliateId}, ${order.amount}, ${order.currency})
    ON CONFLICT (store_id, shopify_order_id) DO NOTHING
    RETURNING id, program_id AS "programId", store_id AS "storeId",
              shopify_order_id AS "shopifyOrderId", referral_code AS "referralCode",
              affiliate_id AS "affiliateId", amount::float AS amount, currency,
              created_at::text AS "createdAt"`;
  return rows[0];
}

// ─── Commissions ──────────────────────────────────────────────────────────────

async function findCommissionsByProgramIds(programIds: string[]): Promise<Commission[]> {
  if (programIds.length === 0) return [];
  if (!usePostgres) {
    const ids = new Set(programIds);
    return getJsonDb()
      .read()
      .commissions.filter((c) => ids.has(c.programId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sql = getSql();
  return sql<Commission[]>`
    SELECT id, order_id AS "orderId", affiliate_id AS "affiliateId",
           program_id AS "programId", amount::float AS amount, rate::float AS rate,
           status, created_at::text AS "createdAt", paid_at::text AS "paidAt",
           stripe_transfer_id AS "stripeTransferId"
    FROM commissions
    WHERE program_id = ANY(${programIds})
    ORDER BY created_at DESC`;
}

async function findCommissionsByAffiliateId(affiliateId: string): Promise<Commission[]> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .commissions.filter((c) => c.affiliateId === affiliateId);
  }
  const sql = getSql();
  return sql<Commission[]>`
    SELECT id, order_id AS "orderId", affiliate_id AS "affiliateId",
           program_id AS "programId", amount::float AS amount, rate::float AS rate,
           status, created_at::text AS "createdAt", paid_at::text AS "paidAt",
           stripe_transfer_id AS "stripeTransferId"
    FROM commissions WHERE affiliate_id = ${affiliateId}`;
}

async function findCommissionsByProgramId(programId: string): Promise<Commission[]> {
  if (!usePostgres) {
    return getJsonDb()
      .read()
      .commissions.filter((c) => c.programId === programId);
  }
  const sql = getSql();
  return sql<Commission[]>`
    SELECT id, order_id AS "orderId", affiliate_id AS "affiliateId",
           program_id AS "programId", amount::float AS amount, rate::float AS rate,
           status, created_at::text AS "createdAt", paid_at::text AS "paidAt",
           stripe_transfer_id AS "stripeTransferId"
    FROM commissions WHERE program_id = ${programId}`;
}

async function findCommissionById(id: string): Promise<Commission | null> {
  if (!usePostgres) {
    return getJsonDb().read().commissions.find((c) => c.id === id) ?? null;
  }
  const sql = getSql();
  const rows = await sql<Commission[]>`
    SELECT id, order_id AS "orderId", affiliate_id AS "affiliateId",
           program_id AS "programId", amount::float AS amount, rate::float AS rate,
           status, created_at::text AS "createdAt", paid_at::text AS "paidAt",
           stripe_transfer_id AS "stripeTransferId"
    FROM commissions WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

async function createCommission(
  commission: Omit<Commission, "createdAt">
): Promise<Commission> {
  if (!usePostgres) {
    const newCommission: Commission = {
      ...commission,
      createdAt: new Date().toISOString(),
    };
    await getJsonDb().transaction((db) => {
      db.commissions.push(newCommission);
    });
    return newCommission;
  }
  const sql = getSql();
  const rows = await sql<Commission[]>`
    INSERT INTO commissions (id, order_id, affiliate_id, program_id, amount, rate, status, paid_at, stripe_transfer_id)
    VALUES (${commission.id}, ${commission.orderId}, ${commission.affiliateId},
            ${commission.programId}, ${commission.amount}, ${commission.rate},
            ${commission.status as string}, ${commission.paidAt}, ${commission.stripeTransferId})
    RETURNING id, order_id AS "orderId", affiliate_id AS "affiliateId",
              program_id AS "programId", amount::float AS amount, rate::float AS rate,
              status, created_at::text AS "createdAt", paid_at::text AS "paidAt",
              stripe_transfer_id AS "stripeTransferId"`;
  return rows[0];
}

async function markCommissionPaid(
  id: string,
  stripeTransferId: string | null
): Promise<Commission | null> {
  if (!usePostgres) {
    let updated: Commission | null = null;
    await getJsonDb().transaction((db) => {
      const c = db.commissions.find((c) => c.id === id);
      if (c) {
        c.status = "paid";
        c.paidAt = new Date().toISOString();
        c.stripeTransferId = stripeTransferId;
        updated = c;
      }
    });
    return updated;
  }
  const sql = getSql();
  const rows = await sql<Commission[]>`
    UPDATE commissions
    SET status = 'paid', paid_at = now(), stripe_transfer_id = ${stripeTransferId}
    WHERE id = ${id}
    RETURNING id, order_id AS "orderId", affiliate_id AS "affiliateId",
              program_id AS "programId", amount::float AS amount, rate::float AS rate,
              status, created_at::text AS "createdAt", paid_at::text AS "paidAt",
              stripe_transfer_id AS "stripeTransferId"`;
  return rows[0] ?? null;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const db = {
  // Legacy JSON helpers (used in page Server Components and old routes)
  read,
  transaction,

  // Users
  findUserByEmail,
  findUserById,
  createUser,

  // Stores
  findStoresByUserId,
  findStoreByDomain,
  findStoreByUserAndDomain,
  upsertStore,

  // Programs
  findProgramsByUserId,
  findProgramById,
  createProgram,

  // Affiliates
  findAffiliatesByProgramId,
  findAffiliateByCode,
  findAffiliateByProgramAndEmail,
  createAffiliate,

  // Clicks
  createClick,
  countClicksByAffiliateId,
  countClicksByProgramId,

  // Orders
  findOrdersByProgramId,
  createOrder,

  // Commissions
  findCommissionsByProgramIds,
  findCommissionsByAffiliateId,
  findCommissionsByProgramId,
  findCommissionById,
  createCommission,
  markCommissionPaid,
};
