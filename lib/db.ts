// auto-generated
/**
 * Data-access layer — inBFF full marketplace platform.
 *
 * Postgres when POSTGRES_URL is set; JSON file fallback for local dev.
 */

import type {
  User, ShopifyStore, ShopifyProduct, AffiliateProgram,
  Affiliate, AffiliateApplication, ReferralClick, Order, Commission,
  UserRole, ProgramStatus, AffiliateStatus, ApplicationStatus,
  MarketplaceProgram, DB,
} from "./types";

// ─── Postgres client ──────────────────────────────────────────────────────────
let _sql: ReturnType<typeof import("postgres")> | null = null;
function getSql() {
  if (!_sql) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("postgres") as typeof import("postgres");
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("POSTGRES_URL is not set");
    _sql = postgres(url, { ssl: "require", max: 10 });
  }
  return _sql;
}
const usePostgres = !!process.env.POSTGRES_URL;

// ─── JSON file fallback ───────────────────────────────────────────────────────
let _jsonDb: (() => DB) | null = null;
let _jsonTx: (<T>(fn: (db: DB) => T) => Promise<T>) | null = null;

function getJson() {
  if (!_jsonDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs   = require("fs")   as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const DB_PATH = path.join(process.cwd(), "data", "db.json");

    function emptyDb(): DB {
      return {
        users: [], stores: [], products: [], programs: [],
        programProducts: [], affiliates: [], applications: [],
        clicks: [], orders: [], commissions: [],
      };
    }

    function readDb(): DB {
      try {
        if (!fs.existsSync(DB_PATH)) {
          const db = emptyDb();
          fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
          fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
          return db;
        }
        const raw = fs.readFileSync(DB_PATH, "utf-8").trim();
        if (!raw) { const db = emptyDb(); fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); return db; }
        const parsed = JSON.parse(raw) as Partial<DB>;
        // Merge with emptyDb so new collections always exist
        return { ...emptyDb(), ...parsed };
      } catch (e) {
        console.warn("[db] db.json parse error, resetting:", e);
        const db = emptyDb();
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        return db;
      }
    }
    function writeDb(db: DB) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

    let queue: Promise<unknown> = Promise.resolve();
    _jsonDb = readDb;
    _jsonTx = function tx<T>(fn: (db: DB) => T): Promise<T> {
      const run = queue.then(() => { const db = readDb(); const r = fn(db); writeDb(db); return r; });
      queue = run.catch(() => {});
      return run;
    };
  }
  return { read: _jsonDb!, tx: _jsonTx! };
}

// Legacy helpers kept for backwards compat
function read(): DB {
  if (usePostgres) throw new Error("db.read() not available with Postgres. Use async helpers.");
  return getJson().read();
}
async function transaction<T>(fn: (db: DB) => T): Promise<T> {
  if (usePostgres) throw new Error("db.transaction() not available with Postgres.");
  return getJson().tx(fn);
}

// ─── Column helpers ───────────────────────────────────────────────────────────
const USER_COLS = `id, email, password_hash AS "passwordHash", name,
  created_at::text AS "createdAt", role,
  email_verified AS "emailVerified",
  verification_token AS "verificationToken",
  verification_token_expiry::text AS "verificationTokenExpiry",
  stripe_account_id AS "stripeAccountId"`;

const PROGRAM_COLS = `id, user_id AS "userId", store_id AS "storeId", name,
  description, category, banner_url AS "bannerUrl",
  commission_rate::float AS "commissionRate",
  program_type AS "programType",
  attribution_window_days AS "attributionWindowDays",
  payout_threshold::float AS "payoutThreshold",
  payout_schedule AS "payoutSchedule", currency, status,
  all_products AS "allProducts", created_at::text AS "createdAt"`;

const AFFILIATE_COLS = `id, program_id AS "programId", user_id AS "userId",
  name, email, referral_code AS "referralCode", status,
  joined_at::text AS "joinedAt"`;

const COMMISSION_COLS = `id, order_id AS "orderId",
  affiliate_id AS "affiliateId", program_id AS "programId",
  amount::float AS amount, rate::float AS rate, status,
  created_at::text AS "createdAt", paid_at::text AS "paidAt",
  stripe_transfer_id AS "stripeTransferId"`;

