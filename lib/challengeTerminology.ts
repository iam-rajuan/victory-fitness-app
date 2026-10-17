/**
 * Canonical Challenge Terminology System
 *
 * Ensures challenge titles and names remain in canonical English regardless
 * of the selected application language (e.g. German), while allowing supporting
 * challenge UI copy (description, instructions, status, buttons, labels) to be localized.
 */

const dynamicChallengeTitles = new Set<string>();
const canonicalTitleByLower = new Map<string, string>();

/**
 * Standard UI keys and phrases that should NEVER be treated as challenge titles,
 * even if they contain words like "challenge" or "challenges".
 */
export const EXCLUDED_CHALLENGE_UI_KEYS = new Set([
  'challenge',
  'challenges',
  'challenges:',
  'challenges...',
  'challenges hub',
  'challenges library',
  'challenge chat',
  'challenge chats',
  'challenge library',
  'challenge members',
  'challenge overview',
  'challenge details',
  'challenge progress',
  'challenge completed',
  'challenge finished',
  'challenge available',
  'challenge invite',
  'challenge guest invite',
  'active challenge',
  'active challenges',
  'completed challenge',
  'completed challenges',
  'ready to start challenge',
  'ready to start challenges',
  'your challenge',
  'your challenges',
  'community challenge',
  'community challenges',
  'limited challenges',
  'join challenge',
  'join this challenge',
  'leave challenge',
  'start challenge',
  'finish challenge',
  'failed to start challenge',
  'failed to start challenge.',
  'failed to load challenges',
  'failed to load challenges.',
  'failed to load challenge chat.',
  'failed to load challenge details.',
  'back to challenges',
  'fellow challengers',
  'what to do',
  'why it matters',
  'who is in it',
  'points',
  'pts',
  'joined',
  'days left',
  'day tracker',
  'challenge days',
]);

/**
 * Initial known challenge titles to seed the canonical registry.
 */
export const INITIAL_KNOWN_CHALLENGES: readonly string[] = [
  '21-Day Gold Beta',
  '21 Day Gold Beta',
  '21-Day Beta',
  'Morning Mobility Challenge',
  'Core Crusher',
  '30-Day Shred',
  '7-Day Reset',
  'Strength Foundation',
];

// Seed initial titles
for (const title of INITIAL_KNOWN_CHALLENGES) {
  const trimmed = title.trim();
  dynamicChallengeTitles.add(trimmed);
  canonicalTitleByLower.set(trimmed.toLowerCase(), trimmed);
}

/**
 * Dynamically registers a challenge title as a canonical English challenge title.
 * Called whenever challenges are fetched from the API, loaded from cache, or passed to components.
 */
export function registerCanonicalChallengeTitle(title?: string | null): void {
  if (!title) return;
  const trimmed = String(title).trim();
  if (trimmed.length < 2 || trimmed.length > 200) return;

  const lower = trimmed.toLowerCase();
  if (EXCLUDED_CHALLENGE_UI_KEYS.has(lower)) {
    return;
  }

  dynamicChallengeTitles.add(trimmed);
  canonicalTitleByLower.set(lower, trimmed);
}

/**
 * Batch register multiple challenge titles.
 */
export function registerCanonicalChallengeTitles(titles?: Array<string | null | undefined>): void {
  if (!Array.isArray(titles)) return;
  for (const title of titles) {
    registerCanonicalChallengeTitle(title);
  }
}

/**
 * Regex patterns that identify challenge titles if they have not yet been dynamically registered.
 * E.g. "21-Day Gold Beta", "30-Day Summer Shred", "14-Day Reset Challenge", etc.
 */
const CHALLENGE_TITLE_PATTERNS = [
  /^\d+[- ](?:day|week|month)\b/i,
  /\bgold beta\b/i,
];

/**
 * Checks if a string represents a challenge title that must remain in canonical English.
 */
export function isCanonicalChallengeTitle(text?: string | null): boolean {
  if (!text) return false;
  const trimmed = String(text).trim();
  if (!trimmed || trimmed.length < 2) return false;

  const lower = trimmed.toLowerCase();

  // 1. Exclude standard UI phrases and action labels
  if (EXCLUDED_CHALLENGE_UI_KEYS.has(lower)) {
    return false;
  }

  // 2. Direct registry check (exact match or registered canonical title)
  if (canonicalTitleByLower.has(lower) || dynamicChallengeTitles.has(trimmed)) {
    return true;
  }

  // 3. Pattern match for unregistered challenge titles
  if (CHALLENGE_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    registerCanonicalChallengeTitle(trimmed);
    return true;
  }

  return false;
}

/**
 * Returns the canonical English title for a challenge.
 */
export function canonicalizeChallengeTitle(title?: string | null): string {
  if (!title) return '';
  const trimmed = String(title).trim();
  const lower = trimmed.toLowerCase();
  return canonicalTitleByLower.get(lower) || trimmed;
}
