import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from './i18n';

export type OnboardingLanguage = LanguageCode;

export type OnboardingPersonalProfile = {
  age: string;
  gender: string;
  height: string;
  heightUnit: 'cm';
  weight: string;
  weightUnit: 'kg' | 'lb';
};

export type OnboardingAnamnese = {
  primaryGoal: string;
  activityLevel: string;
  healthConcerns: string[];
  healthNotes: string;
  daysPerWeek: string;
  timePerSession: string;
  equipmentAccess: string;
};

export type OnboardingSuggestion = {
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  title: string;
  reason: string;
  note?: string;
};

export type OnboardingPreferences = {
  billingCycle: 'year' | 'month';
  region: string;
  paymentMethodIndex: number;
  paymentMethodName: string;
  nudgeChannels: string[];
  dialCode: string;
  dialNumber: string;
  contactNumber: string;
  selectedKit: string[];
};

export type OnboardingCalculations = {
  proteinGrams: number;
  caloriesKcal: number;
  carbsGrams: number;
  waterLiters: number;
  workoutsMatched: number;
  weeklyMinutes: number;
  proteinFormula: string;
};

export type OnboardingPlanPreview = {
  planName: string;
  firstSession: string;
  kitShort: string;
  weekNote: string;
  victorLine: string;
};

export type OnboardingData = {
  userId: string;
  currentStep: number;
  language: OnboardingLanguage | '';
  country: string;
  countryCode: string | null;
  motivationStatement: string;
  identityStatement: string;
  personalProfile: OnboardingPersonalProfile;
  anamnese: OnboardingAnamnese;
  suggestion: OnboardingSuggestion | null;
  preferences: OnboardingPreferences;
  calculations: OnboardingCalculations;
  planPreview: OnboardingPlanPreview;
  updatedAt: string | null;
};

const ONBOARDING_DATA_KEY = 'onboardingData';
const LAST_WEIGHT_PROMPT_DATE_KEY = 'lastWeightPromptDate';
const LAST_WEIGHT_PROMPT_USER_KEY = 'lastWeightPromptUserId';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEIGHT_PROMPT_INTERVAL_DAYS = 28;

const EMPTY_PERSONAL_PROFILE: OnboardingPersonalProfile = {
  age: '',
  gender: '',
  height: '',
  heightUnit: 'cm',
  weight: '',
  weightUnit: 'kg',
};

const EMPTY_ANAMNESE: OnboardingAnamnese = {
  primaryGoal: '',
  activityLevel: '',
  healthConcerns: [],
  healthNotes: '',
  daysPerWeek: '',
  timePerSession: '',
  equipmentAccess: '',
};

const EMPTY_PREFERENCES: OnboardingPreferences = {
  billingCycle: 'year',
  region: '',
  paymentMethodIndex: 0,
  paymentMethodName: '',
  nudgeChannels: [],
  dialCode: '',
  dialNumber: '',
  contactNumber: '',
  selectedKit: [],
};

const EMPTY_CALCULATIONS: OnboardingCalculations = {
  proteinGrams: 0,
  caloriesKcal: 0,
  carbsGrams: 0,
  waterLiters: 0,
  workoutsMatched: 0,
  weeklyMinutes: 0,
  proteinFormula: '',
};

const EMPTY_PLAN_PREVIEW: OnboardingPlanPreview = {
  planName: '',
  firstSession: '',
  kitShort: '',
  weekNote: '',
  victorLine: '',
};

function canUseLocalStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeOnboardingData(raw: unknown): OnboardingData | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const source = raw as Record<string, unknown>;
  return {
    userId: String(source.userId ?? '').trim(),
    currentStep: Math.max(Number(source.currentStep ?? 0) || 0, 0),
    language: (String(source.language ?? '').trim() as OnboardingLanguage | '') || '',
    country: String(source.country ?? '').trim(),
    countryCode: String(source.countryCode ?? '').trim().toUpperCase() || null,
    motivationStatement: String(source.motivationStatement ?? '').trim(),
    identityStatement: String(source.identityStatement ?? ''),
    personalProfile: {
      age: String((source.personalProfile as Record<string, unknown> | undefined)?.age ?? '').trim(),
      gender: String((source.personalProfile as Record<string, unknown> | undefined)?.gender ?? '').trim(),
      height: String((source.personalProfile as Record<string, unknown> | undefined)?.height ?? '').trim(),
      heightUnit: 'cm',
      weight: String((source.personalProfile as Record<string, unknown> | undefined)?.weight ?? '').trim(),
      weightUnit: String((source.personalProfile as Record<string, unknown> | undefined)?.weightUnit ?? 'kg').trim() === 'lb' ? 'lb' : 'kg',
    },
    anamnese: {
      primaryGoal: String((source.anamnese as Record<string, unknown> | undefined)?.primaryGoal ?? '').trim(),
      activityLevel: String((source.anamnese as Record<string, unknown> | undefined)?.activityLevel ?? '').trim(),
      healthConcerns: Array.isArray((source.anamnese as Record<string, unknown> | undefined)?.healthConcerns)
        ? ((source.anamnese as Record<string, unknown>).healthConcerns as unknown[]).map((item) => String(item).trim()).filter(Boolean)
        : [],
      healthNotes: String((source.anamnese as Record<string, unknown> | undefined)?.healthNotes ?? '').trim(),
      daysPerWeek: String((source.anamnese as Record<string, unknown> | undefined)?.daysPerWeek ?? '').trim(),
      timePerSession: String((source.anamnese as Record<string, unknown> | undefined)?.timePerSession ?? '').trim(),
      equipmentAccess: String((source.anamnese as Record<string, unknown> | undefined)?.equipmentAccess ?? '').trim(),
    },
    suggestion: source.suggestion && typeof source.suggestion === 'object'
      ? {
          tier: String((source.suggestion as Record<string, unknown>).tier ?? 'GOLD').trim().toUpperCase() as 'SILVER' | 'GOLD' | 'PLATINUM',
          title: String((source.suggestion as Record<string, unknown>).title ?? '').trim(),
          reason: String((source.suggestion as Record<string, unknown>).reason ?? '').trim(),
          note: String((source.suggestion as Record<string, unknown>).note ?? '').trim() || undefined,
        }
      : null,
    preferences: {
      billingCycle: String((source.preferences as Record<string, unknown> | undefined)?.billingCycle ?? 'year').trim() === 'month' ? 'month' : 'year',
      region: String((source.preferences as Record<string, unknown> | undefined)?.region ?? '').trim(),
      paymentMethodIndex: Math.max(Number((source.preferences as Record<string, unknown> | undefined)?.paymentMethodIndex ?? 0) || 0, 0),
      paymentMethodName: String((source.preferences as Record<string, unknown> | undefined)?.paymentMethodName ?? '').trim(),
      nudgeChannels: Array.isArray((source.preferences as Record<string, unknown> | undefined)?.nudgeChannels)
        ? ((source.preferences as Record<string, unknown>).nudgeChannels as unknown[]).map((item) => String(item).trim()).filter(Boolean)
        : [],
      dialCode: String((source.preferences as Record<string, unknown> | undefined)?.dialCode ?? '').trim(),
      dialNumber: String((source.preferences as Record<string, unknown> | undefined)?.dialNumber ?? '').trim(),
      contactNumber: String((source.preferences as Record<string, unknown> | undefined)?.contactNumber ?? '').trim(),
      selectedKit: Array.isArray((source.preferences as Record<string, unknown> | undefined)?.selectedKit)
        ? ((source.preferences as Record<string, unknown>).selectedKit as unknown[]).map((item) => String(item).trim()).filter(Boolean)
        : [],
    },
    calculations: {
      proteinGrams: Math.max(Number((source.calculations as Record<string, unknown> | undefined)?.proteinGrams ?? 0) || 0, 0),
      caloriesKcal: Math.max(Number((source.calculations as Record<string, unknown> | undefined)?.caloriesKcal ?? 0) || 0, 0),
      carbsGrams: Math.max(Number((source.calculations as Record<string, unknown> | undefined)?.carbsGrams ?? 0) || 0, 0),
      waterLiters: Math.max(Number((source.calculations as Record<string, unknown> | undefined)?.waterLiters ?? 0) || 0, 0),
      workoutsMatched: Math.max(Number((source.calculations as Record<string, unknown> | undefined)?.workoutsMatched ?? 0) || 0, 0),
      weeklyMinutes: Math.max(Number((source.calculations as Record<string, unknown> | undefined)?.weeklyMinutes ?? 0) || 0, 0),
      proteinFormula: String((source.calculations as Record<string, unknown> | undefined)?.proteinFormula ?? '').trim(),
    },
    planPreview: {
      planName: String((source.planPreview as Record<string, unknown> | undefined)?.planName ?? '').trim(),
      firstSession: String((source.planPreview as Record<string, unknown> | undefined)?.firstSession ?? '').trim(),
      kitShort: String((source.planPreview as Record<string, unknown> | undefined)?.kitShort ?? '').trim(),
      weekNote: String((source.planPreview as Record<string, unknown> | undefined)?.weekNote ?? '').trim(),
      victorLine: String((source.planPreview as Record<string, unknown> | undefined)?.victorLine ?? '').trim(),
    },
    updatedAt: String(source.updatedAt ?? '').trim() || null,
  };
}

