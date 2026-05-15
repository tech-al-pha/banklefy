export type Language = 'en' | 'ar' | 'zh' | 'es' | 'hi';

export const availableLanguages: Language[] = ['en', 'ar', 'zh', 'es', 'hi'];
export const activeLanguages: Language[] = ['en', 'ar', 'zh', 'es', 'hi'];



export const translations: Record<Language, Record<string, string>> = {

  "en": {

    "nav.features": "Features",

    "nav.demo": "Demo",


    "nav.settings": "Settings",


    "nav.about": "About",

    "nav.signIn": "Sign In",

    "nav.signOut": "Sign Out",

    "nav.getStarted": "Get Started",

    "nav.pricing": "Pricing",

    "nav.benefits": "Benefits",

    "nav.menu": "Menu",

    "hero.title": "AI Bank Statement Converter",

    "hero.titleLine1": "Bank Statement",

    "hero.titleLine2": "Converter",

    "hero.tagline": "Professional Look | OCR-Powered | Instant Results",

    "hero.subtitle": "Banklefy converts bank statement PDFs into clean, structured spreadsheets with secure processing, accurate extraction, and multi-format export.",

    "hero.uploadBtn": "Upload Your Statement Now",

    "hero.pricingBtn": "View Pricing",

    "hero.sampleReportBtn": "Sample Report",

    "howItWorks.title": "How It Works",

    "howItWorks.subtitle": "Transform your bank statements into Excel in three simple steps",

    "howItWorks.step1.title": "Upload",

    "howItWorks.step1.desc": "Upload your bank statement in any format - PDF, scanned image, or photo. We support documents from any bank worldwide.",

    "howItWorks.step2.title": "AI Processing",

    "howItWorks.step2.desc": "Our AI-powered OCR instantly extracts and organizes transaction data with high accuracy. Works across major bank statement formats worldwide.",

    "howItWorks.step3.title": "Download Excel",

    "howItWorks.step3.desc": "Receive a clean, structured Excel spreadsheet ready for accounting, analysis, or integration with your financial tools.",

    "features.title": "Features",

    "features.accuracy": "High Accuracy",

    "features.accuracyDesc": "AI-powered extraction is designed to reduce errors.",

    "features.fast": "Lightning Fast",

    "features.fastDesc": "Convert statements in seconds",

    "features.secure": "Secure Processing",

    "features.secureDesc": "Encrypted in transit with access-controlled storage.",

    "pricing.title": "Pricing",

    "pricing.free": "Free",

    "pricing.daily": "Daily",

    "pricing.business": "Business",

    "upload.limit.daily.title": "Daily Limit Reached",

    "upload.limit.daily.authFree": "You've used all {limit} pages for today. Your daily limit resets at midnight. Upgrade for higher limits.",

    "upload.limit.daily.authPaid": "You've used all {limit} pages for your current plan. Upgrade to a higher plan to continue.",

    "upload.limit.daily.anon": "You've used all {limit} free pages for today. Create a free account for 5 pages/day or choose a plan for higher limits.",

    "upload.limit.page.title": "Page Limit",

    "upload.limit.page.auth": "Selected files have {total} pages, but only {remaining} pages are available today (daily limit {limit}). Remove some pages or upgrade your plan.",

    "upload.limit.page.anon": "Selected files have {total} pages, but only {remaining} free pages are available today (daily limit {limit}). Sign up for 5 pages/day or choose a plan.",

    "upload.limit.usage.title": "Usage Limit Reached",

    "upload.limit.paid.pack": "You've used all {limit} pages in your current pack. Purchase another plan to continue.",

    "upload.limit.paid.month": "You've used all {limit} pages for this month. Your plan usage resets at the start of next month.",

    "upload.limit.paid.year": "You've used all {limit} pages for this year. Your plan usage resets at the start of next year.",

    "upload.limit.paid.plan": "You've used all {limit} pages for your plan. Upgrade your plan to continue.",

    "upload.limit.signupCta": "Sign up for 5 free pages",

    "upload.limit.upgradeCta": "Upgrade Plan",

    "upload.remaining.counterSuffix": "of {limit} pages remaining",

    "upload.remaining.signupMore": "Sign up for more pages",

    "footer.product": "Product",

    "footer.features": "Features",

    "footer.pricing": "Pricing",

    "footer.howItWorks": "How It Works",

    "footer.resources": "Resources",

    "footer.docs": "Documentation",

    "footer.faqs": "FAQs",

    "footer.sampleReport": "Sample Report",

    "footer.security": "Security",

    "footer.contact": "Contact Us",

    "footer.cookiePolicy": "Cookie Policy",

    "docsPage.badge": "Documentation",

    "docsPage.title": "Documentation",

    "docsPage.subtitle": "Everything you need to use Banklefy with confidence.",

    "docsPage.sections.gettingStarted.title": "Getting started",

    "docsPage.sections.gettingStarted.desc": "Upload a bank statement, review the preview, and export in Excel/CSV/Tally when ready.",

    "docsPage.sections.formats.title": "Supported formats",

    "docsPage.sections.formats.desc": "PDF, JPG, and PNG are supported. Text PDFs process faster; scans may take longer.",

    "docsPage.sections.limits.title": "Usage limits",

    "docsPage.sections.limits.desc": "Free users get daily pages; paid packs add more pages and premium exports.",

    "docsPage.sections.security.title": "Security basics",

    "docsPage.sections.security.desc": "Your data is handled securely, and access is restricted to your account or active session.",

    "faqPage.badge": "FAQs",

    "faqPage.title": "Frequently Asked Questions",

    "faqPage.subtitle": "Quick answers to the most common questions.",

    "faqPage.items.formats.title": "Which file formats are supported?",

    "faqPage.items.formats.desc": "PDF, JPG, and PNG files are supported for both text and scanned statements.",

    "faqPage.items.password.title": "Do you support password-protected PDFs?",

    "faqPage.items.password.desc": "Yes. Enter the password in the unlock field before conversion.",

    "faqPage.items.timing.title": "How long does conversion take?",

    "faqPage.items.timing.desc": "Text PDFs are fast; scanned statements can take longer based on size.",

    "faqPage.items.refund.title": "Where can I request a refund?",

    "faqPage.items.refund.desc": "Refunds are handled from the Pricing page under Refund Policy.",

    "faqPage.items.storage.title": "Do you store my files?",

    "faqPage.items.storage.desc": "Temporary files are available during your session for download. Refreshing or ending the session removes access inside the app.",

    "footer.help.title": "Help",

    "footer.help.item1": "Supported files: PDF, JPG, PNG (scans & photos)",

    "footer.help.item2": "Password-protected PDFs: enter password before convert",

    "footer.help.item3": "Daily limits: anonymous 2 pages/day, signed-in free 5 pages/day, paid plans follow the selected limit",

    "footer.help.item4": "Accuracy tips: upload full pages, avoid blur",

    "footer.help.item5": "Need help? Contact support.",

    "footer.company": "Company",

    "footer.about": "About",

    "footer.privacy": "Privacy Policy",

    "footer.terms": "Terms & Conditions",

    "footer.cta.title": "Ready to Transform Your",

    "footer.cta.subtitle": "Financial Workflow?",

    "footer.cta.desc": "Built for teams and individuals who need accurate, instant bank statement page processing.",

    "footer.cta.btn": "Start Converting Now",

    "footer.copyright": "© 2026 Banklefy. Created by Faizan Rizvi.",

    "footer.recaptcha.prefix": "This site is protected by reCAPTCHA and the Google",

    "footer.recaptcha.privacy": "Privacy Policy",

    "footer.recaptcha.and": "and",

    "footer.recaptcha.terms": "Terms of Service",

    "footer.recaptcha.suffix": "apply.",

    "auth.welcome": "Welcome back!",

    "auth.signedIn": "You have successfully signed in.",

    "auth.accountCreated": "Account created!",

    "auth.canUse": "You can now start using Banklefy.",

    "auth.email": "Email",

    "auth.password": "Password",

    "auth.signIn": "Sign In",

    "auth.signUp": "Sign Up",

    "auth.forgotPassword": "Forgot password?",

    "auth.noAccount": "Don't have an account? Sign up",

    "auth.hasAccount": "Already have an account? Sign in",

    "auth.secureAccess": "Secure Access",

    "common.back": "Back",

    "common.backToHome": "Back to Home",

    "featuresPage.title": "ALL FEATURES",

    "featuresPage.subtitle": "Complete A-Z list of everything Banklefy offers - from AI-powered OCR to privacy-first processing. Built for accuracy, speed, and clear financial analysis.",

    "featuresPage.categories.core": "Core Technology",

    "featuresPage.categories.financial": "Financial Analysis",

    "featuresPage.categories.risk": "Risk Analysis",


    "featuresPage.categories.export": "Export",

    "featuresPage.categories.performance": "Performance",

    "featuresPage.categories.security": "Security",

    "featuresPage.categories.privacy": "Privacy",

    "featuresPage.categories.accessibility": "Accessibility",

    "featuresPage.categories.technology": "Technology",

    "featuresPage.categories.usage": "Usage",

    "featuresPage.items.aiOcr.title": "AI-POWERED OCR ENGINE",

    "featuresPage.items.aiOcr.desc": "Extracts data from PDFs, scans, and photos. Recognizes transaction tables, dates, amounts, and descriptions with high accuracy — even from low-quality documents.",

    "featuresPage.items.excelCsv.title": "EXCEL & CSV EXPORT",

    "featuresPage.items.excelCsv.desc": "Export clean Excel (.xlsx) and CSV with proper columns (Date, Description, Debit, Credit, Balance, Category). Works with popular accounting tools.",

    "featuresPage.items.pdfReport.title": "PDF REPORT GENERATION",

    "featuresPage.items.pdfReport.desc": "Creates a clean PDF summary from extracted transactions (totals, key metrics, and highlights) for audits and loan files.",

    "featuresPage.items.foir.title": "FOIR CALCULATION",

    "featuresPage.items.foir.desc": "Automatically calculates FOIR using rule-based analysis by detecting salary credits and EMI debits — used in loan eligibility assessment.",

    "featuresPage.items.emiDetection.title": "EMI DETECTION",

    "featuresPage.items.emiDetection.desc": "Detects recurring EMIs via deterministic patterns (home/car/personal loans, credit card EMIs, BNPL). No guessing — fully explainable.",

    "featuresPage.items.salaryAnalysis.title": "SALARY CREDIT ANALYSIS",

    "featuresPage.items.salaryAnalysis.desc": "Finds salary credits using recurring patterns and employer keywords to estimate average monthly income for underwriting.",

    "featuresPage.items.cashflow.title": "CASHFLOW ANALYSIS",

    "featuresPage.items.cashflow.desc": "Breaks down inflows/outflows and net cashflow with category summaries and trend insights.",

    "featuresPage.items.adbAmb.title": "AVERAGE DAILY BALANCE",

    "featuresPage.items.adbAmb.desc": "Computes ADB/AMB metrics used by banks for minimum balance checks and lending assessments.",

    "featuresPage.items.fraudDetection.title": "FRAUD DETECTION",

    "featuresPage.items.fraudDetection.desc": "Flags suspicious patterns like round-figure transactions, weekend anomalies, duplicates, and balance mismatches.",

    "featuresPage.items.integrityScoring.title": "INTEGRITY SCORING",

    "featuresPage.items.integrityScoring.desc": "Validates statement consistency across dates and balances to help detect tampering and errors.",

    "featuresPage.items.underwritingPanel.title": "UNDERWRITING PANEL",

    "featuresPage.items.underwritingPanel.desc": "All key metrics at a glance: income, EMI, FOIR, balance trends, and risk flags — built for lending decisions.",

    "featuresPage.items.banks.title": "SUPPORTS 1000+ BANKS",

    "featuresPage.items.banks.desc": "Works with a wide range of bank statement layouts and formats — including major Indian and international banks.",

    "featuresPage.items.instantProcessing.title": "INSTANT PROCESSING",

    "featuresPage.items.instantProcessing.desc": "Fast processing for text PDFs; scanned statements can take longer.",

    "featuresPage.items.batchProcessing.title": "BATCH PROCESSING",

    "featuresPage.items.batchProcessing.desc": "Convert multiple statements in parallel — great for accountants and bulk workflows.",



    "featuresPage.items.encryption.title": "ENCRYPTION IN TRANSIT",

    "featuresPage.items.encryption.desc": "Data is encrypted during upload and transfer to protect sensitive financial data.",

    "featuresPage.items.zeroRetention.title": "CONTROLLED FILE ACCESS",

    "featuresPage.items.zeroRetention.desc": "Temporary uploads are available during your active session. Refreshing or ending the session removes access inside the app.",

    "featuresPage.items.categorization.title": "SMART CATEGORIZATION",

    "featuresPage.items.categorization.desc": "Automatically classifies transactions into categories (Salary, EMI, Utilities, Shopping, Food, etc.) with customizable mapping.",

    "featuresPage.items.exportFormats.title": "MULTIPLE EXPORT FORMATS",

    "featuresPage.items.exportFormats.desc": "Plan-based exports: Excel/CSV for everyone, plus JSON & MT940 on paid plans.",

    "featuresPage.items.ruleBased.title": "RULE-BASED ACCURACY",

    "featuresPage.items.ruleBased.desc": "Deterministic calculations: no hallucinations, no guessing — every number is computed with precision and can be explained.",

    "featuresPage.items.dailyLimits.title": "DAILY RESET LIMITS",

    "featuresPage.items.dailyLimits.desc": "Free limits reset daily at midnight local time. Anonymous users get 2 pages/day; signed-in users get 5 pages/day. Paid plans reset with their billing cycle.",

    "featuresPage.cta.title": "Ready to Experience All Features?",

    "featuresPage.cta.desc": "Start with 2 free pages per day. Sign up for 5 pages per day and unlock the full power of Banklefy.",

    "featuresPage.cta.tryDemo": "Try Demo Now",

    "featuresPage.cta.signUp": "Sign Up Free",

    "featuresPage.footer": "© 2026 Banklefy | Engineered for Excellence",

    "aboutPage.visionTitle": "Welcome to Banklefy",

    "aboutPage.visionSubtitle": "Secure bank statement conversion for modern finance.",

    "aboutPage.visionP1": "Banklefy converts PDFs, scans, and images into clean Excel/CSV exports with accuracy and privacy at the core. We built it for accountants, finance teams, and small businesses who need reliable data without risky manual copy-paste.",

    "aboutPage.brainchildPrefix": "Hi, I'm",

    "aboutPage.brainchildP1": "I'm a security-focused builder from Kota, Rajasthan. I started Banklefy to remove friction from statement processing while keeping sensitive data protected. I obsessively test real bank layouts to keep outputs clean and dependable.",

    "aboutPage.brainchildP2": "I launched Banklefy in 2026, blending deterministic parsing and careful OCR to deliver trustworthy exports for real accounting workflows — with a constant focus on accuracy, privacy, and audit readiness.",

    "aboutPage.problemTitle": "The Problem We Solve",

    "aboutPage.problemIntro": "Bank statements are inconsistent, time-consuming, and risky to handle manually.",

    "aboutPage.problemBullets.one": "Every bank uses different layouts with merged cells and split rows.",

    "aboutPage.problemBullets.two": "Manual copy-paste wastes hours and introduces costly errors.",

    "aboutPage.problemBullets.three": "Sensitive financial data shouldn’t live in random spreadsheets.",

    "aboutPage.problemBullets.four": "Generic OCR struggles with dense Indian statements and narration.",

    "aboutPage.solutionTitle": "Why Banklefy",

    "aboutPage.solutionIntro": "A privacy-first conversion engine built for real accounting workflows.",

    "aboutPage.solutionBullets.one": "Deterministic parsing for text PDFs — OCR only when needed.",

    "aboutPage.solutionBullets.two": "High-accuracy extraction tuned for Indian banks.",

    "aboutPage.solutionBullets.three": "Exports ready for Excel, CSV, and Tally-friendly workflows.",

    "aboutPage.solutionBullets.four": "Minimal retention with clear audit traces and controls.",

    "aboutPage.solutionBullets.five": "Designed for accountants, tax consultants, and finance teams.",

    "aboutPage.audienceTitle": "Built For",

    "aboutPage.audienceIntro": "If you work with statements daily, Banklefy was built for you.",

    "aboutPage.audienceBullets.one": "Chartered accountants and tax consultants handling client books.",

    "aboutPage.audienceBullets.two": "Finance teams reconciling multi-account statements.",

    "aboutPage.audienceBullets.three": "Bookkeepers who need clean exports in minutes.",

    "aboutPage.audienceBullets.four": "Founders who want quick, trustworthy reports.",

    "aboutPage.principlesTitle": "Our Principles",

    "aboutPage.principlesIntro": "We optimize for clarity, privacy, and predictable outputs.",

    "aboutPage.principlesBullets.one": "Deterministic-first logic with OCR as a fallback.",

    "aboutPage.principlesBullets.two": "Balance-aware checks to reduce silent errors.",

    "aboutPage.principlesBullets.three": "Data-minimization and privacy-first handling.",

    "aboutPage.principlesBullets.four": "Clear, audit-ready exports you can trust.",

    "aboutPage.valueProps.cyberSafe.title": "Cyber-Safe",

    "aboutPage.valueProps.cyberSafe.desc": "Security-first handling for sensitive financial workflows.",

    "aboutPage.valueProps.instantFlux.title": "Instant Flux",

    "aboutPage.valueProps.instantFlux.desc": "Convert complex statements fast without manual entry.",

    "aboutPage.valueProps.accuracy.title": "High Accuracy",

    "aboutPage.valueProps.accuracy.desc": "Accuracy-focused conversion for high-stakes financial data.",

    "aboutPage.roadmapTitle": "What’s Next",

    "aboutPage.roadmapBullets.one": "Bulk processing and team workspaces.",

    "aboutPage.roadmapBullets.two": "Integrations with QuickBooks, Zoho Books, and Xero.",

    "aboutPage.roadmapBullets.three": "Smarter categorization and cashflow insights.",

    "aboutPage.roadmapBullets.four": "More bank formats and layout coverage.",

    "aboutPage.connectTitle": "Connect with the Creator",

    "aboutPage.contact.hotline": "Hotline",

    "aboutPage.contact.mail": "Direct Mail",

    "aboutPage.contact.social": "Social",

    "aboutPage.contact.hq": "HQ",

    "aboutPage.contact.hqValue": "Prem Nagar, Kota, Rajasthan 324004",
    "aboutPage.footer": "© 2026 Banklefy | Engineered for Excellence",

    "privacyPage.badge": "Privacy and Transparency",

    "privacyPage.title": "Privacy Policy",

    "privacyPage.subtitle": "We collect only what we need to run and secure the service.",

    "privacyPage.lastUpdated": "Last updated: March 18, 2026",

    "privacyPage.sections.zeroRetention.title": "File Availability",

    "privacyPage.sections.zeroRetention.desc": "Uploaded files are processed during your active session. Refreshing or ending the session removes access inside the app.",

    "privacyPage.sections.encryption.title": "Encryption in Transit",

    "privacyPage.sections.encryption.desc": "Data is encrypted during upload and transfer. We use reputable providers and industry standard security controls.",

    "privacyPage.sections.noTracking.title": "No Ad Tracking",

    "privacyPage.sections.noTracking.desc": "We do not sell your data or run advertising trackers. We may use anti abuse tools like reCAPTCHA which can collect device signals and set cookies.",

    "privacyPage.sections.aiPowered.title": "Automated Processing",

    "privacyPage.sections.aiPowered.desc": "Processing is primarily automated. Access to data is limited to authorized staff for support or legal reasons.",

    "privacyPage.sections.compliance.title": "Privacy Minded",

    "privacyPage.sections.compliance.desc": "We aim to follow privacy principles and be transparent about how data is used.",

    "privacyPage.aboutTitle": "About Banklefy",

    "privacyPage.aboutP1": "Banklefy is a smart, fast, and secure tool built to convert bank statements from PDF to Excel with precision and ease.",

    "privacyPage.aboutP2Prefix": "This platform was created by",

    "privacyPage.aboutP2Suffix": ", based in Kota, Rajasthan, India. Banklefy launched in 2026 to help individuals and businesses save time and effort with financial data.",

    "privacyPage.whatTitle": "What Banklefy Does",

    "privacyPage.whatItems.item1": "Converts complex bank statement PDFs into clean, editable Excel sheets",

    "privacyPage.whatItems.item2": "Maintains formatting, columns, and transaction clarity",

    "privacyPage.whatItems.item3": "Works instantly — no software installation required",

    "privacyPage.whatItems.item4": "Designed with data privacy and security at its core",

    "privacyPage.contactTitle": "Questions?",

    "privacyPage.contactDescPrefix": "For privacy questions, contact support.",

    "privacyPage.footer": "(c) 2026 Banklefy. All rights reserved.",

    "securityPage.badge": "Security & Trust",

    "securityPage.title": "Security",

    "securityPage.subtitle": "How Banklefy protects your data and conversions.",

    "securityPage.lastUpdated": "Last updated: Mar 17, 2026",

    "securityPage.sections.dataHandling.title": "Data handling",

    "securityPage.sections.dataHandling.desc": "Files are processed to generate exports. We do not sell data and we restrict access to your account or active session.",

    "securityPage.sections.encryption.title": "Encryption in transit",

    "securityPage.sections.encryption.desc": "All traffic uses HTTPS/TLS encryption.",

    "securityPage.sections.access.title": "Access control",

    "securityPage.sections.access.desc": "Only you can access your files and exports through your account or active session.",

    "securityPage.sections.retention.title": "Retention & deletion",

    "securityPage.sections.retention.desc": "Temporary uploads are cleaned up after processing. Processed files are not kept in account history after the session ends.",

    "securityPage.sections.incident.title": "Incident response",

    "securityPage.sections.incident.desc": "If we learn of a security incident, we notify users as required by law.",

    "cookiePage.badge": "Cookies",

    "cookiePage.title": "Cookie Policy",

    "cookiePage.subtitle": "How we use cookies for sessions and security.",

    "cookiePage.lastUpdated": "Last updated: Mar 17, 2026",

    "cookiePage.sections.essential.title": "Essential cookies",

    "cookiePage.sections.essential.desc": "Required to keep you signed in and secure.",

    "cookiePage.sections.security.title": "Security & abuse prevention",

    "cookiePage.sections.security.desc": "reCAPTCHA and security checks may set additional cookies.",

    "cookiePage.sections.analytics.title": "Performance analytics",

    "cookiePage.sections.analytics.desc": "We may use minimal analytics to improve performance.",

    "cookiePage.sections.control.title": "Manage cookies",

    "cookiePage.sections.control.desc": "You can control or delete cookies in your browser settings.",

    "contactPage.badge": "Contact",

    "contactPage.title": "Contact Us",

    "contactPage.subtitle": "Questions, billing, or support — we’re here to help.",

    "contactPage.responseNote": "Typical response time: 24–48 hours.",

    "contactPage.support.title": "Support",

    "contactPage.support.desc": "Use the form to reach us. We respond as quickly as possible.",

    "contactPage.support.button": "Contact Support",

    "contactPage.email.title": "Email",

    "contactPage.email.desc": "Prefer email? Write to",

    "settings.title": "Settings",

    "settings.subtitle": "Manage your account, preferences, and privacy settings",

    "settings.searchPlaceholder": "Search settings...",

    "settings.backToHome": "Back to Home",

    "settings.verified": "Verified",

    "settings.noResults": "No settings found matching your search.",

    "settings.categories.all": "All",

    "settings.categories.profile": "Profile",

    "settings.categories.usage": "Usage",

    "settings.categories.notifications": "Notifications",

    "settings.categories.appearance": "Appearance",

    "settings.categories.privacy": "Privacy",

    "settings.categories.advanced": "Advanced",

    "settings.profile.email": "Email Address",

    "settings.profile.emailDesc": "Your account email address",

    "settings.profile.name": "Display Name",

    "settings.profile.nameDesc": "Your public display name",

    "settings.profile.namePlaceholder": "Enter your name",

    "settings.profile.password": "Password",

    "settings.profile.passwordDesc": "Change your account password",

    "settings.profile.changePassword": "Change Password",

    "settings.usage.stats": "Usage Statistics",

    "settings.usage.statsDesc": "Your page usage",

    "settings.usage.conversionsToday": "pages used",

    "settings.usage.remaining": "remaining",

    "settings.usage.subscription": "Current Plan",

    "settings.usage.subscriptionDesc": "Your active plan",

    "settings.usage.freeTier": "Free Tier",

    "settings.usage.anonymous": "Anonymous",

    "settings.usage.upgrade": "Upgrade",

    "settings.notifications.email": "Email Notifications",

    "settings.notifications.emailDesc": "Receive updates via email",

    "settings.notifications.push": "Push Notifications",

    "settings.notifications.pushDesc": "Browser push notifications",

    "settings.notifications.sound": "Sound Effects",

    "settings.notifications.soundDesc": "Play sounds for notifications",

    "settings.appearance.theme": "Theme",

    "settings.appearance.themeDesc": "Toggle between light and dark mode",

    "settings.appearance.language": "Language",

    "settings.appearance.languageDesc": "Choose your preferred language",

    "settings.privacy.visibility": "Profile Visibility",

    "settings.privacy.visibilityDesc": "Control who can see your profile",

    "settings.privacy.manage": "Manage",

    "settings.privacy.data": "Export Data",

    "settings.privacy.dataDesc": "Download a copy of your data",

    "settings.privacy.download": "Download",

    "settings.privacy.delete": "Delete Account",

    "settings.privacy.deleteDesc": "Permanently delete your account and data",

    "settings.privacy.deleteAccount": "Delete Account",

    "settings.advanced.autoDownload": "Auto-Download",

    "settings.advanced.autoDownloadDesc": "Automatically download converted files",










    "footer.helpCenter": "FAQs & Help",
    "footer.blog": "Blog",

    "footer.refunds": "Refund Policy",

    "helpPage.title": "Help Center",

    "helpPage.subtitle": "A to Z help for every step, from upload to export.",

    "helpPage.sections.files.title": "Supported Files",

    "helpPage.sections.password.title": "Password-Protected PDFs",

    "helpPage.sections.limits.title": "Daily Limits",

    "helpPage.sections.accuracy.title": "Accuracy Tips",

    "helpPage.sections.refunds.title": "Refunds",

    "helpPage.sections.refunds.desc": "14-day full refund. Contact support with your order ID.",

    "helpPage.sections.contact.title": "Contact Support",

    "helpPage.sections.contact.desc": "Need help? Contact support and share your order ID if available.",

    "helpPage.cta.contact": "Contact Support",

    "featuresPage.items.helpCenter.title": "HELP CENTER",

    "featuresPage.items.helpCenter.desc": "Step-by-step guidance on formats, limits, and troubleshooting for smooth page processing.",

    "featuresPage.items.refunds.title": "REFUND POLICY",

    "featuresPage.items.refunds.desc": "Refunds within 14 days for eligible plans. See Pricing for details.",

    "language": "English"

  },

  "ar": {
    "nav.features": "سمات",
    "nav.demo": "تجريبي",
    "nav.chatAura": "دردشة هالة",
    "nav.settings": "إعدادات",
    "nav.admin": "مسؤل",
    "nav.about": "عن",
    "nav.signIn": "تسجيل الدخول",
    "nav.signOut": "تسجيل الخروج",
    "nav.getStarted": "ابدأ",
    "nav.pricing": "التسعير",
    "nav.benefits": "فوائد",
    "nav.menu": "قائمة طعام",
    "hero.title": "محول بيان البنك AI",
    "hero.titleLine1": "كشف حساب البنك",
    "hero.titleLine2": "محول",
    "hero.tagline": "نظرة احترافية | مدعوم بتقنية التعرف الضوئي على الحروف | نتائج فورية",
    "hero.subtitle": "AI OCR الذي يحول كشوف الحسابات المصرفية إلى جداول بيانات نظيفة ومنظمة مع معالجة آمنة واستخراج دقيق وتصدير متعدد التنسيقات.",
    "hero.uploadBtn": "قم بتحميل بيانك الآن",
    "hero.pricingBtn": "عرض التسعير",
    "hero.sampleReportBtn": "تقرير عينة",
    "howItWorks.title": "كيف يعمل",
    "howItWorks.subtitle": "قم بتحويل بياناتك المصرفية إلى Excel في ثلاث خطوات بسيطة",
    "howItWorks.step1.title": "رفع",
    "howItWorks.step1.desc": "قم بتحميل كشف حسابك البنكي بأي تنسيق - PDF أو صورة ممسوحة ضوئيًا أو صورة. نحن ندعم المستندات من أي بنك في جميع أنحاء العالم.",
    "howItWorks.step2.title": "معالجة الذكاء الاصطناعي",
    "howItWorks.step2.desc": "يقوم نظام OCR المدعوم بالذكاء الاصطناعي باستخراج بيانات المعاملات وتنظيمها فورًا بدقة عالية. يعمل عبر تنسيقات كشوف الحسابات البنكية الشائعة عالميًا.",
    "howItWorks.step3.title": "تحميل اكسل",
    "howItWorks.step3.desc": "احصل على جدول بيانات Excel نظيف ومنظم وجاهز للمحاسبة أو التحليل أو التكامل مع أدواتك المالية.",
    "features.title": "سمات",
    "features.accuracy": "دقة عالية",
    "features.accuracyDesc": "تم تصميم الاستخراج المدعوم بالذكاء الاصطناعي لتقليل الأخطاء.",
    "features.fast": "بسرعة البرق",
    "features.fastDesc": "تحويل البيانات في ثوان",
    "features.secure": "معالجة آمنة",
    "features.secureDesc": "مشفرة أثناء النقل مع تخزين يمكن التحكم في الوصول إليه.",
    "pricing.title": "التسعير",
    "pricing.free": "حر",
    "pricing.daily": "يوميًا",
    "pricing.business": "عمل",
    "upload.limit.daily.title": "تم الوصول إلى الحد اليومي",
    "upload.limit.daily.authFree": "لقد استخدمت جميع صفحات {limit} لهذا اليوم. تتم إعادة تعيين الحد اليومي الخاص بك عند منتصف الليل. الترقية لحدود أعلى.",
    "upload.limit.daily.authPaid": "لقد استخدمت جميع صفحات {limit} لخطتك الحالية. الترقية إلى خطة أعلى للمتابعة.",
    "upload.limit.daily.anon": "لقد استخدمت جميع صفحات {limit} المجانية لهذا اليوم. قم بإنشاء حساب مجاني لمدة 5 صفحات في اليوم أو اختر خطة لحدود أعلى.",
    "upload.limit.page.title": "حد الصفحة",
    "upload.limit.page.auth": "تحتوي الملفات المحددة على {total} من الصفحات، ولكن يتوفر اليوم {remaining} من الصفحات فقط (الحد اليومي {limit}). قم بإزالة بعض الصفحات أو قم بترقية خطتك.",
    "upload.limit.page.anon": "تحتوي الملفات المحددة على {total} من الصفحات، ولكن يتوفر اليوم {remaining} فقط من الصفحات المجانية (الحد اليومي {limit}). قم بالتسجيل لمدة 5 صفحات في اليوم أو اختر خطة.",
    "upload.limit.usage.title": "تم الوصول إلى حد الاستخدام",
    "upload.limit.paid.pack": "لقد استخدمت جميع صفحات {limit} في باقتك الحالية. اشترِ باقة أخرى للمتابعة.",
    "upload.limit.paid.month": "لقد استخدمت جميع صفحات {limit} لهذا الشهر. تتم إعادة تعيين استخدام خطتك في بداية الشهر القادم.",
    "upload.limit.paid.year": "لقد استخدمت جميع صفحات {limit} لهذا العام. تتم إعادة تعيين استخدام خطتك في بداية العام القادم.",
    "upload.limit.paid.plan": "لقد استخدمت جميع صفحات {limit} لخطتك. قم بترقية خطتك للمتابعة.",
    "upload.limit.signupCta": "سجّل للحصول على 5 صفحات مجانية",
    "upload.limit.upgradeCta": "ترقية الخطة",
    "upload.remaining.counterSuffix": "متبقي من {limit} صفحة",
    "upload.remaining.signupMore": "سجّل للحصول على صفحات أكثر",
    "footer.product": "منتج",
    "footer.features": "سمات",
    "footer.pricing": "التسعير",
    "footer.howItWorks": "كيف يعمل",
    "footer.help.title": "يساعد",
    "footer.help.item1": "الملفات المدعومة: PDF، JPG، PNG (المسح الضوئي والصور)",
    "footer.help.item2": "ملفات PDF محمية بكلمة مرور: أدخل كلمة المرور قبل التحويل",
    "footer.help.item3": "الحدود اليومية: صفحتان مجهولتان في اليوم، 5 صفحات مجانية في اليوم، مدفوعة حسب الخطة",
    "footer.help.item4": "نصائح تتعلق بالدقة: قم بتحميل صفحات كاملة، وتجنب التعتيم",
    "footer.help.item5": "بحاجة الى مساعدة؟ اتصل بالدعم.",
    "footer.company": "شركة",
    "footer.about": "عن",
    "footer.privacy": "سياسة الخصوصية",
    "footer.terms": "الشروط والأحكام",
    "footer.cta.title": "على استعداد لتحويل الخاص بك",
    "footer.cta.subtitle": "سير العمل المالي؟",
    "footer.cta.desc": "مصمم للفرق والأفراد الذين يحتاجون إلى تحويلات دقيقة وفورية لكشف الحساب البنكي.",
    "footer.cta.btn": "ابدأ التحويل الآن",
    "footer.copyright": "© 2026 أكروميدا. تم إنشاؤها بواسطة فايزان رضوي.",
    "footer.recaptcha.prefix": "هذا الموقع محمي بواسطة reCAPTCHA وGoogle",
    "footer.recaptcha.privacy": "سياسة الخصوصية",
    "footer.recaptcha.and": "و",
    "footer.recaptcha.terms": "شروط الخدمة",
    "footer.recaptcha.suffix": "يتقدم.",
    "auth.welcome": "مرحبًا بعودتك!",
    "auth.signedIn": "لقد قمت بتسجيل الدخول بنجاح.",
    "auth.accountCreated": "تم إنشاء الحساب!",
    "auth.canUse": "يمكنك الآن البدء في استخدام Banklefy.",
    "auth.email": "بريد إلكتروني",
    "auth.password": "كلمة المرور",
    "auth.signIn": "تسجيل الدخول",
    "auth.signUp": "اشتراك",
    "auth.forgotPassword": "هل نسيت كلمة السر؟",
    "auth.noAccount": "ليس لديك حساب؟ اشتراك",
    "auth.hasAccount": "هل لديك حساب بالفعل؟ تسجيل الدخول",
    "auth.secureAccess": "الوصول الآمن",
    "common.back": "خلف",
    "common.backToHome": "العودة إلى المنزل",
    "featuresPage.title": "جميع الميزات",
    "featuresPage.subtitle": "قائمة كاملة من الألف إلى الياء بكل ما تقدمه Banklefy - بدءًا من التعرف الضوئي على الحروف المدعوم بالذكاء الاصطناعي وحتى المعالجة التي تعتمد على الخصوصية أولاً. مصممة لتحقيق الدقة والسرعة والتحليل المالي الواضح.",
    "featuresPage.categories.core": "التكنولوجيا الأساسية",
    "featuresPage.categories.financial": "التحليل المالي",
    "featuresPage.categories.risk": "تحليل المخاطر",
    "featuresPage.categories.assistant": "مساعد الذكاء الاصطناعي",
    "featuresPage.categories.export": "يصدّر",
    "featuresPage.categories.performance": "أداء",
    "featuresPage.categories.security": "حماية",
    "featuresPage.categories.privacy": "خصوصية",
    "featuresPage.categories.accessibility": "إمكانية الوصول",
    "featuresPage.categories.technology": "تكنولوجيا",
    "featuresPage.categories.usage": "الاستخدام",
    "featuresPage.items.aiOcr.title": "محرك التعرف الضوئي على الحروف الذي يعمل بالذكاء الاصطناعي",
    "featuresPage.items.aiOcr.desc": "يستخرج البيانات من ملفات PDF والمسح الضوئي والصور. يتعرف على جداول المعاملات وتواريخها ومبالغها وأوصافها بدقة عالية - حتى من المستندات منخفضة الجودة.",
    "featuresPage.items.excelCsv.title": "تصدير إكسل و CSV",
    "featuresPage.items.excelCsv.desc": "قم بتصدير ملف Excel (.xlsx) وملف CSV نظيفًا باستخدام الأعمدة المناسبة (التاريخ، الوصف، الخصم، الائتمان، الرصيد، الفئة). يعمل مع أدوات المحاسبة الشعبية.",
    "featuresPage.items.pdfReport.title": "إنشاء تقارير PDF",
    "featuresPage.items.pdfReport.desc": "قم بإنشاء تقارير PDF ذات علامة تجارية تحتوي على ملخصات ومقاييس الاكتتاب والتفاصيل التفصيلية - مثالية لعمليات التدقيق وطلبات القروض.",
    "featuresPage.items.foir.title": "حساب FOIR",
    "featuresPage.items.foir.desc": "يحسب FOIR تلقائيًا باستخدام التحليل المستند إلى القواعد من خلال الكشف عن أرصدة الرواتب وخصومات EMI - المستخدمة في تقييم أهلية القرض.",
    "featuresPage.items.emiDetection.title": "كشف EMI",
    "featuresPage.items.emiDetection.desc": "يكتشف الأقساط الشهرية المتكررة عبر الأنماط الحتمية (قروض المنزل/السيارة/الشخصية، الأقساط الشهرية لبطاقات الائتمان، BNPL). لا تخمين - يمكن تفسيره بالكامل.",
    "featuresPage.items.salaryAnalysis.title": "تحليل الراتب الائتماني",
    "featuresPage.items.salaryAnalysis.desc": "يجد أرصدة الرواتب باستخدام الأنماط المتكررة والكلمات الرئيسية لصاحب العمل لتقدير متوسط ​​الدخل الشهري للاكتتاب.",
    "featuresPage.items.cashflow.title": "تحليل التدفق النقدي",
    "featuresPage.items.cashflow.desc": "يفصل التدفقات الداخلة والخارجة وصافي التدفق النقدي مع ملخصات الفئات ورؤى الاتجاه.",
    "featuresPage.items.adbAmb.title": "متوسط ​​الرصيد اليومي",
    "featuresPage.items.adbAmb.desc": "يحسب مقاييس ADB/AMB التي تستخدمها البنوك للتحقق من الحد الأدنى للرصيد وتقييمات الإقراض.",
    "featuresPage.items.fraudDetection.title": "كشف الاحتيال",
    "featuresPage.items.fraudDetection.desc": "قم بوضع علامة على الأنماط المشبوهة مثل المعاملات ذات الأرقام المستديرة، والشذوذ في عطلة نهاية الأسبوع، والتكرارات، وعدم تطابق الرصيد.",
    "featuresPage.items.integrityScoring.title": "تسجيل النزاهة",
    "featuresPage.items.integrityScoring.desc": "التحقق من تناسق كشف الحساب عبر التواريخ والأرصدة للمساعدة في اكتشاف التلاعب والأخطاء.",
    "featuresPage.items.underwritingPanel.title": "لوحة الاكتتاب",
    "featuresPage.items.underwritingPanel.desc": "نظرة سريعة على جميع المقاييس الرئيسية: الدخل، والأقساط الشهرية المتساوية، وFOIR، واتجاهات التوازن، وأعلام المخاطر - المصممة لقرارات الإقراض.",
    "featuresPage.items.banks.title": "يدعم أكثر من 1000 بنك",
    "featuresPage.items.banks.desc": "يتعامل مع نطاق واسع من تخطيطات وتنسيقات كشوف الحسابات — بما في ذلك البنوك الهندية والدولية الكبرى.",
    "featuresPage.items.instantProcessing.title": "معالجة فورية",
    "featuresPage.items.instantProcessing.desc": "تحويلات سريعة في أقل من 30 ثانية تقريبًا — مثالية للمحاسبة وعمليات التدقيق الحساسة للوقت.",
    "featuresPage.items.batchProcessing.title": "معالجة الدفعات",
    "featuresPage.items.batchProcessing.desc": "قم بتحويل كشوفات متعددة بالتوازي - وهو أمر رائع للمحاسبين ومهام سير العمل المجمعة.",
    "featuresPage.items.chatAura.title": "مساعد الدردشة AURA AI",
    "featuresPage.items.chatAura.desc": "????? ??????? Chat Aura ??? ???? ??????.",
    "featuresPage.items.encryption.title": "التشفير في العبور",
    "featuresPage.items.encryption.desc": "يتم تشفير البيانات أثناء التحميل والنقل لحماية البيانات المالية الحساسة.",
    "featuresPage.items.zeroRetention.title": "وصول منضبط للملفات",
    "featuresPage.items.zeroRetention.desc": "تظل الملفات متاحة أثناء الجلسة النشطة فقط.",
    "featuresPage.items.categorization.title": "التصنيف الذكي",
    "featuresPage.items.categorization.desc": "يصنف المعاملات تلقائيًا إلى فئات (الراتب، والأقساط الشهرية المتساوية، والمرافق، والتسوق، والأطعمة، وما إلى ذلك) باستخدام خرائط قابلة للتخصيص.",
    "featuresPage.items.exportFormats.title": "تنسيقات تصدير متعددة",
    "featuresPage.items.exportFormats.desc": "قم بالتصدير إلى تقارير Excel وCSV وJSON وMT940 - المُحسّنة للمحاسبة والتحليل.",
    "featuresPage.items.ruleBased.title": "الدقة المستندة إلى القواعد",
    "featuresPage.items.ruleBased.desc": "الحسابات الحتمية: لا هلوسة، لا تخمين - يتم حساب كل رقم بدقة ويمكن تفسيره.",
    "featuresPage.items.dailyLimits.title": "حدود إعادة الضبط اليومية",
    "featuresPage.items.dailyLimits.desc": "تتم إعادة ضبط الحدود المجانية يوميًا عند منتصف الليل بالتوقيت المحلي. يحصل المستخدمون المجهولون على صفحتين في اليوم؛ يحصل المستخدمون الذين قاموا بتسجيل الدخول على 5 صفحات في اليوم. يتم إعادة تعيين الخطط المدفوعة مع دورة الفوترة الخاصة بها.",
    "featuresPage.cta.title": "هل أنت مستعد لتجربة جميع الميزات؟",
    "featuresPage.cta.desc": "ابدأ بصفحتين مجانيتين يوميًا. قم بالتسجيل لمدة 5 صفحات يوميًا واحصل على القوة الكاملة لـ Banklefy.",
    "featuresPage.cta.tryDemo": "جرب العرض التوضيحي الآن",
    "featuresPage.cta.signUp": "التسجيل مجاني",
    "featuresPage.footer": "© 2026 أكروميدا | مصممة للتميز",
    "aboutPage.visionTitle": "الرؤية",
    "aboutPage.visionSubtitle": "حيث تلتقي الدقة بالأمن السيبراني.",
    "aboutPage.visionP1": "أكروميدا ليس مجرد أداة؛ إنه معيار عالمي لسلامة البيانات المالية. في عصر أصبحت فيه البيانات هي العملة الجديدة، قمنا بتصميم نظام أساسي لا يقوم فقط بتحويل الملفات - بل يؤمن سير عملك المالي بالكامل.",
    "aboutPage.brainchildPrefix": "من بنات أفكار",
    "aboutPage.brainchildP1": "تم تصميمه بواسطة متخصص متخصص في الأمن السيبراني من جامعة هارفارد، ومقره في كوتا، راجستان. عندما كان عمره 18 عامًا فقط، اكتشف فايزان ثغرة أمنية خطيرة في كيفية التعامل مع المستندات المالية الحساسة عالميًا.",
    "aboutPage.brainchildP2": "من خلال دمج التشفير المتقدم مع التشغيل الآلي السلس للذكاء الاصطناعي، تم إطلاق Banklefy في عام 2026 لتمكين الشركات من خلال تحويلات كشف الحساب البنكي الفورية وعالية التكامل - مع الحفاظ على خصوصية بياناتك بقدر ما هي قوية.",
    "aboutPage.valueProps.cyberSafe.title": "آمن على الإنترنت",
    "aboutPage.valueProps.cyberSafe.desc": "تم تصميمه وفقًا لمبادئ الأمان أولاً لسير العمل المالي الحساس.",
    "aboutPage.valueProps.instantFlux.title": "التدفق الفوري",
    "aboutPage.valueProps.instantFlux.desc": "تحويل البيانات المعقدة بسرعة — دون إدخال يدوي.",
    "aboutPage.valueProps.accuracy.title": "دقة عالية",
    "aboutPage.valueProps.accuracy.desc": "تحويل يركز على الدقة مصمم للبيانات المالية عالية المخاطر.",
    "aboutPage.connectTitle": "تواصل مع الخالق",
    "aboutPage.contact.hotline": "الخط الساخن",
    "aboutPage.contact.mail": "البريد المباشر",
    "aboutPage.contact.social": "اجتماعي",
    "aboutPage.contact.hq": "المقر الرئيسي",
    "aboutPage.contact.hqValue": "كوتا، راجاستان 324004",
    "aboutPage.footer": "© 2026 أكروميدا | مصممة للتميز",
    "privacyPage.badge": "الخصوصية والشفافية",
    "privacyPage.title": "سياسة الخصوصية",
    "privacyPage.subtitle": "نحن نجمع فقط ما نحتاجه لتشغيل الخدمة وتأمينها.",
    "privacyPage.lastUpdated": "آخر تحديث: 7 فبراير 2026",
    "privacyPage.sections.zeroRetention.title": "وصول قائم على الجلسة",
    "privacyPage.sections.zeroRetention.desc": "تتوفر الملفات المرفوعة والنتائج أثناء الجلسة النشطة. قم بالتنزيل قبل انتهاء الجلسة.",
    "privacyPage.sections.encryption.title": "التشفير أثناء النقل",
    "privacyPage.sections.encryption.desc": "يتم تشفير البيانات أثناء التحميل والنقل. نحن نستخدم موفري خدمات ذوي سمعة طيبة وضوابط أمان قياسية في الصناعة.",
    "privacyPage.sections.noTracking.title": "لا يوجد تتبع للإعلانات",
    "privacyPage.sections.noTracking.desc": "نحن لا نبيع بياناتك أو ندير أجهزة تتبع للإعلانات. قد نستخدم أدوات مكافحة إساءة الاستخدام مثل reCAPTCHA التي يمكنها جمع إشارات الجهاز وتعيين ملفات تعريف الارتباط.",
    "privacyPage.sections.aiPowered.title": "المعالجة الآلية",
    "privacyPage.sections.aiPowered.desc": "تتم المعالجة تلقائيًا في المقام الأول. يقتصر الوصول إلى البيانات على الموظفين المصرح لهم للحصول على الدعم أو لأسباب قانونية.",
    "privacyPage.sections.compliance.title": "الخصوصية في التفكير",
    "privacyPage.sections.compliance.desc": "نحن نهدف إلى اتباع مبادئ الخصوصية والتحلي بالشفافية بشأن كيفية استخدام البيانات.",
    "privacyPage.aboutTitle": "حول أكروميدا",
    "privacyPage.aboutP1": "Banklefy هي أداة ذكية وسريعة وآمنة مصممة لتحويل البيانات المصرفية من PDF إلى Excel بدقة وسهولة.",
    "privacyPage.aboutP2Prefix": "تم إنشاء هذه المنصة بواسطة",
    "privacyPage.aboutP2Suffix": "، طالب في مجال الأمن السيبراني من جامعة هارفارد، ومقره في كوتا، راجاستان، الهند. في عام 2026، عندما كان عمره 18 عامًا، أطلق فايزان Banklefy لمساعدة الأفراد والشركات على توفير الوقت والجهد فيما يتعلق بالبيانات المالية.",
    "privacyPage.whatTitle": "ما يفعله أكروميدا",
    "privacyPage.whatItems.item1": "يحول ملفات PDF المعقدة الخاصة بكشوفات الحسابات البنكية إلى أوراق Excel نظيفة وقابلة للتحرير",
    "privacyPage.whatItems.item2": "يحافظ على التنسيق والأعمدة ووضوح المعاملات",
    "privacyPage.whatItems.item3": "يعمل على الفور - لا يلزم تثبيت البرنامج",
    "privacyPage.whatItems.item4": "تم تصميمه مع خصوصية البيانات وأمانها في جوهرها",
    "privacyPage.contactTitle": "أسئلة؟",
    "privacyPage.contactDescPrefix": "لطرح أسئلة الخصوصية، اتصل بالدعم.",
    "privacyPage.footer": "(ج) 2026 أكروميدا. جميع الحقوق محفوظة.",
    "settings.title": "إعدادات",
    "settings.subtitle": "إدارة حسابك والتفضيلات وإعدادات الخصوصية",
    "settings.searchPlaceholder": "إعدادات البحث...",
    "settings.backToHome": "العودة إلى المنزل",
    "settings.verified": "تم التحقق منه",
    "settings.noResults": "لم يتم العثور على إعدادات مطابقة لبحثك.",
    "settings.categories.all": "الجميع",
    "settings.categories.profile": "حساب تعريفي",
    "settings.categories.usage": "الاستخدام",
    "settings.categories.notifications": "إشعارات",
    "settings.categories.appearance": "مظهر",
    "settings.categories.privacy": "خصوصية",
    "settings.categories.advanced": "متقدم",
    "settings.profile.email": "عنوان البريد الإلكتروني",
    "settings.profile.emailDesc": "عنوان البريد الإلكتروني لحسابك",
    "settings.profile.name": "اسم العرض",
    "settings.profile.nameDesc": "اسم العرض العام الخاص بك",
    "settings.profile.namePlaceholder": "أدخل اسمك",
    "settings.profile.password": "كلمة المرور",
    "settings.profile.passwordDesc": "قم بتغيير كلمة مرور حسابك",
    "settings.profile.changePassword": "تغيير كلمة المرور",
    "settings.usage.stats": "إحصائيات الاستخدام",
    "settings.usage.statsDesc": "استخدام صفحتك",
    "settings.usage.conversionsToday": "الصفحات المستخدمة",
    "settings.usage.remaining": "متبقي",
    "settings.usage.subscription": "خطة الاشتراك",
    "settings.usage.subscriptionDesc": "فئة الاشتراك الحالية الخاصة بك",
    "settings.usage.freeTier": "الطبقة الحرة",
    "settings.usage.anonymous": "مجهول",
    "settings.usage.upgrade": "يرقي",
    "settings.notifications.email": "إشعارات البريد الإلكتروني",
    "settings.notifications.emailDesc": "تلقي التحديثات عبر البريد الإلكتروني",
    "settings.notifications.push": "دفع الإخطارات",
    "settings.notifications.pushDesc": "إشعارات المتصفح",
    "settings.notifications.sound": "المؤثرات الصوتية",
    "settings.notifications.soundDesc": "تشغيل الأصوات للإشعارات",
    "settings.appearance.theme": "سمة",
    "settings.appearance.themeDesc": "التبديل بين الوضع الفاتح والداكن",
    "settings.appearance.language": "لغة",
    "settings.appearance.languageDesc": "اختر لغتك المفضلة",
    "settings.privacy.visibility": "رؤية الملف الشخصي",
    "settings.privacy.visibilityDesc": "التحكم في من يمكنه رؤية ملفك الشخصي",
    "settings.privacy.manage": "يدير",
    "settings.privacy.data": "تصدير البيانات",
    "settings.privacy.dataDesc": "قم بتنزيل نسخة من بياناتك",
    "settings.privacy.download": "تحميل",
    "settings.privacy.delete": "حذف الحساب",
    "settings.privacy.deleteDesc": "حذف حسابك وبياناتك نهائيًا",
    "settings.privacy.deleteAccount": "حذف الحساب",
    "settings.advanced.autoDownload": "التنزيل التلقائي",
    "settings.advanced.autoDownloadDesc": "تنزيل الملفات المحولة تلقائيًا",
    "chatAura.greeting": "مرحبًا! أنا تشات أورا، مساعدك المالي. كيف يمكنني مساعدتك اليوم؟",
    "chatAura.greetingWithPdf": "مرحبًا! لقد قمت بتحميل مستندك ({fileName}). اسألني أي شيء عن ذلك!",
    "chatAura.subtitle": "مساعدك المالي بالذكاء الاصطناعي",
    "chatAura.remaining": "الدردشات اليسار",
    "chatAura.placeholder": "اسأل عن تصريحك...",
    "chatAura.errorResponse": "أنا آسف، لقد واجهت خطأ. يرجى المحاولة مرة أخرى.",
    "chatAura.limitReached": "تم الوصول إلى حد الدردشة",
    "chatAura.signUpForMore": "اشترك في محادثات غير محدودة",
    "chatAura.signUp": "اشتراك",
    "footer.helpCenter": "مركز المساعدة",
    "footer.blog": "مدونة",
    "footer.refunds": "سياسة استرداد الأموال",
    "helpPage.title": "مركز المساعدة",
    "helpPage.subtitle": "مساعدة من الألف إلى الياء في كل خطوة، بدءًا من التحميل وحتى التصدير.",
    "helpPage.sections.files.title": "الملفات المدعومة",
    "helpPage.sections.password.title": "ملفات PDF المحمية بكلمة مرور",
    "helpPage.sections.limits.title": "الحدود اليومية",
    "helpPage.sections.accuracy.title": "نصائح الدقة",
    "helpPage.sections.refunds.title": "المبالغ المستردة",
    "helpPage.sections.refunds.desc": "استرداد كامل خلال 14 يومًا. اتصل بالدعم مع رقم الطلب الخاص بك.",
    "helpPage.sections.contact.title": "اتصل بالدعم",
    "helpPage.sections.contact.desc": "بحاجة الى مساعدة؟ اتصل بالدعم وشارك معرف الطلب الخاص بك إذا كان متاحًا.",
    "helpPage.cta.contact": "اتصل بالدعم",
    "featuresPage.items.helpCenter.title": "مركز المساعدة",
    "featuresPage.items.helpCenter.desc": "إرشادات خطوة بخطوة حول التنسيقات والحدود واستكشاف الأخطاء وإصلاحها لإجراء تحويلات سلسة.",
    "featuresPage.items.refunds.title": "سياسة استرداد الأموال",
    "featuresPage.items.refunds.desc": "استرداد الأموال خلال 14 يومًا للخطط المؤهلة. انظر التسعير للحصول على التفاصيل.",
    "language": "إنجليزي"
  },
  "zh": {
    "nav.features": "特征",
    "nav.demo": "演示",
    "nav.chatAura": "聊天光环",
    "nav.settings": "设置",
    "nav.admin": "行政",
    "nav.about": "关于",
    "nav.signIn": "登入",
    "nav.signOut": "登出",
    "nav.getStarted": "开始使用",
    "nav.pricing": "定价",
    "nav.benefits": "好处",
    "nav.menu": "菜单",
    "hero.title": "AI银行对账单转换器",
    "hero.titleLine1": "银行对账单",
    "hero.titleLine2": "转换器",
    "hero.tagline": "专业外观| OCR 支持 |即时结果",
    "hero.subtitle": "AI OCR 可将银行对账单转换为干净、结构化的电子表格，并具有安全处理、准确提取和多格式导出功能。",
    "hero.uploadBtn": "立即上传您的声明",
    "hero.pricingBtn": "查看定价",
    "hero.sampleReportBtn": "报告样本",
    "howItWorks.title": "它是如何运作的",
    "howItWorks.subtitle": "只需三个简单步骤即可将您的银行对账单转换为 Excel",
    "howItWorks.step1.title": "上传",
    "howItWorks.step1.desc": "上传任何格式的银行对账单 - PDF、扫描图像或照片。我们支持全球任何银行的文件。",
    "howItWorks.step2.title": "人工智能处理",
    "howItWorks.step2.desc": "我们的 AI OCR 可立即高精度提取并整理交易数据。适配全球常见的银行对账单格式。",
    "howItWorks.step3.title": "下载Excel",
    "howItWorks.step3.desc": "收到干净、结构化的 Excel 电子表格，准备用于会计、分析或与您的财务工具集成。",
    "features.title": "特征",
    "features.accuracy": "高精度",
    "features.accuracyDesc": "人工智能驱动的提取旨在减少错误。",
    "features.fast": "快如闪电",
    "features.fastDesc": "在几秒钟内转换语句",
    "features.secure": "安全处理",
    "features.secureDesc": "通过访问控制存储在传输过程中进行加密。",
    "pricing.title": "定价",
    "pricing.free": "自由的",
    "pricing.daily": "日常的",
    "pricing.business": "商业",
    "upload.limit.daily.title": "已达到每日限额",
    "upload.limit.daily.authFree": "您今天已使用所有 {limit} 页面。您的每日限额会在午夜重置。升级以获得更高的限制。",
    "upload.limit.daily.authPaid": "您已使用当前计划的所有 {limit} 页面。升级到更高的计划才能继续。",
    "upload.limit.daily.anon": "您今天已使用所有 {limit} 免费页面。创建一个每天 5 页的免费帐户或选择更高限制的计划。",
    "upload.limit.page.title": "页数限制",
    "upload.limit.page.auth": "所选文件有 {total} 页，但今天只有 {remaining} 页可用（每日限制 {limit}）。删除一些页面或升级您的计划。",
    "upload.limit.page.anon": "所选文件有 {total} 个页面，但今天只有 {remaining} 个免费页面可用（每日限制 {limit}）。注册 5 页/天或选择一个计划。",
    "upload.limit.usage.title": "已达到使用上限",
    "upload.limit.paid.pack": "您当前套餐中的 {limit} 页已用完。请购买新套餐后继续。",
    "upload.limit.paid.month": "您本月的 {limit} 页已用完。下月初将重置用量。",
    "upload.limit.paid.year": "您本年的 {limit} 页已用完。明年初将重置用量。",
    "upload.limit.paid.plan": "您当前计划的 {limit} 页已用完。升级计划后可继续。",
    "upload.limit.signupCta": "注册领取 5 页免费额度",
    "upload.limit.upgradeCta": "升级计划",
    "upload.remaining.counterSuffix": "共 {limit} 页，当前可用",
    "upload.remaining.signupMore": "注册获取更多页数",
    "footer.product": "产品",
    "footer.features": "特征",
    "footer.pricing": "定价",
    "footer.howItWorks": "它是如何运作的",
    "footer.help.title": "帮助",
    "footer.help.item1": "支持的文件：PDF、JPG、PNG（扫描件和照片）",
    "footer.help.item2": "受密码保护的 PDF：转换前输入密码",
    "footer.help.item3": "每日限制：匿名 2 页/天，免费 5 页/天，按计划付费",
    "footer.help.item4": "准确性提示：上传整页，避免模糊",
    "footer.help.item5": "需要帮助吗？联系支持人员。",
    "footer.company": "公司",
    "footer.about": "关于",
    "footer.privacy": "隐私政策",
    "footer.terms": "条款及条件",
    "footer.cta.title": "准备好改变你的",
    "footer.cta.subtitle": "财务工作流程？",
    "footer.cta.desc": "专为需要准确、即时的银行对账单转换的团队和个人而设计。",
    "footer.cta.btn": "立即开始转换",
    "footer.copyright": "© 2026 阿克罗墨达。由费赞·里兹维 (Faizan Rizvi) 创建。",
    "footer.recaptcha.prefix": "该网站受 reCAPTCHA 和 Google 的保护",
    "footer.recaptcha.privacy": "隐私政策",
    "footer.recaptcha.and": "和",
    "footer.recaptcha.terms": "服务条款",
    "footer.recaptcha.suffix": "申请。",
    "auth.welcome": "欢迎回来！",
    "auth.signedIn": "您已成功登录。",
    "auth.accountCreated": "帐户已创建！",
    "auth.canUse": "您现在可以开始使用 Banklefy。",
    "auth.email": "电子邮件",
    "auth.password": "密码",
    "auth.signIn": "登入",
    "auth.signUp": "报名",
    "auth.forgotPassword": "忘记密码？",
    "auth.noAccount": "没有帐户？报名",
    "auth.hasAccount": "已经有帐户？登入",
    "auth.secureAccess": "安全访问",
    "common.back": "后退",
    "common.backToHome": "返回首页",
    "featuresPage.title": "所有功能",
    "featuresPage.subtitle": "Banklefy 提供的所有功能的完整 A-Z 列表 - 从人工智能驱动的 OCR 到隐私优先的处理。专为准确性、速度和清晰的财务分析而构建。",
    "featuresPage.categories.core": "核心技术",
    "featuresPage.categories.financial": "财务分析",
    "featuresPage.categories.risk": "风险分析",
    "featuresPage.categories.assistant": "人工智能助手",
    "featuresPage.categories.export": "出口",
    "featuresPage.categories.performance": "表现",
    "featuresPage.categories.security": "安全",
    "featuresPage.categories.privacy": "隐私",
    "featuresPage.categories.accessibility": "无障碍",
    "featuresPage.categories.technology": "技术",
    "featuresPage.categories.usage": "用法",
    "featuresPage.items.aiOcr.title": "人工智能 OCR 引擎",
    "featuresPage.items.aiOcr.desc": "从 PDF、扫描件和照片中提取数据。即使是低质量的文档，也能高精度识别交易表、日期、金额和描述。",
    "featuresPage.items.excelCsv.title": "Excel 和 CSV 导出",
    "featuresPage.items.excelCsv.desc": "导出带有适当列（日期、说明、借方、贷方、余额、类别）的干净 Excel (.xlsx) 和 CSV。适用于流行的会计工具。",
    "featuresPage.items.pdfReport.title": "PDF 报告生成",
    "featuresPage.items.pdfReport.desc": "创建包含摘要、承保指标和详细分类的品牌 PDF 报告 - 非常适合审计和贷款申请。",
    "featuresPage.items.foir.title": "福尔计算",
    "featuresPage.items.foir.desc": "通过检测工资贷项和 EMI 借项，使用基于规则的分析自动计算 FOIR（用于贷款资格评估）。",
    "featuresPage.items.emiDetection.title": "电磁干扰检测",
    "featuresPage.items.emiDetection.desc": "通过确定性模式检测重复出现的 EMI（房屋/汽车/个人贷款、信用卡 EMI、BNPL）。无需猜测——完全可以解释。",
    "featuresPage.items.salaryAnalysis.title": "薪资信用分析",
    "featuresPage.items.salaryAnalysis.desc": "使用重复模式和雇主关键字查找工资积分，以估计承保的平均月收入。",
    "featuresPage.items.cashflow.title": "现金流分析",
    "featuresPage.items.cashflow.desc": "通过类别摘要和趋势洞察来细分流入/流出和净现金流。",
    "featuresPage.items.adbAmb.title": "平均每日余额",
    "featuresPage.items.adbAmb.desc": "计算银行用于最低余额检查和贷款评估的 ADB/AMB 指标。",
    "featuresPage.items.fraudDetection.title": "欺诈检测",
    "featuresPage.items.fraudDetection.desc": "标记可疑模式，例如整数交易、周末异常、重复和余额不匹配。",
    "featuresPage.items.integrityScoring.title": "诚信评分",
    "featuresPage.items.integrityScoring.desc": "验证跨日期和余额的报表一致性，以帮助检测篡改和错误。",
    "featuresPage.items.underwritingPanel.title": "承销小组",
    "featuresPage.items.underwritingPanel.desc": "所有关键指标一目了然：收入、EMI、FOIR、余额趋势和风险标记 - 专为贷款决策而构建。",
    "featuresPage.items.banks.title": "支持 1000+ 家银行",
    "featuresPage.items.banks.desc": "覆盖多种银行对账单版式与格式，包括印度及国际主流银行。",
    "featuresPage.items.instantProcessing.title": "即时处理",
    "featuresPage.items.instantProcessing.desc": "在约 30 秒内快速转换 - 非常适合时间敏感的会计和审计。",
    "featuresPage.items.batchProcessing.title": "批处理",
    "featuresPage.items.batchProcessing.desc": "并行转换多个报表 - 非常适合会计师和批量工作流程。",
    "featuresPage.items.chatAura.title": "聊天AURA人工智能助手",
    "featuresPage.items.chatAura.desc": "???????Chat Aura ??????",
    "featuresPage.items.encryption.title": "运输途中加密",
    "featuresPage.items.encryption.desc": "数据在上传和传输过程中进行加密，以保护敏感的财务数据。",
    "featuresPage.items.zeroRetention.title": "受控文件访问",
    "featuresPage.items.zeroRetention.desc": "文件仅在当前会话期间可用。",
    "featuresPage.items.categorization.title": "智能分类",
    "featuresPage.items.categorization.desc": "通过可定制的映射自动将交易分类（工资、EMI、公用事业、购物、食品等）。",
    "featuresPage.items.exportFormats.title": "多种导出格式",
    "featuresPage.items.exportFormats.desc": "导出为 Excel、CSV、JSON 和 MT940 报告 - 针对会计和分析进行了优化。",
    "featuresPage.items.ruleBased.title": "基于规则的准确性",
    "featuresPage.items.ruleBased.desc": "确定性计算：没有幻觉，没有猜测——每个数字都经过精确计算并且可以解释。",
    "featuresPage.items.dailyLimits.title": "每日重置限额",
    "featuresPage.items.dailyLimits.desc": "免费限额每天在当地时间午夜重置。匿名用户每天获得 2 个页面；登录用户每天可获得 5 页。付费计划随计费周期重置。",
    "featuresPage.cta.title": "准备好体验所有功能了吗？",
    "featuresPage.cta.desc": "从每天 2 个免费页面开始。每天注册 5 页即可解锁 Banklefy 的全部功能。",
    "featuresPage.cta.tryDemo": "立即尝试演示",
    "featuresPage.cta.signUp": "免费注册",
    "featuresPage.footer": "© 2026 爱克罗墨达 |专为卓越而设计",
    "aboutPage.visionTitle": "愿景",
    "aboutPage.visionSubtitle": "精准与网络安全的结合。",
    "aboutPage.visionP1": "Banklefy 不仅仅是一个工具；更是一个工具。它是金融数据完整性的全球标准。在数据成为新货币的时代，我们设计的平台不仅能转换文件，还能保护您的整个财务工作流程。",
    "aboutPage.brainchildPrefix": "的创意",
    "aboutPage.brainchildP1": "由位于拉贾斯坦邦科塔的哈佛大学的一位专门的网络安全专家设计。年仅 18 岁的 Faizan 就发现了全球敏感金融文件处理方式中的一个严重漏洞。",
    "aboutPage.brainchildP2": "Banklefy 于 2026 年推出，将先进的加密技术与无缝的 AI 自动化相融合，为企业提供即时、高完整性的银行对账单转换服务，让您的数据保持私密性和强大性。",
    "aboutPage.valueProps.cyberSafe.title": "网络安全",
    "aboutPage.valueProps.cyberSafe.desc": "针对敏感的财务工作流程按照安全第一的原则构建。",
    "aboutPage.valueProps.instantFlux.title": "瞬时通量",
    "aboutPage.valueProps.instantFlux.desc": "快速转换复杂数据 - 无需手动输入。",
    "aboutPage.valueProps.accuracy.title": "高精度",
    "aboutPage.valueProps.accuracy.desc": "专为高风险财务数据而设计的注重准确性的转换。",
    "aboutPage.connectTitle": "与创作者联系",
    "aboutPage.contact.hotline": "热线",
    "aboutPage.contact.mail": "直邮",
    "aboutPage.contact.social": "社会的",
    "aboutPage.contact.hq": "总部",
    "aboutPage.contact.hqValue": "科塔, 拉贾斯坦邦 324004",
    "aboutPage.footer": "© 2026 爱克罗墨达 |专为卓越而设计",
    "privacyPage.badge": "隐私和透明度",
    "privacyPage.title": "隐私政策",
    "privacyPage.subtitle": "我们仅收集运行和保护服务所需的内容。",
    "privacyPage.lastUpdated": "最后更新时间：2026 年 2 月 7 日",
    "privacyPage.sections.zeroRetention.title": "会话访问",
    "privacyPage.sections.zeroRetention.desc": "上传的文件和结果在会话期间可用。请在会话结束前下载。",
    "privacyPage.sections.encryption.title": "传输加密",
    "privacyPage.sections.encryption.desc": "数据在上传和传输过程中被加密。我们使用信誉良好的提供商和行业标准安全控制。",
    "privacyPage.sections.noTracking.title": "无广告跟踪",
    "privacyPage.sections.noTracking.desc": "我们不会出售您的数据或运行广告跟踪器。我们可能会使用 reCAPTCHA 等反滥用工具，它可以收集设备信号并设置 cookie。",
    "privacyPage.sections.aiPowered.title": "自动化处理",
    "privacyPage.sections.aiPowered.desc": "处理主要是自动化的。出于支持或法律原因，数据访问仅限于授权人员。",
    "privacyPage.sections.compliance.title": "注重隐私",
    "privacyPage.sections.compliance.desc": "我们的目标是遵循隐私原则并对数据的使用方式保持透明。",
    "privacyPage.aboutTitle": "关于爱克罗墨达",
    "privacyPage.aboutP1": "Banklefy 是一款智能、快速且安全的工具，旨在精确轻松地将银行对账单从 PDF 转换为 Excel。",
    "privacyPage.aboutP2Prefix": "这个平台的创建者是",
    "privacyPage.aboutP2Suffix": "，来自哈佛大学的网络安全学生，位于印度拉贾斯坦邦科塔。 2026 年，18 岁的 Faizan 推出了 Banklefy，帮助个人和企业利用财务数据节省时间和精力。",
    "privacyPage.whatTitle": "阿克罗墨达做什么",
    "privacyPage.whatItems.item1": "将复杂的银行对账单 PDF 转换为干净、可编辑的 Excel 表格",
    "privacyPage.whatItems.item2": "保持格式、列和事务的清晰度",
    "privacyPage.whatItems.item3": "立即生效——无需安装软件",
    "privacyPage.whatItems.item4": "以数据隐私和安全为核心设计",
    "privacyPage.contactTitle": "问题？",
    "privacyPage.contactDescPrefix": "对于隐私问题，请联系支持人员。",
    "privacyPage.footer": "(c) 2026 阿克罗墨达。版权所有。",
    "settings.title": "设置",
    "settings.subtitle": "管理您的帐户、偏好设置和隐私设置",
    "settings.searchPlaceholder": "搜索设置...",
    "settings.backToHome": "返回首页",
    "settings.verified": "已验证",
    "settings.noResults": "未找到与您的搜索匹配的设置。",
    "settings.categories.all": "全部",
    "settings.categories.profile": "轮廓",
    "settings.categories.usage": "用法",
    "settings.categories.notifications": "通知",
    "settings.categories.appearance": "外貌",
    "settings.categories.privacy": "隐私",
    "settings.categories.advanced": "先进的",
    "settings.profile.email": "电子邮件",
    "settings.profile.emailDesc": "您的帐户电子邮件地址",
    "settings.profile.name": "显示名称",
    "settings.profile.nameDesc": "您的公开显示名称",
    "settings.profile.namePlaceholder": "输入你的名字",
    "settings.profile.password": "密码",
    "settings.profile.passwordDesc": "更改您的帐户密码",
    "settings.profile.changePassword": "更改密码",
    "settings.usage.stats": "使用统计",
    "settings.usage.statsDesc": "您的页面使用情况",
    "settings.usage.conversionsToday": "使用的页面",
    "settings.usage.remaining": "其余的",
    "settings.usage.subscription": "订阅计划",
    "settings.usage.subscriptionDesc": "您当前的订阅级别",
    "settings.usage.freeTier": "免费套餐",
    "settings.usage.anonymous": "匿名的",
    "settings.usage.upgrade": "升级",
    "settings.notifications.email": "电子邮件通知",
    "settings.notifications.emailDesc": "通过电子邮件接收更新",
    "settings.notifications.push": "推送通知",
    "settings.notifications.pushDesc": "浏览器推送通知",
    "settings.notifications.sound": "音效",
    "settings.notifications.soundDesc": "播放通知声音",
    "settings.appearance.theme": "主题",
    "settings.appearance.themeDesc": "在浅色和深色模式之间切换",
    "settings.appearance.language": "语言",
    "settings.appearance.languageDesc": "选择您的首选语言",
    "settings.privacy.visibility": "个人资料可见性",
    "settings.privacy.visibilityDesc": "控制谁可以看到您的个人资料",
    "settings.privacy.manage": "管理",
    "settings.privacy.data": "导出数据",
    "settings.privacy.dataDesc": "下载您的数据副本",
    "settings.privacy.download": "下载",
    "settings.privacy.delete": "删除帐户",
    "settings.privacy.deleteDesc": "永久删除您的帐户和数据",
    "settings.privacy.deleteAccount": "删除帐户",
    "settings.advanced.autoDownload": "自动下载",
    "settings.advanced.autoDownloadDesc": "自动下载转换后的文件",
    "chatAura.greeting": "你好！我是 Chat Aura，您的财务助理。今天我能为您提供什么帮助？",
    "chatAura.greetingWithPdf": "你好！我已加载您的文档 ({fileName})。有什么问题就问我吧！",
    "chatAura.subtitle": "您的人工智能财务助手",
    "chatAura.remaining": "剩下的聊天记录",
    "chatAura.placeholder": "询问你的发言...",
    "chatAura.errorResponse": "抱歉，我遇到了错误。请再试一次。",
    "chatAura.limitReached": "已达到聊天限制",
    "chatAura.signUpForMore": "注册无限对话",
    "chatAura.signUp": "报名",
    "footer.helpCenter": "帮助中心",
    "footer.blog": "博客",
    "footer.refunds": "退款政策",
    "helpPage.title": "帮助中心",
    "helpPage.subtitle": "从上传到导出的每个步骤都有 A 到 Z 的帮助。",
    "helpPage.sections.files.title": "支持的文件",
    "helpPage.sections.password.title": "受密码保护的 PDF",
    "helpPage.sections.limits.title": "每日限额",
    "helpPage.sections.accuracy.title": "准确性提示",
    "helpPage.sections.refunds.title": "退款",
    "helpPage.sections.refunds.desc": "14 天全额退款。请联系支持并提供您的订单 ID。",
    "helpPage.sections.contact.title": "联系支持人员",
    "helpPage.sections.contact.desc": "需要帮助吗？联系支持人员并分享您的订单 ID（如果有）。",
    "helpPage.cta.contact": "联系支持人员",
    "featuresPage.items.helpCenter.title": "帮助中心",
    "featuresPage.items.helpCenter.desc": "有关格式、限制和故障排除的分步指导，以实现顺利转换。",
    "featuresPage.items.refunds.title": "退款政策",
    "featuresPage.items.refunds.desc": "符合条件的计划可在 14 天内退款。详情请参阅定价。",
    "language": "英语"
  },
  "es": {

    "nav.features": "Características",

    "nav.demo": "Manifestación",


    "nav.settings": "Ajustes",


    "nav.about": "Acerca de",

    "nav.signIn": "Iniciar sesión",

    "nav.signOut": "Desconectar",

    "nav.getStarted": "Empezar",

    "nav.pricing": "Precios",

    "nav.benefits": "Beneficios",

    "nav.menu": "Menú",

    "hero.title": "Conversor de extractos bancarios con IA",

    "hero.titleLine1": "Extracto de cuenta",

    "hero.titleLine2": "Convertidor",

    "hero.tagline": "Aspecto profesional | Con tecnología OCR | Resultados instantáneos",

    "hero.subtitle": "AI OCR que convierte extractos bancarios en hojas de cálculo limpias y estructuradas con procesamiento seguro, extracción precisa y exportación multiformato.",

    "hero.uploadBtn": "Cargue su declaración ahora",

    "hero.pricingBtn": "Ver precios",

    "hero.sampleReportBtn": "Informe de muestra",

    "howItWorks.title": "Cómo funciona",

    "howItWorks.subtitle": "Transforma tus extractos bancarios a Excel en tres sencillos pasos",

    "howItWorks.step1.title": "Subir",

    "howItWorks.step1.desc": "Cargue su extracto bancario en cualquier formato: PDF, imagen escaneada o fotografía. Admitimos documentos de cualquier banco del mundo.",

    "howItWorks.step2.title": "Procesamiento de IA",

    "howItWorks.step2.desc": "Nuestro OCR con IA extrae y organiza al instante los datos de transacciones con alta precisión. Funciona con los formatos de extractos bancarios más comunes a nivel mundial.",

    "howItWorks.step3.title": "Descargar Excel",

    "howItWorks.step3.desc": "Reciba una hoja de cálculo de Excel limpia y estructurada, lista para contabilidad, análisis o integración con sus herramientas financieras.",

    "features.title": "Características",

    "features.accuracy": "Alta precisión",

    "features.accuracyDesc": "La extracción impulsada por IA está diseñada para reducir los errores.",

    "features.fast": "Rayo rápido",

    "features.fastDesc": "Convierta declaraciones en segundos",

    "features.secure": "Procesamiento seguro",

    "features.secureDesc": "Cifrado en tránsito con almacenamiento de acceso controlado.",

    "pricing.title": "Precios",

    "pricing.free": "Gratis",

    "pricing.daily": "A diario",

    "pricing.business": "Negocio",

    "upload.limit.daily.title": "Límite diario alcanzado",

    "upload.limit.daily.authFree": "Has utilizado todas las {limit} páginas de hoy. Tu límite diario se reinicia a medianoche. Actualice para límites más altos.",

    "upload.limit.daily.authPaid": "Ha utilizado todas las {limit} páginas para su plan actual. Actualice a un plan superior para continuar.",

    "upload.limit.daily.anon": "Has utilizado todas las {limit} páginas gratuitas de hoy. Cree una cuenta gratuita para 5 páginas/día o elija un plan para límites más altos.",

    "upload.limit.page.title": "Límite de páginas",

    "upload.limit.page.auth": "Los archivos seleccionados tienen {total} páginas, pero hoy solo están disponibles {remaining} páginas (límite diario {limit}). Elimina algunas páginas o actualiza tu plan.",

    "upload.limit.page.anon": "Los archivos seleccionados tienen {total} páginas, pero hoy solo están disponibles {remaining} páginas gratuitas (límite diario {limit}). Regístrate para recibir 5 páginas/día o elige un plan.",

    "upload.limit.usage.title": "Límite de uso alcanzado",

    "upload.limit.paid.pack": "Has usado las {limit} páginas de tu paquete actual. Compra otro plan para continuar.",

    "upload.limit.paid.month": "Has usado las {limit} páginas de este mes. Tu uso se restablece al inicio del próximo mes.",

    "upload.limit.paid.year": "Has usado las {limit} páginas de este año. Tu uso se restablece al inicio del próximo año.",

    "upload.limit.paid.plan": "Has usado las {limit} páginas de tu plan. Actualiza tu plan para continuar.",

    "upload.limit.signupCta": "Regístrate para obtener 5 páginas gratis",

    "upload.limit.upgradeCta": "Mejorar plan",

    "upload.remaining.counterSuffix": "de {limit} páginas restantes",

    "upload.remaining.signupMore": "Regístrate para más páginas",

    "footer.product": "Producto",

    "footer.features": "Características",

    "footer.pricing": "Precios",

    "footer.howItWorks": "Cómo funciona",

    "footer.resources": "Recursos",

    "footer.docs": "Documentación",

    "footer.faqs": "Preguntas frecuentes",

    "footer.sampleReport": "Reporte de muestra",

    "footer.security": "Seguridad",

    "footer.contact": "Contáctanos",

    "footer.cookiePolicy": "Política de cookies",

    "docsPage.badge": "Documentación",

    "docsPage.title": "Documentación",

    "docsPage.subtitle": "Todo lo que necesitas para usar Banklefy con confianza.",

    "docsPage.sections.gettingStarted.title": "Primeros pasos",

    "docsPage.sections.gettingStarted.desc": "Sube el estado de cuenta, revisa la vista previa y exporta Excel/CSV/Tally.",

    "docsPage.sections.formats.title": "Formatos compatibles",

    "docsPage.sections.formats.desc": "Soporta PDF, JPG y PNG. Los PDF de texto son más rápidos.",

    "docsPage.sections.limits.title": "Límites de uso",

    "docsPage.sections.limits.desc": "Usuarios gratis tienen páginas diarias; los packs pagados agregan más páginas y exportaciones premium.",

    "docsPage.sections.security.title": "Seguridad básica",

    "docsPage.sections.security.desc": "Tus datos se gestionan de forma segura y el acceso se limita a tu cuenta o sesi?n activa.",

    "faqPage.badge": "Preguntas frecuentes",

    "faqPage.title": "Preguntas frecuentes",

    "faqPage.subtitle": "Respuestas rápidas a dudas comunes.",

    "faqPage.items.formats.title": "¿Qué formatos se admiten?",

    "faqPage.items.formats.desc": "PDF, JPG y PNG para estados de cuenta de texto o escaneados.",

    "faqPage.items.password.title": "¿Soportan PDFs con contraseña?",

    "faqPage.items.password.desc": "Sí. Ingresa la contraseña en el campo de desbloqueo.",

    "faqPage.items.timing.title": "¿Cuánto tarda la conversión?",

    "faqPage.items.timing.desc": "Los PDFs de texto son rápidos; los escaneados pueden tardar más.",

    "faqPage.items.refund.title": "¿Dónde pido un reembolso?",

    "faqPage.items.refund.desc": "Los reembolsos se gestionan desde la página de Precios.",

    "faqPage.items.storage.title": "¿Guardan mis archivos?",

    "faqPage.items.storage.desc": "Los archivos temporales est?n disponibles durante tu sesi?n para descargar. Las conversiones guardadas permanecen en el historial de tu cuenta hasta que las elimines.",

    "footer.help.title": "Ayuda",

    "footer.help.item1": "Archivos compatibles: PDF, JPG, PNG (escaneos y fotografías)",

    "footer.help.item2": "PDF protegidos con contraseña: ingrese la contraseña antes de convertir",

    "footer.help.item3": "Límites diarios: 2 páginas anónimas/día, 5 páginas/día gratis, pago por plan",

    "footer.help.item4": "Consejos de precisión: suba páginas completas, evite las imágenes borrosas",

    "footer.help.item5": "¿Necesitar ayuda? Póngase en contacto con el soporte.",

    "footer.company": "Compañía",

    "footer.about": "Acerca de",

    "footer.privacy": "política de privacidad",

    "footer.terms": "Términos y condiciones",

    "footer.cta.title": "Listo para transformar tu",

    "footer.cta.subtitle": "¿Flujo de trabajo financiero?",

    "footer.cta.desc": "Creado para equipos e individuos que necesitan conversiones de extractos bancarios instantáneas y precisas.",

    "footer.cta.btn": "Comience a convertir ahora",

    "footer.copyright": "© 2026 Banklefy. Creado por Faizan Rizvi.",

    "footer.recaptcha.prefix": "Este sitio está protegido por reCAPTCHA y Google",

    "footer.recaptcha.privacy": "política de privacidad",

    "footer.recaptcha.and": "y",

    "footer.recaptcha.terms": "Términos de servicio",

    "footer.recaptcha.suffix": "aplicar.",

    "auth.welcome": "¡Bienvenido de nuevo!",

    "auth.signedIn": "Has iniciado sesión correctamente.",

    "auth.accountCreated": "¡Cuenta creada!",

    "auth.canUse": "Ahora puedes empezar a utilizar Banklefy.",

    "auth.email": "Correo electrónico",

    "auth.password": "Contraseña",

    "auth.signIn": "Iniciar sesión",

    "auth.signUp": "Inscribirse",

    "auth.forgotPassword": "¿Has olvidado tu contraseña?",

    "auth.noAccount": "¿No tienes una cuenta? Inscribirse",

    "auth.hasAccount": "¿Ya tienes una cuenta? Iniciar sesión",

    "auth.secureAccess": "Acceso seguro",

    "common.back": "Atrás",

    "common.backToHome": "Volver a Inicio",

    "featuresPage.title": "TODAS LAS CARACTERÍSTICAS",

    "featuresPage.subtitle": "Lista completa de la A a la Z de todo lo que ofrece Banklefy, desde OCR con tecnología de inteligencia artificial hasta procesamiento que prioriza la privacidad. Creado para ofrecer precisión, velocidad y análisis financieros claros.",

    "featuresPage.categories.core": "Tecnología central",

    "featuresPage.categories.financial": "Análisis financiero",

    "featuresPage.categories.risk": "Análisis de riesgos",


    "featuresPage.categories.export": "Exportar",

    "featuresPage.categories.performance": "Actuación",

    "featuresPage.categories.security": "Seguridad",

    "featuresPage.categories.privacy": "Privacidad",

    "featuresPage.categories.accessibility": "Accesibilidad",

    "featuresPage.categories.technology": "Tecnología",

    "featuresPage.categories.usage": "Uso",

    "featuresPage.items.aiOcr.title": "MOTOR OCR IMPULSADO POR IA",

    "featuresPage.items.aiOcr.desc": "Extrae datos de archivos PDF, escaneos y fotografías. Reconoce tablas de transacciones, fechas, importes y descripciones con gran precisión, incluso en documentos de baja calidad.",

    "featuresPage.items.excelCsv.title": "EXPORTACIÓN EXCEL Y CSV",

    "featuresPage.items.excelCsv.desc": "Exporte Excel limpio (.xlsx) y CSV con las columnas adecuadas (Fecha, Descripción, Débito, Crédito, Saldo, Categoría). Funciona con herramientas de contabilidad populares.",

    "featuresPage.items.pdfReport.title": "GENERACIÓN DE INFORMES PDF",

    "featuresPage.items.pdfReport.desc": "Crea un resumen PDF limpio a partir de las transacciones extraídas (totales, métricas clave y puntos destacados) para auditorías y préstamos.",

    "featuresPage.items.foir.title": "CÁLCULO FOIR",

    "featuresPage.items.foir.desc": "Calcula automáticamente el FOIR mediante un análisis basado en reglas mediante la detección de créditos salariales y débitos de EMI, que se utilizan en la evaluación de elegibilidad para préstamos.",

    "featuresPage.items.emiDetection.title": "DETECCIÓN EMI",

    "featuresPage.items.emiDetection.desc": "Detecta EMI recurrentes a través de patrones deterministas (préstamos para vivienda/automóvil/personal, EMI de tarjetas de crédito, BNPL). Sin conjeturas, totalmente explicable.",

    "featuresPage.items.salaryAnalysis.title": "ANÁLISIS DE CRÉDITO SALARIAL",

    "featuresPage.items.salaryAnalysis.desc": "Encuentra créditos salariales utilizando patrones recurrentes y palabras clave del empleador para estimar el ingreso mensual promedio para la suscripción.",

    "featuresPage.items.cashflow.title": "ANÁLISIS DE FLUJO DE CAJA",

    "featuresPage.items.cashflow.desc": "Desglosa las entradas/salidas y el flujo de caja neto con resúmenes de categorías e información sobre tendencias.",

    "featuresPage.items.adbAmb.title": "SALDO PROMEDIO DIARIO",

    "featuresPage.items.adbAmb.desc": "Calcula las métricas ADB/AMB utilizadas por los bancos para verificar el saldo mínimo y evaluar los préstamos.",

    "featuresPage.items.fraudDetection.title": "DETECCIÓN DE FRAUDE",

    "featuresPage.items.fraudDetection.desc": "Señala patrones sospechosos como transacciones de cifras redondas, anomalías de fin de semana, duplicados y desajustes de saldo.",

    "featuresPage.items.integrityScoring.title": "PUNTUACIÓN DE INTEGRIDAD",

    "featuresPage.items.integrityScoring.desc": "Valida la coherencia de los estados de cuenta entre fechas y saldos para ayudar a detectar manipulaciones y errores.",

    "featuresPage.items.underwritingPanel.title": "PANEL DE SUSCRIPCIÓN",

    "featuresPage.items.underwritingPanel.desc": "Todas las métricas clave de un vistazo: ingresos, EMI, FOIR, tendencias de saldo e indicadores de riesgo, diseñadas para decisiones crediticias.",

    "featuresPage.items.banks.title": "COMPATIBLE CON 1000+ BANCOS",

    "featuresPage.items.banks.desc": "Funciona con una amplia variedad de formatos y diseños de extractos bancarios, incluidos bancos importantes de India e internacionales.",

    "featuresPage.items.instantProcessing.title": "PROCESAMIENTO INSTANTÁNEO",

    "featuresPage.items.instantProcessing.desc": "Procesamiento rápido para PDF con texto; los estados escaneados pueden tardar más.",

    "featuresPage.items.batchProcessing.title": "PROCESAMIENTO POR LOTES",

    "featuresPage.items.batchProcessing.desc": "Convierta varios extractos en paralelo: ideal para contables y flujos de trabajo masivos.",



    "featuresPage.items.encryption.title": "CIFRADO EN TRÁNSITO",

    "featuresPage.items.encryption.desc": "Los datos se cifran durante la carga y la transferencia para proteger los datos financieros confidenciales.",

    "featuresPage.items.zeroRetention.title": "ACCESO CONTROLADO A ARCHIVOS",

    "featuresPage.items.zeroRetention.desc": "Las cargas temporales est?n disponibles durante tu sesi?n activa. Las conversiones guardadas permanecen en el historial de tu cuenta hasta que las elimines.",

    "featuresPage.items.categorization.title": "CATEGORIZACIÓN INTELIGENTE",

    "featuresPage.items.categorization.desc": "Clasifica automáticamente las transacciones en categorías (Salario, EMI, Servicios Públicos, Compras, Alimentos, etc.) con mapeo personalizable.",

    "featuresPage.items.exportFormats.title": "MÚLTIPLES FORMATOS DE EXPORTACIÓN",

    "featuresPage.items.exportFormats.desc": "Exportación por plan: Excel/CSV para todos, y JSON/MT940 en planes pagos.",

    "featuresPage.items.ruleBased.title": "PRECISIÓN BASADA EN REGLAS",

    "featuresPage.items.ruleBased.desc": "Cálculos deterministas: sin alucinaciones ni conjeturas: cada número se calcula con precisión y se puede explicar.",

    "featuresPage.items.dailyLimits.title": "LÍMITES DE RESTABLECIMIENTO DIARIO",

    "featuresPage.items.dailyLimits.desc": "Los límites gratuitos se restablecen diariamente a la medianoche, hora local. Los usuarios anónimos obtienen 2 páginas al día; los usuarios registrados obtienen 5 páginas al día. Los planes pagos se reinician con su ciclo de facturación.",

    "featuresPage.cta.title": "¿Listo para experimentar todas las funciones?",

    "featuresPage.cta.desc": "Comience con 2 páginas gratis por día. Regístrate para recibir 5 páginas por día y desbloquea todo el poder de Banklefy.",

    "featuresPage.cta.tryDemo": "Pruebe la demostración ahora",

    "featuresPage.cta.signUp": "Regístrate gratis",

    "featuresPage.footer": "© 2026 Banklefy | Diseñado para la excelencia",

    "aboutPage.visionTitle": "Bienvenido a Banklefy",

    "aboutPage.visionSubtitle": "Conversión segura de estados de cuenta para finanzas modernas.",

    "aboutPage.visionP1": "Banklefy convierte PDFs, escaneos e imágenes en Excel/CSV limpios con precisión y privacidad. Creado para contadores, equipos financieros y pequeñas empresas sin copiar manualmente.",

    "aboutPage.brainchildPrefix": "Hola, soy",

    "aboutPage.brainchildP1": "Soy un creador enfocado en la seguridad de Kota, Rajasthan. Creé Banklefy para simplificar el procesamiento de estados y proteger datos sensibles. Pruebo formatos reales para mantener resultados limpios y confiables.",

    "aboutPage.brainchildP2": "Lancé Banklefy en 2026, combinando análisis determinista y OCR cuidadoso para entregar exportaciones confiables con foco constante en precisión, privacidad y auditoría.",

    "aboutPage.problemTitle": "El problema que resolvemos",

    "aboutPage.problemIntro": "Los estados de cuenta son inconsistentes, lentos y riesgosos de manejar a mano.",

    "aboutPage.problemBullets.one": "Cada banco usa formatos distintos con celdas combinadas y filas partidas.",

    "aboutPage.problemBullets.two": "El copiar/pegar consume horas y genera errores.",

    "aboutPage.problemBullets.three": "Los datos sensibles no deberían quedar en hojas sueltas.",

    "aboutPage.problemBullets.four": "El OCR genérico falla con estados densos.",

    "aboutPage.solutionTitle": "Por qué Banklefy",

    "aboutPage.solutionIntro": "Motor de conversión con privacidad primero para flujos contables reales.",

    "aboutPage.solutionBullets.one": "Parseo determinista para PDFs de texto — OCR solo si hace falta.",

    "aboutPage.solutionBullets.two": "Alta precisión ajustada a bancos de India.",

    "aboutPage.solutionBullets.three": "Exportes listos para Excel, CSV y Tally.",

    "aboutPage.solutionBullets.four": "Retención mínima con trazabilidad clara.",

    "aboutPage.solutionBullets.five": "Diseñado para contadores, asesores fiscales y finanzas.",

    "aboutPage.audienceTitle": "Para quién es",

    "aboutPage.audienceIntro": "Si trabajas con estados a diario, Banklefy es para ti.",

    "aboutPage.audienceBullets.one": "Contadores y consultores fiscales.",

    "aboutPage.audienceBullets.two": "Equipos financieros con múltiples cuentas.",

    "aboutPage.audienceBullets.three": "Bookkeepers que necesitan exportes limpios rápido.",

    "aboutPage.audienceBullets.four": "Fundadores que quieren reportes confiables.",

    "aboutPage.principlesTitle": "Nuestros principios",

    "aboutPage.principlesIntro": "Priorizamos claridad, privacidad y resultados predecibles.",

    "aboutPage.principlesBullets.one": "Lógica determinista primero, OCR como respaldo.",

    "aboutPage.principlesBullets.two": "Validación por balance para reducir errores.",

    "aboutPage.principlesBullets.three": "Minimización de datos y privacidad primero.",

    "aboutPage.principlesBullets.four": "Exportes claros y auditables.",

    "aboutPage.valueProps.cyberSafe.title": "Ciberseguro",

    "aboutPage.valueProps.cyberSafe.desc": "Seguridad primero para flujos financieros sensibles.",

    "aboutPage.valueProps.instantFlux.title": "Flujo instantáneo",

    "aboutPage.valueProps.instantFlux.desc": "Convierta datos complejos sin entrada manual.",

    "aboutPage.valueProps.accuracy.title": "Alta precisión",

    "aboutPage.valueProps.accuracy.desc": "Conversión precisa para datos financieros críticos.",

    "aboutPage.roadmapTitle": "Qué sigue",

    "aboutPage.roadmapBullets.one": "Procesamiento masivo y espacios de equipo.",

    "aboutPage.roadmapBullets.two": "Integraciones con QuickBooks, Zoho Books y Xero.",

    "aboutPage.roadmapBullets.three": "Clasificación más inteligente e insights de flujo de caja.",

    "aboutPage.roadmapBullets.four": "Más formatos bancarios y cobertura de diseños.",

    "aboutPage.connectTitle": "Conéctate con el Creador",

    "aboutPage.contact.hotline": "Línea directa",

    "aboutPage.contact.mail": "Correo directo",

    "aboutPage.contact.social": "Redes sociales",

    "aboutPage.contact.hq": "sede",

    "aboutPage.contact.hqValue": "Prem Nagar, Kota, Rajasthan 324004",
    "aboutPage.footer": "© 2026 Banklefy | Diseñado para la excelencia",

    "privacyPage.badge": "Privacidad y transparencia",

    "privacyPage.title": "política de privacidad",

    "privacyPage.subtitle": "Recopilamos solo lo que necesitamos para ejecutar y proteger el servicio.",

    "privacyPage.lastUpdated": "Última actualización: 7 de febrero de 2026",

    "privacyPage.sections.zeroRetention.title": "Acceso por sesión",

    "privacyPage.sections.zeroRetention.desc": "Los archivos cargados se procesan durante tu sesi?n activa. Las conversiones guardadas permanecen en el historial de tu cuenta hasta que las elimines.",

    "privacyPage.sections.encryption.title": "Cifrado en tránsito",

    "privacyPage.sections.encryption.desc": "Los datos se cifran durante la carga y la transferencia. Utilizamos proveedores acreditados y controles de seguridad estándar de la industria.",

    "privacyPage.sections.noTracking.title": "Sin seguimiento de anuncios",

    "privacyPage.sections.noTracking.desc": "No vendemos sus datos ni ejecutamos rastreadores de publicidad. Podemos utilizar herramientas anti-abuso como reCAPTCHA, que pueden recopilar señales del dispositivo y configurar cookies.",

    "privacyPage.sections.aiPowered.title": "Procesamiento automatizado",

    "privacyPage.sections.aiPowered.desc": "El procesamiento es principalmente automatizado. El acceso a los datos está limitado al personal autorizado por motivos legales o de soporte.",

    "privacyPage.sections.compliance.title": "Pensado en la privacidad",

    "privacyPage.sections.compliance.desc": "Nuestro objetivo es seguir los principios de privacidad y ser transparentes sobre cómo se utilizan los datos.",

    "privacyPage.aboutTitle": "Acerca de Banklefy",

    "privacyPage.aboutP1": "Banklefy es una herramienta inteligente, rápida y segura creada para convertir extractos bancarios de PDF a Excel con precisión y facilidad.",

    "privacyPage.aboutP2Prefix": "Esta plataforma fue creada por",

    "privacyPage.aboutP2Suffix": ", con sede en Kota, Rajasthan, India. Banklefy se lanzó en 2026 para ayudar a personas y empresas a ahorrar tiempo y esfuerzo con datos financieros.",

    "privacyPage.whatTitle": "¿Qué hace Banklefy?",

    "privacyPage.whatItems.item1": "Convierte archivos PDF complejos de extractos bancarios en hojas de Excel limpias y editables",

    "privacyPage.whatItems.item2": "Mantiene el formato, las columnas y la claridad de las transacciones.",

    "privacyPage.whatItems.item3": "Funciona al instante: no requiere instalación de software",

    "privacyPage.whatItems.item4": "Diseñado teniendo en cuenta la privacidad y la seguridad de los datos",

    "privacyPage.contactTitle": "¿Preguntas?",

    "privacyPage.contactDescPrefix": "Si tiene preguntas sobre privacidad, comuníquese con el soporte.",

    "privacyPage.footer": "(c) 2026 Acrómeda. Reservados todos los derechos.",

    "securityPage.badge": "Seguridad y confianza",

    "securityPage.title": "Seguridad",

    "securityPage.subtitle": "Cómo Banklefy protege tus datos y conversiones.",

    "securityPage.lastUpdated": "Última actualización: 17 de marzo de 2026",

    "securityPage.sections.dataHandling.title": "Manejo de datos",

    "securityPage.sections.dataHandling.desc": "Los archivos se procesan para generar exportaciones. No vendemos datos y limitamos el acceso a tu cuenta o sesi?n activa.",

    "securityPage.sections.encryption.title": "Cifrado en tránsito",

    "securityPage.sections.encryption.desc": "Todo el tráfico usa HTTPS/TLS.",

    "securityPage.sections.access.title": "Control de acceso",

    "securityPage.sections.access.desc": "Solo t? puedes acceder a tus archivos y exportaciones a trav?s de tu cuenta o sesi?n activa.",

    "securityPage.sections.retention.title": "Retención y eliminación",

    "securityPage.sections.retention.desc": "Las cargas temporales se limpian despu?s del procesamiento. Las conversiones guardadas permanecen en el historial de tu cuenta hasta que las elimines.",

    "securityPage.sections.incident.title": "Respuesta ante incidentes",

    "securityPage.sections.incident.desc": "Si hay un incidente de seguridad, notificaremos a los usuarios según la ley.",

    "cookiePage.badge": "Cookies",

    "cookiePage.title": "Política de cookies",

    "cookiePage.subtitle": "Cómo usamos cookies para sesiones y seguridad.",

    "cookiePage.lastUpdated": "Última actualización: 17 de marzo de 2026",

    "cookiePage.sections.essential.title": "Cookies esenciales",

    "cookiePage.sections.essential.desc": "Necesarias para mantener la sesión y la seguridad.",

    "cookiePage.sections.security.title": "Seguridad y prevención de abuso",

    "cookiePage.sections.security.desc": "reCAPTCHA y controles de seguridad pueden establecer cookies adicionales.",

    "cookiePage.sections.analytics.title": "Analítica de rendimiento",

    "cookiePage.sections.analytics.desc": "Podemos usar analítica mínima para mejorar el rendimiento.",

    "cookiePage.sections.control.title": "Gestionar cookies",

    "cookiePage.sections.control.desc": "Puedes controlar o eliminar cookies desde el navegador.",

    "contactPage.badge": "Contacto",

    "contactPage.title": "Contáctanos",

    "contactPage.subtitle": "Preguntas, facturación o soporte — estamos aquí para ayudar.",

    "contactPage.responseNote": "Tiempo de respuesta típico: 24–48 horas.",

    "contactPage.support.title": "Soporte",

    "contactPage.support.desc": "Usa el formulario para contactarnos. Respondemos lo antes posible.",

    "contactPage.support.button": "Contactar soporte",

    "contactPage.email.title": "Correo electrónico",

    "contactPage.email.desc": "¿Prefieres correo? Escríbenos a",

    "settings.title": "Ajustes",

    "settings.subtitle": "Administre su cuenta, preferencias y configuración de privacidad",

    "settings.searchPlaceholder": "Configuración de búsqueda...",

    "settings.backToHome": "Volver a Inicio",

    "settings.verified": "Verificado",

    "settings.noResults": "No se encontraron configuraciones que coincidan con su búsqueda.",

    "settings.categories.all": "Todo",

    "settings.categories.profile": "Perfil",

    "settings.categories.usage": "Uso",

    "settings.categories.notifications": "Notificaciones",

    "settings.categories.appearance": "Apariencia",

    "settings.categories.privacy": "Privacidad",

    "settings.categories.advanced": "Avanzado",

    "settings.profile.email": "Dirección de correo electrónico",

    "settings.profile.emailDesc": "La dirección de correo electrónico de tu cuenta",

    "settings.profile.name": "Nombre para mostrar",

    "settings.profile.nameDesc": "Su nombre público",

    "settings.profile.namePlaceholder": "Introduce tu nombre",

    "settings.profile.password": "Contraseña",

    "settings.profile.passwordDesc": "Cambia la contraseña de tu cuenta",

    "settings.profile.changePassword": "Cambiar la contraseña",

    "settings.usage.stats": "Estadísticas de uso",

    "settings.usage.statsDesc": "Uso de tu página",

    "settings.usage.conversionsToday": "páginas utilizadas",

    "settings.usage.remaining": "restante",

    "settings.usage.subscription": "Plan actual",

    "settings.usage.subscriptionDesc": "Su plan actual",

    "settings.usage.freeTier": "Nivel gratuito",

    "settings.usage.anonymous": "Anónimo",

    "settings.usage.upgrade": "Mejora",

    "settings.notifications.email": "Notificaciones por correo electrónico",

    "settings.notifications.emailDesc": "Reciba actualizaciones por correo electrónico",

    "settings.notifications.push": "Notificaciones push",

    "settings.notifications.pushDesc": "Notificaciones push del navegador",

    "settings.notifications.sound": "Efectos sonoros",

    "settings.notifications.soundDesc": "Reproducir sonidos para notificaciones",

    "settings.appearance.theme": "Tema",

    "settings.appearance.themeDesc": "Alternar entre el modo claro y oscuro",

    "settings.appearance.language": "Idioma",

    "settings.appearance.languageDesc": "Elige tu idioma preferido",

    "settings.privacy.visibility": "Visibilidad del perfil",

    "settings.privacy.visibilityDesc": "Controla quién puede ver tu perfil",

    "settings.privacy.manage": "Administrar",

    "settings.privacy.data": "Exportar datos",

    "settings.privacy.dataDesc": "Descarga una copia de tus datos",

    "settings.privacy.download": "Descargar",

    "settings.privacy.delete": "Eliminar cuenta",

    "settings.privacy.deleteDesc": "Elimina permanentemente tu cuenta y tus datos",

    "settings.privacy.deleteAccount": "Eliminar cuenta",

    "settings.advanced.autoDownload": "Descarga automática",

    "settings.advanced.autoDownloadDesc": "Descargar automáticamente archivos convertidos",










    "footer.helpCenter": "Centro de ayuda",

    "footer.blog": "Publicaciones",

    "footer.refunds": "Política de reembolso",

    "helpPage.title": "Centro de ayuda",

    "helpPage.subtitle": "Ayuda de la A a la Z para cada paso, desde la carga hasta la exportación.",

    "helpPage.sections.files.title": "Archivos compatibles",

    "helpPage.sections.password.title": "Archivos PDF protegidos con contraseña",

    "helpPage.sections.limits.title": "Límites diarios",

    "helpPage.sections.accuracy.title": "Consejos de precisión",

    "helpPage.sections.refunds.title": "Reembolsos",

    "helpPage.sections.refunds.desc": "Reembolso completo de 14 días. Contacta con soporte con tu ID de pedido.",

    "helpPage.sections.contact.title": "Contactar con soporte",

    "helpPage.sections.contact.desc": "¿Necesitar ayuda? Póngase en contacto con el soporte y comparta su ID de pedido si está disponible.",

    "helpPage.cta.contact": "Contactar con soporte",

    "featuresPage.items.helpCenter.title": "CENTRO DE AYUDA",

    "featuresPage.items.helpCenter.desc": "Guía paso a paso sobre formatos, límites y solución de problemas para conversiones fluidas.",

    "featuresPage.items.refunds.title": "POLÍTICA DE REEMBOLSO",

    "featuresPage.items.refunds.desc": "Reembolsos dentro de los 14 días para planes elegibles. Consulte Precios para obtener más detalles.",

    "language": "Inglés"

  },

  "hi": {
    "nav.features": "विशेषताएँ",
    "nav.demo": "डेमो",
    "nav.chatAura": "आभा चैट करें",
    "nav.settings": "सेटिंग्स",
    "nav.admin": "व्यवस्थापक",
    "nav.about": "के बारे में",
    "nav.signIn": "दाखिल करना",
    "nav.signOut": "साइन आउट",
    "nav.getStarted": "शुरू हो जाओ",
    "nav.pricing": "मूल्य निर्धारण",
    "nav.benefits": "फ़ायदे",
    "nav.menu": "मेनू",
    "hero.title": "एआई बैंक स्टेटमेंट कनवर्टर",
    "hero.titleLine1": "बैंक स्टेटमेंट",
    "hero.titleLine2": "कनवर्टर",
    "hero.tagline": "प्रोफेशनल लुक | ओसीआर-संचालित | त्वरित परिणाम",
    "hero.subtitle": "एआई ओसीआर जो बैंक स्टेटमेंट को सुरक्षित प्रसंस्करण, सटीक निष्कर्षण और बहु-प्रारूप निर्यात के साथ स्वच्छ, संरचित स्प्रेडशीट में बदल देता है।",
    "hero.uploadBtn": "अभी अपना विवरण अपलोड करें",
    "hero.pricingBtn": "मूल्य निर्धारण देखें",
    "hero.sampleReportBtn": "नमूना रिपोर्ट",
    "howItWorks.title": "यह काम किस प्रकार करता है",
    "howItWorks.subtitle": "तीन सरल चरणों में अपने बैंक विवरण को एक्सेल में बदलें",
    "howItWorks.step1.title": "अपलोड करें",
    "howItWorks.step1.desc": "अपना बैंक विवरण किसी भी प्रारूप में अपलोड करें - पीडीएफ, स्कैन की गई छवि, या फोटो। हम दुनिया भर के किसी भी बैंक के दस्तावेज़ों का समर्थन करते हैं।",
    "howItWorks.step2.title": "एआई प्रोसेसिंग",
    "howItWorks.step2.desc": "हमारा एआई-संचालित ओसीआर तुरंत उच्च सटीकता के साथ लेनदेन डेटा निकालता है और व्यवस्थित करता है। यह प्रमुख बैंक स्टेटमेंट फॉर्मेट्स के साथ काम करता है।",
    "howItWorks.step3.title": "एक्सेल डाउनलोड करें",
    "howItWorks.step3.desc": "लेखांकन, विश्लेषण, या अपने वित्तीय उपकरणों के साथ एकीकरण के लिए तैयार एक साफ, संरचित एक्सेल स्प्रेडशीट प्राप्त करें।",
    "features.title": "विशेषताएँ",
    "features.accuracy": "उच्च सटीकता",
    "features.accuracyDesc": "एआई-संचालित निष्कर्षण को त्रुटियों को कम करने के लिए डिज़ाइन किया गया है।",
    "features.fast": "बिजली की तेजी",
    "features.fastDesc": "कथनों को सेकंडों में परिवर्तित करें",
    "features.secure": "सुरक्षित प्रसंस्करण",
    "features.secureDesc": "एक्सेस-नियंत्रित भंडारण के साथ पारगमन में एन्क्रिप्टेड।",
    "pricing.title": "मूल्य निर्धारण",
    "pricing.free": "मुक्त",
    "pricing.daily": "दैनिक",
    "pricing.business": "व्यापार",
    "upload.limit.daily.title": "दैनिक सीमा तक पहुँच गया",
    "upload.limit.daily.authFree": "आपने आज के लिए सभी {limit} पृष्ठों का उपयोग कर लिया है। आपकी दैनिक सीमा आधी रात को रीसेट हो जाती है। उच्च सीमा के लिए अपग्रेड करें.",
    "upload.limit.daily.authPaid": "आपने अपनी वर्तमान योजना के लिए सभी {limit} पृष्ठों का उपयोग कर लिया है। जारी रखने के लिए किसी उच्चतर योजना में अपग्रेड करें।",
    "upload.limit.daily.anon": "आपने आज के लिए सभी {limit} निःशुल्क पृष्ठों का उपयोग कर लिया है। 5 पेज/दिन के लिए एक निःशुल्क खाता बनाएं या उच्च सीमा के लिए एक योजना चुनें।",
    "upload.limit.page.title": "पृष्ठ सीमा",
    "upload.limit.page.auth": "चयनित फ़ाइलों में {total} पृष्ठ हैं, लेकिन आज केवल {remaining} पृष्ठ उपलब्ध हैं (दैनिक सीमा {limit})। कुछ पेज हटाएँ या अपनी योजना अपग्रेड करें।",
    "upload.limit.page.anon": "चयनित फ़ाइलों में {total} पृष्ठ हैं, लेकिन आज केवल {remaining} निःशुल्क पृष्ठ उपलब्ध हैं (दैनिक सीमा {limit})। प्रतिदिन 5 पृष्ठों के लिए साइन अप करें या एक योजना चुनें।",
    "upload.limit.usage.title": "उपयोग सीमा पूरी हो गई",
    "upload.limit.paid.pack": "आपने अपने वर्तमान पैक की सभी {limit} पेज उपयोग कर ली हैं। जारी रखने के लिए नया प्लान खरीदें।",
    "upload.limit.paid.month": "आपने इस महीने की सभी {limit} पेज उपयोग कर ली हैं। अगले महीने की शुरुआत में उपयोग रीसेट होगा।",
    "upload.limit.paid.year": "आपने इस वर्ष की सभी {limit} पेज उपयोग कर ली हैं। अगले वर्ष की शुरुआत में उपयोग रीसेट होगा।",
    "upload.limit.paid.plan": "आपने अपनी योजना की सभी {limit} पेज उपयोग कर ली हैं। जारी रखने के लिए योजना अपग्रेड करें।",
    "upload.limit.signupCta": "5 मुफ्त पेज के लिए साइन अप करें",
    "upload.limit.upgradeCta": "योजना अपग्रेड करें",
    "upload.remaining.counterSuffix": "{limit} में से पेज शेष",
    "upload.remaining.signupMore": "और पेज के लिए साइन अप करें",
    "footer.product": "उत्पाद",
    "footer.features": "विशेषताएँ",
    "footer.pricing": "मूल्य निर्धारण",
    "footer.howItWorks": "यह काम किस प्रकार करता है",
    "footer.help.title": "मदद",
    "footer.help.item1": "समर्थित फ़ाइलें: पीडीएफ, जेपीजी, पीएनजी (स्कैन और फोटो)",
    "footer.help.item2": "पासवर्ड-सुरक्षित पीडीएफ़: कनवर्ट करने से पहले पासवर्ड दर्ज करें",
    "footer.help.item3": "दैनिक सीमाएँ: अनाम 2 पृष्ठ/दिन, निःशुल्क 5 पृष्ठ/दिन, योजना के अनुसार भुगतान",
    "footer.help.item4": "सटीकता युक्तियाँ: पूर्ण पृष्ठ अपलोड करें, धुंधलापन से बचें",
    "footer.help.item5": "मदद की ज़रूरत है? समर्थन से संपर्क करें।",
    "footer.company": "कंपनी",
    "footer.about": "के बारे में",
    "footer.privacy": "गोपनीयता नीति",
    "footer.terms": "नियम एवं शर्तें",
    "footer.cta.title": "आपका परिवर्तन करने के लिए तैयार",
    "footer.cta.subtitle": "वित्तीय कार्यप्रवाह?",
    "footer.cta.desc": "उन टीमों और व्यक्तियों के लिए बनाया गया है जिन्हें सटीक, तत्काल बैंक स्टेटमेंट रूपांतरण की आवश्यकता होती है।",
    "footer.cta.btn": "अभी कनवर्ट करना प्रारंभ करें",
    "footer.copyright": "© 2026 एक्रोमेडा। फ़ैज़ान रिज़वी द्वारा बनाया गया।",
    "footer.recaptcha.prefix": "यह साइट reCAPTCHA और Google द्वारा सुरक्षित है",
    "footer.recaptcha.privacy": "गोपनीयता नीति",
    "footer.recaptcha.and": "और",
    "footer.recaptcha.terms": "सेवा की शर्तें",
    "footer.recaptcha.suffix": "आवेदन करना।",
    "auth.welcome": "वापसी पर स्वागत है!",
    "auth.signedIn": "आपने सफलतापूर्वक साइन इन कर लिया है.",
    "auth.accountCreated": "खाता बनाया गया!",
    "auth.canUse": "अब आप एक्रोमेडा का उपयोग शुरू कर सकते हैं।",
    "auth.email": "ईमेल",
    "auth.password": "पासवर्ड",
    "auth.signIn": "दाखिल करना",
    "auth.signUp": "साइन अप करें",
    "auth.forgotPassword": "पासवर्ड भूल गए?",
    "auth.noAccount": "कोई खाता नहीं है? साइन अप करें",
    "auth.hasAccount": "क्या आपके पास पहले से एक खाता मौजूद है? दाखिल करना",
    "auth.secureAccess": "सुरक्षित पहुंच",
    "common.back": "पीछे",
    "common.backToHome": "घर वापिस जा रहा हूँ",
    "featuresPage.title": "सभी सुविधाएं",
    "featuresPage.subtitle": "एक्रोमेडा द्वारा प्रदान की जाने वाली हर चीज़ की संपूर्ण ए-जेड सूची - एआई-संचालित ओसीआर से लेकर गोपनीयता-प्रथम प्रसंस्करण तक। सटीकता, गति और स्पष्ट वित्तीय विश्लेषण के लिए निर्मित।",
    "featuresPage.categories.core": "कोर प्रौद्योगिकी",
    "featuresPage.categories.financial": "वित्तीय विश्लेषण",
    "featuresPage.categories.risk": "संकट विश्लेषण",
    "featuresPage.categories.assistant": "एआई सहायक",
    "featuresPage.categories.export": "निर्यात",
    "featuresPage.categories.performance": "प्रदर्शन",
    "featuresPage.categories.security": "सुरक्षा",
    "featuresPage.categories.privacy": "गोपनीयता",
    "featuresPage.categories.accessibility": "सरल उपयोग",
    "featuresPage.categories.technology": "तकनीकी",
    "featuresPage.categories.usage": "प्रयोग",
    "featuresPage.items.aiOcr.title": "एआई-संचालित ओसीआर इंजन",
    "featuresPage.items.aiOcr.desc": "पीडीएफ़, स्कैन और फ़ोटो से डेटा निकालता है। लेन-देन तालिकाओं, तिथियों, राशियों और विवरणों को उच्च सटीकता के साथ पहचानता है - यहां तक ​​कि निम्न-गुणवत्ता वाले दस्तावेज़ों से भी।",
    "featuresPage.items.excelCsv.title": "एक्सेल और सीएसवी निर्यात",
    "featuresPage.items.excelCsv.desc": "उचित कॉलम (दिनांक, विवरण, डेबिट, क्रेडिट, बैलेंस, श्रेणी) के साथ स्वच्छ एक्सेल (.xlsx) और सीएसवी निर्यात करें। लोकप्रिय लेखांकन उपकरणों के साथ काम करता है।",
    "featuresPage.items.pdfReport.title": "पीडीएफ रिपोर्ट जनरेशन",
    "featuresPage.items.pdfReport.desc": "सारांश, अंडरराइटिंग मेट्रिक्स और विस्तृत विवरण के साथ ब्रांडेड पीडीएफ रिपोर्ट बनाएं - ऑडिट और ऋण अनुप्रयोगों के लिए आदर्श।",
    "featuresPage.items.foir.title": "एफओआईआर गणना",
    "featuresPage.items.foir.desc": "वेतन क्रेडिट और ईएमआई डेबिट का पता लगाकर नियम-आधारित विश्लेषण का उपयोग करके स्वचालित रूप से एफओआईआर की गणना करता है - जिसका उपयोग ऋण पात्रता मूल्यांकन में किया जाता है।",
    "featuresPage.items.emiDetection.title": "ईएमआई का पता लगाना",
    "featuresPage.items.emiDetection.desc": "नियतात्मक पैटर्न (गृह/कार/व्यक्तिगत ऋण, क्रेडिट कार्ड ईएमआई, बीएनपीएल) के माध्यम से आवर्ती ईएमआई का पता लगाता है। कोई अनुमान नहीं - पूरी तरह से समझाने योग्य।",
    "featuresPage.items.salaryAnalysis.title": "वेतन क्रेडिट विश्लेषण",
    "featuresPage.items.salaryAnalysis.desc": "अंडरराइटिंग के लिए औसत मासिक आय का अनुमान लगाने के लिए आवर्ती पैटर्न और नियोक्ता कीवर्ड का उपयोग करके वेतन क्रेडिट ढूँढता है।",
    "featuresPage.items.cashflow.title": "नकदी प्रवाह विश्लेषण",
    "featuresPage.items.cashflow.desc": "श्रेणी सारांश और प्रवृत्ति अंतर्दृष्टि के साथ अंतर्वाह/बहिर्वाह और शुद्ध नकदी प्रवाह को तोड़ता है।",
    "featuresPage.items.adbAmb.title": "औसत दैनिक शेष",
    "featuresPage.items.adbAmb.desc": "न्यूनतम शेष राशि की जांच और ऋण मूल्यांकन के लिए बैंकों द्वारा उपयोग किए जाने वाले एडीबी/एएमबी मेट्रिक्स की गणना करता है।",
    "featuresPage.items.fraudDetection.title": "धोखाधड़ी का पता लगाना",
    "featuresPage.items.fraudDetection.desc": "राउंड-फिगर लेनदेन, सप्ताहांत विसंगतियों, डुप्लिकेट और बैलेंस बेमेल जैसे संदिग्ध पैटर्न को चिह्नित करता है।",
    "featuresPage.items.integrityScoring.title": "सत्यनिष्ठा स्कोरिंग",
    "featuresPage.items.integrityScoring.desc": "छेड़छाड़ और त्रुटियों का पता लगाने में मदद करने के लिए तिथियों और शेषों में विवरण की स्थिरता को मान्य करता है।",
    "featuresPage.items.underwritingPanel.title": "हामीदारी पैनल",
    "featuresPage.items.underwritingPanel.desc": "एक नज़र में सभी प्रमुख मेट्रिक्स: आय, ईएमआई, एफओआईआर, शेष रुझान, और जोखिम ध्वज - ऋण देने के निर्णयों के लिए बनाए गए।",
    "featuresPage.items.banks.title": "1000+ बैंकों का समर्थन",
    "featuresPage.items.banks.desc": "विभिन्न बैंक स्टेटमेंट लेआउट और फॉर्मेट्स के साथ काम करता है — प्रमुख भारतीय और अंतरराष्ट्रीय बैंकों सहित।",
    "featuresPage.items.instantProcessing.title": "त्वरित प्रसंस्करण",
    "featuresPage.items.instantProcessing.desc": "~30 सेकंड से कम समय में तेज़ रूपांतरण - समय-संवेदनशील लेखांकन और ऑडिट के लिए आदर्श।",
    "featuresPage.items.batchProcessing.title": "प्रचय संसाधन",
    "featuresPage.items.batchProcessing.desc": "एकाधिक कथनों को समानांतर में रूपांतरित करें - अकाउंटेंट और थोक वर्कफ़्लोज़ के लिए बढ़िया।",
    "featuresPage.items.chatAura.title": "चैट ऑरा एआई असिस्टेंट",
    "featuresPage.items.chatAura.desc": "?? ?????? ?? ????, Chat Aura ??????? ??? ?? ?????? ???? ???",
    "featuresPage.items.encryption.title": "पारगमन में एन्क्रिप्शन",
    "featuresPage.items.encryption.desc": "संवेदनशील वित्तीय डेटा की सुरक्षा के लिए अपलोड और ट्रांसफर के दौरान डेटा को एन्क्रिप्ट किया जाता है।",
    "featuresPage.items.zeroRetention.title": "नियंत्रित फ़ाइल एक्सेस",
    "featuresPage.items.zeroRetention.desc": "फ़ाइलें केवल सक्रिय सेशन के दौरान उपलब्ध रहती हैं।",
    "featuresPage.items.categorization.title": "स्मार्ट वर्गीकरण",
    "featuresPage.items.categorization.desc": "अनुकूलन योग्य मैपिंग के साथ स्वचालित रूप से लेनदेन को श्रेणियों (वेतन, ईएमआई, उपयोगिताएँ, खरीदारी, भोजन, आदि) में वर्गीकृत करता है।",
    "featuresPage.items.exportFormats.title": "एकाधिक निर्यात प्रारूप",
    "featuresPage.items.exportFormats.desc": "Excel, CSV, JSON और MT940 रिपोर्ट में निर्यात करें - लेखांकन और विश्लेषण के लिए अनुकूलित।",
    "featuresPage.items.ruleBased.title": "नियम-आधारित सटीकता",
    "featuresPage.items.ruleBased.desc": "नियतात्मक गणना: कोई मतिभ्रम नहीं, कोई अनुमान नहीं - प्रत्येक संख्या की सटीकता के साथ गणना की जाती है और उसे समझाया जा सकता है।",
    "featuresPage.items.dailyLimits.title": "दैनिक रीसेट सीमाएँ",
    "featuresPage.items.dailyLimits.desc": "निःशुल्क सीमाएं प्रतिदिन स्थानीय समयानुसार आधी रात को रीसेट की जाती हैं। अनाम उपयोगकर्ताओं को प्रतिदिन 2 पेज मिलते हैं; साइन-इन करने वाले उपयोगकर्ताओं को प्रतिदिन 5 पेज मिलते हैं। भुगतान योजनाएं उनके बिलिंग चक्र के साथ रीसेट हो जाती हैं।",
    "featuresPage.cta.title": "सभी सुविधाओं का अनुभव करने के लिए तैयार हैं?",
    "featuresPage.cta.desc": "प्रति दिन 2 निःशुल्क पृष्ठों से शुरुआत करें। प्रति दिन 5 पृष्ठों के लिए साइन अप करें और एक्रोमेडा की पूरी शक्ति को अनलॉक करें।",
    "featuresPage.cta.tryDemo": "अभी डेमो आज़माएं",
    "featuresPage.cta.signUp": "निशुल्क साइन अप करें",
    "featuresPage.footer": "© 2026 एक्रोमेडा | उत्कृष्टता के लिए इंजीनियर किया गया",
    "aboutPage.visionTitle": "दृष्टि",
    "aboutPage.visionSubtitle": "जहां परिशुद्धता साइबर सुरक्षा से मिलती है।",
    "aboutPage.visionP1": "एक्रोमेडा सिर्फ एक उपकरण नहीं है; यह वित्तीय डेटा अखंडता के लिए एक वैश्विक मानक है। ऐसे युग में जहां डेटा नई मुद्रा है, हमने एक ऐसा प्लेटफ़ॉर्म तैयार किया है जो न केवल फ़ाइलों को परिवर्तित करता है - यह आपके संपूर्ण वित्तीय वर्कफ़्लो को सुरक्षित करता है।",
    "aboutPage.brainchildPrefix": "के दिमाग की उपज",
    "aboutPage.brainchildP1": "कोटा, राजस्थान स्थित हार्वर्ड विश्वविद्यालय के एक समर्पित साइबर सुरक्षा विशेषज्ञ द्वारा तैयार किया गया। महज 18 साल की उम्र में, फैजान ने वैश्विक स्तर पर संवेदनशील वित्तीय दस्तावेजों को संभालने के तरीके में एक गंभीर कमजोरी की पहचान की।",
    "aboutPage.brainchildP2": "निर्बाध एआई ऑटोमेशन के साथ उन्नत एन्क्रिप्शन को जोड़कर, अक्रोमेडा ने 2026 में व्यवसायों को त्वरित, उच्च-अखंडता वाले बैंक स्टेटमेंट रूपांतरणों के साथ सशक्त बनाने के लिए लॉन्च किया - आपके डेटा को निजी रखने के साथ-साथ यह शक्तिशाली भी है।",
    "aboutPage.valueProps.cyberSafe.title": "साइबर-सुरक्षित",
    "aboutPage.valueProps.cyberSafe.desc": "संवेदनशील वित्तीय कार्यप्रवाह के लिए सुरक्षा-प्रथम सिद्धांतों के साथ निर्मित।",
    "aboutPage.valueProps.instantFlux.title": "त्वरित प्रवाह",
    "aboutPage.valueProps.instantFlux.desc": "जटिल डेटा को तेजी से परिवर्तित करें - बिना मैन्युअल प्रविष्टि के।",
    "aboutPage.valueProps.accuracy.title": "उच्च सटीकता",
    "aboutPage.valueProps.accuracy.desc": "उच्च जोखिम वाले वित्तीय डेटा के लिए डिज़ाइन किया गया सटीकता-केंद्रित रूपांतरण।",
    "aboutPage.connectTitle": "निर्माता से जुड़ें",
    "aboutPage.contact.hotline": "हॉटलाइन",
    "aboutPage.contact.mail": "सीधा डाक",
    "aboutPage.contact.social": "सामाजिक",
    "aboutPage.contact.hq": "मुख्यालय",
    "aboutPage.contact.hqValue": "कोटा, राजस्थान 324004",
    "aboutPage.footer": "© 2026 एक्रोमेडा | उत्कृष्टता के लिए इंजीनियर किया गया",
    "privacyPage.badge": "गोपनीयता और पारदर्शिता",
    "privacyPage.title": "गोपनीयता नीति",
    "privacyPage.subtitle": "हम केवल वही एकत्र करते हैं जो हमें सेवा चलाने और सुरक्षित करने के लिए आवश्यक है।",
    "privacyPage.lastUpdated": "अंतिम अद्यतन: 7 फरवरी, 2026",
    "privacyPage.sections.zeroRetention.title": "सेशन-आधारित एक्सेस",
    "privacyPage.sections.zeroRetention.desc": "अपलोड की गई फ़ाइलें और परिणाम सक्रिय सेशन के दौरान उपलब्ध रहते हैं। सेशन समाप्त होने से पहले डाउनलोड करें।",
    "privacyPage.sections.encryption.title": "पारगमन में एन्क्रिप्शन",
    "privacyPage.sections.encryption.desc": "अपलोड और ट्रांसफर के दौरान डेटा एन्क्रिप्ट किया जाता है। हम प्रतिष्ठित प्रदाताओं और उद्योग मानक सुरक्षा नियंत्रणों का उपयोग करते हैं।",
    "privacyPage.sections.noTracking.title": "कोई विज्ञापन ट्रैकिंग नहीं",
    "privacyPage.sections.noTracking.desc": "हम आपका डेटा नहीं बेचते हैं या विज्ञापन ट्रैकर नहीं चलाते हैं। हम रीकैप्चा जैसे दुरुपयोग रोधी टूल का उपयोग कर सकते हैं जो डिवाइस सिग्नल एकत्र कर सकता है और कुकीज़ सेट कर सकता है।",
    "privacyPage.sections.aiPowered.title": "स्वचालित प्रसंस्करण",
    "privacyPage.sections.aiPowered.desc": "प्रसंस्करण मुख्य रूप से स्वचालित है. समर्थन या कानूनी कारणों से डेटा तक पहुंच अधिकृत कर्मचारियों तक ही सीमित है।",
    "privacyPage.sections.compliance.title": "गोपनीयता का ध्यान रखें",
    "privacyPage.sections.compliance.desc": "हमारा लक्ष्य गोपनीयता सिद्धांतों का पालन करना और डेटा का उपयोग कैसे किया जाए, इसके बारे में पारदर्शी होना है।",
    "privacyPage.aboutTitle": "एक्रोमेडा के बारे में",
    "privacyPage.aboutP1": "अक्रोमेडा एक स्मार्ट, तेज़ और सुरक्षित टूल है जो बैंक स्टेटमेंट को पीडीएफ से एक्सेल में सटीकता और आसानी से परिवर्तित करने के लिए बनाया गया है।",
    "privacyPage.aboutP2Prefix": "यह प्लेटफार्म किसके द्वारा बनाया गया था?",
    "privacyPage.aboutP2Suffix": ", कोटा, राजस्थान, भारत में स्थित हार्वर्ड विश्वविद्यालय का एक साइबर सुरक्षा छात्र। 2026 में, 18 साल की उम्र में, फैज़ान ने व्यक्तियों और व्यवसायों को वित्तीय डेटा के साथ समय और प्रयास बचाने में मदद करने के लिए एक्रोमेडा लॉन्च किया।",
    "privacyPage.whatTitle": "एक्रोमेडा क्या करता है",
    "privacyPage.whatItems.item1": "जटिल बैंक स्टेटमेंट पीडीएफ को साफ, संपादन योग्य एक्सेल शीट में परिवर्तित करता है",
    "privacyPage.whatItems.item2": "फ़ॉर्मेटिंग, कॉलम और लेन-देन की स्पष्टता बनाए रखता है",
    "privacyPage.whatItems.item3": "तुरंत काम करता है - किसी सॉफ़्टवेयर इंस्टॉलेशन की आवश्यकता नहीं है",
    "privacyPage.whatItems.item4": "डेटा गोपनीयता और सुरक्षा को मूल रूप से ध्यान में रखकर डिज़ाइन किया गया है",
    "privacyPage.contactTitle": "प्रश्न?",
    "privacyPage.contactDescPrefix": "गोपनीयता संबंधी प्रश्नों के लिए, सहायता से संपर्क करें।",
    "privacyPage.footer": "(सी) 2026 एक्रोमेडा। सर्वाधिकार सुरक्षित।",
    "settings.title": "सेटिंग्स",
    "settings.subtitle": "अपना खाता, प्राथमिकताएँ और गोपनीयता सेटिंग्स प्रबंधित करें",
    "settings.searchPlaceholder": "सेटिंग खोजें...",
    "settings.backToHome": "घर वापिस जा रहा हूँ",
    "settings.verified": "सत्यापित",
    "settings.noResults": "आपकी खोज से मेल खाती कोई सेटिंग नहीं मिली.",
    "settings.categories.all": "सभी",
    "settings.categories.profile": "प्रोफ़ाइल",
    "settings.categories.usage": "प्रयोग",
    "settings.categories.notifications": "सूचनाएं",
    "settings.categories.appearance": "उपस्थिति",
    "settings.categories.privacy": "गोपनीयता",
    "settings.categories.advanced": "विकसित",
    "settings.profile.email": "मेल पता",
    "settings.profile.emailDesc": "आपका खाता ईमेल पता",
    "settings.profile.name": "प्रदर्शित होने वाला नाम",
    "settings.profile.nameDesc": "आपका सार्वजनिक प्रदर्शन नाम",
    "settings.profile.namePlaceholder": "अपना नाम दर्ज करें",
    "settings.profile.password": "पासवर्ड",
    "settings.profile.passwordDesc": "अपना खाता पासवर्ड बदलें",
    "settings.profile.changePassword": "पासवर्ड बदलें",
    "settings.usage.stats": "उपयोग सांख्यिकी",
    "settings.usage.statsDesc": "आपके पेज का उपयोग",
    "settings.usage.conversionsToday": "उपयोग किए गए पृष्ठ",
    "settings.usage.remaining": "शेष",
    "settings.usage.subscription": "सदस्यता योजना",
    "settings.usage.subscriptionDesc": "आपका वर्तमान सदस्यता स्तर",
    "settings.usage.freeTier": "फ्री टियर",
    "settings.usage.anonymous": "गुमनाम",
    "settings.usage.upgrade": "उन्नत करना",
    "settings.notifications.email": "ईमेल सूचनाएं",
    "settings.notifications.emailDesc": "ईमेल के माध्यम से अपडेट प्राप्त करें",
    "settings.notifications.push": "सूचनाएं धक्का",
    "settings.notifications.pushDesc": "ब्राउज़र पुश सूचनाएँ",
    "settings.notifications.sound": "ध्वनि प्रभाव",
    "settings.notifications.soundDesc": "सूचनाओं के लिए ध्वनियाँ बजाएँ",
    "settings.appearance.theme": "विषय",
    "settings.appearance.themeDesc": "प्रकाश और अंधेरे मोड के बीच टॉगल करें",
    "settings.appearance.language": "भाषा",
    "settings.appearance.languageDesc": "अपनी पसंदीदा भाषा चुनें",
    "settings.privacy.visibility": "प्रोफ़ाइल दृश्यता",
    "settings.privacy.visibilityDesc": "नियंत्रित करें कि आपकी प्रोफ़ाइल कौन देख सकता है",
    "settings.privacy.manage": "प्रबंधित करना",
    "settings.privacy.data": "डेटा निर्यात करें",
    "settings.privacy.dataDesc": "अपने डेटा की एक प्रति डाउनलोड करें",
    "settings.privacy.download": "डाउनलोड करना",
    "settings.privacy.delete": "खाता हटा दो",
    "settings.privacy.deleteDesc": "अपना खाता और डेटा स्थायी रूप से हटाएं",
    "settings.privacy.deleteAccount": "खाता हटा दो",
    "settings.advanced.autoDownload": "स्वत: डाउनलोड",
    "settings.advanced.autoDownloadDesc": "परिवर्तित फ़ाइलें स्वचालित रूप से डाउनलोड करें",
    "chatAura.greeting": "नमस्ते! मैं चैट ऑरा, आपका वित्तीय सहायक हूं। आज मैं आपकी मदद करने में कैसे सक्षम हूं?",
    "chatAura.greetingWithPdf": "नमस्ते! मैंने आपका दस्तावेज़ लोड कर दिया है ({fileName})। इसके बारे में मुझसे कुछ भी पूछें!",
    "chatAura.subtitle": "आपका एआई वित्तीय सहायक",
    "chatAura.remaining": "चैट बाकी हैं",
    "chatAura.placeholder": "अपने बयान के बारे में पूछें...",
    "chatAura.errorResponse": "मुझे खेद है, मुझे एक त्रुटि का सामना करना पड़ा। कृपया पुन: प्रयास करें।",
    "chatAura.limitReached": "चैट की सीमा पूरी हो गई",
    "chatAura.signUpForMore": "असीमित बातचीत के लिए साइन अप करें",
    "chatAura.signUp": "साइन अप करें",
    "footer.helpCenter": "सहायता केंद्र",
    "footer.blog": "ब्लॉग",
    "footer.refunds": "भुगतान वापसी की नीति",
    "helpPage.title": "सहायता केंद्र",
    "helpPage.subtitle": "अपलोड से लेकर निर्यात तक, हर चरण के लिए A से Z सहायता।",
    "helpPage.sections.files.title": "समर्थित फ़ाइलें",
    "helpPage.sections.password.title": "पासवर्ड से सुरक्षित पीडीएफ़",
    "helpPage.sections.limits.title": "दैनिक सीमाएँ",
    "helpPage.sections.accuracy.title": "सटीकता युक्तियाँ",
    "helpPage.sections.refunds.title": "रिफंड",
    "helpPage.sections.refunds.desc": "14-दिन का फुल रिफंड। अपने ऑर्डर आईडी के साथ सपोर्ट से संपर्क करें।",
    "helpPage.sections.contact.title": "समर्थन से संपर्क करें",
    "helpPage.sections.contact.desc": "मदद की ज़रूरत है? सहायता से संपर्क करें और यदि उपलब्ध हो तो अपना ऑर्डर आईडी साझा करें।",
    "helpPage.cta.contact": "समर्थन से संपर्क करें",
    "featuresPage.items.helpCenter.title": "सहायता केंद्र",
    "featuresPage.items.helpCenter.desc": "सुचारू रूपांतरणों के लिए प्रारूपों, सीमाओं और समस्या निवारण पर चरण-दर-चरण मार्गदर्शन।",
    "featuresPage.items.refunds.title": "भुगतान वापसी की नीति",
    "featuresPage.items.refunds.desc": "पात्र योजनाओं के लिए 14 दिनों के भीतर धनवापसी। विवरण के लिए मूल्य निर्धारण देखें.",
    "language": "अंग्रेज़ी"
  }
};



export const languageNames: Record<Language, string> = {
  "en": "English",
  "ar": "العربية",
  "zh": "中文",
  "es": "Español",
  "hi": "हिन्दी"
};










