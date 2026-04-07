import React, { createContext, useContext, useState, useEffect } from 'react'; // Banklefy Language System
import { languageNames, translations, type Language } from "./languageData";
export type { Language } from "./languageData";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const supportedLanguages = new Set<Language>(Object.keys(translations) as Language[]);

const isSupportedLanguage = (value: string | null): value is Language => {
  if (!value) return false;
  return supportedLanguages.has(value as Language);
};

const isCorruptedTranslation = (value: string | undefined): boolean => {
  if (!value) return true;
  const text = value.trim();
  if (!text) return true;
  if (text.includes("\uFFFD")) return true;
  if (/\?{2,}/.test(text)) return true;
  return false;
};

const PROTECTED_TERMS: Array<{ term: string; pattern: RegExp }> = [
  { term: "Banklefy", pattern: /\bbanklefy\b/gi },
  { term: "Chat Aura", pattern: /\bchat\s+aura\b/gi },
  { term: "Tally", pattern: /\btally\b/gi },
  { term: "MT940", pattern: /\bmt\s*940\b/gi },
  { term: "FOIR", pattern: /\bfoir\b/gi },
  { term: "OCR", pattern: /\bocr\b/gi },
  { term: "PDF", pattern: /\bpdf\b/gi },
  { term: "CSV", pattern: /\bcsv\b/gi },
  { term: "JSON", pattern: /\bjson\b/gi },
  { term: "Excel", pattern: /\bexcel\b/gi },
  { term: "AI", pattern: /\bai\b/gi },
  { term: "UPI", pattern: /\bupi\b/gi },
  { term: "NEFT", pattern: /\bneft\b/gi },
  { term: "RTGS", pattern: /\brtgs\b/gi },
  { term: "IMPS", pattern: /\bimps\b/gi },
  { term: "API", pattern: /\bapi\b/gi },
  { term: "XML", pattern: /\bxml\b/gi },
];

const protectTerms = (value: string): string =>
  PROTECTED_TERMS.reduce((result, { term, pattern }) => result.replace(pattern, term), value);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('language');
      return isSupportedLanguage(saved) ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('language', language);
    } catch {
      // Ignore storage failures (privacy mode/quota)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(isSupportedLanguage(lang) ? lang : 'en');
  };

  const t = (key: string): string => {
    const localized = translations[language][key];
    if (!isCorruptedTranslation(localized)) return protectTerms(localized);

    const english = translations['en'][key];
    if (!isCorruptedTranslation(english)) return protectTerms(english);

    return key;
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



