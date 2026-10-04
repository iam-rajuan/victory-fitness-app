export const WORKOUT_CATEGORY_OPTIONS = [
  'Upper Body',
  'Core',
  'Strength',
  'Sport in Schwangerschaft',
  'Cardio',
  'Lower Body',
  'Full Body',
  'Pilates',
  'Yoga',
  'HIIT',
] as const;

export const WORKOUT_PURPOSE_FILTER_OPTIONS = ['All', ...WORKOUT_CATEGORY_OPTIONS];

export const DEFAULT_WORKOUT_CATEGORY = WORKOUT_CATEGORY_OPTIONS[0];
