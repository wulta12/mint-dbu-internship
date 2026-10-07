import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key
});

export const LANGUAGE_STORAGE_KEY = 'mint_lang';

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // storage unavailable; ignore
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key) => {
      if (lang === 'en') return key;
      const dict = translations[lang] || {};
      return dict[key] ?? key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);