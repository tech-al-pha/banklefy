import React, { createContext, useContext, useState, useEffect } from 'react';

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