// ─── Users ────────────────────────────────────────────────────────────────────
async function findUserByEmail(email: string): Promise<User | null> {
  if (!usePostgres) return getJson().read().users.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  const sql = getSql();
  const r = await sql<User[]>`SELECT ${sql.unsafe(USER_COLS)} FROM users WHERE lower(email)=lower(${email}) LIMIT 1`;
  return r[0] ?? null;
}
async function findUserById(id: string): Promise<User | null> {
  if (!usePostgres) return getJson().read().users.find(u => u.id === id) ?? null;
  const sql = getSql();
  const r = await sql<User[]>`SELECT ${sql.unsafe(USER_COLS)} FROM users WHERE id=${id} LIMIT 1`;
  return r[0] ?? null;
}
async function findUserByVerificationToken(token: string): Promise<User | null> {
  if (!usePostgres) return getJson().read().users.find(u => u.verificationToken === token) ?? null;
  const sql = getSql();
  const r = await sql<User[]>`SELECT ${sql.unsafe(USER_COLS)} FROM users WHERE verification_token=${token} LIMIT 1`;
  return r[0] ?? null;
}
async function createUser(user: Omit<User, "createdAt">): Promise<User> {
  if (!usePostgres) {
    const u: User = { ...user, createdAt: new Date().toISOString() };
    await getJson().tx(db => { db.users.push(u); });
    return u;
  }
  const sql = getSql();
  const r = await sql<User[]>`
    INSERT INTO users (id,email,password_hash,name,role,email_verified,verification_token,verification_token_expiry,stripe_account_id)
    VALUES (${user.id},${user.email},${user.passwordHash},${user.name},${user.role as string},
            ${user.emailVerified},${user.verificationToken},${user.verificationTokenExpiry},${user.stripeAccountId})
    RETURNING ${sql.unsafe(USER_COLS)}`;
  return r[0];
}
async function verifyUserEmail(userId: string): Promise<User | null> {
  if (!usePostgres) {
    let updated: User | null = null;
    await getJson().tx(db => { const u = db.users.find(u => u.id === userId); if (u) { u.emailVerified = true; u.verificationToken = null; u.verificationTokenExpiry = null; updated = u; } });
    return updated;
  }
  const sql = getSql();
  const r = await sql<User[]>`UPDATE users SET email_verified=true,verification_token=null,verification_token_expiry=null WHERE id=${userId} RETURNING ${sql.unsafe(USER_COLS)}`;
  return r[0] ?? null;
}
async function updateVerificationToken(userId: string, token: string, expiry: string): Promise<void> {
  if (!usePostgres) { await getJson().tx(db => { const u = db.users.find(u => u.id === userId); if (u) { u.verificationToken = token; u.verificationTokenExpiry = expiry; } }); return; }
  await getSql()`UPDATE users SET verification_token=${token},verification_token_expiry=${expiry} WHERE id=${userId}`;
}
async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  if (!usePostgres) { await getJson().tx(db => { const u = db.users.find(u => u.id === userId); if (u) u.role = role; }); return; }
  await getSql()`UPDATE users SET role=${role as string} WHERE id=${userId}`;
}
async function updateUserStripeAccount(userId: string, stripeAccountId: string): Promise<void> {
  if (!usePostgres) { await getJson().tx(db => { const u = db.users.find(u => u.id === userId); if (u) u.stripeAccountId = stripeAccountId; }); return; }
  await getSql()`UPDATE users SET stripe_account_id=${stripeAccountId} WHERE id=${userId}`;
}

