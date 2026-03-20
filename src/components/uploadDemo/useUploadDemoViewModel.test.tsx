import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/currency", () => ({
  formatCurrencyValue: vi.fn((value: number, currencyCode: string, options?: { showSymbol?: boolean }) => {
    const symbolMode = options?.showSymbol === false ? "nosymbol" : "symbol";
    return `${currencyCode}:${value}:${symbolMode}`;
  }),
}));

import { useUploadDemoViewModel } from "./useUploadDemoViewModel";

type ViewModelArgs = Parameters<typeof useUploadDemoViewModel>[0];

const createArgs = (overrides: Partial<ViewModelArgs> = {}): ViewModelArgs => ({
  selectedFiles: [],
  planType: "free",
  conversionsLimit: 5,
  isAuthenticated: false,
  currencyCode: "USD",
  progressStep: 0,
  uploading: false,
  preparedPdfDataRef: { current: new Map() } as ViewModelArgs["preparedPdfDataRef"],
  ...overrides,
});

const renderViewModel = (overrides: Partial<ViewModelArgs> = {}) =>
  renderHook(({ args }: { args: ViewModelArgs }) => useUploadDemoViewModel(args), {
    initialProps: {
      args: createArgs(overrides),
    },
  });

describe("useUploadDemoViewModel", () => {
  it("shows image-processing hints for direct image uploads and formats helper values", async () => {
    const imageFile = new File(["image"], "receipt.jpg", { type: "image/jpeg", lastModified: 1 });
    const { result } = renderViewModel({
      selectedFiles: [imageFile],
      uploading: true,
      progressStep: 12,
    });

    await waitFor(() => {
      expect(result.current.showImageProcessingHint).toBe(true);
    });

    expect(result.current.conversionProgressDetail).toBe("Uploading file and preparing document...");
    expect(result.current.uploadingLabel).toBe("Uploading and preparing document...");
    expect(result.current.convertingLabel).toBe("Converting and validating transactions...");
    expect(result.current.finalizingLabel).toBe("Finalizing...");
    expect(result.current.formatAmountNoSymbol(1234.5)).toBe("USD:1234.5:nosymbol");
    expect(result.current.truncateDecimals(12.349, 2)).toBe(12.34);
    expect(result.current.truncateDecimals(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("adapts progress copy and remaining-usage text across plans", async () => {
    const pdfFile = new File(["pdf"], "statement.pdf", {
      type: "application/pdf",
      lastModified: 2,
    });
    const preparedPdfDataRef: ViewModelArgs["preparedPdfDataRef"] = {
      current: new Map([
        [
          `${pdfFile.name}__${pdfFile.size}__${pdfFile.lastModified}`,
          {
            transactions: [
              {
                date: "2024-01-01",
                description: "Salary",
                debit: 0,
                credit: 100,
                balance: 100,
              },
            ],
          },
        ],
      ]),
    };

    const { result, rerender } = renderHook(
      ({ args }: { args: ViewModelArgs }) => useUploadDemoViewModel(args),
      {
        initialProps: {
          args: createArgs({
            selectedFiles: [pdfFile],
            preparedPdfDataRef,
            planType: "free",
            isAuthenticated: false,
            progressStep: 50,
          }),
        },
      },
    );

    await waitFor(() => {
      expect(result.current.showImageProcessingHint).toBe(false);
    });

    expect(result.current.conversionProgressDetail).toBe("Detecting amounts and balance columns...");
    expect(result.current.formatRemaining(2)).toBe("2 conversions remaining today.");

    rerender({
      args: createArgs({
        selectedFiles: [pdfFile],
        preparedPdfDataRef,
        planType: "per_page_pack_basic",
        conversionsLimit: 1000,
        isAuthenticated: true,
        progressStep: 70,
      }),
    });

    expect(result.current.conversionProgressDetail).toBe("Categorizing and validating transactions...");
    expect(result.current.formatRemaining(3)).toBe("3 pages remaining in your pack.");

    rerender({
      args: createArgs({
        selectedFiles: [pdfFile],
        preparedPdfDataRef,
        planType: "per_page_pack_pro",
        conversionsLimit: 11000,
        isAuthenticated: true,
        progressStep: 90,
      }),
    });

    expect(result.current.conversionProgressDetail).toBe("Running final checks and reconciliation...");
    expect(result.current.formatRemaining(1)).toBe("1 page remaining in your pack.");

    rerender({
      args: createArgs({
        selectedFiles: [pdfFile],
        preparedPdfDataRef,
        planType: "unlimited",
        conversionsLimit: 999999,
        isAuthenticated: true,
        progressStep: 98,
      }),
    });

    expect(result.current.conversionProgressDetail).toBe("Preparing download output...");
    expect(result.current.formatRemaining(10)).toBe("Unlimited pages remaining.");
  });
});
