/**
 * Data-access layer — inBFF affiliate platform
 * MySQL 8+ when MYSQL_URL is set (mysql://user:pass@host:3306/db)
 * JSON file fallback for local dev when MYSQL_URL is not set.
 * All MySQL queries use prepared statements — no SQL injection risk.
 */
import type {
  User, ShopifyStore, ShopifyProduct, AffiliateProgram,
  Affiliate, AffiliateApplication, ReferralClick, Order, Commission,
  UserRole, AffiliateStatus, ApplicationStatus, MarketplaceProgram, DB,
} from './types';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ─── MySQL pool ───────────────────────────────────────────────────────────────
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mysql = require('mysql2/promise') as typeof import('mysql2/promise');
    const url = process.env.MYSQL_URL;
    if (!url) throw new Error('MYSQL_URL is not set');
    _pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      timezone: 'Z',
      decimalNumbers: true,
      dateStrings: true,
      ssl: process.env.MYSQL_SSL === 'false' ? undefined : { rejectUnauthorized: false },
    });
  }
  return _pool;
}
const useMySQL = !!process.env.MYSQL_URL;

/** Execute a SELECT — returns typed rows */
async function q<T extends RowDataPacket>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await getPool().execute<T[]>(sql, params ?? []);
  return rows;
}
/** Execute INSERT / UPDATE / DELETE — returns ResultSetHeader */
async function exec(sql: string, params?: unknown[]): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params ?? []);
  return result;
}

// ─── JSON file fallback ───────────────────────────────────────────────────────
let _jsonDb: (() => DB) | null = null;
let _jsonTx: (<T>(fn: (db: DB) => T) => Promise<T>) | null = null;

function getJson(): { read: () => DB; tx: <T>(fn: (db: DB) => T) => Promise<T> } {
  if (!_jsonDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs   = require('fs')   as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

    const empty = (): DB => ({
      users: [], stores: [], products: [], programs: [],
      programProducts: [], affiliates: [], applications: [],
      clicks: [], orders: [], commissions: [],
    });

    const readDb = (): DB => {
      try {
        if (!fs.existsSync(DB_PATH)) {
          const d = empty();
          fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
          fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2));
          return d;
        }
        const raw = fs.readFileSync(DB_PATH, 'utf-8').trim();
        if (!raw) { const d = empty(); fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2)); return d; }
        return { ...empty(), ...(JSON.parse(raw) as Partial<DB>) };
      } catch (e) {
        console.warn('[db] db.json parse error, resetting:', e);
        const d = empty();
        fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2));
        return d;
      }
    };
    const writeDb = (db: DB) => fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    let queue: Promise<unknown> = Promise.resolve();
    _jsonDb = readDb;
    _jsonTx = <T>(fn: (db: DB) => T): Promise<T> => {
      const run = queue.then(() => { const db = readDb(); const r = fn(db); writeDb(db); return r; });
      queue = run.catch(() => {});
      return run;
    };
  }
  return { read: _jsonDb!, tx: _jsonTx! };
}

/** @deprecated use async helpers — only valid without MySQL */
export function read(): DB {
  if (useMySQL) throw new Error('read() is not available with MySQL. Use async helpers.');
  return getJson().read();
}
/** @deprecated use async helpers — only valid without MySQL */
export async function transaction<T>(fn: (db: DB) => T): Promise<T> {
  if (useMySQL) throw new Error('transaction() is not available with MySQL.');
  return getJson().tx(fn);
}

// ─── Column helpers (MySQL uses backtick-quoted aliases) ──────────────────────
// MySQL returns column names as declared; we alias camelCase via AS.
// dateStrings:true means DATETIME fields come back as 'YYYY-MM-DD HH:MM:SS.mmm'

// ─── Users ────────────────────────────────────────────────────────────────────
interface UserRow extends RowDataPacket {
  id: string; email: string; passwordHash: string; name: string;
  createdAt: string; role: string; emailVerified: number;
  verificationToken: string | null; verificationTokenExpiry: string | null;
  stripeAccountId: string | null;
}

function rowToUser(r: UserRow): User {
  return {
    id: r.id, email: r.email, passwordHash: r.passwordHash, name: r.name,
    createdAt: r.createdAt, role: r.role as UserRole,
    emailVerified: !!r.emailVerified,
    verificationToken: r.verificationToken,
    verificationTokenExpiry: r.verificationTokenExpiry,
    stripeAccountId: r.stripeAccountId,
  };
}

const USER_SELECT = `
  id, email, password_hash AS passwordHash, name,
  created_at AS createdAt, role,
  email_verified AS emailVerified,
  verification_token AS verificationToken,
  verification_token_expiry AS verificationTokenExpiry,
  stripe_account_id AS stripeAccountId`;

