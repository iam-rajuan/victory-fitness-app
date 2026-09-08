import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, createStripeCheckoutSession, fetchCurrentUser, fetchRuntimeFeatureFlags, fetchSubscriptionPlans, startPhaseOneBetaSubscription, SubscriptionPlan } from '../lib/api';
import {
  AppPlanCard,
  BillingCycle,
  getSubscriptionCard,
  PLAN_CARDS,
  SubscriptionTier,
} from '../lib/access';
import { useLanguage } from '../lib/i18n';
import { replaceRoute } from '../lib/navigation';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';

type AppPlanViewModel = AppPlanCard & {
  planId: string;
  description: string;
  features: string[];
  priceMonthly: number | null;
  priceYearly: number | null;
  discountedPriceMonthly: number | null;
  discountedPriceYearly: number | null;
  discountPercentage: number | null;
  discountStartDate: string | null;
  discountEndDate: string | null;
  isDiscountActive: boolean;
  isApplicationOnly: boolean;
  isMostPopular: boolean;
  iconType: string;
  isDashboardConfigured: boolean;
};

function formatPrice(value: number | null, cycle: BillingCycle) {
  if (value == null) {
    return 'Application Only';
  }
  return `EUR ${value} / ${cycle === 'monthly' ? 'month' : 'year'}`;
}

function formatEuroAmount(value: number | null) {
  if (value == null) {
    return 'Application Only';
  }
  return `EUR ${value}`;
}

function getPlanPricing(plan: AppPlanViewModel, cycle: BillingCycle) {
  if (plan.isApplicationOnly) {
    return {
      originalPrice: null,
      finalPrice: null,
      hasActiveDiscount: false,
      savings: null,
      cycleLabel: cycle === 'monthly' ? 'month' : 'year',
    };
  }

  const originalPrice = cycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const finalPrice = cycle === 'monthly' ? plan.discountedPriceMonthly : plan.discountedPriceYearly;
  const hasActiveDiscount =
    Boolean(plan.isDiscountActive) &&
    plan.discountPercentage != null &&
    originalPrice != null &&
    finalPrice != null &&
    finalPrice !== originalPrice;

  return {
    originalPrice,
    finalPrice,
    hasActiveDiscount,
    savings: hasActiveDiscount && originalPrice != null && finalPrice != null ? originalPrice - finalPrice : null,
    cycleLabel: cycle === 'monthly' ? 'month' : 'year',
  };
}

function getTierDesign(tier: SubscriptionTier) {
  switch (tier) {
    case 'GOLD_BETA':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.gold,
        badgeBg: 'rgba(201, 148, 58, 0.16)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.gold,
        glowColor: 'rgba(201, 148, 58, 0.2)',
        iconName: 'ribbon-outline' as const,
        tag: 'BETA ACCESS',
        pillBg: Colors.gold,
        pillText: Colors.obsidian,
      };
    case 'SILVER':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.copper,
        badgeBg: 'rgba(181, 101, 29, 0.14)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.copper,
        glowColor: 'rgba(181, 101, 29, 0.2)',
        iconName: 'medal-outline' as const,
        tag: 'ESSENTIALS',
        pillBg: 'rgba(181, 101, 29, 0.2)',
        pillText: Colors.copper,
      };
    case 'GOLD':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.gold,
        badgeBg: 'rgba(201, 148, 58, 0.16)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.gold,
        glowColor: 'rgba(201, 148, 58, 0.2)',
        iconName: 'ribbon-outline' as const,
        tag: 'MOST POPULAR',
        pillBg: Colors.gold,
        pillText: Colors.obsidian,
      };
    case 'PLATINUM':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.gold,
        badgeBg: 'rgba(201, 148, 58, 0.16)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.gold,
        glowColor: 'rgba(201, 148, 58, 0.2)',
        iconName: 'diamond-outline' as const,
        tag: 'RECOMMENDED',
        pillBg: Colors.gold,
        pillText: Colors.obsidian,
      };
    case 'INNER_CIRCLE':
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.copper,
        badgeBg: 'rgba(181, 101, 29, 0.18)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.copper,
        glowColor: 'rgba(181, 101, 29, 0.2)',
        iconName: 'sparkles-outline' as const,
        tag: 'EXCLUSIVE',
        pillBg: Colors.copper,
        pillText: Colors.ivory,
      };
    default:
      return {
        bg: Colors.surfaceCard,
        accentColor: Colors.copper,
        badgeBg: 'rgba(181, 101, 29, 0.12)',
        borderColor: Colors.cardBorder,
        activeBorderColor: Colors.copper,
        glowColor: 'rgba(181, 101, 29, 0.15)',
        iconName: 'key-outline' as const,
        tag: 'BASIC',
        pillBg: 'rgba(181, 101, 29, 0.12)',
        pillText: Colors.copper,
      };
  }
}

