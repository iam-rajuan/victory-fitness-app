import type { NutritionPlanApiResponse } from './nutrition';

export const COUNTRY_NATIONALITY_MAP: Record<string, string> = {
  ghana: 'Ghanaian',
  gh: 'Ghanaian',
  germany: 'German',
  de: 'German',
  italy: 'Italian',
  it: 'Italian',
  nigeria: 'Nigerian',
  ng: 'Nigerian',
  india: 'Indian',
  in: 'Indian',
  mexico: 'Mexican',
  mx: 'Mexican',
  turkey: 'Turkish',
  tr: 'Turkish',
  spain: 'Spanish',
  es: 'Spanish',
  france: 'French',
  fr: 'French',
  japan: 'Japanese',
  jp: 'Japanese',
  china: 'Chinese',
  cn: 'Chinese',
  uk: 'British',
  gb: 'British',
  'united kingdom': 'British',
  us: 'American',
  usa: 'American',
  'united states': 'American',
  bangladesh: 'Bangladeshi',
  bd: 'Bangladeshi',
};

export interface StructuredNutritionSummary {
  primaryLine: string;
  contextLine: string;
  fullText: string;
  avgKcal: number;
  proteinTarget: number;
  goalText: string;
  cuisineText: string;
}

export function formatStructuredNutritionSummary(
  plan: NutritionPlanApiResponse | null | undefined,
  t?: (key: string) => string
): StructuredNutritionSummary {
  const translate = t || ((k: string) => k);
  if (!plan) {
    const primary = `7-${translate('day')} ${translate('personalized')} ${translate('nutrition')} ${translate('plan')}`;
    const context = translate('Meals prioritize balanced options and your stated preferences.');
    return {
      primaryLine: primary,
      contextLine: context,
      fullText: `${primary}\n${context}`,
      avgKcal: 2100,
      proteinTarget: 120,
      goalText: 'nutrition',
      cuisineText: '',
    };
  }

  const days = plan.days || [];
  const dayCount = (days.length <= 1 || days.length === 7) ? 7 : days.length;

  // 1. Calculate dynamic average calories from all meals
  let totalKcal = 0;
  let totalProtein = 0;

  days.forEach((d) => {
    const mealList = [d.breakfast, d.lunch, d.dinner, d.pre_workout, d.post_workout].filter(Boolean);
    mealList.forEach((m: any) => {
      totalKcal += Math.max(0, Number(m?.kcal || 0));
      totalProtein += Math.max(0, Number(m?.p || 0));
    });
  });

  const avgKcal = days.length > 0 && totalKcal > 0
    ? Math.round((totalKcal / days.length) / 50) * 50
    : 2100;

  // 2. Dynamic protein target
  let proteinTarget = plan.daily_protein_target || 0;
  if (!proteinTarget && days.length > 0 && totalProtein > 0) {
    proteinTarget = Math.round(totalProtein / days.length);
  }
  if (!proteinTarget) {
    proteinTarget = 120;
  }

  // 3. Goal text
  const profile = (plan.profile && typeof plan.profile === 'object' ? plan.profile : {}) as Record<string, any>;
  const goalCode = String(profile.goal || '').toLowerCase();
  const rawGoalLabel = String(plan.goal_label || profile.goal_label || '').trim();

  let goalText = 'plan';
  if (goalCode === 'g1' || rawGoalLabel.toLowerCase().includes('weight loss') || rawGoalLabel.toLowerCase().includes('fat loss')) {
    goalText = translate('weight loss');
  } else if (goalCode === 'g2' || rawGoalLabel.toLowerCase().includes('muscle')) {
    goalText = translate('muscle building');
  } else if (goalCode === 'g3' || rawGoalLabel.toLowerCase().includes('maintenance')) {
    goalText = translate('maintenance');
  } else if (goalCode === 'g4' || rawGoalLabel.toLowerCase().includes('flexibility')) {
    goalText = translate('flexibility');
  } else if (goalCode === 'g5' || rawGoalLabel.toLowerCase().includes('endurance') || rawGoalLabel.toLowerCase().includes('energy')) {
    goalText = translate('endurance');
  } else if (rawGoalLabel && !rawGoalLabel.toLowerCase().includes('personalized')) {
    goalText = rawGoalLabel.toLowerCase();
  } else {
    goalText = translate('nutrition');
  }

  // 4. Country / Cuisine context
  const rawCuisine = String(profile.cuisine || profile.country || '').trim().toLowerCase();
  const summaryLower = String(plan.summary || '').toLowerCase();

  const isGhanaian =
    rawCuisine.includes('ghana') ||
    String(profile.country_code || '').toUpperCase() === 'GH' ||
    summaryLower.includes('ghana') ||
    days.some((d) =>
      [d.breakfast, d.lunch, d.dinner, d.pre_workout, d.post_workout].some((m: any) =>
        m && ['waakye', 'fufu', 'banku', 'kenkey', 'jollof', 'red red'].some((dish) => String(m.name || '').toLowerCase().includes(dish))
      )
    );

  let cuisineLabel = '';
  if (isGhanaian) {
    cuisineLabel = translate('Ghanaian');
  } else if (COUNTRY_NATIONALITY_MAP[rawCuisine]) {
    cuisineLabel = translate(COUNTRY_NATIONALITY_MAP[rawCuisine]);
  } else if (rawCuisine && !['balanced', 'custom', 'none', 'standard'].includes(rawCuisine)) {
    cuisineLabel = rawCuisine.charAt(0).toUpperCase() + rawCuisine.slice(1);
  } else if (summaryLower.includes('german')) {
    cuisineLabel = translate('German');
  } else if (summaryLower.includes('italian')) {
    cuisineLabel = translate('Italian');
  }

  const cuisinePrefix = cuisineLabel ? `${cuisineLabel} ` : '';
  const primaryLine = `${dayCount}-${translate('day')} ${cuisinePrefix}${goalText} ${translate('plan')} • ~${avgKcal.toLocaleString()} ${translate('kcal/day')} • ${proteinTarget}g ${translate('protein/day')}.`;

  // 5. Dietary restriction / allergy
  const allergies = String(profile.allergies || '').trim().toLowerCase();
  const diet = String(profile.diet || '').trim().toLowerCase();

  const dietaryNotes: string[] = [];
  if (allergies && !['none', 'no', 'n/a'].includes(allergies)) {
    const cleanAllergy = allergies.replace(/allergies|allergy/g, '').trim();
    dietaryNotes.push(`${cleanAllergy.charAt(0).toUpperCase() + cleanAllergy.slice(1)} ${translate('allergy respected.')}`);
  } else if (summaryLower.includes('nut allergy') || summaryLower.includes('peanut')) {
    dietaryNotes.push(`${translate('Nut')} ${translate('allergy respected.')}`);
  } else if (summaryLower.includes('lactose')) {
    dietaryNotes.push(`${translate('Lactose')} ${translate('allergy respected.')}`);
  } else if (summaryLower.includes('gluten')) {
    dietaryNotes.push(`${translate('Gluten')} ${translate('allergy respected.')}`);
  }

  if (['d2', 'vegetarian'].includes(diet) || summaryLower.includes('vegetarian')) {
    dietaryNotes.push(translate('Vegetarian diet respected.'));
  } else if (['d3', 'vegan'].includes(diet) || summaryLower.includes('vegan')) {
    dietaryNotes.push(translate('Vegan diet respected.'));
  } else if (['d4', 'keto', 'low-carb'].includes(diet) || summaryLower.includes('low-carb')) {
    dietaryNotes.push(translate('Low-carb diet respected.'));
  }

  const allergyPart = dietaryNotes.length > 0 ? `${dietaryNotes.join(' ')} ` : '';

  // 6. Preferences / authentic options
  let prefPart = '';
  if (isGhanaian) {
    prefPart = translate('Meals prioritize authentic Ghanaian options and your stated preferences.');
  } else if (cuisineLabel) {
    prefPart = `${translate('Meals prioritize authentic')} ${cuisineLabel} ${translate('options and your stated preferences.')}`;
  } else {
    prefPart = translate('Meals prioritize balanced options and your stated preferences.');
  }

  const contextLine = `${allergyPart}${prefPart}`.trim();
  const fullText = `${primaryLine}\n${contextLine}`;

  return {
    primaryLine,
    contextLine,
    fullText,
    avgKcal,
    proteinTarget,
    goalText,
    cuisineText: cuisineLabel,
  };
}
