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
* No aren't kept you data
* reCAPTCHA protection
* Privacy-focused workflow

---

# Pricing

Flexible plans starting from approximately $2 per page.

Subscription plans available for individuals and professionals with higher usage requirements.

---

# Upcoming Features / Roadmap

* Team collaboration & shared workspaces
* Public API access
* Receipt & invoice matching
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
* Render

Security:

* Bank-grade encryption
* No data store
* reCAPTCHA v3
* RLS policy
---

# Razorpay Integration

Banklefy uses Razorpay Standard Checkout.

Order creation and payment verification are handled securely through Supabase Edge Functions.

Recommended Supabase function secrets:

* `RAZORPAY_MODE`
* `RAZORPAY_TEST_KEY_ID`
* `RAZORPAY_TEST_KEY_SECRET`
* `RAZORPAY_LIVE_KEY_ID`
* `RAZORPAY_LIVE_KEY_SECRET`

Legacy fallback secrets still supported:

* `RAZORPAY_KEY_ID`
* `RAZORPAY_KEY_SECRET`

To enable live mode safely:

1. Set `RAZORPAY_MODE=live` in Supabase function secrets.
2. Set `RAZORPAY_LIVE_KEY_ID` and `RAZORPAY_LIVE_KEY_SECRET`.
3. Redeploy `razorpay-order` and `razorpay-verify`.
4. Run a real purchase smoke test on production and confirm:
   `razorpay_orders.status = paid`
   `razorpay_payments` row created
   `subscriptions.plan_type` and page limit updated

The frontend checkout key is returned by the secure order function, so live/test selection should be controlled from server-side secrets instead of the client bundle.
