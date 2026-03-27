import { describe, expect, it } from 'vitest';

import {
  detectPdfAmountColumnLayout,
  extractAnchoredAmountsFromLayout,
  type PdfAmountLineEntry,
} from './pdf-column-layout.ts';

type TestToken = { x: number; text: string };

const isAmountToken = (value: string): boolean =>
  /^[+-]?(?:\(?\d{1,3}(?:,\d{2,3})+\)?|\(?\d{1,7}\)?)(?:\.\d{1,4})?(?:\s*(?:CR|DR))?$/i.test(value);

const parseAmount = (value: string): number => {
  const normalized = value.replace(/,/g, '').trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const inferSide = (text: string, amount: number): { debit: number; credit: number } => {
  const lower = text.toLowerCase();
  const absAmount = Math.abs(amount);
  if (/withdraw|charge|chgs|fee|debit|dr\b/i.test(lower)) return { debit: absAmount, credit: 0 };
  if (/deposit|credit|cr\b/i.test(lower)) return { debit: 0, credit: absAmount };
  return { debit: 0, credit: absAmount };
};

describe('pdf-column-layout', () => {
  const header: PdfAmountLineEntry<TestToken> = {
    text: 'DATE MODE PARTICULARS DEPOSITS WITHDRAWALS BALANCE',
    tokens: [
      { x: 27, text: 'DATE' },
      { x: 75, text: 'MODE' },
      { x: 158, text: 'PARTICULARS' },
      { x: 387, text: 'DEPOSITS' },
      { x: 444, text: 'WITHDRAWALS' },
      { x: 545, text: 'BALANCE' },
    ],
  };

  it('maps deposits to credit and withdrawals to debit from header labels', () => {
    const layout = detectPdfAmountColumnLayout(
      [
        header,
        {
          text: '01-01-2026 Salary credit 8,000.00 8,015.67',
          tokens: [
            { x: 27, text: '01-01-2026' },
            { x: 158, text: 'Salary credit' },
            { x: 396, text: '8,000.00' },
            { x: 552, text: '8,015.67' },
          ],
        },
      ],
      isAmountToken,
    );

    expect(layout).not.toBeNull();
    expect(layout?.creditCenter).toBeLessThan(layout?.debitCenter ?? 0);
  });

  it('keeps single amount rows on the correct side using column position', () => {
    const layout = detectPdfAmountColumnLayout(
      [
        header,
        {
          text: '01-01-2026 Salary credit 8,000.00 8,015.67',
          tokens: [
            { x: 27, text: '01-01-2026' },
            { x: 158, text: 'Salary credit' },
            { x: 396, text: '8,000.00' },
            { x: 552, text: '8,015.67' },
          ],
        },
        {
          text: '01-01-2026 CashDep Chgs 15.66 0.01',
          tokens: [
            { x: 27, text: '01-01-2026' },
            { x: 158, text: 'CashDep Chgs' },
            { x: 485, text: '15.66' },
            { x: 568, text: '0.01' },
          ],
        },
      ],
      isAmountToken,
    );

    const creditRow = extractAnchoredAmountsFromLayout(
      {
        text: '01-02-2026 6,96,967.00 6,96,967.01',
        tokens: [
          { x: 27, text: '01-02-2026' },
          { x: 385, text: '6,96,967.00' },
          { x: 541, text: '6,96,967.01' },
        ],
      },
      layout,
      { inferSide, isAmountToken, parseAmount },
    );
    const debitRow = extractAnchoredAmountsFromLayout(
      {
        text: '08-01-2026 CashDep Chgs 15.66 0.01',
        tokens: [
          { x: 27, text: '08-01-2026' },
          { x: 158, text: 'CashDep Chgs' },
          { x: 485, text: '15.66' },
          { x: 568, text: '0.01' },
        ],
      },
      layout,
      { inferSide, isAmountToken, parseAmount },
    );

    expect(creditRow).toEqual({
      debit: 0,
      credit: 696967,
      balance: 696967.01,
    });
    expect(debitRow).toEqual({
      debit: 15.66,
      credit: 0,
      balance: 0.01,
    });
  });
});
