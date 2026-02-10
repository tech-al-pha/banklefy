import React, { createContext, useContext, useState, useEffect } from 'react'; // Akromeda Language System

export type Language = 'en' | 'zh' | 'ja' | 'es' | 'it' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.features': 'Features',
    'nav.demo': 'Demo',
    'nav.chatAura': 'Chat Aura',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.about': 'About',
    'nav.signIn': 'Sign In',
    'nav.signOut': 'Sign Out',
    'nav.getStarted': 'Get Started',
    'nav.pricing': 'Pricing',
    'nav.benefits': 'Benefits',
    'nav.menu': 'Menu',
    
    // Hero
    'hero.title': 'AI Bank Statement Converter',
    'hero.titleLine1': 'Bank Statement',
    'hero.titleLine2': 'Converter',
    'hero.tagline': 'professional look | OCR-Powered | Instant Results',
    'hero.subtitle': 'Convert bank statements to Excel with AI-powered OCR technology. High-accuracy data extraction with bank-level security.',
    'hero.uploadBtn': 'Upload Your Statement Now',
    'hero.pricingBtn': 'View Pricing',
    'hero.sampleReportBtn': 'Sample Report',
    
    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.subtitle': 'Transform your bank statements into Excel in three simple steps',
    'howItWorks.step1.title': 'Upload',
    'howItWorks.step1.desc': 'Upload your bank statement in any format - PDF, scanned image, or photo. We support documents from any bank worldwide.',
    'howItWorks.step2.title': 'AI Processing',
    'howItWorks.step2.desc': 'Our AI-powered OCR instantly extracts and organizes transaction data with high accuracy. Supports 50+ languages including Hindi, Arabic, and Mandarin.',
    'howItWorks.step3.title': 'Download Excel',
    'howItWorks.step3.desc': 'Receive a clean, structured Excel spreadsheet ready for accounting, analysis, or integration with your financial tools.',
    
    // Features
    'features.title': 'Features',
    'features.accuracy': 'High Accuracy',
    'features.accuracyDesc': 'AI-powered extraction is designed to reduce errors.',
    'features.fast': 'Lightning Fast',
    'features.fastDesc': 'Convert statements in seconds',
    'features.secure': 'Bank-Grade Security',
    'features.secureDesc': 'Your data is encrypted and protected',
    
    // Pricing
    'pricing.title': 'Pricing',
    'pricing.free': 'Free',
    'pricing.daily': 'Daily',
    'pricing.business': 'Business',
    
    // Footer
    'footer.product': 'Product',
    'footer.features': 'Features',
    'footer.pricing': 'Pricing',
    'footer.howItWorks': 'How It Works',
    'footer.company': 'Company',
    'footer.about': 'About',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms & Conditions',
    'footer.cta.title': 'Ready to Transform Your',
    'footer.cta.subtitle': 'Financial Workflow?',
    'footer.cta.desc': 'Join thousands of businesses and individuals who trust Akromeda for accurate, instant bank statement conversions.',
    'footer.cta.btn': 'Start Converting Now',
    'footer.copyright': '© 2026 Akromeda. Created by Faizan Rizvi.',
    'footer.recaptcha.prefix': 'This site is protected by reCAPTCHA and the Google',
    'footer.recaptcha.privacy': 'Privacy Policy',
    'footer.recaptcha.and': 'and',
    'footer.recaptcha.terms': 'Terms of Service',
    'footer.recaptcha.suffix': 'apply.',
    
    // Auth
    'auth.welcome': 'Welcome back!',
    'auth.signedIn': 'You have successfully signed in.',
    'auth.accountCreated': 'Account created!',
    'auth.canUse': 'You can now start using Akromeda.',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': "Don't have an account? Sign up",
    'auth.hasAccount': 'Already have an account? Sign in',

    // Common
    'common.backToHome': 'Back to Home',

    // Features Directory Page
    'featuresPage.title': 'ALL FEATURES',
    'featuresPage.subtitle':
      'Complete A–Z list of everything Akromeda offers — from AI-powered OCR to bank-grade security. Built for accuracy, speed, and enterprise-grade financial analysis.',
    'featuresPage.categories.core': 'Core Technology',
    'featuresPage.categories.financial': 'Financial Analysis',
    'featuresPage.categories.risk': 'Risk Analysis',
    'featuresPage.categories.assistant': 'AI Assistant',
    'featuresPage.categories.export': 'Export',
    'featuresPage.categories.performance': 'Performance',
    'featuresPage.categories.security': 'Security',
    'featuresPage.categories.privacy': 'Privacy',
    'featuresPage.categories.accessibility': 'Accessibility',
    'featuresPage.categories.technology': 'Technology',
    'featuresPage.categories.usage': 'Usage',

    'featuresPage.items.aiOcr.title': 'AI-POWERED OCR ENGINE',
    'featuresPage.items.aiOcr.desc':
      'Extracts data from PDFs, scans, and photos. Recognizes transaction tables, dates, amounts, and descriptions with high accuracy — even from low-quality documents.',
    'featuresPage.items.excelCsv.title': 'EXCEL & CSV EXPORT',
    'featuresPage.items.excelCsv.desc':
      'Export clean Excel (.xlsx) and CSV with proper columns (Date, Description, Debit, Credit, Balance, Category). Works with popular accounting tools.',
    'featuresPage.items.pdfReport.title': 'PDF REPORT GENERATION',
    'featuresPage.items.pdfReport.desc':
      'Create branded PDF reports with summaries, underwriting metrics, and detailed breakdowns — ideal for audits and loan applications.',

    'featuresPage.items.foir.title': 'FOIR CALCULATION',
    'featuresPage.items.foir.desc':
      'Automatically calculates FOIR using rule-based analysis by detecting salary credits and EMI debits — used in loan eligibility assessment.',
    'featuresPage.items.emiDetection.title': 'EMI DETECTION',
    'featuresPage.items.emiDetection.desc':
      'Detects recurring EMIs via deterministic patterns (home/car/personal loans, credit card EMIs, BNPL). No guessing — fully explainable.',
    'featuresPage.items.salaryAnalysis.title': 'SALARY CREDIT ANALYSIS',
    'featuresPage.items.salaryAnalysis.desc':
      'Finds salary credits using recurring patterns and employer keywords to estimate average monthly income for underwriting.',
    'featuresPage.items.cashflow.title': 'CASHFLOW ANALYSIS',
    'featuresPage.items.cashflow.desc':
      'Breaks down inflows/outflows and net cashflow with category summaries and trend insights.',
    'featuresPage.items.adbAmb.title': 'AVERAGE DAILY BALANCE',
    'featuresPage.items.adbAmb.desc':
      'Computes ADB/AMB metrics used by banks for minimum balance checks and lending assessments.',

    'featuresPage.items.fraudDetection.title': 'FRAUD DETECTION',
    'featuresPage.items.fraudDetection.desc':
      'Flags suspicious patterns like round-figure transactions, weekend anomalies, duplicates, and balance mismatches.',
    'featuresPage.items.integrityScoring.title': 'INTEGRITY SCORING',
    'featuresPage.items.integrityScoring.desc':
      'Validates statement consistency across dates and balances to help detect tampering and errors.',
    'featuresPage.items.underwritingPanel.title': 'UNDERWRITING PANEL',
    'featuresPage.items.underwritingPanel.desc':
      'All key metrics at a glance: income, EMI, FOIR, balance trends, and risk flags — built for lending decisions.',

    'featuresPage.items.languages.title': '50+ LANGUAGE SUPPORT',
    'featuresPage.items.languages.desc':
      'Process statements in 50+ languages. Handles multilingual documents and international bank formats.',
    'featuresPage.items.instantProcessing.title': 'INSTANT PROCESSING',
    'featuresPage.items.instantProcessing.desc':
      'Fast conversions in under ~30 seconds — ideal for time-sensitive accounting and audits.',
    'featuresPage.items.batchProcessing.title': 'BATCH PROCESSING',
    'featuresPage.items.batchProcessing.desc':
      'Convert multiple statements in parallel — great for accountants and bulk workflows.',
    'featuresPage.items.chatAura.title': 'CHAT AURA AI ASSISTANT',
    'featuresPage.items.chatAura.desc':
      'Ask questions about your statement and get insights on transactions, cash flow, and spending patterns.',

    'featuresPage.items.encryption.title': 'BANK-GRADE ENCRYPTION',
    'featuresPage.items.encryption.desc':
      'Strong encryption during upload, processing, and download to protect sensitive financial data.',
    'featuresPage.items.zeroRetention.title': 'ZERO DATA RETENTION',
    'featuresPage.items.zeroRetention.desc':
      'Files are not retained after processing. You keep full control of your data.',

    'featuresPage.items.categorization.title': 'SMART CATEGORIZATION',
    'featuresPage.items.categorization.desc':
      'Automatically classifies transactions into categories (Salary, EMI, Utilities, Shopping, Food, etc.) with customizable mapping.',
    'featuresPage.items.exportFormats.title': 'MULTIPLE EXPORT FORMATS',
    'featuresPage.items.exportFormats.desc':
      'Export to Excel, CSV, DOCX, and ODS reports — optimized for accounting and analysis.',
    'featuresPage.items.ruleBased.title': 'RULE-BASED ACCURACY',
    'featuresPage.items.ruleBased.desc':
      'Deterministic calculations: no hallucinations, no guessing — every number is computed with precision and can be explained.',
    'featuresPage.items.dailyLimits.title': 'DAILY RESET LIMITS',
    'featuresPage.items.dailyLimits.desc':
      'Limits reset daily at midnight local time. Anonymous users get 2/day; registered users get 5/day.',

    'featuresPage.cta.title': 'Ready to Experience All Features?',
    'featuresPage.cta.desc':
      'Start converting now with 2 free conversions daily. Sign up for 5 daily conversions and unlock the full power of Akromeda.',
    'featuresPage.cta.tryDemo': 'Try Demo Now',
    'featuresPage.cta.signUp': 'Sign Up Free',
    'featuresPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // About Page
    'aboutPage.visionTitle': 'The Vision',
    'aboutPage.visionSubtitle': 'Where Precision Meets Cybersecurity.',
    'aboutPage.visionP1':
      "Akromeda isn't just a tool; it's a global standard for financial data integrity. In an era where data is the new currency, we've engineered a platform that doesn't just convert files — it secures your entire financial workflow.",
    'aboutPage.brainchildPrefix': 'The Brainchild of',
    'aboutPage.brainchildP1':
      'Architected by a dedicated cybersecurity specialist from Harvard University, based in Kota, Rajasthan. At just 18 years old, Faizan identified a critical vulnerability in how sensitive financial documents were handled globally.',
    'aboutPage.brainchildP2':
      'By fusing advanced encryption with seamless AI automation, Akromeda launched in 2026 to empower businesses with instant, high-integrity bank statement conversions — keeping your data as private as it is powerful.',
    'aboutPage.valueProps.cyberSafe.title': 'Cyber-Safe',
    'aboutPage.valueProps.cyberSafe.desc': 'Built with security-first principles for sensitive financial workflows.',
    'aboutPage.valueProps.instantFlux.title': 'Instant Flux',
    'aboutPage.valueProps.instantFlux.desc': 'Convert complex data fast — without manual entry.',
    'aboutPage.valueProps.accuracy.title': 'High Accuracy',
    'aboutPage.valueProps.accuracy.desc': 'Accuracy-focused conversion designed for high-stakes financial data.',
    'aboutPage.connectTitle': 'Connect with the Creator',
    'aboutPage.contact.hotline': 'Hotline',
    'aboutPage.contact.mail': 'Direct Mail',
    'aboutPage.contact.social': 'Social',
    'aboutPage.contact.hq': 'HQ',
    'aboutPage.contact.hqValue': 'Prem Nagar 1st, Kota, Rajasthan 324004',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'Privacy and Transparency',
    'privacyPage.title': 'Privacy Policy',
    'privacyPage.subtitle': 'We collect only what we need to run and secure the service.',
    'privacyPage.lastUpdated': 'Last updated: February 7, 2026',
    'privacyPage.sections.zeroRetention.title': '24-Hour Retention',
    'privacyPage.sections.zeroRetention.desc': 'Uploaded files and generated results are stored for up to 24 hours to let you download them. You must download your files yourself; we do not download, retrieve, or manually delete files on your behalf. After 24 hours, files and results are permanently deleted and cannot be recovered.',
    'privacyPage.sections.encryption.title': 'Encryption in Transit',
    'privacyPage.sections.encryption.desc': 'Data is encrypted during upload and transfer. We use reputable providers and industry standard security controls.',
    'privacyPage.sections.noTracking.title': 'No Ad Tracking',
    'privacyPage.sections.noTracking.desc': 'We do not sell your data or run advertising trackers. We may use anti abuse tools like reCAPTCHA which can collect device signals and set cookies.',
    'privacyPage.sections.aiPowered.title': 'Automated Processing',
    'privacyPage.sections.aiPowered.desc': 'Processing is primarily automated. Access to data is limited to authorized staff for support or legal reasons.',
    'privacyPage.sections.compliance.title': 'Privacy Minded',
    'privacyPage.sections.compliance.desc': 'We aim to follow privacy principles and be transparent about how data is used.',
    'privacyPage.aboutTitle': 'About Akromeda',
    'privacyPage.aboutP1':
      'Akromeda is a smart, fast, and secure tool built to convert bank statements from PDF to Excel with precision and ease.',
    'privacyPage.aboutP2Prefix': 'This platform was created by',
    'privacyPage.aboutP2Suffix':
      ', a cybersecurity student from Harvard University, based in Kota, Rajasthan, India. In 2026, at the age of 18, Faizan launched Akromeda to help individuals and businesses save time and effort with financial data.',
    'privacyPage.whatTitle': 'What Akromeda Does',
    'privacyPage.whatItems.item1': 'Converts complex bank statement PDFs into clean, editable Excel sheets',
    'privacyPage.whatItems.item2': 'Maintains formatting, columns, and transaction clarity',
    'privacyPage.whatItems.item3': 'Works instantly — no software installation required',
    'privacyPage.whatItems.item4': 'Designed with data privacy and security at its core',
    'privacyPage.contactTitle': 'Questions?',
    'privacyPage.contactDescPrefix': 'For privacy questions, contact',
    'privacyPage.footer': '(c) 2026 Akromeda. All rights reserved.',

    // Settings Page
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account, preferences, and privacy settings',
    'settings.searchPlaceholder': 'Search settings...',
    'settings.backToHome': 'Back to Home',
    'settings.verified': 'Verified',
    'settings.noResults': 'No settings found matching your search.',
    'settings.categories.all': 'All',
    'settings.categories.profile': 'Profile',
    'settings.categories.usage': 'Usage',
    'settings.categories.notifications': 'Notifications',
    'settings.categories.appearance': 'Appearance',
    'settings.categories.privacy': 'Privacy',
    'settings.categories.advanced': 'Advanced',
    'settings.profile.email': 'Email Address',
    'settings.profile.emailDesc': 'Your account email address',
    'settings.profile.name': 'Display Name',
    'settings.profile.nameDesc': 'Your public display name',
    'settings.profile.namePlaceholder': 'Enter your name',
    'settings.profile.password': 'Password',
    'settings.profile.passwordDesc': 'Change your account password',
    'settings.profile.changePassword': 'Change Password',
    'settings.usage.stats': 'Conversion Statistics',
    'settings.usage.statsDesc': 'Your daily conversion usage',
    'settings.usage.conversionsToday': 'conversions today',
    'settings.usage.remaining': 'remaining',
    'settings.usage.subscription': 'Subscription Plan',
    'settings.usage.subscriptionDesc': 'Your current subscription tier',
    'settings.usage.freeTier': 'Free Tier',
    'settings.usage.anonymous': 'Anonymous',
    'settings.usage.upgrade': 'Upgrade',
    'settings.notifications.email': 'Email Notifications',
    'settings.notifications.emailDesc': 'Receive updates via email',
    'settings.notifications.push': 'Push Notifications',
    'settings.notifications.pushDesc': 'Browser push notifications',
    'settings.notifications.sound': 'Sound Effects',
    'settings.notifications.soundDesc': 'Play sounds for notifications',
    'settings.appearance.theme': 'Theme',
    'settings.appearance.themeDesc': 'Toggle between light and dark mode',
    'settings.appearance.language': 'Language',
    'settings.appearance.languageDesc': 'Choose your preferred language',
    'settings.privacy.visibility': 'Profile Visibility',
    'settings.privacy.visibilityDesc': 'Control who can see your profile',
    'settings.privacy.manage': 'Manage',
    'settings.privacy.data': 'Export Data',
    'settings.privacy.dataDesc': 'Download a copy of your data',
    'settings.privacy.download': 'Download',
    'settings.privacy.delete': 'Delete Account',
    'settings.privacy.deleteDesc': 'Permanently delete your account and data',
    'settings.privacy.deleteAccount': 'Delete Account',
    'settings.advanced.autoDownload': 'Auto-Download',
    'settings.advanced.autoDownloadDesc': 'Automatically download converted files',

    // Chat Aura
    'chatAura.greeting': "Hello! I'm Chat Aura, your financial assistant. How can I help you today?",
    'chatAura.greetingWithPdf': "Hello! I've loaded your document ({fileName}). Ask me anything about it!",
    'chatAura.subtitle': 'Your AI Financial Assistant',
    'chatAura.remaining': 'chats left',
    'chatAura.placeholder': 'Ask about your statement...',
    'chatAura.errorResponse': "I'm sorry, I encountered an error. Please try again.",
    'chatAura.limitReached': 'Chat limit reached',
    'chatAura.signUpForMore': 'Sign up for unlimited conversations',
    'chatAura.signUp': 'Sign Up',
    
    // Language
    'language': 'English',
  },
  zh: {
    // Navigation
    'nav.features': '功能',
    'nav.demo': '演示',
    'nav.chatAura': 'Chat Aura',
    'nav.settings': '设置',
    'nav.admin': '管理员',
    'nav.about': '关于',
    'nav.signIn': '登录',
    'nav.signOut': '登出',
    'nav.getStarted': '开始使用',
    'nav.pricing': '定价',
    'nav.benefits': '优势',
    'nav.menu': '菜单',
    
    // Hero
    'hero.title': 'AI银行对账单转换器',
    'hero.titleLine1': '银行对账单',
    'hero.titleLine2': '转换器',
    'hero.tagline': '专业外观 | OCR驱动 | 即时结果',
    'hero.subtitle': '使用AI驱动的精度，即时将您的银行对账单转换为有组织的Excel文件。',
    'hero.uploadBtn': '立即上传您的对账单',
    'hero.pricingBtn': '查看价格',
    'hero.sampleReportBtn': '示例报告',
    
    // How It Works
    'howItWorks.title': '使用方法',
    'howItWorks.subtitle': '三步将银行对账单转换为Excel',
    'howItWorks.step1.title': '上传',
    'howItWorks.step1.desc': '上传您的PDF或图片银行对账单',
    'howItWorks.step2.title': '处理',
    'howItWorks.step2.desc': 'AI提取并分类交易',
    'howItWorks.step3.title': '下载',
    'howItWorks.step3.desc': '立即获取有组织的Excel文件',
    
    // Features
    'features.title': '功能特点',
    'features.accuracy': 'High Accuracy',
    'features.accuracyDesc': 'AI-powered extraction is designed to reduce errors.',
    'features.fast': '闪电般快速',
    'features.fastDesc': '几秒钟内转换对账单',
    'features.secure': '银行级安全',
    'features.secureDesc': '您的数据已加密并受保护',
    
    // Pricing
    'pricing.title': '价格',
    'pricing.free': '免费',
    'pricing.daily': '每日',
    'pricing.business': '企业',
    
    // Footer
    'footer.product': '产品',
    'footer.features': '功能',
    'footer.pricing': '价格',
    'footer.howItWorks': '使用方法',
    'footer.company': '公司',
    'footer.about': '关于',
    'footer.privacy': '隐私政策',
    'footer.terms': '条款和条件',
    'footer.cta.title': '准备好改变您的',
    'footer.cta.subtitle': '财务工作流程？',
    'footer.cta.desc': '加入数千家信任Akromeda进行准确、即时银行对账单转换的企业和个人。',
    'footer.cta.btn': '立即开始转换',
    'footer.copyright': '© 2026 Akromeda。由Faizan Rizvi创建。',
    'footer.recaptcha.prefix': '本网站受 reCAPTCHA 保护，并受 Google 的',
    'footer.recaptcha.privacy': '隐私政策',
    'footer.recaptcha.and': '和',
    'footer.recaptcha.terms': '服务条款',
    'footer.recaptcha.suffix': '约束。',
    
    // Auth
    'auth.welcome': '欢迎回来！',
    'auth.signedIn': '您已成功登录。',
    'auth.accountCreated': '账户已创建！',
    'auth.canUse': '您现在可以开始使用Akromeda了。',
    'auth.email': '电子邮件',
    'auth.password': '密码',
    'auth.signIn': '登录',
    'auth.signUp': '注册',
    'auth.forgotPassword': '忘记密码？',
    'auth.noAccount': '没有账户？注册',
    'auth.hasAccount': '已有账户？登录',

    // Common
    'common.backToHome': '返回首页',

    // Features Directory Page
    'featuresPage.title': '全部功能',
    'featuresPage.subtitle':
      'Akromeda 提供从 AI OCR 到银行级安全的完整功能清单，专为准确性、速度与企业级金融分析而打造。',
    'featuresPage.categories.core': '核心技术',
    'featuresPage.categories.financial': '财务分析',
    'featuresPage.categories.risk': '风险分析',
    'featuresPage.categories.assistant': 'AI 助手',
    'featuresPage.categories.export': '导出',
    'featuresPage.categories.performance': '性能',
    'featuresPage.categories.security': '安全',
    'featuresPage.categories.privacy': '隐私',
    'featuresPage.categories.accessibility': '无障碍',
    'featuresPage.categories.technology': '技术',
    'featuresPage.categories.usage': '使用限制',

    'featuresPage.items.aiOcr.title': 'AI OCR 引擎',
    'featuresPage.items.aiOcr.desc':
      '支持 PDF、扫描件与照片，自动识别交易表格、日期、金额与描述，即使低质量文件也能保持高准确度。',
    'featuresPage.items.excelCsv.title': 'Excel 与 CSV 导出',
    'featuresPage.items.excelCsv.desc':
      '导出干净的 Excel (.xlsx) 与 CSV，包含日期、描述、借方、贷方、余额、分类等标准列，可用于常见财务软件。',
    'featuresPage.items.pdfReport.title': 'PDF 报告生成',
    'featuresPage.items.pdfReport.desc':
      '生成带品牌的 PDF 报告，包含摘要、风控指标与明细，适合审计与贷款申请。',

    'featuresPage.items.foir.title': 'FOIR 计算',
    'featuresPage.items.foir.desc':
      '通过规则识别工资入账与 EMI 扣款，自动计算 FOIR（银行常用贷款指标）。',
    'featuresPage.items.emiDetection.title': 'EMI 识别',
    'featuresPage.items.emiDetection.desc':
      '使用确定性规则识别各类分期/贷款扣款（房贷、车贷、信用卡等），可解释、无猜测。',
    'featuresPage.items.salaryAnalysis.title': '工资入账分析',
    'featuresPage.items.salaryAnalysis.desc':
      '基于规律与关键词识别工资入账，估算平均月收入用于风控与授信。',
    'featuresPage.items.cashflow.title': '现金流分析',
    'featuresPage.items.cashflow.desc':
      '统计总流入、总流出与净现金流，并提供分类汇总与趋势洞察。',
    'featuresPage.items.adbAmb.title': '平均日余额',
    'featuresPage.items.adbAmb.desc':
      '计算 ADB/AMB 等银行常用指标，用于最低余额与授信评估。',

    'featuresPage.items.fraudDetection.title': '欺诈检测',
    'featuresPage.items.fraudDetection.desc':
      '标记可疑模式：整数金额、周末异常、重复交易、余额不一致等。',
    'featuresPage.items.integrityScoring.title': '完整性评分',
    'featuresPage.items.integrityScoring.desc':
      '检查日期与余额连续性，辅助发现篡改与错误。',
    'featuresPage.items.underwritingPanel.title': '授信面板',
    'featuresPage.items.underwritingPanel.desc':
      '一屏查看关键指标：收入、EMI、FOIR、余额趋势与风险标记，适用于授信决策。',

    'featuresPage.items.languages.title': '50+ 语言支持',
    'featuresPage.items.languages.desc':
      '支持 50+ 语言，适配多语言文件与国际银行格式。',
    'featuresPage.items.instantProcessing.title': '极速处理',
    'featuresPage.items.instantProcessing.desc':
      '约 30 秒内完成转换，适合紧急对账与审计场景。',
    'featuresPage.items.batchProcessing.title': '批量处理',
    'featuresPage.items.batchProcessing.desc':
      '并行处理多份对账单，适合会计与批量工作流。',
    'featuresPage.items.chatAura.title': 'Chat Aura AI 助手',
    'featuresPage.items.chatAura.desc':
      '对账单问答与洞察：交易、现金流、支出结构等。',

    'featuresPage.items.encryption.title': '银行级加密',
    'featuresPage.items.encryption.desc':
      '上传、处理与下载全程加密，保护敏感财务数据。',
    'featuresPage.items.zeroRetention.title': '零数据留存',
    'featuresPage.items.zeroRetention.desc':
      '处理完成后不保留文件，数据由你掌控。',

    'featuresPage.items.categorization.title': '智能分类',
    'featuresPage.items.categorization.desc':
      '自动分类交易（工资、EMI、水电、购物、餐饮等），支持自定义映射。',
    'featuresPage.items.exportFormats.title': '多种导出格式',
    'featuresPage.items.exportFormats.desc':
      '支持导出 Excel、CSV、DOCX 与 ODS 报告，便于对账与分析。',
    'featuresPage.items.ruleBased.title': '规则级准确',
    'featuresPage.items.ruleBased.desc':
      '确定性计算：不胡编、不猜测，每个数字都可解释。',
    'featuresPage.items.dailyLimits.title': '每日重置额度',
    'featuresPage.items.dailyLimits.desc': '额度按本地时间每日 0 点重置：匿名用户 2 次/天，注册用户 6 次/天。',

    'featuresPage.cta.title': '准备好体验全部功能了吗？',
    'featuresPage.cta.desc': '立即开始：每天免费 2 次转换；注册后每天 6 次，解锁完整能力。',
    'featuresPage.cta.tryDemo': '立即试用演示',
    'featuresPage.cta.signUp': '免费注册',
    'featuresPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // About Page
    'aboutPage.visionTitle': '愿景',
    'aboutPage.visionSubtitle': '精准与网络安全的结合。',
    'aboutPage.visionP1':
      'Akromeda 不只是工具，更是金融数据完整性的全球标准。我们打造的不只是转换器，而是能保护你整个财务工作流的系统。',
    'aboutPage.brainchildPrefix': '创作者',
    'aboutPage.brainchildP1':
      '由哈佛大学网络安全方向的专业人士打造，扎根于印度拉贾斯坦邦科塔。18 岁的 Faizan 发现全球处理敏感财务文件的关键漏洞。',
    'aboutPage.brainchildP2':
      '结合高级加密与 AI 自动化，Akromeda 于 2026 年推出，为企业提供快速、高可信的对账单转换，确保数据私密且强大。',
    'aboutPage.valueProps.cyberSafe.title': '安全可靠',
    'aboutPage.valueProps.cyberSafe.desc': '以安全为第一原则，适用于敏感财务流程。',
    'aboutPage.valueProps.instantFlux.title': '极速转换',
    'aboutPage.valueProps.instantFlux.desc': '快速处理复杂数据，无需手工录入。',
    'aboutPage.valueProps.accuracy.title': 'High Accuracy',
    'aboutPage.valueProps.accuracy.desc': 'Accuracy-focused conversion designed for high-stakes financial data.',
    'aboutPage.connectTitle': '联系创作者',
    'aboutPage.contact.hotline': '热线',
    'aboutPage.contact.mail': '邮箱',
    'aboutPage.contact.social': '社交',
    'aboutPage.contact.hq': '总部',
    'aboutPage.contact.hqValue': '普雷姆纳加尔1号 科塔 拉贾斯坦邦 324004',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'Privacy and Transparency',
    'privacyPage.title': 'Privacy Policy',
    'privacyPage.subtitle': 'We collect only what we need to run and secure the service.',
    'privacyPage.lastUpdated': 'Last updated: February 7, 2026',
    'privacyPage.sections.zeroRetention.title': '24-Hour Retention',
    'privacyPage.sections.zeroRetention.desc': 'Uploaded files and generated results are stored for up to 24 hours to let you download them. You must download your files yourself; we do not download, retrieve, or manually delete files on your behalf. After 24 hours, files and results are permanently deleted and cannot be recovered.',
    'privacyPage.sections.encryption.title': 'Encryption in Transit',
    'privacyPage.sections.encryption.desc': 'Data is encrypted during upload and transfer. We use reputable providers and industry standard security controls.',
    'privacyPage.sections.noTracking.title': 'No Ad Tracking',
    'privacyPage.sections.noTracking.desc': 'We do not sell your data or run advertising trackers. We may use anti abuse tools like reCAPTCHA which can collect device signals and set cookies.',
    'privacyPage.sections.aiPowered.title': 'Automated Processing',
    'privacyPage.sections.aiPowered.desc': 'Processing is primarily automated. Access to data is limited to authorized staff for support or legal reasons.',
    'privacyPage.sections.compliance.title': 'Privacy Minded',
    'privacyPage.sections.compliance.desc': 'We aim to follow privacy principles and be transparent about how data is used.',
    'privacyPage.aboutTitle': '关于 Akromeda',
    'privacyPage.aboutP1': 'Akromeda 是一款快速、安全的工具，专注于将银行对账单从 PDF 转为 Excel。',
    'privacyPage.aboutP2Prefix': '该平台由',
    'privacyPage.aboutP2Suffix':
      '创建，哈佛大学网络安全方向学生，常驻印度拉贾斯坦邦科塔。2026 年，18 岁的 Faizan 推出 Akromeda，帮助个人与企业节省处理财务数据的时间与精力。',
    'privacyPage.whatTitle': 'Akromeda 能做什么',
    'privacyPage.whatItems.item1': '将复杂的对账单 PDF 转为干净、可编辑的 Excel',
    'privacyPage.whatItems.item2': '保留格式、列结构与交易清晰度',
    'privacyPage.whatItems.item3': '即开即用，无需安装软件',
    'privacyPage.whatItems.item4': '以隐私与安全为核心设计',
    'privacyPage.contactTitle': 'Questions?',
    'privacyPage.contactDescPrefix': 'For privacy questions, contact',
    'privacyPage.footer': '(c) 2026 Akromeda. All rights reserved.',
    
    // Language
    'language': '简体',
  },
  ja: {
    // Navigation
    'nav.features': '機能',
    'nav.demo': 'デモ',
    'nav.chatAura': 'Chat Aura',
    'nav.settings': '設定',
    'nav.admin': '管理者',
    'nav.about': '概要',
    'nav.signIn': 'ログイン',
    'nav.signOut': 'ログアウト',
    'nav.getStarted': '始める',
    'nav.pricing': '料金',
    'nav.benefits': 'メリット',
    'nav.menu': 'メニュー',
    
    // Hero
    'hero.title': 'AI銀行明細書コンバーター',
    'hero.titleLine1': '銀行明細',
    'hero.titleLine2': 'コンバーター',
    'hero.tagline': 'プロ品質 | OCR搭載 | 即時結果',
    'hero.subtitle': 'AI搭載の精度で、銀行明細書を整理されたExcelファイルに即座に変換します。',
    'hero.uploadBtn': '今すぐ明細書をアップロード',
    'hero.pricingBtn': '価格を見る',
    'hero.sampleReportBtn': 'サンプルレポート',
    
    // How It Works
    'howItWorks.title': '使い方',
    'howItWorks.subtitle': '銀行明細をExcelに変換する3つの簡単ステップ',
    'howItWorks.step1.title': 'アップロード',
    'howItWorks.step1.desc': 'PDFまたは画像の銀行明細書をアップロード',
    'howItWorks.step2.title': '処理',
    'howItWorks.step2.desc': 'AIが取引を抽出して分類',
    'howItWorks.step3.title': 'ダウンロード',
    'howItWorks.step3.desc': '整理されたExcelファイルを即座に取得',
    
    // Features
    'features.title': '機能',
    'features.accuracy': 'High Accuracy',
    'features.accuracyDesc': 'AI-powered extraction is designed to reduce errors.',
    'features.fast': '超高速',
    'features.fastDesc': '数秒で明細書を変換',
    'features.secure': '銀行レベルのセキュリティ',
    'features.secureDesc': 'データは暗号化され保護されています',
    
    // Pricing
    'pricing.title': '価格',
    'pricing.free': '無料',
    'pricing.daily': '日額',
    'pricing.business': 'ビジネス',
    
    // Footer
    'footer.product': '製品',
    'footer.features': '機能',
    'footer.pricing': '価格',
    'footer.howItWorks': '使い方',
    'footer.company': '会社',
    'footer.about': '概要',
    'footer.privacy': 'プライバシーポリシー',
    'footer.terms': '利用規約',
    'footer.cta.title': '変革の準備はできましたか',
    'footer.cta.subtitle': '財務ワークフロー？',
    'footer.cta.desc': '正確で即座の銀行明細書変換でAkromedaを信頼する何千もの企業や個人に参加しましょう。',
    'footer.cta.btn': '今すぐ変換を開始',
    'footer.copyright': '© 2026 Akromeda。Faizan Rizviが作成。',
    'footer.recaptcha.prefix': 'このサイトはreCAPTCHAで保護され、Googleの',
    'footer.recaptcha.privacy': 'プライバシーポリシー',
    'footer.recaptcha.and': 'と',
    'footer.recaptcha.terms': '利用規約',
    'footer.recaptcha.suffix': 'が適用されます。',
    
    // Auth
    'auth.welcome': 'おかえりなさい！',
    'auth.signedIn': 'ログインに成功しました。',
    'auth.accountCreated': 'アカウントが作成されました！',
    'auth.canUse': 'Akromedaの使用を開始できます。',
    'auth.email': 'メールアドレス',
    'auth.password': 'パスワード',
    'auth.signIn': 'ログイン',
    'auth.signUp': '新規登録',
    'auth.forgotPassword': 'パスワードをお忘れですか？',
    'auth.noAccount': 'アカウントをお持ちでないですか？新規登録',
    'auth.hasAccount': 'すでにアカウントをお持ちですか？ログイン',

    // Common
    'common.backToHome': 'ホームに戻る',

    // Features Directory Page
    'featuresPage.title': '全機能',
    'featuresPage.subtitle':
      'AI OCR から銀行レベルのセキュリティまで、Akromeda の機能をA〜Zで一覧化。精度・速度・企業向け分析に最適化されています。',
    'featuresPage.categories.core': 'コア技術',
    'featuresPage.categories.financial': '財務分析',
    'featuresPage.categories.risk': 'リスク分析',
    'featuresPage.categories.assistant': 'AIアシスタント',
    'featuresPage.categories.export': 'エクスポート',
    'featuresPage.categories.performance': 'パフォーマンス',
    'featuresPage.categories.security': 'セキュリティ',
    'featuresPage.categories.privacy': 'プライバシー',
    'featuresPage.categories.accessibility': 'アクセシビリティ',
    'featuresPage.categories.technology': '技術',
    'featuresPage.categories.usage': '利用制限',

    'featuresPage.items.aiOcr.title': 'AI OCR エンジン',
    'featuresPage.items.aiOcr.desc':
      'PDF/スキャン/写真からデータを抽出。取引表、日付、金額、説明を高精度に認識し、低品質な書類にも対応します。',
    'featuresPage.items.excelCsv.title': 'Excel・CSV 出力',
    'featuresPage.items.excelCsv.desc':
      'Excel(.xlsx) と CSV を整形して出力。日付/説明/借方/貸方/残高/カテゴリなど標準列で管理できます。',
    'featuresPage.items.pdfReport.title': 'PDF レポート生成',
    'featuresPage.items.pdfReport.desc':
      'ブランド付きのPDFレポートを作成。サマリー、指標、明細を含み、監査や申請に最適です。',

    'featuresPage.items.foir.title': 'FOIR 計算',
    'featuresPage.items.foir.desc':
      '給与入金と EMI 引落をルールで検出し、FOIR を自動計算（与信判断で重要）。',
    'featuresPage.items.emiDetection.title': 'EMI 検出',
    'featuresPage.items.emiDetection.desc':
      '決定論的なパターンで定期支払いを検出。推測なしで説明可能です。',
    'featuresPage.items.salaryAnalysis.title': '給与入金分析',
    'featuresPage.items.salaryAnalysis.desc':
      '繰り返しパターンやキーワードから給与入金を検出し、平均月収を推定します。',
    'featuresPage.items.cashflow.title': 'キャッシュフロー分析',
    'featuresPage.items.cashflow.desc': '総流入/総流出/純キャッシュフローを算出し、カテゴリ別に把握できます。',
    'featuresPage.items.adbAmb.title': '平均残高（ADB/AMB）',
    'featuresPage.items.adbAmb.desc': '銀行の評価に使われる ADB/AMB を計算し、残高の傾向を把握します。',

    'featuresPage.items.fraudDetection.title': '不正検知',
    'featuresPage.items.fraudDetection.desc': '端数のない金額、週末の異常、重複、残高不整合などの兆候を検出します。',
    'featuresPage.items.integrityScoring.title': '整合性スコア',
    'featuresPage.items.integrityScoring.desc': '日付と残高の連続性を検証し、改ざんや誤りの発見を支援します。',
    'featuresPage.items.underwritingPanel.title': '与信ダッシュボード',
    'featuresPage.items.underwritingPanel.desc': '収入、EMI、FOIR、残高推移、リスクフラグを一画面で確認できます。',

    'featuresPage.items.languages.title': '50+ 言語対応',
    'featuresPage.items.languages.desc': '50以上の言語と国際的な銀行フォーマットに対応します。',
    'featuresPage.items.instantProcessing.title': '高速処理',
    'featuresPage.items.instantProcessing.desc': '約30秒以内の変換で、急ぎの会計・監査にも対応。',
    'featuresPage.items.batchProcessing.title': 'バッチ処理',
    'featuresPage.items.batchProcessing.desc': '複数の明細を並列処理。大量処理に最適です。',
    'featuresPage.items.chatAura.title': 'Chat Aura AI アシスタント',
    'featuresPage.items.chatAura.desc': '取引や支出、キャッシュフローについて質問して洞察を得られます。',

    'featuresPage.items.encryption.title': '銀行レベル暗号化',
    'featuresPage.items.encryption.desc': 'アップロード〜ダウンロードまで暗号化で保護し、機密データを守ります。',
    'featuresPage.items.zeroRetention.title': 'データ非保持',
    'featuresPage.items.zeroRetention.desc': '処理完了後にファイルを保持しません。データはあなたの管理下にあります。',

    'featuresPage.items.categorization.title': 'スマート分類',
    'featuresPage.items.categorization.desc': '給与、EMI、公共料金、買い物、食費などに自動分類（カスタム可能）。',
    'featuresPage.items.exportFormats.title': '複数フォーマット出力',
    'featuresPage.items.exportFormats.desc': 'Excel/CSV/DOCX/ODSに対応し、会計や分析に最適です。',
    'featuresPage.items.ruleBased.title': 'ルールベース精度',
    'featuresPage.items.ruleBased.desc': '推測なし。すべての数値は計算で導出され、説明可能です。',
    'featuresPage.items.dailyLimits.title': '日次リセット制限',
    'featuresPage.items.dailyLimits.desc': '制限は現地時間の0時にリセット。匿名は2回/日、登録は6回/日。',

    'featuresPage.cta.title': 'すべての機能を体験しますか？',
    'featuresPage.cta.desc': '毎日2回の無料変換から開始。登録で毎日6回に増え、フル機能を解放します。',
    'featuresPage.cta.tryDemo': 'デモを試す',
    'featuresPage.cta.signUp': '無料登録',
    'featuresPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // About Page
    'aboutPage.visionTitle': 'ビジョン',
    'aboutPage.visionSubtitle': '精度とサイバーセキュリティの融合。',
    'aboutPage.visionP1':
      'Akromeda は単なるツールではなく、金融データ完全性の新しい標準です。変換だけでなく、財務ワークフロー全体を守るために設計されています。',
    'aboutPage.brainchildPrefix': '創設者',
    'aboutPage.brainchildP1':
      'ハーバード大学でサイバーセキュリティを学ぶ専門家が設計。インド・ラジャスタン州コタを拠点に、18歳の Faizan が機密文書取り扱いの脆弱性に気づきました。',
    'aboutPage.brainchildP2':
      '高度な暗号化とAI自動化を組み合わせ、2026年に Akromeda を公開。高速で信頼できる変換を提供し、データのプライバシーを守ります。',
    'aboutPage.valueProps.cyberSafe.title': '安全設計',
    'aboutPage.valueProps.cyberSafe.desc': '機密性の高い金融業務向けにセキュリティを最優先。',
    'aboutPage.valueProps.instantFlux.title': '高速変換',
    'aboutPage.valueProps.instantFlux.desc': '手入力なしで複雑データをスピーディに。',
    'aboutPage.valueProps.accuracy.title': 'High Accuracy',
    'aboutPage.valueProps.accuracy.desc': 'Accuracy-focused conversion designed for high-stakes financial data.',
    'aboutPage.connectTitle': '創設者に連絡',
    'aboutPage.contact.hotline': '電話',
    'aboutPage.contact.mail': 'メール',
    'aboutPage.contact.social': 'SNS',
    'aboutPage.contact.hq': '拠点',
    'aboutPage.contact.hqValue': 'プレムナガル1 コタ ラジャスタン州 324004',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'Privacy and Transparency',
    'privacyPage.title': 'Privacy Policy',
    'privacyPage.subtitle': 'We collect only what we need to run and secure the service.',
    'privacyPage.lastUpdated': 'Last updated: February 7, 2026',
    'privacyPage.sections.zeroRetention.title': '24-Hour Retention',
    'privacyPage.sections.zeroRetention.desc': 'Uploaded files and generated results are stored for up to 24 hours to let you download them. You must download your files yourself; we do not download, retrieve, or manually delete files on your behalf. After 24 hours, files and results are permanently deleted and cannot be recovered.',
    'privacyPage.sections.encryption.title': 'Encryption in Transit',
    'privacyPage.sections.encryption.desc': 'Data is encrypted during upload and transfer. We use reputable providers and industry standard security controls.',
    'privacyPage.sections.noTracking.title': 'No Ad Tracking',
    'privacyPage.sections.noTracking.desc': 'We do not sell your data or run advertising trackers. We may use anti abuse tools like reCAPTCHA which can collect device signals and set cookies.',
    'privacyPage.sections.aiPowered.title': 'Automated Processing',
    'privacyPage.sections.aiPowered.desc': 'Processing is primarily automated. Access to data is limited to authorized staff for support or legal reasons.',
    'privacyPage.sections.compliance.title': 'Privacy Minded',
    'privacyPage.sections.compliance.desc': 'We aim to follow privacy principles and be transparent about how data is used.',
    'privacyPage.aboutTitle': 'Akromeda について',
    'privacyPage.aboutP1': 'Akromeda は、PDFの銀行明細を正確にExcelへ変換する高速・安全なツールです。',
    'privacyPage.aboutP2Prefix': 'このプラットフォームは',
    'privacyPage.aboutP2Suffix':
      'によって作られました。ハーバード大学のサイバーセキュリティ学生で、インド・ラジャスタン州コタを拠点としています。2026年、18歳で Akromeda を公開しました。',
    'privacyPage.whatTitle': 'Akromeda ができること',
    'privacyPage.whatItems.item1': '複雑なPDF明細を編集可能なExcelに変換',
    'privacyPage.whatItems.item2': 'フォーマット・列・明細の見やすさを維持',
    'privacyPage.whatItems.item3': 'インストール不要で即利用',
    'privacyPage.whatItems.item4': 'プライバシーとセキュリティを中核に設計',
    'privacyPage.contactTitle': 'Questions?',
    'privacyPage.contactDescPrefix': 'For privacy questions, contact',
    'privacyPage.footer': '(c) 2026 Akromeda. All rights reserved.',
    
    // Language
    'language': '日本語',
  },
  es: {
    // Navigation
    'nav.features': 'Características',
    'nav.demo': 'Demo',
    'nav.chatAura': 'Chat Aura',
    'nav.settings': 'Ajustes',
    'nav.admin': 'Admin',
    'nav.about': 'Acerca de',
    'nav.signIn': 'Iniciar sesión',
    'nav.signOut': 'Cerrar sesión',
    'nav.getStarted': 'Empezar',
    'nav.pricing': 'Precios',
    'nav.benefits': 'Beneficios',
    'nav.menu': 'Menú',
    
    // Hero
    'hero.title': 'Convertidor de Extractos Bancarios con IA',
    'hero.titleLine1': 'Extracto Bancario',
    'hero.titleLine2': 'Convertidor',
    'hero.tagline': 'Aspecto profesional | OCR impulsado | Resultados instantáneos',
    'hero.subtitle': 'Transforma tus extractos bancarios en archivos Excel organizados al instante con precisión impulsada por IA.',
    'hero.uploadBtn': 'Sube tu extracto ahora',
    'hero.pricingBtn': 'Ver precios',
    'hero.sampleReportBtn': 'Informe de muestra',
    
    // How It Works
    'howItWorks.title': 'Cómo funciona',
    'howItWorks.subtitle': 'Convierte tus extractos bancarios a Excel en tres pasos simples',
    'howItWorks.step1.title': 'Subir',
    'howItWorks.step1.desc': 'Sube tu extracto bancario en PDF o imagen',
    'howItWorks.step2.title': 'Procesar',
    'howItWorks.step2.desc': 'La IA extrae y categoriza las transacciones',
    'howItWorks.step3.title': 'Descargar',
    'howItWorks.step3.desc': 'Obtén un archivo Excel organizado al instante',
    
    // Features
    'features.title': 'Características',
    'features.accuracy': 'High Accuracy',
    'features.accuracyDesc': 'AI-powered extraction is designed to reduce errors.',
    'features.fast': 'Rapidez relámpago',
    'features.fastDesc': 'Convierte extractos en segundos',
    'features.secure': 'Seguridad bancaria',
    'features.secureDesc': 'Tus datos están encriptados y protegidos',
    
    // Pricing
    'pricing.title': 'Precios',
    'pricing.free': 'Gratis',
    'pricing.daily': 'Diario',
    'pricing.business': 'Empresarial',
    
    // Footer
    'footer.product': 'Producto',
    'footer.features': 'Características',
    'footer.pricing': 'Precios',
    'footer.howItWorks': 'Cómo funciona',
    'footer.company': 'Empresa',
    'footer.about': 'Acerca de',
    'footer.privacy': 'Política de privacidad',
    'footer.terms': 'Términos y Condiciones',
    'footer.cta.title': '¿Listo para transformar tu',
    'footer.cta.subtitle': 'flujo de trabajo financiero?',
    'footer.cta.desc': 'Únete a miles de empresas e individuos que confían en Akromeda para conversiones de extractos bancarios precisas e instantáneas.',
    'footer.cta.btn': 'Comienza a convertir ahora',
    'footer.copyright': '© 2026 Akromeda. Creado por Faizan Rizvi.',
    'footer.recaptcha.prefix': 'Este sitio está protegido por reCAPTCHA y la',
    'footer.recaptcha.privacy': 'Política de privacidad',
    'footer.recaptcha.and': 'y los',
    'footer.recaptcha.terms': 'Términos del servicio',
    'footer.recaptcha.suffix': 'de Google se aplican.',
    
    // Auth
    'auth.welcome': '¡Bienvenido de nuevo!',
    'auth.signedIn': 'Has iniciado sesión correctamente.',
    'auth.accountCreated': '¡Cuenta creada!',
    'auth.canUse': 'Ya puedes empezar a usar Akromeda.',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.signIn': 'Iniciar sesión',
    'auth.signUp': 'Registrarse',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.noAccount': '¿No tienes cuenta? Regístrate',
    'auth.hasAccount': '¿Ya tienes cuenta? Inicia sesión',

    // Common
    'common.backToHome': 'Volver al inicio',

    // Features Directory Page
    'featuresPage.title': 'TODAS LAS FUNCIONES',
    'featuresPage.subtitle':
      'Lista completa A–Z de todo lo que ofrece Akromeda: desde OCR con IA hasta seguridad de nivel bancario. Diseñado para precisión, velocidad y análisis financiero empresarial.',
    'featuresPage.categories.core': 'Tecnología principal',
    'featuresPage.categories.financial': 'Análisis financiero',
    'featuresPage.categories.risk': 'Análisis de riesgo',
    'featuresPage.categories.assistant': 'Asistente IA',
    'featuresPage.categories.export': 'Exportación',
    'featuresPage.categories.performance': 'Rendimiento',
    'featuresPage.categories.security': 'Seguridad',
    'featuresPage.categories.privacy': 'Privacidad',
    'featuresPage.categories.accessibility': 'Accesibilidad',
    'featuresPage.categories.technology': 'Tecnología',
    'featuresPage.categories.usage': 'Uso',

    'featuresPage.items.aiOcr.title': 'MOTOR OCR CON IA',
    'featuresPage.items.aiOcr.desc':
      'Extrae datos de PDF, escaneos y fotos. Reconoce tablas, fechas, importes y descripciones con alta precisión, incluso en documentos de baja calidad.',
    'featuresPage.items.excelCsv.title': 'EXPORTACIÓN A EXCEL Y CSV',
    'featuresPage.items.excelCsv.desc':
      'Exporta Excel (.xlsx) y CSV limpios con columnas correctas (Fecha, Descripción, Débito, Crédito, Saldo, Categoría). Compatible con herramientas contables.',
    'featuresPage.items.pdfReport.title': 'GENERACIÓN DE INFORME PDF',
    'featuresPage.items.pdfReport.desc':
      'Crea informes PDF con marca, resúmenes y métricas, ideales para auditorías y solicitudes de préstamo.',

    'featuresPage.items.foir.title': 'CÁLCULO FOIR',
    'featuresPage.items.foir.desc':
      'Calcula FOIR automáticamente detectando ingresos de salario y débitos de EMI con reglas claras.',
    'featuresPage.items.emiDetection.title': 'DETECCIÓN DE EMI',
    'featuresPage.items.emiDetection.desc':
      'Detecta pagos EMI recurrentes con patrones deterministas (sin adivinar) y resultados explicables.',
    'featuresPage.items.salaryAnalysis.title': 'ANÁLISIS DE SALARIO',
    'featuresPage.items.salaryAnalysis.desc':
      'Identifica créditos salariales por patrones y palabras clave para estimar el ingreso mensual promedio.',
    'featuresPage.items.cashflow.title': 'ANÁLISIS DE FLUJO DE CAJA',
    'featuresPage.items.cashflow.desc': 'Desglose de entradas, salidas y flujo neto con tendencias y categorías.',
    'featuresPage.items.adbAmb.title': 'SALDO DIARIO PROMEDIO',
    'featuresPage.items.adbAmb.desc': 'Calcula ADB/AMB, métricas usadas por bancos para evaluación y mínimos.',

    'featuresPage.items.fraudDetection.title': 'DETECCIÓN DE FRAUDE',
    'featuresPage.items.fraudDetection.desc':
      'Señala patrones sospechosos como importes redondos, anomalías de fin de semana, duplicados y desajustes de saldo.',
    'featuresPage.items.integrityScoring.title': 'PUNTUACIÓN DE INTEGRIDAD',
    'featuresPage.items.integrityScoring.desc':
      'Valida consistencia de fechas y saldos para ayudar a detectar manipulación o errores.',
    'featuresPage.items.underwritingPanel.title': 'PANEL DE EVALUACIÓN',
    'featuresPage.items.underwritingPanel.desc':
      'Métricas clave de un vistazo: ingresos, EMI, FOIR, tendencias de saldo y banderas de riesgo.',

    'featuresPage.items.languages.title': 'SOPORTE 50+ IDIOMAS',
    'featuresPage.items.languages.desc': 'Procesa extractos en 50+ idiomas y formatos bancarios internacionales.',
    'featuresPage.items.instantProcessing.title': 'PROCESAMIENTO INSTANTÁNEO',
    'featuresPage.items.instantProcessing.desc': 'Conversiones rápidas (~30s), ideal para contabilidad y auditorías.',
    'featuresPage.items.batchProcessing.title': 'PROCESAMIENTO POR LOTES',
    'featuresPage.items.batchProcessing.desc': 'Convierte múltiples extractos en paralelo para flujos masivos.',
    'featuresPage.items.chatAura.title': 'ASISTENTE IA CHAT AURA',
    'featuresPage.items.chatAura.desc': 'Haz preguntas y obtén insights sobre transacciones, gasto y cashflow.',

    'featuresPage.items.encryption.title': 'ENCRIPTACIÓN NIVEL BANCARIO',
    'featuresPage.items.encryption.desc': 'Protección cifrada durante subida, procesamiento y descarga.',
    'featuresPage.items.zeroRetention.title': 'CERO RETENCIÓN DE DATOS',
    'featuresPage.items.zeroRetention.desc': 'No retenemos tus archivos tras el procesamiento. Tú controlas tu información.',

    'featuresPage.items.categorization.title': 'CATEGORIZACIÓN INTELIGENTE',
    'featuresPage.items.categorization.desc':
      'Clasifica transacciones (Salario, EMI, Servicios, Compras, Comida, etc.) con mapeo personalizable.',
    'featuresPage.items.exportFormats.title': 'MÚLTIPLES FORMATOS',
    'featuresPage.items.exportFormats.desc': 'Exporta Excel, CSV, DOCX y ODS para análisis y contabilidad.',
    'featuresPage.items.ruleBased.title': 'PRECISIÓN POR REGLAS',
    'featuresPage.items.ruleBased.desc': 'Sin alucinaciones: cálculos deterministas, precisos y explicables.',
    'featuresPage.items.dailyLimits.title': 'LÍMITES DIARIOS',
    'featuresPage.items.dailyLimits.desc': 'Los límites se reinician a medianoche. Anónimo: 2/día; registrado: 6/día.',

    'featuresPage.cta.title': '¿Listo para usar todas las funciones?',
    'featuresPage.cta.desc': 'Empieza con 2 conversiones gratis al día. Regístrate para 6 al día y desbloquea todo.',
    'featuresPage.cta.tryDemo': 'Probar demo',
    'featuresPage.cta.signUp': 'Registrarse gratis',
    'featuresPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // About Page
    'aboutPage.visionTitle': 'La visión',
    'aboutPage.visionSubtitle': 'Donde la precisión se une con la ciberseguridad.',
    'aboutPage.visionP1':
      'Akromeda no es solo una herramienta; es un estándar global de integridad de datos financieros. No solo convierte archivos: protege tu flujo financiero completo.',
    'aboutPage.brainchildPrefix': 'Creado por',
    'aboutPage.brainchildP1':
      'Diseñado por un especialista en ciberseguridad de Harvard, con base en Kota, Rajasthan. Con 18 años, Faizan detectó una vulnerabilidad crítica en el manejo de documentos financieros.',
    'aboutPage.brainchildP2':
      'Combinando cifrado avanzado y automatización con IA, Akromeda se lanzó en 2026 para ofrecer conversiones rápidas y de alta integridad, manteniendo tus datos privados.',
    'aboutPage.valueProps.cyberSafe.title': 'Ciberseguro',
    'aboutPage.valueProps.cyberSafe.desc': 'Principios de seguridad primero para flujos financieros sensibles.',
    'aboutPage.valueProps.instantFlux.title': 'Velocidad instantánea',
    'aboutPage.valueProps.instantFlux.desc': 'Convierte datos complejos sin entrada manual.',
    'aboutPage.valueProps.accuracy.title': 'High Accuracy',
    'aboutPage.valueProps.accuracy.desc': 'Accuracy-focused conversion designed for high-stakes financial data.',
    'aboutPage.connectTitle': 'Conecta con el creador',
    'aboutPage.contact.hotline': 'Teléfono',
    'aboutPage.contact.mail': 'Correo',
    'aboutPage.contact.social': 'Social',
    'aboutPage.contact.hq': 'Sede',
    'aboutPage.contact.hqValue': 'Prem Nagar 1st, Kota, Rajasthan 324004',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'Privacy and Transparency',
    'privacyPage.title': 'Privacy Policy',
    'privacyPage.subtitle': 'We collect only what we need to run and secure the service.',
    'privacyPage.lastUpdated': 'Last updated: February 7, 2026',
    'privacyPage.sections.zeroRetention.title': '24-Hour Retention',
    'privacyPage.sections.zeroRetention.desc': 'Uploaded files and generated results are stored for up to 24 hours to let you download them. You must download your files yourself; we do not download, retrieve, or manually delete files on your behalf. After 24 hours, files and results are permanently deleted and cannot be recovered.',
    'privacyPage.sections.encryption.title': 'Encryption in Transit',
    'privacyPage.sections.encryption.desc': 'Data is encrypted during upload and transfer. We use reputable providers and industry standard security controls.',
    'privacyPage.sections.noTracking.title': 'No Ad Tracking',
    'privacyPage.sections.noTracking.desc': 'We do not sell your data or run advertising trackers. We may use anti abuse tools like reCAPTCHA which can collect device signals and set cookies.',
    'privacyPage.sections.aiPowered.title': 'Automated Processing',
    'privacyPage.sections.aiPowered.desc': 'Processing is primarily automated. Access to data is limited to authorized staff for support or legal reasons.',
    'privacyPage.sections.compliance.title': 'Privacy Minded',
    'privacyPage.sections.compliance.desc': 'We aim to follow privacy principles and be transparent about how data is used.',
    'privacyPage.aboutTitle': 'Acerca de Akromeda',
    'privacyPage.aboutP1': 'Akromeda convierte extractos bancarios de PDF a Excel con precisión y facilidad.',
    'privacyPage.aboutP2Prefix': 'Esta plataforma fue creada por',
    'privacyPage.aboutP2Suffix':
      ', estudiante de ciberseguridad en Harvard, con base en Kota, Rajasthan, India. En 2026, con 18 años, Faizan lanzó Akromeda para ahorrar tiempo y esfuerzo con datos financieros.',
    'privacyPage.whatTitle': 'Qué hace Akromeda',
    'privacyPage.whatItems.item1': 'Convierte PDFs complejos en Excel limpio y editable',
    'privacyPage.whatItems.item2': 'Mantiene formato, columnas y claridad',
    'privacyPage.whatItems.item3': 'Funciona al instante — sin instalar software',
    'privacyPage.whatItems.item4': 'Diseñado con privacidad y seguridad como base',
    'privacyPage.contactTitle': 'Questions?',
    'privacyPage.contactDescPrefix': 'For privacy questions, contact',
    'privacyPage.footer': '(c) 2026 Akromeda. All rights reserved.',
    
    // Language
    'language': 'Español',
  },
  it: {
    // Navigation
    'nav.features': 'Funzionalità',
    'nav.demo': 'Demo',
    'nav.chatAura': 'Chat Aura',
    'nav.settings': 'Impostazioni',
    'nav.admin': 'Admin',
    'nav.about': 'Chi siamo',
    'nav.signIn': 'Accedi',
    'nav.signOut': 'Esci',
    'nav.getStarted': 'Inizia',
    'nav.pricing': 'Prezzi',
    'nav.benefits': 'Vantaggi',
    'nav.menu': 'Menu',
    
    // Hero
    'hero.title': 'Convertitore di Estratti Conto con IA',
    'hero.titleLine1': 'Estratto Conto',
    'hero.titleLine2': 'Convertitore',
    'hero.tagline': 'Aspetto professionale | OCR potenziato | Risultati immediati',
    'hero.subtitle': "Trasforma i tuoi estratti conto in file Excel organizzati istantaneamente con precisione basata sull'IA.",
    'hero.uploadBtn': 'Carica il tuo estratto conto ora',
    'hero.pricingBtn': 'Vedi prezzi',
    'hero.sampleReportBtn': 'Report di esempio',
    
    // How It Works
    'howItWorks.title': 'Come funziona',
    'howItWorks.subtitle': 'Trasforma i tuoi estratti conto in Excel in tre semplici passaggi',
    'howItWorks.step1.title': 'Carica',
    'howItWorks.step1.desc': 'Carica il tuo estratto conto in PDF o immagine',
    'howItWorks.step2.title': 'Elabora',
    'howItWorks.step2.desc': "L'IA estrae e categorizza le transazioni",
    'howItWorks.step3.title': 'Scarica',
    'howItWorks.step3.desc': 'Ottieni un file Excel organizzato istantaneamente',
    
    // Features
    'features.title': 'Funzionalità',
    'features.accuracy': 'High Accuracy',
    'features.accuracyDesc': 'AI-powered extraction is designed to reduce errors.',
    'features.fast': 'Velocità fulminea',
    'features.fastDesc': 'Converti estratti in secondi',
    'features.secure': 'Sicurezza bancaria',
    'features.secureDesc': 'I tuoi dati sono crittografati e protetti',
    
    // Pricing
    'pricing.title': 'Prezzi',
    'pricing.free': 'Gratuito',
    'pricing.daily': 'Giornaliero',
    'pricing.business': 'Business',
    
    // Footer
    'footer.product': 'Prodotto',
    'footer.features': 'Funzionalità',
    'footer.pricing': 'Prezzi',
    'footer.howItWorks': 'Come funziona',
    'footer.company': 'Azienda',
    'footer.about': 'Chi siamo',
    'footer.privacy': 'Politica sulla privacy',
    'footer.terms': 'Termini e condizioni',
    'footer.cta.title': 'Pronto a trasformare il tuo',
    'footer.cta.subtitle': 'flusso di lavoro finanziario?',
    'footer.cta.desc': 'Unisciti a migliaia di aziende e privati che si affidano ad Akromeda per conversioni di estratti conto accurate e istantanee.',
    'footer.cta.btn': 'Inizia a convertire ora',
    'footer.copyright': '© 2026 Akromeda. Creato da Faizan Rizvi.',
    'footer.recaptcha.prefix': 'Questo sito è protetto da reCAPTCHA e la',
    'footer.recaptcha.privacy': 'Informativa sulla privacy',
    'footer.recaptcha.and': 'e i',
    'footer.recaptcha.terms': 'Termini di servizio',
    'footer.recaptcha.suffix': 'di Google si applicano.',
    
    // Auth
    'auth.welcome': 'Bentornato!',
    'auth.signedIn': 'Hai effettuato l\'accesso con successo.',
    'auth.accountCreated': 'Account creato!',
    'auth.canUse': 'Ora puoi iniziare a usare Akromeda.',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signIn': 'Accedi',
    'auth.signUp': 'Registrati',
    'auth.forgotPassword': 'Password dimenticata?',
    'auth.noAccount': 'Non hai un account? Registrati',
    'auth.hasAccount': 'Hai già un account? Accedi',

    // Common
    'common.backToHome': 'Torna alla home',

    // Features Directory Page
    'featuresPage.title': 'TUTTE LE FUNZIONALITÀ',
    'featuresPage.subtitle':
      'Elenco completo A–Z di tutto ciò che offre Akromeda: dall\'OCR con IA alla sicurezza di livello bancario. Creato per precisione, velocità e analisi finanziaria enterprise.',
    'featuresPage.categories.core': 'Tecnologia core',
    'featuresPage.categories.financial': 'Analisi finanziaria',
    'featuresPage.categories.risk': 'Analisi del rischio',
    'featuresPage.categories.assistant': 'Assistente IA',
    'featuresPage.categories.export': 'Esportazione',
    'featuresPage.categories.performance': 'Prestazioni',
    'featuresPage.categories.security': 'Sicurezza',
    'featuresPage.categories.privacy': 'Privacy',
    'featuresPage.categories.accessibility': 'Accessibilità',
    'featuresPage.categories.technology': 'Tecnologia',
    'featuresPage.categories.usage': 'Utilizzo',

    'featuresPage.items.aiOcr.title': 'MOTORE OCR CON IA',
    'featuresPage.items.aiOcr.desc':
      'Estrae dati da PDF, scansioni e foto. Riconosce tabelle, date, importi e descrizioni con alta precisione anche su documenti di bassa qualità.',
    'featuresPage.items.excelCsv.title': 'EXPORT EXCEL E CSV',
    'featuresPage.items.excelCsv.desc':
      'Esporta Excel (.xlsx) e CSV puliti con colonne corrette (Data, Descrizione, Dare, Avere, Saldo, Categoria).',
    'featuresPage.items.pdfReport.title': 'GENERAZIONE REPORT PDF',
    'featuresPage.items.pdfReport.desc':
      'Crea report PDF brandizzati con riepiloghi, metriche e dettagli — ideali per audit e pratiche.',

    'featuresPage.items.foir.title': 'CALCOLO FOIR',
    'featuresPage.items.foir.desc':
      'Calcolo FOIR automatico identificando accrediti stipendio e addebiti EMI con analisi a regole.',
    'featuresPage.items.emiDetection.title': 'RILEVAMENTO EMI',
    'featuresPage.items.emiDetection.desc':
      'Rileva pagamenti EMI ricorrenti con pattern deterministici: niente ipotesi, tutto spiegabile.',
    'featuresPage.items.salaryAnalysis.title': 'ANALISI STIPENDIO',
    'featuresPage.items.salaryAnalysis.desc':
      'Individua accrediti stipendio tramite pattern e parole chiave per stimare il reddito medio.',
    'featuresPage.items.cashflow.title': 'ANALISI CASHFLOW',
    'featuresPage.items.cashflow.desc': 'Riepilogo entrate/uscite e cashflow netto con categorie e trend.',
    'featuresPage.items.adbAmb.title': 'SALDO MEDIO GIORNALIERO',
    'featuresPage.items.adbAmb.desc': 'Calcola ADB/AMB, metriche usate dalle banche per valutazioni e minimi.',

    'featuresPage.items.fraudDetection.title': 'RILEVAMENTO FRODI',
    'featuresPage.items.fraudDetection.desc':
      'Segnala pattern sospetti: importi tondi, anomalie nel weekend, duplicati e incongruenze di saldo.',
    'featuresPage.items.integrityScoring.title': 'PUNTEGGIO INTEGRITÀ',
    'featuresPage.items.integrityScoring.desc': 'Verifica coerenza di date e saldi per individuare manomissioni o errori.',
    'featuresPage.items.underwritingPanel.title': 'PANNELLO DI VALUTAZIONE',
    'featuresPage.items.underwritingPanel.desc':
      'Metriche chiave a colpo d\'occhio: reddito, EMI, FOIR, trend saldo e flag rischio.',

    'featuresPage.items.languages.title': 'SUPPORTO 50+ LINGUE',
    'featuresPage.items.languages.desc': 'Elabora estratti in 50+ lingue e formati bancari internazionali.',
    'featuresPage.items.instantProcessing.title': 'ELABORAZIONE ISTANTANEA',
    'featuresPage.items.instantProcessing.desc': 'Conversioni rapide (~30s), perfette per contabilità e audit.',
    'featuresPage.items.batchProcessing.title': 'ELABORAZIONE IN BATCH',
    'featuresPage.items.batchProcessing.desc': 'Converti più estratti in parallelo per flussi di lavoro massivi.',
    'featuresPage.items.chatAura.title': 'ASSISTENTE IA CHAT AURA',
    'featuresPage.items.chatAura.desc': 'Fai domande e ottieni insight su transazioni, spese e cashflow.',

    'featuresPage.items.encryption.title': 'CIFRATURA LIVELLO BANCARIO',
    'featuresPage.items.encryption.desc': 'Protezione cifrata durante upload, elaborazione e download.',
    'featuresPage.items.zeroRetention.title': 'ZERO RETENTION',
    'featuresPage.items.zeroRetention.desc': 'Non conserviamo i file dopo l\'elaborazione. Controllo totale dei dati.',

    'featuresPage.items.categorization.title': 'CATEGORIZZAZIONE SMART',
    'featuresPage.items.categorization.desc':
      'Classifica transazioni (Stipendio, EMI, Utenze, Shopping, Cibo, ecc.) con mapping personalizzabile.',
    'featuresPage.items.exportFormats.title': 'PIÙ FORMATI DI EXPORT',
    'featuresPage.items.exportFormats.desc': 'Esporta Excel, CSV, DOCX e ODS per analisi e contabilità.',
    'featuresPage.items.ruleBased.title': 'PRECISIONE A REGOLE',
    'featuresPage.items.ruleBased.desc': 'Niente allucinazioni: calcoli deterministici, precisi e spiegabili.',
    'featuresPage.items.dailyLimits.title': 'LIMITI GIORNALIERI',
    'featuresPage.items.dailyLimits.desc': 'Limiti che si resettano a mezzanotte. Anonimo: 2/giorno; registrato: 6/giorno.',

    'featuresPage.cta.title': 'Pronto a provare tutte le funzionalità?',
    'featuresPage.cta.desc': 'Inizia con 2 conversioni gratis al giorno. Registrati per 6 al giorno e sblocca tutto.',
    'featuresPage.cta.tryDemo': 'Prova la demo',
    'featuresPage.cta.signUp': 'Registrati gratis',
    'featuresPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // About Page
    'aboutPage.visionTitle': 'La visione',
    'aboutPage.visionSubtitle': 'Dove la precisione incontra la cybersecurity.',
    'aboutPage.visionP1':
      'Akromeda non è solo uno strumento: è uno standard globale per l\'integrità dei dati finanziari. Non converte solo file: protegge il tuo intero flusso finanziario.',
    'aboutPage.brainchildPrefix': 'Ideato da',
    'aboutPage.brainchildP1':
      'Progettato da uno specialista di cybersecurity di Harvard, con base a Kota, Rajasthan. A 18 anni, Faizan ha individuato una vulnerabilità critica nella gestione dei documenti finanziari.',
    'aboutPage.brainchildP2':
      'Unendo cifratura avanzata e automazione con IA, Akromeda è stato lanciato nel 2026 per conversioni rapide e affidabili, mantenendo i tuoi dati privati.',
    'aboutPage.valueProps.cyberSafe.title': 'Cyber-Safe',
    'aboutPage.valueProps.cyberSafe.desc': 'Principi security-first per flussi finanziari sensibili.',
    'aboutPage.valueProps.instantFlux.title': 'Velocità istantanea',
    'aboutPage.valueProps.instantFlux.desc': 'Converti dati complessi senza inserimento manuale.',
    'aboutPage.valueProps.accuracy.title': 'High Accuracy',
    'aboutPage.valueProps.accuracy.desc': 'Accuracy-focused conversion designed for high-stakes financial data.',
    'aboutPage.connectTitle': 'Contatta il creatore',
    'aboutPage.contact.hotline': 'Telefono',
    'aboutPage.contact.mail': 'Email',
    'aboutPage.contact.social': 'Social',
    'aboutPage.contact.hq': 'Sede',
    'aboutPage.contact.hqValue': 'Prem Nagar 1st, Kota, Rajasthan 324004',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'Privacy and Transparency',
    'privacyPage.title': 'Privacy Policy',
    'privacyPage.subtitle': 'We collect only what we need to run and secure the service.',
    'privacyPage.lastUpdated': 'Last updated: February 7, 2026',
    'privacyPage.sections.zeroRetention.title': '24-Hour Retention',
    'privacyPage.sections.zeroRetention.desc': 'Uploaded files and generated results are stored for up to 24 hours to let you download them. You must download your files yourself; we do not download, retrieve, or manually delete files on your behalf. After 24 hours, files and results are permanently deleted and cannot be recovered.',
    'privacyPage.sections.encryption.title': 'Encryption in Transit',
    'privacyPage.sections.encryption.desc': 'Data is encrypted during upload and transfer. We use reputable providers and industry standard security controls.',
    'privacyPage.sections.noTracking.title': 'No Ad Tracking',
    'privacyPage.sections.noTracking.desc': 'We do not sell your data or run advertising trackers. We may use anti abuse tools like reCAPTCHA which can collect device signals and set cookies.',
    'privacyPage.sections.aiPowered.title': 'Automated Processing',
    'privacyPage.sections.aiPowered.desc': 'Processing is primarily automated. Access to data is limited to authorized staff for support or legal reasons.',
    'privacyPage.sections.compliance.title': 'Privacy Minded',
    'privacyPage.sections.compliance.desc': 'We aim to follow privacy principles and be transparent about how data is used.',
    'privacyPage.aboutTitle': 'Su Akromeda',
    'privacyPage.aboutP1': 'Akromeda converte estratti conto da PDF a Excel con precisione e semplicità.',
    'privacyPage.aboutP2Prefix': 'Questa piattaforma è stata creata da',
    'privacyPage.aboutP2Suffix':
      ', studente di cybersecurity ad Harvard, con base a Kota, Rajasthan, India. Nel 2026, a 18 anni, Faizan ha lanciato Akromeda per far risparmiare tempo con i dati finanziari.',
    'privacyPage.whatTitle': 'Cosa fa Akromeda',
    'privacyPage.whatItems.item1': 'Converte PDF complessi in Excel puliti e modificabili',
    'privacyPage.whatItems.item2': 'Mantiene formattazione, colonne e chiarezza',
    'privacyPage.whatItems.item3': 'Funziona subito — nessuna installazione',
    'privacyPage.whatItems.item4': 'Progettato con privacy e sicurezza al centro',
    'privacyPage.contactTitle': 'Questions?',
    'privacyPage.contactDescPrefix': 'For privacy questions, contact',
    'privacyPage.footer': '(c) 2026 Akromeda. All rights reserved.',
    
    // Language
    'language': 'Italiano',
  },
  ar: {
    // Navigation
    'nav.features': 'الميزات',
    'nav.demo': 'عرض تجريبي',
    'nav.chatAura': 'شات أورا',
    'nav.settings': 'الإعدادات',
    'nav.admin': 'المشرف',
    'nav.about': 'حول',
    'nav.signIn': 'تسجيل الدخول',
    'nav.signOut': 'تسجيل الخروج',
    'nav.getStarted': 'ابدأ الآن',
    'nav.pricing': 'الأسعار',
    'nav.benefits': 'المزايا',
    'nav.menu': 'القائمة',
    
    // Hero
    'hero.title': 'محوّل كشوف الحساب بالذكاء الاصطناعي',
    'hero.titleLine1': 'كشف الحساب',
    'hero.titleLine2': 'المحوّل',
    'hero.tagline': 'مظهر احترافي | مدعوم بـ OCR | نتائج فورية',
    'hero.subtitle': 'حوّل كشوفات حسابك إلى ملفات Excel منظمة فورًا بدقة مدعومة بالذكاء الاصطناعي.',
    'hero.uploadBtn': 'ارفع كشف الحساب الآن',
    'hero.pricingBtn': 'عرض الأسعار',
    'hero.sampleReportBtn': 'تقرير نموذجي',
    
    // How It Works
    'howItWorks.title': 'كيف يعمل',
    'howItWorks.subtitle': 'حوّل كشوفات حسابك إلى Excel في ثلاث خطوات بسيطة',
    'howItWorks.step1.title': 'تحميل',
    'howItWorks.step1.desc': 'قم بتحميل كشف حسابك بأي تنسيق — PDF أو صورة ممسوحة ضوئيًا أو صورة ملتقطة. ندعم مستندات من أي بنك حول العالم.',
    'howItWorks.step2.title': 'معالجة بالذكاء الاصطناعي',
    'howItWorks.step2.desc': 'يقوم OCR المدعوم بالذكاء الاصطناعي باستخراج بيانات المعاملات وتنظيمها فورًا بدقة عالية. يدعم أكثر من 50 لغة بما في ذلك الهندية والعربية والماندرين.',
    'howItWorks.step3.title': 'تنزيل Excel',
    'howItWorks.step3.desc': 'احصل على جدول Excel منظم ونظيف جاهز للمحاسبة أو التحليل أو الدمج مع أدواتك المالية.',
    
    // Features
    'features.title': 'الميزات',
    'features.accuracy': 'دقة عالية',
    'features.accuracyDesc': 'الاستخراج المدعوم بالذكاء الاصطناعي مصمم لتقليل الأخطاء.',
    'features.fast': 'سرعة فائقة',
    'features.fastDesc': 'حوّل الكشوف في ثوانٍ',
    'features.secure': 'أمان بمستوى البنوك',
    'features.secureDesc': 'بياناتك مشفرة ومحميّة',
    
    // Pricing
    'pricing.title': 'الأسعار',
    'pricing.free': 'مجاني',
    'pricing.daily': 'يومي',
    'pricing.business': 'أعمال',
    
    // Footer
    'footer.product': 'المنتج',
    'footer.features': 'الميزات',
    'footer.pricing': 'الأسعار',
    'footer.howItWorks': 'كيف يعمل',
    'footer.company': 'الشركة',
    'footer.about': 'حول',
    'footer.privacy': 'سياسة الخصوصية',
    'footer.terms': 'الشروط والأحكام',
    'footer.cta.title': 'جاهز لتحويل',
    'footer.cta.subtitle': 'سير عملك المالي؟',
    'footer.cta.desc': 'انضم إلى آلاف الشركات والأفراد الذين يثقون في Akromeda لتحويل كشوفات الحساب بدقة وفورًا.',
    'footer.cta.btn': 'ابدأ التحويل الآن',
    'footer.copyright': '© 2026 Akromeda. من إنشاء Faizan Rizvi.',
    'footer.recaptcha.prefix': 'هذا الموقع محمي بواسطة reCAPTCHA و',
    'footer.recaptcha.privacy': 'سياسة الخصوصية',
    'footer.recaptcha.and': 'و',
    'footer.recaptcha.terms': 'شروط الخدمة',
    'footer.recaptcha.suffix': 'الخاصة بـ Google تنطبق.',
    
    // Auth
    'auth.welcome': 'مرحبًا بعودتك!',
    'auth.signedIn': 'تم تسجيل الدخول بنجاح.',
    'auth.accountCreated': 'تم إنشاء الحساب!',
    'auth.canUse': 'يمكنك الآن البدء في استخدام Akromeda.',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.signIn': 'تسجيل الدخول',
    'auth.signUp': 'إنشاء حساب',
    'auth.forgotPassword': 'هل نسيت كلمة المرور؟',
    'auth.noAccount': 'ليس لديك حساب؟ أنشئ حسابًا',
    'auth.hasAccount': 'لديك حساب بالفعل؟ سجّل الدخول',

    // Common
    'common.backToHome': 'العودة إلى الصفحة الرئيسية',

    // Features Directory Page
    'featuresPage.title': 'جميع الميزات',
    'featuresPage.subtitle':
      'قائمة شاملة من الألف إلى الياء بكل ما يقدمه Akromeda — من OCR المدعوم بالذكاء الاصطناعي إلى الأمان بمستوى البنوك. مصمم للدقة والسرعة والتحليل المالي بمستوى المؤسسات.',
    'featuresPage.categories.core': 'التقنية الأساسية',
    'featuresPage.categories.financial': 'التحليل المالي',
    'featuresPage.categories.risk': 'تحليل المخاطر',
    'featuresPage.categories.assistant': 'مساعد الذكاء الاصطناعي',
    'featuresPage.categories.export': 'التصدير',
    'featuresPage.categories.performance': 'الأداء',
    'featuresPage.categories.security': 'الأمان',
    'featuresPage.categories.privacy': 'الخصوصية',
    'featuresPage.categories.accessibility': 'إمكانية الوصول',
    'featuresPage.categories.technology': 'التقنية',
    'featuresPage.categories.usage': 'الاستخدام',

    'featuresPage.items.aiOcr.title': 'محرك OCR بالذكاء الاصطناعي',
    'featuresPage.items.aiOcr.desc':
      'يستخرج البيانات من ملفات PDF والمسوح والصور. يتعرف على جداول المعاملات والتواريخ والمبالغ والأوصاف بدقة عالية — حتى من المستندات منخفضة الجودة.',
    'featuresPage.items.excelCsv.title': 'تصدير Excel وCSV',
    'featuresPage.items.excelCsv.desc':
      'صدّر ملفات Excel (.xlsx) وCSV نظيفة مع أعمدة صحيحة (التاريخ، الوصف، المدين، الدائن، الرصيد، الفئة). يعمل مع أدوات المحاسبة الشائعة.',
    'featuresPage.items.pdfReport.title': 'إنشاء تقارير PDF',
    'featuresPage.items.pdfReport.desc':
      'أنشئ تقارير PDF بعلامتك التجارية مع ملخصات ومقاييس الاكتتاب وتفاصيل دقيقة — مثالية للتدقيق وطلبات القروض.',

    'featuresPage.items.foir.title': 'حساب FOIR',
    'featuresPage.items.foir.desc':
      'يحسب FOIR تلقائيًا عبر تحليل قائم على القواعد من خلال كشف تحويلات الراتب وخصومات EMI — يُستخدم في تقييم أهلية القروض.',
    'featuresPage.items.emiDetection.title': 'اكتشاف EMI',
    'featuresPage.items.emiDetection.desc':
      'يرصد دفعات EMI المتكررة بأنماط حتمية (قروض منزل/سيارة/شخصية، EMI بطاقات الائتمان، BNPL). بلا تخمين — قابل للتفسير بالكامل.',
    'featuresPage.items.salaryAnalysis.title': 'تحليل تحويلات الراتب',
    'featuresPage.items.salaryAnalysis.desc':
      'يعثر على تحويلات الراتب باستخدام الأنماط وكلمات جهة العمل لتقدير متوسط الدخل الشهري للاكتتاب.',
    'featuresPage.items.cashflow.title': 'تحليل التدفق النقدي',
    'featuresPage.items.cashflow.desc':
      'يفصل التدفقات الداخلة والخارجة وصافي التدفق مع ملخصات الفئات ورؤى الاتجاهات.',
    'featuresPage.items.adbAmb.title': 'متوسط الرصيد اليومي',
    'featuresPage.items.adbAmb.desc':
      'يحسب مؤشرات ADB/AMB التي تستخدمها البنوك لفحص الحد الأدنى للرصيد وتقييمات الإقراض.',

    'featuresPage.items.fraudDetection.title': 'اكتشاف الاحتيال',
    'featuresPage.items.fraudDetection.desc':
      'يرصد أنماطًا مشبوهة مثل المعاملات بأرقام مستديرة، شذوذات عطلة نهاية الأسبوع، التكرارات، وعدم تطابق الرصيد.',
    'featuresPage.items.integrityScoring.title': 'تقييم النزاهة',
    'featuresPage.items.integrityScoring.desc':
      'يتحقق من اتساق الكشوف عبر التواريخ والأرصدة للمساعدة في كشف العبث والأخطاء.',
    'featuresPage.items.underwritingPanel.title': 'لوحة الاكتتاب',
    'featuresPage.items.underwritingPanel.desc':
      'كل المقاييس الرئيسية بنظرة واحدة: الدخل، EMI، FOIR، اتجاهات الرصيد، وأعلام المخاطر — مبنية لقرارات الإقراض.',

    'featuresPage.items.languages.title': 'دعم أكثر من 50 لغة',
    'featuresPage.items.languages.desc':
      'عالج الكشوف بأكثر من 50 لغة. يدعم المستندات متعددة اللغات وتنسيقات البنوك الدولية.',
    'featuresPage.items.instantProcessing.title': 'معالجة فورية',
    'featuresPage.items.instantProcessing.desc':
      'تحويلات سريعة خلال أقل من ~30 ثانية — مثالية للمحاسبة والتدقيق الحساسة للوقت.',
    'featuresPage.items.batchProcessing.title': 'معالجة دفعات',
    'featuresPage.items.batchProcessing.desc':
      'حوّل عدة كشوف بالتوازي — مناسب للمحاسبين وسير العمل بالجملة.',
    'featuresPage.items.chatAura.title': 'مساعد Chat Aura الذكي',
    'featuresPage.items.chatAura.desc':
      'اسأل عن كشفك واحصل على رؤى حول المعاملات والتدفق النقدي وأنماط الإنفاق.',

    'featuresPage.items.encryption.title': 'تشفير بمستوى البنوك',
    'featuresPage.items.encryption.desc':
      'تشفير قوي أثناء الرفع والمعالجة والتنزيل لحماية البيانات المالية الحساسة.',
    'featuresPage.items.zeroRetention.title': 'عدم الاحتفاظ بالبيانات',
    'featuresPage.items.zeroRetention.desc':
      'لا يتم الاحتفاظ بالملفات بعد المعالجة. أنت تتحكم بالكامل في بياناتك.',

    'featuresPage.items.categorization.title': 'تصنيف ذكي',
    'featuresPage.items.categorization.desc':
      'يصنف المعاملات تلقائيًا إلى فئات (راتب، EMI، خدمات، تسوق، طعام، إلخ) مع تعيين قابل للتخصيص.',
    'featuresPage.items.exportFormats.title': 'تنسيقات تصدير متعددة',
    'featuresPage.items.exportFormats.desc': 'صدّر تقارير Excel وCSV وDOCX وODS — محسّنة للمحاسبة والتحليل.',
    'featuresPage.items.ruleBased.title': 'دقة قائمة على القواعد',
    'featuresPage.items.ruleBased.desc': 'لا هلوسة ولا تخمين — كل رقم محسوب بدقة ويمكن تفسيره.',
    'featuresPage.items.dailyLimits.title': 'حدود يومية مُعاد ضبطها',
    'featuresPage.items.dailyLimits.desc':
      'تُعاد الحدود يوميًا عند منتصف الليل بالتوقيت المحلي. المستخدم المجهول: 2/يوم؛ المسجل: 6/يوم.',

    'featuresPage.cta.title': 'جاهز لتجربة كل الميزات؟',
    'featuresPage.cta.desc':
      'ابدأ التحويل الآن مع تحويلين مجانيين يوميًا. سجّل للحصول على 5 تحويلات يوميًا وافتح القوة الكاملة لـ Akromeda.',
    'featuresPage.cta.tryDemo': 'جرّب العرض التجريبي الآن',
    'featuresPage.cta.signUp': 'سجّل مجانًا',
    'featuresPage.footer': '© 2026 Akromeda | صُمم للتميّز',

    // About Page
    'aboutPage.visionTitle': 'الرؤية',
    'aboutPage.visionSubtitle': 'حيث تلتقي الدقة بالأمن السيبراني.',
    'aboutPage.visionP1':
      'Akromeda ليست مجرد أداة؛ إنها معيار عالمي لنزاهة البيانات المالية. في عصر أصبحت فيه البيانات عملة جديدة، بنينا منصة لا تحول الملفات فحسب — بل تؤمّن سير عملك المالي بالكامل.',
    'aboutPage.brainchildPrefix': 'من ابتكار',
    'aboutPage.brainchildP1':
      'صُممت على يد متخصص في الأمن السيبراني من جامعة هارفارد، مقيم في كوتا، راجستان. في عمر 18 عامًا، اكتشف فايزان ثغرة حرجة في طريقة التعامل مع المستندات المالية الحساسة عالميًا.',
    'aboutPage.brainchildP2':
      'بدمج التشفير المتقدم مع الأتمتة السلسة بالذكاء الاصطناعي، أطلقت Akromeda في عام 2026 لتمكين الشركات من تحويلات فورية عالية النزاهة — مع الحفاظ على خصوصية بياناتك وقوتها.',
    'aboutPage.valueProps.cyberSafe.title': 'أمان سيبراني',
    'aboutPage.valueProps.cyberSafe.desc': 'مبادئ أمان أولًا لسير عمل مالي حساس.',
    'aboutPage.valueProps.instantFlux.title': 'تدفّق فوري',
    'aboutPage.valueProps.instantFlux.desc': 'حوّل البيانات المعقدة بسرعة — دون إدخال يدوي.',
    'aboutPage.valueProps.accuracy.title': 'دقة عالية',
    'aboutPage.valueProps.accuracy.desc': 'تحويل يركز على الدقة للبيانات المالية عالية المخاطر.',
    'aboutPage.connectTitle': 'تواصل مع المؤسس',
    'aboutPage.contact.hotline': 'الخط الساخن',
    'aboutPage.contact.mail': 'البريد',
    'aboutPage.contact.social': 'التواصل',
    'aboutPage.contact.hq': 'المقر',
    'aboutPage.contact.hqValue': 'Prem Nagar 1st, Kota, Rajasthan 324004',
    'aboutPage.footer': '© 2026 Akromeda | صُمم للتميّز',

    // Privacy Page
    'privacyPage.badge': 'الخصوصية والشفافية',
    'privacyPage.title': 'سياسة الخصوصية',
    'privacyPage.subtitle': 'نجمع فقط ما نحتاجه لتشغيل الخدمة وتأمينها.',
    'privacyPage.lastUpdated': 'آخر تحديث: 7 فبراير 2026',
    'privacyPage.sections.zeroRetention.title': 'احتفاظ لمدة 24 ساعة',
    'privacyPage.sections.zeroRetention.desc': 'يتم تخزين الملفات المرفوعة والنتائج المُولدة لمدة تصل إلى 24 ساعة لتتمكن من تنزيلها. يجب عليك تنزيل ملفاتك بنفسك؛ نحن لا نقوم بتنزيل الملفات أو استرجاعها أو حذفها يدويًا نيابةً عنك. بعد 24 ساعة، تُحذف الملفات والنتائج نهائيًا ولا يمكن استعادتها.',
    'privacyPage.sections.encryption.title': 'التشفير أثناء النقل',
    'privacyPage.sections.encryption.desc': 'تُشفّر البيانات أثناء الرفع والنقل. نستخدم مزودين موثوقين وضوابط أمان معيارية في الصناعة.',
    'privacyPage.sections.noTracking.title': 'لا تتبع إعلاني',
    'privacyPage.sections.noTracking.desc': 'لا نبيع بياناتك ولا نشغّل متتبعات إعلانية. قد نستخدم أدوات مكافحة إساءة الاستخدام مثل reCAPTCHA التي قد تجمع إشارات الجهاز وتضع ملفات تعريف الارتباط.',
    'privacyPage.sections.aiPowered.title': 'معالجة مؤتمتة',
    'privacyPage.sections.aiPowered.desc': 'المعالجة تتم بشكل أساسي آليًا. الوصول إلى البيانات محدود للموظفين المخوّلين للدعم أو للأسباب القانونية.',
    'privacyPage.sections.compliance.title': 'خصوصية مدروسة',
    'privacyPage.sections.compliance.desc': 'نهدف إلى اتباع مبادئ الخصوصية وأن نكون شفافين حول كيفية استخدام البيانات.',
    'privacyPage.aboutTitle': 'حول Akromeda',
    'privacyPage.aboutP1':
      'Akromeda أداة ذكية وسريعة وآمنة لتحويل كشوف الحساب من PDF إلى Excel بدقة وسهولة.',
    'privacyPage.aboutP2Prefix': 'تم إنشاء هذه المنصة بواسطة',
    'privacyPage.aboutP2Suffix':
      ', طالب أمن سيبراني في جامعة هارفارد، مقيم في كوتا، راجستان، الهند. في عام 2026، بعمر 18 عامًا، أطلق فايزان Akromeda لمساعدة الأفراد والشركات على توفير الوقت والجهد في البيانات المالية.',
    'privacyPage.whatTitle': 'ماذا تفعل Akromeda',
    'privacyPage.whatItems.item1': 'تحوّل ملفات PDF المعقدة لكشوف الحساب إلى جداول Excel نظيفة وقابلة للتحرير',
    'privacyPage.whatItems.item2': 'تحافظ على التنسيق والأعمدة ووضوح المعاملات',
    'privacyPage.whatItems.item3': 'تعمل فورًا — دون تثبيت برامج',
    'privacyPage.whatItems.item4': 'مصممة بخصوصية وأمان البيانات في جوهرها',
    'privacyPage.contactTitle': 'أسئلة؟',
    'privacyPage.contactDescPrefix': 'للاستفسارات حول الخصوصية، تواصل مع',
    'privacyPage.footer': '(c) 2026 Akromeda. جميع الحقوق محفوظة.',

    // Settings Page
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'أدر حسابك وتفضيلاتك وإعدادات الخصوصية',
    'settings.searchPlaceholder': 'ابحث في الإعدادات...',
    'settings.backToHome': 'العودة إلى الصفحة الرئيسية',
    'settings.verified': 'موثّق',
    'settings.noResults': 'لم يتم العثور على إعدادات مطابقة لبحثك.',
    'settings.categories.all': 'الكل',
    'settings.categories.profile': 'الملف الشخصي',
    'settings.categories.usage': 'الاستخدام',
    'settings.categories.notifications': 'الإشعارات',
    'settings.categories.appearance': 'المظهر',
    'settings.categories.privacy': 'الخصوصية',
    'settings.categories.advanced': 'متقدم',
    'settings.profile.email': 'عنوان البريد الإلكتروني',
    'settings.profile.emailDesc': 'عنوان بريد حسابك',
    'settings.profile.name': 'اسم العرض',
    'settings.profile.nameDesc': 'اسمك المعروض للجمهور',
    'settings.profile.namePlaceholder': 'أدخل اسمك',
    'settings.profile.password': 'كلمة المرور',
    'settings.profile.passwordDesc': 'غيّر كلمة مرور حسابك',
    'settings.profile.changePassword': 'تغيير كلمة المرور',
    'settings.usage.stats': 'إحصائيات التحويل',
    'settings.usage.statsDesc': 'استخدامك اليومي للتحويلات',
    'settings.usage.conversionsToday': 'تحويلات اليوم',
    'settings.usage.remaining': 'المتبقي',
    'settings.usage.subscription': 'خطة الاشتراك',
    'settings.usage.subscriptionDesc': 'فئة اشتراكك الحالية',
    'settings.usage.freeTier': 'الخطة المجانية',
    'settings.usage.anonymous': 'مجهول',
    'settings.usage.upgrade': 'ترقية',
    'settings.notifications.email': 'إشعارات البريد الإلكتروني',
    'settings.notifications.emailDesc': 'تلقي التحديثات عبر البريد',
    'settings.notifications.push': 'إشعارات الدفع',
    'settings.notifications.pushDesc': 'إشعارات المتصفح',
    'settings.notifications.sound': 'مؤثرات صوتية',
    'settings.notifications.soundDesc': 'تشغيل الأصوات للإشعارات',
    'settings.appearance.theme': 'المظهر',
    'settings.appearance.themeDesc': 'التبديل بين الوضع الفاتح والداكن',
    'settings.appearance.language': 'اللغة',
    'settings.appearance.languageDesc': 'اختر لغتك المفضلة',
    'settings.privacy.visibility': 'مرئية الملف الشخصي',
    'settings.privacy.visibilityDesc': 'تحكم في من يمكنه رؤية ملفك',
    'settings.privacy.manage': 'إدارة',
    'settings.privacy.data': 'تصدير البيانات',
    'settings.privacy.dataDesc': 'نزّل نسخة من بياناتك',
    'settings.privacy.download': 'تنزيل',
    'settings.privacy.delete': 'حذف الحساب',
    'settings.privacy.deleteDesc': 'حذف حسابك وبياناتك نهائيًا',
    'settings.privacy.deleteAccount': 'حذف الحساب',
    'settings.advanced.autoDownload': 'تنزيل تلقائي',
    'settings.advanced.autoDownloadDesc': 'تنزيل الملفات المحوّلة تلقائيًا',

    // Chat Aura
    'chatAura.greeting': 'مرحبًا! أنا Chat Aura، مساعدك المالي. كيف يمكنني مساعدتك اليوم؟',
    'chatAura.greetingWithPdf': 'مرحبًا! لقد حملت مستندك ({fileName}). اسألني أي شيء عنه!',
    'chatAura.subtitle': 'مساعدك المالي بالذكاء الاصطناعي',
    'chatAura.remaining': 'محادثات متبقية',
    'chatAura.placeholder': 'اسأل عن كشف حسابك...',
    'chatAura.errorResponse': 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.',
    'chatAura.limitReached': 'تم الوصول إلى حد المحادثات',
    'chatAura.signUpForMore': 'سجّل للحصول على محادثات غير محدودة',
    'chatAura.signUp': 'سجّل',
    
    // Language
    'language': 'العربية',
  },
};

const languageNames: Record<Language, string> = {
  en: 'English',
  zh: '简体',
  ja: '日本語',
  es: 'Español',
  it: 'Italiano',
  ar: 'العربية',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export { languageNames };
