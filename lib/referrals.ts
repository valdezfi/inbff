import { customAlphabet } from "nanoid";
import type { Affiliate } from "@/lib/types";

const referralAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 7);
const referralCodePattern = /^[A-HJ-NP-Z2-9]{7,10}$/;

export interface AttributionInput {
  affiliateActive: boolean;
  programActive: boolean;
  programStoreId: string;
  webhookStoreId: string;
  latestClickAt: string | null;
  attributionWindowDays: number;
  now: number;
}

export function normalizeReferralCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return referralCodePattern.test(code) ? code : null;
}

export async function generateUniqueReferralCode(
  findAffiliateByCode: (code: string) => Promise<Affiliate | null>
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = referralAlphabet();
    if (!await findAffiliateByCode(code)) return code;
  }

  throw new Error("Unable to generate a unique referral code.");
}

export function buildReferralUrl(appUrl: string, code: string): string {
  return new URL(`/r/${encodeURIComponent(code)}`, appUrl).toString();
}

export function buildStorefrontDestination(
  storeDomain: string,
  code: string,
  destinationPath = "/"
): string {
  const target = new URL(destinationPath, `https://${storeDomain}`);
  if (target.origin !== `https://${storeDomain}`) {
    throw new Error("Referral destination must remain on the connected storefront.");
  }
  target.searchParams.set("ref", code);
  return target.toString();
}

export function isAttributionEligible(input: AttributionInput): boolean {
  if (!input.affiliateActive || !input.programActive || input.programStoreId !== input.webhookStoreId) {
    return false;
  }
  if (!input.latestClickAt) return true;

  const clickedAt = new Date(input.latestClickAt).getTime();
  const windowMs = input.attributionWindowDays * 24 * 60 * 60 * 1000;
  return Number.isFinite(clickedAt) && input.now - clickedAt <= windowMs;
}
