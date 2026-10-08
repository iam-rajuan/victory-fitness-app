import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthUser } from './api';

export const GLOBAL_APP_HOST = 'app.victoryfitnessapp.com';
export const GERMANY_APP_HOST = 'victoryfitnessapp.de';
export const ROOT_MARKETING_HOST = 'victoryfitnessapp.com';
export const WWW_MARKETING_HOST = 'www.victoryfitnessapp.com';

const DOMAIN_REGION_CHOICE_KEY = 'victory-domain-region-choice';

type DomainRegionChoice = 'de' | 'global';

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

export function isGlobalAppDomain(hostname = getWebHostname()) {
  return normalizeHostname(hostname) === GLOBAL_APP_HOST;
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

export function isGermanyUser(user: Pick<AuthUser, 'country' | 'country_code'> | null | undefined) {
  const countryCode = String(user?.country_code || '').trim().toUpperCase();
  const country = String(user?.country || '').trim().toLowerCase();
  return countryCode === 'DE' || country === 'germany' || country === 'deutschland';
}

async function readStoredDomainChoice(): Promise<DomainRegionChoice | null> {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    const webStored = typeof window !== 'undefined'
      ? window.localStorage?.getItem(DOMAIN_REGION_CHOICE_KEY)
      : null;
    if (webStored === 'de' || webStored === 'global') {
      return webStored;
    }
  } catch {}

  try {
    const stored = await AsyncStorage.getItem(DOMAIN_REGION_CHOICE_KEY);
    return stored === 'de' || stored === 'global' ? stored : null;
  } catch {
    return null;
  }
}

export async function rememberExplicitCountryChoice(regionKey: string) {
  if (Platform.OS !== 'web') {
    return;
  }

  const choice: DomainRegionChoice = regionKey === 'de' ? 'de' : 'global';
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(DOMAIN_REGION_CHOICE_KEY, choice);
    }
  } catch {}
  try {
    await AsyncStorage.setItem(DOMAIN_REGION_CHOICE_KEY, choice);
  } catch {}
}

export async function shouldRedirectGermanyUserToGermanyDomain(user: Pick<AuthUser, 'country' | 'country_code'> | null | undefined) {
  if (Platform.OS !== 'web' || !isGlobalAppDomain() || !isGermanyUser(user)) {
    return false;
  }

  const explicitChoice = await readStoredDomainChoice();
  return explicitChoice !== 'global';
}

export function redirectToGermanyDomainPreservingPath() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const { pathname, search, hash } = window.location;
  window.location.replace(`https://${GERMANY_APP_HOST}${pathname}${search}${hash}`);
}
