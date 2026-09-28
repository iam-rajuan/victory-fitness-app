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
  AccountabilityPartnerResponse,
  confirmCurrentUserWeight,
  createWorkoutLog,
  fetchAccountabilityPartner,
  fetchCurrentUser,
  fetchCurrentUserBodyMetrics,
  fetchCurrentUserHydration,
  fetchWorkoutLogs,
  HydrationState,
  updateCurrentUserBodyMetrics,
  updateCurrentUserHydration,
  WorkoutLogItem,
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
import { fetchChallengeOverviewData, fetchJournalEntries } from '../../lib/screenData';
import { getSavedPlanStatus, dismissFreshPlanBanner } from '../../lib/planStorage';
import { getLatestNutritionPlan, NutritionPlanApiResponse, updateNutritionMealCompletion } from '../../lib/nutrition';
import {
  fetchLatestStrengthWorkoutPlan,
  StrengthPlanDay,
  StrengthPlanExercise,
  StrengthPlanResponse,
} from '../../lib/workout-plans';
import { fetchHomeWorkoutPlanSummary, fetchWorkoutLibrary, HomeWorkoutPlanSummary } from '../../lib/workouts';

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

type HomeMealItem = {
  key: string;
  title: string;
  subtitle: string;
  completed: boolean;
  canLog?: boolean;
};

type HomePlanExercise = {
  id: string;
  name: string;
  note: string;
  sets: string;
  kind?: string;
  rest?: string;
};

type HomeActiveExercise = {
  id: string;
  name: string;
  note: string;
  targetSets: number;
  targetReps: number | 'max';
  defaultKg: number;
  restTime: string;
  restSeconds: number;
  isHold?: boolean;
};

function parseMinutes(value: unknown, fallback = 40) {
  const match = String(value || '').match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : fallback;
}

function parseNumber(value: unknown, fallback = 0) {
  const match = String(value || '').match(/[\d.]+/);
  return match ? Number(match[0]) || fallback : fallback;
}

function parseReps(value: unknown): number | 'max' {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text.includes('max')) return 'max';
  const match = text.match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 1;
}

function parseRestSeconds(value: unknown, fallback = 60) {
  const text = String(value || '').trim().toLowerCase();
  const amount = parseNumber(text, fallback);
  if (text.includes('min')) return Math.max(0, Math.round(amount * 60));
  return Math.max(0, Math.round(amount));
}

function formatDurationFromSeconds(seconds: number) {
  if (!seconds) return 'Duration not set';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function isSameLocalDay(value: string | null | undefined, now = new Date()) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
}

function isThisLocalWeek(value: string | null | undefined, now = new Date()) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return parsed >= weekStart && parsed < weekEnd;
}

function firstStrengthDay(plan: StrengthPlanResponse | null): StrengthPlanDay | null {
  return plan?.days?.[0] ?? null;
}

function mapPlanExerciseForDetail(exercise: StrengthPlanExercise, index: number): HomePlanExercise {
  return {
    id: exercise.id || `exercise-${index}`,
    name: exercise.name || `Exercise ${index + 1}`,
    note: [exercise.type, exercise.rest ? `${exercise.rest} rest` : '', exercise.weight]
      .filter(Boolean)
      .join(' · '),
    sets: `${exercise.sets || 1} × ${exercise.reps || '1'}`,
    kind: exercise.type,
    rest: exercise.rest,
  };
}

function mapPlanExerciseForSession(exercise: StrengthPlanExercise, index: number): HomeActiveExercise {
  const reps = parseReps(exercise.reps);
  const isHold = reps === 'max' || /hold|hang|plank/i.test(exercise.name || '');
  const restSeconds = parseRestSeconds(exercise.rest, 60);
  return {
    id: exercise.id || `exercise-${index}`,
    name: exercise.name || `Exercise ${index + 1}`,
    note: [exercise.type, exercise.rest ? `${exercise.rest} rest` : ''].filter(Boolean).join(' · '),
    targetSets: Math.max(1, Number(exercise.sets || 1)),
    targetReps: reps,
    defaultKg: parseNumber(exercise.weight, 0),
    restTime: restSeconds > 0 ? `${restSeconds}s` : '--',
    restSeconds,
    isHold,
  };
}

