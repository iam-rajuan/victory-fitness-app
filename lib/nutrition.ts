import { apiRequest } from './api';
import { fetchCachedResource, getCachedResourceSnapshot, primeCachedResource } from './resourceCache';
import { getNutritionMealLogsCacheKey, NUTRITION_PLAN_LATEST_CACHE_KEY } from './cacheKeys';

export type NutritionMealEntry = {
  name: string;
  desc: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  ingredients: string[];
  instructions: string[];
  timing?: string | null;
};

export type NutritionDayPlan = {
  day: string;
  breakfast: NutritionMealEntry;
  lunch: NutritionMealEntry;
  dinner: NutritionMealEntry;
  pre_workout?: NutritionMealEntry | null;
  post_workout?: NutritionMealEntry | null;
  [key: string]: unknown;
};

export type NutritionShoppingItem = {
  name: string;
  qty: string;
};

export type NutritionShoppingSection = {
  category: string;
  items: NutritionShoppingItem[];
};

export type NutritionPlanApiResponse = {
  plan_id?: string | null;
  summary: string;
  goal_label: string;
  days: NutritionDayPlan[];
  shopping_list: NutritionShoppingSection[];
  meal_completions?: Record<string, Record<string, boolean>>;
  profile?: Record<string, unknown> | null;
  daily_protein_target?: number | null;
  protein_per_kg?: number | null;
  baseline_weight?: number | null;
};

export function calculateProteinTarget(
  weightKgOrLb: number | string | null | undefined,
  goal?: string | null
): { target: number; multiplier: number; weightKg: number } {
  let weightKg = 70;
  if (weightKgOrLb !== null && weightKgOrLb !== undefined) {
    const s = String(weightKgOrLb).trim().toLowerCase();
    const isLb = s.includes('lb');
    const num = parseFloat(s.replace(/[^\d.]/g, ''));
    if (!isNaN(num) && num > 0) {
      weightKg = isLb ? num * 0.45359237 : num;
    }
  }
  const goalStr = String(goal || '').trim().toLowerCase();
  const multiplier = goalStr === 'g2' || goalStr.includes('muscle') ? 2.0 : 1.6;
  const target = Math.max(Math.round(weightKg * multiplier), 60);
  return { target, multiplier, weightKg: Math.round(weightKg * 10) / 10 };
}

export type NutritionPlanJobResponse = {
  job_id: string;
  status: 'queued' | 'processing' | 'generating_monday' | 'monday_ready' | 'completed' | 'failed' | string;
  plan_id?: string | null;
  plan?: NutritionPlanApiResponse | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
};

export type MealImageAnalysisResponse = {
  analysis_id?: string | null;
  meal_name_guess: string;
  summary: string;
  estimated_calories: number;
  estimated_protein: number;
  estimated_carbs: number;
  estimated_fat: number;
  confidence: string;
  notes: string[];
  file_name?: string | null;
  created_at?: string | null;
};

export type NutritionMealLog = {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  source: string;
  source_analysis_id?: string;
  logged_date: string;
  completed?: boolean;
  created_at: string;
};

const MEAL_ANALYSIS_HISTORY_CACHE_KEY = 'meal-analysis-history';

export async function startNutritionPlanJob(payload: Record<string, unknown>) {
  return apiRequest<NutritionPlanJobResponse>('/ai/nutrition/plan/jobs', {
    method: 'POST',
    body: payload,
  });
}

export async function createNutritionPlan(payload: Record<string, unknown>) {
  return apiRequest<{ plan: NutritionPlanApiResponse }>('/ai/nutrition/plan', {
    method: 'POST',
    body: payload,
    timeoutMs: 120_000,
  });
}

export async function getNutritionPlanJob(jobId: string) {
  return apiRequest<NutritionPlanJobResponse>(`/ai/nutrition/plan/jobs/${encodeURIComponent(jobId)}`);
}

export async function startProgressiveNutritionPlanJob(payload: Record<string, unknown>) {
  return apiRequest<NutritionPlanJobResponse>('/ai/nutrition/plan/progressive/jobs', {
    method: 'POST',
    body: payload,
  });
}

export async function getProgressiveNutritionPlanJob(jobId: string) {
  return apiRequest<NutritionPlanJobResponse>(`/ai/nutrition/plan/progressive/jobs/${encodeURIComponent(jobId)}`);
}

