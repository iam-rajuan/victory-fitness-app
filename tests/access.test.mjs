import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessFeature, getAllowedTabNames, getAuthenticatedPublicRouteTarget, getPostAuthRoute, isSubscriptionActive, isRouteAllowedForPlan, shouldShowExpiredBetaSignOut } from '../lib/access.ts';

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

test('only an inactive previous beta user gets the trapped-session sign-out action', () => {
  assert.equal(shouldShowExpiredBetaSignOut({ ...user, subscription_status: 'EXPIRED' }), true);
  assert.equal(shouldShowExpiredBetaSignOut({ ...user, subscription_status: 'ACTIVE' }), false);
  assert.equal(shouldShowExpiredBetaSignOut({ subscription_tier: 'NONE', subscription_status: 'NONE' }), false);
});

test('unfinished users may remain on onboarding and are recovered there from other public routes', () => {
  const unfinished = { id: 'new-user', onboarding_completed: false, subscription_tier: 'NONE', subscription_status: 'NONE' };
  const activatedBeforeCompletion = { ...user, onboarding_completed: false, subscription_status: 'ACTIVE' };
  assert.equal(getPostAuthRoute(unfinished), '/onboarding');
  assert.equal(getAuthenticatedPublicRouteTarget('/onboarding', unfinished), null);
  assert.equal(getAuthenticatedPublicRouteTarget('/welcome', unfinished), '/onboarding');
  assert.equal(getAuthenticatedPublicRouteTarget('/register', unfinished), '/onboarding');
  assert.equal(getAuthenticatedPublicRouteTarget('/onboarding', activatedBeforeCompletion), null);
  assert.equal(getAuthenticatedPublicRouteTarget('/welcome', activatedBeforeCompletion), '/onboarding');
});

test('completed users cannot be sent back through onboarding', () => {
  const active = { ...user, subscription_status: 'ACTIVE' };
  const expired = { ...user, subscription_status: 'EXPIRED' };

  for (const pathname of ['/', '/welcome', '/register', '/onboarding']) {
    assert.equal(getAuthenticatedPublicRouteTarget(pathname, active), '/(tabs)');
    assert.equal(getAuthenticatedPublicRouteTarget(pathname, expired), '/plan');
  }
});

test('public-route recovery ignores unauthenticated users and protected routes', () => {
  assert.equal(getAuthenticatedPublicRouteTarget('/onboarding', null), null);
  assert.equal(getAuthenticatedPublicRouteTarget('/profile', user), null);
});
