import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  ApiError,
  createStripeCheckoutSession,
  fetchCurrentUser,
  fetchSubscriptionPlans,
  startPhaseOneBetaSubscription,
  SubscriptionPlan,
} from '../lib/api';
import { BillingCycle, PLAN_CARDS, SubscriptionTier } from '../lib/access';
import { replaceRoute } from '../lib/navigation';
import RequirementAuditBoundary from '../components/audit/RequirementAuditBoundary';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';
const MUTED = 'rgba(247,243,238,0.58)';
const BLUE_GRAY = '#8FA8C4';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

type TierOption = {
  tier: SubscriptionTier;
  planId: string;
  title: string;
  description: string;
  yearly: number | null;
  monthly: number | null;
  isApplicationOnly: boolean;
  isComingSoon: boolean;
  badge?: string;
};

const DEFAULT_DESCRIPTIONS: Partial<Record<SubscriptionTier, string>> = {
  GOLD_BETA: '21 days of Gold access for approved beta users. No card required.',
  SILVER: 'Good start, but not enough for full transformation.',
  GOLD: 'This is where real consistency starts. Structure and accountability.',
  PLATINUM: 'For those who want more precision and faster results.',
  INNER_CIRCLE: 'Direct coaching access. Application only.',
};

const DEFAULT_PRICES: Partial<Record<SubscriptionTier, { yearly: number; monthly: number }>> = {
  SILVER: { yearly: 179, monthly: 17 },
  GOLD: { yearly: 299, monthly: 29 },
  PLATINUM: { yearly: 399, monthly: 39 },
};

const TIER_ORDER: SubscriptionTier[] = ['GOLD_BETA', 'SILVER', 'GOLD', 'PLATINUM'];

function normalizeTier(value?: string | null): SubscriptionTier {
  const tier = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  if (tier === 'GOLD_BETA' || tier === 'SILVER' || tier === 'GOLD' || tier === 'PLATINUM' || tier === 'INNER_CIRCLE') {
    return tier;
  }
  return 'NONE';
}

function getDisplayTierForUser(user: { subscription_tier?: string | null; subscription_purchase_source?: string | null }) {
  if (String(user.subscription_purchase_source ?? '').trim().toLowerCase() === 'beta_trial') {
    return 'GOLD_BETA' as SubscriptionTier;
  }
  return normalizeTier(user.subscription_tier);
}

function formatEuro(value: number | null | undefined) {
  if (value == null) {
    return 'Free';
  }
  return `€${value}`;
}

function getTierAccent(tier: SubscriptionTier) {
  if (tier === 'GOLD' || tier === 'GOLD_BETA') return GOLD;
  if (tier === 'PLATINUM') return '#D8E8FF';
  return '#D8DEE9';
}

function buildPlanOptions(apiPlans: SubscriptionPlan[]): TierOption[] {
  const options = TIER_ORDER.map((tier) => {
    const local = PLAN_CARDS.find((card) => card.tier === tier);
    const apiPlan = apiPlans.find((plan) => plan.subscriptionTier === tier);
    const isBeta = tier === 'GOLD_BETA';

    return {
      tier,
      planId: apiPlan?.id ?? (isBeta ? 'plan-gold-beta-21-day' : tier),
      title: isBeta ? '21-Day Trial' : apiPlan?.title ?? local?.title ?? tier,
      description: apiPlan?.description || DEFAULT_DESCRIPTIONS[tier] || local?.description || '',
      yearly: isBeta ? 0 : apiPlan?.discountedPriceYearly ?? apiPlan?.priceYearly ?? DEFAULT_PRICES[tier]?.yearly ?? null,
      monthly: isBeta ? 0 : apiPlan?.discountedPriceMonthly ?? apiPlan?.priceMonthly ?? DEFAULT_PRICES[tier]?.monthly ?? null,
      isApplicationOnly: Boolean(apiPlan?.isApplicationOnly ?? tier === 'INNER_CIRCLE'),
      isComingSoon: Boolean(apiPlan?.isComingSoon),
      badge: isBeta ? '21 DAY BETA' : apiPlan?.isMostPopular || tier === 'GOLD' ? 'MOST CHOSEN' : undefined,
    };
  });

  return options.filter((option) => !option.isApplicationOnly);
}

