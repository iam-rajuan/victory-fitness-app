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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  fetchAccountabilityPartner,
  fetchCurrentUser,
  fetchHabitConsistency,
  fetchLongevityDashboard,
  fetchNotificationPreferences,
  fetchSubscriptionPlans,
  fetchWorkoutLogs,
  logout,
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
            <Text style={[styles.sectionKicker, { color: colors.copper }]}>JOURNAL</Text>
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
                <Text style={styles.journalPromptKicker}>TODAY'S PROMPT</Text>
                <Text style={styles.journalRunningBadge}>{journalRunningText}</Text>
              </View>
              <Text style={[styles.journalTitle, { color: colors.text }]}>{journalPrompt}</Text>
              <View style={styles.journalBottomRow}>
                <Text style={[styles.journalSub, { color: colors.textSecondary }]}>Two minutes. Nobody else sees it.</Text>
                <Text style={styles.journalWriteLink}>Write ›</Text>
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
                <Text style={[styles.digestTitle, { color: colors.text }]}>Your week, in your own words</Text>
                <Text style={[styles.digestSub, { color: colors.textSecondary }]}>Monday 08:00 habit and training digest</Text>
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
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/privacy')}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>{t('Privacy policy')}</Text>
              <Text style={[styles.menuMeta, { color: colors.textMuted }]}>{t('Export or delete data')}</Text>
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
    paddingTop: Platform.OS === 'web' ? 24 : 50,
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
});
