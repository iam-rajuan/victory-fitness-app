import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCurrentUser, getAuthUser, setApiLanguage, translateTextBatch } from './api';
import { isGermanyDomain } from './domainContext';
import { STATIC_TRANSLATIONS } from './translations';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'en-gh', label: 'English (Ghana)', nativeLabel: 'English (Ghana)' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'ak', label: 'Twi (Ghana)', nativeLabel: 'Twi / Akan' },
  { code: 'ee', label: 'Ewe (Ghana)', nativeLabel: 'Eʋegbe' },
  { code: 'gaa', label: 'Ga (Ghana)', nativeLabel: 'Ga' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Українська' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const DEFAULT_LANGUAGE: LanguageCode = 'en';
const GLOBAL_LANGUAGE_STORAGE_KEY = 'victory_app_preferred_language';
const LANGUAGE_STORAGE_KEY_PREFIX = 'victory-language:user:';
const TRANSLATION_CACHE_KEY_PREFIX = 'victory-translations:';
const TRANSLATION_BATCH_DELAY_MS = 120;
const SUPPORTED_LANGUAGE_CODES = new Set<string>(SUPPORTED_LANGUAGES.map((language) => language.code));

function getLanguageStorageKeyForUser(userId: string) {
  return `${LANGUAGE_STORAGE_KEY_PREFIX}${userId}`;
}

async function getSavedLanguageForUser(userId?: string | null): Promise<LanguageCode | null> {
  if (!userId) {
    return null;
  }

  const stored = await AsyncStorage.getItem(getLanguageStorageKeyForUser(userId)).catch(() => null);
  return isSupportedLanguageCode(stored) ? stored : null;
}

export function isSupportedLanguageCode(value?: string | null): value is LanguageCode {
  return SUPPORTED_LANGUAGE_CODES.has(String(value || '').trim().toLowerCase());
}

function normalizeLanguageCode(value?: string | null): LanguageCode | null {
  const normalized = String(value || '').trim().toLowerCase();
  return isSupportedLanguageCode(normalized) ? normalized : null;
}

const TRANSLATIONS: Partial<Record<LanguageCode, Record<string, string>>> = STATIC_TRANSLATIONS;

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  useDefaultLanguage: () => void;
  syncLanguageWithCurrentUser: (userId?: string | null) => Promise<LanguageCode>;
  t: (key: string, params?: Record<string, string | number>) => string;
  ready: boolean;
};

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? `{${key}}` : String(value);
  });
}

function getTranslationCacheKey(language: LanguageCode) {
  return `${TRANSLATION_CACHE_KEY_PREFIX}${language}`;
}

function shouldAutoTranslateText(value: string) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > 500) {
    return false;
  }
  if (/^https?:\/\//i.test(text) || /^[\d\s.,:%+/#-]+$/.test(text)) {
    return false;
  }
  return /[A-Za-z]/.test(text);
}

