

## Batch Mode Panels and Export Format Restrictions

### Summary
This plan adds financial analysis panels (FOIR/Loan Eligibility, Fraud Detection) for batch conversions, introduces DOCX and XML export formats, and implements premium-tier export restrictions.

---

### What Will Change

**For Batch Conversions:**
- UnderwritingPanel (FOIR, Salary/EMI analysis) will appear when multiple files are processed
- FraudAlertPanel (integrity score, risk flags) will appear for batch results
- Download options will show: Excel, CSV, XML, and DOCX

**Export Format Access:**
| Format | Free Users | Paid Users |
|--------|------------|------------|
| Excel  | Yes        | Yes        |
| CSV    | Yes        | Yes        |
| DOCX   | No (locked)| Yes        |
| XML    | No (locked)| Yes        |

---

### Technical Changes

**1. Backend: Aggregate Analytics for Batch Mode**

Update `convert-statements-batch` edge function to return aggregated analytics data:
- Combine all transactions from all statements
- Calculate total credits/debits across all files
- Generate combined underwriting analysis (FOIR, salary, EMI)
- Generate combined fraud alerts and risk analysis

**2. Frontend: Display Panels for Batch**

Update `UploadDemo.tsx`:
- Parse aggregated analytics from batch response
- Set `analytics` state with combined data
- UnderwritingPanel and FraudAlertPanel will automatically render

**3. New Export Functions**

Add two new export functions:
- `exportAsDOCX()` - Generate Word document using docx library
- `exportAsXML()` - Generate structured XML file

**4. Premium Tier Lock**

- Use `planType` from `useUsageLimit` hook to determine access
- Free users see DOCX/XML buttons disabled with lock icon
- Clicking locked buttons shows upgrade message

**5. UI Updates**

Replace batch export buttons:
```
Current:        | After:
----------------|------------------
PDF Report      | Excel (available)
CSV             | CSV (available)
JSON            | XML (paid only)
                | DOCX (paid only)
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/convert-statements-batch/index.ts` | Add aggregated analytics calculation and return in response |
| `src/components/UploadDemo.tsx` | Parse batch analytics, add DOCX/XML exports, premium locks |
| `package.json` | Add `docx` library for Word document generation |

---

### New Dependencies

- `docx` - Microsoft Word document generation library

---

### Export Format Details

**Excel**: Already implemented (xlsx)

**CSV**: Already implemented (text/csv)

**XML**: New format
```xml
<?xml version="1.0" encoding="UTF-8"?>
<BankStatement>
  <Metadata>
    <GeneratedAt>2026-02-05T12:00:00Z</GeneratedAt>
    <Bank>Bank Name</Bank>
  </Metadata>
  <Transactions>
    <Transaction>
      <Date>2026-01-15</Date>
      <Description>Salary</Description>
      <Category>Salary/Income</Category>
      <Debit>0</Debit>
      <Credit>50000</Credit>
      <Balance>75000</Balance>
    </Transaction>
  </Transactions>
</BankStatement>
```

**DOCX**: New format
- Professional Word document with Banklefy branding
- Financial summary table
- FOIR analysis section
- Transaction list table

---

### User Experience

1. **Multiple file upload** -> Conversion complete
2. **Panels appear**: UnderwritingPanel shows FOIR/salary analysis, FraudAlertPanel shows integrity score
3. **Download options**:
   - Excel and CSV buttons always enabled
   - DOCX and XML show lock icon for free users
   - Paid users get all 4 formats

