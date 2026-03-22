import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pdfWorker", () => ({
  getPdfWorkerSrc: vi.fn(async () => "worker.js"),
}));

const fakePdf = {
  numPages: 1,
  getPage: vi.fn(async () => ({
    getTextContent: vi.fn(async () => ({
      items: [
        { str: "08-01-2026", transform: [1, 0, 0, 1, 0, 100] },
        { str: "CashDep", transform: [1, 0, 0, 1, 50, 100] },
        { str: "Chgs", transform: [1, 0, 0, 1, 100, 100] },
        { str: "15.66", transform: [1, 0, 0, 1, 150, 100] },
        { str: "0.01", transform: [1, 0, 0, 1, 190, 100] },
      ],
    })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
    getViewport: vi.fn(() => ({ width: 1000, height: 1000 })),
  })),
  destroy: vi.fn(async () => undefined),
};

vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(() => ({ promise: Promise.resolve(fakePdf) })),
  GlobalWorkerOptions: { workerSrc: "" },
}));

describe("pdfUtils", () => {
  it("parses a single-date text row with amount and balance", async () => {
    const { extractPdfDataFromText } = await import("./pdfUtils");
    const file = new File(["stub"], "statement.pdf", { type: "application/pdf" });

    const result = await extractPdfDataFromText(file, { password: "CHIR0108" });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      date: "2026-01-08",
      valueDate: "2026-01-08",
      description: "CashDep Chgs",
      debit: 15.66,
      credit: 0,
      balance: 0.01,
    });
  });
});
