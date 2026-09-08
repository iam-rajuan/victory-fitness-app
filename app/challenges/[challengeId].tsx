import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { apiRequest, getAuthUser } from '../../lib/api';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { formatAppError } from '../../lib/error';
import { useLanguage } from '../../lib/i18n';
import { goBackOrReplace, pushRoute } from '../../lib/navigation';
import { getCachedResourceSnapshot } from '../../lib/resourceCache';
import { fetchChallengeDetailData, getChallengeDetailCacheKey } from '../../lib/screenData';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';

type ChallengePlanDayProgress = {
  day_number: number;
  completed: boolean;
  completed_section_ids: string[];
  completed_exercise_ids: string[];
};

type ChallengePlanDay = {
  day_number: number;
  title?: string;
  focus?: string;
  notes?: string;
};

type ChallengeReaction = {
  emoji: string;
  count: number;
  viewer_reacted: boolean;
};

type ChallengeChatMessage = {
  id: string;
  challenge_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_profile_image: string;
  message_type: string;
  content: string;
  image_url: string;
  reply_to_message_id: string | null;
  progress_payload: { completed_day?: number; total_days?: number; membership_status?: string } | null;
  created_at: string;
  updated_at: string;
  can_delete: boolean;
  can_edit: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  reactions: ChallengeReaction[];
};

type ChallengeParticipant = {
  user_id: string;
  name: string;
  profile_image: string;
};

