import { Platform } from 'react-native';
import type { LanguageCode } from './i18n';
import { findCountryByCode, type CountryDialCode } from './phone';

export type DetectedLocaleCountry = {
  locale: string;
  country: CountryDialCode;
};

function getBrowserLocaleCandidates() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return [];
  }

  const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
  return [...languages, navigator.language].filter((value): value is string => Boolean(value));
}

function getIntlLocaleCandidate() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || '';
  } catch {
    return '';
  }
}

function extractRegionFromLocale(locale: string) {
  const normalizedLocale = String(locale || '').trim().replace(/_/g, '-');
  if (!normalizedLocale) {
    return '';
  }

  try {
    const parsedLocale = new Intl.Locale(normalizedLocale);
    const region = parsedLocale.region || parsedLocale.maximize().region || '';
    if (/^[A-Z]{2}$/i.test(region)) {
      return region.toUpperCase();
    }
  } catch {
    // Some older webviews have incomplete Intl.Locale support, so keep a safe fallback below.
  }

  const regionMatch = normalizedLocale.match(/(?:^|-)u-/i)
    ? normalizedLocale.split(/-u-/i)[0].match(/-([A-Z]{2}|\d{3})$/i)
    : normalizedLocale.match(/-([A-Z]{2}|\d{3})(?:-|$)/i);
  return regionMatch && /^[A-Z]{2}$/i.test(regionMatch[1]) ? regionMatch[1].toUpperCase() : '';
}

function extractLanguageFromLocale(locale: string) {
  const language = String(locale || '').trim().split(/[-_]/)[0]?.toLowerCase() || '';
  return language === 'de' || language === 'en' ? language : '';
}

export function detectCountryFromDeviceLocale(localeOverride?: string): DetectedLocaleCountry | null {
  const localeCandidates = localeOverride
    ? [localeOverride]
    : [...getBrowserLocaleCandidates(), getIntlLocaleCandidate()];

  for (const locale of localeCandidates) {
    const region = extractRegionFromLocale(locale);
    const country = findCountryByCode(region);
    if (country) {
      return { locale, country };
    }
  }

  return null;
}

export function detectLanguageFromDeviceLocale(localeOverride?: string): LanguageCode | null {
  const localeCandidates = localeOverride
    ? [localeOverride]
    : [...getBrowserLocaleCandidates(), getIntlLocaleCandidate()];

  for (const locale of localeCandidates) {
    const language = extractLanguageFromLocale(locale);
    if (language) {
      return language;
    }
  }

  return null;
}
