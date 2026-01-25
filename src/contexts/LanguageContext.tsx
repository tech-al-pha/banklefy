import React, { createContext, useContext, useState, useEffect } from 'react'; // Akromeda Language System

export type Language = 'en' | 'zh' | 'ja' | 'es' | 'it';

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
    
    // Hero
    'hero.title': 'AI Bank Statement Converter',
    'hero.subtitle': 'Transform your bank statements into organized Excel files instantly with AI-powered precision.',
    'hero.uploadBtn': 'Upload Your Statement Now',
    'hero.pricingBtn': 'View Pricing',
    
    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.step1.title': 'Upload',
    'howItWorks.step1.desc': 'Upload your PDF or image bank statement',
    'howItWorks.step2.title': 'Process',
    'howItWorks.step2.desc': 'AI extracts and categorizes transactions',
    'howItWorks.step3.title': 'Download',
    'howItWorks.step3.desc': 'Get organized Excel file instantly',
    
    // Features
    'features.title': 'Features',
    'features.accuracy': '100% Accuracy',
    'features.accuracyDesc': 'AI-powered extraction ensures zero errors',
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
    'footer.cta.title': 'Ready to Transform Your',
    'footer.cta.subtitle': 'Financial Workflow?',
    'footer.cta.desc': 'Join thousands of businesses and individuals who trust Akromeda for accurate, instant bank statement conversions.',
    'footer.cta.btn': 'Start Converting Now',
    'footer.copyright': '© 2026 Akromeda. Created by Faizan Rizvi.',
    
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
      'Export to Excel, CSV, JSON, and branded PDF reports — optimized for accounting and analysis.',
    'featuresPage.items.ruleBased.title': 'RULE-BASED ACCURACY',
    'featuresPage.items.ruleBased.desc':
      'Deterministic calculations: no hallucinations, no guessing — every number is computed with precision and can be explained.',
    'featuresPage.items.dailyLimits.title': 'DAILY RESET LIMITS',
    'featuresPage.items.dailyLimits.desc':
      'Limits reset daily at midnight local time. Anonymous users get 2/day; registered users get 6/day.',

    'featuresPage.cta.title': 'Ready to Experience All Features?',
    'featuresPage.cta.desc':
      'Start converting now with 2 free conversions daily. Sign up for 6 daily conversions and unlock the full power of Akromeda.',
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
    'aboutPage.valueProps.accuracy.title': '100% Accuracy',
    'aboutPage.valueProps.accuracy.desc': 'Zero-error conversion designed for high-stakes financial data.',
    'aboutPage.connectTitle': 'Connect with the Creator',
    'aboutPage.contact.hotline': 'Hotline',
    'aboutPage.contact.mail': 'Direct Mail',
    'aboutPage.contact.social': 'Social',
    'aboutPage.contact.hq': 'HQ',
    'aboutPage.contact.hqValue': 'Kota, Rajasthan, India',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'Your Privacy Matters',
    'privacyPage.title': 'Privacy Policy',
    'privacyPage.subtitle': 'Your data is treated like gold — private, secure, and never stored.',
    'privacyPage.lastUpdated': 'Last updated: 2026',
    'privacyPage.sections.zeroRetention.title': 'Zero Data Retention',
    'privacyPage.sections.zeroRetention.desc':
      "Your uploaded files are automatically deleted after conversion. We don't keep anything beyond the processing time needed.",
    'privacyPage.sections.encryption.title': 'End-to-End Encryption',
    'privacyPage.sections.encryption.desc':
      'All file transfers are encrypted. Your documents stay protected during upload, processing, and download.',
    'privacyPage.sections.noTracking.title': 'No Tracking',
    'privacyPage.sections.noTracking.desc':
      "No ads, no profiling, no hidden scripts. We don't track you — your privacy is respected at every step.",
    'privacyPage.sections.aiPowered.title': 'AI-Powered, Human-Free',
    'privacyPage.sections.aiPowered.desc':
      'Your data is processed by secure AI systems — no human views your files. Everything is automated, private, and confidential.',
    'privacyPage.sections.compliance.title': 'Compliance-Ready',
    'privacyPage.sections.compliance.desc':
      'Built with modern privacy standards in mind (GDPR/CCPA-ready) to protect your rights and data.',
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
    'privacyPage.contactTitle': 'Questions or Concerns?',
    'privacyPage.contactDescPrefix': 'You stay in control. Always. For any concerns, reach out at',
    'privacyPage.footer': '© 2026 Akromeda. All rights reserved.',
    
    // Settings Page
    'settings.title': 'Settings',
    'settings.searchPlaceholder': 'Search settings...',
    'settings.noResults': 'No settings found',
    'settings.comingSoon': 'Coming Soon',
    'settings.categories.account': 'Account',
    'settings.categories.notifications': 'Notifications',
    'settings.categories.appearance': 'Appearance',
    'settings.categories.privacy': 'Privacy & Security',
    'settings.categories.subscription': 'Subscription',
    'settings.categories.support': 'Support',
    'settings.categories.danger': 'Danger Zone',
    'settings.account.email': 'Email Address',
    'settings.account.emailDesc': 'Your registered email',
    'settings.account.verified': 'Verified',
    'settings.account.password': 'Password',
    'settings.account.passwordDesc': 'Change your password',
    'settings.account.resetPassword': 'Reset Password',
    'settings.notifications.email': 'Email Notifications',
    'settings.notifications.emailDesc': 'Receive updates via email',
    'settings.notifications.push': 'Push Notifications',
    'settings.notifications.pushDesc': 'Browser push notifications',
    'settings.notifications.sound': 'Sound Effects',
    'settings.notifications.soundDesc': 'Play sounds for actions',
    'settings.appearance.darkMode': 'Dark Mode',
    'settings.appearance.darkModeDesc': 'Use dark theme',
    'settings.appearance.language': 'Language',
    'settings.appearance.languageDesc': 'Select your language',
    'settings.privacy.usageStats': 'Usage Statistics',
    'settings.privacy.usageStatsDesc': 'Show conversion stats',
    'settings.privacy.twoFactor': 'Two-Factor Auth',
    'settings.privacy.twoFactorDesc': 'Extra security layer',
    'settings.subscription.plan': 'Current Plan',
    'settings.subscription.planDesc': 'Manage subscription',
    'settings.subscription.free': 'Free',
    'settings.subscription.upgrade': 'Upgrade',
    'settings.support.help': 'Help & Support',
    'settings.support.helpDesc': 'Get assistance',
    'settings.support.contact': 'Contact Us',
    'settings.danger.deleteAccount': 'Delete Account',
    'settings.danger.deleteAccountDesc': 'Permanently delete account',
    'settings.danger.delete': 'Delete',
    'settings.deleteAccount.warning': 'Warning',
    'settings.deleteAccount.contact': 'Please contact support to delete your account.',
    'settings.password.emailSent': 'Email Sent',
    'settings.password.checkInbox': 'Check your inbox for password reset link.',
    'settings.password.error': 'Error',
    'settings.password.tryAgain': 'Failed to send reset email. Try again.',
    
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
    
    // Hero
    'hero.title': 'AI银行对账单转换器',
    'hero.subtitle': '使用AI驱动的精度，即时将您的银行对账单转换为有组织的Excel文件。',
    'hero.uploadBtn': '立即上传您的对账单',
    'hero.pricingBtn': '查看价格',
    
    // How It Works
    'howItWorks.title': '使用方法',
    'howItWorks.step1.title': '上传',
    'howItWorks.step1.desc': '上传您的PDF或图片银行对账单',
    'howItWorks.step2.title': '处理',
    'howItWorks.step2.desc': 'AI提取并分类交易',
    'howItWorks.step3.title': '下载',
    'howItWorks.step3.desc': '立即获取有组织的Excel文件',
    
    // Features
    'features.title': '功能特点',
    'features.accuracy': '100%准确',
    'features.accuracyDesc': 'AI驱动的提取确保零错误',
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
    'footer.cta.title': '准备好改变您的',
    'footer.cta.subtitle': '财务工作流程？',
    'footer.cta.desc': '加入数千家信任Akromeda进行准确、即时银行对账单转换的企业和个人。',
    'footer.cta.btn': '立即开始转换',
    'footer.copyright': '© 2026 Akromeda。由Faizan Rizvi创建。',
    
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
      '支持导出 Excel、CSV、JSON 与品牌 PDF 报告，便于对账与分析。',
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
    'aboutPage.valueProps.accuracy.title': '100% 准确',
    'aboutPage.valueProps.accuracy.desc': '面向高风险金融数据的零错误转换。',
    'aboutPage.connectTitle': '联系创作者',
    'aboutPage.contact.hotline': '热线',
    'aboutPage.contact.mail': '邮箱',
    'aboutPage.contact.social': '社交',
    'aboutPage.contact.hq': '总部',
    'aboutPage.contact.hqValue': '印度 拉贾斯坦邦 科塔',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': '你的隐私很重要',
    'privacyPage.title': '隐私政策',
    'privacyPage.subtitle': '你的数据像黄金一样被对待：私密、安全、从不保存。',
    'privacyPage.lastUpdated': '最后更新：2026',
    'privacyPage.sections.zeroRetention.title': '零数据留存',
    'privacyPage.sections.zeroRetention.desc': '文件在转换完成后会自动删除，仅在处理期间短暂存在。',
    'privacyPage.sections.encryption.title': '端到端加密',
    'privacyPage.sections.encryption.desc': '文件传输全程加密，上传、处理与下载过程均受保护。',
    'privacyPage.sections.noTracking.title': '不追踪',
    'privacyPage.sections.noTracking.desc': '无广告、无画像、无隐藏脚本，我们不会追踪你。',
    'privacyPage.sections.aiPowered.title': 'AI 自动处理（无人查看）',
    'privacyPage.sections.aiPowered.desc': '由安全的 AI 系统自动处理，无人工查看文件，私密且保密。',
    'privacyPage.sections.compliance.title': '合规就绪',
    'privacyPage.sections.compliance.desc': '遵循现代隐私标准（可对齐 GDPR/CCPA），保护你的权利与数据。',
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
    'privacyPage.contactTitle': '有问题或顾虑？',
    'privacyPage.contactDescPrefix': '你始终掌控一切。如有任何问题，请联系：',
    'privacyPage.footer': '© 2026 Akromeda。保留所有权利。',
    
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
    
    // Hero
    'hero.title': 'AI銀行明細書コンバーター',
    'hero.subtitle': 'AI搭載の精度で、銀行明細書を整理されたExcelファイルに即座に変換します。',
    'hero.uploadBtn': '今すぐ明細書をアップロード',
    'hero.pricingBtn': '価格を見る',
    
    // How It Works
    'howItWorks.title': '使い方',
    'howItWorks.step1.title': 'アップロード',
    'howItWorks.step1.desc': 'PDFまたは画像の銀行明細書をアップロード',
    'howItWorks.step2.title': '処理',
    'howItWorks.step2.desc': 'AIが取引を抽出して分類',
    'howItWorks.step3.title': 'ダウンロード',
    'howItWorks.step3.desc': '整理されたExcelファイルを即座に取得',
    
    // Features
    'features.title': '機能',
    'features.accuracy': '100%正確',
    'features.accuracyDesc': 'AI搭載の抽出でエラーゼロを保証',
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
    'footer.cta.title': '変革の準備はできましたか',
    'footer.cta.subtitle': '財務ワークフロー？',
    'footer.cta.desc': '正確で即座の銀行明細書変換でAkromedaを信頼する何千もの企業や個人に参加しましょう。',
    'footer.cta.btn': '今すぐ変換を開始',
    'footer.copyright': '© 2026 Akromeda。Faizan Rizviが作成。',
    
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
    'featuresPage.items.exportFormats.desc': 'Excel/CSV/JSON/ブランドPDFに対応し、会計や分析に最適です。',
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
    'aboutPage.valueProps.accuracy.title': '高精度',
    'aboutPage.valueProps.accuracy.desc': '重要な金融データ向けにエラーを極限まで削減。',
    'aboutPage.connectTitle': '創設者に連絡',
    'aboutPage.contact.hotline': '電話',
    'aboutPage.contact.mail': 'メール',
    'aboutPage.contact.social': 'SNS',
    'aboutPage.contact.hq': '拠点',
    'aboutPage.contact.hqValue': 'インド・ラジャスタン州 コタ',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'プライバシーを尊重します',
    'privacyPage.title': 'プライバシーポリシー',
    'privacyPage.subtitle': 'あなたのデータは金のように扱います：非公開・安全・保存しません。',
    'privacyPage.lastUpdated': '最終更新：2026',
    'privacyPage.sections.zeroRetention.title': 'データ非保持',
    'privacyPage.sections.zeroRetention.desc': '変換後に自動削除。処理に必要な時間以外は保持しません。',
    'privacyPage.sections.encryption.title': 'エンドツーエンド暗号化',
    'privacyPage.sections.encryption.desc': '転送は暗号化され、アップロードからダウンロードまで保護します。',
    'privacyPage.sections.noTracking.title': '追跡なし',
    'privacyPage.sections.noTracking.desc': '広告なし、プロファイリングなし。追跡しません。',
    'privacyPage.sections.aiPowered.title': 'AI処理（人は見ません）',
    'privacyPage.sections.aiPowered.desc': '安全なAIが自動処理し、人がファイルを見ることはありません。',
    'privacyPage.sections.compliance.title': 'コンプライアンス対応',
    'privacyPage.sections.compliance.desc': 'GDPR/CCPAを意識した設計で、権利とデータを守ります。',
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
    'privacyPage.contactTitle': '質問や懸念はありますか？',
    'privacyPage.contactDescPrefix': 'あなたが常に主導権を持ちます。お問い合わせ：',
    'privacyPage.footer': '© 2026 Akromeda. All rights reserved.',
    
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
    
    // Hero
    'hero.title': 'Convertidor de Extractos Bancarios con IA',
    'hero.subtitle': 'Transforma tus extractos bancarios en archivos Excel organizados al instante con precisión impulsada por IA.',
    'hero.uploadBtn': 'Sube tu extracto ahora',
    'hero.pricingBtn': 'Ver precios',
    
    // How It Works
    'howItWorks.title': 'Cómo funciona',
    'howItWorks.step1.title': 'Subir',
    'howItWorks.step1.desc': 'Sube tu extracto bancario en PDF o imagen',
    'howItWorks.step2.title': 'Procesar',
    'howItWorks.step2.desc': 'La IA extrae y categoriza las transacciones',
    'howItWorks.step3.title': 'Descargar',
    'howItWorks.step3.desc': 'Obtén un archivo Excel organizado al instante',
    
    // Features
    'features.title': 'Características',
    'features.accuracy': '100% Precisión',
    'features.accuracyDesc': 'La extracción impulsada por IA garantiza cero errores',
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
    'footer.cta.title': '¿Listo para transformar tu',
    'footer.cta.subtitle': 'flujo de trabajo financiero?',
    'footer.cta.desc': 'Únete a miles de empresas e individuos que confían en Akromeda para conversiones de extractos bancarios precisas e instantáneas.',
    'footer.cta.btn': 'Comienza a convertir ahora',
    'footer.copyright': '© 2026 Akromeda. Creado por Faizan Rizvi.',
    
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
    'featuresPage.items.exportFormats.desc': 'Exporta Excel, CSV, JSON y PDF con marca para análisis y contabilidad.',
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
    'aboutPage.valueProps.accuracy.title': 'Alta precisión',
    'aboutPage.valueProps.accuracy.desc': 'Conversión sin errores para datos financieros críticos.',
    'aboutPage.connectTitle': 'Conecta con el creador',
    'aboutPage.contact.hotline': 'Teléfono',
    'aboutPage.contact.mail': 'Correo',
    'aboutPage.contact.social': 'Social',
    'aboutPage.contact.hq': 'Sede',
    'aboutPage.contact.hqValue': 'Kota, Rajasthan, India',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'Tu privacidad importa',
    'privacyPage.title': 'Política de privacidad',
    'privacyPage.subtitle': 'Tus datos se tratan como oro: privados, seguros y nunca almacenados.',
    'privacyPage.lastUpdated': 'Última actualización: 2026',
    'privacyPage.sections.zeroRetention.title': 'Cero retención de datos',
    'privacyPage.sections.zeroRetention.desc': 'Los archivos se eliminan automáticamente tras la conversión.',
    'privacyPage.sections.encryption.title': 'Cifrado de extremo a extremo',
    'privacyPage.sections.encryption.desc': 'Transferencias cifradas; protegemos tus documentos en todo el proceso.',
    'privacyPage.sections.noTracking.title': 'Sin seguimiento',
    'privacyPage.sections.noTracking.desc': 'Sin anuncios ni perfilado. Respetamos tu privacidad en cada paso.',
    'privacyPage.sections.aiPowered.title': 'IA, sin humanos',
    'privacyPage.sections.aiPowered.desc': 'Procesamiento automático por IA segura; nadie ve tus archivos.',
    'privacyPage.sections.compliance.title': 'Listo para cumplimiento',
    'privacyPage.sections.compliance.desc': 'Pensado para estándares modernos de privacidad (GDPR/CCPA).',
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
    'privacyPage.contactTitle': '¿Preguntas o inquietudes?',
    'privacyPage.contactDescPrefix': 'Tú tienes el control. Para cualquier consulta, escribe a',
    'privacyPage.footer': '© 2026 Akromeda. Todos los derechos reservados.',
    
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
    
    // Hero
    'hero.title': 'Convertitore di Estratti Conto con IA',
    'hero.subtitle': "Trasforma i tuoi estratti conto in file Excel organizzati istantaneamente con precisione basata sull'IA.",
    'hero.uploadBtn': 'Carica il tuo estratto conto ora',
    'hero.pricingBtn': 'Vedi prezzi',
    
    // How It Works
    'howItWorks.title': 'Come funziona',
    'howItWorks.step1.title': 'Carica',
    'howItWorks.step1.desc': 'Carica il tuo estratto conto in PDF o immagine',
    'howItWorks.step2.title': 'Elabora',
    'howItWorks.step2.desc': "L'IA estrae e categorizza le transazioni",
    'howItWorks.step3.title': 'Scarica',
    'howItWorks.step3.desc': 'Ottieni un file Excel organizzato istantaneamente',
    
    // Features
    'features.title': 'Funzionalità',
    'features.accuracy': '100% Precisione',
    'features.accuracyDesc': "L'estrazione basata sull'IA garantisce zero errori",
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
    'footer.cta.title': 'Pronto a trasformare il tuo',
    'footer.cta.subtitle': 'flusso di lavoro finanziario?',
    'footer.cta.desc': 'Unisciti a migliaia di aziende e privati che si affidano ad Akromeda per conversioni di estratti conto accurate e istantanee.',
    'footer.cta.btn': 'Inizia a convertire ora',
    'footer.copyright': '© 2026 Akromeda. Creato da Faizan Rizvi.',
    
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
    'featuresPage.items.exportFormats.desc': 'Esporta Excel, CSV, JSON e PDF brandizzati per analisi e contabilità.',
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
    'aboutPage.valueProps.accuracy.title': 'Alta precisione',
    'aboutPage.valueProps.accuracy.desc': 'Conversione a zero errori per dati finanziari critici.',
    'aboutPage.connectTitle': 'Contatta il creatore',
    'aboutPage.contact.hotline': 'Telefono',
    'aboutPage.contact.mail': 'Email',
    'aboutPage.contact.social': 'Social',
    'aboutPage.contact.hq': 'Sede',
    'aboutPage.contact.hqValue': 'Kota, Rajasthan, India',
    'aboutPage.footer': '© 2026 Akromeda | Engineered for Excellence',

    // Privacy Page
    'privacyPage.badge': 'La tua privacy conta',
    'privacyPage.title': 'Informativa sulla privacy',
    'privacyPage.subtitle': 'I tuoi dati sono trattati come oro: privati, sicuri e mai archiviati.',
    'privacyPage.lastUpdated': 'Ultimo aggiornamento: 2026',
    'privacyPage.sections.zeroRetention.title': 'Zero retention dei dati',
    'privacyPage.sections.zeroRetention.desc': 'I file vengono eliminati automaticamente dopo la conversione.',
    'privacyPage.sections.encryption.title': 'Cifratura end-to-end',
    'privacyPage.sections.encryption.desc': 'Trasferimenti cifrati e documenti protetti in ogni fase.',
    'privacyPage.sections.noTracking.title': 'Nessun tracking',
    'privacyPage.sections.noTracking.desc': 'Niente pubblicità o profilazione. Rispettiamo la tua privacy.',
    'privacyPage.sections.aiPowered.title': 'IA, senza umani',
    'privacyPage.sections.aiPowered.desc': 'Elaborazione automatica con IA sicura; nessuno vede i tuoi file.',
    'privacyPage.sections.compliance.title': 'Pronto per la compliance',
    'privacyPage.sections.compliance.desc': 'Pensato per standard moderni (GDPR/CCPA).',
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
    'privacyPage.contactTitle': 'Domande o dubbi?',
    'privacyPage.contactDescPrefix': 'Hai sempre il controllo. Per qualsiasi richiesta, scrivi a',
    'privacyPage.footer': '© 2026 Akromeda. Tutti i diritti riservati.',
    
    // Language
    'language': 'Italiano',
  },
};

const languageNames: Record<Language, string> = {
  en: 'English',
  zh: '简体',
  ja: '日本語',
  es: 'Español',
  it: 'Italiano',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
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
