/**
 * Canonical Workout & Exercise Terminology System
 *
 * Ensures workout titles, exercise names, and core fitness terminology remain
 * in canonical English regardless of the selected application language (e.g. German).
 */

export const CANONICAL_EXERCISE_NAMES: readonly string[] = [
  // Chest / Push
  'Bench Press',
  'Incline Dumbbell Press',
  'Dumbbell Floor Press',
  'Dumbbell Chest Flye',
  'Push-Up',
  'Diamond Push-Up',
  'Pike Push-Up',
  'Chair / Bench Dips',
  // Shoulders
  'Overhead Press',
  'Dumbbell Overhead Press',
  'Shoulder Press',
  'Lateral Raise',
  'Dumbbell Lateral Raise',
  'Cable Face Pull',
  // Back / Pull
  'Pull-Up',
  'Lat Pulldown',
  'Inverted Bodyweight Row',
  'Cable Row',
  'Dumbbell Row',
  'Weighted Row',
  'Chest-Supported Row',
  // Legs - Quads & Squats
  'Barbell Back Squat',
  'Bodyweight Tempo Squat',
  'Jump Squat',
  'Dumbbell Goblet Squat',
  'Dumbbell Bulgarian Split Squat',
  'Leg Press',
  'Leg Extension',
  'Reverse Lunge',
  'Walking Lunge',
  'Calf Raise',
  // Legs - Posterior Chain & Hinges
  'Deadlift',
  'Romanian Deadlift',
  'Dumbbell Romanian Deadlift',
  'Hamstring Curl',
  'Hip Thrust',
  'Glute Bridge',
  'Single-Leg Glute Bridge',
  // Arms
  'Dumbbell Curl',
  'Biceps Curl',
  'Hammer Curl',
  'Cable Curl',
  'Dumbbell Skull Crusher',
  'Triceps Pushdown',
  'Triceps Rope Pushdown',
  // Core & Full Body
  'Plank',
  'Hollow Hold',
  'Mountain Climber',
  'Russian Twist',
  'Cable Crunch',
  'Farmer Carry',
];

export const CANONICAL_WORKOUT_TITLES: readonly string[] = [
  'Upper Body',
  'Lower Body',
  'Full Body',
  'Push',
  'Pull',
  'Legs',
  'Upper Body Strength',
  'Lower Body Strength',
  'Full Body Strength',
  'Push Strength',
  'Pull Strength',
  'Leg Strength',
  'Upper Body Hypertrophy',
  'Lower Body Hypertrophy',
  'Full Body Hypertrophy',
  'Push Hypertrophy',
  'Pull Hypertrophy',
  'Upper Body Power',
  'Lower Body Power',
  'Full Body Power',
  'Upper Body Volume',
  'Lower Body Volume',
  'Full Body Volume',
  'Core',
  'Strength',
  'Cardio',
  'HIIT',
  'Pilates',
  'Yoga',
  'Mobility',
];

