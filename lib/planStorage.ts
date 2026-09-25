import AsyncStorage from '@react-native-async-storage/async-storage';

export const PLAN_BUILT_KEY = '@victory_plan_built';
export const PLAN_SUMMARY_KEY = '@victory_plan_summary';
export const SHOW_FRESH_PLAN_KEY = '@victory_show_fresh_plan';
export const PLAN_KIT_KEY = '@victory_plan_kit';
export const PLAN_DURATION_KEY = '@victory_plan_duration';

export interface SavedPlanStatus {
  planBuilt: boolean;
  planSummary: string;
  showFreshPlan: boolean;
  planKit: string;
  planDuration: string;
}

export async function getSavedPlanStatus(): Promise<SavedPlanStatus> {
  try {
    const [built, summary, fresh, kit, duration] = await Promise.all([
      AsyncStorage.getItem(PLAN_BUILT_KEY),
      AsyncStorage.getItem(PLAN_SUMMARY_KEY),
      AsyncStorage.getItem(SHOW_FRESH_PLAN_KEY),
      AsyncStorage.getItem(PLAN_KIT_KEY),
      AsyncStorage.getItem(PLAN_DURATION_KEY),
    ]);

    return {
      planBuilt: built === 'true',
      planSummary: summary || 'Get stronger · Mon, Wed, Fri · 40 min · built around your home gym.',
      showFreshPlan: fresh === 'true',
      planKit: kit || 'Home gym',
      planDuration: duration || '40 minutes',
    };
  } catch {
    return {
      planBuilt: false,
      planSummary: 'Get stronger · Mon, Wed, Fri · 40 min · built around your home gym.',
      showFreshPlan: false,
      planKit: 'Home gym',
      planDuration: '40 minutes',
    };
  }
}

export async function savePlanBuiltData(data: {
  goal?: string;
  days?: string;
  duration?: string;
  kit?: string;
  line: string;
}): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(PLAN_BUILT_KEY, 'true'),
      AsyncStorage.setItem(PLAN_SUMMARY_KEY, data.line),
      AsyncStorage.setItem(SHOW_FRESH_PLAN_KEY, 'true'),
      AsyncStorage.setItem(PLAN_KIT_KEY, data.kit || 'Home gym'),
      AsyncStorage.setItem(PLAN_DURATION_KEY, data.duration || '40 minutes'),
    ]);
  } catch {}
}

export async function dismissFreshPlanBanner(): Promise<void> {
  try {
    await AsyncStorage.setItem(SHOW_FRESH_PLAN_KEY, 'false');
  } catch {}
}
