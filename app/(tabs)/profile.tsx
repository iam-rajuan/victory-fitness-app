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

  const displayName = me?.name ?? t('Loading...');
  const displayEmail = me?.email ?? t('Fetching /me data');
  const displayVerified = me?.is_verified ? t('Verified') : t('Not verified');
  const points = me?.points ?? 0;
  const workoutsCompleted = me?.workouts_completed ?? 0;
  const workoutsTotal = me?.workouts_total ?? 0;
  const canAccessLongevity = canAccessFeature('longevity', me);
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

        <VictoryHeader />

        {/* ── Hero Profile Card ── */}
        <View style={[styles.heroCard, { backgroundColor: Colors.surface }]}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
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
          </View>
          <TouchableOpacity
            style={styles.avatarManageBtn}
            activeOpacity={0.88}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="camera-outline" size={15} color="#06B6D4" />
            <Text style={styles.avatarManageBtnText}>
              {profileImageUrl && !profileImageFailed ? t('Update profile photo') : t('Upload profile photo')}
            </Text>
          </TouchableOpacity>

          {/* Name & Badge */}
          <Text style={styles.heroName}>{loadingMe ? t('Loading...') : displayName}</Text>
          <Text style={styles.heroEmail}>{loadingMe ? t('Fetching /me data') : displayEmail}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{loadingMe ? 'MEMBER' : `${rankIcon} ${rank.toUpperCase()}`}</Text>
            </View>
            <View style={styles.ptsBadge}>
              <Text style={styles.ptsBadgeText}>⚡ {loadingMe ? '...' : points} PTS</Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>{loadingMe ? t('Loading profile...') : displayVerified}</Text>
            {me?.is_admin ? <Text style={styles.heroMetaAdmin}>{t('Admin account')}</Text> : null}
          </View>

          {/* Rank Progress */}
          <View style={styles.rankProgressWrap}>
            <View style={styles.rankProgressLabels}>
              <Text style={styles.rankProgressLabel}>{rank.toUpperCase()}</Text>
              <Text style={styles.rankProgressLabel}>
                {pointsToNextRank > 0 ? `${pointsToNextRank} ${t('pts to')} ${nextRank.toUpperCase()}` : t('MAX RANK')}
              </Text>
            </View>
            <View style={styles.rankBarBg}>
              <View
                style={[styles.rankBarFill, { width: `${progressFraction * 100}%` as any, backgroundColor: Colors.accentBlue }]}
              />
            </View>
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          {profileStats.map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={styles.statEmoji}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Body Metrics ── */}


        {/* ── Coach Cards ── */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsTitleRow}>
            <Text style={styles.metricsTitle}>{t('Mindset & Habits')}</Text>
          </View>
          {habitSummary.map((line) => (
            <Text key={line} style={styles.habitSummaryLine}>{line}</Text>
          ))}
          <TouchableOpacity style={styles.metricsEditBtn} activeOpacity={0.85} onPress={openHabitModal}>
            <Ionicons name="sparkles-outline" size={16} color="#06B6D4" />
            <Text style={styles.metricsEditText}>{t('Edit mindset settings')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.coachSection}>
          <Text style={styles.sectionTitle}>{t('MY COACHES')}</Text>
          {canAccessCoachVictor ? <View style={[styles.coachCard, { backgroundColor: Colors.surface }]}>
            <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentBlue }]}>
              <Ionicons name="add" size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coachName}>COACH VICTOR</Text>
              <Text style={styles.coachStatus}>🟢 {t('Ready for you')}</Text>
            </View>
            <TouchableOpacity
              style={styles.coachArrow}
              onPress={() => router.push('/chat')}
            >
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View> : (
            <TouchableOpacity style={[styles.coachCard, styles.lockedCard]} activeOpacity={0.85} onPress={() => setRestrictedSection(t('Coach Victor'))}>
              <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentBlue }]}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachName}>COACH VICTOR</Text>
                <Text style={styles.coachStatus}>{t('Upgrade required')}</Text>
              </View>
              <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
          {canAccessLongevity ? (
            <View style={styles.coachCard}>
              <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentPurple }]}>
              <Ionicons name="pulse" size={22} color="#fff" />
            </View>
              <View style={{ flex: 1 }}>
              <Text style={styles.coachName}>LONGEVITY OS</Text>
              <Text style={[styles.coachStatus, { color: '#A855F7' }]}>⚡ {t('Optimizing for you')}</Text>
            </View>
              <TouchableOpacity
                style={styles.coachArrow}
                onPress={() => router.push('/profile/longevity-os')}
              >
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.coachCard, styles.lockedCard]} activeOpacity={0.85} onPress={() => setRestrictedSection(t('Longevity OS'))}>
              <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentPurple }]}>
                <Ionicons name="pulse" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachName}>LONGEVITY OS</Text>
                <Text style={[styles.coachStatus, { color: '#A855F7' }]}>{t('Upgrade required')}</Text>
              </View>
              <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.coachCard, styles.planCard]} activeOpacity={0.86} onPress={() => router.push('/plan')}>
            <View style={[styles.coachIconWrap, { backgroundColor: Colors.accentGold }]}>
              <Ionicons name="card-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.coachName}>{t('Update Plan').toUpperCase()}</Text>
              <Text style={styles.coachStatus}>{t('Current plan: {plan}', { plan: currentPlanLabel })}</Text>
            </View>
            <View style={[styles.planBadge, currentPlanBadgeStyle]}>
              <Text style={styles.planBadgeText}>{currentPlanLabel}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
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
          router.push('/plan');
        }}
        onBackHome={() => {
          setRestrictedSection('');
          replaceRoute(router, '/(tabs)');
        }}
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

                    <Text style={styles.habitFieldLabel}>{t('Identity statement')}</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.identity_statement}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, identity_statement: value }))}
                      placeholder="Who are you becoming?"
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      multiline
                      maxLength={240}
                      textAlignVertical="top"
                      returnKeyType="done"
                    />

                    <Text style={styles.habitFieldLabel}>{t('Workout unlock')}</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.workout_unlock_label}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, workout_unlock_label: value.slice(0, 120) }))}
                      placeholder="Example: After work reset"
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      returnKeyType="done"
                    />

                    <Text style={styles.habitFieldLabel}>{t('If-then trigger context')}</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.training_trigger_context}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, training_trigger_context: value.slice(0, 240) }))}
                      placeholder="If it is 6pm and I close my laptop..."
                      placeholderTextColor={Colors.placeholder}
                      editable={!savingHabits}
                      multiline
                      textAlignVertical="top"
                      returnKeyType="done"
                    />

                    <Text style={styles.habitFieldLabel}>{t('If-then trigger action')}</Text>
                    <TextInput
                      style={styles.habitInput}
                      value={habitDraft.training_trigger_action}
                      onChangeText={(value) => setHabitDraft((prev) => ({ ...prev, training_trigger_action: value.slice(0, 240) }))}
                      placeholder="...then I start my workout within 10 minutes."
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
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 30 },


  /* Hero Card */
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.15)',
    marginBottom: 16,
  },
  avatarWrap: { position: 'relative', width: 88, height: 88, marginBottom: 16 },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.28)',
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,182,212,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.42)',
  },
  avatarFallbackText: {
    color: '#E6FFFB',
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: 1,
  },
  avatarManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.24)',
  },
  avatarManageBtnText: {
    color: '#8CEBFF',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  rankRingOuter: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 50,
    padding: 3,
    overflow: 'hidden',
  },
  rankRingGrad: {
    flex: 1,
    borderRadius: 50,
    opacity: 0.5,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E1E38',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.4)',
  },
  heroName: { fontSize: 26, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 10 },
  heroEmail: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  heroBadgeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  rankBadge: { backgroundColor: 'rgba(6,182,212,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(6,182,212,0.3)' },
  rankBadgeText: { color: '#06B6D4', fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  ptsBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  ptsBadgeText: { color: '#F59E0B', fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  heroMetaText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  heroMetaAdmin: {
    color: '#D8B4FE',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  rankProgressWrap: { width: '100%', marginBottom: 16 },
  rankProgressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rankProgressLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  rankBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  rankBarFill: { height: '100%', borderRadius: 4 },

  innerCirclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
  },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#06B6D4' },
  innerCircleText: { fontSize: 11, fontWeight: '700', color: '#06B6D4', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  /* Stats */
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    backgroundColor: '#13132A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  statEmoji: { fontSize: 20, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 9, color: Colors.textMuted, fontFamily: 'Inter_400Regular', letterSpacing: 0.4, textTransform: 'uppercase' },

  /* Body Metrics */
  metricsCard: {
    marginHorizontal: 16,
    backgroundColor: '#13132A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 16,
  },
  metricsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  metricsTitle: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Inter_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  metricsEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(6,182,212,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.25)',
    marginTop: 16,
  },
  metricsEditText: { color: '#06B6D4', fontSize: 12, fontWeight: '600', fontFamily: 'Inter_700Bold' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '47.5%',
    backgroundColor: '#0D0D20',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  metricIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  metricBigVal: { fontSize: 26, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold', lineHeight: 30 },
  metricUnit: { fontSize: 13, color: Colors.textMuted, fontWeight: '400', fontFamily: 'Inter_400Regular' },
  metricLabel: { fontSize: 10, color: Colors.textMuted, fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.6 },
  habitSummaryLine: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    marginBottom: 6,
  },
  habitFieldLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 6,
  },
  habitInput: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0D0D20',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 10,
    textAlignVertical: 'top',
    outlineStyle: 'none' as any,
  },
  metricsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3,6,20,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  habitKeyboardWrap: {
    width: '100%',
    justifyContent: 'center',
  },
  metricsModalCard: {
    backgroundColor: '#151629',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
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
  metricsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricsModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
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
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
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
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricsInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    outlineStyle: 'none' as any,
  },
  metricsInputUnit: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  metricsActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricsCancelBtn: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metricsCancelBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  metricsSaveBtn: {
    flex: 1,
    backgroundColor: Colors.accentBlue,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  metricsSaveBtnText: {
    color: '#04111F',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.4,
  },
  metricsSavingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7,10,24,0.7)',
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
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  metricsSavingText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  genderModalCard: {
    backgroundColor: '#151629',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genderModalTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 18,
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
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(18, 22, 34, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileLanguageOptionActive: {
    borderColor: Colors.primary,
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
    color: Colors.primary,
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
    color: 'rgba(255,255,255,0.48)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  genderModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  genderModalOptionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
  },
  genderModalOptionTextActive: {
    color: Colors.accentBlue,
  },

  /* Toggles */
  togglesCard: {
    marginHorizontal: 16,
    backgroundColor: '#13132A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 16,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  toggleLabel: { fontSize: 14, color: '#fff', fontFamily: 'Inter_400Regular' },

  /* Coach */
  coachSection: { marginHorizontal: 16, marginBottom: 16 },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#13132A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 10,
  },
  lockedCard: {
    opacity: 0.82,
  },
  planCard: {
    borderColor: 'rgba(245,158,11,0.24)',
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  planBadge: {
    alignSelf: 'center',
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  coachIconWrap: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  coachName: { fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  coachStatus: { fontSize: 11, color: '#06B6D4', fontFamily: 'Inter_400Regular', marginTop: 3 },
  coachArrow: { padding: 4 },

  /* Menu */
  menuSection: { marginHorizontal: 16, marginBottom: 16 },
  menuCard: {
    backgroundColor: '#13132A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  lockedRow: { opacity: 0.72 },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, color: '#fff', fontFamily: 'Inter_400Regular' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, color: Colors.textMuted, fontFamily: 'Inter_400Regular' },
  lockedIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,115,22,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.35)',
  },

  /* Section Title */
  sectionTitle: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Inter_700Bold', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },

  /* Divider */
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },

  /* Logout */
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  privacySubLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  versionText: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 16, letterSpacing: 0.4 },
});