function getNutritionToday(plan: NutritionPlanApiResponse | null) {
  if (!plan?.days?.length) return null;
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return (
    plan.days.find((day) => String(day.day || '').toLowerCase().includes(weekday)) ||
    plan.days[0]
  );
}

export default function HomeScreen() {
  const checkingAccess = useModuleAccessGuard('/');
  const router = useRouter();
  const { t } = useLanguage();
  const { isDark, colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentWeight, setCurrentWeight] = useState('');
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanApiResponse | null>(null);
  const [updatingMealKey, setUpdatingMealKey] = useState<string | null>(null);
  const [strengthPlan, setStrengthPlan] = useState<StrengthPlanResponse | null>(null);
  const [homeLibraryWorkout, setHomeLibraryWorkout] = useState<any | null>(null);
  const [homeWorkoutSummary, setHomeWorkoutSummary] = useState<HomeWorkoutPlanSummary | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogItem[]>([]);
  const [journalWrittenToday, setJournalWrittenToday] = useState(false);
  const [hydration, setHydration] = useState<HydrationState | null>(null);
  const [accountabilityPartner, setAccountabilityPartner] = useState<AccountabilityPartnerResponse | null>(null);

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
      const [
        user,
        metrics,
        challengeData,
        latestNutritionPlan,
        latestStrengthPlan,
        logsData,
        journalData,
        hydrationData,
        workoutLibrary,
        homePlanSummary,
        accountabilityData,
      ] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        fetchCurrentUserBodyMetrics().catch(() => null),
        fetchChallengeOverviewData({ forceRefresh: true }).catch(() => null),
        getLatestNutritionPlan({ forceRefresh: true }).catch(() => null),
        fetchLatestStrengthWorkoutPlan().catch(() => null),
        fetchWorkoutLogs(1, 50, 'completed').catch(() => null),
        fetchJournalEntries().catch(() => null),
        fetchCurrentUserHydration().catch(() => null),
        fetchWorkoutLibrary().catch(() => null),
        fetchHomeWorkoutPlanSummary().catch(() => null),
        fetchAccountabilityPartner().catch(() => null),
      ]);

      if (user) {
        setCurrentUser(user);
      }

      const existingWeight = metrics?.weight || (user as any)?.weight || '';
      if (existingWeight) {
        setCurrentWeight(String(existingWeight));
      }

      setNutritionPlan(latestNutritionPlan);
      setStrengthPlan(latestStrengthPlan);
      setWorkoutLogs(Array.isArray(logsData?.items) ? logsData.items : []);
      setHydration(hydrationData);
      setHomeLibraryWorkout(workoutLibrary?.featuredWorkout || workoutLibrary?.workouts?.[0] || null);
      setHomeWorkoutSummary(homePlanSummary);
      setAccountabilityPartner(accountabilityData);

      if (Array.isArray(journalData?.entries)) {
        setJournalWrittenToday(journalData.entries.some((entry) => isSameLocalDay(entry.created_at)));
      }

      if (latestStrengthPlan) {
        const day = firstStrengthDay(latestStrengthPlan);
        const exerciseCount = day?.exercises?.length || day?.sections?.reduce((total, section) => total + (section.exercises?.length || 0), 0) || 0;
        const durationLabel = day?.est_time || planDuration;
        const summary = latestStrengthPlan.summary || '';
        const equipmentMatch = summary.match(/using\s+(.+?)(?:\.|$)/i);
        setPlanBuilt(true);
        setPlanSummaryLine(
          summary ||
            `${day?.title || 'Your strength session'} · ${parseMinutes(durationLabel, 40)} min · ${exerciseCount} exercises.`
        );
        setPlanKit(equipmentMatch?.[1]?.trim() || planKit);
        setPlanDuration(`${parseMinutes(durationLabel, 40)} minutes`);
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
    return hydration?.target_liters || Math.round(w * 0.035 * 10) / 10;
  }, [currentWeight, hydration?.target_liters]);

  const strengthDay = useMemo(() => firstStrengthDay(strengthPlan), [strengthPlan]);
  const strengthExercises = useMemo(() => {
    const flat = strengthDay?.exercises?.length
      ? strengthDay.exercises
      : (strengthDay?.sections || []).flatMap((section) => section.exercises || []);
    return flat || [];
  }, [strengthDay]);
  const detailExercises = useMemo(
    () => {
      if (strengthExercises.length > 0) {
        return strengthExercises.map(mapPlanExerciseForDetail);
      }
      return (homeLibraryWorkout?.movements || []).map((movement: any, index: number) => ({
        id: movement.id || `movement-${index}`,
        name: movement.name || `Movement ${index + 1}`,
        note: [movement.equipment, movement.restSeconds ? `${movement.restSeconds}s rest` : '', movement.notes]
          .filter(Boolean)
          .join(' · '),
        sets: `${movement.sets || 1} × ${movement.reps || '1'}`,
        rest: movement.restSeconds ? `${movement.restSeconds}s` : undefined,
      }));
    },
    [homeLibraryWorkout?.movements, strengthExercises]
  );
  const activeExercises = useMemo(
    () => {
      if (strengthExercises.length > 0) {
        return strengthExercises.map(mapPlanExerciseForSession);
      }
      return (homeLibraryWorkout?.movements || []).map((movement: any, index: number) => {
        const reps = parseReps(movement.reps);
        const restSeconds = Math.max(0, Number(movement.restSeconds || 60));
        return {
          id: movement.id || `movement-${index}`,
          name: movement.name || `Movement ${index + 1}`,
          note: [movement.equipment, movement.notes].filter(Boolean).join(' · '),
          targetSets: Math.max(1, Number(movement.sets || 1)),
          targetReps: reps,
          defaultKg: parseNumber(movement.load, 0),
          restTime: restSeconds > 0 ? `${restSeconds}s` : '--',
          restSeconds,
          isHold: reps === 'max',
        };
      });
    },
    [homeLibraryWorkout?.movements, strengthExercises]
  );
  const workoutTitle = useMemo(() => {
    return (
      homeWorkoutSummary?.title ||
      strengthDay?.title ||
      homeLibraryWorkout?.title ||
      currentUser?.workout_unlock_label ||
      'Workout'
    );
  }, [currentUser?.workout_unlock_label, homeLibraryWorkout?.title, homeWorkoutSummary?.title, strengthDay?.title]);
  const workoutDurationMinutes = useMemo(() => {
    if (homeWorkoutSummary?.durationMinutes) return Number(homeWorkoutSummary.durationMinutes);
    if (strengthDay?.est_time) return parseMinutes(strengthDay.est_time, 40);
    if (homeLibraryWorkout?.durationMinutes) return Number(homeLibraryWorkout.durationMinutes);
    return Number(planDuration.replace(/[^0-9]/g, '')) || (tier === 'SILVER' ? 38 : 40);
  }, [homeLibraryWorkout?.durationMinutes, homeWorkoutSummary?.durationMinutes, planDuration, strengthDay?.est_time, tier]);
  const workoutEquipment = useMemo(() => {
    const fromExercise = strengthExercises.find((item) => String(item.weight || '').trim())?.weight;
    return (homeWorkoutSummary?.equipment || planKit || homeLibraryWorkout?.equipment || fromExercise || 'Bodyweight').toUpperCase();
  }, [homeLibraryWorkout?.equipment, homeWorkoutSummary?.equipment, planKit, strengthExercises]);
  const planDayKicker = useMemo(() => {
    if (homeWorkoutSummary?.dayKicker) return homeWorkoutSummary.dayKicker;
    if (strengthDay?.day) {
      return `${String(strengthDay.day).toUpperCase()} · ${workoutDurationMinutes} MIN`;
    }
    return `TODAY · ${workoutDurationMinutes} MIN`;
  }, [homeWorkoutSummary?.dayKicker, strengthDay?.day, workoutDurationMinutes]);
  const planSource = homeWorkoutSummary?.planSource || (strengthPlan ? 'BUILT BY YOUR COACH' : tier !== 'SILVER' ? 'BUILT BY YOUR COACH' : 'TODAY’S WORKOUT');

  const todayMeals = useMemo<HomeMealItem[]>(() => {
    const today = getNutritionToday(nutritionPlan);
    if (!today) return [];
    const completions = nutritionPlan?.meal_completions?.[today.day] || {};
    const rows: HomeMealItem[] = [];
    ([
      ['breakfast', 'Breakfast'],
      ['lunch', 'Lunch'],
      ['dinner', 'Dinner'],
    ] as const).forEach(([key, label]) => {
      const meal = today[key];
      if (!meal || typeof meal !== 'object') return;
      const completed = Boolean(completions[key]);
      rows.push({
        key,
        title: String(meal.name || `${label} planned`),
        subtitle: `${label} · ${completed ? 'eaten' : meal.timing || 'from your week plan'}`,
        completed,
        canLog: key === 'dinner',
      });
    });
    return rows;
  }, [nutritionPlan]);

  const sessionsDoneThisWeek = useMemo(() => {
    return workoutLogs.filter((log) => isThisLocalWeek(log.completed_at || log.started_at)).length;
  }, [workoutLogs]);

  const latestCompletedToday = useMemo(() => {
    return workoutLogs.find((log) => isSameLocalDay(log.completed_at || log.started_at));
  }, [workoutLogs]);

  const handleOpenChallenge = useCallback((ch: any) => {
    router.push('/(tabs)/challenge');
  }, [router]);

  const handleInviteSomeone = useCallback(() => {
    setInviteModalVisible(true);
  }, []);

  const handleToggleHomeMeal = useCallback(async (mealKey: string, completed: boolean) => {
    const today = getNutritionToday(nutritionPlan);
    if (!today?.day || updatingMealKey) return;
    setUpdatingMealKey(mealKey);
    try {
      const updated = await updateNutritionMealCompletion({
        day: today.day,
        meal_key: mealKey,
        completed,
      });
      setNutritionPlan(updated);
    } catch {
      Alert.alert('Unable to update meal', 'Please try again in a moment.');
    } finally {
      setUpdatingMealKey(null);
    }
  }, [nutritionPlan, updatingMealKey]);

  const handleWaterChange = useCallback(async (ml: number) => {
    try {
      const updated = await updateCurrentUserHydration({
        water_ml: ml,
        target_liters: targetWaterLiters,
      });
      setHydration(updated);
    } catch {
      // Keep the optimistic UI state; the card still persists locally.
    }
  }, [targetWaterLiters]);

  const handleReminderChange = useCallback(async (enabled: boolean, mode: 'Vibrate' | 'Tone') => {
    try {
      const updated = await updateCurrentUserHydration({
        reminder_enabled: enabled,
        reminder_mode: mode,
        target_liters: targetWaterLiters,
      });
      setHydration(updated);
    } catch {
      // Reminder state remains locally available if the request fails.
    }
  }, [targetWaterLiters]);

  const handleCompletedHomeSession = useCallback(async (stats: { minutes: number; setsLogged: number; volumeKg: number; durationSeconds: number }) => {
    setCompletedStats(stats);
    try {
      await createWorkoutLog({
        workout_id: strengthPlan?.plan_id ? `${strengthPlan.plan_id}-${strengthDay?.day || 'day'}` : homeLibraryWorkout?.id || 'home-session',
        title: workoutTitle,
        duration_seconds: stats.durationSeconds || stats.minutes * 60,
        sets_logged: stats.setsLogged,
        volume_kg: stats.volumeKg,
        movements: activeExercises.map((exercise: HomeActiveExercise) => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.targetSets,
          reps: exercise.targetReps,
          rest_seconds: exercise.restSeconds,
          default_kg: exercise.defaultKg,
        })),
        status: 'completed',
      });
      const logsData = await fetchWorkoutLogs(1, 50, 'completed').catch(() => null);
      if (Array.isArray(logsData?.items)) {
        setWorkoutLogs(logsData.items);
      }
      const refreshedUser = await fetchCurrentUser({ forceRefresh: true }).catch(() => null);
      if (refreshedUser) setCurrentUser(refreshedUser);
    } catch {
      Alert.alert('Session saved locally only', 'The workout finished, but saving it to the backend failed. Please try again when the connection is stable.');
    } finally {
      setCompleteModalVisible(true);
    }
  }, [activeExercises, homeLibraryWorkout?.id, strengthDay?.day, strengthPlan?.plan_id, workoutTitle]);

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
          workoutTitle={workoutTitle}
          durationMinutes={workoutDurationMinutes}
          exerciseCount={activeExercises.length || homeLibraryWorkout?.movements?.length || 0}
          equipment={workoutEquipment}
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
          meals={todayMeals}
          updatingMealKey={updatingMealKey}
          onToggleMeal={handleToggleHomeMeal}
        />

        {/* 7. Hydration Glass with animated fill & reminder toggle */}
        <ClaudeHydrationCard
          targetLiters={targetWaterLiters}
          initialMl={hydration?.water_ml || 0}
          reminderEnabled={hydration?.reminder?.enabled}
          reminderMode={hydration?.reminder?.mode}
          onWaterChange={handleWaterChange}
          onReminderChange={handleReminderChange}
        />

        {/* 8. AI Coach Bar (Prompt input for Gold/Plat/IC, locked teaser for Silver) */}
        <ClaudeCoachBar tier={tier} />

        {/* 9. Platinum / Inner Circle privileges (Wearables sync, coaching brief) */}
        <ClaudeTierPerksCard tier={tier} />

        {/* 10. Also Today (Accountability Duo, Daily Journal, Weekly Target) */}
        <ClaudeAlsoTodayCard
          partnerName={accountabilityPartner?.partner?.name}
          partnerTrainedToday={Boolean(accountabilityPartner?.partner?.trained_today)}
          sessionsDoneThisWeek={sessionsDoneThisWeek}
          sessionsTargetThisWeek={4}
          journalWrittenToday={journalWrittenToday}
          onNavigateWorkout={() => pushRoute(router, '/workout')}
        />
      </ScrollView>

      {/* Silver Vimeo Player Modal (matching lines 489 & 2357-2358 of prototype) */}
      <ClaudeVimeoPlayerModal
        visible={vimeoModalVisible}
        onClose={() => setVimeoModalVisible(false)}
        workoutTitle={homeLibraryWorkout?.title || workoutTitle}
        workoutMeta={`FROM THE LIBRARY · ${homeLibraryWorkout?.durationMinutes || workoutDurationMinutes} MIN · ${homeLibraryWorkout?.equipment || workoutEquipment}`}
        vimeoId={homeLibraryWorkout?.vimeoId || ''}
        onFinishSession={() => {
          setVimeoModalVisible(false);
          void handleCompletedHomeSession({
            minutes: homeLibraryWorkout?.durationMinutes || workoutDurationMinutes,
            setsLogged: homeLibraryWorkout?.movements?.length || 0,
            volumeKg: 0,
            durationSeconds: homeLibraryWorkout?.durationSeconds || workoutDurationMinutes * 60,
          });
        }}
      />

      {/* Start My Session / Plan Detail Modal */}
      <ClaudePlanDetailModal
        visible={planDetailVisible}
        onClose={() => setPlanDetailVisible(false)}
        planTitle={workoutTitle}
        dayKicker={planDayKicker}
        planSource={planSource}
        exercises={detailExercises}
        weekPips={homeWorkoutSummary?.week?.pips}
        weekNote={homeWorkoutSummary?.week?.note}
        sessionSummary={homeWorkoutSummary?.session}
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
        workoutTitle={workoutTitle}
        exercises={activeExercises}
        onEndSession={(stats) => {
          setActiveSessionVisible(false);
          if (stats) {
            void handleCompletedHomeSession(stats);
          }
        }}
      />

      {/* Post-Workout Feedback & Completion Celebration Modal */}
      <ClaudeSessionCompleteModal
        visible={completeModalVisible}
        onClose={() => setCompleteModalVisible(false)}
        workoutTitle={latestCompletedToday?.title || workoutTitle}
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
