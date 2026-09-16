import { describe, expect, it } from "vitest";
import { getUnifiedRedirectUrls } from "./unified";

describe("getUnifiedRedirectUrls", () => {
  it("uses the host that received the OAuth request for both Unified return URLs", () => {
    expect(getUnifiedRedirectUrls("https://inbff.com/api/shopify/unified/connect", "opaque-state")).toEqual({
      callbackUrl: "https://inbff.com/api/shopify/unified/callback?state=opaque-state",
      errorRedirectUrl: "https://inbff.com/dashboard/connect-shopify?error=unified-integration-disabled",
    });
  });
});