export async function findUserByEmail(email: string): Promise<User | null> {
  if (!useMySQL) return getJson().read().users.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  const rows = await q<UserRow>(`SELECT ${USER_SELECT} FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1`, [email]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (!useMySQL) return getJson().read().users.find(u => u.id === id) ?? null;
  const rows = await q<UserRow>(`SELECT ${USER_SELECT} FROM users WHERE id=? LIMIT 1`, [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function findUserByVerificationToken(token: string): Promise<User | null> {
  if (!useMySQL) return getJson().read().users.find(u => u.verificationToken === token) ?? null;
  const rows = await q<UserRow>(`SELECT ${USER_SELECT} FROM users WHERE verification_token=? LIMIT 1`, [token]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function createUser(user: Omit<User, 'createdAt'>): Promise<User> {
  if (!useMySQL) {
    const u: User = { ...user, createdAt: new Date().toISOString() };
    await getJson().tx(db => { db.users.push(u); });
    return u;
  }
  await exec(
    `INSERT INTO users (id,email,password_hash,name,role,email_verified,verification_token,verification_token_expiry,stripe_account_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [user.id, user.email, user.passwordHash, user.name, user.role,
     user.emailVerified ? 1 : 0, user.verificationToken,
     user.verificationTokenExpiry, user.stripeAccountId]
  );
  return (await findUserById(user.id))!;
}

export async function verifyUserEmail(userId: string): Promise<User | null> {
  if (!useMySQL) {
    let updated: User | null = null;
    await getJson().tx(db => {
      const u = db.users.find(u => u.id === userId);
      if (u) { u.emailVerified = true; u.verificationToken = null; u.verificationTokenExpiry = null; updated = u; }
    });
    return updated;
  }
  await exec(`UPDATE users SET email_verified=1, verification_token=NULL, verification_token_expiry=NULL WHERE id=?`, [userId]);
  return findUserById(userId);
}

export async function updateVerificationToken(userId: string, token: string, expiry: string): Promise<void> {
  if (!useMySQL) {
    await getJson().tx(db => {
      const u = db.users.find(u => u.id === userId);
      if (u) { u.verificationToken = token; u.verificationTokenExpiry = expiry; }
    });
    return;
  }
  await exec(`UPDATE users SET verification_token=?, verification_token_expiry=? WHERE id=?`, [token, expiry, userId]);
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  if (!useMySQL) {
    await getJson().tx(db => { const u = db.users.find(u => u.id === userId); if (u) u.role = role; });
    return;
  }
  await exec(`UPDATE users SET role=? WHERE id=?`, [role, userId]);
}

export async function updateUserStripeAccount(userId: string, stripeAccountId: string): Promise<void> {
  if (!useMySQL) {
    await getJson().tx(db => { const u = db.users.find(u => u.id === userId); if (u) u.stripeAccountId = stripeAccountId; });
    return;
  }
  await exec(`UPDATE users SET stripe_account_id=? WHERE id=?`, [stripeAccountId, userId]);
}

// ─── Stores ───────────────────────────────────────────────────────────────────
interface StoreRow extends RowDataPacket {
  id: string; userId: string; shopDomain: string;
  accessToken: string | null; webhookSecret: string | null; connectedAt: string;
}
const STORE_SELECT = `id, user_id AS userId, shop_domain AS shopDomain, access_token AS accessToken, webhook_secret AS webhookSecret, connected_at AS connectedAt`;

export async function findStoresByUserId(userId: string): Promise<ShopifyStore[]> {
  if (!useMySQL) return getJson().read().stores.filter(s => s.userId === userId);
  return q<StoreRow>(`SELECT ${STORE_SELECT} FROM shopify_stores WHERE user_id=?`, [userId]);
}

export async function findStoreByDomain(shopDomain: string): Promise<ShopifyStore | null> {
  if (!useMySQL) return getJson().read().stores.find(s => s.shopDomain === shopDomain) ?? null;
  const rows = await q<StoreRow>(`SELECT ${STORE_SELECT} FROM shopify_stores WHERE shop_domain=? LIMIT 1`, [shopDomain]);
  return rows[0] ?? null;
}

export async function findStoreById(id: string): Promise<ShopifyStore | null> {
  if (!useMySQL) return getJson().read().stores.find(s => s.id === id) ?? null;
  const rows = await q<StoreRow>(`SELECT ${STORE_SELECT} FROM shopify_stores WHERE id=? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function upsertStore(store: Omit<ShopifyStore, 'connectedAt'>): Promise<ShopifyStore> {
  if (!useMySQL) {
    let result!: ShopifyStore;
    await getJson().tx(db => {
      const ex = db.stores.find(s => s.userId === store.userId && s.shopDomain === store.shopDomain);
      if (ex) {
        ex.accessToken = store.accessToken;
        if (store.webhookSecret) ex.webhookSecret = store.webhookSecret;
        result = ex;
      } else {
        const n: ShopifyStore = { ...store, webhookSecret: store.webhookSecret ?? null, connectedAt: new Date().toISOString() };
        db.stores.push(n);
        result = n;
      }
    });
    return result;
  }
  await exec(
    `INSERT INTO shopify_stores (id, user_id, shop_domain, access_token, webhook_secret)
     VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       access_token   = VALUES(access_token),
       webhook_secret = COALESCE(VALUES(webhook_secret), webhook_secret)`,
    [store.id, store.userId, store.shopDomain, store.accessToken, store.webhookSecret ?? null]
  );
  return (await findStoreById(store.id))!;
}

// ─── Shopify products ─────────────────────────────────────────────────────────
interface ProductRow extends RowDataPacket {
  id: string; storeId: string; shopifyProductId: string;
  title: string; imageUrl: string | null; price: number | null;
  handle: string; syncedAt: string;
}
const PRODUCT_SELECT = `id, store_id AS storeId, shopify_product_id AS shopifyProductId, title, image_url AS imageUrl, price, handle, synced_at AS syncedAt`;

export async function findProductsByStoreId(storeId: string): Promise<ShopifyProduct[]> {
  if (!useMySQL) return getJson().read().products.filter(p => p.storeId === storeId);
  return q<ProductRow>(`SELECT ${PRODUCT_SELECT} FROM shopify_products WHERE store_id=? ORDER BY title`, [storeId]);
}

export async function upsertProducts(products: Omit<ShopifyProduct, 'syncedAt'>[]): Promise<void> {
  if (products.length === 0) return;
  if (!useMySQL) {
    await getJson().tx(db => {
      for (const p of products) {
        const ex = db.products.find(x => x.storeId === p.storeId && x.shopifyProductId === p.shopifyProductId);
        if (ex) { Object.assign(ex, p, { syncedAt: new Date().toISOString() }); }
        else { db.products.push({ ...p, syncedAt: new Date().toISOString() }); }
      }
    });
    return;
  }
  for (const p of products) {
    await exec(
      `INSERT INTO shopify_products (id,store_id,shopify_product_id,title,image_url,price,handle)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), image_url=VALUES(image_url), price=VALUES(price), handle=VALUES(handle), synced_at=CURRENT_TIMESTAMP(3)`,
      [p.id, p.storeId, p.shopifyProductId, p.title, p.imageUrl, p.price, p.handle]
    );
  }
}

export async function findProgramProductIds(programId: string): Promise<string[]> {
  if (!useMySQL) return getJson().read().programProducts.filter(pp => pp.programId === programId).map(pp => pp.productId);
  const rows = await q<{ productId: string } & RowDataPacket>(`SELECT product_id AS productId FROM program_products WHERE program_id=?`, [programId]);
  return rows.map(r => r.productId);
}

export async function setProgramProducts(programId: string, productIds: string[]): Promise<void> {
  if (!useMySQL) {
    await getJson().tx(db => {
      db.programProducts = db.programProducts.filter(pp => pp.programId !== programId);
      for (const pid of productIds) db.programProducts.push({ programId, productId: pid });
    });
    return;
  }
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(`DELETE FROM program_products WHERE program_id=?`, [programId]);
    for (const pid of productIds) {
      await conn.execute(`INSERT IGNORE INTO program_products (program_id,product_id) VALUES (?,?)`, [programId, pid]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ─── Programs ─────────────────────────────────────────────────────────────────
interface ProgramRow extends RowDataPacket {
  id: string; userId: string; storeId: string; name: string;
  description: string | null; category: string; bannerUrl: string | null;
  commissionRate: number; programType: string; attributionWindowDays: number;
  payoutThreshold: number; payoutSchedule: string; currency: string;
  status: string; allProducts: number; createdAt: string;
}
function rowToProgram(r: ProgramRow): AffiliateProgram {
  return { ...r, allProducts: !!r.allProducts } as unknown as AffiliateProgram;
}
const PROGRAM_SELECT = `
  id, user_id AS userId, store_id AS storeId, name, description, category,
  banner_url AS bannerUrl, commission_rate AS commissionRate,
  program_type AS programType, attribution_window_days AS attributionWindowDays,
  payout_threshold AS payoutThreshold, payout_schedule AS payoutSchedule,
  currency, status, all_products AS allProducts, created_at AS createdAt`;

export async function findProgramsByUserId(userId: string): Promise<AffiliateProgram[]> {
  if (!useMySQL) return getJson().read().programs.filter(p => p.userId === userId && p.status !== 'deleted');
  const rows = await q<ProgramRow>(`SELECT ${PROGRAM_SELECT} FROM affiliate_programs WHERE user_id=? AND status<>'deleted' ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToProgram);
}

export async function findProgramById(id: string): Promise<AffiliateProgram | null> {
  if (!useMySQL) return getJson().read().programs.find(p => p.id === id && p.status !== 'deleted') ?? null;
  const rows = await q<ProgramRow>(`SELECT ${PROGRAM_SELECT} FROM affiliate_programs WHERE id=? AND status<>'deleted' LIMIT 1`, [id]);
  return rows[0] ? rowToProgram(rows[0]) : null;
}

export async function findActivePrograms(opts: {
  category?: string; minRate?: number; type?: string;
  sort?: string; search?: string; page?: number;
}): Promise<{ programs: MarketplaceProgram[]; total: number }> {
  const { category, minRate, type, sort = 'recent', search, page = 1 } = opts;
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!useMySQL) {
    let list = getJson().read().programs.filter(p => p.status === 'active');
    if (category) list = list.filter(p => p.category === category);
    if (minRate)  list = list.filter(p => p.commissionRate >= minRate);
    if (type)     list = list.filter(p => p.programType === type);
    if (search)   list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase()));
    if (sort === 'commission') list.sort((a, b) => b.commissionRate - a.commissionRate);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = list.length;
    const { stores, affiliates } = getJson().read();
    const programs: MarketplaceProgram[] = list.slice(offset, offset + limit).map(p => ({
      id: p.id, name: p.name, description: p.description, category: p.category, bannerUrl: p.bannerUrl,
      commissionRate: p.commissionRate, programType: p.programType, attributionWindowDays: p.attributionWindowDays,
      shopDomain: stores.find(s => s.id === p.storeId)?.shopDomain ?? '',
      affiliateCount: affiliates.filter(a => a.programId === p.id && a.status === 'active').length,
      createdAt: p.createdAt,
    }));
    return { programs, total };
  }

  const conditions: string[] = [`ap.status = 'active'`];
  const values: unknown[] = [];
  if (category) { conditions.push(`ap.category = ?`);           values.push(category); }
  if (minRate)  { conditions.push(`ap.commission_rate >= ?`);    values.push(minRate); }
  if (type)     { conditions.push(`ap.program_type = ?`);        values.push(type); }
  if (search)   { conditions.push(`(LOWER(ap.name) LIKE ? OR LOWER(ap.description) LIKE ?)`); const s = `%${search.toLowerCase()}%`; values.push(s, s); }

  const where = conditions.join(' AND ');
  const order = sort === 'commission' ? 'ap.commission_rate DESC'
              : sort === 'affiliates' ? 'aff_count DESC'
              : 'ap.created_at DESC';

  interface MarketRow extends RowDataPacket {
    id: string; name: string; description: string | null; category: string;
    bannerUrl: string | null; commissionRate: number; programType: string;
    attributionWindowDays: number; shopDomain: string; createdAt: string; affiliateCount: number;
  }
  const programs = await q<MarketRow>(`
    SELECT ap.id, ap.name, ap.description, ap.category,
           ap.banner_url AS bannerUrl,
           ap.commission_rate AS commissionRate,
           ap.program_type AS programType,
           ap.attribution_window_days AS attributionWindowDays,
           ss.shop_domain AS shopDomain,
           ap.created_at AS createdAt,
           COUNT(af.id) AS affiliateCount
    FROM affiliate_programs ap
    JOIN shopify_stores ss ON ss.id = ap.store_id
    LEFT JOIN affiliates af ON af.program_id = ap.id AND af.status = 'active'
    WHERE ${where}
    GROUP BY ap.id, ss.shop_domain
    ORDER BY ${order}
    LIMIT ? OFFSET ?`, [...values, limit, offset]);

  interface CountRow extends RowDataPacket { c: number; }
  const countRows = await q<CountRow>(`SELECT COUNT(*) AS c FROM affiliate_programs ap WHERE ${where}`, values);
  return { programs: programs as unknown as MarketplaceProgram[], total: countRows[0]?.c ?? 0 };
}

export async function createProgram(program: Omit<AffiliateProgram, 'createdAt'>): Promise<AffiliateProgram> {
  if (!useMySQL) {
    const n: AffiliateProgram = { ...program, createdAt: new Date().toISOString() };
    await getJson().tx(db => { db.programs.push(n); });
    return n;
  }
  await exec(
    `INSERT INTO affiliate_programs (id,user_id,store_id,name,description,category,banner_url,commission_rate,program_type,attribution_window_days,payout_threshold,payout_schedule,currency,status,all_products)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [program.id, program.userId, program.storeId, program.name, program.description,
     program.category, program.bannerUrl, program.commissionRate, program.programType,
     program.attributionWindowDays, program.payoutThreshold, program.payoutSchedule,
     program.currency, program.status, program.allProducts ? 1 : 0]
  );
  return (await findProgramById(program.id))!;
}

export async function updateProgram(
  id: string,
  fields: Partial<Omit<AffiliateProgram, 'id' | 'userId' | 'storeId' | 'createdAt'>>
): Promise<AffiliateProgram | null> {
  if (!useMySQL) {
    let updated: AffiliateProgram | null = null;
    await getJson().tx(db => { const p = db.programs.find(p => p.id === id); if (p) { Object.assign(p, fields); updated = p; } });
    return updated;
  }
  const colMap: Record<string, string> = {
    name: 'name', description: 'description', category: 'category', bannerUrl: 'banner_url',
    commissionRate: 'commission_rate', programType: 'program_type',
    attributionWindowDays: 'attribution_window_days', payoutThreshold: 'payout_threshold',
    payoutSchedule: 'payout_schedule', currency: 'currency', status: 'status', allProducts: 'all_products',
  };
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    const col = colMap[k];
    if (col) { sets.push(`${col}=?`); vals.push(k === 'allProducts' ? (v ? 1 : 0) : v); }
  }
  if (sets.length === 0) return findProgramById(id);
  vals.push(id);
  await exec(`UPDATE affiliate_programs SET ${sets.join(', ')} WHERE id=?`, vals);
  return findProgramById(id);
}

export async function getMarketplaceStats(): Promise<{ totalPrograms: number; totalAffiliates: number; totalPaid: number }> {
  if (!useMySQL) {
    const db = getJson().read();
    return {
      totalPrograms:  db.programs.filter(p => p.status === 'active').length,
      totalAffiliates: db.affiliates.filter(a => a.status === 'active').length,
      totalPaid: db.commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0),
    };
  }
  interface StatsRow extends RowDataPacket { totalPrograms: number; totalAffiliates: number; totalPaid: number; }
  const rows = await q<StatsRow>(`
    SELECT
      (SELECT COUNT(*) FROM affiliate_programs WHERE status='active')   AS totalPrograms,
      (SELECT COUNT(*) FROM affiliates WHERE status='active')           AS totalAffiliates,
      (SELECT COALESCE(SUM(amount),0) FROM commissions WHERE status='paid') AS totalPaid`);
  return rows[0];
}

// ─── Affiliates ───────────────────────────────────────────────────────────────
interface AffiliateRow extends RowDataPacket {
  id: string; programId: string; userId: string | null;
  name: string; email: string; referralCode: string; status: string; joinedAt: string;
}
const AFFILIATE_SELECT = `id, program_id AS programId, user_id AS userId, name, email, referral_code AS referralCode, status, joined_at AS joinedAt`;

export async function findAffiliatesByProgramId(programId: string): Promise<Affiliate[]> {
  if (!useMySQL) return getJson().read().affiliates.filter(a => a.programId === programId);
  return q<AffiliateRow>(`SELECT ${AFFILIATE_SELECT} FROM affiliates WHERE program_id=? ORDER BY joined_at DESC`, [programId]) as unknown as Promise<Affiliate[]>;
}

export async function findAffiliateByCode(code: string): Promise<Affiliate | null> {
  if (!useMySQL) return getJson().read().affiliates.find(a => a.referralCode === code && a.status === 'active') ?? null;
  const rows = await q<AffiliateRow>(`SELECT ${AFFILIATE_SELECT} FROM affiliates WHERE referral_code=? AND status='active' LIMIT 1`, [code]);
  return (rows[0] ?? null) as unknown as Affiliate | null;
}

export async function findAffiliateByProgramAndEmail(programId: string, email: string): Promise<Affiliate | null> {
  if (!useMySQL) return getJson().read().affiliates.find(a => a.programId === programId && a.email.toLowerCase() === email.toLowerCase()) ?? null;
  const rows = await q<AffiliateRow>(`SELECT ${AFFILIATE_SELECT} FROM affiliates WHERE program_id=? AND LOWER(email)=LOWER(?) LIMIT 1`, [programId, email]);
  return (rows[0] ?? null) as unknown as Affiliate | null;
}

export async function findAffiliatesByUserId(userId: string): Promise<Affiliate[]> {
  if (!useMySQL) return getJson().read().affiliates.filter(a => a.userId === userId);
  return q<AffiliateRow>(`SELECT ${AFFILIATE_SELECT} FROM affiliates WHERE user_id=? ORDER BY joined_at DESC`, [userId]) as unknown as Promise<Affiliate[]>;
}

export async function createAffiliate(affiliate: Omit<Affiliate, 'joinedAt'>): Promise<Affiliate> {
  if (!useMySQL) {
    const n: Affiliate = { ...affiliate, joinedAt: new Date().toISOString() };
    await getJson().tx(db => { db.affiliates.push(n); });
    return n;
  }
  await exec(
    `INSERT INTO affiliates (id,program_id,user_id,name,email,referral_code,status) VALUES (?,?,?,?,?,?,?)`,
    [affiliate.id, affiliate.programId, affiliate.userId, affiliate.name, affiliate.email, affiliate.referralCode, affiliate.status]
  );
  const rows = await q<AffiliateRow>(`SELECT ${AFFILIATE_SELECT} FROM affiliates WHERE id=? LIMIT 1`, [affiliate.id]);
  return rows[0]! as unknown as Affiliate;
}

export async function updateAffiliateStatus(id: string, status: AffiliateStatus): Promise<void> {
  if (!useMySQL) {
    await getJson().tx(db => { const a = db.affiliates.find(a => a.id === id); if (a) a.status = status; });
    return;
  }
  await exec(`UPDATE affiliates SET status=? WHERE id=?`, [status, id]);
}

// ─── Applications ─────────────────────────────────────────────────────────────
interface AppRow extends RowDataPacket {
  id: string; programId: string; userId: string; status: string;
  pitch: string | null; appliedAt: string; reviewedAt: string | null;
}
const APP_SELECT = `id, program_id AS programId, user_id AS userId, status, pitch, applied_at AS appliedAt, reviewed_at AS reviewedAt`;

export async function findApplicationsByProgramId(programId: string, status?: ApplicationStatus): Promise<AffiliateApplication[]> {
  if (!useMySQL) {
    let list = getJson().read().applications.filter(a => a.programId === programId);
    if (status) list = list.filter(a => a.status === status);
    return list.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  }
  if (status) return q<AppRow>(`SELECT ${APP_SELECT} FROM affiliate_applications WHERE program_id=? AND status=? ORDER BY applied_at DESC`, [programId, status]) as unknown as Promise<AffiliateApplication[]>;
  return q<AppRow>(`SELECT ${APP_SELECT} FROM affiliate_applications WHERE program_id=? ORDER BY applied_at DESC`, [programId]) as unknown as Promise<AffiliateApplication[]>;
}

export async function findApplicationByProgramAndUser(programId: string, userId: string): Promise<AffiliateApplication | null> {
  if (!useMySQL) return getJson().read().applications.find(a => a.programId === programId && a.userId === userId) ?? null;
  const rows = await q<AppRow>(`SELECT ${APP_SELECT} FROM affiliate_applications WHERE program_id=? AND user_id=? LIMIT 1`, [programId, userId]);
  return (rows[0] ?? null) as unknown as AffiliateApplication | null;
}

export async function createApplication(app: Omit<AffiliateApplication, 'appliedAt' | 'reviewedAt'>): Promise<AffiliateApplication> {
  if (!useMySQL) {
    const n: AffiliateApplication = { ...app, appliedAt: new Date().toISOString(), reviewedAt: null };
    await getJson().tx(db => { db.applications.push(n); });
    return n;
  }
  await exec(
    `INSERT INTO affiliate_applications (id,program_id,user_id,status,pitch) VALUES (?,?,?,?,?)`,
    [app.id, app.programId, app.userId, app.status, app.pitch]
  );
  const rows = await q<AppRow>(`SELECT ${APP_SELECT} FROM affiliate_applications WHERE id=? LIMIT 1`, [app.id]);
  return rows[0]! as unknown as AffiliateApplication;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus): Promise<AffiliateApplication | null> {
  if (!useMySQL) {
    let updated: AffiliateApplication | null = null;
    await getJson().tx(db => {
      const a = db.applications.find(a => a.id === id);
      if (a) { a.status = status; a.reviewedAt = new Date().toISOString(); updated = a; }
    });
    return updated;
  }
  await exec(`UPDATE affiliate_applications SET status=?, reviewed_at=CURRENT_TIMESTAMP(3) WHERE id=?`, [status, id]);
  const rows = await q<AppRow>(`SELECT ${APP_SELECT} FROM affiliate_applications WHERE id=? LIMIT 1`, [id]);
  return (rows[0] ?? null) as unknown as AffiliateApplication | null;
}

// ─── Clicks ───────────────────────────────────────────────────────────────────
interface ClickRow extends RowDataPacket {
  id: string; referralCode: string; affiliateId: string; programId: string;
  ipAddress: string | null; userAgent: string | null; createdAt: string;
}
const CLICK_SELECT = `id, referral_code AS referralCode, affiliate_id AS affiliateId, program_id AS programId, ip_address AS ipAddress, user_agent AS userAgent, created_at AS createdAt`;

export async function createClick(click: Omit<ReferralClick, 'createdAt'>): Promise<ReferralClick> {
  if (!useMySQL) {
    const n: ReferralClick = { ...click, createdAt: new Date().toISOString() };
    await getJson().tx(db => { db.clicks.push(n); });
    return n;
  }
  await exec(
    `INSERT INTO referral_clicks (id,referral_code,affiliate_id,program_id,ip_address,user_agent) VALUES (?,?,?,?,?,?)`,
    [click.id, click.referralCode, click.affiliateId, click.programId, click.ipAddress, click.userAgent]
  );
  const rows = await q<ClickRow>(`SELECT ${CLICK_SELECT} FROM referral_clicks WHERE id=? LIMIT 1`, [click.id]);
  return rows[0]!;
}

export async function countClicksByAffiliateId(affiliateId: string): Promise<number> {
  if (!useMySQL) return getJson().read().clicks.filter(c => c.affiliateId === affiliateId).length;
  interface CountRow extends RowDataPacket { c: number; }
  const rows = await q<CountRow>(`SELECT COUNT(*) AS c FROM referral_clicks WHERE affiliate_id=?`, [affiliateId]);
  return rows[0]?.c ?? 0;
}

export async function countClicksByProgramId(programId: string): Promise<number> {
  if (!useMySQL) return getJson().read().clicks.filter(c => c.programId === programId).length;
  interface CountRow extends RowDataPacket { c: number; }
  const rows = await q<CountRow>(`SELECT COUNT(*) AS c FROM referral_clicks WHERE program_id=?`, [programId]);
  return rows[0]?.c ?? 0;
}

export async function findLatestClickByCode(referralCode: string): Promise<ReferralClick | null> {
  if (!useMySQL) {
    const sorted = getJson().read().clicks.filter(c => c.referralCode === referralCode).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted[0] ?? null;
  }
  const rows = await q<ClickRow>(`SELECT ${CLICK_SELECT} FROM referral_clicks WHERE referral_code=? ORDER BY created_at DESC LIMIT 1`, [referralCode]);
  return rows[0] ?? null;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
interface OrderRow extends RowDataPacket {
  id: string; programId: string | null; storeId: string;
  shopifyOrderId: string; referralCode: string | null;
  affiliateId: string | null; amount: number; currency: string; createdAt: string;
}
const ORDER_SELECT = `id, program_id AS programId, store_id AS storeId, shopify_order_id AS shopifyOrderId, referral_code AS referralCode, affiliate_id AS affiliateId, amount, currency, created_at AS createdAt`;

export async function findOrdersByProgramId(programId: string): Promise<Order[]> {
  if (!useMySQL) return getJson().read().orders.filter(o => o.programId === programId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return q<OrderRow>(`SELECT ${ORDER_SELECT} FROM orders WHERE program_id=? ORDER BY created_at DESC`, [programId]);
}

export async function createOrder(order: Omit<Order, 'createdAt'>): Promise<Order> {
  if (!useMySQL) {
    let result!: Order;
    await getJson().tx(db => {
      const dup = db.orders.find(o => o.storeId === order.storeId && o.shopifyOrderId === order.shopifyOrderId);
      if (dup) { result = dup; return; }
      const n: Order = { ...order, createdAt: new Date().toISOString() };
      db.orders.push(n);
      result = n;
    });
    return result;
  }
  // INSERT IGNORE is idempotent — duplicate (store_id, shopify_order_id) is silently skipped
  await exec(
    `INSERT IGNORE INTO orders (id,program_id,store_id,shopify_order_id,referral_code,affiliate_id,amount,currency)
     VALUES (?,?,?,?,?,?,?,?)`,
    [order.id, order.programId, order.storeId, order.shopifyOrderId, order.referralCode, order.affiliateId, order.amount, order.currency]
  );
  // Fetch by natural unique key so we get the row even if INSERT was skipped
  const rows = await q<OrderRow>(`SELECT ${ORDER_SELECT} FROM orders WHERE store_id=? AND shopify_order_id=? LIMIT 1`, [order.storeId, order.shopifyOrderId]);
  return rows[0]!;
}

// ─── Commissions ──────────────────────────────────────────────────────────────
interface CommissionRow extends RowDataPacket {
  id: string; orderId: string; affiliateId: string; programId: string;
  amount: number; rate: number; status: string;
  createdAt: string; paidAt: string | null; stripeTransferId: string | null;
}
const COMMISSION_SELECT = `id, order_id AS orderId, affiliate_id AS affiliateId, program_id AS programId, amount, rate, status, created_at AS createdAt, paid_at AS paidAt, stripe_transfer_id AS stripeTransferId`;

export async function findCommissionsByProgramIds(programIds: string[]): Promise<Commission[]> {
  if (programIds.length === 0) return [];
  if (!useMySQL) return getJson().read().commissions.filter(c => programIds.includes(c.programId));
  const placeholders = programIds.map(() => '?').join(',');
  return q<CommissionRow>(`SELECT ${COMMISSION_SELECT} FROM commissions WHERE program_id IN (${placeholders}) ORDER BY created_at DESC`, programIds) as unknown as Promise<Commission[]>;
}

export async function findCommissionsByAffiliateId(affiliateId: string): Promise<Commission[]> {
  if (!useMySQL) return getJson().read().commissions.filter(c => c.affiliateId === affiliateId);
  return q<CommissionRow>(`SELECT ${COMMISSION_SELECT} FROM commissions WHERE affiliate_id=? ORDER BY created_at DESC`, [affiliateId]) as unknown as Promise<Commission[]>;
}

export async function findPendingCommissionsByAffiliateId(affiliateId: string): Promise<Commission[]> {
  if (!useMySQL) return getJson().read().commissions.filter(c => c.affiliateId === affiliateId && c.status === 'pending');
  return q<CommissionRow>(`SELECT ${COMMISSION_SELECT} FROM commissions WHERE affiliate_id=? AND status='pending' ORDER BY created_at DESC`, [affiliateId]) as unknown as Promise<Commission[]>;
}

export async function findPendingCommissionsByAffiliateAndProgram(affiliateId: string, programId: string): Promise<Commission[]> {
  if (!useMySQL) {
    return getJson().read().commissions.filter(
      c => c.affiliateId === affiliateId && c.programId === programId && c.status === 'pending'
    );
  }
  return q<CommissionRow>(
    `SELECT ${COMMISSION_SELECT} FROM commissions WHERE affiliate_id=? AND program_id=? AND status='pending' ORDER BY created_at DESC`,
    [affiliateId, programId]
  ) as unknown as Promise<Commission[]>;
}

export async function findCommissionById(id: string): Promise<Commission | null> {
  if (!useMySQL) return getJson().read().commissions.find(c => c.id === id) ?? null;
  const rows = await q<CommissionRow>(`SELECT ${COMMISSION_SELECT} FROM commissions WHERE id=? LIMIT 1`, [id]);
  return (rows[0] ?? null) as unknown as Commission | null;
}

export async function createCommission(commission: Omit<Commission, 'createdAt' | 'paidAt' | 'stripeTransferId'>): Promise<Commission> {
  if (!useMySQL) {
    const n: Commission = { ...commission, createdAt: new Date().toISOString(), paidAt: null, stripeTransferId: null };
    await getJson().tx(db => { db.commissions.push(n); });
    return n;
  }
  await exec(
    `INSERT INTO commissions (id,order_id,affiliate_id,program_id,amount,rate,status) VALUES (?,?,?,?,?,?,?)`,
    [commission.id, commission.orderId, commission.affiliateId, commission.programId, commission.amount, commission.rate, commission.status]
  );
  const rows = await q<CommissionRow>(`SELECT ${COMMISSION_SELECT} FROM commissions WHERE id=? LIMIT 1`, [commission.id]);
  return rows[0]! as unknown as Commission;
}

export async function markCommissionPaid(id: string, stripeTransferId: string | null): Promise<Commission | null> {
  if (!useMySQL) {
    let updated: Commission | null = null;
    await getJson().tx(db => {
      const c = db.commissions.find(c => c.id === id);
      if (c) { c.status = 'paid'; c.paidAt = new Date().toISOString(); c.stripeTransferId = stripeTransferId; updated = c; }
    });
    return updated;
  }
  await exec(
    `UPDATE commissions SET status='paid', paid_at=CURRENT_TIMESTAMP(3), stripe_transfer_id=? WHERE id=?`,
    [stripeTransferId, id]
  );
  return findCommissionById(id);
}

export async function markCommissionsPaid(ids: string[], stripeTransferId: string | null): Promise<void> {
  if (ids.length === 0) return;
  if (!useMySQL) {
    await getJson().tx(db => {
      const now = new Date().toISOString();
      for (const c of db.commissions) {
        if (ids.includes(c.id)) { c.status = 'paid'; c.paidAt = now; c.stripeTransferId = stripeTransferId; }
      }
    });
    return;
  }
  const placeholders = ids.map(() => '?').join(',');
  await exec(
    `UPDATE commissions SET status='paid', paid_at=CURRENT_TIMESTAMP(3), stripe_transfer_id=? WHERE id IN (${placeholders})`,
    [stripeTransferId, ...ids]
  );
}

// ─── Convenience re-export (keeps any existing `import * as db` usage working) ─
const _db = {
  read, transaction,
  findUserByEmail, findUserById, findUserByVerificationToken,
  createUser, verifyUserEmail, updateVerificationToken, updateUserRole, updateUserStripeAccount,
  findStoresByUserId, findStoreByDomain, findStoreById, upsertStore,
  findProductsByStoreId, upsertProducts, findProgramProductIds, setProgramProducts,
  findProgramsByUserId, findProgramById, findActivePrograms, createProgram, updateProgram, getMarketplaceStats,
  findAffiliatesByProgramId, findAffiliateByCode, findAffiliateByProgramAndEmail, findAffiliatesByUserId,
  createAffiliate, updateAffiliateStatus,
  findApplicationsByProgramId, findApplicationByProgramAndUser, createApplication, updateApplicationStatus,
  createClick, countClicksByAffiliateId, countClicksByProgramId, findLatestClickByCode,
  findOrdersByProgramId, createOrder,
  findCommissionsByProgramIds, findCommissionsByAffiliateId, findPendingCommissionsByAffiliateId,
  findPendingCommissionsByAffiliateAndProgram,
  findCommissionById, createCommission, markCommissionPaid, markCommissionsPaid,
};

/** Named export — supports `import { db } from "@/lib/db"` */
export const db = _db;

export default _db;