export const GERMAN_TO_ENGLISH_FITNESS_MAP: Record<string, string> = {
  // Workouts & splits
  oberkörper: 'Upper Body',
  unterkörper: 'Lower Body',
  ganzkörper: 'Full Body',
  drücken: 'Push',
  ziehen: 'Pull',
  beine: 'Legs',
  'oberkörper kraft': 'Upper Body Strength',
  'unterkörper kraft': 'Lower Body Strength',
  'ganzkörper kraft': 'Full Body Strength',
  'oberkörper hypertrophie': 'Upper Body Hypertrophy',
  'unterkörper hypertrophie': 'Lower Body Hypertrophy',
  'ganzkörper hypertrophie': 'Full Body Hypertrophy',
  'oberkörper power': 'Upper Body Power',
  'unterkörper power': 'Lower Body Power',
  'ganzkörper power': 'Full Body Power',
  'oberkörper volumen': 'Upper Body Volume',
  'unterkörper volumen': 'Lower Body Volume',
  // Exercises
  bankdrücken: 'Bench Press',
  latzug: 'Lat Pulldown',
  'lat-zug': 'Lat Pulldown',
  latziehen: 'Lat Pulldown',
  kreuzheben: 'Deadlift',
  'rumänisches kreuzheben': 'Romanian Deadlift',
  kniebeuge: 'Barbell Back Squat',
  kniebeugen: 'Barbell Back Squat',
  'langhantel kniebeuge': 'Barbell Back Squat',
  'langhantel-kniebeuge': 'Barbell Back Squat',
  'langhantel kniebeugen': 'Barbell Back Squat',
  'tempo kniebeuge': 'Bodyweight Tempo Squat',
  'tempo kniebeugen': 'Bodyweight Tempo Squat',
  'sprung kniebeuge': 'Jump Squat',
  'sprung-kniebeugen': 'Jump Squat',
  liegestütz: 'Push-Up',
  liegestütze: 'Push-Up',
  klimmzug: 'Pull-Up',
  klimmzüge: 'Pull-Up',
  schulterdrücken: 'Shoulder Press',
  überkopfdrücken: 'Overhead Press',
  'kurzhantel überkopfdrücken': 'Dumbbell Overhead Press',
  seitheben: 'Lateral Raise',
  'kurzhantel seitheben': 'Dumbbell Lateral Raise',
  bizepscurl: 'Biceps Curl',
  bizepscurls: 'Biceps Curl',
  'kurzhantel curl': 'Dumbbell Curl',
  'kurzhantel curls': 'Dumbbell Curl',
  trizepsdrücken: 'Triceps Pushdown',
  'trizeps pushdown': 'Triceps Pushdown',
  'trizeps seildrücken': 'Triceps Rope Pushdown',
  wadenheben: 'Calf Raise',
  beinbeuger: 'Hamstring Curl',
  beinstrecker: 'Leg Extension',
  beinpresse: 'Leg Press',
  beckenheben: 'Glute Bridge',
  gesäßbrücke: 'Glute Bridge',
  hüftstoß: 'Hip Thrust',
  rudern: 'Row',
  'kurzhantel rudern': 'Dumbbell Row',
  kabelrudern: 'Cable Row',
  'vorgebeugtes rudern': 'Weighted Row',
  bergsteiger: 'Mountain Climber',
  'russische drehung': 'Russian Twist',
  bauchpresse: 'Cable Crunch',
  unterarmstütz: 'Plank',
  ausfallschritt: 'Reverse Lunge',
  ausfallschritte: 'Reverse Lunge',
  'gehende ausfallschritte': 'Walking Lunge',
  'kurzhantel bankdrücken': 'Incline Dumbbell Press',
  schrägbankdrücken: 'Incline Dumbbell Press',
  fliegende: 'Dumbbell Chest Flye',
  brustpresse: 'Dumbbell Floor Press',
  // Common kit / equipment terminology
  langhantel: 'Barbell',
  kurzhantel: 'Dumbbell',
  kurzhanteln: 'Dumbbells',
  körpergewicht: 'Bodyweight',
  klimmzugstange: 'Pull-up Bar',
  widerstandsbänder: 'Resistance Bands',
  hantelbank: 'Bench',
};

const EXACT_ENGLISH_MAP: Record<string, string> = {};
for (const item of [...CANONICAL_EXERCISE_NAMES, ...CANONICAL_WORKOUT_TITLES]) {
  EXACT_ENGLISH_MAP[item.trim().toLowerCase()] = item;
}

const FITNESS_ROOT_PATTERNS = [
  'bench press',
  'squat',
  'deadlift',
  'pulldown',
  'push-up',
  'pushup',
  'pull-up',
  'pullup',
  'overhead press',
  'shoulder press',
  'lateral raise',
  'curl',
  'row',
  'lunge',
  'plank',
  'dip',
  'hip thrust',
  'glute bridge',
  'calf raise',
  'upper body',
  'lower body',
  'full body',
  'hypertrophy',
  'bodyweight',
  'dumbbell',
  'barbell',
];

const FITNESS_ROOT_REGEXES = FITNESS_ROOT_PATTERNS.map(
  (root) => new RegExp(`\\b${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
);

/**
 * Checks if a string represents an exercise, workout title, or fitness terminology
 * that must remain in canonical English.
 */
export function isCanonicalFitnessTerm(text: string): boolean {
  const cleaned = String(text || '').trim().toLowerCase();
  if (!cleaned) return false;

  if (cleaned in EXACT_ENGLISH_MAP) return true;
  if (cleaned in GERMAN_TO_ENGLISH_FITNESS_MAP) return true;

  return FITNESS_ROOT_REGEXES.some((rx) => rx.test(cleaned));
}

/**
 * Restores or preserves a fitness term in its canonical English representation.
 */
export function canonicalizeFitnessText(text: string): string {
  const original = String(text || '').trim();
  if (!original) return '';

  const cleaned = original.toLowerCase();

  // 1. Direct German translation lookup
  if (cleaned in GERMAN_TO_ENGLISH_FITNESS_MAP) {
    return GERMAN_TO_ENGLISH_FITNESS_MAP[cleaned];
  }

  // 2. Exact English canonical match with proper casing
  if (cleaned in EXACT_ENGLISH_MAP) {
    return EXACT_ENGLISH_MAP[cleaned];
  }

  // 3. Substring replacement for German compound phrases
  let result = original;
  for (const [ger, eng] of Object.entries(GERMAN_TO_ENGLISH_FITNESS_MAP)) {
    if (cleaned.includes(ger)) {
      const regex = new RegExp(ger, 'gi');
      result = result.replace(regex, eng);
    }
  }

  return result.trim();
}