export async function getLatestNutritionPlan(options?: { forceRefresh?: boolean }) {
  if (options?.forceRefresh) {
    return apiRequest<NutritionPlanApiResponse>('/ai/nutrition/plan/latest');
  }
  return fetchCachedResource(NUTRITION_PLAN_LATEST_CACHE_KEY, () =>
    apiRequest<NutritionPlanApiResponse>('/ai/nutrition/plan/latest')
  );
}

export async function getLatestProgressiveNutritionPlan() {
  return apiRequest<NutritionPlanApiResponse>('/ai/nutrition/plan/progressive/latest');
}

export async function updateNutritionMealCompletion(payload: {
  day: string;
  meal_key: string;
  completed: boolean;
}) {
  const updated = await apiRequest<NutritionPlanApiResponse>('/ai/nutrition/plan/latest/completions', {
    method: 'PATCH',
    body: payload,
  });
  await primeCachedResource(NUTRITION_PLAN_LATEST_CACHE_KEY, updated);
  return updated;
}

export async function updateProgressiveNutritionMealCompletion(payload: {
  day: string;
  meal_key: string;
  completed: boolean;
}) {
  return apiRequest<NutritionPlanApiResponse>('/ai/nutrition/plan/progressive/latest/completions', {
    method: 'PATCH',
    body: payload,
  });
}

export async function getNutritionMealLogs(date: string) {
  return fetchCachedResource(getNutritionMealLogsCacheKey(date), async () => {
    const response = await apiRequest<{ logs: NutritionMealLog[] }>(`/ai/nutrition/meal-logs?date=${encodeURIComponent(date)}`);
    return {
      logs: Array.isArray(response.logs) ? response.logs : [],
    };
  });
}

export async function createNutritionMealLog(payload: {
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  source?: string;
  source_analysis_id?: string | null;
  logged_date?: string;
  completed?: boolean;
}) {
  const created = await apiRequest<NutritionMealLog>('/ai/nutrition/meal-logs', {
    method: 'POST',
    body: payload,
  });
  const date = created.logged_date || payload.logged_date || new Date().toISOString().slice(0, 10);
  const current = getCachedResourceSnapshot<{ logs: NutritionMealLog[] }>(getNutritionMealLogsCacheKey(date));
  if (current) {
    await primeCachedResource(getNutritionMealLogsCacheKey(date), {
      logs: [created, ...(current.logs || []).filter((log) => log.id !== created.id)],
    });
  }
  return created;
}

export async function updateNutritionMealLog(logId: string, payload: { completed: boolean }) {
  const updated = await apiRequest<NutritionMealLog>(`/ai/nutrition/meal-logs/${encodeURIComponent(logId)}`, {
    method: 'PATCH',
    body: payload,
  });
  const date = updated.logged_date || new Date().toISOString().slice(0, 10);
  const current = getCachedResourceSnapshot<{ logs: NutritionMealLog[] }>(getNutritionMealLogsCacheKey(date));
  if (current) {
    await primeCachedResource(getNutritionMealLogsCacheKey(date), {
      logs: (current.logs || []).map((log) => log.id === updated.id ? updated : log),
    });
  }
  return updated;
}

export async function deleteNutritionMealLog(logId: string) {
  return apiRequest<void>(`/ai/nutrition/meal-logs/${encodeURIComponent(logId)}`, {
    method: 'DELETE',
  });
}

export async function analyzeMealImage(payload: {
  image_base64?: string | null;
  document_base64?: string | null;
  text_content?: string | null;
  mime_type: string;
  file_name?: string | null;
}) {
  return apiRequest<MealImageAnalysisResponse>('/ai/meal-analysis', {
    method: 'POST',
    body: payload,
  });
}

export async function getMealAnalysisHistory() {
  return fetchCachedResource(MEAL_ANALYSIS_HISTORY_CACHE_KEY, async () => {
    const response = await apiRequest<{ analyses: MealImageAnalysisResponse[] }>('/ai/meal-analysis');
    return {
      analyses: Array.isArray(response.analyses) ? response.analyses : [],
    };
  });
}

export function getCachedMealAnalysisHistory() {
  return getCachedResourceSnapshot<{ analyses: MealImageAnalysisResponse[] }>(MEAL_ANALYSIS_HISTORY_CACHE_KEY);
}

export async function primeMealAnalysisHistory(history: { analyses: MealImageAnalysisResponse[] }) {
  await primeCachedResource(MEAL_ANALYSIS_HISTORY_CACHE_KEY, {
    analyses: Array.isArray(history.analyses) ? history.analyses : [],
  });
}
