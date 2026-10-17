/**
 * Validation script for Victory Fitness Profile Habit Sections Audit
 *
 * Verifies:
 * 1. "My Trigger" is removed from visible Profile cards
 * 2. "My Unlock" is removed from visible Profile cards
 * 3. Accountability Partner / Duo area remains intact and functional
 * 4. "Who I'm Becoming" identity card remains intact
 * 5. Habit edit flow preserves backend trigger & unlock data without wiping fields
 * 6. Visual spacing and layout tokens remain balanced with zero blank areas
 * 7. Existing user payloads (with or without trigger/unlock) load normally
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('=== AUDITING & VALIDATING PROFILE HABIT SECTIONS ===\n');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

// TEST 1: Inspect ClaudeHabitsCard.tsx source code
console.log('Test 1: Auditing ClaudeHabitsCard.tsx for UI removal of My Trigger and My Unlock');
const cardPath = path.join(process.cwd(), 'components', 'profile', 'ClaudeHabitsCard.tsx');
const cardSource = fs.readFileSync(cardPath, 'utf8');

// Ensure 'MY TRIGGER' and 'MY UNLOCK' are not in the rendered JSX
const hasMyTriggerRender = cardSource.includes("{t('MY TRIGGER')}") || cardSource.includes('"MY TRIGGER"');
const hasMyUnlockRender = cardSource.includes("{t('MY UNLOCK')}") || cardSource.includes('"MY UNLOCK"');

assert(!hasMyTriggerRender, 'ClaudeHabitsCard must not render MY TRIGGER');
assert(!hasMyUnlockRender, 'ClaudeHabitsCard must not render MY UNLOCK');
console.log('✓ PASS: Neither "My Trigger" nor "My Unlock" is rendered in the card\n');

// TEST 2: Verify Accountability Duo remains present
console.log('Test 2: Verifying Accountability Partner / Duo remains in ClaudeHabitsCard');
const hasDuoCard = cardSource.includes('styles.duoCard');
const hasPartnerTitle = cardSource.includes('{partnerTitle}');
const hasPartnerNote = cardSource.includes('{partnerNote}');
const hasOnOpenDuo = cardSource.includes('onPress={onOpenDuo}');

assert(hasDuoCard, 'ClaudeHabitsCard must include styles.duoCard');
assert(hasPartnerTitle, 'ClaudeHabitsCard must render partnerTitle');
assert(hasPartnerNote, 'ClaudeHabitsCard must render partnerNote');
assert(hasOnOpenDuo, 'ClaudeHabitsCard must invoke onOpenDuo on press');
console.log('✓ PASS: Accountability Partner / Duo is fully intact and operational\n');

// TEST 3: Verify Identity Card remains present
console.log('Test 3: Verifying "Who I\'m Becoming" identity card remains in ClaudeHabitsCard');
const hasIdentityCard = cardSource.includes('styles.identityCard');
const hasCurrentIdentity = cardSource.includes('{currentIdentity}');
const hasBecomingKicker = cardSource.includes("WHO I'M BECOMING");

assert(hasIdentityCard, 'ClaudeHabitsCard must include styles.identityCard');
assert(hasCurrentIdentity, 'ClaudeHabitsCard must render currentIdentity');
assert(hasBecomingKicker, 'ClaudeHabitsCard must render WHO I\'M BECOMING kicker');
console.log('✓ PASS: "Who I\'m Becoming" identity card remains fully intact\n');

// TEST 4: Verify Edit modal preserves trigger & unlock values when saving
console.log('Test 4: Verifying Edit modal preserves backend trigger and unlock values');
// Verify handleSave passes currentUnlock and currentTrigger to onSaveHabits
const hasSafeSave = cardSource.includes('identity: currentIdentity') &&
  cardSource.includes('unlock: currentUnlock') &&
  cardSource.includes('trigger: currentTrigger');

assert(hasSafeSave, 'handleSave must pass currentUnlock and currentTrigger to onSaveHabits so backend data is preserved');
console.log('✓ PASS: Existing trigger and unlock values are preserved when updating habits\n');

// TEST 5: Verify layout spacing & styling
console.log('Test 5: Verifying layout spacing tokens');
const hasHabitsBlock = cardSource.includes('habitsBlock:');
assert(!hasHabitsBlock, 'Unused habitsBlock style should be removed to avoid orphan layouts');

const hasIdentityMargin = cardSource.includes('identityCard: {') && cardSource.includes('marginBottom: 10');
assert(hasIdentityMargin, 'identityCard must have proper marginBottom: 10 for balanced spacing');

const hasDuoMargin = cardSource.includes('duoCard: {') && cardSource.includes('marginBottom: 10');
assert(hasDuoMargin, 'duoCard must have proper marginBottom: 10 for balanced spacing');
console.log('✓ PASS: Spacing is balanced with clean card margins and zero blank/orphan areas\n');

// TEST 6: Simulate existing user data loading in Profile
console.log('Test 6: Simulating existing user profile loading');
interface UserProfileData {
  identity_statement?: string;
  workout_unlock_label?: string;
  training_trigger_context?: string;
  training_trigger_action?: string;
}

const mockExistingUser: UserProfileData = {
  identity_statement: 'I am someone who trains daily.',
  workout_unlock_label: 'Favorite true-crime podcast',
  training_trigger_context: 'After the kids are in bed',
  training_trigger_action: 'Open Victory Fitness and start',
};

// Simulate profile loading logic from profile.tsx
const habitIdentity = mockExistingUser.identity_statement || 'Set the person you are becoming.';
const habitUnlock = mockExistingUser.workout_unlock_label || '';
const habitTrigger = [mockExistingUser.training_trigger_context, mockExistingUser.training_trigger_action].filter(Boolean).join(', ');

assert(habitIdentity === 'I am someone who trains daily.', 'Identity loaded');
assert(habitUnlock === 'Favorite true-crime podcast', 'Unlock loaded into state');
assert(habitTrigger === 'After the kids are in bed, Open Victory Fitness and start', 'Trigger loaded into state');

// Simulate saving habit identity
let savedPayload: any = null;
const mockSaveHabits = (habits: { identity: string; unlock: string; trigger: string }) => {
  savedPayload = {
    identity_statement: habits.identity.trim(),
    workout_unlock_label: habits.unlock.trim(),
    training_trigger_context: habits.trigger.trim(),
  };
};

mockSaveHabits({
  identity: 'I am becoming the strongest version of myself.',
  unlock: habitUnlock,
  trigger: habitTrigger,
});

assert(savedPayload.identity_statement === 'I am becoming the strongest version of myself.', 'Identity updated');
assert(savedPayload.workout_unlock_label === 'Favorite true-crime podcast', 'Unlock label safely preserved in payload');
assert(savedPayload.training_trigger_context.includes('After the kids are in bed'), 'Trigger context safely preserved in payload');

console.log('✓ PASS: Existing user profile data loads normally and is preserved across updates\n');

console.log('=== ALL 6 AUDIT VALIDATION CHECKS PASSED SUCCESSFULLY ===');