type ChallengeDetail = {
  challenge_id: string;
  title: string;
  description: string;
  why_it_matters?: string;
  plan_text: string;
  plan_days: ChallengePlanDay[];
  category: string;
  duration_days: number;
  points: number;
  difficulty: string;
  status: string;
  thumbnail: string;
  participant_count: number;
  participants: ChallengeParticipant[];
  viewer_membership_status: string;
  viewer_progress_days_completed: number;
  viewer_points_earned: number;
  viewer_plan_progress: ChallengePlanDayProgress[];
  unread_count: number;
  can_start: boolean;
  can_post: boolean;
  has_joined: boolean;
  current_day_number: number | null;
  can_complete_today: boolean;
  completed_today: boolean;
  messages: ChallengeChatMessage[];
  started_at?: string;
};

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const checkingAccess = useModuleAccessGuard('/challenge');
  const params = useLocalSearchParams<{ challengeId?: string }>();
  const challengeId = Array.isArray(params.challengeId) ? params.challengeId[0] : params.challengeId;
  const cachedDetail = challengeId ? getCachedResourceSnapshot<ChallengeDetail>(getChallengeDetailCacheKey(challengeId)) : null;
  const [detail, setDetail] = useState<ChallengeDetail | null>(cachedDetail ?? null);
  const [loading, setLoading] = useState(!cachedDetail);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completingToday, setCompletingToday] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [completeDayConfirmVisible, setCompleteDayConfirmVisible] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleInviteFromDetail = async () => {
    if (!detail) return;
    try {
      const authUser = await getAuthUser();
      const inviterId = authUser?.id ? `&inviter_id=${authUser.id}` : '';
      const origin =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : 'https://victory-fitness-app.vercel.app';
      const inviteUrl = `${origin}/register?challenge_id=${detail.challenge_id}${inviterId}&signup_source=challenge_invite`;
      const msg = `${t('Join me in the')} "${detail.title}" ${t('challenge on Victory Fitness!')}\n${inviteUrl}`;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: detail.title,
          text: `${t('Join me in the')} "${detail.title}" ${t('challenge on Victory Fitness!')}`,
          url: inviteUrl,
        });
        return;
      }
      await Clipboard.setStringAsync(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3500);
      Alert.alert(
        t('Invite Link Copied!'),
        t('Send this link to friends. When they register, they will be taken directly to this challenge preview and you will earn 50 points (+50 more on their first workout)!'),
      );
    } catch {
      // dismissed
    }
  };

  const dayProgressMap = useMemo(() => {
    const map = new Map<number, ChallengePlanDayProgress>();
    for (const progress of detail?.viewer_plan_progress || []) {
      map.set(progress.day_number, progress);
    }
    return map;
  }, [detail?.viewer_plan_progress]);

  const configuredPlanDayNumbers = useMemo(
    () =>
      (detail?.plan_days || [])
        .map((day) => Number(day.day_number || 0))
        .filter((dayNumber) => Number.isFinite(dayNumber) && dayNumber > 0)
        .sort((left, right) => left - right),
    [detail?.plan_days],
  );

  const hasConfiguredPlanDays = configuredPlanDayNumbers.length > 0;

  const completedDaysCount = detail?.viewer_progress_days_completed || 0;
  const totalDaysCount = detail?.duration_days || detail?.plan_days.length || 0;

  const elapsedDays = useMemo(() => {
    if (!detail?.started_at) {
      return 0;
    }
    const startDate = new Date(detail.started_at);
    const startLocalDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date();
    const todayLocalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const msDiff = todayLocalDate.getTime() - startLocalDate.getTime();
    return Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
  }, [detail?.started_at]);

  const currentCalendarDay = useMemo(() => {
    if (!hasConfiguredPlanDays) {
      return null;
    }

    const configuredCurrentDay = Number(detail?.current_day_number || 0);
    if (configuredPlanDayNumbers.includes(configuredCurrentDay)) {
      return configuredCurrentDay;
    }

    if (!detail?.started_at) {
      return configuredPlanDayNumbers[0] || null;
    }

    const calendarPosition = Math.max(1, elapsedDays + 1);
    const matchedDayNumber = configuredPlanDayNumbers.find((dayNumber) => dayNumber >= calendarPosition);
    return matchedDayNumber || configuredPlanDayNumbers[configuredPlanDayNumbers.length - 1] || null;
  }, [configuredPlanDayNumbers, detail?.current_day_number, detail?.started_at, elapsedDays, hasConfiguredPlanDays]);

  const isCurrentDayCompleted = useMemo(() => {
    if (!currentCalendarDay) {
      return false;
    }
    return Boolean(dayProgressMap.get(currentCalendarDay)?.completed || detail?.completed_today);
  }, [dayProgressMap, currentCalendarDay, detail?.completed_today]);

  const canCompleteToday = useMemo(() => {
    return Boolean(
      detail?.has_joined &&
      detail?.viewer_membership_status === 'ACTIVE' &&
      currentCalendarDay &&
      hasConfiguredPlanDays &&
      !isCurrentDayCompleted,
    );
  }, [currentCalendarDay, detail?.has_joined, detail?.viewer_membership_status, hasConfiguredPlanDays, isCurrentDayCompleted]);

  const canStartConfiguredChallenge = Boolean(detail?.can_start && hasConfiguredPlanDays);

  const loadDetail = useCallback(async (showLoader = false) => {
    if (!challengeId) {
      return;
    }
    if (showLoader && !cachedDetail) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const response = await fetchChallengeDetailData<ChallengeDetail>(challengeId);
      setDetail(response);
    } catch (error) {
      setErrorDialog(formatAppError(error, t('Failed to load challenge details.')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cachedDetail, challengeId, t]);

  useEffect(() => {
    if (checkingAccess) {
      return;
    }
    void loadDetail(true);
  }, [checkingAccess, loadDetail]);

  const overviewDay = useMemo(() => {
    if (!detail?.plan_days?.length) {
      return null;
    }

    if (currentCalendarDay) {
      return detail.plan_days.find((day) => day.day_number === currentCalendarDay) || detail.plan_days[0];
    }

    return detail.plan_days[0];
  }, [currentCalendarDay, detail?.plan_days]);

  const compactPlanSummary = useMemo(() => {
    const source = (detail?.plan_text || '').trim();
    if (!source) {
      return '';
    }
    return source.length > 160 ? `${source.slice(0, 157).trim()}...` : source;
  }, [detail?.plan_text]);

  const handleStart = useCallback(async () => {
    if (!challengeId || !detail?.can_start || starting) {
      return;
    }
    setStarting(true);
    try {
      await apiRequest(`/challenges/${encodeURIComponent(challengeId)}/start`, {
        method: 'POST',
      });
      await loadDetail(false);
    } catch (error) {
      setErrorDialog(formatAppError(error, t('Failed to start challenge.')));
    } finally {
      setStarting(false);
    }
  }, [challengeId, detail?.can_start, loadDetail, starting]);

  const handleSend = useCallback(async () => {
    if (!challengeId || !detail?.can_post || sending) {
      return;
    }
    const content = message.trim();
    if (!content) {
      return;
    }
    setSending(true);
    try {
      await apiRequest(`/challenges/${encodeURIComponent(challengeId)}/chat/messages`, {
        method: 'POST',
        body: { content },
      });
      setMessage('');
      await loadDetail(false);
    } catch (error) {
      setErrorDialog(formatAppError(error, t('Failed to send encouragement.')));
    } finally {
      setSending(false);
    }
  }, [challengeId, detail?.can_post, loadDetail, message, sending]);

  const handleCompleteToday = useCallback(async () => {
    if (!challengeId || !canCompleteToday || completingToday) {
      return;
    }
    setCompleteDayConfirmVisible(true);
  }, [challengeId, completingToday, canCompleteToday]);

  const confirmCompleteToday = useCallback(async () => {
    if (!challengeId || !canCompleteToday || completingToday || !currentCalendarDay) {
      return;
    }
    setCompleteDayConfirmVisible(false);
    setCompletingToday(true);
    try {
      await apiRequest(
        `/challenges/${encodeURIComponent(challengeId)}/plan/days/${currentCalendarDay}/complete`,
        {
          method: 'POST',
          body: { completed: true },
        }
      );
      await loadDetail(false);
    } catch (error) {
      setErrorDialog(formatAppError(error, t('Unable to complete today right now.')));
    } finally {
      setCompletingToday(false);
    }
  }, [challengeId, completingToday, canCompleteToday, currentCalendarDay, loadDetail, t]);

  const ctaLabel = detail?.viewer_membership_status === 'ACTIVE'
    ? t('In Progress')
    : detail?.viewer_membership_status === 'COMPLETED'
      ? t('Completed')
      : !hasConfiguredPlanDays
        ? t('Coming Soon')
        : t('Start Challenge');

  const ctaDisabled = !detail || starting || detail.has_joined || (!canStartConfiguredChallenge && !detail.has_joined);
  const showCompleteToday = Boolean(detail?.has_joined && detail?.viewer_membership_status === 'ACTIVE');
  const completeButtonLabel = isCurrentDayCompleted ? t('Completed Today') : t('Mark Complete');
  const remainingDaysCount = useMemo(() => {
    if (!hasConfiguredPlanDays) {
      return 0;
    }
    if (!detail?.started_at) {
      return Math.max(totalDaysCount - completedDaysCount, 0);
    }
    return Math.max(totalDaysCount - elapsedDays, 0);
  }, [detail?.started_at, totalDaysCount, completedDaysCount, elapsedDays, hasConfiguredPlanDays]);
  const openProgressDay = useCallback((dayNumber: number) => {
    if (!challengeId) {
      return;
    }

    pushRoute(router, {
      pathname: '/challenges/progress/[challengeId]',
      params: {
        challengeId,
        day: String(dayNumber),
      },
    });
  }, [challengeId, router]);

  if (checkingAccess) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Modal
        visible={completeDayConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteDayConfirmVisible(false)}
      >
        <View style={styles.confirmModalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCompleteDayConfirmVisible(false)} />
          <View style={styles.confirmModalCard}>
            <Text style={styles.confirmModalTitle}>{t('Complete today?')}</Text>
            <Text style={styles.confirmModalText}>
              {currentCalendarDay
                ? t('Mark day {day} as complete?', { day: currentCalendarDay })
                : t('No configured challenge day is available to complete right now.')}
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity style={styles.confirmModalSecondaryButton} onPress={() => setCompleteDayConfirmVisible(false)} activeOpacity={0.85}>
                <Text style={styles.confirmModalSecondaryText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModalPrimaryButton} onPress={() => void confirmCompleteToday()} activeOpacity={0.85}>
                <Text style={styles.confirmModalPrimaryText}>{t('Confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('Challenges')}</Text>
        <Ionicons name="notifications-outline" size={24} color="#E5E7EB" />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadDetail(false)}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity style={styles.backRow} activeOpacity={0.8} onPress={() => goBackOrReplace(router, '/challenge')}>
              <Ionicons name="arrow-back" size={18} color={Colors.gold} />
              <Text style={styles.backText}>{t('Back to Challenges')}</Text>
            </TouchableOpacity>

            {detail ? (
              <>
                <View style={styles.heroCard}>
                  <Text style={styles.heroTitle}>{detail.title}</Text>
                  <Text style={styles.heroDescription}>{detail.description}</Text>
                  {detail.why_it_matters ? (
                    <View style={styles.whyItMattersCard}>
                      <View style={styles.whyItMattersHeader}>
                        <Ionicons name="sparkles" size={16} color="#F59E0B" />
                        <Text style={styles.whyItMattersTitle}>{t('Why It Matters')}</Text>
                      </View>
                      <Text style={styles.whyItMattersBody}>{detail.why_it_matters}</Text>
                    </View>
                  ) : null}
                  {overviewDay ? (
                    <View style={styles.overviewCard}>
                      <Text style={styles.overviewEyebrow}>
                        {currentCalendarDay ? t('Current Focus') : t('Program Overview')}
                      </Text>
                      <Text style={styles.overviewTitle}>
                        {overviewDay.title || t('Day {day}', { day: overviewDay.day_number })}
                      </Text>
                      {overviewDay.focus ? (
                        <Text style={styles.overviewBody} numberOfLines={2}>
                          {overviewDay.focus}
                        </Text>
                      ) : null}
                      {overviewDay.notes ? (
                        <Text style={styles.overviewSubtle} numberOfLines={2}>
                          {overviewDay.notes}
                        </Text>
                      ) : null}
                    </View>
                  ) : (compactPlanSummary && compactPlanSummary !== detail.description) ? (
                    <View style={styles.overviewCard}>
                      <Text style={styles.overviewEyebrow}>{t('Program Overview')}</Text>
                      <Text style={styles.overviewBody} numberOfLines={4}>
                        {compactPlanSummary}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.heroDivider} />
                  <View style={styles.heroFooter}>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsText}>+{detail.points} {t('Points')}</Text>
                    </View>
                    <View style={styles.trackerCard}>
                      <View style={styles.trackerHeader}>
                        <View style={styles.trackerTextWrap}>
                          <Text style={styles.trackerTitle}>Day Tracker</Text>
                          <Text style={styles.trackerSubtitle}>Tap any day number to open that day.</Text>
                        </View>
                        <View style={styles.trackerPill}>
                          <Text style={styles.trackerPillText}>{completedDaysCount}/{Math.max(totalDaysCount, 1)}</Text>
                        </View>
                      </View>
                      <View style={styles.trackerStatsRow}>
                        <View style={styles.trackerStat}>
                          <Text style={styles.trackerStatValue}>{completedDaysCount}</Text>
                          <Text style={styles.trackerStatLabel}>Done</Text>
                        </View>
                        <View style={styles.trackerStat}>
                          <Text style={styles.trackerStatValue}>{remainingDaysCount}</Text>
                          <Text style={styles.trackerStatLabel}>Left</Text>
                        </View>
                        <View style={styles.trackerStat}>
                          <Text style={styles.trackerStatValue}>{currentCalendarDay || '-'}</Text>
                          <Text style={styles.trackerStatLabel}>Current</Text>
                        </View>
                      </View>
                      <View style={styles.trackerLegendRow}>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, styles.legendDotCompleted]} />
                          <Text style={styles.legendText}>Done</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, styles.legendDotCurrent]} />
                          <Text style={styles.legendText}>Current</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View style={[styles.legendDot, styles.legendDotMissed]} />
                          <Text style={styles.legendText}>Missed</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.dayStripWrap}>
                      <Text style={styles.dayStripTitle}>Challenge Days</Text>
                      <Text style={styles.dayStripSubtitle}>Left to right scroll</Text>
                      {hasConfiguredPlanDays ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
                          {detail.plan_days.map((day) => {
                          const progress = dayProgressMap.get(day.day_number);
                          const isCompleted = Boolean(progress?.completed);
                          const isCurrent = currentCalendarDay === day.day_number && !isCompleted;
                          const isMissed =
                            !isCompleted &&
                            !isCurrent &&
                            currentCalendarDay !== null &&
                            day.day_number < currentCalendarDay;
                          return (
                            <TouchableOpacity
                              key={`detail-day-${day.day_number}`}
                              activeOpacity={0.85}
                              accessibilityRole="button"
                              accessibilityLabel={t('Open day {day} progress', { day: day.day_number })}
                              onPress={() => openProgressDay(day.day_number)}
                              style={[
                                styles.dayChip,
                                isCompleted && styles.dayChipCompleted,
                                isCurrent && styles.dayChipCurrent,
                                isMissed && styles.dayChipMissed,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayChipText,
                                  isCompleted && styles.dayChipTextCompleted,
                                  isCurrent && styles.dayChipTextCurrent,
                                  isMissed && styles.dayChipTextMissed,
                                ]}
                              >
                                {day.day_number}
                              </Text>
                            </TouchableOpacity>
                          );
                          })}
                        </ScrollView>
                      ) : (
                        <View style={styles.emptyPlanState}>
                          <Text style={styles.emptyPlanStateText}>Challenge days are not configured yet.</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.heroActions}>
                      {detail.has_joined ? (
                        <View style={styles.membershipStatusRow}>
                          <View
                            style={[
                              styles.membershipBadge,
                              detail.viewer_membership_status === 'COMPLETED'
                                ? styles.membershipBadgeCompleted
                                : styles.membershipBadgeActive,
                            ]}
                          >
                            <View
                              style={[
                                styles.membershipBadgeDot,
                                detail.viewer_membership_status === 'COMPLETED'
                                  ? styles.membershipBadgeDotCompleted
                                  : styles.membershipBadgeDotActive,
                              ]}
                            />
                            <Text
                              style={[
                                styles.membershipBadgeText,
                                detail.viewer_membership_status === 'COMPLETED'
                                  ? styles.membershipBadgeTextCompleted
                                  : styles.membershipBadgeTextActive,
                              ]}
                            >
                              {ctaLabel}
                            </Text>
                          </View>
                          {currentCalendarDay ? (
                            <Text style={styles.membershipDayHint}>
                              {t('Day')} {currentCalendarDay} {t('of')} {totalDaysCount}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}

                      {showCompleteToday ? (
                        <TouchableOpacity
                          style={[
                            styles.primaryActionButton,
                            isCurrentDayCompleted && styles.primaryActionButtonCompleted,
                            (!canCompleteToday || completingToday) && !isCurrentDayCompleted && styles.primaryActionButtonDisabled,
                          ]}
                          activeOpacity={0.88}
                          onPress={() => void handleCompleteToday()}
                          disabled={!canCompleteToday || completingToday || isCurrentDayCompleted}
                        >
                          {completingToday ? (
                            <ActivityIndicator color={Colors.obsidian} size="small" />
                          ) : (
                            <View style={styles.buttonContentRow}>
                              <Ionicons
                                name={isCurrentDayCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                                size={18}
                                color={isCurrentDayCompleted ? '#FFFFFF' : Colors.obsidian}
                              />
                              <Text
                                style={[
                                  styles.primaryActionButtonText,
                                  isCurrentDayCompleted && styles.primaryActionButtonTextCompleted,
                                ]}
                              >
                                {completeButtonLabel}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ) : detail.has_joined ? (
                        <View
                          style={[
                            styles.primaryActionButton,
                            styles.primaryActionButtonCompleted,
                          ]}
                        >
                          <View style={styles.buttonContentRow}>
                            <Ionicons name="trophy-outline" size={18} color="#FFFFFF" />
                            <Text style={[styles.primaryActionButtonText, styles.primaryActionButtonTextCompleted]}>
                              {ctaLabel}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.primaryActionButton,
                            ctaDisabled && styles.primaryActionButtonDisabled,
                          ]}
                          activeOpacity={0.88}
                          onPress={() => {
                            void handleStart();
                          }}
                          disabled={ctaDisabled}
                        >
                          {starting ? (
                            <ActivityIndicator color={Colors.obsidian} size="small" />
                          ) : (
                            <View style={styles.buttonContentRow}>
                              <Ionicons name="flash-outline" size={18} color={Colors.obsidian} />
                              <Text style={styles.primaryActionButtonText}>{ctaLabel}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.inviteFriendDetailBtn}
                        activeOpacity={0.88}
                        onPress={() => void handleInviteFromDetail()}
                      >
                        <Ionicons name="person-add-outline" size={16} color={Colors.gold} />
                        <Text style={styles.inviteFriendDetailBtnText}>
                          {inviteCopied ? t('Invite Link Copied!') : t('Invite Friends (+100 Pts)')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.participantsCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="people-outline" size={24} color={Colors.gold} />
                    <Text style={styles.sectionTitle}>{t('Fellow Challengers')} ({detail.participant_count})</Text>
                  </View>
                  {detail.participants.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.participantsRow}>
                      {detail.participants.map((participant) => (
                        <View key={participant.user_id} style={styles.participantChip}>
                          {participant.profile_image ? (
                            <Image source={{ uri: participant.profile_image }} style={styles.participantAvatar} />
                          ) : (
                            <View style={[styles.participantAvatar, styles.participantAvatarFallback]}>
                              <Text style={styles.participantAvatarText}>{(participant.name || 'U')[0]}</Text>
                            </View>
                          )}
                          <Text style={styles.participantName} numberOfLines={1}>{participant.name}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.emptyHelper}>{t('Be the first to join!')}</Text>
                  )}
                </View>

                <View style={styles.hubCard}>
                  <Text style={styles.hubTitle}>{t('Encouragement Hub')}</Text>
                  <View style={styles.hubDivider} />
                  <View style={styles.messagesWrap}>
                    {detail.messages.length > 0 ? detail.messages.map((item) => (
                      <View key={item.id} style={styles.messageRow}>
                        <Text style={styles.messageAuthor}>{item.author_name}</Text>
                        <Text style={styles.messageTime}>{formatMessageTime(item.created_at)}</Text>
                        <Text style={styles.messageBody}>
                          {item.is_deleted ? t('Message deleted') : item.content || (item.progress_payload?.completed_day ? t('Completed day {day}.', { day: item.progress_payload.completed_day }) : '')}
                        </Text>
                      </View>
                    )) : (
                      <View style={styles.emptyMessages}>
                        <Text style={styles.emptyMessagesTitle}>{t('No messages yet.')}</Text>
                        <Text style={styles.emptyMessagesText}>{t('Be the first to send some encouragement!')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.composerRow}>
                    <TextInput
                      style={styles.input}
                      placeholder={detail.can_post ? t('Encourage someone...') : t('Start the challenge to join the hub')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={message}
                      onChangeText={setMessage}
                      editable={detail.can_post && !sending}
                    />
                    <TouchableOpacity
                      style={[styles.sendButton, (!detail.can_post || sending) && styles.sendButtonDisabled]}
                      activeOpacity={0.88}
                      onPress={() => void handleSend()}
                      disabled={!detail.can_post || sending}
                    >
                      {sending ? <ActivityIndicator color="#E5E7EB" size="small" /> : <Ionicons name="paper-plane-outline" size={20} color="#E5E7EB" />}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title || t('Error')}
        message={errorDialog?.message || ''}
        onClose={() => setErrorDialog(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confirmModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#101827',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  confirmModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: Fonts.display,
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmModalText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.body,
    textAlign: 'center',
    marginBottom: 18,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  confirmModalSecondaryButton: {
    minWidth: 108,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  confirmModalSecondaryText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  confirmModalPrimaryButton: {
    minWidth: 108,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  confirmModalPrimaryText: {
    color: '#001311',
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#FFF', fontSize: 22, fontFamily: Fonts.display },
  scrollContent: { padding: 20, paddingBottom: 32 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  backText: { color: Colors.gold, fontSize: 14, fontFamily: Fonts.heading },
  heroCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTitle: { color: '#FFF', fontSize: 28, lineHeight: 36, fontFamily: Fonts.display, marginBottom: 12 },
  heroDescription: { color: '#E5E7EB', fontSize: 16, lineHeight: 24, fontFamily: Fonts.body, marginBottom: 16 },
  whyItMattersCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.28)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  whyItMattersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  whyItMattersTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  whyItMattersBody: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.body,
  },
  dayStripWrap: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dayStripTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: Fonts.display,
  },
  dayStripSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 4,
    marginBottom: 14,
  },
  emptyPlanState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.18)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyPlanStateText: {
    color: '#FCD34D',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.bodyMedium,
  },
  dayStrip: { gap: 12, paddingRight: 8 },
  dayChip: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  dayChipCompleted: {
    backgroundColor: Colors.victoryGreen,
    borderColor: Colors.victoryGreen,
  },
  dayChipCurrent: {
    borderColor: 'rgba(148,163,184,0.82)',
    backgroundColor: 'rgba(148,163,184,0.2)',
  },
  dayChipMissed: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  dayChipText: {
    color: '#E5E7EB',
    fontSize: 16,
    fontFamily: Fonts.heading,
  },
  dayChipTextCompleted: {
    color: '#052E16',
  },
  dayChipTextCurrent: {
    color: '#E5E7EB',
  },
  dayChipTextMissed: {
    color: '#FCA5A5',
  },
  overviewCard: {
    marginBottom: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  overviewEyebrow: {
    color: '#FBBF24',
    fontSize: 11,
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  overviewTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.display,
    marginBottom: 6,
  },
  overviewBody: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.bodyMedium,
  },
  overviewSubtle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.body,
    marginTop: 8,
  },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 18 },
  heroFooter: { gap: 16 },
  trackerCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 14,
  },
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  trackerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  trackerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.display,
  },
  trackerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
  trackerPill: {
    minWidth: 62,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
  },
  trackerPillText: {
    color: Colors.gold,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  trackerStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trackerStat: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  trackerStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.dataBold,
  },
  trackerStatLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: Fonts.heading,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trackerLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendDotCompleted: {
    backgroundColor: Colors.victoryGreen,
  },
  legendDotCurrent: {
    backgroundColor: '#94A3B8',
  },
  legendDotMissed: {
    backgroundColor: '#EF4444',
  },
  legendText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  pointsText: { color: Colors.gold, fontSize: 13, fontFamily: Fonts.dataBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroActions: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
    marginTop: 14,
  },
  membershipStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  membershipBadgeActive: {
    backgroundColor: 'rgba(26, 122, 74, 0.15)',
    borderColor: 'rgba(26, 122, 74, 0.35)',
  },
  membershipBadgeCompleted: {
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  membershipBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  membershipBadgeDotActive: {
    backgroundColor: Colors.victoryGreen,
  },
  membershipBadgeDotCompleted: {
    backgroundColor: Colors.gold,
  },
  membershipBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  membershipBadgeTextActive: {
    color: Colors.victoryGreen,
  },
  membershipBadgeTextCompleted: {
    color: Colors.gold,
  },
  membershipDayHint: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.data,
  },
  primaryActionButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionButtonCompleted: {
    backgroundColor: Colors.victoryGreen,
  },
  primaryActionButtonDisabled: {
    backgroundColor: 'rgba(247, 243, 238, 0.12)',
    opacity: 0.6,
  },
  primaryActionButtonText: {
    color: Colors.obsidian,
    fontSize: 15,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },
  primaryActionButtonTextCompleted: {
    color: '#FFFFFF',
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  participantsCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontFamily: Fonts.display },
  participantsRow: { gap: 14, paddingRight: 10 },
  participantChip: { width: 72, alignItems: 'center', gap: 8 },
  participantAvatar: { width: 52, height: 52, borderRadius: 26 },
  participantAvatarFallback: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  participantAvatarText: { color: '#FFF', fontSize: 18, fontFamily: Fonts.display },
  participantName: { color: '#D1D5DB', fontSize: 11, textAlign: 'center', fontFamily: Fonts.bodyMedium },
  emptyHelper: { color: '#9CA3AF', fontSize: 15, fontFamily: Fonts.body },
  hubCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  hubTitle: { color: '#FFF', fontSize: 20, fontFamily: Fonts.display, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  hubDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  messagesWrap: { minHeight: 220, padding: 20, gap: 14 },
  messageRow: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14 },
  messageAuthor: { color: '#FFF', fontSize: 13, fontFamily: Fonts.heading, marginBottom: 4 },
  messageTime: { color: '#9CA3AF', fontSize: 11, fontFamily: Fonts.data, marginBottom: 8 },
  messageBody: { color: '#E5E7EB', fontSize: 14, lineHeight: 20, fontFamily: Fonts.body },
  emptyMessages: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 34 },
  emptyMessagesTitle: { color: '#6B7280', fontSize: 28, fontFamily: Fonts.display, marginBottom: 8 },
  emptyMessagesText: { color: '#6B7280', fontSize: 16, textAlign: 'center', fontFamily: Fonts.body },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#FFF',
    fontSize: 16,
    fontFamily: Fonts.body,
    outlineStyle: 'none' as any,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B5563',
  },
  sendButtonDisabled: { opacity: 0.45 },
  inviteFriendDetailBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  inviteFriendDetailBtnText: {
    color: Colors.gold,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
});