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
    if (!isCorruptedTranslation(localized)) return localized;

    const english = translations['en'][key];
    if (!isCorruptedTranslation(english)) return english;

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





