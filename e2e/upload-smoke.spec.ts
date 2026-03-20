import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

type GrecaptchaStub = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

type ConvertPayload = {
  fileName?: string;
  fileData?: string;
  outputMode?: string;
  recaptchaToken?: string;
  timezone?: string;
};

const RECAPTCHA_TOKEN = "playwright-recaptcha-token";
const PNG_FIXTURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7JvXwAAAAASUVORK5CYII=",
  "base64",
);
const XLSX_FIXTURE = Buffer.from("playwright-xlsx-smoke");

test("uploads a bank statement and downloads the converted Excel file", async ({ page }) => {
  let usageLimitCalls = 0;
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
    usageLimitCalls += 1;
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
    expect(route.request().method()).toBe("POST");

    const payload = route.request().postDataJSON() as ConvertPayload;
    expect(payload.fileName).toBe("statement.png");
    expect(payload.outputMode).toBe("standard");
    expect(payload.recaptchaToken).toBe(RECAPTCHA_TOKEN);
    expect(payload.fileData).toMatch(/^data:image\/png;base64,/);
    expect(typeof payload.timezone).toBe("string");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        conversionId: "conv_playwright_smoke",
        resultPath: null,
        excelData: XLSX_FIXTURE.toString("base64"),
        transactions: [
          {
            date: "2026-03-19",
            description: "Payroll",
            category: "Salary",
            debit: 0,
            credit: 1500,
            balance: 1500,
          },
        ],
        analytics: {
          totalTransactions: 1,
          totalCredits: 1500,
          totalDebits: 0,
          netFlow: 1500,
          duplicateCount: 0,
          categoryBreakdown: {
            Salary: { count: 1, totalDebit: 0, totalCredit: 1500 },
          },
        },
        bankInfo: {
          bankName: "Demo Bank",
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
  await fileChooser.setFiles({
    name: "statement.png",
    mimeType: "image/png",
    buffer: PNG_FIXTURE,
  });

  const convertButton = page.getByRole("button", { name: "Convert", exact: true });
  await expect(convertButton).toBeVisible();
  await convertButton.click();

  await expect(page.getByText("Conversion Complete!", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Payroll")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Excel" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("statement.xlsx");
  expect(usageLimitCalls).toBeGreaterThanOrEqual(2);
  expect(convertCalls).toBe(1);
});
