import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

type GrecaptchaStub = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

type ConvertPayload = {
  fileName?: string;
  fileData?: string;
  pdfPageImages?: string[];
  pdfParsedTransactions?: unknown[];
  outputMode?: string;
  recaptchaToken?: string;
  timezone?: string;
};

const RECAPTCHA_TOKEN = "playwright-recaptcha-token";
const SAMPLE_PDF = fileURLToPath(new URL("../public/samples/sample-source.pdf", import.meta.url));
const XLSX_FIXTURE = Buffer.from("playwright-pdf-xlsx-smoke");

test("uploads a PDF and downloads the converted Excel file", async ({ page }) => {
  let convertCalls = 0;

  await page.addInitScript((token) => {
    const grecaptcha: GrecaptchaStub = {
      ready(callback) {
        callback();
      },
      async execute() {
        return token;
      },
    };

    (window as Window & { grecaptcha?: GrecaptchaStub }).grecaptcha = grecaptcha;
  }, RECAPTCHA_TOKEN);

  await page.route("**/functions/v1/check-usage-limit*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conversionsUsed: 0,
        conversionsLimit: 5,
        remaining: 5,
        limitReached: false,
        isAuthenticated: false,
        planType: "free",
      }),
    });
  });

  await page.route("**/functions/v1/convert-document*", async (route) => {
    convertCalls += 1;

    const payload = route.request().postDataJSON() as ConvertPayload;
    expect(payload.fileName).toBe("sample-source.pdf");
    expect(payload.outputMode).toBe("standard");
    expect(payload.recaptchaToken).toBe(RECAPTCHA_TOKEN);
    expect(payload.fileData || payload.pdfPageImages || payload.pdfParsedTransactions).toBeTruthy();
    expect(typeof payload.timezone).toBe("string");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conversionId: "conv_playwright_pdf_smoke",
        resultPath: null,
        excelData: XLSX_FIXTURE.toString("base64"),
        transactions: [
          {
            date: "2026-03-19",
            description: "PDF Salary",
            category: "Salary",
            debit: 0,
            credit: 2200,
            balance: 2200,
          },
        ],
        analytics: {
          totalTransactions: 1,
          totalCredits: 2200,
          totalDebits: 0,
          netFlow: 2200,
          duplicateCount: 0,
          categoryBreakdown: {
            Salary: { count: 1, totalDebit: 0, totalCredit: 2200 },
          },
        },
        bankInfo: {
          bankName: "PDF Demo Bank",
          currency: "USD",
        },
        remaining: 4,
        limitReached: false,
        outputMode: "standard",
      }),
    });
  });

  await page.goto("/?next=demo");
  await page.locator("#demo").scrollIntoViewIfNeeded();

  const addFilesButton = page.getByRole("button", { name: "Add Files", exact: true });
  await expect(addFilesButton).toBeVisible({ timeout: 30_000 });

  const fileChooserPromise = page.waitForEvent("filechooser");
  await addFilesButton.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(SAMPLE_PDF);

  const convertButton = page.getByRole("button", { name: "Convert", exact: true });
  await expect(convertButton).toBeVisible({ timeout: 30_000 });
  await convertButton.click();

  await expect(page.getByText("Conversion Complete!", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("PDF Salary")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Excel", exact: true }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("sample-source.xlsx");
  expect(convertCalls).toBeGreaterThanOrEqual(1);
});
