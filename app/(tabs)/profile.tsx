import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  fetchAccountabilityPartner,
  fetchCurrentUser,
  fetchHabitConsistency,
  fetchLongevityDashboard,
  fetchNotificationPreferences,
  fetchSubscriptionPlans,
  fetchWorkoutLogs,
  logout,
  submitBetaFeedback,
  updateNotificationPreferences,
  updateCurrentUserProfile,
} from '../../lib/api';
import { fetchJournalEntries } from '../../lib/screenData';
import { replaceRoute } from '../../lib/navigation';
import ClaudeProfileHeader from '../../components/profile/ClaudeProfileHeader';
import ClaudeHabitsCard from '../../components/profile/ClaudeHabitsCard';
import ClaudeWearablesCard from '../../components/profile/ClaudeWearablesCard';
import ClaudeHabitDigestModal from '../../components/profile/ClaudeHabitDigestModal';
import ClaudeWearablesModal from '../../components/profile/ClaudeWearablesModal';
import ClaudeOneToOneBookingModal from '../../components/profile/ClaudeOneToOneBookingModal';
import ClaudeInnerCircleApplyModal from '../../components/profile/ClaudeInnerCircleApplyModal';
import ClaudeNotificationPreferencesModal from '../../components/profile/ClaudeNotificationPreferencesModal';
import ClaudeDuoModal from '../../components/duo/ClaudeDuoModal';
import ClaudeLanguageModal from '../../components/profile/ClaudeLanguageModal';
import RequirementAuditBoundary from '../../components/audit/RequirementAuditBoundary';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../../lib/i18n';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const FEEDBACK_THEME_OPTIONS = [
  { key: 'nutrition_logging', title: 'Nutrition logging', note: 'Meals, calories, or logging speed.' },
  { key: 'coach_context', title: 'AI coach', note: 'Memory, injuries, or replies.' },
  { key: 'video_playback', title: 'Videos', note: 'Playback, loading, or quality.' },
  { key: 'workout_plan', title: 'Workout plan', note: 'Plan fit, exercises, or flow.' },
  { key: 'gold_value', title: 'Gold value', note: 'Pricing, features, or upgrade clarity.' },
  { key: 'other', title: 'Something else', note: 'Anything we missed.' },
];

const JOURNAL_PROMPTS = [
  'What made today easier than expected?',
  'Where did you keep a promise to yourself?',
  'What went better than you expected?',
  'What did you avoid, and why?',
  'Who did you show up for?',
  'What should tomorrow get from you?',
  'What are you proud you did anyway?',
];

function initialsForName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || 'VF').slice(0, 2).toUpperCase();
}

function normalizeTierLabel(value: unknown) {
  const tier = String(value || 'NONE').trim().toUpperCase().replace(/_/g, ' ');
  return tier || 'NONE';
}

function languageLabel(value: unknown) {
  const code = String(value || '').trim().toLowerCase();
  if (!code) return 'Not set';
  const found = (SUPPORTED_LANGUAGES as readonly { code: string; label: string; nativeLabel: string }[]).find(
    (lang) => lang.code.toLowerCase() === code
  );
  if (found) {
    return (found.nativeLabel || found.label).toUpperCase();
  }
  return code.toUpperCase();
}

function notificationSummary(user: any) {
  const channels = [
    user.notification_push_enabled !== false ? 'PUSH' : '',
    user.notification_whatsapp_enabled ? 'WA' : '',
    user.notification_email_enabled ? 'EMAIL' : '',
  ].filter(Boolean);
  const time = String(user.notification_nudge_time || '20:30');
  return channels.length ? `${time} · ${channels.join(' & ')}` : 'Off';
}

function monthName(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { month: 'long' });
}

function planPriceText(plan: any, userTier: string) {
  const monthly = Number(plan?.discountedPriceMonthly ?? plan?.priceMonthly ?? 0);
  if (monthly > 0) return `€${monthly}/mo`;
  if (userTier === 'SILVER') return '€19/mo';
  if (userTier === 'GOLD') return '€49/mo';
  if (userTier === 'PLATINUM') return '€129/mo';
  if (userTier === 'INNER CIRCLE' || userTier === 'INNER_CIRCLE') return '€490/mo';
  return 'Free';
}

