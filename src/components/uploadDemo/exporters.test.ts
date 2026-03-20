const exportersMocks = vi.hoisted(() => ({
  downloadTextFileMock: vi.fn(),
}));

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/statement-export", async () => {
  const actual = await vi.importActual<typeof import("@/lib/statement-export")>(
    "@/lib/statement-export",
  );
  return {
    ...actual,
    downloadTextFile: exportersMocks.downloadTextFileMock,
  };
});

import { exportAsCSV, exportAsJSON, exportAsMT940 } from "./exporters";

const createTransactions = () => [
  {
    date: "2024-01-01",
    description: 'Coffee, "chai"',
    category: "Food",
    debit: 12.34,
    credit: 0,
    balance: 87.66,
    refNumber: "REF-1",
  },
  {
    date: "2024-01-02",
    description: "Salary",
    category: "Income",
    debit: 0,
    credit: 100,
    balance: 187.66,
    refNumber: "REF-2",
  },
];

const toastMock = vi.fn();

const baseContext = {
  analytics: null,
  bankInfo: {
    bankName: "Demo Bank",
    accountNumber: "123456",
    accountHolder: "A. User",
    currency: "USD",
    openingBalance: 75,
    closingBalance: 187.66,
  },
  currencyCode: "USD",
  jsonData: null,
  mt940Data: null,
  exportBaseName: "Q4 statement.xlsx",
  toast: toastMock,
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
  sumMoney: (values: number[]) => values.reduce((sum, value) => sum + value, 0),
  truncateDecimals: (value: number) => value,
};

describe("uploadDemo exporters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.URL.createObjectURL).mockReturnValue("blob:mock");
  });

  it("exports CSV data with the generated workbook name", async () => {
    const transactions = createTransactions();
    let capturedBlob: Blob | null = null;
    vi.mocked(window.URL.createObjectURL).mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj instanceof Blob ? obj : null;
      return "blob:csv";
    });

    exportAsCSV({
      ...baseContext,
      transactions,
      exportBaseName: "Q4 statement.xlsx",
    });

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "CSV Downloaded" }),
    );
    expect(capturedBlob).not.toBeNull();

    const csv = await capturedBlob!.text();
    expect(csv).toContain('"Coffee, ""chai"""');
    expect(csv).toContain("TOTAL");
    expect(csv).toContain("12.34");
  });

  it("falls back to generated JSON and MT940 exports when cached payloads are absent", async () => {
    const transactions = createTransactions();

    await exportAsJSON({
      ...baseContext,
      transactions,
      exportBaseName: "statement.final.pdf",
    });

    expect(exportersMocks.downloadTextFileMock).toHaveBeenCalledWith(
      expect.stringContaining('"format": "banklefy-json-v1"'),
      "statement.final.json",
      "application/json;charset=utf-8",
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "JSON Downloaded" }),
    );

    exportersMocks.downloadTextFileMock.mockClear();
    toastMock.mockClear();

    await exportAsMT940({
      ...baseContext,
      transactions,
      exportBaseName: "statement.final.pdf",
    });

    expect(exportersMocks.downloadTextFileMock).toHaveBeenCalledWith(
      expect.stringContaining(":20:"),
      "statement.final.mt940",
      "text/plain;charset=utf-8",
    );
    expect(exportersMocks.downloadTextFileMock.mock.calls[0][0]).toContain(":61:240101D12,34NTRF//REF1");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "MT940 Downloaded" }),
    );
  });
});
