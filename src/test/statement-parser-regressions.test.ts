import { describe, expect, it } from "vitest";

import {
  recoverAdcbTransactionsFromOcrText,
  recoverEmiratesIslamicTransactionsFromOcrText,
} from "../../supabase/functions/_shared/ocr-processor";
import { sanitizeTransactions } from "../../supabase/functions/_shared/transaction-sanitizer";
import type { Transaction } from "../../supabase/functions/_shared/financial-engine";

describe("bank statement parser regressions", () => {
  it("recovers ADCB debit and credit sides from opening balance math", () => {
    const text = [
      "Report Date: 11-May-2026",
      "Account No. : 14175130910001 - AED Account Name : AMBL LLC FZ",
      "Opening Balance: 6,248.34 Closing(Available) Balance: 17,755.38",
      "Total Debit Amount: 40,492.96 Total Credit Amount: 52,000.00",
      "Sr.No Date Value Bank Customer Description Debit Credit Running",
      "1 14-Apr- 14-Apr- PHUB64346 MOB140426 TRF TO AMBL LLC FZ AMBL ADCB 1417513 IFT",
      "2026 2026 6743 1303271196 LLC FZ 0920001",
      "1104 1,000.00 - 5,248.34",
      "2 29-Apr- 29-Apr- PHUB65027 . B/O_AMBL AMBL BARCAE 10975 /REF/AMBL E019003 EFD",
      "2026 2026 5146 Group_BARC_650275 Group AD Group Limited C103103",
      "146_AMBL Gr Limited 7 SAL 2604290",
      "- 8 085745.F",
      "- 52,000.00 57,248.34 Britannia TR",
      "3 29-Apr- 29-Apr- PHUB49188 . SALARY SALARY",
      "2026 2026 0411 24,000.00 - 33,248.34",
      "4 29-Apr- 29-Apr- PHUB49188 . SALARY SALARY",
      "2026 2026 2594 15,492.96 - 17,755.38",
    ].join("\n");

    const rows = recoverAdcbTransactionsFromOcrText(text);

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ debit: 1000, credit: 0, balance: 5248.34 });
    expect(rows[1]).toMatchObject({ debit: 0, credit: 52000, balance: 57248.34 });
    expect(rows[2]).toMatchObject({ debit: 24000, credit: 0, balance: 33248.34 });
    expect(rows[3]).toMatchObject({ debit: 15492.96, credit: 0, balance: 17755.38 });
  });

  it("keeps Emirates Islamic account summary/page headers out of transactions", () => {
    const text = [
      "Statement of Account",
      "Name INGENIOUS TEAM FZ-LLC",
      "Period 01/02/2026 - 28/02/2026 Page 1/7",
      "Account (s) Summary",
      "Account No. Account Type Currency Profit Payout Total Debit Total Credit Closing Balance",
      "370-85*****4-02 CURRENT ACCOUNT EUR NA 87,924.71 34,920.00 42,031.76",
      "Emirates Islamic Bank (P.J.S.C.) is licensed by the Central Bank of the UAE.",
      "Statement of Account",
      "Period 01/02/2026 - 28/02/2026 Page 3/7",
      "Account Details",
      "Account No. Account Type Currency Profit Payout Branch IBAN",
      "370-85*****0402 CURRENT ACCOUNT EUR NA EI AL TWAR AE4703400037085****0402",
      "Date Description Debits Credits Balance",
      "01 Feb 2026 Opening Balance: 95,036.47",
      "02 Feb 2026 EURO MAINTENANCE FEE - 01/2 026 VALUE DATE: 31-J 50.00 94,986.47",
      "AN-26 026",
      "VALUE ADDED TAX @ 5% FOR EU RO MAINT FEE",
      "02 Feb 2026 2.50 94,983.97",
      "VALUE D",
      "ATE: 31-JAN-26 RO MAINT FEE",
      "13 Feb 2026 IFT- DTB TT REF EPHCOP0440925M4 G 222-91*****7-5 5,077.36 89,906.61",
      "00 12 TAHOR PELEG YEHUDA BUCHAREST NO 123 RO",
      "R G",
      "CHARGES EPHCOP0440925M4G 2229130226 754900",
      "13 Feb 2026 30.00 89,876.61",
      "DTB T",
      "T CORR CHA12 RGE 754900 DTB TT CORR CHA12 R",
      "CHARGES EPHCOP0440925M4G 2229130226 754900",
      "13 Feb 2026 5.98 89,870.63",
      "DTB B",
      "ANK CHARGE12 @4.18157 754900 DTB BANK",
      "CHARGE12 S",
      "VALUE ADDED TAX EPHCOP0440925M4G 2229130226",
      "13 Feb 2026 0.30 89,870.33",
      "75490",
      "0 DTB VAT 12 @4.18157 754900 DTB VAT 12",
      "16 Feb 2026 IFT- DTB TT REF EPHCOP045092HIX B 222-91*****1-8 79,690.00 7,118.05",
      "33 13 ARIANA AUTOMOBILE GMBH OED 1 GERMANY DE",
      "D B",
      "CHARGES EPHCOP045092HIXB 2229140226 184033 DTB",
      "16 Feb 2026 0.30 7,111.76",
      "18403",
      "3 DTB VAT 13 @4.17581 184033 DTB VAT 13",
      "INWARD REMITTANCE TT REF: GER025384049 EUR 34",
      "19 Feb 2026 34,920.00 42,031.76",
      "920",
      "JK TECHNO TRADE LTD INVOICE IT015 DATE 16.02.202",
      "28 Feb 2026 Closing Balance: 42,031.76",
    ].join("\n");

    const rows = recoverEmiratesIslamicTransactionsFromOcrText(text);

    expect(rows.some((row) => row.balance === 7 || row.debit === 2026 || row.credit === 7)).toBe(false);
    expect(rows[0]).toMatchObject({ debit: 50, credit: 0, balance: 94986.47 });
    expect(rows.at(-1)).toMatchObject({ debit: 0, credit: 34920, balance: 42031.76 });
  });

  it("uses opening balance to correct an edge row while preserving extracted amounts", () => {
    const transactions: Transaction[] = [
      {
        date: "2026-04-14",
        description: "TRF TO AMBL LLC FZ",
        category: "Other",
        debit: 0,
        credit: 1000,
        balance: 5248.34,
      },
      {
        date: "2026-04-29",
        description: "B/O_AMBL",
        category: "Other",
        debit: 0,
        credit: 52000,
        balance: 57248.34,
      },
    ];

    const rows = sanitizeTransactions(transactions, {
      openingBalance: 6248.34,
      preserveAmounts: true,
    });

    expect(rows[0]).toMatchObject({ debit: 1000, credit: 0, balance: 5248.34 });
    expect(rows[1]).toMatchObject({ debit: 0, credit: 52000, balance: 57248.34 });
  });
});