function getInitialLanguage(): LanguageCode {
  if (isGermanyDomain()) {
    return 'de';
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(GLOBAL_LANGUAGE_STORAGE_KEY);
      if (isSupportedLanguageCode(stored)) {
        return stored;
      }
    } catch {}
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>(getInitialLanguage);
  const [ready, setReady] = React.useState(false);
  const [remoteTranslations, setRemoteTranslations] = React.useState<Partial<Record<LanguageCode, Record<string, string>>>>({});
  const translationQueueRef = React.useRef(new Set<string>());
  const translationTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTranslationsRef = React.useRef(remoteTranslations);

  React.useEffect(() => {
    remoteTranslationsRef.current = remoteTranslations;
  }, [remoteTranslations]);

  React.useEffect(() => {
    let cancelled = false;
    const loadCachedTranslations = async () => {
      if (language === DEFAULT_LANGUAGE) {
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(getTranslationCacheKey(language)).catch(() => null);
        if (!raw || cancelled) {
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, string>;
        if (parsed && typeof parsed === 'object') {
          setRemoteTranslations((current) => ({
            ...current,
            [language]: { ...(current[language] || {}), ...parsed },
          }));
        }
      } catch {
        // Cached translations are an enhancement; a corrupt cache should not block the app.
      }
    };
    void loadCachedTranslations();
    return () => {
      cancelled = true;
    };
  }, [language]);

  const requestTranslations = React.useCallback(async (targetLanguage: LanguageCode, texts: string[]) => {
    if (targetLanguage === DEFAULT_LANGUAGE) {
      return {};
    }

    const uniqueTexts = Array.from(new Set(texts.map((text) => text.replace(/\s+/g, ' ').trim()).filter(shouldAutoTranslateText))).slice(0, 80);
    if (uniqueTexts.length === 0) {
      return {};
    }

    const known = remoteTranslationsRef.current[targetLanguage] || {};
    const missing = uniqueTexts.filter((text) => !TRANSLATIONS[targetLanguage]?.[text] && !known[text]);
    if (missing.length === 0) {
      return Object.fromEntries(uniqueTexts.map((text) => [text, TRANSLATIONS[targetLanguage]?.[text] || known[text] || text]));
    }

    try {
      const response = await translateTextBatch(targetLanguage, missing);
      const nextTranslations = response.translations || {};
      if (Object.keys(nextTranslations).length > 0) {
        setRemoteTranslations((current) => {
          const merged = {
            ...(current[targetLanguage] || {}),
            ...nextTranslations,
          };
          void AsyncStorage.setItem(getTranslationCacheKey(targetLanguage), JSON.stringify(merged)).catch(() => undefined);
          return {
            ...current,
            [targetLanguage]: merged,
          };
        });
      }
      return { ...known, ...nextTranslations };
    } catch {
      return known;
    }
  }, []);

  const queueTranslation = React.useCallback((key: string) => {
    if (language === DEFAULT_LANGUAGE || !shouldAutoTranslateText(key)) {
      return;
    }
    if (TRANSLATIONS[language]?.[key] || remoteTranslationsRef.current[language]?.[key]) {
      return;
    }
    translationQueueRef.current.add(key);
    if (translationTimerRef.current) {
      return;
    }
    translationTimerRef.current = setTimeout(() => {
      translationTimerRef.current = null;
      const batch = Array.from(translationQueueRef.current);
      translationQueueRef.current.clear();
      void requestTranslations(language, batch);
    }, TRANSLATION_BATCH_DELAY_MS);
  }, [language, requestTranslations]);

  React.useEffect(() => {
    let cancelled = false;

    const loadLanguage = async () => {
      try {
        let resolvedLanguage: LanguageCode | null = null;

        // 1. Check synchronous Web LocalStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const webStored = window.localStorage.getItem(GLOBAL_LANGUAGE_STORAGE_KEY);
            if (isSupportedLanguageCode(webStored)) {
              resolvedLanguage = webStored;
            }
          } catch {}
        }

        // 2. Check Global AsyncStorage
        if (!resolvedLanguage) {
          try {
            const globalStored = await AsyncStorage.getItem(GLOBAL_LANGUAGE_STORAGE_KEY).catch(() => null);
            if (isSupportedLanguageCode(globalStored)) {
              resolvedLanguage = globalStored;
            }
          } catch {}
        }

        // 3. Check cached Auth user
        const cachedUser = await getAuthUser().catch(() => null);
        const user = cachedUser?.preferred_language
          ? cachedUser
          : await fetchCurrentUser().catch(() => cachedUser);
        const userStored = await getSavedLanguageForUser(user?.id);
        const domainLanguage = isGermanyDomain() ? 'de' : null;
        const finalLanguage = domainLanguage ?? resolvedLanguage ?? userStored ?? normalizeLanguageCode(user?.preferred_language) ?? DEFAULT_LANGUAGE;

        if (!cancelled) {
          setLanguageState(finalLanguage);
          setApiLanguage(finalLanguage);
          if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.lang = finalLanguage;
          }
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void loadLanguage();

    return () => {
      cancelled = true;
    };
  }, []);

  const useDefaultLanguage = React.useCallback(() => {
    setLanguageState(DEFAULT_LANGUAGE);
    setApiLanguage(DEFAULT_LANGUAGE);
  }, []);

  const syncLanguageWithCurrentUser = React.useCallback(async (userId?: string | null) => {
    const cachedUser = await getAuthUser().catch(() => null);
    const user = cachedUser?.preferred_language
      ? cachedUser
      : await fetchCurrentUser().catch(() => cachedUser);
    const resolvedUserId = userId ?? user?.id ?? null;
    const nextLanguage = await getSavedLanguageForUser(resolvedUserId) ?? normalizeLanguageCode(user?.preferred_language) ?? DEFAULT_LANGUAGE;
    setLanguageState(nextLanguage);
    setApiLanguage(nextLanguage);
    return nextLanguage;
  }, []);

  const setLanguage = React.useCallback(async (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    setApiLanguage(nextLanguage);

    // Persist synchronously to Web LocalStorage and document
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(GLOBAL_LANGUAGE_STORAGE_KEY, nextLanguage);
      } catch {}
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = nextLanguage;
    }

    // Persist to AsyncStorage globally and per-user
    try {
      await AsyncStorage.setItem(GLOBAL_LANGUAGE_STORAGE_KEY, nextLanguage);
      const user = await getAuthUser().catch(() => null);
      if (user?.id) {
        await AsyncStorage.setItem(getLanguageStorageKeyForUser(user.id), nextLanguage);
      }
    } catch {}
  }, []);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) => {
      if (!key) return '';
      const template = TRANSLATIONS[language]?.[key] ?? remoteTranslations[language]?.[key] ?? TRANSLATIONS.en?.[key] ?? key;
      if (template === key && language !== DEFAULT_LANGUAGE) {
        queueTranslation(key);
      }
      return interpolate(template, params);
    },
    [language, queueTranslation, remoteTranslations],
  );

  const value = React.useMemo(
    () => ({ language, setLanguage, useDefaultLanguage, syncLanguageWithCurrentUser, t, ready }),
    [language, ready, setLanguage, syncLanguageWithCurrentUser, t, useDefaultLanguage],
  );

  return React.createElement(
    LanguageContext.Provider,
    { value },
    children,
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