// ─── Stores ───────────────────────────────────────────────────────────────────
async function findStoresByUserId(userId: string): Promise<ShopifyStore[]> {
  if (!usePostgres) return getJson().read().stores.filter(s => s.userId === userId);
  return getSql()<ShopifyStore[]>`SELECT id,user_id AS "userId",shop_domain AS "shopDomain",access_token AS "accessToken",connected_at::text AS "connectedAt" FROM shopify_stores WHERE user_id=${userId}`;
}
async function findStoreByDomain(shopDomain: string): Promise<ShopifyStore | null> {
  if (!usePostgres) return getJson().read().stores.find(s => s.shopDomain === shopDomain) ?? null;
  const r = await getSql()<ShopifyStore[]>`SELECT id,user_id AS "userId",shop_domain AS "shopDomain",access_token AS "accessToken",connected_at::text AS "connectedAt" FROM shopify_stores WHERE shop_domain=${shopDomain} LIMIT 1`;
  return r[0] ?? null;
}
async function findStoreById(id: string): Promise<ShopifyStore | null> {
  if (!usePostgres) return getJson().read().stores.find(s => s.id === id) ?? null;
  const r = await getSql()<ShopifyStore[]>`SELECT id,user_id AS "userId",shop_domain AS "shopDomain",access_token AS "accessToken",connected_at::text AS "connectedAt" FROM shopify_stores WHERE id=${id} LIMIT 1`;
  return r[0] ?? null;
}
async function upsertStore(store: Omit<ShopifyStore, "connectedAt">): Promise<ShopifyStore> {
  if (!usePostgres) {
    let result!: ShopifyStore;
    await getJson().tx(db => {
      const ex = db.stores.find(s => s.userId === store.userId && s.shopDomain === store.shopDomain);
      if (ex) { ex.accessToken = store.accessToken; result = ex; }
      else { const n: ShopifyStore = { ...store, connectedAt: new Date().toISOString() }; db.stores.push(n); result = n; }
    });
    return result;
  }
  const r = await getSql()<ShopifyStore[]>`
    INSERT INTO shopify_stores (id,user_id,shop_domain,access_token) VALUES (${store.id},${store.userId},${store.shopDomain},${store.accessToken})
    ON CONFLICT (user_id,shop_domain) DO UPDATE SET access_token=EXCLUDED.access_token
    RETURNING id,user_id AS "userId",shop_domain AS "shopDomain",access_token AS "accessToken",connected_at::text AS "connectedAt"`;
  return r[0];
}

// ─── Shopify products ─────────────────────────────────────────────────────────
async function findProductsByStoreId(storeId: string): Promise<ShopifyProduct[]> {
  if (!usePostgres) return getJson().read().products.filter(p => p.storeId === storeId);
  return getSql()<ShopifyProduct[]>`SELECT id,store_id AS "storeId",shopify_product_id AS "shopifyProductId",title,image_url AS "imageUrl",price::float AS price,handle,synced_at::text AS "syncedAt" FROM shopify_products WHERE store_id=${storeId} ORDER BY title`;
}
async function upsertProducts(products: Omit<ShopifyProduct, "syncedAt">[]): Promise<void> {
  if (products.length === 0) return;
  if (!usePostgres) {
    await getJson().tx(db => {
      for (const p of products) {
        const ex = db.products.find(x => x.storeId === p.storeId && x.shopifyProductId === p.shopifyProductId);
        if (ex) { Object.assign(ex, p, { syncedAt: new Date().toISOString() }); }
        else { db.products.push({ ...p, syncedAt: new Date().toISOString() }); }
      }
    });
    return;
  }
  const sql = getSql();
  for (const p of products) {
    await sql`INSERT INTO shopify_products (id,store_id,shopify_product_id,title,image_url,price,handle)
      VALUES (${p.id},${p.storeId},${p.shopifyProductId},${p.title},${p.imageUrl},${p.price},${p.handle})
      ON CONFLICT (store_id,shopify_product_id) DO UPDATE SET title=EXCLUDED.title,image_url=EXCLUDED.image_url,price=EXCLUDED.price,handle=EXCLUDED.handle,synced_at=now()`;
  }
}
async function findProgramProductIds(programId: string): Promise<string[]> {
  if (!usePostgres) return getJson().read().programProducts.filter(pp => pp.programId === programId).map(pp => pp.productId);
  const r = await getSql()<{ productId: string }[]>`SELECT product_id AS "productId" FROM program_products WHERE program_id=${programId}`;
  return r.map(x => x.productId);
}
async function setProgramProducts(programId: string, productIds: string[]): Promise<void> {
  if (!usePostgres) {
    await getJson().tx(db => {
      db.programProducts = db.programProducts.filter(pp => pp.programId !== programId);
      for (const pid of productIds) db.programProducts.push({ programId, productId: pid });
    });
    return;
  }
  const sql = getSql();
  await sql`DELETE FROM program_products WHERE program_id=${programId}`;
  for (const pid of productIds) {
    await sql`INSERT INTO program_products (program_id,product_id) VALUES (${programId},${pid}) ON CONFLICT DO NOTHING`;
  }
}

