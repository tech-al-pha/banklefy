# Banklefy“ Intelligent Bank Statement Converter & Financial Analyzer

Banklefy is a modern, AI-powered SaaS tool that transforms messy bank statements (PDF, JPG, PNG) into clean, actionable data in seconds. With built-in fraud detection, tampering checks, and advanced financial insights, it eliminates manual data entry and empowers users to make faster, smarter decisions.

Designed specifically for Chartered Accountants (CAs), freelancers, small lenders, NBFCs, and individuals in India â€“ delivering 99%+ accuracy, privacy-first processing, and unbeatable value.

## Live Platform
ðŸŒ **https://banklefy.site***  
Secure â€¢ Fast â€¢ Mobile-Friendly

## Key Features
### Core Conversion & Export
- Anonymous users: 2 free conversions per day
- Logged-in users: 5 free conversions per day
- All users: 2 free export formats (Excel + CSV)
- Paid users: 4 premium formats (Excel, CSV, JSON, MT940)
- Direct Tally Prime XML export â€“ ready for seamless import (no manual tweaks needed)

### Advanced Detection & Insights
- Fraud Detector â€“ flags suspicious patterns and anomalies
- Edited PDF / Tampered Document Detector â€“ identifies manipulated statements
- Pricing Mismatch Detector â€“ alerts on inconsistent transaction amounts
- Reverse Amount Detector â€“ highlights repeated identical transactions on the same day/location
- LOAN / FOIR Analyser â€“ calculates Fixed Obligation to Income Ratio and estimates loan approval probability
- AI Financial Assistant â€“ chat interface for instant queries, explanations, and insights

### Workflow & Productivity Tools
- Multiple file upload â€“ process several statements at once
- Merge or separate Excel reports â€“ consolidate multi-bank data or keep individual files
- Free Analysed PDF Report â€“ detailed summary with visuals and highlights
- 24-hour automatic data deletion â€“ your privacy is our priority (bank-level encryption + reCAPTCHA)
- Clear refund policy for complete peace of mind

### Pricing
Affordable & flexible plans starting from $1 per conversion  
Basic subscriptions from $20 â€“ no hidden fees, maximum value.

## Roadmap â€“ What's Coming Next
- Team collaboration: Shared workspaces, role-based access, and real-time comments
- Public API: Seamless integration with your apps, CRMs, or loan origination systems
- QuickBooks Online & Desktop format export
- Xero format export
- Zoho Books format export

Future enhancements include: GST reconciliation, transaction splitting, receipt/invoice matching, cash flow forecasting, behavioral risk scoring, and Account Aggregator (AA) integration.

## Tech Stack
- Frontend: React â€¢ TypeScript â€¢ Vite
- Styling: Tailwind CSS â€¢ shadcn/ui
- AI & Processing: Advanced OCR + ML models for extraction, fraud detection, and analysis
- Deployment & Hosting: Lovable.dev with custom domain support
- Security: Bank-grade encryption, 24-hour auto-delete, reCAPTCHA v3

## Razorpay (Standard Checkout) Setup
- Frontend uses Razorpay Checkout modal; order creation + signature verification happen in Supabase Edge Functions (supabase/functions/razorpay-order, supabase/functions/razorpay-verify).
- Configure these as Supabase Function secrets (server-side only):
  - RAZORPAY_KEY_ID (rzp_test_... for test, rzp_live_... for production)
  - RAZORPAY_KEY_SECRET (must match the same mode as the key id)
