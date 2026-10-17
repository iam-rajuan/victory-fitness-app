import {
  isCanonicalChallengeTitle,
  canonicalizeChallengeTitle,
  registerCanonicalChallengeTitle,
  EXCLUDED_CHALLENGE_UI_KEYS,
} from '../lib/challengeTerminology';
import { STATIC_TRANSLATIONS } from '../lib/translations';

// Verify that STATIC_TRANSLATIONS for German works for UI keys
const deDict = STATIC_TRANSLATIONS.de || {};

console.log('--- Testing Canonical Challenge Terminology ---');

// 1. Initial known challenges
const testTitles = [
  '21-Day Gold Beta',
  '21-day gold beta',
  'Core Crusher',
  'core crusher',
  'Morning Mobility Challenge',
  '30-Day Shred',
  '7-Day Reset',
];

for (const title of testTitles) {
  const isChallenge = isCanonicalChallengeTitle(title);
  const canonical = canonicalizeChallengeTitle(title);
  console.log(`Title: "${title}" -> isCanonical: ${isChallenge}, canonicalized: "${canonical}"`);
  if (!isChallenge) {
    throw new Error(`Expected "${title}" to be identified as a challenge title`);
  }
}

// 2. Excluded UI keys must NOT be classified as challenge titles
const uiKeys = [
  'Challenge',
  'Challenges',
  'Challenge Chat',
  'Challenge Chats',
  'Challenge Library',
  'Challenge Members',
  'Active Challenges',
  'What To Do',
  'Why It Matters',
  'Join Challenge',
];

for (const key of uiKeys) {
  const isChallenge = isCanonicalChallengeTitle(key);
  console.log(`UI Key: "${key}" -> isCanonical: ${isChallenge}`);
  if (isChallenge) {
    throw new Error(`Expected UI key "${key}" NOT to be classified as a challenge title`);
  }
}

// 3. Dynamic registration of arbitrary challenge titles
const dynamicTitle = 'Winter Solstice 14-Day Peak';
console.log(`Unregistered dynamic: "${dynamicTitle}" -> isCanonical: ${isCanonicalChallengeTitle(dynamicTitle)}`);
registerCanonicalChallengeTitle(dynamicTitle);
if (!isCanonicalChallengeTitle(dynamicTitle)) {
  throw new Error(`Expected dynamically registered "${dynamicTitle}" to be recognized`);
}
console.log(`Registered dynamic: "${dynamicTitle}" -> isCanonical: ${isCanonicalChallengeTitle(dynamicTitle)}`);

// 4. Simulate translation behavior for German vs English
function mockTranslate(language: 'en' | 'de', text: string): string {
  // If canonical challenge title, must stay in canonical English
  if (isCanonicalChallengeTitle(text)) {
    return canonicalizeChallengeTitle(text);
  }
  // Otherwise translate from locale dictionary
  if (language === 'de') {
    return deDict[text] || text;
  }
  return text;
}

console.log('\n--- Testing English Language Behavior ---');
console.log('Title: "21-Day Gold Beta" ->', mockTranslate('en', '21-Day Gold Beta'));
console.log('Title: "Core Crusher" ->', mockTranslate('en', 'Core Crusher'));
console.log('UI: "Challenge Chat" ->', mockTranslate('en', 'Challenge Chat'));
console.log('UI: "Challenge Library" ->', mockTranslate('en', 'Challenge Library'));

if (mockTranslate('en', '21-Day Gold Beta') !== '21-Day Gold Beta') {
  throw new Error('English title failed');
}

console.log('\n--- Testing German Language Behavior ---');
const deTitle1 = mockTranslate('de', '21-Day Gold Beta');
const deTitle2 = mockTranslate('de', 'Core Crusher');
const deUI1 = mockTranslate('de', 'Challenge Chat');
const deUI2 = mockTranslate('de', 'Challenge Library');
const deUI3 = mockTranslate('de', 'Active Challenges');

console.log('Title (de): "21-Day Gold Beta" ->', deTitle1, '(must be exactly "21-Day Gold Beta")');
console.log('Title (de): "Core Crusher" ->', deTitle2, '(must be exactly "Core Crusher")');
console.log('UI (de): "Challenge Chat" ->', deUI1, '(German: Challenge-Chat)');
console.log('UI (de): "Challenge Library" ->', deUI2, '(German: Challenge-Bibliothek)');
console.log('UI (de): "Active Challenges" ->', deUI3, '(German: Aktive Challenges)');

if (deTitle1 !== '21-Day Gold Beta') {
  throw new Error(`Expected German title to stay "21-Day Gold Beta", got "${deTitle1}"`);
}
if (deTitle2 !== 'Core Crusher') {
  throw new Error(`Expected German title to stay "Core Crusher", got "${deTitle2}"`);
}
if (deUI1 !== 'Challenge-Chat') {
  throw new Error(`Expected German UI to translate "Challenge Chat" to "Challenge-Chat", got "${deUI1}"`);
}
if (deUI2 !== 'Challenge-Bibliothek') {
  throw new Error(`Expected German UI to translate "Challenge Library" to "Challenge-Bibliothek", got "${deUI2}"`);
}
if (deUI3 !== 'Aktive Challenges') {
  throw new Error(`Expected German UI to translate "Active Challenges" to "Aktive Challenges", got "${deUI3}"`);
}

console.log('\nALL VALIDATION CHECKS PASSED SUCCESSFULLY!');
