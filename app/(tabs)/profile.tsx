import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import VictoryHeader from '../../components/VictoryHeader';
import AccessRestrictionModal from '../../components/AccessRestrictionModal';
import AccountabilityPartnerCard from '../../components/profile/AccountabilityPartnerCard';
import PointsProgressionCard from '../../components/profile/PointsProgressionCard';
import SubscriptionManagementModal from '../../components/profile/SubscriptionManagementModal';
import { BodyMetrics, fetchCurrentUser, fetchCurrentUserBodyMetrics, getAuthUser, logout, updateCurrentUserBodyMetrics, updateCurrentUserProfile } from '../../lib/api';
import { canAccessFeature, canAccessPlanRoute } from '../../lib/access';
import { SUPPORTED_LANGUAGES, LanguageCode, useLanguage } from '../../lib/i18n';
import { syncOnboardingProfileFields } from '../../lib/onboarding';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';
import { replaceRoute } from '../../lib/navigation';

function getRankIcon(rank: string) {
  const normalized = rank.trim().toLowerCase();
  switch (normalized) {
    case 'bronze':
      return '🥉';
    case 'silver':
      return '🥈';
    case 'gold':
      return '🥇';
    case 'platinum':
      return '💠';
    case 'diamond':
      return '💎';
    case 'master':
      return '👑';
    case 'champion':
      return '🏆';
    case 'titan':
      return '🛡️';
    case 'legend':
      return '🌟';
    case 'immortal':
      return '🔥';
    default:
      return '🔰';
  }
}

const MENU_SECTIONS = [
  {
    title: 'Account',
      items: [
        // Duplicate with MEMBERSHIP STATUS card above - kept in code as comment per design request:
        // { icon: 'card-outline', label: 'Manage Subscription', tint: '#F59E0B', action: 'manage_subscription' },
        { icon: 'person-outline', label: 'Edit Profile', tint: '#4F8EF7', route: '/profile/edit' },
        { icon: 'document-text-outline', label: 'Application', tint: '#EAB308', route: '/profile/application' },
        { icon: 'lock-closed-outline', label: 'Privacy Policy', tint: '#A855F7', route: '/profile/privacy' },
        { icon: 'language-outline', label: 'Language', tint: '#22C55E', action: 'language' },
        { icon: 'help-circle-outline', label: 'Help & Support', tint: '#8B5CF6', route: '/profile/support' },
        { icon: 'notifications-outline', label: 'Trial Notifications', tint: '#00F0D0', route: '/notifications' },
      ],
  },
  {
    title: 'Fitness',
    items: [
      { icon: 'analytics-outline', label: 'Body Metrics', tint: '#06B6D4', action: 'body_metrics' },
      { icon: 'barbell-outline', label: 'Workout', tint: '#06B6D4', route: '/workoutplan' },
      { icon: 'restaurant-outline', label: 'Nutrition', tint: '#F97316', route: '/mealPlan' },
      { icon: 'body-outline', label: 'Journal', tint: '#EC4899', route: '/journal' },
    ],
  }
];

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES;

function getDynamicRankIcon(rank: string) {
  const normalized = rank.trim().toLowerCase();

  switch (normalized) {
    case 'bronze':
      return '\u{1F949}';
    case 'silver':
      return '\u{1F948}';
    case 'gold':
      return '\u{1F947}';
    case 'platinum':
      return '\u{1F4A0}';
    case 'diamond':
      return '\u{1F48E}';
    case 'master':
      return '\u{1F451}';
    case 'champion':
      return '\u{1F3C6}';
    case 'titan':
      return '\u{1F6E1}\uFE0F';
    case 'legend':
      return '\u{1F31F}';
    case 'immortal':
      return '\u{1F525}';
    default:
      return '\u{1F530}';
  }
}

function getSubscriptionTierLabel(tier: string) {
  const normalized = tier.trim().toUpperCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'GOLD_BETA':
      return '21-Day Gold Beta';
    case 'SILVER':
      return 'Silver';
    case 'GOLD':
      return 'Gold';
    case 'PLATINUM':
      return 'Platinum';
    case 'INNER_CIRCLE':
      return 'Inner Circle';
    case 'NONE':
    default:
      return 'Free';
  }
}

function getSubscriptionTierBadgeStyle(tier: string) {
  const normalized = tier.trim().toUpperCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'GOLD_BETA':
      return { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.34)' };
    case 'SILVER':
      return { backgroundColor: 'rgba(148,163,184,0.16)', borderColor: 'rgba(148,163,184,0.34)' };
    case 'GOLD':
      return { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.34)' };
    case 'PLATINUM':
      return { backgroundColor: 'rgba(168,85,247,0.16)', borderColor: 'rgba(168,85,247,0.34)' };
    case 'INNER_CIRCLE':
      return { backgroundColor: 'rgba(14,165,233,0.16)', borderColor: 'rgba(14,165,233,0.34)' };
    case 'NONE':
    default:
      return { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)' };
  }
}

const WEB_AVATAR_IMAGE_STYLE: React.CSSProperties = {
  width: 88,
  height: 88,
  borderRadius: 44,
  objectFit: 'cover',
  border: '1px solid rgba(6,182,212,0.28)',
  display: 'block',
};

