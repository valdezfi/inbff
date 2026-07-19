export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface ShopifyStore {
  id: string;
  userId: string;
  shopDomain: string;
  /** Real Shopify OAuth access token. Null until OAuth is completed. */
  accessToken: string | null;
  connectedAt: string;
}

export interface AffiliateProgram {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  commissionRate: number;
  createdAt: string;
}

export interface Affiliate {
  id: string;
  programId: string;
  name: string;
  email: string;
  referralCode: string;
  joinedAt: string;
}

export interface ReferralClick {
  id: string;
  referralCode: string;
  affiliateId: string;
  programId: string;
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

export type CommissionStatus = "pending" | "paid";

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
  /** Stripe transfer ID returned after a successful payout */
  stripeTransferId: string | null;
}

/** Shape of the JSON file used in development (mirrors the Postgres schema) */
export interface DB {
  users: User[];
  stores: ShopifyStore[];
  programs: AffiliateProgram[];
  affiliates: Affiliate[];
  clicks: ReferralClick[];
  orders: Order[];
  commissions: Commission[];
}
