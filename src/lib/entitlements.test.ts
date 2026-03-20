import { describe, expect, it } from "vitest";
import {
  getEditPdfDetectorTier,
  hasTallyXmlAccess,
  resolveEffectivePlanType,
} from "./entitlements";
import { formatPlanLabel } from "./planLabels";

describe("entitlements plan resolution", () => {
  it("maps current pack limits to the current one-time plan ids", () => {
    expect(resolveEffectivePlanType("free", 1000)).toBe("per_page_pack_basic");
    expect(resolveEffectivePlanType("free", 11000)).toBe("per_page_pack_pro");
  });

  it("keeps feature access on the current pack ids", () => {
    expect(hasTallyXmlAccess({ planType: "per_page_pack_basic" })).toBe(true);
    expect(hasTallyXmlAccess({ planType: "per_page_pack_pro" })).toBe(true);
    expect(getEditPdfDetectorTier({ planType: "per_page_pack_basic" })).toBe("basic");
    expect(getEditPdfDetectorTier({ planType: "per_page_pack_pro" })).toBe("advanced");
    expect(formatPlanLabel("per_page_lite")).toBe("Lite");
    expect(formatPlanLabel("per_page_standard")).toBe("Standard");
    expect(formatPlanLabel("per_page_power")).toBe("Power");
    expect(formatPlanLabel("per_page_pack_basic")).toBe("Basic Pack");
    expect(formatPlanLabel("per_page_pack_pro")).toBe("Pro Pack");
  });
});