function planCopy(plan: any, tier: string) {
  const description = String(plan?.description || '').trim();
  if (description) return description;
  if (tier === 'SILVER') return 'Workouts, challenges, community, and your journal.';
  if (tier === 'GOLD') return 'AI Coach, workout library, nutrition, and habit tools.';
  if (tier === 'PLATINUM') return 'Wearable sync, priority support, and deeper coaching tools.';
  if (tier === 'INNER CIRCLE' || tier === 'INNER_CIRCLE') return 'Direct coach review and the highest-touch Victory Fitness support.';
  return 'Choose the plan that fits your training.';
}

function workoutLogDate(item: any) {
  const raw = item?.completed_at || item?.started_at || item?.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function calculateWorkoutStreak(items: any[]) {
  const completedDates = new Set(items.map(workoutLogDate).filter(Boolean) as string[]);
  if (completedDates.size === 0) return 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayKey = (offset: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const startOffset = completedDates.has(dayKey(0)) ? 0 : completedDates.has(dayKey(1)) ? 1 : -1;
  if (startOffset < 0) return 0;
  let streak = 0;
  for (let offset = startOffset; offset < 400; offset += 1) {
    if (!completedDates.has(dayKey(offset))) break;
    streak += 1;
  }
  return streak;
}

function calculateWorkoutConsistency(items: any[], fallbackScore: number) {
  const completedDates = new Set(items.map(workoutLogDate).filter(Boolean) as string[]);
  if (completedDates.size === 0) return Math.max(0, Math.min(100, Math.round(fallbackScore || 0)));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let activeDays = 0;
  for (let offset = 0; offset < 28; offset += 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - offset);
    if (completedDates.has(d.toISOString().slice(0, 10))) activeDays += 1;
  }
  return Math.max(0, Math.min(100, Math.round((activeDays / 28) * 100)));
}

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openDuo?: string }>();
  const { isDark, colors, theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('Victory member');
  const [initials, setInitials] = useState('VF');
  const [tier, setTier] = useState('NONE');
  const [country, setCountry] = useState('');
  const [sinceDate, setSinceDate] = useState('');
  const [streakDays, setStreakDays] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [consistencyPct, setConsistencyPct] = useState(0);
  const [journalPrompt, setJournalPrompt] = useState(JOURNAL_PROMPTS[new Date().getDay() % JOURNAL_PROMPTS.length]);
  const [journalRunningText, setJournalRunningText] = useState('READY TODAY');
  const [habitIdentity, setHabitIdentity] = useState('Set the person you are becoming.');
  const [habitUnlock, setHabitUnlock] = useState('Set a reward you only use while training.');
  const [habitTrigger, setHabitTrigger] = useState('Set the moment that starts your session.');
  const [triggerUsage, setTriggerUsage] = useState('No trigger data yet');
  const [habitDigestSummary, setHabitDigestSummary] = useState('Your digest will build as you log workouts and trigger days.');
  const [habitDigestWeeks, setHabitDigestWeeks] = useState<Array<{ label: string; score: number }>>([]);
  const [habitDigestScore, setHabitDigestScore] = useState(0);
  const [notificationMeta, setNotificationMeta] = useState('All caught up');
  const [languageMeta, setLanguageMeta] = useState('Not set');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    pushEnabled: true,
    whatsappEnabled: false,
    emailEnabled: false,
    nudgeTime: '20:30',
    templates: [] as Array<{ type: string; title: string; enabled: boolean; approved: boolean; channels: string[] }>,
  });
  const [partnerTitle, setPartnerTitle] = useState('Accountability duo');
  const [partnerNote, setPartnerNote] = useState('Set up or manage your partner.');
  const [planPrice, setPlanPrice] = useState('Free');
  const [planDescription, setPlanDescription] = useState('Choose the plan that fits your training.');
  const [wearableDevice, setWearableDevice] = useState('No wearable connected');
  const [wearableSyncMeta, setWearableSyncMeta] = useState('Connect a device to sync health metrics');
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Modals state
  const [showDuoModal, setShowDuoModal] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [showWearModal, setShowWearModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackTheme, setFeedbackTheme] = useState(FEEDBACK_THEME_OPTIONS[0].key);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackWouldPay, setFeedbackWouldPay] = useState<boolean | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (params.openDuo === '1') {
      setShowDuoModal(true);
    }
  }, [params.openDuo]);

  const handleLanguageSelect = async (nextLanguage: LanguageCode) => {
    if (savingLanguage) return;
    setSavingLanguage(true);
    try {
      await setLanguage(nextLanguage);
      setLanguageMeta(languageLabel(nextLanguage));
      await updateCurrentUserProfile({ preferred_language: nextLanguage }).catch((err) => {
        console.warn('Failed to persist preferred language to backend:', err);
      });
    } catch (error) {
      Alert.alert(t('Error'), t('Unable to change language right now. Please try again.'));
    } finally {
      setSavingLanguage(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadUserData = async () => {
      try {
        const [u, habit, journal, plans, completedLogs, accountability, longevity, notificationPreferences] = await Promise.all([
          fetchCurrentUser({ forceRefresh: true }),
          fetchHabitConsistency().catch(() => null),
          fetchJournalEntries().catch(() => ({ entries: [] })),
          fetchSubscriptionPlans().catch(() => ({ items: [] })),
          fetchWorkoutLogs(1, 100, 'completed').catch(() => ({ items: [], total: 0, page: 1, limit: 100, total_pages: 0 })),
          fetchAccountabilityPartner().catch(() => null),
          fetchLongevityDashboard().catch(() => null),
          fetchNotificationPreferences().catch(() => null),
        ]);
        if (cancelled || !u) return;
        const userObj = u as any;
        setUser(userObj);
        const displayName = String(userObj.name || userObj.email || 'Victory member').trim();
        setName(displayName);
        setInitials(initialsForName(displayName));
        const normalizedTier = normalizeTierLabel(userObj.subscription_tier || userObj.tier || userObj.membership_tier);
        setTier(normalizedTier);
        setCountry(String(userObj.country || '').trim());
        setLanguageMeta(languageLabel(userObj.preferred_language));
        const nextNotificationPrefs = {
          pushEnabled: notificationPreferences?.pushEnabled ?? userObj.notification_push_enabled !== false,
          whatsappEnabled: notificationPreferences?.whatsappEnabled ?? Boolean(userObj.notification_whatsapp_enabled),
          emailEnabled: notificationPreferences?.emailEnabled ?? Boolean(userObj.notification_email_enabled),
          nudgeTime: String(notificationPreferences?.nudgeTime || userObj.notification_nudge_time || '20:30'),
          templates: Array.isArray(notificationPreferences?.templates) ? notificationPreferences.templates : [],
        };
        setNotificationPrefs(nextNotificationPrefs);
        setNotificationMeta(notificationSummary(userObj));
        setSinceDate(monthName(userObj.subscription_confirmed_at || userObj.subscription_started_at || userObj.created_at));
        const workoutItems = Array.isArray((completedLogs as any)?.items) ? (completedLogs as any).items : [];
        setStreakDays(Math.max(0, Number(userObj.streak_days ?? 0) || 0));
        setTotalSessions(Math.max(0, Number((completedLogs as any)?.total || workoutItems.length || 0)));

        const score = Math.round(Number((habit as any)?.current_score || 0));
        setHabitDigestScore(score);
        setConsistencyPct(calculateWorkoutConsistency(workoutItems, score));
        setHabitIdentity(String((habit as any)?.identity_statement || userObj.identity_statement || 'Set the person you are becoming.'));
        setHabitUnlock(String((habit as any)?.workout_unlock_label || userObj.workout_unlock_label || 'Set a reward you only use while training.'));
        const triggerContext = String((habit as any)?.training_trigger_context || userObj.training_trigger_context || '').trim();
        const triggerAction = String((habit as any)?.training_trigger_action || userObj.training_trigger_action || '').trim();
        setHabitTrigger([triggerContext, triggerAction].filter(Boolean).join(', ') || 'Set the moment that starts your session.');
        const latestWeek = Array.isArray((habit as any)?.weeks) ? (habit as any).weeks[(habit as any).weeks.length - 1] : null;
        setTriggerUsage(latestWeek ? `used on ${latestWeek.trained_trigger_days || 0} of ${latestWeek.trigger_days || 0} trigger days` : 'No trigger data yet');
        const digestWeeks = Array.isArray((habit as any)?.weeks)
          ? (habit as any).weeks.map((week: any, index: number) => ({
              label: String(week.label || `W${index + 1}`),
              score: Math.round(Number(week.score || 0)),
            }))
          : [];
        setHabitDigestWeeks(digestWeeks);
        setHabitDigestSummary(latestWeek
          ? `This week you trained on ${latestWeek.trained_trigger_days || 0} of ${latestWeek.trigger_days || 0} trigger days. ${triggerContext ? `Your trigger is "${triggerContext}".` : 'Set a trigger to make this digest sharper.'}`
          : 'Your digest will build as you log workouts and trigger days.');

        const entries = Array.isArray((journal as any)?.entries) ? (journal as any).entries : [];
        setJournalRunningText(entries.length > 0 ? `${entries.length} ENTRIES SAVED` : 'READY TODAY');
        setJournalPrompt(JOURNAL_PROMPTS[new Date().getDay() % JOURNAL_PROMPTS.length]);

        const partner = (accountability as any)?.partner;
        if (partner) {
          setPartnerTitle(`${partner.name || 'Your partner'} is your partner`);
          setPartnerNote(partner.trained_today ? 'They trained today.' : 'No session logged today yet.');
        } else if ((accountability as any)?.status === 'pending') {
          setPartnerTitle('Duo invite pending');
          setPartnerNote((accountability as any)?.invite_code ? `Code ${(accountability as any).invite_code}` : 'Waiting for your partner.');
        } else {
          setPartnerTitle('Accountability duo');
          setPartnerNote('Set up or manage your partner.');
        }

        const plan = (plans.items || []).find((item: any) => normalizeTierLabel(item.subscriptionTier) === normalizedTier);
        setPlanPrice(planPriceText(plan, normalizedTier));
        setPlanDescription(planCopy(plan, normalizedTier));

        const wearableDevices = Array.isArray((longevity as any)?.wearables?.devices) ? (longevity as any).wearables.devices : [];
        const connected = wearableDevices.find((device: any) => Boolean(device.connected || device.is_connected));
        setWearableDevice(connected ? String(connected.name || connected.provider || 'Connected wearable') : 'No wearable connected');
        setWearableSyncMeta(String((longevity as any)?.wearables?.sync_message || (connected ? 'Connected' : 'Connect a device to sync health metrics')));
      } catch {
        // Fallback silently
      }
    };

    void loadUserData();

    return () => {
      cancelled = true;
    };
  }, []);

  const isSilver = tier === 'SILVER';
  const isPlatinumOrIC = tier === 'PLATINUM' || tier === 'INNER CIRCLE' || tier === 'INNER_CIRCLE';
  const isIC = tier === 'INNER CIRCLE' || tier === 'INNER_CIRCLE';
  const registeredEmail = String(user?.email || '').trim();

  const performLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    await logout();
    replaceRoute(router, '/welcome');
  };

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    await performLogout();
  };

  const handleSaveHabits = async (habits: { identity: string; unlock: string; trigger: string }) => {
    const updated = await updateCurrentUserProfile({
      identity_statement: habits.identity.trim(),
      workout_unlock_label: habits.unlock.trim(),
      training_trigger_context: habits.trigger.trim(),
      training_trigger_action: 'Open Victory Fitness and start',
    });
    const updatedUser = updated as any;
    setUser(updatedUser);
    setHabitIdentity(String(updatedUser.identity_statement || habits.identity));
    setHabitUnlock(String(updatedUser.workout_unlock_label || habits.unlock));
    setHabitTrigger(String(updatedUser.training_trigger_context || habits.trigger));
  };

  const handleSaveNotificationPrefs = async (preferences: {
    pushEnabled: boolean;
    whatsappEnabled: boolean;
    emailEnabled: boolean;
    nudgeTime: string;
    templates?: Array<{ type: string; enabled: boolean }>;
  }) => {
    const updatedPreferences = await updateNotificationPreferences(preferences);
    const updatedUser = await updateCurrentUserProfile({
      notification_push_enabled: updatedPreferences.pushEnabled,
      notification_whatsapp_enabled: updatedPreferences.whatsappEnabled,
      notification_email_enabled: updatedPreferences.emailEnabled,
      notification_nudge_time: updatedPreferences.nudgeTime,
    });
    setUser(updatedUser as any);
    setNotificationPrefs({
      pushEnabled: updatedPreferences.pushEnabled,
      whatsappEnabled: updatedPreferences.whatsappEnabled,
      emailEnabled: updatedPreferences.emailEnabled,
      nudgeTime: updatedPreferences.nudgeTime,
      templates: updatedPreferences.templates || [],
    });
    setNotificationMeta(notificationSummary(updatedUser));
  };

  const resetFeedbackForm = () => {
    setFeedbackRating(0);
    setFeedbackTheme(FEEDBACK_THEME_OPTIONS[0].key);
    setFeedbackMessage('');
    setFeedbackWouldPay(null);
  };

  const handleSubmitFeedback = async () => {
    const message = feedbackMessage.trim();
    if (feedbackRating < 1) {
      Alert.alert(t('Rating needed'), t('Pick a star rating before sending.'));
      return;
    }
    if (message.length < 4) {
      Alert.alert(t('Message needed'), t('Write a short note so the team knows what to fix.'));
      return;
    }
    if (submittingFeedback) return;
    setSubmittingFeedback(true);
    try {
      await submitBetaFeedback({
        rating: feedbackRating,
        theme: feedbackTheme,
        message,
        would_pay: feedbackWouldPay,
      });
      setShowFeedbackModal(false);
      resetFeedbackForm();
      Alert.alert(t('Thank you'), t('Your feedback was sent to the team.'));
    } catch (error) {
      Alert.alert(t('Error'), t('Unable to send feedback right now. Please try again.'));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header & Stats Row matching lines 1133-1141 */}
        <ClaudeProfileHeader
          name={name}
          initials={initials}
          tier={tier}
          country={country}
          sinceDate={sinceDate}
          streakDays={streakDays}
          totalSessions={totalSessions}
          consistencyPct={consistencyPct}
        />

        {/* Daily Journal Teaser Card matching lines 1143-1156 */}
        <RequirementAuditBoundary auditId="APP-EXTRA-001" status="extra">
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionKicker, { color: colors.copper }]}>{t('JOURNAL')}</Text>
            <TouchableOpacity
              style={[
                styles.journalCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'transparent' : colors.cardBorder,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => router.push('/journal')}
            >
              <View style={styles.journalTopRow}>
                <Text style={styles.journalPromptKicker}>{t("TODAY'S PROMPT")}</Text>
                <Text style={styles.journalRunningBadge}>{journalRunningText}</Text>
              </View>
              <Text style={[styles.journalTitle, { color: colors.text }]}>{journalPrompt}</Text>
              <View style={styles.journalBottomRow}>
                <Text style={[styles.journalSub, { color: colors.textSecondary }]}>{t('Two minutes. Nobody else sees it.')}</Text>
                <Text style={styles.journalWriteLink}>{t('Write ›')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </RequirementAuditBoundary>

        {/* Health & Wearables section matching lines 1158-1182 (Platinum & Inner Circle) */}
        {isPlatinumOrIC && (
          <ClaudeWearablesCard
            onOpenWearables={() => setShowWearModal(true)}
            connectedDevice={wearableDevice}
            syncMeta={wearableSyncMeta}
          />
        )}

        {/* All 4 Habit Fields editable with trigger usage counter matching lines 1184-1211 */}
        <ClaudeHabitsCard
          identity={habitIdentity}
          unlock={habitUnlock}
          trigger={habitTrigger}
          triggerUsage={triggerUsage}
          partnerTitle={partnerTitle}
          partnerNote={partnerNote}
          isSilver={isSilver}
          onOpenDuo={() => setShowDuoModal(true)}
          onUpgrade={() => router.push('/plan')}
          onSaveHabits={handleSaveHabits}
        />

        {/* Weekly Digest Teaser Card matching lines 1213-1220 (Platinum & Inner Circle) */}
        {isPlatinumOrIC && (
          <View style={styles.digestWrap}>
            <TouchableOpacity
              style={[
                styles.digestCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'transparent' : colors.cardBorder,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setShowDigestModal(true)}
            >
              <View style={styles.digestTextCol}>
                <Text style={[styles.digestTitle, { color: colors.text }]}>{t('Your week, in your own words')}</Text>
                <Text style={[styles.digestSub, { color: colors.textSecondary }]}>{t('Monday 08:00 habit and training digest')}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACCOUNT Menu Section matching lines 1222-1231 */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionKicker, { color: colors.copper }]}>{t('ACCOUNT')}</Text>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderColor: isDark ? 'transparent' : colors.cardBorder,
                borderWidth: isDark ? 0 : 1,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.accountHeroRow,
                {
                  borderBottomColor: colors.divider,
                  backgroundColor: isDark ? 'rgba(247, 243, 238, 0.02)' : 'rgba(13, 43, 69, 0.02)',
                },
              ]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/edit')}
            >
              <View
                style={[
                  styles.accountAvatar,
                  {
                    backgroundColor: isDark ? 'rgba(201, 148, 58, 0.16)' : 'rgba(201, 148, 58, 0.1)',
                    borderColor: 'rgba(201, 148, 58, 0.45)',
                  },
                ]}
              >
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.accountAvatarImg} />
                ) : (
                  <Text style={[styles.accountAvatarText, { color: GOLD }]}>{initials}</Text>
                )}
              </View>

              <View style={styles.accountInfoCol}>
                <View style={styles.accountNameRow}>
                  <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                    {name}
                  </Text>
                  {tier && tier !== 'NONE' && (
                    <View
                      style={[
                        styles.tierMiniBadge,
                        isSilver
                          ? styles.tierMiniBadgeSilver
                          : isIC
                          ? styles.tierMiniBadgeIC
                          : styles.tierMiniBadgeGold,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tierMiniBadgeText,
                          isSilver && styles.tierMiniBadgeTextSilver,
                          isIC && styles.tierMiniBadgeTextIC,
                        ]}
                      >
                        {tier}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.accountEmailRow}>
                  <Ionicons name="mail-outline" size={13} color={GOLD} />
                  <Text style={[styles.registeredBadge, { color: GOLD }]}>{t('REGISTERED')}</Text>
                  <Text style={[styles.emailDot, { color: colors.textMuted }]}>·</Text>
                  <Text
                    style={[styles.accountEmail, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {registeredEmail || t('Not available')}
                  </Text>
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/settings')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Settings')}</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Habits & mindset')}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/settings')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Appearance')}</Text>
              <Text style={[styles.menuMeta, { fontFamily: MONO, color: GOLD }]}>
                {isDark ? t('DARK MODE') : t('WHITE MODE')}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/edit')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Edit profile')}</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Name, photo, targets')}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => setShowNotifModal(true)}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Notifications')}</Text>
              <Text style={[styles.menuMeta, { fontFamily: MONO, color: colors.textMuted }]}>{notificationMeta}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => setShowLanguageModal(true)}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Language')}</Text>
              <Text style={[styles.menuMeta, { fontFamily: MONO, color: GOLD }]}>{languageLabel(language)}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => setShowFeedbackModal(true)}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Give feedback')}</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Rate the beta')}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <RequirementAuditBoundary
              auditId="APP-EXTRA-021"
              status="extra"
              label="NEW FEATURE - HELP & SUPPORT NOT IN REQUIREMENT"
            >
              <TouchableOpacity
                style={[styles.menuRow, { borderBottomColor: colors.divider }]}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/support')}
              >
                <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Help & support')}</Text>
                <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Replies within a day')}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </RequirementAuditBoundary>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/about')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('About Us')}</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Mission & coaching ethos')}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomColor: colors.divider }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/terms')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Terms & conditions')}</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Usage rules & member agreement')}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/privacy')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Privacy policy')}</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Data protection & rights')}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inner Circle Application card matching lines 1233-1240 (for non-IC members) */}
        {!isIC && (
          <View style={styles.sectionWrap}>
            <TouchableOpacity
              style={[
                styles.applyCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'transparent' : colors.cardBorder,
                  borderWidth: isDark ? 0 : 1,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => setShowApplyModal(true)}
            >
              <View style={styles.applyTextCol}>
                <Text style={[styles.applyTitle, { color: colors.text }]}>{t('Apply for Inner Circle')}</Text>
                <Text style={[styles.applySub, { color: colors.textSecondary }]}>
                  {t('Five questions, straight to Victor. Then a call to see whether it fits.')}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* YOUR PLAN Card matching lines 1242-1246 */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: isDark ? NAVY : '#FFFFFF',
              borderColor: isDark ? 'transparent' : colors.cardBorder,
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          <View style={styles.planHeaderRow}>
            <Text style={styles.planKicker}>{t('YOUR PLAN · {tier}', { tier })}</Text>
            <Text style={[styles.planPrice, { color: colors.textMuted }]}>
              {planPrice}
            </Text>
          </View>
          <Text style={[styles.planSub, { color: colors.textSecondary }]}>
            {planDescription}
          </Text>
          <TouchableOpacity
            style={styles.compareBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/plan')}
          >
            <Text style={styles.compareBtnText}>{t('Compare tiers & upgrade')}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.06)',
            },
          ]}
          activeOpacity={0.75}
          disabled={isSigningOut}
          onPress={handleLogout}
        >
          {isSigningOut ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={[styles.signOutBtnText, { color: colors.textSecondary }]}>{t('Sign out')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <ClaudeDuoModal visible={showDuoModal} onClose={() => setShowDuoModal(false)} />
      <ClaudeHabitDigestModal
        visible={showDigestModal}
        onClose={() => setShowDigestModal(false)}
        identityStatement={habitIdentity}
        summaryText={habitDigestSummary}
        currentScore={habitDigestScore}
        weeks={habitDigestWeeks}
        onBookHumanSession={() => {
          setShowDigestModal(false);
          setShowBookingModal(true);
        }}
      />
      <ClaudeWearablesModal
        visible={showWearModal}
        onClose={() => setShowWearModal(false)}
        tierBadge={tier}
      />
      <ClaudeOneToOneBookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        tierBadge={tier}
        userPhone={user?.contact_number || ''}
      />
      <ClaudeInnerCircleApplyModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        userName={name}
        userEmail={user?.email || ''}
        userPhone={user?.contact_number || ''}
        userCountry={country}
      />
      <ClaudeNotificationPreferencesModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        pushEnabled={notificationPrefs.pushEnabled}
        whatsappEnabled={notificationPrefs.whatsappEnabled}
        emailEnabled={notificationPrefs.emailEnabled}
        nudgeTime={notificationPrefs.nudgeTime}
        templates={notificationPrefs.templates}
        contactNumber={user?.contact_number || ''}
        countryCode={user?.country_code || ''}
        onSave={handleSaveNotificationPrefs}
      />
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.feedbackOverlay}>
          <KeyboardAvoidingView
            style={styles.feedbackKeyboardWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
          >
            <View
              style={[
                styles.feedbackPanel,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : colors.cardBorder,
                },
              ]}
            >
              <ScrollView
                style={styles.feedbackScroll}
                contentContainerStyle={styles.feedbackScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackHeaderText}>
                    <Text style={styles.feedbackKicker}>{t('BETA FEEDBACK')}</Text>
                    <Text style={[styles.feedbackTitle, { color: colors.text }]}>{t('Tell us what to fix')}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.feedbackCloseBtn}
                    activeOpacity={0.7}
                    onPress={() => setShowFeedbackModal(false)}
                  >
                    <Text style={styles.feedbackCloseText}>×</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>{t('Your rating')}</Text>
                <View style={styles.feedbackStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      style={styles.feedbackStarBtn}
                      activeOpacity={0.75}
                      onPress={() => setFeedbackRating(star)}
                    >
                      <Text style={[styles.feedbackStar, { color: star <= feedbackRating ? GOLD : 'rgba(247, 243, 238, 0.28)' }]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>{t('What is this about?')}</Text>
                <View style={styles.feedbackChipGrid}>
                  {FEEDBACK_THEME_OPTIONS.map((option) => {
                    const selected = feedbackTheme === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.feedbackChip,
                          {
                            borderColor: selected ? GOLD : 'rgba(247, 243, 238, 0.18)',
                            backgroundColor: selected ? 'rgba(201, 148, 58, 0.16)' : 'rgba(247, 243, 238, 0.04)',
                          },
                        ]}
                        activeOpacity={0.78}
                        onPress={() => setFeedbackTheme(option.key)}
                      >
                        <Text style={[styles.feedbackChipTitle, { color: selected ? GOLD : colors.text }]}>{t(option.title)}</Text>
                        <Text style={[styles.feedbackChipNote, { color: colors.textMuted }]}>{t(option.note)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>{t('Would you pay for this after beta?')}</Text>
                <View style={styles.feedbackPayRow}>
                  {[
                    { label: t('Yes'), value: true },
                    { label: t('Not sure'), value: null },
                    { label: t('No'), value: false },
                  ].map((option) => {
                    const selected = feedbackWouldPay === option.value;
                    return (
                      <TouchableOpacity
                        key={String(option.value)}
                        style={[
                          styles.feedbackPayBtn,
                          {
                            borderColor: selected ? GOLD : 'rgba(247, 243, 238, 0.18)',
                            backgroundColor: selected ? GOLD : 'transparent',
                          },
                        ]}
                        activeOpacity={0.78}
                        onPress={() => setFeedbackWouldPay(option.value)}
                      >
                        <Text style={[styles.feedbackPayText, { color: selected ? OBSIDIAN : colors.textSecondary }]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={[
                    styles.feedbackInput,
                    {
                      color: colors.text,
                      borderColor: 'rgba(247, 243, 238, 0.16)',
                      backgroundColor: isDark ? 'rgba(13, 13, 13, 0.32)' : 'rgba(13, 43, 69, 0.05)',
                    },
                  ]}
                  placeholder={t('Write your feedback...')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={feedbackMessage}
                  onChangeText={setFeedbackMessage}
                  maxLength={2000}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.feedbackSubmitBtn,
                    { opacity: feedbackRating > 0 && feedbackMessage.trim().length >= 4 && !submittingFeedback ? 1 : 0.55 },
                  ]}
                  activeOpacity={0.85}
                  disabled={feedbackRating < 1 || feedbackMessage.trim().length < 4 || submittingFeedback}
                  onPress={handleSubmitFeedback}
                >
                  {submittingFeedback ? (
                    <ActivityIndicator color={OBSIDIAN} />
                  ) : (
                    <Text style={styles.feedbackSubmitText}>{t('Send feedback')}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <ClaudeLanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        currentLanguage={language}
        onSelectLanguage={handleLanguageSelect}
        isSaving={savingLanguage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 110,
  },
  sectionWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  journalCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  journalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  journalPromptKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.2,
    color: GOLD,
  },
  journalRunningBadge: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  journalTitle: {
    fontFamily: CLASH,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: IVORY,
  },
  journalBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  journalSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  journalWriteLink: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
  digestWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  digestCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  digestTextCol: {
    flex: 1,
  },
  digestTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  digestSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  menuTitle: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 15,
    color: IVORY,
  },
  accountHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  accountAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accountAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  accountAvatarText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
  },
  accountInfoCol: {
    flex: 1,
    marginLeft: 13,
    justifyContent: 'center',
    minWidth: 0,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
    maxWidth: '75%',
  },
  accountEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  registeredBadge: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  emailDot: {
    fontSize: 11,
    marginHorizontal: 1,
  },
  accountEmail: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 12.5,
  },
  tierMiniBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tierMiniBadgeGold: {
    backgroundColor: GOLD,
  },
  tierMiniBadgeSilver: {
    backgroundColor: 'rgba(247, 243, 238, 0.15)',
  },
  tierMiniBadgeIC: {
    backgroundColor: COPPER,
  },
  tierMiniBadgeText: {
    fontFamily: DMSANS,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#0D0D0D',
  },
  tierMiniBadgeTextSilver: {
    color: IVORY,
  },
  tierMiniBadgeTextIC: {
    color: IVORY,
  },
  menuMeta: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginRight: 10,
  },
  chevron: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  applyCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    paddingVertical: 17,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  applyTextCol: {
    flex: 1,
  },
  applyTitle: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '600',
    color: IVORY,
  },
  applySub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  planCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
  },
  planPrice: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  planSub: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.82)',
    marginBottom: 14,
  },
  compareBtn: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.65)',
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  feedbackKeyboardWrap: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  feedbackPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  feedbackScroll: {
    maxHeight: '100%',
  },
  feedbackScrollContent: {
    padding: 18,
    paddingBottom: 22,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  feedbackHeaderText: {
    flex: 1,
  },
  feedbackKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 4,
  },
  feedbackTitle: {
    fontFamily: CLASH,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    color: IVORY,
  },
  feedbackCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
  },
  feedbackCloseText: {
    fontFamily: DMSANS,
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.56)',
    lineHeight: 24,
  },
  feedbackLabel: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.64)',
    marginBottom: 8,
  },
  feedbackStars: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  feedbackStarBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackStar: {
    fontSize: 30,
    lineHeight: 34,
  },
  feedbackChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  feedbackChip: {
    width: '48%',
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feedbackChipTitle: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: IVORY,
  },
  feedbackChipNote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(247, 243, 238, 0.52)',
    marginTop: 3,
  },
  feedbackPayRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  feedbackPayBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackPayText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackInput: {
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  feedbackSubmitBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackSubmitText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '800',
    color: OBSIDIAN,
  },
});
