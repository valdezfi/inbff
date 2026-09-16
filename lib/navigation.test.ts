import { describe, expect, it } from "vitest";
import { getAuthenticatedHomePath } from "./navigation";

describe("getAuthenticatedHomePath", () => {
  it("sends a brand user to the brand dashboard", () => {
    expect(getAuthenticatedHomePath("brand")).toBe("/dashboard");
  });

  it("sends a creator user to the affiliate dashboard", () => {
    expect(getAuthenticatedHomePath("creator")).toBe("/affiliate/dashboard");
  });
});
