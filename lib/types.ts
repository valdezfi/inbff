// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * "brand"   — A business/company that connects their Shopify store and creates
 *             affiliate programs. Previously called "creator" in older code.
 *             Routes to /dashboard
 *
 * "creator" — A content creator / affiliate who browses the marketplace,
 *             joins programs and earns commissions via referral links.
 *             Routes to /affiliate/dashboard
 */
export type UserRole = "brand" | "creator";
export type ProgramType = "open" | "approval";
export type ProgramStatus = "draft" | "active" | "paused" | "deleted";
export type PayoutSchedule = "manual" | "weekly" | "monthly";
export type AffiliateStatus = "active" | "paused";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type CommissionStatus = "pending" | "paid";

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  role: UserRole;
  emailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiry: string | null;
  stripeAccountId: string | null;
}

export interface ShopifyStore {
  id: string;
  userId: string;
  shopDomain: string;
  accessToken: string | null;
  webhookSecret: string | null;   // per-store webhook signing secret (from Shopify callback)
  connectedAt: string;
}

export interface ShopifyProduct {
  id: string;
  storeId: string;
  shopifyProductId: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
  handle: string;
  syncedAt: string;
}

export interface AffiliateProgram {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  description: string | null;
  category: string;
  bannerUrl: string | null;
  commissionRate: number;
  programType: ProgramType;
  attributionWindowDays: number;
  payoutThreshold: number;
  payoutSchedule: PayoutSchedule;
  currency: string;
  status: ProgramStatus;
  allProducts: boolean;
  createdAt: string;
}

export interface Affiliate {
  id: string;
  programId: string;
  userId: string | null;
  name: string;
  email: string;
  referralCode: string;
  status: AffiliateStatus;
  joinedAt: string;
}

export interface AffiliateApplication {
  id: string;
  programId: string;
  userId: string;
  status: ApplicationStatus;
  pitch: string | null;
  appliedAt: string;
  reviewedAt: string | null;
}

export interface ReferralClick {
  id: string;
  referralCode: string;
  affiliateId: string;
  programId: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  programId: string | null;
  storeId: string;
  shopifyOrderId: string;
  referralCode: string | null;
  affiliateId: string | null;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface Commission {
  id: string;
  orderId: string;
  affiliateId: string;
  programId: string;
  amount: number;
  rate: number;
  status: CommissionStatus;
  createdAt: string;
  paidAt: string | null;
  stripeTransferId: string | null;
}

// ─── Marketplace public shape ─────────────────────────────────────────────────

export interface MarketplaceProgram {
  id: string;
  name: string;
  description: string | null;
  category: string;
  bannerUrl: string | null;
  commissionRate: number;
  programType: ProgramType;
  attributionWindowDays: number;
  shopDomain: string;
  affiliateCount: number;
  createdAt: string;
}

// ─── JSON file DB shape ───────────────────────────────────────────────────────

export interface DB {
  users: User[];
  stores: ShopifyStore[];
  products: ShopifyProduct[];
  programs: AffiliateProgram[];
  programProducts: { programId: string; productId: string }[];
  affiliates: Affiliate[];
  applications: AffiliateApplication[];
  clicks: ReferralClick[];
  orders: Order[];
  commissions: Commission[];
}
