# Plan: Maximum Accuracy + Premium Excel Output

## Goal
Aapka rule strictly enforce karna:
- **Text-based PDFs → 100% pure code** (no LLM, no OCR). Deterministic parsing only.
- **Image/scanned PDFs → OCR/LLM** only on those specific pages where text layer missing hai.
- **All calculations → real math** (minor-units, no floating drift, no AI guessing).
- **Excel structure → premium**, with extra value-add sheets.

---

## Part 1 — Routing Engine (text vs image, per-page)

File: `supabase/functions/_shared/ocr-routing.ts` + `convert-statements-batch/index.ts`

Make routing **per-page, not per-file**:
1. Run `pdfjs-dist` `getTextContent()` on every page.
2. Score each page: char-count, token density, presence of digit clusters, x-coordinate spread.
3. Classify each page as `text` | `scanned` | `mixed`.
4. **Text pages** → go straight to `pdf-column-layout.ts` (pure code). LLM/OCR fallback **disabled** for these pages even if extraction looks weak — instead retry with stricter column inference.
5. **Scanned pages only** → Mistral Vision (primary) → Groq Vision (fallback) → Gemini (last resort). Tesseract stays prohibited.
6. **Mixed PDFs** → merge: code-extracted rows from text pages + vision-extracted rows from scanned pages, then run unified sanitizer/dedupe.

Result: a 50-page text PDF never burns LLM tokens; a hybrid PDF only sends scanned pages.

---

## Part 2 — Deterministic Text Extraction Hardening

Files: `pdf-column-layout.ts`, `transaction-sanitizer.ts`, `date-parsing.ts`, `money.ts`

1. **Multi-pass column detection**: header-anchored → x-cluster anchored → balance-walk anchored. Pick the pass whose running-balance reconciles with debits/credits to minor-unit zero.
2. **Running-balance validator**: for every row, assert `prev_balance ± debit/credit == balance` in minor units. Mismatches → flagged in `Pricing Mismatch Flag` (already in sheet) instead of silently corrected.
3. **Multi-line description stitching**: merge wrapped description rows (no date, no amount) into the previous transaction.
4. **Reference-number vs amount disambiguation**: tighten the existing test cases so 6+ digit IDs never become amounts.
5. **Date normalization**: detect statement-wide date format once (DD/MM/YYYY vs MM/DD/YYYY) using period header + monotonicity check, then apply uniformly.
6. **Duplicate detection**: hash on (date, amount, normalized-description); flag in `Duplicate Flag`.

No LLM in any of the above — pure code.

---

## Part 3 — Vision Path (scanned only) Accuracy Boost

File: `mistral-processor.ts`, `ai-orchestrator.ts`, `ocr-processor.ts`

1. **Higher DPI render** (300 DPI) before sending image to vision model — better for blur/low-quality scans.
2. **Light pre-processing**: deskew + adaptive threshold + contrast boost (pure JS, no native deps) before vision call.
3. **Strict structured output**: vision model returns JSON schema `{date, ref, description, debit, credit, balance}` only — no free-form text.
4. **Self-check pass**: after vision returns rows, run the same running-balance validator from Part 2. If reconciliation fails → retry with second model. Still failing → flag rows, don't silently accept.
5. **Per-row confidence**: keep model confidence; rows below threshold get `Needs Review` flag.

---

## Part 4 — Real-Math Calculations

Files: `financial-engine.ts`, `underwriting-engine.ts`, `money.ts`

All sums, FOIR, ADB, EMI burden, totals → already use `toMinorUnits` / `fromMinorUnits`. Audit pass:
- Replace any remaining `+`/`-` on floats with `sumMinorUnits`.
- ADB = sum(daily_balance × days) / total_days, computed in minor units.
- Verify totals row in Excel = `SUM(...)` formula (so user can re-verify in Excel itself), not a hardcoded number.

---

## Part 5 — Premium Excel Structure

File: `excel-generator.ts` + `export-orchestrator.ts`

Aapke uploaded sample ka layout already match karta hai. Add **extra premium sheets** (paid plans only — free plans get base sheet):

```
Workbook
├── Transactions          (current sheet — keep as-is, polish)
├── Summary               (NEW)
├── Monthly Cashflow      (NEW)
├── Category Breakdown    (NEW)
├── Audit & Reconciliation (NEW)
└── Account Info          (NEW — moves header block here for cleaner Transactions tab)
```

**Transactions sheet improvements:**
- Header block stays at top (Bank, Currency, Account, Holder, Period, IBAN/IFSC).
- Totals row uses `=SUM(D:D)` / `=SUM(E:E)` formulas (not hardcoded).
- Balance column gets a `=prev+credit-debit` formula option as a verification column.
- Conditional formatting: red for debit, green for credit, yellow background for `YES` flags.
- Frozen header, auto-filter, column widths optimized.

**Summary sheet:**
Opening balance, closing balance, total debits, total credits, net flow, txn count, unique categories, statement period — all as live formulas pointing to Transactions.

**Monthly Cashflow sheet:**
Pivot-style: month × (debit, credit, net, closing balance).

**Category Breakdown sheet:**
Category × (count, total debit, total credit, % of spend).

**Audit & Reconciliation sheet:**
- Running-balance check pass/fail per row count
- Duplicate count
- Pricing mismatch count
- Pages classified text vs scanned
- Confidence summary
- "Integrity Score" from underwriting-engine

This sheet is the trust signal — proves accuracy.

---

## Part 6 — Plan Gating

`src/lib/entitlements.ts`:
- **Free / Lite**: Transactions sheet only (current behavior).
- **Standard / Power**: + Summary + Category Breakdown.
- **Starter and above**: all 6 sheets + JSON/MT940/Tally exports (already gated).

---

## Technical notes (for the dev agent)

- Per-page routing: extend `ocr-routing.ts` to return `Array<{pageNum, mode}>` instead of single mode.
- Running-balance validator: new file `_shared/balance-validator.ts`, used by both code path and vision path.
- Vision JSON schema: enforce via prompt + JSON parse with Zod-style validation; reject + retry on schema fail.
- Excel extra sheets: extend `ExcelConfig` with `monthlyCashflow`, `categoryBreakdown`, `auditReport` already computable from existing engines.
- No new dependencies needed — `exceljs`, `pdfjs-dist` already present.
- Keep "Tesseract prohibited" rule.
- Keep "usage increment only on success" rule.
- Keep CORS regex + IP-rightmost rules.

---

## Out of scope (not touching)
- Pricing / Razorpay flow (already fixed last turn)
- Auth, RLS, UI navigation
- Async job queue (separate scaling task)