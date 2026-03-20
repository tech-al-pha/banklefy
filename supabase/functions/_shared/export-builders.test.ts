import { describe, expect, it, beforeEach, vi } from "vitest";

const buildersMocks = vi.hoisted(() => ({
  generateProfessionalExcelMock: vi.fn(),
}));

vi.mock("./excel-generator.ts", () => ({
  generateProfessionalExcel: buildersMocks.generateProfessionalExcelMock,
}));

import {
  buildCSV,
  buildFOIRReport,
  buildFraudReport,
  buildJSON,
  buildMT940,
  buildXLSX,
} from "./export-builders.ts";

const decoder = new TextDecoder();

const transactions = [
  {
    date: "2024-01-01",
    description: 'Coffee, "chai"',
    category: "Food",
    debit: 12.34,
    credit: 0,
    balance: 87.66,
    refNumber: "REF-1",
  },
];

const metadata = {
  bankId: "bank-1",
  exportTimestamp: "2024-01-01T00:00:00Z",
  confidenceScore: 95,
  parseMode: "ocr",
  userPlan: "pro",
  requestedFormat: "xlsx" as const,
  bankInfo: {
    bankName: "Demo Bank",
    accountNumber: "123456",
    accountHolder: "A. User",
    currency: "USD",
    openingBalance: 100,
    closingBalance: 87.66,
  },
};

describe("export-builders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildersMocks.generateProfessionalExcelMock.mockResolvedValue({
      buffer: new Uint8Array([1, 2, 3, 4]).buffer,
      sheets: ["Sheet1"],
    });
  });

  it("builds CSV, JSON, and MT940 artifacts", () => {
    const csvArtifact = buildCSV(transactions, metadata);
    const jsonArtifact = buildJSON(transactions, metadata, {
      totalCredits: 0,
      totalDebits: 12.34,
      netFlow: -12.34,
    });
    const mt940Artifact = buildMT940(transactions, metadata, "STATEMENT-01");

    const csv = decoder.decode(csvArtifact.fileBuffer);
    const json = JSON.parse(decoder.decode(jsonArtifact.fileBuffer)) as {
      bankInfo: { bankName: string; accountNumber: string };
      summary: { totalCredits: number; totalDebits: number; netFlow: number };
    };
    const mt940 = decoder.decode(mt940Artifact.fileBuffer);

    expect(csvArtifact.mimeType).toBe("text/csv; charset=utf-8");
    expect(csv).toContain('"Coffee, ""chai"""');
    expect(csv).toContain("12.34");
    expect(csv).toContain("REF-1");
    expect(csv).toContain("Date,Description,Category,Debit,Credit,Balance,Reference");

    expect(jsonArtifact.mimeType).toBe("application/json; charset=utf-8");
    expect(json.bankInfo.bankName).toBe("Demo Bank");
    expect(json.bankInfo.accountNumber).toBe("123456");
    expect(json.summary.netFlow).toBe(-12.34);

    expect(mt940Artifact.mimeType).toBe("text/plain; charset=utf-8");
    expect(mt940).toContain(":20:STATEMENT01");
    expect(mt940).toContain(":61:240101D12,34NTRF//REF1");
  });

  it("builds fraud and FOIR reports", () => {
    const fraudArtifact = buildFraudReport(transactions, metadata);
    const foirArtifact = buildFOIRReport(transactions, {
      ...metadata,
      analytics: {
        riskAnalysis: { score: 80 },
        underwriting: { tier: "pro" },
      } as unknown as Record<string, unknown>,
    });

    const fraud = JSON.parse(decoder.decode(fraudArtifact.fileBuffer)) as {
      metadata: { bankId: string };
      rowCount: number;
      fraudAnalysis: unknown;
    };
    const foir = JSON.parse(decoder.decode(foirArtifact.fileBuffer)) as {
      rowCount: number;
      foir: { score: number } | null;
      underwriting: { tier: string } | null;
    };

    expect(fraudArtifact.mimeType).toBe("application/json; charset=utf-8");
    expect(fraud.rowCount).toBe(1);
    expect(fraud.metadata.bankId).toBe("bank-1");

    expect(foirArtifact.mimeType).toBe("application/json; charset=utf-8");
    expect(foir.rowCount).toBe(1);
    expect(foir.foir).toEqual({ score: 80 });
    expect(foir.underwriting).toEqual({ tier: "pro" });
  });

  it("builds XLSX by delegating to the Excel generator", async () => {
    const artifact = await buildXLSX(transactions, metadata, {
      analytics: {
        totalCredits: 0,
        totalDebits: 12.34,
        netFlow: -12.34,
        duplicateCount: 0,
        categoryBreakdown: {},
      },
      bankInfo: metadata.bankInfo,
    });

    expect(buildersMocks.generateProfessionalExcelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions: expect.arrayContaining([
          expect.objectContaining({
            description: 'Coffee, "chai"',
          }),
        ]),
        bankInfo: metadata.bankInfo,
      }),
    );
    expect(artifact.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(artifact.fileBuffer).toHaveLength(4);
  });
});
