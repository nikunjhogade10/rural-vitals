import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { i18nService } from '../services';
import { LOCAL_TRANSLATIONS } from '../i18n/translations';

// Translation cache (local + remote merged)
const cache: Record<string, Record<string, string>> = {};

interface I18nContextType {
  t: (key: string, fallback?: string) => string;
  locale: string;
  setLocale: (l: string) => void;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType>({
  t: (_, fallback) => fallback || '',
  locale: 'en',
  setLocale: () => {},
  loading: false,
});

export function I18nProvider({ children, initialLocale = 'en' }: { children: React.ReactNode; initialLocale?: string }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadTranslations = useCallback(async (loc: string) => {
    // English → no translations needed, use fallbacks
    if (loc === 'en') {
      cache['en'] = {};
      setTranslations({});
      return;
    }

    // 1. Apply local bundle immediately (offline-first — no spinner, instant switch)
    const local = LOCAL_TRANSLATIONS[loc] ?? {};
    cache[loc] = { ...local };        // seed cache with local data
    setTranslations({ ...local });    // render right away

    // 2. Try to merge backend translations on top (when online)
    if (navigator.onLine) {
      try {
        const data = await i18nService.getTranslations(loc);
        const remote = data.translations || {};
        // Remote takes precedence over local bundle
        const merged = { ...local, ...remote };
        cache[loc] = merged;
        setTranslations(merged);
      } catch {
        // No network or backend error — local bundle already applied, nothing to do
      }
    }
  }, []);

  useEffect(() => {
    loadTranslations(locale);
  }, [locale, loadTranslations]);

  const setLocale = useCallback((l: string) => {
    setLocaleState(l);
  }, []);

  // t(key, fallback) — returns translated value or English fallback
  const t = useCallback((key: string, fallback = key) => {
    return translations[key] || fallback;
  }, [translations]);

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, loading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
