export interface MealWithPrep {
  name?: string;
  ingredients?: string[];
  instructions?: string[];
  preparation_steps?: string[];
  [key: string]: unknown;
}

export function getMealPreparationSteps(meal: MealWithPrep | null | undefined): string[] {
  if (!meal) return [];
  const raw = meal.preparation_steps || meal.instructions || (meal as any)?.prep_steps;
  if (Array.isArray(raw) && raw.length > 0) {
    const valid = raw.map((s) => String(s || '').trim()).filter(Boolean);
    if (valid.length > 1 || (valid.length === 1 && !valid[0].toLowerCase().includes('prepare the ingredients and portion'))) {
      return valid;
    }
  }

  const name = String(meal.name || 'meal').trim();
  const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.filter(Boolean) : [];
  const ingText = ingredients.length > 0 ? ` (${ingredients.slice(0, 3).join(', ')})` : '';

  return [
    `Prepare and portion ingredients${ingText}.`,
    `Cook the main ingredients for ${name} using your preferred low-oil method.`,
    'Add seasoning, herbs, or sauce to taste according to your plan preferences.',
    'Serve immediately or portion according to your daily meal targets.',
  ];
}
