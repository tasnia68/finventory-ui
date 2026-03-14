import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, translations } from '../i18n/translations';

const STORAGE_KEY = 'preferredLanguage';
const LANGUAGE_LOOKUP = Object.fromEntries(SUPPORTED_LANGUAGES.map((language) => [language.code, language]));

const LanguageContext = createContext(null);

const resolveTranslation = (language, key) => {
  const segments = key.split('.');
  let current = translations[language];

  for (const segment of segments) {
    current = current?.[segment];
    if (current === undefined) {
      break;
    }
  }

  if (current !== undefined) {
    return current;
  }

  let fallback = translations[DEFAULT_LANGUAGE];
  for (const segment of segments) {
    fallback = fallback?.[segment];
    if (fallback === undefined) {
      return key;
    }
  }

  return fallback;
};

const interpolate = (template, values) => {
  if (typeof template !== 'string' || !values) {
    return template;
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => values[token] ?? '');
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const storedLanguage = localStorage.getItem(STORAGE_KEY);
    if (storedLanguage && LANGUAGE_LOOKUP[storedLanguage]) {
      return storedLanguage;
    }
    return DEFAULT_LANGUAGE;
  });

  const languageConfig = LANGUAGE_LOOKUP[language] || LANGUAGE_LOOKUP[DEFAULT_LANGUAGE];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = languageConfig.locale;
  }, [language, languageConfig.locale]);

  const t = (key, values) => interpolate(resolveTranslation(language, key), values);

  const formatNumber = (value, options) => {
    return new Intl.NumberFormat(languageConfig.locale, options).format(value);
  };

  const formatCurrency = (value, options = {}) => {
    return new Intl.NumberFormat(languageConfig.locale, {
      style: 'currency',
      currency: options.currency || 'USD',
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
      minimumFractionDigits: options.minimumFractionDigits,
    }).format(value);
  };

  const formatDateTime = (value, options) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(languageConfig.locale, options).format(date);
  };

  const value = {
    language,
    locale: languageConfig.locale,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    t,
    formatNumber,
    formatCurrency,
    formatDateTime,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
};