// ─── Programs ─────────────────────────────────────────────────────────────────
async function findProgramsByUserId(userId: string): Promise<AffiliateProgram[]> {
  if (!usePostgres) return getJson().read().programs.filter(p => p.userId === userId && p.status !== "deleted");
  return getSql()<AffiliateProgram[]>`SELECT ${getSql().unsafe(PROGRAM_COLS)} FROM affiliate_programs WHERE user_id=${userId} AND status<>'deleted' ORDER BY created_at DESC`;
}
async function findProgramById(id: string): Promise<AffiliateProgram | null> {
  if (!usePostgres) return getJson().read().programs.find(p => p.id === id && p.status !== "deleted") ?? null;
  const r = await getSql()<AffiliateProgram[]>`SELECT ${getSql().unsafe(PROGRAM_COLS)} FROM affiliate_programs WHERE id=${id} AND status<>'deleted' LIMIT 1`;
  return r[0] ?? null;
}
async function findActivePrograms(opts: { category?: string; minRate?: number; type?: string; sort?: string; search?: string; page?: number; }): Promise<{ programs: MarketplaceProgram[]; total: number }> {
  const { category, minRate, type, sort = "recent", search, page = 1 } = opts;
  const limit = 20; const offset = (page - 1) * limit;
  if (!usePostgres) {
    let list = getJson().read().programs.filter(p => p.status === "active");
    if (category) list = list.filter(p => p.category === category);
    if (minRate)  list = list.filter(p => p.commissionRate >= minRate);
    if (type)     list = list.filter(p => p.programType === type);
    if (search)   list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (sort === "commission") list.sort((a, b) => b.commissionRate - a.commissionRate);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = list.length;
    const stores = getJson().read().stores;
    const affiliates = getJson().read().affiliates;
    const programs: MarketplaceProgram[] = list.slice(offset, offset + limit).map(p => ({
      id: p.id, name: p.name, description: p.description, category: p.category, bannerUrl: p.bannerUrl,
      commissionRate: p.commissionRate, programType: p.programType, attributionWindowDays: p.attributionWindowDays,
      shopDomain: stores.find(s => s.id === p.storeId)?.shopDomain ?? "",
      affiliateCount: affiliates.filter(a => a.programId === p.id && a.status === "active").length,
      createdAt: p.createdAt,
    }));
    return { programs, total };
  }
  const sql = getSql();
  // Build dynamic query
  let whereClause = `ap.status = 'active'`;
  if (category) whereClause += ` AND ap.category = '${category.replace(/'/g, "''")}'`;
  if (minRate)  whereClause += ` AND ap.commission_rate >= ${minRate}`;
  if (type)     whereClause += ` AND ap.program_type = '${type.replace(/'/g, "''")}'`;
  if (search)   whereClause += ` AND (lower(ap.name) LIKE '%${search.toLowerCase().replace(/'/g, "''")}%')`;
  const orderClause = sort === "commission" ? "ap.commission_rate DESC" : sort === "affiliates" ? "aff_count DESC" : "ap.created_at DESC";
  const rows = await sql.unsafe(`
    SELECT ap.id, ap.name, ap.description, ap.category, ap.banner_url AS "bannerUrl",
           ap.commission_rate::float AS "commissionRate", ap.program_type AS "programType",
           ap.attribution_window_days AS "attributionWindowDays",
           ss.shop_domain AS "shopDomain", ap.created_at::text AS "createdAt",
           COUNT(af.id)::int AS "affiliateCount"
    FROM affiliate_programs ap
    JOIN shopify_stores ss ON ss.id = ap.store_id
    LEFT JOIN affiliates af ON af.program_id = ap.id AND af.status = 'active'
    WHERE ${whereClause}
    GROUP BY ap.id, ss.shop_domain
    ORDER BY ${orderClause}
    LIMIT ${limit} OFFSET ${offset}`) as MarketplaceProgram[];
  const countRow = await sql.unsafe(`SELECT COUNT(*)::int AS c FROM affiliate_programs ap WHERE ${whereClause}`) as { c: number }[];
  return { programs: rows, total: countRow[0]?.c ?? 0 };
}
async function createProgram(program: Omit<AffiliateProgram, "createdAt">): Promise<AffiliateProgram> {
  if (!usePostgres) {
    const n: AffiliateProgram = { ...program, createdAt: new Date().toISOString() };
    await getJson().tx(db => { db.programs.push(n); });
    return n;
  }
  const sql = getSql();
  const r = await sql<AffiliateProgram[]>`
    INSERT INTO affiliate_programs (id,user_id,store_id,name,description,category,banner_url,commission_rate,program_type,attribution_window_days,payout_threshold,payout_schedule,currency,status,all_products)
    VALUES (${program.id},${program.userId},${program.storeId},${program.name},${program.description},${program.category},${program.bannerUrl},${program.commissionRate},${program.programType as string},${program.attributionWindowDays},${program.payoutThreshold},${program.payoutSchedule as string},${program.currency},${program.status as string},${program.allProducts})
    RETURNING ${sql.unsafe(PROGRAM_COLS)}`;
  return r[0];
}
async function updateProgram(id: string, fields: Partial<Omit<AffiliateProgram, "id" | "userId" | "storeId" | "createdAt">>): Promise<AffiliateProgram | null> {
  if (!usePostgres) {
    let updated: AffiliateProgram | null = null;
    await getJson().tx(db => { const p = db.programs.find(p => p.id === id); if (p) { Object.assign(p, fields); updated = p; } });
    return updated;
  }
  const sql = getSql();
  // Build SET clause from fields
  const sets: string[] = [];
  const vals: (string | number | boolean | null)[] = [];
  let i = 1;
  const colMap: Record<string, string> = {
    name: "name", description: "description", category: "category", bannerUrl: "banner_url",
    commissionRate: "commission_rate", programType: "program_type", attributionWindowDays: "attribution_window_days",
    payoutThreshold: "payout_threshold", payoutSchedule: "payout_schedule", currency: "currency",
    status: "status", allProducts: "all_products",
  };
  for (const [k, v] of Object.entries(fields)) {
    const col = colMap[k];
    if (col) { sets.push(`${col} = $${i++}`); vals.push(v); }
  }
  if (sets.length === 0) return findProgramById(id);
  vals.push(id);
  const r = await sql.unsafe<AffiliateProgram[]>(`UPDATE affiliate_programs SET ${sets.join(", ")} WHERE id = $${i} RETURNING ${PROGRAM_COLS}`, vals);
  return r[0] ?? null;
}
async function getMarketplaceStats(): Promise<{ totalPrograms: number; totalAffiliates: number; totalPaid: number }> {
  if (!usePostgres) {
    const db = getJson().read();
    return {
      totalPrograms: db.programs.filter(p => p.status === "active").length,
      totalAffiliates: db.affiliates.filter(a => a.status === "active").length,
      totalPaid: db.commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0),
    };
  }
  const sql = getSql();
  const r = await sql<{ totalPrograms: number; totalAffiliates: number; totalPaid: number }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM affiliate_programs WHERE status='active') AS "totalPrograms",
      (SELECT COUNT(*)::int FROM affiliates WHERE status='active')         AS "totalAffiliates",
      (SELECT COALESCE(SUM(amount),0)::float FROM commissions WHERE status='paid') AS "totalPaid"`;
  return r[0];
}

// ─── Affiliates ───────────────────────────────────────────────────────────────
async function findAffiliatesByProgramId(programId: string): Promise<Affiliate[]> {
  if (!usePostgres) return getJson().read().affiliates.filter(a => a.programId === programId);
  return getSql()<Affiliate[]>`SELECT ${getSql().unsafe(AFFILIATE_COLS)} FROM affiliates WHERE program_id=${programId} ORDER BY joined_at DESC`;
}
async function findAffiliateByCode(code: string): Promise<Affiliate | null> {
  if (!usePostgres) return getJson().read().affiliates.find(a => a.referralCode === code && a.status === "active") ?? null;
  const r = await getSql()<Affiliate[]>`SELECT ${getSql().unsafe(AFFILIATE_COLS)} FROM affiliates WHERE referral_code=${code} AND status='active' LIMIT 1`;
  return r[0] ?? null;
}
async function findAffiliateByProgramAndEmail(programId: string, email: string): Promise<Affiliate | null> {
  if (!usePostgres) return getJson().read().affiliates.find(a => a.programId === programId && a.email.toLowerCase() === email.toLowerCase()) ?? null;
  const r = await getSql()<Affiliate[]>`SELECT ${getSql().unsafe(AFFILIATE_COLS)} FROM affiliates WHERE program_id=${programId} AND lower(email)=lower(${email}) LIMIT 1`;
  return r[0] ?? null;
}
async function findAffiliatesByUserId(userId: string): Promise<Affiliate[]> {
  if (!usePostgres) return getJson().read().affiliates.filter(a => a.userId === userId);
  return getSql()<Affiliate[]>`SELECT ${getSql().unsafe(AFFILIATE_COLS)} FROM affiliates WHERE user_id=${userId} ORDER BY joined_at DESC`;
}
async function createAffiliate(affiliate: Omit<Affiliate, "joinedAt">): Promise<Affiliate> {
  if (!usePostgres) {
    const n: Affiliate = { ...affiliate, joinedAt: new Date().toISOString() };
    await getJson().tx(db => { db.affiliates.push(n); });
    return n;
  }
  const r = await getSql()<Affiliate[]>`
    INSERT INTO affiliates (id,program_id,user_id,name,email,referral_code,status)
    VALUES (${affiliate.id},${affiliate.programId},${affiliate.userId},${affiliate.name},${affiliate.email},${affiliate.referralCode},${affiliate.status})
    RETURNING ${getSql().unsafe(AFFILIATE_COLS)}`;
  return r[0];
}
async function updateAffiliateStatus(id: string, status: AffiliateStatus): Promise<void> {
  if (!usePostgres) { await getJson().tx(db => { const a = db.affiliates.find(a => a.id === id); if (a) a.status = status; }); return; }
  await getSql()`UPDATE affiliates SET status=${status as string} WHERE id=${id}`;
}

// ─── Applications ─────────────────────────────────────────────────────────────
async function findApplicationsByProgramId(programId: string, status?: ApplicationStatus): Promise<AffiliateApplication[]> {
  if (!usePostgres) {
    let list = getJson().read().applications.filter(a => a.programId === programId);
    if (status) list = list.filter(a => a.status === status);
    return list.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  }
  if (status) return getSql()<AffiliateApplication[]>`SELECT id,program_id AS "programId",user_id AS "userId",status,pitch,applied_at::text AS "appliedAt",reviewed_at::text AS "reviewedAt" FROM affiliate_applications WHERE program_id=${programId} AND status=${status as string} ORDER BY applied_at DESC`;
  return getSql()<AffiliateApplication[]>`SELECT id,program_id AS "programId",user_id AS "userId",status,pitch,applied_at::text AS "appliedAt",reviewed_at::text AS "reviewedAt" FROM affiliate_applications WHERE program_id=${programId} ORDER BY applied_at DESC`;
}
async function findApplicationByProgramAndUser(programId: string, userId: string): Promise<AffiliateApplication | null> {
  if (!usePostgres) return getJson().read().applications.find(a => a.programId === programId && a.userId === userId) ?? null;
  const r = await getSql()<AffiliateApplication[]>`SELECT id,program_id AS "programId",user_id AS "userId",status,pitch,applied_at::text AS "appliedAt",reviewed_at::text AS "reviewedAt" FROM affiliate_applications WHERE program_id=${programId} AND user_id=${userId} LIMIT 1`;
  return r[0] ?? null;
}
async function createApplication(app: Omit<AffiliateApplication, "appliedAt" | "reviewedAt">): Promise<AffiliateApplication> {
  if (!usePostgres) {
    const n: AffiliateApplication = { ...app, appliedAt: new Date().toISOString(), reviewedAt: null };
    await getJson().tx(db => { db.applications.push(n); });
    return n;
  }
  const r = await getSql()<AffiliateApplication[]>`
    INSERT INTO affiliate_applications (id,program_id,user_id,status,pitch) VALUES (${app.id},${app.programId},${app.userId},${app.status},${app.pitch})
    RETURNING id,program_id AS "programId",user_id AS "userId",status,pitch,applied_at::text AS "appliedAt",reviewed_at::text AS "reviewedAt"`;
  return r[0];
}
async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<AffiliateApplication | null> {
  if (!usePostgres) {
    let updated: AffiliateApplication | null = null;
    await getJson().tx(db => { const a = db.applications.find(a => a.id === id); if (a) { a.status = status; a.reviewedAt = new Date().toISOString(); updated = a; } });
    return updated;
  }
  const r = await getSql()<AffiliateApplication[]>`UPDATE affiliate_applications SET status=${status as string},reviewed_at=now() WHERE id=${id} RETURNING id,program_id AS "programId",user_id AS "userId",status,pitch,applied_at::text AS "appliedAt",reviewed_at::text AS "reviewedAt"`;
  return r[0] ?? null;
}

// ─── Clicks ───────────────────────────────────────────────────────────────────
async function createClick(click: Omit<ReferralClick, "createdAt">): Promise<ReferralClick> {
  if (!usePostgres) {
    const n: ReferralClick = { ...click, createdAt: new Date().toISOString() };
    await getJson().tx(db => { db.clicks.push(n); });
    return n;
  }
  const r = await getSql()<ReferralClick[]>`
    INSERT INTO referral_clicks (id,referral_code,affiliate_id,program_id,ip_address,user_agent)
    VALUES (${click.id},${click.referralCode},${click.affiliateId},${click.programId},${click.ipAddress},${click.userAgent})
    RETURNING id,referral_code AS "referralCode",affiliate_id AS "affiliateId",program_id AS "programId",ip_address AS "ipAddress",user_agent AS "userAgent",created_at::text AS "createdAt"`;
  return r[0];
}
async function countClicksByAffiliateId(affiliateId: string): Promise<number> {
  if (!usePostgres) return getJson().read().clicks.filter(c => c.affiliateId === affiliateId).length;
  const r = await getSql()<{ c: string }[]>`SELECT count(*)::text AS c FROM referral_clicks WHERE affiliate_id=${affiliateId}`;
  return parseInt(r[0].c, 10);
}
async function countClicksByProgramId(programId: string): Promise<number> {
  if (!usePostgres) return getJson().read().clicks.filter(c => c.programId === programId).length;
  const r = await getSql()<{ c: string }[]>`SELECT count(*)::text AS c FROM referral_clicks WHERE program_id=${programId}`;
  return parseInt(r[0].c, 10);
}
async function findLatestClickByCode(referralCode: string): Promise<ReferralClick | null> {
  if (!usePostgres) {
    const clicks = getJson().read().clicks.filter(c => c.referralCode === referralCode).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return clicks[0] ?? null;
  }
  const r = await getSql()<ReferralClick[]>`SELECT id,referral_code AS "referralCode",affiliate_id AS "affiliateId",program_id AS "programId",ip_address AS "ipAddress",user_agent AS "userAgent",created_at::text AS "createdAt" FROM referral_clicks WHERE referral_code=${referralCode} ORDER BY created_at DESC LIMIT 1`;
  return r[0] ?? null;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
async function findOrdersByProgramId(programId: string): Promise<Order[]> {
  if (!usePostgres) return getJson().read().orders.filter(o => o.programId === programId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return getSql()<Order[]>`SELECT id,program_id AS "programId",store_id AS "storeId",shopify_order_id AS "shopifyOrderId",referral_code AS "referralCode",affiliate_id AS "affiliateId",amount::float AS amount,currency,created_at::text AS "createdAt" FROM orders WHERE program_id=${programId} ORDER BY created_at DESC`;
}
async function createOrder(order: Omit<Order, "createdAt">): Promise<Order> {
  if (!usePostgres) {
    let result!: Order;
    await getJson().tx(db => {
      // Idempotent — same storeId + shopifyOrderId returns existing (mirrors Postgres ON CONFLICT DO NOTHING)
      const dup = db.orders.find(o => o.storeId === order.storeId && o.shopifyOrderId === order.shopifyOrderId);
      if (dup) { result = dup; return; }
      const n: Order = { ...order, createdAt: new Date().toISOString() };
      db.orders.push(n);
      result = n;
    });
    return result;
  }
  const r = await getSql()<Order[]>`
    INSERT INTO orders (id,program_id,store_id,shopify_order_id,referral_code,affiliate_id,amount,currency)
    VALUES (${order.id},${order.programId},${order.storeId},${order.shopifyOrderId},${order.referralCode},${order.affiliateId},${order.amount},${order.currency})
    ON CONFLICT (store_id,shopify_order_id) DO NOTHING
    RETURNING id,program_id AS "programId",store_id AS "storeId",shopify_order_id AS "shopifyOrderId",referral_code AS "referralCode",affiliate_id AS "affiliateId",amount::float AS amount,currency,created_at::text AS "createdAt"`;
  return r[0];
}

// ─── Commissions ──────────────────────────────────────────────────────────────
async function findCommissionsByProgramIds(programIds: string[]): Promise<Commission[]> {
  if (programIds.length === 0) return [];
  if (!usePostgres) { const ids = new Set(programIds); return getJson().read().commissions.filter(c => ids.has(c.programId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  return getSql()<Commission[]>`SELECT ${getSql().unsafe(COMMISSION_COLS)} FROM commissions WHERE program_id=ANY(${programIds}) ORDER BY created_at DESC`;
}
async function findCommissionsByProgramId(programId: string): Promise<Commission[]> {
  if (!usePostgres) return getJson().read().commissions.filter(c => c.programId === programId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return getSql()<Commission[]>`SELECT ${getSql().unsafe(COMMISSION_COLS)} FROM commissions WHERE program_id=${programId} ORDER BY created_at DESC`;
}
async function findCommissionsByAffiliateId(affiliateId: string): Promise<Commission[]> {
  if (!usePostgres) return getJson().read().commissions.filter(c => c.affiliateId === affiliateId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return getSql()<Commission[]>`SELECT ${getSql().unsafe(COMMISSION_COLS)} FROM commissions WHERE affiliate_id=${affiliateId} ORDER BY created_at DESC`;
}
async function findCommissionById(id: string): Promise<Commission | null> {
  if (!usePostgres) return getJson().read().commissions.find(c => c.id === id) ?? null;
  const r = await getSql()<Commission[]>`SELECT ${getSql().unsafe(COMMISSION_COLS)} FROM commissions WHERE id=${id} LIMIT 1`;
  return r[0] ?? null;
}
async function createCommission(commission: Omit<Commission, "createdAt">): Promise<Commission> {
  if (!usePostgres) {
    const n: Commission = { ...commission, createdAt: new Date().toISOString() };
    await getJson().tx(db => { db.commissions.push(n); });
    return n;
  }
  const r = await getSql()<Commission[]>`
    INSERT INTO commissions (id,order_id,affiliate_id,program_id,amount,rate,status,paid_at,stripe_transfer_id)
    VALUES (${commission.id},${commission.orderId},${commission.affiliateId},${commission.programId},${commission.amount},${commission.rate},${commission.status as string},${commission.paidAt},${commission.stripeTransferId})
    RETURNING ${getSql().unsafe(COMMISSION_COLS)}`;
  return r[0];
}
async function markCommissionPaid(id: string, stripeTransferId: string | null): Promise<Commission | null> {
  if (!usePostgres) {
    let updated: Commission | null = null;
    await getJson().tx(db => { const c = db.commissions.find(c => c.id === id); if (c) { c.status = "paid"; c.paidAt = new Date().toISOString(); c.stripeTransferId = stripeTransferId; updated = c; } });
    return updated;
  }
  const r = await getSql()<Commission[]>`UPDATE commissions SET status='paid',paid_at=now(),stripe_transfer_id=${stripeTransferId} WHERE id=${id} RETURNING ${getSql().unsafe(COMMISSION_COLS)}`;
  return r[0] ?? null;
}
async function findPendingCommissionsByAffiliateAndProgram(affiliateId: string, programId: string): Promise<Commission[]> {
  if (!usePostgres) return getJson().read().commissions.filter(c => c.affiliateId === affiliateId && c.programId === programId && c.status === "pending");
  return getSql()<Commission[]>`SELECT ${getSql().unsafe(COMMISSION_COLS)} FROM commissions WHERE affiliate_id=${affiliateId} AND program_id=${programId} AND status='pending'`;
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export const db = {
  read, transaction,
  // Users
  findUserByEmail, findUserById, findUserByVerificationToken,
  createUser, verifyUserEmail, updateVerificationToken,
  updateUserRole, updateUserStripeAccount,
  // Stores
  findStoresByUserId, findStoreByDomain, findStoreById, upsertStore,
  // Products
  findProductsByStoreId, upsertProducts,
  findProgramProductIds, setProgramProducts,
  // Programs
  findProgramsByUserId, findProgramById, findActivePrograms,
  createProgram, updateProgram, getMarketplaceStats,
  // Affiliates
  findAffiliatesByProgramId, findAffiliateByCode,
  findAffiliateByProgramAndEmail, findAffiliatesByUserId,
  createAffiliate, updateAffiliateStatus,
  // Applications
  findApplicationsByProgramId, findApplicationByProgramAndUser,
  createApplication, updateApplicationStatus,
  // Clicks
  createClick, countClicksByAffiliateId, countClicksByProgramId, findLatestClickByCode,
  // Orders
  findOrdersByProgramId, createOrder,
  // Commissions
  findCommissionsByProgramIds, findCommissionsByProgramId,
  findCommissionsByAffiliateId, findCommissionById,
  createCommission, markCommissionPaid,
  findPendingCommissionsByAffiliateAndProgram,
};