export default function PlanSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; entry?: string }>();
  const { width } = useWindowDimensions();
  const isNarrow = width < 420;
  const pageMaxWidth = 430;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('NONE');
  const [betaTrialActive, setBetaTrialActive] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('GOLD_BETA');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [errorMessage, setErrorMessage] = useState('');

  const entry = String(params.entry ?? '').trim().toLowerCase();
  const requiresPlanSelection = entry === 'onboarding' || currentTier === 'NONE';
  const fallbackRoute = requiresPlanSelection ? '/onboarding' : entry.startsWith('profile') ? '/profile' : '/(tabs)';

  const loadPlanState = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setErrorMessage('');

    try {
      const [user, plansResponse] = await Promise.all([
        fetchCurrentUser(),
        fetchSubscriptionPlans(),
      ]);
      const nextCurrentTier = getDisplayTierForUser(user);
      const hasActiveBetaTrial =
        String(user.subscription_purchase_source ?? '').trim().toLowerCase() === 'beta_trial'
        && String(user.subscription_status ?? '').trim().toUpperCase() === 'ACTIVE';
      const items = Array.isArray(plansResponse?.items) ? plansResponse.items : [];
      setCurrentTier(nextCurrentTier);
      setBetaTrialActive(hasActiveBetaTrial);
      setPlans(items);
      setSelectedTier(hasActiveBetaTrial ? 'GOLD_BETA' : nextCurrentTier === 'NONE' ? 'GOLD_BETA' : nextCurrentTier);
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load subscription plans.';
      setErrorMessage(message);
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlanState(true);
  }, [loadPlanState]);

  useEffect(() => {
    let cancelled = false;
    const checkoutStatus = String(params.checkout ?? '').toLowerCase();

    if (checkoutStatus === 'cancelled' || checkoutStatus === 'canceled') {
      setErrorMessage('Checkout was cancelled. Your subscription was not changed.');
      replaceRoute(router, '/plan');
      return;
    }

    if (checkoutStatus !== 'success') {
      return;
    }

    const waitForActivation = async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const user = await loadPlanState(false);
        if (cancelled) return;
        const tier = normalizeTier(user?.subscription_tier);
        const status = String(user?.subscription_status ?? '').toUpperCase();
        if (tier !== 'NONE' && status === 'ACTIVE') {
          replaceRoute(router, '/(tabs)');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setErrorMessage('Payment completed. We are still waiting for the backend to activate your plan.');
    };

    void waitForActivation();
    return () => {
      cancelled = true;
    };
  }, [loadPlanState, params.checkout, router]);

  const options = useMemo(() => buildPlanOptions(plans), [plans]);
  const selectedPlan = options.find((option) => option.tier === selectedTier) ?? options[0];
  const isBetaSelected = selectedPlan?.planId === 'plan-gold-beta-21-day' || selectedPlan?.tier === 'GOLD_BETA';
  const isComingSoonSelected = Boolean(selectedPlan?.isComingSoon);
  const isCurrentPlan = betaTrialActive || (currentTier === selectedPlan?.tier && currentTier !== 'NONE');

  const handleBack = () => {
    if (!requiresPlanSelection && router.canGoBack()) {
      router.back();
      return;
    }
    replaceRoute(router, fallbackRoute);
  };

  const handleContinue = async () => {
    if (!selectedPlan || saving) return;

    if (isCurrentPlan) {
      replaceRoute(router, '/(tabs)');
      return;
    }

    if (isComingSoonSelected) {
      setErrorMessage('This plan is coming soon.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      if (isBetaSelected) {
        await startPhaseOneBetaSubscription();
        replaceRoute(router, '/(tabs)');
        return;
      }

      const checkout = await createStripeCheckoutSession({
        subscription_tier: selectedPlan.tier,
        billing_cycle: billingCycle,
        plan_id: selectedPlan.planId,
      });
      await Linking.openURL(checkout.checkout_url);
    } catch (error) {
      const message = error instanceof ApiError && error.status === 404
        ? 'The backend checkout route was not found. Restart or redeploy the backend, then try again.'
        : error instanceof Error
          ? error.message
          : 'Unable to start this subscription.';
      setErrorMessage(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Subscription failed', message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.outer}>
        <ScrollView
          style={[styles.page, { maxWidth: pageMaxWidth }]}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: isNarrow ? 22 : 28,
              paddingTop: isNarrow ? 18 : 26,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={22} color={MUTED} />
          </TouchableOpacity>

          <RequirementAuditBoundary
            auditId="APP-MISMATCH-001"
            status="mismatch"
            label="MISMATCH - DOCUMENT REQUIRES 5-DAY GOLD TRIAL"
          >
            <Text style={styles.kicker}>21 DAY GOLD BETA</Text>
            <Text style={styles.title}>Start where you think you belong</Text>
            <Text style={styles.subtitle}>
              Your plan is already built either way. Start with the free beta, or choose the tier you want to keep.
            </Text>
          </RequirementAuditBoundary>

          {!betaTrialActive ? <View style={styles.segmentTrack}>
            <TouchableOpacity
              style={[styles.segmentButton, billingCycle === 'yearly' && styles.segmentButtonActive]}
              onPress={() => setBillingCycle('yearly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, billingCycle === 'yearly' && styles.segmentTextActive]}>
                Yearly · save 14%
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, billingCycle === 'monthly' && styles.segmentButtonActive]}
              onPress={() => setBillingCycle('monthly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, billingCycle === 'monthly' && styles.segmentTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View> : null}

          {betaTrialActive ? (
            <View style={styles.trialNotice}>
              <Text style={styles.trialNoticeText}>Your 21-Day Gold Beta is active. Paid plans unlock after your trial ends.</Text>
            </View>
          ) : null}

          <View style={styles.cardsWrap}>
            {options.map((option) => {
              const active = selectedTier === option.tier;
              const isBeta = option.tier === 'GOLD_BETA';
              const disabledDuringBeta = betaTrialActive && !isBeta;
              const disabled = disabledDuringBeta || option.isComingSoon;
              const price = billingCycle === 'yearly' ? option.yearly : option.monthly;
              const companionPrice = billingCycle === 'yearly' ? option.monthly : option.yearly;
              const accent = getTierAccent(option.tier);

              const card = (
                <TouchableOpacity
                  style={[
                    styles.planCard,
                    active && styles.planCardActive,
                    isBeta && styles.betaCard,
                    disabled && styles.planCardDisabled,
                  ]}
                  activeOpacity={disabled ? 1 : 0.86}
                  disabled={disabled}
                  onPress={() => setSelectedTier(option.tier)}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.planTitle, { color: active ? GOLD : accent }]}>{option.title.replace('Victory ', '')}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>{option.isComingSoon ? 'Coming soon' : isBeta ? 'Free' : formatEuro(price)}</Text>
                      <Text style={styles.periodText}>
                        {option.isComingSoon || isBeta ? '' : ` / ${billingCycle === 'yearly' ? 'year' : 'month'}`}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.planDescription}>{option.description}</Text>

                  <View style={styles.cardFooterRow}>
                    {option.badge ? (
                      <View style={[styles.badge, isBeta && styles.betaBadge]}>
                        <Text style={styles.badgeText}>{option.badge}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.altPrice}>
                      {isBeta
                        ? 'No card required'
                        : option.isComingSoon
                          ? 'Not available yet'
                        : `or ${formatEuro(companionPrice)} ${billingCycle === 'yearly' ? 'a month' : 'a year'}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );

              if (isBeta) {
                return (
                  <RequirementAuditBoundary
                    key={option.tier}
                    auditId="APP-MISMATCH-002"
                    status="mismatch"
                    label="MISMATCH - DOCUMENT REQUIRES 5-DAY GOLD TRIAL"
                  >
                    {card}
                  </RequirementAuditBoundary>
                );
              }

              return <React.Fragment key={option.tier}>{card}</React.Fragment>;
            })}
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.ctaButton, saving && styles.ctaButtonDisabled]}
            activeOpacity={0.86}
            onPress={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={OBSIDIAN} />
            ) : (
              <Text style={styles.ctaText}>
                {isCurrentPlan
                  ? 'Continue to Home'
                  : isComingSoonSelected
                    ? 'Coming soon'
                  : isBetaSelected
                    ? 'Start 21-Day Beta'
                    : `Choose ${selectedPlan?.title.replace('Victory ', '') ?? 'Plan'}`}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: OBSIDIAN,
  },
  page: {
    width: '100%',
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  content: {
    paddingBottom: 34,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OBSIDIAN,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 20,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: COPPER,
    marginBottom: 8,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    color: IVORY,
    letterSpacing: 0,
    maxWidth: 330,
  },
  subtitle: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '600',
    color: MUTED,
    marginTop: 12,
    marginBottom: 24,
    maxWidth: 330,
  },
  segmentTrack: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.16)',
    flexDirection: 'row',
    padding: 3,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentButtonActive: {
    backgroundColor: GOLD,
  },
  segmentText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '800',
    color: 'rgba(247,243,238,0.48)',
  },
  segmentTextActive: {
    color: OBSIDIAN,
  },
  cardsWrap: {
    gap: 18,
  },
  planCard: {
    minHeight: 98,
    borderRadius: 14,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(143,168,196,0.18)',
    paddingVertical: 17,
    paddingHorizontal: 16,
  },
  betaCard: {
    borderColor: 'rgba(201,148,58,0.38)',
    backgroundColor: '#12324E',
  },
  planCardActive: {
    borderColor: GOLD,
    borderWidth: 2,
  },
  planCardDisabled: {
    opacity: 0.48,
  },
  trialNotice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,148,58,0.42)',
    backgroundColor: 'rgba(201,148,58,0.12)',
    padding: 12,
    marginBottom: 18,
  },
  trialNoticeText: {
    fontFamily: INTER,
    color: IVORY,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  planTitle: {
    flex: 1,
    fontFamily: CLASH,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: IVORY,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 0,
  },
  priceText: {
    fontFamily: MONO,
    fontSize: 12.5,
    fontWeight: '800',
    color: BLUE_GRAY,
  },
  periodText: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '800',
    color: BLUE_GRAY,
  },
  planDescription: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    color: 'rgba(216,232,255,0.68)',
    marginTop: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
  },
  badge: {
    borderRadius: 4,
    backgroundColor: GOLD,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  betaBadge: {
    backgroundColor: COPPER,
  },
  badgeText: {
    fontFamily: DMSANS,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: OBSIDIAN,
  },
  altPrice: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '800',
    color: BLUE_GRAY,
  },
  errorBox: {
    marginTop: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.32)',
    backgroundColor: 'rgba(239,68,68,0.11)',
    padding: 12,
  },
  errorText: {
    fontFamily: INTER,
    color: '#FCA5A5',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  ctaButtonDisabled: {
    opacity: 0.62,
  },
  ctaText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '900',
    color: OBSIDIAN,
  },
});
