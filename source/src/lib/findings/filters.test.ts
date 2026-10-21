import { describe, expect, it } from "vitest";
import { buildFindingsHref, parseFindingFilters } from "./filters";

describe("findings filters", () => {
  it("builds query params from filters", () => {
    expect(buildFindingsHref({})).toBe("/findings");
    expect(buildFindingsHref({ type: "email" })).toBe("/findings?type=email");
    expect(buildFindingsHref({ risk: "Critical" })).toBe("/findings?risk=Critical");
    expect(buildFindingsHref({ type: "uk_nino", risk: "High" })).toBe("/findings?type=uk_nino&risk=High");
  });

  it("whitelists URL params and ignores unknown values", () => {
    expect(parseFindingFilters({ type: "payment_card", risk: "Critical" })).toEqual({ type: "payment_card", risk: "Critical" });
    expect(parseFindingFilters({ type: "x' or 1=1", risk: "None" })).toEqual({});
    expect(parseFindingFilters({ type: ["email", "uk_phone"] })).toEqual({ type: "email" });
  });
});
