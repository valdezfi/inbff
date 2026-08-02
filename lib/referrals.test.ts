import { describe, expect, it } from "vitest";
import {
  buildReferralUrl,
  buildStorefrontDestination,
  isAttributionEligible,
  normalizeReferralCode,
} from "./referrals";

describe("referral policy", () => {
  it("normalizes issued codes and rejects malformed values", () => {
    expect(normalizeReferralCode(" abcd234 ")).toBe("ABCD234");
    expect(normalizeReferralCode("bad code!")).toBeNull();
  });

  it("builds one canonical public referral URL", () => {
    expect(buildReferralUrl("https://referly.example/", "ABCD234"))
      .toBe("https://referly.example/r/ABCD234");
  });

  it("keeps a safe storefront path while adding one referral code", () => {
    expect(buildStorefrontDestination("shop.example", "ABCD234", "/products/hat?size=m"))
      .toBe("https://shop.example/products/hat?size=m&ref=ABCD234");
  });

  it("rejects an expired referral click", () => {
    expect(isAttributionEligible({
      affiliateActive: true,
      programActive: true,
      programStoreId: "store-a",
      webhookStoreId: "store-a",
      latestClickAt: "2026-06-30T00:00:00.000Z",
      attributionWindowDays: 30,
      now: Date.parse("2026-08-01T00:00:00.000Z"),
    })).toBe(false);
  });

  it("allows an active direct referral with no recorded click", () => {
    expect(isAttributionEligible({
      affiliateActive: true,
      programActive: true,
      programStoreId: "store-a",
      webhookStoreId: "store-a",
      latestClickAt: null,
      attributionWindowDays: 30,
      now: Date.parse("2026-08-01T00:00:00.000Z"),
    })).toBe(true);
  });

  it("rejects a referral code used against another store", () => {
    expect(isAttributionEligible({
      affiliateActive: true,
      programActive: true,
      programStoreId: "store-a",
      webhookStoreId: "store-b",
      latestClickAt: null,
      attributionWindowDays: 30,
      now: Date.parse("2026-08-01T00:00:00.000Z"),
    })).toBe(false);
  });
});