export default function ProfileScreen() {
  const checkingAccess = useModuleAccessGuard('/profile');
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [me, setMe] = React.useState<{
    id: string;
    name: string;
    email: string;
    is_verified: boolean;
    role?: string;
    is_admin?: boolean;
    country?: string;
    profileImage?: string;
    points?: number;
    workouts_completed?: number;
    workouts_total?: number;
    streak_days?: number;
    rank?: string;
    next_rank?: string;
    points_to_next_rank?: number;
    rank_progress_fraction?: number;
    subscription_tier?: string;
    subscription_role?: string;
    subscription_status?: string;
    subscription_purchase_source?: string;
    subscription_access?: string[];
    gold_trial?: {
      active?: boolean;
      is_beta_tester?: boolean;
    };
    motivation_statement?: string | null;
    identity_statement?: string | null;
    workout_unlock_label?: string | null;
    training_trigger_context?: string | null;
    training_trigger_action?: string | null;
    subscription?: {
      access?: string[];
    };
    share_activity_with_network?: boolean;
  } | null>(null);
  const [loadingMe, setLoadingMe] = React.useState(true);
  const [bodyMetrics, setBodyMetrics] = React.useState<BodyMetrics>({
    age: '',
    height: '',
    weight: '',
    gender: '',
  });
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  const [showMetricsModal, setShowMetricsModal] = React.useState(false);
  const [showHabitModal, setShowHabitModal] = React.useState(false);
  const [savingMetrics, setSavingMetrics] = React.useState(false);
  const [savingHabits, setSavingHabits] = React.useState(false);
  const [profileImageFailed, setProfileImageFailed] = React.useState(false);
  const [metricsDraft, setMetricsDraft] = React.useState<BodyMetrics>({
    age: '',
    height: '',
    weight: '',
    gender: '',
  });
  const [habitDraft, setHabitDraft] = React.useState({
    motivation_statement: '',
    identity_statement: '',
    workout_unlock_label: '',
    training_trigger_context: '',
    training_trigger_action: '',
  });
  const [showGenderModal, setShowGenderModal] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [restrictedSection, setRestrictedSection] = React.useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = React.useState(false);

  const bodyMetricsSummary = React.useMemo(() => {
    const parts = [
      bodyMetrics.age ? `${bodyMetrics.age}${t('y')}` : '',
      bodyMetrics.height ? `${bodyMetrics.height}${t('cm')}` : '',
      bodyMetrics.weight ? `${bodyMetrics.weight}${t('kg')}` : '',
      bodyMetrics.gender ? t(bodyMetrics.gender) : '',
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : t('Not set');
  }, [bodyMetrics.age, bodyMetrics.gender, bodyMetrics.height, bodyMetrics.weight, t]);

  const languageLabel = React.useMemo(
    () => {
      const selected = LANGUAGE_OPTIONS.find((option) => option.code === language);
      return selected ? selected.nativeLabel : t('English');
    },
    [language, t],
  );

  const profileInitials = React.useMemo(() => {
    const source = (me?.name || me?.email || 'Victory Fitness').trim();
    const words = source.includes('@') ? [source.charAt(0)] : source.split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || 'VF';
  }, [me?.email, me?.name]);
  const profileImageUrl = String(me?.profileImage || '').trim();

  React.useEffect(() => {
    setProfileImageFailed(false);
  }, [profileImageUrl]);

  const visibleMenuSections = React.useMemo(() => {
    return MENU_SECTIONS.map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          let restricted = false;

          if (!('route' in item) || !item.route) {
            return item;
          }
          if (item.route === '/workoutplan') {
            restricted = !canAccessFeature('workoutplan', me);
          }
          if (item.route === '/mealPlan') {
            restricted = !canAccessPlanRoute('/mealPlan', me);
          }
          if (item.route === '/profile/application') {
            restricted = !canAccessFeature('application', me);
          }
          if (item.route === '/admin/challenges') {
            restricted = !Boolean(me?.is_admin);
          }
          if (item.route === '/profile/longevity-os') {
            restricted = !canAccessFeature('longevity', me);
          }
          return { ...item, restricted };
        })
        .map((item) => {
          if ((item as any).action === 'body_metrics') {
            return {
              ...item,
              value: bodyMetricsSummary,
            };
          }
          if ((item as any).action === 'language') {
            return {
              ...item,
              value: languageLabel,
            };
          }
          return item;
        }),
    }));
  }, [bodyMetricsSummary, languageLabel, me]);

  const genderOptions = ['Male', 'Female', 'Other'];

  const loadProfileData = React.useCallback(async (showLoading = true, forceRefresh = false) => {
    if (showLoading) {
      setLoadingMe(true);
    }
    try {
      const cachedUser = await getAuthUser();
      if (cachedUser) {
        setMe(cachedUser);
      }

      const [response, metricsResponse] = await Promise.all([
        fetchCurrentUser({ forceRefresh }),
        fetchCurrentUserBodyMetrics(),
      ]);
      setMe(response);
      setBodyMetrics(metricsResponse);
    } catch {
      setMe(null);
      setBodyMetrics({ age: '', height: '', weight: '', gender: '' });
    } finally {
      if (showLoading) {
        setLoadingMe(false);
      }
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      void (async () => {
        if (cancelled) {
          return;
        }
        await loadProfileData(true, true);
      })();

      return () => {
        cancelled = true;
      };
    }, [loadProfileData]),
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfileData(false, true);
    } finally {
      setRefreshing(false);
    }
  }, [loadProfileData]);

  const rawName = (me?.name || '').trim();
  const displayName = rawName
    ? rawName.split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    : t('Victory Athlete');
  const displayEmail = me?.email ?? t('Fetching /me data');
  const displayVerified = me?.is_verified ? t('Verified') : t('Not verified');
  const points = me?.points ?? 0;
  const workoutsCompleted = me?.workouts_completed ?? 0;
  const workoutsTotal = me?.workouts_total ?? 0;
  const canAccessCoachVictor = canAccessFeature('coach_victor', me);
  const streakDays = me?.streak_days ?? 0;
  const rank = me?.rank ?? 'Noob';
  const nextRank = me?.next_rank ?? rank;
  const progressFraction = Math.min(Math.max(me?.rank_progress_fraction ?? 0, 0), 1);
  const pointsToNextRank = Math.max(me?.points_to_next_rank ?? 0, 0);
  const rankIcon = getDynamicRankIcon(rank);
  const effectiveProfilePlanTier = React.useMemo(() => {
    const purchaseSource = String(me?.subscription_purchase_source ?? '').trim().toLowerCase();
    if (
      String(me?.subscription_tier ?? '').trim().toUpperCase() === 'GOLD_BETA' ||
      purchaseSource === 'beta_trial' ||
      me?.gold_trial?.is_beta_tester
    ) {
      return 'GOLD_BETA';
    }
    return String(me?.subscription_role ?? me?.subscription_tier ?? 'NONE');
  }, [me?.gold_trial?.is_beta_tester, me?.subscription_purchase_source, me?.subscription_role, me?.subscription_tier]);
  const currentPlanLabel = getSubscriptionTierLabel(effectiveProfilePlanTier);
  const currentPlanBadgeStyle = getSubscriptionTierBadgeStyle(effectiveProfilePlanTier);
  const habitSummary = React.useMemo(() => {
    const parts = [
      me?.identity_statement?.trim() ? `Identity: ${me.identity_statement.trim()}` : '',
      me?.workout_unlock_label?.trim() ? `Unlock: ${me.workout_unlock_label.trim()}` : '',
      me?.training_trigger_context?.trim() || me?.training_trigger_action?.trim()
        ? `Trigger: ${[me?.training_trigger_context?.trim(), me?.training_trigger_action?.trim()].filter(Boolean).join(' -> ')}`
        : '',
    ].filter(Boolean);
    return parts.length > 0 ? parts : ['Add your identity, workout unlock, and if-then trigger.'];
  }, [me?.identity_statement, me?.training_trigger_action, me?.training_trigger_context, me?.workout_unlock_label]);
  const profileStats = [
    { label: t('Exercises completed'), value: workoutsTotal > 0 ? `${workoutsCompleted}/${workoutsTotal}` : String(workoutsCompleted), icon: '\u{1F3CB}\uFE0F' },
    { label: t('Streak'), value: `${streakDays}d`, icon: '\u{1F525}' },
    { label: t('Points'), value: String(points), icon: '\u26A1' },
    { label: t('Rank'), value: rank.toUpperCase(), icon: rankIcon },
  ];

  if (checkingAccess) {
    return null;
  }

  const openMetricsModal = () => {
    setMetricsDraft(bodyMetrics);
    setShowMetricsModal(true);
  };

  const openHabitModal = () => {
    setHabitDraft({
      motivation_statement: String(me?.motivation_statement ?? ''),
      identity_statement: String(me?.identity_statement ?? ''),
      workout_unlock_label: String(me?.workout_unlock_label ?? ''),
      training_trigger_context: String(me?.training_trigger_context ?? ''),
      training_trigger_action: String(me?.training_trigger_action ?? ''),
    });
    setShowHabitModal(true);
  };

  const handleSelectLanguage = async (languageKey: LanguageCode) => {
    await setLanguage(languageKey);
    try {
      const updated = await updateCurrentUserProfile({ preferred_language: languageKey });
      setMe((current) => current ? { ...current, ...updated } : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Unable to save language preference.');
      Alert.alert(t('Save failed'), message);
    }
    setShowLanguageModal(false);
  };

  const handleSaveMetrics = async () => {
    if (savingMetrics) {
      return;
    }

    setSavingMetrics(true);
    try {
      const updated = await updateCurrentUserBodyMetrics({
        age: metricsDraft.age.trim(),
        height: metricsDraft.height.trim(),
        weight: metricsDraft.weight.trim(),
        gender: metricsDraft.gender.trim(),
      });
      setBodyMetrics(updated);
      if (me?.id) {
        await syncOnboardingProfileFields(me.id, {
          age: updated.age,
          height: updated.height,
          weight: updated.weight,
          gender: updated.gender,
        });
      }
      setShowMetricsModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update body metrics right now.';
      Alert.alert(t('Save failed'), message);
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleSaveHabits = async () => {
    if (savingHabits) {
      return;
    }

    setSavingHabits(true);
    try {
      const updated = await updateCurrentUserProfile({
        motivation_statement: habitDraft.motivation_statement.trim(),
        identity_statement: habitDraft.identity_statement,
        workout_unlock_label: habitDraft.workout_unlock_label.trim(),
        training_trigger_context: habitDraft.training_trigger_context.trim(),
        training_trigger_action: habitDraft.training_trigger_action.trim(),
      });
      setMe((current) => current ? {
        ...current,
        motivation_statement: updated.motivation_statement ?? null,
        identity_statement: updated.identity_statement ?? null,
        workout_unlock_label: updated.workout_unlock_label ?? null,
        training_trigger_context: updated.training_trigger_context ?? null,
        training_trigger_action: updated.training_trigger_action ?? null,
      } : current);
      setShowHabitModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your habit settings right now.';
      Alert.alert(t('Save failed'), message);
    } finally {
      setSavingHabits(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >

        <VictoryHeader showSettings onSettingsPress={() => router.push('/profile/settings')} />

        {/* ── 1. The Athlete Passport (Hero Identity Card) ── */}
        <View style={styles.heroCard}>
          {/* Top Status Strip */}
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={[styles.tierPlanPill, currentPlanBadgeStyle]}
              activeOpacity={0.8}
              onPress={() => setShowSubscriptionModal(true)}
            >
              <Ionicons name="shield-checkmark" size={12} color="#00F0D0" />
              <Text style={styles.tierPlanPillText}>{currentPlanLabel.toUpperCase()}</Text>
            </TouchableOpacity>

            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#00F0D0" />
              <Text style={styles.verifiedBadgeText}>
                {me?.is_admin ? t('ADMIN') : displayVerified.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Avatar with Integrated Floating Camera Badge */}
          <TouchableOpacity
            style={styles.avatarWrap}
            activeOpacity={0.88}
            onPress={() => router.push('/profile/edit')}
            accessibilityLabel={t('Change profile photo')}
          >
            {profileImageUrl && !profileImageFailed ? (
              Platform.OS === 'web' ? (
                React.createElement('img', {
                  src: profileImageUrl,
                  alt: `${displayName} profile`,
                  referrerPolicy: 'no-referrer',
                  style: WEB_AVATAR_IMAGE_STYLE,
                  onError: () => setProfileImageFailed(true),
                })
              ) : (
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.avatarImage}
                  onError={() => setProfileImageFailed(true)}
                />
              )
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{profileInitials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color="#04111F" />
            </View>
          </TouchableOpacity>

          {/* Name & Handle */}
          <View style={styles.identityBlock}>
            <View style={styles.heroNameRow}>
              <Text style={styles.heroName} numberOfLines={1}>
                {loadingMe ? t('Loading...') : displayName}
              </Text>
            </View>
            <Text style={styles.heroEmail} numberOfLines={1}>
              {loadingMe ? t('Fetching account...') : displayEmail}
            </Text>
          </View>

          {/* Badges Row */}
          <View style={styles.heroBadgeRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{loadingMe ? 'MEMBER' : `${rankIcon} ${rank.toUpperCase()}`}</Text>
            </View>
            <View style={styles.ptsBadge}>
              <Text style={styles.ptsBadgeText}>⚡ {loadingMe ? '...' : points} PTS</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 {streakDays}D STREAK</Text>
            </View>
          </View>

          {/* Rank Progress Bar */}
          <View style={styles.rankProgressWrap}>
            <View style={styles.rankProgressLabels}>
              <Text style={styles.rankProgressLabelLeft}>{rank.toUpperCase()} TIER</Text>
              <Text style={styles.rankProgressLabelRight}>
                {pointsToNextRank > 0 ? `${pointsToNextRank} ${t('pts to')} ${nextRank.toUpperCase()}` : t('MAX RANK ACHIEVED')}
              </Text>
            </View>
            <View style={styles.rankBarBg}>
              <View
                style={[styles.rankBarFill, { width: `${progressFraction * 100}%` as any }]}
              />
            </View>
          </View>
        </View>

        {/* ── 2. Performance KPI Bento Grid ── */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(0, 240, 208, 0.12)' }]}>
              <Ionicons name="barbell-outline" size={18} color="#00F0D0" />
            </View>
            <Text style={styles.kpiValue} numberOfLines={1}>
              {workoutsTotal > 0 ? `${workoutsCompleted}/${workoutsTotal}` : String(workoutsCompleted)}
            </Text>
            <Text style={styles.kpiLabel}>{t('WORKOUTS')}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
              <Ionicons name="flame-outline" size={18} color="#F97316" />
            </View>
            <Text style={styles.kpiValue} numberOfLines={1}>{streakDays}d</Text>
            <Text style={styles.kpiLabel}>{t('STREAK')}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="flash-outline" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.kpiValue} numberOfLines={1}>{points}</Text>
            <Text style={styles.kpiLabel}>{t('POINTS')}</Text>
          </View>
        </View>

        {/* ── 3. Section 20.1: Accountability Partner ── */}
        <AccountabilityPartnerCard onStatusChange={() => void loadProfileData(false, true)} />

        {/* ── 4. Feature 5: Points & Tier Progression ── */}
        <PointsProgressionCard onRefreshNeeded={() => void loadProfileData(false, true)} />

        {/* ── 5. Athlete Mindset & Habit Anchors ── */}
        <View style={styles.mindsetCard}>
          <View style={styles.mindsetHeaderRow}>
            <View style={styles.mindsetHeaderLeft}>
              <View style={styles.mindsetIconCircle}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
              </View>
              <View style={styles.mindsetTextWrap}>
                <Text style={styles.mindsetTitle} numberOfLines={1} ellipsizeMode="tail">{t('MINDSET & HABITS')}</Text>
                <Text style={styles.mindsetSubtitle} numberOfLines={1} ellipsizeMode="tail">{t('Guiding identity & behavioral triggers')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.mindsetEditAction}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/settings')}
            >
              <Ionicons name="settings-outline" size={16} color="#00F0D0" />
            </TouchableOpacity>
          </View>

          {/* Identity Statement Quote */}
          {me?.identity_statement?.trim() ? (
            <View style={styles.identityQuoteBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="rgba(0, 240, 208, 0.4)" style={styles.quoteIcon} />
              <Text style={styles.identityQuoteText}>
                "{me.identity_statement.trim()}"
              </Text>
              <View style={styles.quotePill}>
                <Text style={styles.quotePillText}>{t('CORE IDENTITY')}</Text>
              </View>
            </View>
          ) : null}

          {/* Trigger & Unlock Items */}
          <View style={styles.anchorItemsWrap}>
            {me?.training_trigger_context?.trim() || me?.training_trigger_action?.trim() ? (
              <View style={styles.anchorItemRow}>
                <View style={[styles.anchorIconBadge, { backgroundColor: 'rgba(6, 182, 212, 0.14)' }]}>
                  <Ionicons name="flash-outline" size={14} color="#06B6D4" />
                </View>
                <View style={styles.anchorCopy}>
                  <Text style={styles.anchorItemLabel}>{t('BEHAVIORAL TRIGGER')}</Text>
                  <Text style={styles.anchorItemValue}>
                    {me?.training_trigger_context ? `When ${me.training_trigger_context}` : ''}
                    {me?.training_trigger_context && me?.training_trigger_action ? '  →  ' : ''}
                    {me?.training_trigger_action ? `Then ${me.training_trigger_action}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {me?.workout_unlock_label?.trim() ? (
              <View style={styles.anchorItemRow}>
                <View style={[styles.anchorIconBadge, { backgroundColor: 'rgba(234, 179, 8, 0.14)' }]}>
                  <Ionicons name="headset-outline" size={14} color="#EAB308" />
                </View>
                <View style={styles.anchorCopy}>
                  <Text style={styles.anchorItemLabel}>{t('SESSION UNLOCK REWARD')}</Text>
                  <Text style={styles.anchorItemValue}>{me.workout_unlock_label.trim()}</Text>
                </View>
              </View>
            ) : null}

            {!me?.identity_statement?.trim() && !me?.training_trigger_context?.trim() && !me?.workout_unlock_label?.trim() ? (
              <Text style={styles.emptyMindsetText}>
                {t('Set your identity statement, session unlock rewards, and if-then training triggers in Settings.')}
              </Text>
            ) : null}
          </View>

          {/* Quick Buttons */}
          <View style={styles.mindsetActionsRow}>
            <TouchableOpacity
              style={styles.mindsetPrimaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/profile/settings')}
            >
              <Ionicons name="construct-outline" size={15} color="#00F0D0" />
              <Text style={styles.mindsetPrimaryBtnText}>{t('Manage in Settings')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mindsetSecondaryBtn}
              activeOpacity={0.85}
              onPress={openHabitModal}
            >
              <Ionicons name="pencil" size={15} color="rgba(255,255,255,0.7)" />
              <Text style={styles.mindsetSecondaryBtnText}>{t('Quick edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 6. Coaching & Membership Section ── */}
        <View style={styles.coachSection}>
          <Text style={styles.sectionTitle}>{t('COACHING & MEMBERSHIP')}</Text>

          {/* Coach Victor */}
          {canAccessCoachVictor ? (
            <TouchableOpacity
              style={styles.coachCard}
              activeOpacity={0.85}
              onPress={() => router.push('/chat')}
            >
              <View style={[styles.coachIconWrap, { backgroundColor: 'rgba(0, 240, 208, 0.14)', borderColor: 'rgba(0, 240, 208, 0.3)' }]}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#00F0D0" />
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>COACH VICTOR</Text>
                <View style={styles.coachStatusRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.coachStatus}>{t('Online • Ready to coach')}</Text>
                </View>
              </View>
              <View style={styles.coachActionPill}>
                <Text style={styles.coachActionText}>{t('Chat')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#00F0D0" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.coachCard, styles.lockedCard]}
              activeOpacity={0.85}
              onPress={() => setRestrictedSection(t('Coach Victor'))}
            >
              <View style={[styles.coachIconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]}>
                <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.5)" />
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>COACH VICTOR</Text>
                <Text style={styles.coachLockedStatus}>{t('Upgrade required for AI Coaching')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}

          {/* Membership Plan Card */}
          <TouchableOpacity
            style={[styles.coachCard, styles.membershipPlanCard]}
            activeOpacity={0.86}
            onPress={() => setShowSubscriptionModal(true)}
          >
            <View style={[styles.coachIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.16)', borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
              <Ionicons name="card" size={22} color="#F59E0B" />
            </View>
            <View style={styles.coachInfo}>
              <Text style={styles.coachName}>{t('MEMBERSHIP STATUS')}</Text>
              <Text style={styles.membershipTierSubtext}>
                {t('Plan: {plan}', { plan: currentPlanLabel })}
              </Text>
            </View>
            <View style={styles.managePlanBadge}>
              <Text style={styles.managePlanBadgeText}>{t('Manage')}</Text>
              <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Menu Sections ── */}
        {visibleMenuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{t(section.title).toUpperCase()}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, i) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={[styles.menuRow, (item as any).restricted && styles.lockedRow]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if ((item as any).action === 'manage_subscription') {
                        setShowSubscriptionModal(true);
                        return;
                      }
                      if ((item as any).action === 'body_metrics') {
                        openMetricsModal();
                        return;
                      }
                      if ((item as any).action === 'language') {
                        setShowLanguageModal(true);
                        return;
                      }
                      if ((item as any).restricted) {
                        setRestrictedSection(t(item.label));
                        return;
                      }
                      if ((item as any).route) {
                        router.push((item as any).route);
                      }
                    }}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: `${item.tint}20` }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.tint} />
                    </View>
                    <Text style={styles.menuLabel}>{t(item.label)}</Text>
                    <View style={styles.menuRight}>
                      {(item as any).value && <Text style={styles.menuValue}>{(item as any).value}</Text>}
                      {(item as any).restricted ? (
                        <View style={styles.lockedIconBadge}>
                          <Ionicons name="lock-closed" size={13} color="#F8FAFC" />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                      )}
                    </View>
                  </TouchableOpacity>
                  {i < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Privacy & Community Sharing ── */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{t('Privacy & Community').toUpperCase()}</Text>
          <View style={styles.menuCard}>
            <View style={styles.privacyRow}>
              <View style={[styles.menuIconWrap, { backgroundColor: 'rgba(0, 240, 208, 0.15)' }]}>
                <Ionicons name="people" size={18} color="#00F0D0" />
              </View>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.menuLabel}>{t('Share Activity with Network')}</Text>
                <Text style={styles.privacySubLabel}>
                  {t('Allow workout activity to contribute to the community trainee count.')}
                </Text>
              </View>
              <Switch
                value={Boolean(me?.share_activity_with_network !== false)}
                onValueChange={async (value) => {
                  try {
                    const updated = await updateCurrentUserProfile({ share_activity_with_network: value });
                    setMe((prev) => prev ? { ...prev, share_activity_with_network: updated.share_activity_with_network } : prev);
                  } catch (e) {
                    Alert.alert(t('Error'), t('Failed to update privacy setting'));
                  }
                }}
                trackColor={{ false: '#262D42', true: '#00F0D0' }}
                thumbColor={me?.share_activity_with_network !== false ? '#FFFFFF' : '#8E9BAE'}
              />
            </View>
          </View>
        </View>

        {/* ── Log Out ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={async () => {
            await logout();
            replaceRoute(router, '/login');
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('Log Out')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{t('Victory Fitness v1.0.0')}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
      <AccessRestrictionModal
        visible={Boolean(restrictedSection)}
        sectionName={restrictedSection}
        onClose={() => setRestrictedSection('')}
        onUpdatePlan={() => {
          setRestrictedSection('');
          router.push('/plan?entry=profile');
        }}
        onBackHome={() => {
          setRestrictedSection('');
          replaceRoute(router, '/(tabs)');
        }}
      />

      <SubscriptionManagementModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscriptionUpdated={() => void loadProfileData(false, true)}
      />

      <Modal visible={showMetricsModal} transparent animationType="fade" onRequestClose={() => setShowMetricsModal(false)}>
        <View style={styles.metricsModalOverlay}>
          <View style={styles.metricsModalCard}>
            {savingMetrics ? (
              <View style={styles.metricsSavingOverlay}>
                <View style={styles.metricsSavingCard}>
                  <ActivityIndicator color={Colors.accentBlue} size="large" />
                  <Text style={styles.metricsSavingText}>{t('Saving metrics...')}</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.metricsModalHeader}>
              <Text style={styles.metricsModalTitle}>{t('UPDATE BODY METRICS')}</Text>
              <TouchableOpacity onPress={() => setShowMetricsModal(false)} disabled={savingMetrics}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            <View style={styles.metricsFormGrid}>
              <View style={styles.metricsInputGroup}>
                <Text style={styles.metricsInputLabel}>{t('AGE')}</Text>
                <View style={styles.metricsInputWrap}>
                  <TextInput
                    style={styles.metricsInput}
                    value={metricsDraft.age}
                    onChangeText={(value) => setMetricsDraft((prev) => ({ ...prev, age: value }))}
                    keyboardType="numeric"
                    editable={!savingMetrics}
                  />
                  <Text style={styles.metricsInputUnit}>yrs</Text>
                </View>
              </View>

              <View style={styles.metricsInputGroup}>
                <Text style={styles.metricsInputLabel}>{t('GENDER')}</Text>
                <TouchableOpacity
                  style={styles.metricsInputWrap}
                  activeOpacity={0.8}
                  onPress={() => setShowGenderModal(true)}
                  disabled={savingMetrics}
                >
                  <Text style={styles.metricsInput}>{metricsDraft.gender ? t(metricsDraft.gender) : t('Select')}</Text>
                  <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.45)" />
                </TouchableOpacity>
              </View>

              <View style={styles.metricsInputGroup}>
                <Text style={styles.metricsInputLabel}>{t('HEIGHT')}</Text>
                <View style={styles.metricsInputWrap}>
                  <TextInput
                    style={styles.metricsInput}
                    value={metricsDraft.height}
                    onChangeText={(value) => setMetricsDraft((prev) => ({ ...prev, height: value }))}
                    keyboardType="numeric"
                    editable={!savingMetrics}
                  />
                  <Text style={styles.metricsInputUnit}>cm</Text>
                </View>
              </View>

              <View style={styles.metricsInputGroup}>
                <Text style={styles.metricsInputLabel}>{t('WEIGHT')}</Text>
                <View style={styles.metricsInputWrap}>
                  <TextInput
                    style={styles.metricsInput}
                    value={metricsDraft.weight}
                    onChangeText={(value) => setMetricsDraft((prev) => ({ ...prev, weight: value }))}
                    keyboardType="numeric"
                    editable={!savingMetrics}
                  />
                  <Text style={styles.metricsInputUnit}>kg</Text>
                </View>
              </View>
            </View>

            <View style={styles.metricsActionRow}>
              <TouchableOpacity
                style={styles.metricsCancelBtn}
                activeOpacity={0.85}
                onPress={() => setShowMetricsModal(false)}
                disabled={savingMetrics}
              >
                <Text style={styles.metricsCancelBtnText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.metricsSaveBtn} activeOpacity={0.85} onPress={handleSaveMetrics} disabled={savingMetrics}>
                {savingMetrics ? <ActivityIndicator size="small" color="#04111F" /> : <Text style={styles.metricsSaveBtnText}>{t('Save Changes')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowLanguageModal(false)}>
          <View style={styles.metricsModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.genderModalCard}>
                <Text style={styles.genderModalTitle}>{t('SELECT LANGUAGE')}</Text>
                <ScrollView style={styles.profileLanguageList} contentContainerStyle={styles.profileLanguageListContent}>
                  {LANGUAGE_OPTIONS.map((option) => {
                    const active = language === option.code;
                    return (
                      <TouchableOpacity
                        key={option.code}
                        activeOpacity={0.85}
                        style={[styles.profileLanguageOption, active && styles.profileLanguageOptionActive]}
                        onPress={() => void handleSelectLanguage(option.code)}
                      >
                        <Text style={[styles.profileLanguageOptionText, active && styles.profileLanguageOptionTextActive]}>
                          {option.code.toUpperCase()}
                        </Text>
                        <View style={styles.profileLanguageOptionCopy}>
                          <Text style={[styles.profileLanguageNativeText, active && styles.profileLanguageOptionTextActive]}>
                            {option.nativeLabel}
                          </Text>
                          <Text style={styles.profileLanguageEnglishText}>{t(option.label)}</Text>
                        </View>
                        {active ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={showHabitModal} transparent animationType="fade" onRequestClose={() => setShowHabitModal(false)}>
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          setShowHabitModal(false);
        }}>
          <View style={styles.metricsModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
                style={styles.habitKeyboardWrap}
              >
                <View style={[styles.metricsModalCard, styles.habitModalCard]}>
                  <View style={styles.metricsModalHeader}>
                    <Text style={styles.metricsModalTitle}>{t('MINDSET & HABITS')}</Text>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setShowHabitModal(false)} disabled={savingHabits}>
                      <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.habitModalScroll}
                    contentContainerStyle={styles.habitModalScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.habitFieldLabel}>{t('Commitment statement')}</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.motivation_statement}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, motivation_statement: value.slice(0, 240) }))}
                      placeholder="Why this matters to you"
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      multiline
                      textAlignVertical="top"
                      returnKeyType="done"
                    />

                    <Text style={styles.habitFieldLabel}>Who are you becoming? (Section 20.3)</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.identity_statement}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, identity_statement: value }))}
                      placeholder="I am someone who..."
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      multiline
                      autoCorrect={false}
                      maxLength={280}
                      textAlignVertical="top"
                      returnKeyType="done"
                    />

                    <Text style={styles.habitFieldLabel}>{t('Workout unlock')} (Section 20.4)</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.workout_unlock_label}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, workout_unlock_label: value.slice(0, 120) }))}
                      placeholder="Example: Favorite Podcast, Fresh Espresso"
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      returnKeyType="done"
                    />

                    <Text style={styles.habitFieldLabel}>After I... (Section 20.5 Trigger)</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.training_trigger_context}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, training_trigger_context: value.slice(0, 240) }))}
                      placeholder="e.g. close my laptop / put the kids to bed"
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      multiline
                      textAlignVertical="top"
                      returnKeyType="done"
                    />

                    <Text style={styles.habitFieldLabel}>I will immediately... (Section 20.5 Action)</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.training_trigger_action}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, training_trigger_action: value.slice(0, 240) }))}
                      placeholder="open the app and start my workout"
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      multiline
                      textAlignVertical="top"
                      returnKeyType="done"
                    />
                  </ScrollView>

                  <View style={styles.metricsActionRow}>
                    <TouchableOpacity
                      style={styles.metricsCancelBtn}
                      activeOpacity={0.85}
                      onPress={() => setShowHabitModal(false)}
                      disabled={savingHabits}
                    >
                      <Text style={styles.metricsCancelBtnText}>{t('Cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.metricsSaveBtn} activeOpacity={0.85} onPress={handleSaveHabits} disabled={savingHabits}>
                      {savingHabits ? <ActivityIndicator size="small" color="#04111F" /> : <Text style={styles.metricsSaveBtnText}>{t('Save Changes')}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={showGenderModal} transparent animationType="fade" onRequestClose={() => setShowGenderModal(false)}>
        <TouchableOpacity style={styles.metricsModalOverlay} activeOpacity={1} onPress={() => setShowGenderModal(false)}>
          <View style={styles.genderModalCard}>
            <Text style={styles.genderModalTitle}>{t('SELECT GENDER')}</Text>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.genderModalOption}
                onPress={() => {
                  setMetricsDraft((prev) => ({ ...prev, gender: option }));
                  setShowGenderModal(false);
                }}
              >
                <Text style={[styles.genderModalOptionText, metricsDraft.gender === option && styles.genderModalOptionTextActive]}>
                  {option.toUpperCase()}
                </Text>
                {metricsDraft.gender === option ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.accentBlue} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C14' },
  scroll: { paddingBottom: 36 },

  /* ── 1. Hero Passport Card ── */
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#111322',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.18)',
    marginBottom: 14,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierPlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierPlanPillText: {
    color: '#00F0D0',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.25)',
  },
  verifiedBadgeText: {
    color: '#00F0D0',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  avatarWrap: {
    position: 'relative',
    width: 86,
    height: 86,
    marginBottom: 14,
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 208, 0.4)',
  },
  avatarFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F2634',
    borderWidth: 2,
    borderColor: 'rgba(0, 240, 208, 0.45)',
  },
  avatarFallbackText: {
    color: '#00F0D0',
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00F0D0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111322',
  },
  identityBlock: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 22,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  heroEmail: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rankBadge: {
    backgroundColor: 'rgba(0, 240, 208, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.28)',
  },
  rankBadgeText: {
    color: '#00F0D0',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  ptsBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  ptsBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  streakBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  streakBadgeText: {
    color: '#F97316',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  rankProgressWrap: {
    width: '100%',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  rankProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rankProgressLabelLeft: {
    fontSize: 10,
    color: '#00F0D0',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  rankProgressLabelRight: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.4,
  },
  rankBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  rankBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#00F0D0',
  },

  /* ── 2. Performance 3-Metric KPI Bento Strip ── */
  kpiRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#121422',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  kpiLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },

  /* ── 5. Athlete Mindset & Habit Anchors ── */
  mindsetCard: {
    marginHorizontal: 16,
    backgroundColor: '#121422',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mindsetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mindsetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  mindsetTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  mindsetIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mindsetTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  mindsetSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  mindsetEditAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  identityQuoteBox: {
    backgroundColor: 'rgba(0, 240, 208, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.18)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: 8,
    left: 10,
    opacity: 0.3,
  },
  identityQuoteText: {
    color: '#E6FFFB',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    fontFamily: 'Inter_500Medium',
    paddingLeft: 18,
  },
  quotePill: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 240, 208, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  quotePillText: {
    color: '#00F0D0',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  anchorItemsWrap: {
    gap: 8,
    marginBottom: 14,
  },
  anchorItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  anchorIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorCopy: {
    flex: 1,
  },
  anchorItemLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  anchorItemValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  emptyMindsetText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    paddingVertical: 6,
  },
  mindsetActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mindsetPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.25)',
  },
  mindsetPrimaryBtnText: {
    color: '#00F0D0',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  mindsetSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  mindsetSecondaryBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  /* ── 6. Coaching & Membership Section ── */
  coachSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121422',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 10,
    gap: 12,
  },
  lockedCard: {
    opacity: 0.75,
  },
  membershipPlanCard: {
    borderColor: 'rgba(245, 158, 11, 0.22)',
    backgroundColor: '#141424',
  },
  coachIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  coachStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  coachStatus: {
    fontSize: 11,
    color: '#00F0D0',
    fontFamily: 'Inter_500Medium',
  },
  coachLockedStatus: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  coachActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 208, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.25)',
  },
  coachActionText: {
    color: '#00F0D0',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  membershipTierSubtext: {
    fontSize: 11,
    color: '#F59E0B',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  managePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  managePlanBadgeText: {
    color: '#F59E0B',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },

  /* ── 7. Menu Sections ── */
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: '#121422',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  lockedRow: {
    opacity: 0.72,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuValue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Inter_400Regular',
  },
  lockedIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 16,
  },

  /* ── 8. Privacy & Community ── */
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  privacySubLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  /* ── 9. Log Out & Footer ── */
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 18,
    letterSpacing: 0.4,
  },

  /* ── Modals ── */
  metricsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 20, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  metricsModalCard: {
    backgroundColor: '#151629',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  metricsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricsModalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  metricsFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricsInputGroup: {
    width: '48%',
    marginBottom: 16,
  },
  metricsInputLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  metricsInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D20',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricsInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    outlineStyle: 'none' as any,
  },
  metricsInputUnit: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  metricsActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricsCancelBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricsCancelBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  metricsSaveBtn: {
    flex: 1,
    backgroundColor: '#00F0D0',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  metricsSaveBtnText: {
    color: '#04111F',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  metricsSavingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 10, 24, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  metricsSavingCard: {
    backgroundColor: '#0E1325',
    borderRadius: 18,
    paddingHorizontal: 28,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  metricsSavingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  habitKeyboardWrap: {
    width: '100%',
    justifyContent: 'center',
  },
  habitModalCard: {
    maxHeight: '82%',
  },
  habitModalScroll: {
    flexGrow: 0,
  },
  habitModalScrollContent: {
    paddingBottom: 8,
  },
  habitFieldLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  habitInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0D0D20',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
    textAlignVertical: 'top',
    outlineStyle: 'none' as any,
  },
  genderModalCard: {
    backgroundColor: '#151629',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  genderModalTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 18,
  },
  genderModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  genderModalOptionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  genderModalOptionTextActive: {
    color: '#00F0D0',
  },
  profileLanguageList: {
    maxHeight: 360,
    width: '100%',
  },
  profileLanguageListContent: {
    gap: 10,
    paddingBottom: 2,
  },
  profileLanguageOption: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: 'rgba(18, 22, 34, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileLanguageOptionActive: {
    borderColor: '#00F0D0',
    backgroundColor: 'rgba(0, 240, 208, 0.13)',
  },
  profileLanguageOptionText: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    width: 38,
  },
  profileLanguageOptionTextActive: {
    color: '#00F0D0',
  },
  profileLanguageOptionCopy: {
    flex: 1,
  },
  profileLanguageNativeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  profileLanguageEnglishText: {
    color: 'rgba(255, 255, 255, 0.48)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
});
