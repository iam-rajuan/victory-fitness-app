import { Platform } from 'react-native';

export const GERMANY_APP_HOST = 'victoryfitnessapp.de';

function normalizeHostname(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

export function getWebHostname() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return '';
  }
  return normalizeHostname(window.location.hostname);
}

export function isGermanyDomain(hostname = getWebHostname()) {
  return normalizeHostname(hostname) === GERMANY_APP_HOST;
}

export function getInitialRegionForDomainContext(detectedCountryCode?: string | null) {
  if (isGermanyDomain()) {
    return 'de';
  }

  const normalizedCode = String(detectedCountryCode || '').trim().toLowerCase();
  if (normalizedCode === 'gb') {
    return 'uk';
  }
  return normalizedCode || 'de';
}
