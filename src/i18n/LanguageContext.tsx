import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  STORAGE_LANG_KEY,
  TRANSLATIONS,
  type Locale,
} from './translations';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (typeof TRANSLATIONS)['en'] | (typeof TRANSLATIONS)['es'];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved === 'en' || saved === 'es') {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return 'en';
  });

  useEffect(() => {
    document.documentElement.lang = locale === 'es' ? 'es-US' : 'en-US';
    try {
      localStorage.setItem(STORAGE_LANG_KEY, locale);
    } catch {
      // Ignore storage errors
    }
  }, [locale]);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
  };

  const toggleLocale = () => {
    setLocaleState((prev) => (prev === 'en' ? 'es' : 'en'));
  };

  const value: LanguageContextValue = {
    locale,
    setLocale,
    toggleLocale,
    t: TRANSLATIONS[locale],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

interface LanguageToggleProps {
  highContrast?: boolean;
  className?: string;
}

/**
 * Quick-access frosted-glass segmented toggle pill (EN | ES) for the top header bar.
 */
export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  highContrast = false,
  className = '',
}) => {
  const { locale, toggleLocale, t } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      data-testid="language-toggle-btn"
      aria-label={t.langToggleLabel}
      title={t.langToggleLabel}
      className={`min-h-[38px] sm:min-h-[40px] p-0.5 sm:p-1 rounded-2xl text-[11px] sm:text-xs font-extrabold flex items-center gap-0.5 transition active:scale-95 touch-manipulation select-none whitespace-nowrap shrink-0 ${
        highContrast
          ? 'bg-slate-900 text-white border-2 border-white'
          : 'glass-pill'
      } ${className}`}
    >
      <span
        className={`px-1.5 sm:px-2 py-1 rounded-xl transition-all leading-none ${
          locale === 'en'
            ? highContrast
              ? 'bg-emerald-400 text-slate-950 font-black'
              : 'futuristic-cta shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        EN
      </span>
      <span
        className={`px-1.5 sm:px-2 py-1 rounded-xl transition-all leading-none ${
          locale === 'es'
            ? highContrast
              ? 'bg-emerald-400 text-slate-950 font-black'
              : 'futuristic-cta shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        ES
      </span>
    </button>
  );
};