function getDisplayTierForUser(user: {
  subscription_tier?: string | null;
  subscription_purchase_source?: string | null;
}): SubscriptionTier {
  if (String(user.subscription_purchase_source ?? '').trim().toLowerCase() === 'beta_trial') {
    return 'GOLD_BETA';
  }

  const tier = String(user.subscription_tier ?? 'NONE').toUpperCase().replace(/\s+/g, '_') as SubscriptionTier;
  return tier === 'NONE' ? 'NONE' : tier;
}

export default function PlanSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; entry?: string }>();
  const { t } = useLanguage();
  const flatListRef = useRef<FlatList>(null);
  const entryAnimation = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const isCompactWidth = screenWidth < 380;
  const cardGap = isCompactWidth ? 12 : 14;
  const cardWidth = Math.min(Math.max(screenWidth - (isCompactWidth ? 38 : 52), 280), 340);
  const horizontalPadding = Math.max((screenWidth - cardWidth) / 2, isCompactWidth ? 12 : 16);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('GOLD_BETA');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('NONE');
  const [userName, setUserName] = useState('Member');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [planItems, setPlanItems] = useState<SubscriptionPlan[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);
  const [entryAnimationEnabled, setEntryAnimationEnabled] = useState(false);
  const [entryAnimationComplete, setEntryAnimationComplete] = useState(false);
  const entry = String(params.entry ?? '').trim().toLowerCase();
  const isOnboardingEntry = entry === 'onboarding';
  const isProfileEntry = entry === 'profile' || entry === 'profile_upgrade' || entry === 'subscription_management';
  const requiresPlanSelection = isOnboardingEntry || currentTier === 'NONE';
  const fallbackRoute = requiresPlanSelection ? '/onboarding' : isProfileEntry ? '/profile' : '/(tabs)';

  const loadSubscriptionState = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [user, plansResponse, featureFlags] = await Promise.all([
        fetchCurrentUser(),
        fetchSubscriptionPlans(),
        fetchRuntimeFeatureFlags().catch(() => null),
      ]);
      const normalizedTier = getDisplayTierForUser(user);
      setCurrentTier(normalizedTier);
      setSelectedTier(normalizedTier === 'NONE' ? 'GOLD_BETA' : normalizedTier);
      setUserName(String(user.name || 'Member'));
      setPlanItems(Array.isArray(plansResponse?.items) ? plansResponse.items : []);
      const animationFlag = featureFlags?.items?.find((item) => item.key === 'upgrade_entry_animation');
      setEntryAnimationEnabled(Boolean(animationFlag?.enabled));
      setEntryAnimationComplete(!animationFlag?.enabled);
      return user;
    } catch {
      Alert.alert(t('Access error'), t('Unable to load your subscription state right now.'));
      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadSubscriptionState(true);
  }, [loadSubscriptionState]);

  useEffect(() => {
    if (loading || !entryAnimationEnabled || entryAnimationComplete) {
      return;
    }
    entryAnimation.setValue(0);
    Animated.timing(entryAnimation, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => setEntryAnimationComplete(true));
  }, [entryAnimation, entryAnimationComplete, entryAnimationEnabled, loading]);

  useEffect(() => {
    let cancelled = false;
    const checkoutStatus = String(params.checkout ?? '').toLowerCase();

    if (checkoutStatus === 'cancelled' || checkoutStatus === 'canceled') {
      Alert.alert('Checkout cancelled', 'Your subscription was not changed.');
      replaceRoute(router, '/plan');
      return;
    }

    if (checkoutStatus !== 'success') {
      return;
    }

    const waitForActivation = async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const user = await loadSubscriptionState(false);
        if (cancelled) {
          return;
        }
        const tier = String(user?.subscription_tier ?? 'NONE').toUpperCase().replace(/\s+/g, '_');
        const status = String(user?.subscription_status ?? '').toUpperCase();
        if (tier !== 'NONE' && status === 'ACTIVE') {
          Alert.alert('Subscription active', 'Your plan is active and your included features are unlocked.');
          replaceRoute(router, '/(tabs)');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (!cancelled) {
        Alert.alert(
          'Payment received',
          'Stripe completed checkout. We are still waiting for the webhook to activate your plan. Refresh this page in a moment.',
        );
        replaceRoute(router, '/plan');
      }
    };

    void waitForActivation();

    return () => {
      cancelled = true;
    };
  }, [loadSubscriptionState, params.checkout, router]);

  const plans = useMemo<AppPlanViewModel[]>(() => {
    return PLAN_CARDS.map((card) => {
      const apiPlan = planItems.find((item) => item.subscriptionTier === card.tier);
      return {
        ...card,
        planId: apiPlan?.id ?? card.tier,
        title: apiPlan?.title ?? card.title,
        description: apiPlan?.description ?? card.description,
        features: Array.isArray(apiPlan?.features) && apiPlan.features.length > 0 ? apiPlan.features : card.features,
        featureAccess: Array.isArray(apiPlan?.featureAccess) && apiPlan.featureAccess.length > 0 ? apiPlan.featureAccess : card.featureAccess,
        priceMonthly: apiPlan?.priceMonthly ?? null,
        priceYearly: apiPlan?.priceYearly ?? null,
        discountedPriceMonthly: apiPlan?.discountedPriceMonthly ?? apiPlan?.priceMonthly ?? null,
        discountedPriceYearly: apiPlan?.discountedPriceYearly ?? apiPlan?.priceYearly ?? null,
        discountPercentage: apiPlan?.discountPercentage ?? null,
        discountStartDate: apiPlan?.discountStartDate ?? null,
        discountEndDate: apiPlan?.discountEndDate ?? null,
        isDiscountActive: Boolean(apiPlan?.isDiscountActive),
        isApplicationOnly: Boolean(apiPlan?.isApplicationOnly ?? card.tier === 'INNER_CIRCLE'),
        isMostPopular: Boolean(apiPlan?.isMostPopular ?? card.badge),
        iconType: apiPlan?.iconType ?? '',
        isDashboardConfigured: Boolean(apiPlan),
      };
    });
  }, [planItems]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.tier === selectedTier) ?? plans[0] ?? { ...getSubscriptionCard('GOLD_BETA'), planId: 'GOLD_BETA', priceMonthly: null, priceYearly: null, discountedPriceMonthly: null, discountedPriceYearly: null, discountPercentage: null, discountStartDate: null, discountEndDate: null, isDiscountActive: false, isApplicationOnly: false, isMostPopular: false, iconType: '', isDashboardConfigured: false },
    [plans, selectedTier]
  );
  const selectedPlanPricing = useMemo(() => getPlanPricing(selectedPlan, billingCycle), [selectedPlan, billingCycle]);
  const selectedTierDesign = useMemo(() => getTierDesign(selectedTier), [selectedTier]);
  const scrollToPlanIndex = (index: number) => {
    if (index >= 0 && index < plans.length) {
      setActiveIndex(index);
      setSelectedTier(plans[index].tier);
      flatListRef.current?.scrollToOffset({ offset: index * (cardWidth + cardGap), animated: true });
    }
  };

  // Centering active card on screen once plans are loaded and calculated
  useEffect(() => {
    if (plans.length > 0 && !hasInitialScrolled) {
      const initialIndex = plans.findIndex((p) => p.tier === selectedTier);
      if (initialIndex >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: initialIndex * (cardWidth + cardGap),
            animated: false,
          });
          setActiveIndex(initialIndex);
        }, 120);
      }
      setHasInitialScrolled(true);
    }
  }, [cardGap, cardWidth, plans, selectedTier, hasInitialScrolled]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (cardWidth + cardGap));
    if (index >= 0 && index < plans.length && index !== activeIndex) {
      setActiveIndex(index);
      setSelectedTier(plans[index].tier);
    }
  };

  const handleConfirm = async () => {
    if (saving) {
      return;
    }

    if (currentTier === selectedTier && currentTier !== 'NONE') {
      Alert.alert('Subscription active', 'This is already your active plan.');
      setConfirmVisible(false);
      return;
    }

    if (selectedPlan.isApplicationOnly || selectedPlanPricing.finalPrice == null) {
      Alert.alert(
        'Application required',
        'This plan is application-only. Please submit an application or contact the Victory Fitness team.',
      );
      setConfirmVisible(false);
      return;
    }

    if (selectedPlan.planId === 'plan-gold-beta-21-day') {
      setSaving(true);
      try {
        await startPhaseOneBetaSubscription();
        Alert.alert('Beta activated', 'Your 21-Day Gold Beta access is active now.');
        replaceRoute(router, '/(tabs)');
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'Unable to activate the 21-Day Gold Beta right now.';
        Alert.alert('Activation failed', message);
      } finally {
        setSaving(false);
        setConfirmVisible(false);
      }
      return;
    }

    setSaving(true);
    try {
      const checkout = await createStripeCheckoutSession({
        subscription_tier: selectedTier,
        billing_cycle: billingCycle,
        plan_id: selectedPlan.planId,
      });
      await Linking.openURL(checkout.checkout_url);
    } catch (error) {
      const message = error instanceof ApiError && error.status === 404
        ? 'The backend route for Stripe checkout was not found. Restart or redeploy the backend that serves this app, then try again.'
        : error instanceof Error
          ? error.message
          : 'Unable to start Stripe checkout.';
      Alert.alert('Checkout failed', message);
    } finally {
      setSaving(false);
      setConfirmVisible(false);
    }
  };

  const handleHeaderBack = useCallback(() => {
    if (!requiresPlanSelection && router.canGoBack()) {
      router.back();
      return;
    }
    replaceRoute(router, fallbackRoute);
  }, [fallbackRoute, requiresPlanSelection, router]);

  const handleHeaderClose = useCallback(() => {
    if (!requiresPlanSelection && router.canGoBack()) {
      router.back();
      return;
    }
    replaceRoute(router, fallbackRoute);
  }, [fallbackRoute, requiresPlanSelection, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#18D2EF" size="large" />
          <Text style={styles.loadingText}>{t('Loading your access plans...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (entryAnimationEnabled && !entryAnimationComplete) {
    const silverOpacity = entryAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const goldOpacity = entryAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });
    const goldScale = entryAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.entryAnimationWrap}>
          <Animated.View style={[styles.entryTierOutline, styles.entrySilverOutline, { opacity: silverOpacity }]}>
            <Text style={styles.entrySilverText}>{t('SILVER')}</Text>
          </Animated.View>
          <Animated.View style={[styles.entryTierOutline, styles.entryGoldOutline, { opacity: goldOpacity, transform: [{ scale: goldScale }] }]}>
            <Text style={styles.entryGoldText}>{t('GOLD')}</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: isCompactWidth ? 12 : 16, paddingBottom: isCompactWidth ? 28 : 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Navigation Bar with Back & Close buttons */}
          <View style={styles.topNavBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.topNavBtn}
              onPress={handleHeaderBack}
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            {requiresPlanSelection ? <View style={styles.topNavBtnPlaceholder} /> : (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.topNavBtn}
                onPress={handleHeaderClose}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Header / Hero */}
          <View style={[styles.hero, { paddingHorizontal: isCompactWidth ? 16 : 22 }]}>
            <View style={styles.kickerBadge}>
              <Ionicons name="sparkles" size={12} color="#18D2EF" />
              <Text style={styles.kicker}>{t('VICTORY FITNESS MEMBERSHIP')}</Text>
            </View>
            <Text style={styles.title}>{t('Choose the plan that fits your goal')}</Text>
            <Text style={styles.subtitle}>
              {`${userName}, ${t('review your access level and update it when you want to unlock more sections. Changes apply immediately after confirmation.')}`}
            </Text>
          </View>

          {/* Master Segmented Billing Toggle */}
          <View style={styles.billingContainer}>
            <View style={styles.billingSegmentTrack}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.billingSegmentBtn, billingCycle === 'monthly' && styles.billingSegmentBtnActive]}
                onPress={() => setBillingCycle('monthly')}
              >
                <Text style={[styles.billingSegmentText, billingCycle === 'monthly' && styles.billingSegmentTextActive]}>
                  {t('MONTHLY')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.billingSegmentBtn, billingCycle === 'yearly' && styles.billingSegmentBtnActive]}
                onPress={() => setBillingCycle('yearly')}
              >
                <Text style={[styles.billingSegmentText, billingCycle === 'yearly' && styles.billingSegmentTextActive]}>
                  {t('YEARLY')}
                </Text>
                <View style={styles.yearlySaveBadge}>
                  <Text style={styles.yearlySaveBadgeText}>{t('SAVE UP TO 33%')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cards Carousel */}
          <View style={styles.carouselSection}>
            <FlatList
              ref={flatListRef}
              data={plans}
              keyExtractor={(item) => item.tier}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + cardGap}
              snapToAlignment="center"
              decelerationRate="fast"
              disableIntervalMomentum={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={[styles.cardsRow, { paddingHorizontal: horizontalPadding }]}
              renderItem={({ item: card, index }) => {
                const active = selectedTier === card.tier;
                const current = currentTier === card.tier;
                const design = getTierDesign(card.tier);
                const pricing = getPlanPricing(card, billingCycle);
                const actionLabel = current
                  ? t('CURRENT PLAN')
                  : card.isApplicationOnly
                    ? t('APPLY NOW')
                    : active
                      ? t('CHOOSE PLAN')
                      : t('SELECT PLAN');

                return (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={[
                      styles.card,
                      {
                        width: cardWidth,
                        marginRight: cardGap,
                        backgroundColor: design.bg,
                        borderColor: active ? design.activeBorderColor : design.borderColor,
                        borderWidth: active ? 2 : 1,
                        shadowColor: Colors.navy,
                        shadowOpacity: active ? 0.25 : 0.12,
                        shadowRadius: active ? 10 : 5,
                        elevation: 2,
                        transform: [{ scale: active ? 1 : 0.98 }],
                      },
                    ]}
                    onPress={() => scrollToPlanIndex(index)}
                  >
                    {/* Top Tag / Pill */}
                    {card.isMostPopular ? (
                      <View style={[styles.topTagPill, { backgroundColor: design.pillBg }]}>
                        <Ionicons name="flame" size={12} color={design.pillText} />
                        <Text style={[styles.topTagText, { color: design.pillText }]}>{t('MOST POPULAR')}</Text>
                      </View>
                    ) : card.tier === 'PLATINUM' ? (
                      <View style={[styles.topTagPill, { backgroundColor: design.pillBg }]}>
                        <Ionicons name="star" size={12} color={design.pillText} />
                        <Text style={[styles.topTagText, { color: design.pillText }]}>{t('RECOMMENDED')}</Text>
                      </View>
                    ) : null}

                    {/* Card Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconCircle, { backgroundColor: design.badgeBg, borderColor: design.accentColor }]}>
                        <Ionicons name={design.iconName} size={22} color={design.accentColor} />
                      </View>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{`${index + 1} / ${plans.length}`}</Text>
                      </View>
                    </View>

                    {/* Title & Description */}
                    <Text style={styles.cardTitle}>{card.title.toUpperCase()}</Text>
                    <Text style={styles.cardDescription}>{t(card.description)}</Text>

                    {/* Pricing Block */}
                    {card.isApplicationOnly ? (
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceMainText}>{t('Application Only')}</Text>
                        <Text style={styles.priceSubText}>{t('Direct VIP coaching evaluation')}</Text>
                      </View>
                    ) : (
                      <View style={styles.priceContainer}>
                        {pricing.hasActiveDiscount ? (
                          <View style={styles.discountRow}>
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountBadgeText}>{`OFFER -${card.discountPercentage}%`}</Text>
                            </View>
                            <Text style={styles.originalPriceText}>{formatEuroAmount(pricing.originalPrice)}</Text>
                          </View>
                        ) : null}

                        <View style={styles.priceMainRow}>
                          <Text style={styles.priceNumber}>{formatEuroAmount(pricing.finalPrice)}</Text>
                          <Text style={styles.pricePeriod}>
                            {billingCycle === 'monthly' ? t('/ month') : t('/ year')}
                          </Text>
                        </View>

                        {pricing.hasActiveDiscount ? (
                          <Text style={styles.savingsText}>
                            {`${t('Save')} ${formatEuroAmount(pricing.savings)} ${t('per')} ${pricing.cycleLabel}`}
                          </Text>
                        ) : card.tier !== 'INNER_CIRCLE' && billingCycle === 'yearly' ? (
                          <Text style={styles.bestValueText}>{t('BEST VALUE BUNDLE')}</Text>
                        ) : null}
                      </View>
                    )}

                    {/* Features List */}
                    <View style={styles.divider} />
                    <View style={styles.featuresList}>
                      {card.features.map((feature: string) => (
                        <View key={feature} style={styles.featureRow}>
                          <View style={[styles.checkCircle, { backgroundColor: design.badgeBg }]}>
                            <Ionicons name="checkmark-sharp" size={12} color={design.accentColor} />
                          </View>
                          <Text style={styles.featureText}>{t(feature)}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Active Status & Card Action CTA */}
                    <View style={styles.cardFooter}>
                      {current ? (
                        <View style={styles.currentActivePill}>
                          <Ionicons name="checkmark-circle-sharp" size={14} color={Colors.gold} />
                          <Text style={styles.currentActiveText}>{t('Active on your profile')}</Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[
                          styles.cardBtn,
                          active && !current && { backgroundColor: Colors.gold },
                          current && { backgroundColor: 'rgba(201, 148, 58, 0.15)', borderWidth: 1, borderColor: Colors.gold },
                          !active && !current && { backgroundColor: 'rgba(247, 243, 238, 0.06)', borderWidth: 1, borderColor: Colors.cardBorder },
                        ]}
                        onPress={() => {
                          if (current) {
                            Alert.alert(t('Subscription active'), t('This is already your active plan.'));
                            return;
                          }
                          if (active) {
                            if (card.isApplicationOnly) {
                              Alert.alert(
                                t('Application required'),
                                t('This plan is application-only. Please submit an application or contact the Victory Fitness team.')
                              );
                              return;
                            }
                            setConfirmVisible(true);
                          } else {
                            scrollToPlanIndex(index);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.cardBtnText,
                            active && !current && { color: Colors.obsidian, fontFamily: Fonts.heading },
                            current && { color: Colors.gold, fontFamily: Fonts.heading },
                            !active && !current && { color: Colors.textSecondary, fontFamily: Fonts.heading },
                          ]}
                        >
                          {actionLabel}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Pagination Dots */}
            <View style={styles.paginationRow}>
              {plans.map((p, idx) => (
                <TouchableOpacity
                  key={p.tier}
                  activeOpacity={0.7}
                  onPress={() => scrollToPlanIndex(idx)}
                  style={[
                    styles.paginationDot,
                    activeIndex === idx && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.swipeHintRow}>
              <Ionicons name="swap-horizontal" size={14} color={Colors.textMuted} />
              <Text style={styles.swipeHintText}>{t('Swipe to compare all access plans')}</Text>
            </View>
          </View>


        </ScrollView>

        {/* Confirmation Modal */}
        <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { borderColor: selectedTierDesign.activeBorderColor }]}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={[styles.iconCircle, { backgroundColor: selectedTierDesign.badgeBg, borderColor: selectedTierDesign.accentColor }]}>
                  <Ionicons name={selectedTierDesign.iconName} size={24} color={selectedTierDesign.accentColor} />
                </View>
                <Text style={styles.modalTitle}>{t('Confirm Membership')}</Text>
              </View>

              {/* Receipt / Invoice Container */}
              <View style={styles.checkoutReceipt}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('Membership Plan')}</Text>
                  <Text style={[styles.receiptValue, { color: selectedTierDesign.accentColor, fontFamily: Fonts.heading }]}>
                    {selectedPlan.title.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t('Billing Cycle')}</Text>
                  <Text style={styles.receiptValue}>
                    {billingCycle === 'monthly' ? t('Monthly') : t('Yearly')}
                  </Text>
                </View>

                {selectedPlanPricing.hasActiveDiscount ? (
                  <>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('Regular Price')}</Text>
                      <Text style={[styles.receiptValue, styles.strikethrough]}>
                        {formatEuroAmount(selectedPlanPricing.originalPrice)}
                      </Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{t('Special Offer Discount')}</Text>
                      <Text style={[styles.receiptValue, { color: Colors.victoryGreen, fontFamily: Fonts.dataBold }]}>
                        {`- ${formatEuroAmount(selectedPlanPricing.savings)}`}
                      </Text>
                    </View>
                  </>
                ) : null}

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRowTotal}>
                  <Text style={styles.receiptLabelTotal}>{t('Total Due Now')}</Text>
                  <Text style={styles.receiptValueTotal}>
                    {formatEuroAmount(selectedPlanPricing.finalPrice)}
                  </Text>
                </View>
              </View>

              {/* Subtext info */}
              <Text style={styles.modalInfoSubtext}>
                {billingCycle === 'monthly'
                  ? t('Renews automatically every month. Cancel anytime in your profile settings.')
                  : t('Renews automatically every year. Cancel anytime in your profile settings.')}
              </Text>

              {/* Features list summary */}
              <View style={styles.modalFeaturesContainer}>
                <Text style={styles.modalFeaturesTitle}>{t('Included Access:')}</Text>
                {selectedPlan.features.slice(0, 3).map((feature: string) => (
                  <View key={feature} style={styles.modalFeatureRow}>
                    <Ionicons name="checkmark-circle" size={14} color={selectedTierDesign.accentColor} />
                    <Text style={styles.modalFeatureText} numberOfLines={1}>
                      {t(feature)}
                    </Text>
                  </View>
                ))}
                {selectedPlan.features.length > 3 ? (
                  <Text style={styles.modalFeaturesMore}>
                    {`+ ${selectedPlan.features.length - 3} ${t('more features')}`}
                  </Text>
                ) : null}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondary}
                  onPress={() => setConfirmVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.modalSecondaryText}>{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalPrimary} onPress={handleConfirm} disabled={saving}>
                  {saving ? <ActivityIndicator color={Colors.obsidian} /> : <Text style={styles.modalPrimaryText}>{t('Confirm Now')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.obsidian },
  page: { flex: 1, backgroundColor: Colors.obsidian },
  content: { paddingTop: 16, paddingBottom: 40 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, backgroundColor: Colors.obsidian },
  loadingText: { color: Colors.textMuted, fontSize: 14, fontFamily: Fonts.body },

  /* Top Navigation Bar */
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  topNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavBtnPlaceholder: {
    width: 40,
    height: 40,
  },

  /* Hero Section */
  hero: { paddingHorizontal: 22, alignItems: 'center', marginBottom: 20 },
  kickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
  },
  kicker: { color: Colors.gold, fontSize: 10, fontFamily: Fonts.heading, letterSpacing: 2 },
  title: { color: Colors.text, fontSize: 26, fontFamily: Fonts.display, marginTop: 12, textAlign: 'center', letterSpacing: 0.2 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: Fonts.body, marginTop: 8, textAlign: 'center', maxWidth: 640 },

  /* Master Billing Segment Switch */
  billingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  billingSegmentTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    width: '100%',
    maxWidth: 390,
  },
  billingSegmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  billingSegmentBtnActive: {
    backgroundColor: Colors.gold,
    shadowColor: Colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  billingSegmentText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
  },
  billingSegmentTextActive: {
    color: Colors.obsidian,
  },
  yearlySaveBadge: {
    position: 'absolute',
    top: -12,
    right: 12,
    backgroundColor: Colors.victoryGreen,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    zIndex: 10,
  },
  yearlySaveBadgeText: {
    color: Colors.ivory,
    fontSize: 8,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },

  /* Carousel Section */
  carouselSection: {
    marginBottom: 10,
  },
  cardsRow: {
    paddingVertical: 10,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    minHeight: 520,
    justifyContent: 'space-between',
    position: 'relative',
  },

  /* Top Tag Pill */
  topTagPill: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: Colors.navy,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    zIndex: 10,
  },
  topTagText: {
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },

  /* Card Header */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stepBadge: {
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
  },
  stepBadgeText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.heading,
  },

  /* Title & Subtitle */
  cardTitle: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: Fonts.display,
    letterSpacing: 0.3,
  },
  cardDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.body,
    marginTop: 8,
    minHeight: 56,
  },

  /* Price Block */
  priceContainer: {
    marginTop: 14,
    minHeight: 70,
    justifyContent: 'center',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  discountBadge: {
    backgroundColor: 'rgba(26, 122, 74, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(26, 122, 74, 0.35)',
  },
  discountBadgeText: {
    color: Colors.victoryGreen,
    fontSize: 10,
    fontFamily: Fonts.heading,
  },
  originalPriceText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: Fonts.data,
    textDecorationLine: 'line-through',
  },
  priceMainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceNumber: {
    color: Colors.text,
    fontSize: 28,
    fontFamily: Fonts.dataBold,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  priceMainText: {
    color: Colors.text,
    fontSize: 22,
    fontFamily: Fonts.dataBold,
  },
  priceSubText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
  savingsText: {
    color: Colors.victoryGreen,
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    marginTop: 4,
  },
  bestValueText: {
    color: Colors.gold,
    fontSize: 10,
    fontFamily: Fonts.heading,
    marginTop: 4,
    letterSpacing: 1,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 14,
  },

  /* Feature List */
  featuresList: {
    gap: 10,
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: Fonts.body,
    flex: 1,
    lineHeight: 19,
  },

  /* Card Footer & Action Button */
  cardFooter: {
    marginTop: 18,
    gap: 10,
  },
  currentActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
  },
  currentActiveText: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  cardBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnText: {
    fontSize: 13,
    letterSpacing: 0.8,
  },

  /* Pagination Dots */
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(247, 243, 238, 0.15)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: Colors.gold,
  },

  /* Swipe Hint */
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  swipeHintText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.body,
  },

  /* Summary Card */
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    padding: 18,
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
  },
  summaryTierTitle: {
    fontSize: 16,
    fontFamily: Fonts.display,
  },
  summaryOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26, 122, 74, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  summaryOfferText: {
    color: Colors.victoryGreen,
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  summaryPriceText: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: Fonts.dataBold,
    marginTop: 4,
  },
  summaryAccessText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  summaryBold: {
    color: Colors.text,
    fontFamily: Fonts.bodySemiBold,
  },

  /* Bottom Confirm Button */
  confirmButton: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: Colors.gold,
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(201, 148, 58, 0.2)',
    borderWidth: 1,
    borderColor: Colors.copper,
    shadowOpacity: 0,
  },
  confirmButtonText: {
    color: Colors.obsidian,
    fontSize: 15,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    padding: 22,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: { color: Colors.text, fontSize: 20, fontFamily: Fonts.display },
  modalText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, fontFamily: Fonts.body, marginTop: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalSecondary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(247, 243, 238, 0.05)',
  },
  modalSecondaryText: { color: Colors.textSecondary, fontSize: 14, fontFamily: Fonts.heading },
  modalPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.gold,
  },
  modalPrimaryText: { color: Colors.obsidian, fontSize: 14, fontFamily: Fonts.heading },

  /* Receipt / Invoice Container */
  checkoutReceipt: {
    backgroundColor: 'rgba(13, 43, 69, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.15)',
    padding: 16,
    marginTop: 18,
    gap: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  receiptLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  receiptValue: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: Fonts.dataBold,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 4,
  },
  receiptLabelTotal: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  receiptValueTotal: {
    color: Colors.gold,
    fontSize: 18,
    fontFamily: Fonts.dataBold,
  },
  modalInfoSubtext: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.body,
    marginTop: 10,
    textAlign: 'center',
  },
  modalFeaturesContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.08)',
    paddingTop: 14,
  },
  modalFeaturesTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginBottom: 8,
  },
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modalFeatureText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.body,
    flex: 1,
  },
  modalFeaturesMore: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.body,
    marginLeft: 20,
    marginTop: 2,
  },
  entryAnimationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  entryTierOutline: {
    position: 'absolute',
    width: '78%',
    maxWidth: 320,
    height: 190,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entrySilverOutline: {
    borderColor: Colors.copper,
    backgroundColor: 'rgba(181, 101, 29, 0.08)',
  },
  entryGoldOutline: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.1)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  entrySilverText: {
    color: Colors.copper,
    fontSize: 18,
    fontFamily: Fonts.heading,
    letterSpacing: 0,
  },
  entryGoldText: {
    color: Colors.gold,
    fontSize: 22,
    fontFamily: Fonts.display,
    letterSpacing: 0,
  },
});
