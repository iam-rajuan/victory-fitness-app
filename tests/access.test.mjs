import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessFeature, getAllowedTabNames, getPostAuthRoute, isSubscriptionActive, isRouteAllowedForPlan } from '../lib/access.ts';

const user = { id: 'test-user', onboarding_completed: true, subscription_tier: 'GOLD_BETA', subscription_purchase_source: 'beta_trial' };

test('completed onboarding does not unlock an expired beta subscription', () => {
  const expired = { ...user, subscription_status: 'EXPIRED', subscription_access: ['mealPlan', 'challenge'] };
  assert.equal(isSubscriptionActive(expired), false);
  assert.equal(canAccessFeature('mealPlan', expired), false);
  assert.equal(isRouteAllowedForPlan('/mealPlan', expired), false);
  assert.deepEqual(getAllowedTabNames(expired), []);
  assert.equal(getPostAuthRoute(expired), '/plan');
});

test('onboarding without a subscription does not grant beta access', () => {
  const unsubscribed = { id: 'test-user', onboarding_completed: true, subscription_tier: 'NONE', subscription_status: 'NONE' };
  assert.equal(canAccessFeature('challenge', unsubscribed), false);
  assert.equal(getPostAuthRoute(unsubscribed), '/plan');
});

test('active beta retains its configured features without premium workout access', () => {
  const active = { ...user, subscription_status: 'ACTIVE', subscription_access: ['mealPlan', 'challenge'] };
  assert.equal(canAccessFeature('mealPlan', active), true);
  assert.equal(canAccessFeature('workoutplan', active), false);
  assert.equal(isRouteAllowedForPlan('/mealPlan', active), true);
  assert.equal(getPostAuthRoute(active), '/(tabs)');
});

test('active paid and ordinary gold trial accounts retain access', () => {
  assert.equal(canAccessFeature('workoutplan', { ...user, subscription_purchase_source: 'stripe', subscription_tier: 'PLATINUM', subscription_status: 'ACTIVE' }), true);
  assert.equal(canAccessFeature('mealPlan', { id: 'trial', subscription_tier: 'NONE', gold_trial: { active: true, tier_granted: 'GOLD' } }), true);
});


test('pending payment retains the access window supported by the backend', () => {
  assert.equal(isSubscriptionActive({ subscription_tier: 'GOLD', subscription_status: 'PENDING_PAYMENT' }), true);
  assert.equal(isSubscriptionActive({ ...user, subscription_status: 'EXPIRED' }), false);
  assert.equal(isSubscriptionActive({ ...user, subscription_purchase_source: 'stripe', subscription_status: 'EXPIRED' }), false);
});
