import { describe, expect, it } from "vitest";

import {
  getEditPdfDetectorTier,
  hasAccountingIntegrationsAccess,
  hasFoirDashboardAccess,
  hasMt940Access,
  hasTallyXmlAccess,
  isPaidPlan,
  resolveEffectivePlanType,
} from "@/lib/entitlements";

describe("plan entitlements", () => {
  it("keeps free and one-time conversion plans on core exports only", () => {
    expect(isPaidPlan({ planType: "free", conversionsLimit: 5 })).toBe(false);
    expect(isPaidPlan({ planType: "bonus_free_basic", conversionsLimit: 50 })).toBe(false);
    expect(hasMt940Access({ planType: "free", conversionsLimit: 5 })).toBe(false);
    expect(hasMt940Access({ planType: "bonus_free_basic", conversionsLimit: 50 })).toBe(false);
    expect(hasTallyXmlAccess({ planType: "free", conversionsLimit: 5 })).toBe(false);
    expect(hasTallyXmlAccess({ planType: "bonus_free_basic", conversionsLimit: 50 })).toBe(false);
    expect(hasAccountingIntegrationsAccess({ planType: "free", conversionsLimit: 5 })).toBe(false);
    expect(hasAccountingIntegrationsAccess({ planType: "bonus_free_basic", conversionsLimit: 50 })).toBe(false);
    expect(hasFoirDashboardAccess({ planType: "bonus_free_basic", conversionsLimit: 50 })).toBe(false);

    expect(isPaidPlan({ planType: "per_page_lite", conversionsLimit: 10 })).toBe(false);
    expect(isPaidPlan({ planType: "per_page_standard", conversionsLimit: 25 })).toBe(false);
    expect(isPaidPlan({ planType: "per_page_power", conversionsLimit: 50 })).toBe(false);
    expect(hasMt940Access({ planType: "per_page_power", conversionsLimit: 50 })).toBe(false);
    expect(hasTallyXmlAccess({ planType: "per_page_power", conversionsLimit: 50 })).toBe(false);
    expect(hasAccountingIntegrationsAccess({ planType: "per_page_power", conversionsLimit: 50 })).toBe(false);
    expect(hasFoirDashboardAccess({ planType: "per_page_power", conversionsLimit: 50 })).toBe(false);
  });

  it("unlocks starter and basic packs at the expected tiers", () => {
    expect(isPaidPlan({ planType: "per_page_pack_starter", conversionsLimit: 500 })).toBe(true);
    expect(hasMt940Access({ planType: "per_page_pack_starter", conversionsLimit: 500 })).toBe(true);
    expect(hasTallyXmlAccess({ planType: "per_page_pack_starter", conversionsLimit: 500 })).toBe(false);
    expect(hasAccountingIntegrationsAccess({ planType: "per_page_pack_starter", conversionsLimit: 500 })).toBe(false);
    expect(hasFoirDashboardAccess({ planType: "per_page_pack_starter", conversionsLimit: 500 })).toBe(false);

    expect(isPaidPlan({ planType: "per_page_pack_basic", conversionsLimit: 1000 })).toBe(true);
    expect(hasMt940Access({ planType: "per_page_pack_basic", conversionsLimit: 1000 })).toBe(true);
    expect(hasTallyXmlAccess({ planType: "per_page_pack_basic", conversionsLimit: 1000 })).toBe(true);
    expect(hasAccountingIntegrationsAccess({ planType: "per_page_pack_basic", conversionsLimit: 1000 })).toBe(false);
    expect(hasFoirDashboardAccess({ planType: "per_page_pack_basic", conversionsLimit: 1000 })).toBe(true);
    expect(getEditPdfDetectorTier({ planType: "per_page_pack_basic", conversionsLimit: 1000 })).toBe("none");
  });

  it("unlocks pro and enterprise-only premium capabilities correctly", () => {
    expect(hasAccountingIntegrationsAccess({ planType: "per_page_pack_pro", conversionsLimit: 5000 })).toBe(true);
    expect(hasFoirDashboardAccess({ planType: "per_page_pack_pro", conversionsLimit: 5000 })).toBe(true);
    expect(getEditPdfDetectorTier({ planType: "per_page_pack_pro", conversionsLimit: 5000 })).toBe("basic");

    expect(hasAccountingIntegrationsAccess({ planType: "per_page_pack_enterprise", conversionsLimit: 11000 })).toBe(true);
    expect(hasFoirDashboardAccess({ planType: "per_page_pack_enterprise", conversionsLimit: 11000 })).toBe(true);
    expect(getEditPdfDetectorTier({ planType: "per_page_pack_enterprise", conversionsLimit: 11000 })).toBe("advanced");
  });

  it("infers effective plan type from paid limits when legacy plan labels are stored", () => {
    expect(resolveEffectivePlanType("bonus_free_basic", 50)).toBe("bonus_free_basic");
    expect(resolveEffectivePlanType("free", 500)).toBe("per_page_pack_starter");
    expect(resolveEffectivePlanType("business", 5000)).toBe("per_page_pack_pro");
    expect(resolveEffectivePlanType("basic", 1000)).toBe("per_page_pack_basic");
    expect(resolveEffectivePlanType("unlimited", 999999)).toBe("unlimited");
  });
});
