import { apiRequest } from './api';
import { fetchCachedResource, getCachedResourceSnapshot, primeCachedResource } from './resourceCache';
import { NUTRITION_PLAN_LATEST_CACHE_KEY } from './cacheKeys';

export type NutritionMealEntry = {
  name: string;
  desc: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  ingredients: string[];
  instructions: string[];
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

export const STARTER_MEAL_PLAN: Record<string, { breakfast: NutritionMealEntry; lunch: NutritionMealEntry; dinner: NutritionMealEntry }> = {
  Mon: {
    breakfast: { name: 'Oatmeal with Mashed Banana', desc: 'A small, comforting bowl of oats naturally sweetened.', kcal: 250, p: 4, c: 45, f: 5, ingredients: ['½ cup rolled oats', '1 ripe banana', '1 cup water', 'Pinch of cinnamon'], instructions: [] },
    lunch: { name: 'Rice and Mild Lentil Stew', desc: 'A balanced portion of complex carbs and plant protein.', kcal: 300, p: 8, c: 50, f: 5, ingredients: ['½ cup white rice', '½ cup red lentils', '1 tomato', '1 onion', 'Spices'], instructions: [] },
    dinner: { name: 'Chicken and Sweet Potato Mash', desc: 'Lean protein paired with vitamin-rich sweet potatoes.', kcal: 250, p: 8, c: 30, f: 6, ingredients: ['100g chicken breast', '1 medium sweet potato', '1 tsp olive oil', 'Salt, pepper, garlic'], instructions: [] },
  },
  Tue: {
    breakfast: { name: 'Scrambled Eggs & Toast', desc: 'Classic protein-rich morning fuel.', kcal: 280, p: 14, c: 30, f: 10, ingredients: ['2 eggs', '1 slice whole-grain bread', '1 tsp butter'], instructions: [] },
    lunch: { name: 'Grilled Chicken Salad', desc: 'Fresh greens with grilled protein.', kcal: 320, p: 26, c: 15, f: 12, ingredients: ['120g chicken breast', 'Mixed greens', 'Olive oil dressing'], instructions: [] },
    dinner: { name: 'Baked White Fish with Veggies', desc: 'Light, nutrient-dense evening meal.', kcal: 260, p: 24, c: 18, f: 7, ingredients: ['140g white fish', 'Broccoli & carrots', 'Lemon juice'], instructions: [] },
  },
  Wed: {
    breakfast: { name: 'Greek Yogurt & Berries', desc: 'Probiotic-rich breakfast with natural antioxidants.', kcal: 220, p: 18, c: 22, f: 4, ingredients: ['200g Greek yogurt', '½ cup mixed berries', '1 tsp honey'], instructions: [] },
    lunch: { name: 'Turkey & Avocado Wrap', desc: 'Lean protein wrapped with healthy monounsaturated fats.', kcal: 350, p: 24, c: 32, f: 14, ingredients: ['100g turkey breast', '1 whole wheat wrap', '¼ avocado'], instructions: [] },
    dinner: { name: 'Lean Beef Stir Fry', desc: 'Iron-rich dinner paired with colorful vegetables.', kcal: 340, p: 28, c: 24, f: 12, ingredients: ['120g lean beef strips', 'Bell peppers & snap peas', 'Soy sauce'], instructions: [] },
  },
  Thu: {
    breakfast: { name: 'Peanut Butter Banana Toast', desc: 'Energy-sustaining whole grain breakfast.', kcal: 290, p: 10, c: 38, f: 12, ingredients: ['1 slice sourdough', '1 tbsp natural peanut butter', '½ banana'], instructions: [] },
    lunch: { name: 'Salmon & Quinoa Bowl', desc: 'Omega-3 rich superfood lunch.', kcal: 380, p: 28, c: 34, f: 14, ingredients: ['120g wild salmon', '½ cup cooked quinoa', 'Spinach'], instructions: [] },
    dinner: { name: 'Tofu & Vegetable Curry', desc: 'Plant-powered dinner with immune-boosting spices.', kcal: 290, p: 16, c: 28, f: 11, ingredients: ['150g firm tofu', 'Coconut milk base', 'Mixed veggies'], instructions: [] },
  },
  Fri: {
    breakfast: { name: 'Protein Berry Smoothie', desc: 'Fast, refreshing morning recovery shake.', kcal: 260, p: 24, c: 30, f: 3, ingredients: ['1 scoop whey/plant protein', '1 cup almond milk', 'Frozen berries'], instructions: [] },
    lunch: { name: 'Tuna & Chickpea Salad', desc: 'Heart-healthy lunch packed with fiber and lean fish.', kcal: 340, p: 30, c: 28, f: 9, ingredients: ['1 can light tuna', '½ cup chickpeas', 'Lemon & olive oil'], instructions: [] },
    dinner: { name: 'Roast Chicken with Broccoli', desc: 'Simple, clean protein and micronutrient dinner.', kcal: 310, p: 32, c: 14, f: 10, ingredients: ['140g chicken breast', 'Steamed broccoli', 'Garlic powder'], instructions: [] },
  },
  Sat: {
    breakfast: { name: 'Oatmeal Pancakes', desc: 'High-protein, guilt-free weekend pancakes.', kcal: 310, p: 16, c: 42, f: 6, ingredients: ['½ cup oat flour', '2 egg whites', 'Cinnamon & berries'], instructions: [] },
    lunch: { name: 'Grilled Steak with Sweet Potato', desc: 'Restorative weekend powerhouse lunch.', kcal: 410, p: 34, c: 36, f: 13, ingredients: ['130g lean sirloin', '1 small baked sweet potato'], instructions: [] },
    dinner: { name: 'Shrimp & Zucchini Noodles', desc: 'Ultra-lean, low-calorie evening meal.', kcal: 240, p: 26, c: 12, f: 6, ingredients: ['150g shrimp', 'Spiralized zucchini', 'Pesto sauce'], instructions: [] },
  },
  Sun: {
    breakfast: { name: 'Veggie Omelette', desc: 'Nutrient-dense start with fresh spinach and mushrooms.', kcal: 270, p: 18, c: 8, f: 16, ingredients: ['2 whole eggs', 'Baby spinach', 'Sliced mushrooms'], instructions: [] },
    lunch: { name: 'Chicken & Brown Rice Bowl', desc: 'Complex carbohydrate replenisher.', kcal: 370, p: 32, c: 40, f: 8, ingredients: ['120g grilled chicken', '½ cup brown rice', 'Green beans'], instructions: [] },
    dinner: { name: 'Lentil Vegetable Soup', desc: 'Light, soothing digest-easy dinner.', kcal: 250, p: 14, c: 38, f: 4, ingredients: ['Red lentils', 'Carrots & celery', 'Vegetable broth'], instructions: [] },
  },
};

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
