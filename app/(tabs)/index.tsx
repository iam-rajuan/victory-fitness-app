import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import {
  AuthUser,
  confirmCurrentUserWeight,
  fetchCurrentUser,
  fetchCurrentUserBodyMetrics,
  updateCurrentUserBodyMetrics,
} from '../../lib/api';
import { normalizeSubscriptionTier } from '../../lib/access';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';
import { useLanguage } from '../../lib/i18n';
import { useTheme } from '../../context/ThemeContext';
import { pushRoute, replaceRoute } from '../../lib/navigation';
import {
  markWeightPromptHandled,
  shouldShowWeightUpdatePrompt,
  updateUserWeight,
} from '../../lib/onboarding';
import { fetchChallengeOverviewData } from '../../lib/screenData';
import { getSavedPlanStatus, dismissFreshPlanBanner } from '../../lib/planStorage';

import ClaudeHomeHeader from '../../components/home/ClaudeHomeHeader';
import ClaudeInspirationCard from '../../components/home/ClaudeInspirationCard';
import ClaudeFreshPlanBanner from '../../components/home/ClaudeFreshPlanBanner';
import ClaudeTodayWorkoutCard from '../../components/home/ClaudeTodayWorkoutCard';
import ClaudeChallengesCarousel, { ChallengeItem } from '../../components/home/ClaudeChallengesCarousel';
import ClaudeFoodTodayCard from '../../components/home/ClaudeFoodTodayCard';
import ClaudeHydrationCard from '../../components/home/ClaudeHydrationCard';
import ClaudeCoachBar from '../../components/home/ClaudeCoachBar';
import ClaudeAlsoTodayCard from '../../components/home/ClaudeAlsoTodayCard';
import ClaudeTierPerksCard from '../../components/home/ClaudeTierPerksCard';
import ClaudePlanDetailModal from '../../components/workout/ClaudePlanDetailModal';
import ClaudeVimeoPlayerModal from '../../components/workout/ClaudeVimeoPlayerModal';
import ClaudeActiveSessionModal from '../../components/workout/ClaudeActiveSessionModal';
import ClaudeSessionCompleteModal from '../../components/workout/ClaudeSessionCompleteModal';
import ClaudeChallengeDetailModal from '../../components/challenge/ClaudeChallengeDetailModal';
import ClaudeCohortModal from '../../components/challenge/ClaudeCohortModal';
import ClaudeInviteModal from '../../components/challenge/ClaudeInviteModal';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function HomeScreen() {
  const checkingAccess = useModuleAccessGuard('/');
  const router = useRouter();
  const { t } = useLanguage();
  const { isDark, colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentWeight, setCurrentWeight] = useState('');
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);

  // Workout Plan Detail, Active Workout, and Completion Modals
  const [planDetailVisible, setPlanDetailVisible] = useState(false);
  const [vimeoModalVisible, setVimeoModalVisible] = useState(false);
  const [activeSessionVisible, setActiveSessionVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completedStats, setCompletedStats] = useState({
    minutes: 40,
    setsLogged: 6,
    volumeKg: 840,
  });

  // Challenge Detail and Cohort Modals
  const [challengeDetailVisible, setChallengeDetailVisible] = useState(false);
  const [cohortModalVisible, setCohortModalVisible] = useState(false);
  const [selectedChallengeDetail, setSelectedChallengeDetail] = useState<any | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  // Weight check-in prompt
  const [weightPromptVisible, setWeightPromptVisible] = useState(false);
  const [weightPromptEditing, setWeightPromptEditing] = useState(false);
  const [weightPromptSaving, setWeightPromptSaving] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');
  const [weightPromptUserId, setWeightPromptUserId] = useState('');

  // Custom 6-week plan state (Claude Prototype VF Prototype.dc.html lines 188-199 & 3234-3243)
  const [planBuilt, setPlanBuilt] = useState(false);
  const [showFreshPlan, setShowFreshPlan] = useState(false);
  const [planSummaryLine, setPlanSummaryLine] = useState('Get stronger · Mon, Wed, Fri · 40 min · built around your home gym.');
  const [planKit, setPlanKit] = useState('Home gym');
  const [planDuration, setPlanDuration] = useState('40 minutes');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const syncPlan = async () => {
        const status = await getSavedPlanStatus();
        if (isMounted) {
          setPlanBuilt(status.planBuilt);
          setShowFreshPlan(status.planBuilt && status.showFreshPlan);
          if (status.planSummary) setPlanSummaryLine(status.planSummary);
          if (status.planKit) setPlanKit(status.planKit);
          if (status.planDuration) setPlanDuration(status.planDuration);
        }
      };
      void syncPlan();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleDismissFreshPlan = useCallback(async () => {
    setShowFreshPlan(false);
    await dismissFreshPlanBanner();
  }, []);

  const loadHomeData = useCallback(async () => {
    try {
      const [user, metrics, challengeData] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        fetchCurrentUserBodyMetrics().catch(() => null),
        fetchChallengeOverviewData().catch(() => null),
      ]);

      if (user) {
        setCurrentUser(user);
      }

      const existingWeight = metrics?.weight || (user as any)?.weight || '';
      if (existingWeight) {
        setCurrentWeight(String(existingWeight));
      }

      // Map only joined challenges from backend overview
      if (Array.isArray(challengeData?.active_challenges)) {
        const joinedMapped = challengeData.active_challenges.map((ch: any) => {
          const totalDays = Number(ch.total_days || ch.duration_days || 21);
          const daysLeft = Number(ch.days_left || 0);
          const currentDay = Math.max(1, totalDays - daysLeft);
          const rawProgress = Number(ch.progress || 0);
          const pct = Math.min(100, Math.max(0, Math.round(rawProgress <= 1 ? rawProgress * 100 : rawProgress)));
          return {
            id: ch.challenge_id || ch.id,
            n: ch.title || 'Active Challenge',
            d: `Day ${currentDay} of ${totalDays}`,
            pct,
            rank: ch.points ? `${ch.points} pts` : 'Active',
            note: ch.why_it_matters || ch.description || 'Finish today to keep the streak bonus.',
          };
        });
        setChallenges(joinedMapped);
      }

      // Check periodic weight check-in prompt
      if (user) {
        const shouldPrompt =
          metrics && typeof metrics.should_prompt_weight_update === 'boolean'
            ? metrics.should_prompt_weight_update
            : Boolean(user.onboarding_completed) && (await shouldShowWeightUpdatePrompt(user.id));

        if (shouldPrompt) {
          setWeightPromptUserId(user.id);
          setWeightDraft(String(existingWeight));
          setWeightPromptEditing(false);
          setWeightPromptVisible(true);
        }
      }
    } catch {
      // Continue with current/cached state
    }
  }, []);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  }, [loadHomeData]);

  // Weight check-in handlers
  const handleConfirmCurrentWeight = useCallback(async () => {
    if (!weightPromptUserId || weightPromptSaving) return;
    setWeightPromptSaving(true);
    try {
      await Promise.allSettled([
        confirmCurrentUserWeight(0),
        markWeightPromptHandled(weightPromptUserId, 0),
      ]);
      setWeightPromptVisible(false);
    } finally {
      setWeightPromptSaving(false);
    }
  }, [weightPromptSaving, weightPromptUserId]);

  const handleSnoozeWeightPrompt = useCallback(async () => {
    if (!weightPromptUserId || weightPromptSaving) return;
    setWeightPromptSaving(true);
    try {
      await Promise.allSettled([
        confirmCurrentUserWeight(7),
        markWeightPromptHandled(weightPromptUserId, 7),
      ]);
      setWeightPromptVisible(false);
    } finally {
      setWeightPromptSaving(false);
    }
  }, [weightPromptSaving, weightPromptUserId]);

  const handleSaveWeightPrompt = useCallback(async () => {
    if (!weightPromptUserId || !weightDraft.trim() || weightPromptSaving) return;
    setWeightPromptSaving(true);
    try {
      await Promise.allSettled([
        updateUserWeight(weightPromptUserId, weightDraft.trim()),
        updateCurrentUserBodyMetrics({ weight: weightDraft.trim() }),
        markWeightPromptHandled(weightPromptUserId, 0),
      ]);
      setCurrentWeight(weightDraft.trim());
      setWeightPromptVisible(false);
      setWeightPromptEditing(false);
      setWeightDraft('');
    } finally {
      setWeightPromptSaving(false);
    }
  }, [weightDraft, weightPromptSaving, weightPromptUserId]);

  // Derived user subscription tier from onboarding/payment profile
  const tier = useMemo(() => {
    const rawTier = normalizeSubscriptionTier(currentUser?.subscription_tier);
    return rawTier !== 'NONE' ? rawTier : 'GOLD';
  }, [currentUser?.subscription_tier]);

  const streakDays = currentUser?.streak_days || 12;
  const targetWaterLiters = useMemo(() => {
    const w = Number(currentWeight) || 70;
    return Math.round(w * 0.035 * 10) / 10;
  }, [currentWeight]);

  const handleOpenChallenge = useCallback((ch: any) => {
    router.push('/(tabs)/challenge');
  }, [router]);

  const handleInviteSomeone = useCallback(() => {
    setInviteModalVisible(true);
  }, []);

  if (checkingAccess) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        {/* 1. Header: Date, Hello Greeting, Streak Pill */}
        <ClaudeHomeHeader
          name={currentUser?.name || currentUser?.email || ''}
          streakDays={streakDays}
        />


        {/* 2. Daily Inspiration (Silver: Victor Akko quote / Gold+: Identity statement) */}
        <ClaudeInspirationCard
          tier={tier}
          identityStatement={currentUser?.identity_statement}
          userName={currentUser?.name ? currentUser.name.split(' ')[0] : undefined}
        />

        {/* 3. Weight check-in dialog if due */}
        {weightPromptVisible ? (
          <View
            style={[
              styles.weightReminderCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                shadowOpacity: isDark ? 0.35 : 0.05,
              },
            ]}
          >
            <View style={styles.weightReminderHeader}>
              <Text style={styles.weightReminderEyebrow}>PERIODIC CHECK-IN</Text>
              <TouchableOpacity
                onPress={() => void handleSnoozeWeightPrompt()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.weightReminderCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.weightReminderTitle, { color: isDark ? IVORY : NAVY }]}>
              {currentWeight
                ? `Is your weight still ${currentWeight} kg?`
                : 'Confirm your current weight'}
            </Text>
            <Text
              style={[
                styles.weightReminderText,
                { color: isDark ? 'rgba(247, 243, 238, 0.65)' : 'rgba(13, 43, 69, 0.65)' },
              ]}
            >
              Confirm or update your weight to keep your training and nutrition accurate.
            </Text>

            {weightPromptEditing ? (
              <View style={styles.weightEditContainer}>
                <TextInput
                  value={weightDraft}
                  onChangeText={setWeightDraft}
                  placeholder="Enter current weight"
                  placeholderTextColor={isDark ? 'rgba(247, 243, 238, 0.4)' : 'rgba(13, 43, 69, 0.4)'}
                  keyboardType="numeric"
                  style={[
                    styles.weightInput,
                    {
                      color: isDark ? IVORY : NAVY,
                      backgroundColor: isDark ? 'rgba(13, 13, 13, 0.5)' : '#F5F1EA',
                    },
                  ]}
                  autoFocus
                />
                <View style={styles.weightEditActions}>
                  <TouchableOpacity
                    style={styles.weightSaveBtn}
                    onPress={() => void handleSaveWeightPrompt()}
                    disabled={weightPromptSaving}
                  >
                    <Text style={styles.weightSaveBtnText}>Save Weight</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.weightCancelBtn}
                    onPress={() => setWeightPromptEditing(false)}
                  >
                    <Text
                      style={[
                        styles.weightCancelBtnText,
                        { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.6)' },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.weightActionRow}>
                {currentWeight ? (
                  <TouchableOpacity
                    style={styles.weightConfirmBtn}
                    onPress={() => void handleConfirmCurrentWeight()}
                    disabled={weightPromptSaving}
                  >
                    <Text style={styles.weightConfirmBtnText}>{`Keep ${currentWeight} kg`}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.weightUpdateBtn,
                    {
                      borderColor: isDark ? 'rgba(247, 243, 238, 0.3)' : 'rgba(13, 43, 69, 0.2)',
                    },
                  ]}
                  onPress={() => setWeightPromptEditing(true)}
                >
                  <Text style={[styles.weightUpdateBtnText, { color: isDark ? IVORY : NAVY }]}>Update Weight</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.weightSnoozeBtn}
                  onPress={() => void handleSnoozeWeightPrompt()}
                  disabled={weightPromptSaving}
                >
                  <Text
                    style={[
                      styles.weightSnoozeBtnText,
                      { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.5)' },
                    ]}
                  >
                    Remind in 7 days
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {/* Fresh Plan Notification Banner (Claude Prototype VF Prototype.dc.html lines 188-199) */}
        <ClaudeFreshPlanBanner
          visible={showFreshPlan}
          line={planSummaryLine}
          onDismiss={handleDismissFreshPlan}
        />

        {/* 4. Today's Workout Session Card (Adaptive by Tier & Custom Built Plan) */}
        <ClaudeTodayWorkoutCard
          tier={tier}
          workoutTitle={currentUser?.workout_unlock_label || 'Upper Body Strength'}
          durationMinutes={Number(planDuration.replace(/[^0-9]/g, '')) || (tier === 'SILVER' ? 38 : 40)}
          exerciseCount={4}
          equipment={planKit.toUpperCase()}
          isPlanBuilt={planBuilt}
          onStartSession={() => {
            if (tier === 'SILVER') {
              setVimeoModalVisible(true);
            } else {
              setPlanDetailVisible(true);
            }
          }}
          onAdjustPlan={() => {
            if (tier === 'SILVER') {
              pushRoute(router, '/workout-library');
            } else {
              pushRoute(router, '/chat');
            }
          }}
        />

        {/* 5. Your Challenges Carousel */}
        <ClaudeChallengesCarousel
          challenges={challenges}
          onOpenChallenge={handleOpenChallenge}
        />

        {/* 6. Food Today (Active for Gold/Plat/IC, locked teaser for Silver) */}
        <ClaudeFoodTodayCard
          tier={tier}
          onNavigateFood={() => pushRoute(router, '/mealPlan')}
          onNavigatePlan={() => pushRoute(router, '/mealPlan')}
        />

        {/* 7. Hydration Glass with animated fill & reminder toggle */}
        <ClaudeHydrationCard
          targetLiters={targetWaterLiters}
          initialMl={1400}
        />

        {/* 8. AI Coach Bar (Prompt input for Gold/Plat/IC, locked teaser for Silver) */}
        <ClaudeCoachBar tier={tier} />

        {/* 9. Platinum / Inner Circle privileges (Wearables sync, coaching brief) */}
        <ClaudeTierPerksCard tier={tier} />

        {/* 10. Also Today (Accountability Duo, Daily Journal, Weekly Target) */}
        <ClaudeAlsoTodayCard
          partnerName="Anna Reinhardt"
          partnerTrainedToday={true}
          sessionsDoneThisWeek={3}
          sessionsTargetThisWeek={4}
          journalWrittenToday={false}
        />
      </ScrollView>

      {/* Silver Vimeo Player Modal (matching lines 489 & 2357-2358 of prototype) */}
      <ClaudeVimeoPlayerModal
        visible={vimeoModalVisible}
        onClose={() => setVimeoModalVisible(false)}
        workoutTitle={currentUser?.workout_unlock_label || 'Upper Body Strength'}
        workoutMeta="FROM THE LIBRARY · 38 MIN · DUMBBELLS"
        vimeoId="912440318"
        onFinishSession={() => {
          setVimeoModalVisible(false);
          setCompletedStats({
            minutes: 38,
            setsLogged: 4,
            volumeKg: 680,
          });
          setCompleteModalVisible(true);
        }}
      />

      {/* Start My Session / Plan Detail Modal */}
      <ClaudePlanDetailModal
        visible={planDetailVisible}
        onClose={() => setPlanDetailVisible(false)}
        planTitle={currentUser?.workout_unlock_label || 'Upper Body Strength'}
        dayKicker="DAY 3 OF WEEK 2 · PUSH DAY"
        planSource={tier !== 'SILVER' ? 'BUILT BY YOUR COACH' : 'TODAY’S WORKOUT'}
        onBeginSession={() => {
          setPlanDetailVisible(false);
          setActiveSessionVisible(true);
        }}
        onAdjustWithCoach={() => {
          setPlanDetailVisible(false);
          pushRoute(router, '/chat');
        }}
      />

      {/* Active Workout Session Modal */}
      <ClaudeActiveSessionModal
        visible={activeSessionVisible}
        onClose={() => setActiveSessionVisible(false)}
        tier={tier}
        workoutTitle={currentUser?.workout_unlock_label || 'Upper Body Strength'}
        onEndSession={(stats) => {
          if (stats) setCompletedStats(stats);
          setActiveSessionVisible(false);
          setCompleteModalVisible(true);
        }}
      />

      {/* Post-Workout Feedback & Completion Celebration Modal */}
      <ClaudeSessionCompleteModal
        visible={completeModalVisible}
        onClose={() => setCompleteModalVisible(false)}
        workoutTitle={currentUser?.workout_unlock_label || 'Upper Body Strength'}
        minutes={completedStats.minutes}
        setsLogged={completedStats.setsLogged}
        volumeKg={completedStats.volumeKg}
        streakDays={streakDays}
        identityStatement={currentUser?.identity_statement || undefined}
        motivationStatement={currentUser?.motivation_statement || undefined}
        tier={tier}
        onDoneHome={() => setCompleteModalVisible(false)}
        onUpgrade={() => {
          setCompleteModalVisible(false);
          pushRoute(router, '/plan');
        }}
      />

      {/* 21-Day Warrior / Challenge Detail Modal */}
      <ClaudeChallengeDetailModal
        challenge={selectedChallengeDetail}
        visible={challengeDetailVisible}
        onClose={() => setChallengeDetailVisible(false)}
        userName={currentUser?.name || 'Michael'}
        onJoin={() => {
          setChallengeDetailVisible(false);
          setCohortModalVisible(true);
        }}
        onOpenCohort={() => {
          setChallengeDetailVisible(false);
          setCohortModalVisible(true);
        }}
        onInvite={handleInviteSomeone}
      />

      {/* Cohort Lobby Modal */}
      <ClaudeCohortModal
        visible={cohortModalVisible}
        onClose={() => setCohortModalVisible(false)}
        onInvite={handleInviteSomeone}
        challengeTitle={selectedChallengeDetail?.n || '21-Day Warrior'}
      />

      {/* Guest Mode Invite Modal matching lines 1461-1502 */}
      <ClaudeInviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        challengeTitle={selectedChallengeDetail?.n || '21-Day Warrior'}
        challengeDays={selectedChallengeDetail?.d ? parseInt(String(selectedChallengeDetail.d).replace(/\D/g, ''), 10) || 21 : 21}
        userName={currentUser?.name || 'Michael'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OBSIDIAN,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 60,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  weightReminderCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    padding: 18,
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  weightReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weightReminderEyebrow: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: GOLD,
  },
  weightReminderCloseBtn: {
    fontFamily: DMSANS,
    fontSize: 16,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  weightReminderTitle: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: IVORY,
    marginBottom: 6,
  },
  weightReminderText: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.65)',
    marginBottom: 16,
  },
  weightActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weightConfirmBtn: {
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  weightConfirmBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  weightUpdateBtn: {
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  weightUpdateBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '600',
    color: IVORY,
  },
  weightSnoozeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  weightSnoozeBtnText: {
    fontFamily: DMSANS,
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  weightEditContainer: {
    gap: 12,
  },
  weightInput: {
    fontFamily: MONO,
    fontSize: 18,
    color: IVORY,
    backgroundColor: 'rgba(13, 13, 13, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  weightEditActions: {
    flexDirection: 'row',
    gap: 10,
  },
  weightSaveBtn: {
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  weightSaveBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  weightCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  weightCancelBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    color: 'rgba(247, 243, 238, 0.6)',
  },

});
