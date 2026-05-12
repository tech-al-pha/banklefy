# Banklefy — Intelligent Bank Statement Converter & Financial Analyzer

Banklefy is an AI-powered SaaS platform that converts bank statements (PDF, JPG, PNG) into clean, structured financial data within seconds.

Along with conversion, it provides fraud detection, tampering checks, underwriting insights, and financial analysis — helping users reduce manual work and make faster decisions.

Built for:

* Chartered Accountants (CAs)
* Freelancers
* Small lenders
* NBFCs
* Financial professionals
* Individuals across India

The platform focuses on accuracy, privacy, automation, and workflow efficiency.

---

## Live Platform

🌐 https://www.banklefy.site

Secure • Fast • Mobile-Friendly

---

# Core Features

## Statement Conversion & Export

* Anonymous users: 2 free conversions/day
* Logged-in users: 5 free conversions/day
* Free exports: Excel + CSV
* Premium exports: Excel, CSV, JSON, MT940
* Tally Prime XML export support

## Financial Analysis & Detection

* Fraud detection system
* Edited/tampered PDF detection
* Pricing mismatch detection
* Reverse amount detection
* Circular transaction pattern detection
* FOIR (Fixed Obligation to Income Ratio) analysis
* Loan eligibility insights
* AI financial assistant for queries and explanations

## Productivity Features

* Multiple file uploads
* Merge or separate reports
* Automated analyzed PDF reports
* 24-hour automatic data deletion
* reCAPTCHA protection
* Privacy-focused workflow

---

# Pricing

Flexible plans starting from approximately $1 per conversion.

Subscription plans available for individuals and professionals with higher usage requirements.

---

# Upcoming Features / Roadmap

* Team collaboration & shared workspaces
* Public API access
* QuickBooks export support
* Xero export support
* Zoho Books export support
* GST reconciliation
* Receipt & invoice matching
* Cash flow forecasting
* Behavioral risk scoring
* Account Aggregator (AA) integration

---

# Tech Stack

Frontend:

* React
* TypeScript
* Vite

UI & Styling:

* Tailwind CSS
* shadcn/ui

AI & Processing:

* OCR + AI-assisted extraction
* Financial analysis engines
* Fraud detection systems

Infrastructure:

* Vercel
* Supabase
* Cloudflare

Security:

* Bank-grade encryption
* 24-hour auto-delete
* reCAPTCHA v3

---

# Razorpay Integration

Banklefy uses Razorpay Standard Checkout.

Order creation and payment verification are handled securely through Supabase Edge Functions.

Required server-side environment variables:

* RAZORPAY_KEY_ID
* RAZORPAY_KEY_SECRET
* RECA