function buildEmptyOnboardingData(userId: string): OnboardingData {
  return {
    userId,
    currentStep: 0,
    language: '',
    country: '',
    countryCode: null,
    motivationStatement: '',
    identityStatement: '',
    personalProfile: { ...EMPTY_PERSONAL_PROFILE },
    anamnese: { ...EMPTY_ANAMNESE },
    suggestion: null,
    preferences: { ...EMPTY_PREFERENCES },
    calculations: { ...EMPTY_CALCULATIONS },
    planPreview: { ...EMPTY_PLAN_PREVIEW },
    updatedAt: null,
  };
}

async function readStorageValue(key: string) {
  if (canUseLocalStorage()) {
    return window.localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function writeStorageValue(key: string, value: string) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function removeStorageValue(key: string) {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export function getStoredOnboardingDataSnapshot() {
  if (!canUseLocalStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(ONBOARDING_DATA_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeOnboardingData(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getOnboardingData(userId?: string) {
  const raw = await readStorageValue(ONBOARDING_DATA_KEY);
  if (!raw) {
    return userId ? buildEmptyOnboardingData(userId) : null;
  }

  try {
    const parsed = normalizeOnboardingData(JSON.parse(raw));
    if (!parsed) {
      return userId ? buildEmptyOnboardingData(userId) : null;
    }
    if (userId && parsed.userId && parsed.userId !== userId) {
      return buildEmptyOnboardingData(userId);
    }
    if (userId && !parsed.userId) {
      return { ...parsed, userId };
    }
    return parsed;
  } catch {
    return userId ? buildEmptyOnboardingData(userId) : null;
  }
}

export async function saveOnboardingData(data: OnboardingData) {
  await writeStorageValue(
    ONBOARDING_DATA_KEY,
    JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export async function completeOnboarding(data: OnboardingData) {
  await saveOnboardingData(data);
  await removeStorageValue('onboardingCompleted');
  await writeStorageValue(LAST_WEIGHT_PROMPT_DATE_KEY, new Date().toISOString());
  await writeStorageValue(LAST_WEIGHT_PROMPT_USER_KEY, data.userId);
}

export async function shouldShowWeightUpdatePrompt(userId: string) {
  const [lastPromptDate, promptUserId] = await Promise.all([
    readStorageValue(LAST_WEIGHT_PROMPT_DATE_KEY),
    readStorageValue(LAST_WEIGHT_PROMPT_USER_KEY),
  ]);

  if (promptUserId && promptUserId !== userId) {
    return true;
  }

  // The backend onboarding flow does not always create a local onboardingData
  // record. A handled prompt must therefore be checked before relying on the
  // local weight value, otherwise the prompt reappears on every home visit.
  if (!lastPromptDate) {
    return true;
  }

  const lastPromptTime = Date.parse(lastPromptDate);
  if (Number.isNaN(lastPromptTime)) {
    return true;
  }

  if (Date.now() - lastPromptTime < WEIGHT_PROMPT_INTERVAL_DAYS * MS_PER_DAY) {
    return false;
  }

  return true;
}

export async function updateUserWeight(userId: string, weight: string) {
  const data = (await getOnboardingData(userId)) ?? buildEmptyOnboardingData(userId);
  const nextData: OnboardingData = {
    ...data,
    userId,
    personalProfile: {
      ...data.personalProfile,
      weight: weight.trim(),
    },
    updatedAt: new Date().toISOString(),
  };
  await saveOnboardingData(nextData);
  await writeStorageValue(LAST_WEIGHT_PROMPT_DATE_KEY, new Date().toISOString());
  await writeStorageValue(LAST_WEIGHT_PROMPT_USER_KEY, userId);
  return nextData;
}

export async function syncOnboardingProfileFields(userId: string, fields: Partial<OnboardingPersonalProfile>) {
  const data = (await getOnboardingData(userId)) ?? buildEmptyOnboardingData(userId);
  const nextData: OnboardingData = {
    ...data,
    userId,
    personalProfile: {
      ...data.personalProfile,
      ...fields,
    },
    updatedAt: new Date().toISOString(),
  };
  await saveOnboardingData(nextData);
  return nextData;
}

export async function markWeightPromptHandled(userId: string, snoozeDays = 0) {
  const dateToSave = snoozeDays > 0
    ? new Date(Date.now() - (WEIGHT_PROMPT_INTERVAL_DAYS - snoozeDays) * MS_PER_DAY).toISOString()
    : new Date().toISOString();
  await writeStorageValue(LAST_WEIGHT_PROMPT_DATE_KEY, dateToSave);
  await writeStorageValue(LAST_WEIGHT_PROMPT_USER_KEY, userId);
}
