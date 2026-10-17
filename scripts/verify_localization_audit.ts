import { isCanonicalFitnessTerm, canonicalizeFitnessText } from '../lib/workoutTerminology';
import { STATIC_TRANSLATIONS } from '../lib/translations';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`PASSED: ${msg}`);
}

console.log('--- 1. Testing isCanonicalFitnessTerm ---');
// Canonical English
assert(isCanonicalFitnessTerm('Upper Body') === true, 'Upper Body is recognized as canonical');
assert(isCanonicalFitnessTerm('Bench Press') === true, 'Bench Press is recognized as canonical');
assert(isCanonicalFitnessTerm('Lat Pulldown') === true, 'Lat Pulldown is recognized as canonical');
assert(isCanonicalFitnessTerm('Barbell Back Squat') === true, 'Barbell Back Squat is recognized as canonical');

// German Fitness Terminology
assert(isCanonicalFitnessTerm('Oberkörper Kraft') === true, 'Oberkörper Kraft is recognized as fitness term');
assert(isCanonicalFitnessTerm('Bankdrücken') === true, 'Bankdrücken is recognized as fitness term');
assert(isCanonicalFitnessTerm('Latzug') === true, 'Latzug is recognized as fitness term');
assert(isCanonicalFitnessTerm('Kniebeugen') === true, 'Kniebeugen is recognized as fitness term');

// Normal UI text should NOT be claimed as fitness terms
assert(isCanonicalFitnessTerm('Back') === false, 'Back is normal UI');
assert(isCanonicalFitnessTerm('Zurück') === false, 'Zurück is normal UI');
assert(isCanonicalFitnessTerm('All') === false, 'All is normal UI');
assert(isCanonicalFitnessTerm('Alle') === false, 'Alle is normal UI');
assert(isCanonicalFitnessTerm('Einstellungen') === false, 'Einstellungen is normal UI');
assert(isCanonicalFitnessTerm('Start workout') === false, 'Start workout is normal UI');
assert(isCanonicalFitnessTerm('Session complete') === false, 'Session complete is normal UI');

console.log('\n--- 2. Testing canonicalizeFitnessText ---');
assert(canonicalizeFitnessText('Oberkörper') === 'Upper Body', 'Oberkörper -> Upper Body');
assert(canonicalizeFitnessText('Oberkörper Kraft') === 'Upper Body Strength', 'Oberkörper Kraft -> Upper Body Strength');
assert(canonicalizeFitnessText('Bankdrücken') === 'Bench Press', 'Bankdrücken -> Bench Press');
assert(canonicalizeFitnessText('Latzug') === 'Lat Pulldown', 'Latzug -> Lat Pulldown');
assert(canonicalizeFitnessText('Schulterdrücken') === 'Shoulder Press', 'Schulterdrücken -> Shoulder Press');
assert(canonicalizeFitnessText('Upper Body') === 'Upper Body', 'Upper Body remains Upper Body');
assert(canonicalizeFitnessText('Bench Press') === 'Bench Press', 'Bench Press remains Bench Press');
assert(canonicalizeFitnessText('Lat Pulldown') === 'Lat Pulldown', 'Lat Pulldown remains Lat Pulldown');

console.log('\n--- 3. Testing German Dictionary for Workout Names ---');
const deDict = STATIC_TRANSLATIONS.de;
assert(deDict['Back'] === 'Zurück', 'Back translates to Zurück');
assert(deDict['All'] === 'Alle', 'All translates to Alle');
// Verify dictionary does NOT translate Bench to Bank
assert(deDict['Bench'] === 'Bench', 'Bench is preserved as Bench in German dictionary');

console.log('\n--- 4. Testing End-to-End Resolution Simulation ---');
// Simulating t(key, lang)
function simulateT(key: string, lang: 'en' | 'de'): string {
  if (isCanonicalFitnessTerm(key)) {
    return canonicalizeFitnessText(key);
  }
  const dict = lang === 'de' ? STATIC_TRANSLATIONS.de : STATIC_TRANSLATIONS.en;
  return (dict as any)[key] || key;
}

// In German UI:
assert(simulateT('Back', 'de') === 'Zurück', 'UI Back in German is Zurück');
assert(simulateT('All', 'de') === 'Alle', 'UI All in German is Alle');
assert(simulateT('Upper Body', 'de') === 'Upper Body', 'Workout title Upper Body in German stays Upper Body');
assert(simulateT('Bench Press', 'de') === 'Bench Press', 'Exercise Bench Press in German stays Bench Press');
assert(simulateT('Lat Pulldown', 'de') === 'Lat Pulldown', 'Exercise Lat Pulldown in German stays Lat Pulldown');
assert(simulateT('Oberkörper Kraft', 'de') === 'Upper Body Strength', 'German stored workout name canonicalized to English');
assert(simulateT('Bankdrücken', 'de') === 'Bench Press', 'German stored exercise name canonicalized to English');

// In English UI:
assert(simulateT('Back', 'en') === 'Back', 'UI Back in English is Back');
assert(simulateT('Upper Body', 'en') === 'Upper Body', 'Workout title in English is Upper Body');
assert(simulateT('Bench Press', 'en') === 'Bench Press', 'Exercise in English is Bench Press');

console.log('\nAll localization audit validation checks passed successfully!');
