import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchCurrentUser,
  AuthUser,
  createWorkoutLog,
  fetchCurrentUserOnboarding,
  fetchWorkoutLogs,
  recordAnalyticsEvent,
} from '../../lib/api';
import { normalizeSubscriptionTier } from '../../lib/access';
import { pushRoute } from '../../lib/navigation';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';
import { useTheme } from '../../context/ThemeContext';

// Modular Claude Workout Components
import ClaudeTrainHeader from '../../components/workout/ClaudeTrainHeader';
import ClaudePlanBuildBanner from '../../components/workout/ClaudePlanBuildBanner';
import ClaudeResumeSessionCard from '../../components/workout/ClaudeResumeSessionCard';
import ClaudeWorkoutRowCarousel, {
  ProgramCardItem,
  WorkoutRowItem,
} from '../../components/workout/ClaudeWorkoutRowCarousel';
import ClaudeWorkoutFilters from '../../components/workout/ClaudeWorkoutFilters';
import ClaudeWorkoutGrid, { GridWorkoutItem } from '../../components/workout/ClaudeWorkoutGrid';
import ClaudeVimeoPlayerModal from '../../components/workout/ClaudeVimeoPlayerModal';
import ClaudePlanDetailModal from '../../components/workout/ClaudePlanDetailModal';
import ClaudeActiveSessionModal from '../../components/workout/ClaudeActiveSessionModal';
import ClaudeSessionCompleteModal from '../../components/workout/ClaudeSessionCompleteModal';
import ClaudePlanBuildModal from '../../components/workout/ClaudePlanBuildModal';
import ClaudeWorkoutDetailModal from '../../components/workout/ClaudeWorkoutDetailModal';
import { getSavedPlanStatus, savePlanBuiltData } from '../../lib/planStorage';
import { fetchWorkoutLibrary, WorkoutLibraryCategory, WorkoutLibraryItem } from '../../lib/workouts';

const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';
const COMPLETED_WORKOUT_IDS_KEY = '@victory_completed_workout_ids';

function formatDurationBadge(seconds: number, minutes: number) {
  if (seconds > 0) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  if (!minutes || minutes <= 0) return 'Not set';
  return `${minutes}:00`;
}

function formatDurationText(seconds: number, minutes: number) {
  if (seconds > 0) return formatDurationBadge(seconds, minutes);
  if (minutes > 0) return `${minutes} min`;
  return 'Duration not set';
}

function formatWorkoutMeta(workout: WorkoutLibraryItem) {
  const duration = formatDurationText(workout.durationSeconds, workout.durationMinutes);
  const tag = workout.tag || 'Workout';
  const equipment = workout.equipment || 'Kit not set';
  return `${duration} · ${tag} · ${equipment}`;
}

function formatCompletionDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).toUpperCase();
}

async function readLocalCompletedWorkoutIds() {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_WORKOUT_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map((id) => String(id).trim()).filter(Boolean) : []);
  } catch {
    return new Set<string>();
  }
}

async function saveLocalCompletedWorkoutId(workoutId: string) {
  const id = String(workoutId || '').trim();
  if (!id) return;
  const ids = await readLocalCompletedWorkoutIds();
  ids.add(id);
  await AsyncStorage.setItem(COMPLETED_WORKOUT_IDS_KEY, JSON.stringify([...ids]));
}

function mapLibraryWorkout(
  workout: WorkoutLibraryItem,
  completedWorkoutIds: Set<string> = new Set(),
  completedWorkoutTitles: Set<string> = new Set()
): GridWorkoutItem {
  const titleKey = normalizeWords(workout.title);
  return {
    id: workout.id,
    name: workout.title,
    meta: formatWorkoutMeta(workout),
    badge: formatDurationBadge(workout.durationSeconds, workout.durationMinutes),
    lvl: workout.level || 'All levels',
    vimeoId: workout.vimeoId,
    videoUrl: workout.videoUrl,
    videoSource: workout.videoSource,
    tag: workout.tag,
    equipment: workout.equipment,
    durationMinutes: workout.durationMinutes,
    durationSeconds: workout.durationSeconds,
    thumbnail: workout.thumbnail,
    dateAdded: workout.dateAdded,
    completed: completedWorkoutIds.has(workout.id) || completedWorkoutTitles.has(titleKey),
    movements: workout.movements,
  };
}

function mapRowWorkout(workout: GridWorkoutItem, badge: string): WorkoutRowItem {
  return {
    n: workout.name,
    m: workout.meta,
    t: badge,
    v: workout.vimeoId,
    videoUrl: workout.videoUrl,
    videoSource: workout.videoSource,
    thumbnail: workout.thumbnail,
    completed: workout.completed,
    item: workout,
  } as WorkoutRowItem & { item: GridWorkoutItem };
}

function normalizeWords(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchesWorkoutEquipment(workout: GridWorkoutItem, kitWords: string[]) {
  if (!kitWords.length) return false;
  const haystack = normalizeWords(`${workout.equipment || ''} ${workout.meta || ''}`);
  return kitWords.some((kit) => {
    if (!kit) return false;
    if ((kit.includes('bodyweight') || kit.includes('no kit') || kit.includes('no equipment')) && /bodyweight|no kit|no equipment/.test(haystack)) {
      return true;
    }
    return haystack.includes(kit);
  });
}

function buildWorkoutReason(workout: GridWorkoutItem, kitWords: string[], targetMinutes: number) {
  if (matchesWorkoutEquipment(workout, kitWords)) return 'Fits your kit';
  const minutes = workout.durationMinutes || Math.round((workout.durationSeconds || 0) / 60);
  if (targetMinutes > 0 && minutes > 0 && minutes <= targetMinutes) return 'Fits your time';
  if (minutes > 0 && minutes <= 15) return 'Short on time';
  if (workout.tag) return workout.tag;
  return 'For you';
}

function formatAddedBadge(dateValue?: string) {
  if (!dateValue) return 'New';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'New';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays <= 0) return 'Added today';
  if (diffDays === 1) return 'Added yesterday';
  if (diffDays < 7) {
    return `Added ${date.toLocaleDateString(undefined, { weekday: 'short' })}`;
  }
  return `Added ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function mapLibraryCategory(category: WorkoutLibraryCategory, idx: number): ProgramCardItem {
  return {
    n: category.name,
    m: `${category.count} workout${category.count === 1 ? '' : 's'}`,
    t: category.name.toUpperCase(),
    c: `${category.count} available`,
    rank: idx + 1,
    image: category.image,
  };
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = parseInt(String(value ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseWeightKg(value: unknown) {
  const parsed = parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatRestTime(seconds: number | undefined) {
  const total = Math.max(0, Number(seconds || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function WorkoutScreen() {
  const router = useRouter();
  const checkingAccess = useModuleAccessGuard('/workout');
  const { isDark, colors } = useTheme();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [libraryWorkouts, setLibraryWorkouts] = useState<GridWorkoutItem[]>([]);
  const [libraryPrograms, setLibraryPrograms] = useState<ProgramCardItem[]>([]);
  const completedWorkoutIdsRef = useRef<Set<string>>(new Set());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('All');
  const [selectedDuration, setSelectedDuration] = useState('Any');
  const [selectedKit, setSelectedKit] = useState('Any');

  // Plan Build State
  const [planBuilt, setPlanBuilt] = useState(false);
  const [planSummaryLine, setPlanSummaryLine] = useState('Get stronger · Mon, Wed, Fri · 40 min · built around dumbbells.');
  const [trainingContextLine, setTrainingContextLine] = useState('Workouts matched to your kit and time');
  const [preferredKitWords, setPreferredKitWords] = useState<string[]>([]);
  const [preferredMinutes, setPreferredMinutes] = useState(0);

  // Modals State
  const [workoutDetailModalVisible, setWorkoutDetailModalVisible] = useState(false);
  const [vimeoModalVisible, setVimeoModalVisible] = useState(false);
  const [planDetailVisible, setPlanDetailVisible] = useState(false);
  const [activeSessionVisible, setActiveSessionVisible] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [planBuildModalVisible, setPlanBuildModalVisible] = useState(false);

  // Active workout being played / tracked
  const [selectedWorkout, setSelectedWorkout] = useState<GridWorkoutItem | null>(null);
  const [completedStats, setCompletedStats] = useState({
    minutes: 0,
    setsLogged: 0,
    volumeKg: 0,
    durationSeconds: 0,
  });

  const tier = useMemo(() => {
    return normalizeSubscriptionTier(currentUser?.subscription_tier);
  }, [currentUser?.subscription_tier]);

  const hasCoach = tier !== 'SILVER' && tier !== 'NONE';

  const loadData = async () => {
    try {
      const user = await fetchCurrentUser();
      if (user) setCurrentUser(user);

      const [library, completedLogs, onboarding, localCompletedIds] = await Promise.all([
        fetchWorkoutLibrary(),
        fetchWorkoutLogs(1, 200, 'completed').catch(() => ({ items: [] })),
        fetchCurrentUserOnboarding().catch(() => null),
        readLocalCompletedWorkoutIds(),
      ]);
      const selectedKit = onboarding?.preferences?.selectedKit || [];
      const equipmentAccess = onboarding?.anamnese?.equipmentAccess || '';
      const daysPerWeek = onboarding?.anamnese?.daysPerWeek || '';
      const durationLabel = onboarding?.anamnese?.timePerSession || '';
      const durationMatch = String(durationLabel).match(/\d+/);
      const daysMatch = String(daysPerWeek).match(/\d+/);
      const weeklyMinutes = Math.max(Number(onboarding?.calculations?.weeklyMinutes || 0) || 0, 0);
      const calculatedSessionMinutes = weeklyMinutes > 0 && daysMatch ? Math.round(weeklyMinutes / Math.max(1, Number(daysMatch[0]))) : 0;
      const nextPreferredMinutes = durationMatch ? Number(durationMatch[0]) : calculatedSessionMinutes;
      const nextKitWords = [...selectedKit, equipmentAccess]
        .map(normalizeWords)
        .filter(Boolean);
      setPreferredKitWords(nextKitWords);
      setPreferredMinutes(nextPreferredMinutes);
      const kitLabel = selectedKit.length
        ? selectedKit.join(', ')
        : equipmentAccess || 'Your kit';
      const durationText = nextPreferredMinutes > 0 ? `${nextPreferredMinutes} minutes` : 'your time';
      const daysText = daysPerWeek ? `, ${daysPerWeek}` : '';
      setTrainingContextLine(`${kitLabel}, ${durationText}${daysText}`);
      const completedWorkoutIds = new Set(
        completedLogs.items
          .map((log) => String(log.workout_id || '').trim())
          .filter(Boolean)
      );
      const completedWorkoutTitles = new Set(
        completedLogs.items
          .map((log) => normalizeWords(log.title))
          .filter(Boolean)
      );
      localCompletedIds.forEach((id) => completedWorkoutIds.add(id));
      completedWorkoutIdsRef.current.forEach((id) => completedWorkoutIds.add(id));
      const mappedWorkouts = library.workouts.map((workout) => mapLibraryWorkout(workout, completedWorkoutIds, completedWorkoutTitles));
      setLibraryWorkouts(mappedWorkouts);
      setLibraryPrograms(library.categories.map(mapLibraryCategory));
      setSelectedWorkout((existing) => {
        if (!existing?.id) return mappedWorkouts[0] || existing || null;
        return mappedWorkouts.find((workout) => workout.id === existing.id) || existing;
      });

      const status = await getSavedPlanStatus();
      if (status.planBuilt) {
        setPlanBuilt(true);
        setPlanSummaryLine(status.planSummary);
      }
    } catch {}
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filtered workouts
  const filteredWorkouts = useMemo(() => {
    return libraryWorkouts.filter((w) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchMeta = w.meta.toLowerCase().includes(q);
        if (!matchName && !matchMeta) return false;
      }
      // Purpose
      if (selectedPurpose !== 'All') {
        if (!w.meta.toLowerCase().includes(selectedPurpose.toLowerCase())) return false;
      }
      // Kit
      if (selectedKit !== 'Any') {
        if (!w.meta.toLowerCase().includes(selectedKit.toLowerCase())) return false;
      }
      // Duration
      if (selectedDuration !== 'Any') {
        const maxMins = parseInt(selectedDuration, 10);
        if ((w.durationMinutes || 0) > maxMins) return false;
      }
      return true;
    });
  }, [libraryWorkouts, searchQuery, selectedPurpose, selectedKit, selectedDuration]);

  const resultCountText = `${filteredWorkouts.length} of ${libraryWorkouts.length} workouts · shortest first`;
  const forYouWorkouts = useMemo(() => filteredWorkouts.slice(0, 4).map((workout, idx) => {
    return mapRowWorkout(workout, buildWorkoutReason(workout, preferredKitWords, preferredMinutes));
  }), [filteredWorkouts, preferredKitWords, preferredMinutes]);
  const newWorkouts = useMemo(() => {
    return [...libraryWorkouts]
      .sort((a, b) => {
        const aTime = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
        const bTime = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6)
      .map((workout) => mapRowWorkout(workout, formatAddedBadge(workout.dateAdded)));
  }, [libraryWorkouts]);
  const selectedExercises = useMemo(() => {
    return (selectedWorkout?.movements || []).map((movement, idx) => {
      const setText = movement.sets ? `${movement.sets} sets` : '';
      const repText = movement.reps ? `${movement.reps} reps` : '';
      const loadText = movement.load || movement.equipment || '';
      return {
        n: movement.name,
        s: [movement.sets, movement.load, movement.reps].filter(Boolean).join(' × ') || movement.notes || '',
        id: movement.id || `${idx}`,
        name: movement.name,
        note: [movement.notes, movement.equipment].filter(Boolean).join(' · ') || [setText, repText, loadText].filter(Boolean).join(' · '),
        targetSets: parsePositiveInt(movement.sets, 1),
        targetReps: /max/i.test(String(movement.reps)) ? 'max' as const : parsePositiveInt(movement.reps, 1),
        defaultKg: parseWeightKg(movement.load),
        restTime: formatRestTime(movement.restSeconds),
        restSeconds: Math.max(0, Number(movement.restSeconds || 0)),
        isHold: /hold|max/i.test(`${movement.name} ${movement.reps}`),
      };
    });
  }, [selectedWorkout?.movements]);

  const [completeInitialStep, setCompleteInitialStep] = useState<'feedback' | 'complete'>('complete');

  // Actions
  const handleStartWorkout = (w: GridWorkoutItem) => {
    setSelectedWorkout(w);
    setWorkoutDetailModalVisible(true);
  };

  const handleStartWorkoutFromDetail = () => {
    setWorkoutDetailModalVisible(false);
    setActiveSessionVisible(true);
  };

  const handlePauseActiveSession = () => {
    setActiveSessionVisible(false);
    setWorkoutDetailModalVisible(true);
  };

  const handleResumeSession = () => {
    setSelectedWorkout(libraryWorkouts[0] || null);
    setWorkoutDetailModalVisible(true);
  };

  const handlePlanBannerPress = () => {
    if (hasCoach) {
      setPlanBuildModalVisible(true);
    } else {
      pushRoute(router, '/subscription');
    }
  };

  const handleFinishSession = (
    stats?: { minutes: number; setsLogged: number; volumeKg: number; durationSeconds?: number },
    stepMode: 'feedback' | 'complete' = 'complete'
  ) => {
    const nextStats = stats
      ? { ...stats, durationSeconds: Math.max(0, stats.durationSeconds || stats.minutes * 60) }
      : completedStats;
    if (stats) setCompletedStats(nextStats);
    if (selectedWorkout?.id) {
      const completedId = selectedWorkout.id;
      completedWorkoutIdsRef.current.add(completedId);
      void saveLocalCompletedWorkoutId(completedId);
      setLibraryWorkouts((items) =>
        items.map((item) => (item.id === completedId ? { ...item, completed: true } : item))
      );
      setSelectedWorkout((item) => (item?.id === completedId ? { ...item, completed: true } : item));
    }
    setCompleteInitialStep(stepMode);
    setVimeoModalVisible(false);
    setActiveSessionVisible(false);
    setCompleteModalVisible(true);

    const movementSummary = selectedExercises.map((exercise, index) => ({
      order: index,
      name: exercise.name,
      prescription: exercise.s,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      defaultKg: exercise.defaultKg,
      restSeconds: exercise.restSeconds,
    }));

    void createWorkoutLog({
      workout_id: selectedWorkout?.id || 'workout',
      title: selectedWorkout?.name || 'Workout',
      duration_seconds: nextStats.durationSeconds,
      sets_logged: nextStats.setsLogged,
      volume_kg: nextStats.volumeKg,
      movements: movementSummary,
      status: 'completed',
      market: currentUser?.country_code || undefined,
    })
      .then(() => fetchCurrentUser())
      .then((user) => {
        if (user) setCurrentUser(user);
        void loadData();
      })
      .catch(() => undefined);

    void recordAnalyticsEvent('workout_completed', {
      workout_id: selectedWorkout?.id || 'workout',
      tier,
    }).catch(() => undefined);
  };

  const handlePlanBuilt = async (summary: {
    goal?: string;
    days?: string;
    duration?: string;
    kit?: string;
    line: string;
  }) => {
    setPlanBuilt(true);
    setPlanSummaryLine(summary.line);
    await savePlanBuiltData(summary);
    setPlanBuildModalVisible(false);

    // Follow Claude design routing flow: navigate to Home screen with new plan active!
    router.replace('/(tabs)');
  };

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
        {/* 1. Header: Train, 215 workouts */}
        <ClaudeTrainHeader
          totalWorkouts={libraryWorkouts.length}
          onPressFilter={() => {}}
        />

        {/* 2. Custom Plan Banner */}
        <ClaudePlanBuildBanner
          planBuilt={planBuilt}
          planBuiltLine={planSummaryLine}
          hasCoach={hasCoach}
          onPress={handlePlanBannerPress}
        />

        {/* 3. Pick Up Where You Left Off */}
        <ClaudeResumeSessionCard
          sessionTitle={selectedWorkout?.name || 'No published workout yet'}
          sessionLine={selectedWorkout?.meta || 'Publish workouts in the dashboard to start training here'}
          minutesLeft={
            selectedWorkout
              ? formatDurationBadge(selectedWorkout.durationSeconds || 0, selectedWorkout.durationMinutes || 0)
              : 'Not set'
          }
          thumbnail={selectedWorkout?.thumbnail || ''}
          videoUrl={selectedWorkout?.videoUrl || ''}
          videoSource={selectedWorkout?.videoSource || ''}
          completed={Boolean(selectedWorkout?.completed)}
          progressPct={0}
          onResume={handleResumeSession}
        />

        {/* 4. Workout categories */}
        <ClaudeWorkoutRowCarousel
          title="Workout categories"
          actionText="All ›"
          onActionPress={() => {}}
          type="programs"
          programs={libraryPrograms}
          onSelectProgram={(p) => {
            const matchingWorkout = libraryWorkouts.find((workout) => {
              return (workout.tag || '').toLowerCase() === p.n.toLowerCase();
            });
            if (matchingWorkout) handleStartWorkout(matchingWorkout);
          }}
        />

        {/* 5. Because of how you train */}
        <ClaudeWorkoutRowCarousel
          title="Because of how you train"
          subtitle={trainingContextLine}
          type="workouts"
          workouts={forYouWorkouts}
          onSelectWorkout={(w) => {
            handleStartWorkout(w.item || {
              name: w.n,
              meta: w.m,
              badge: w.t,
              vimeoId: w.v,
            });
          }}
        />

        {/* 6. New from Victor */}
        <ClaudeWorkoutRowCarousel
          title="New from Victor"
          type="workouts"
          workouts={newWorkouts}
          onSelectWorkout={(w) => {
            handleStartWorkout(w.item || {
              name: w.n,
              meta: w.m,
              badge: w.t,
              vimeoId: w.v,
            });
          }}
        />

        {/* 7. The whole library & Filter Chips */}
        <ClaudeWorkoutFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedPurpose={selectedPurpose}
          onSelectPurpose={setSelectedPurpose}
          selectedDuration={selectedDuration}
          onSelectDuration={setSelectedDuration}
          selectedKit={selectedKit}
          onSelectKit={setSelectedKit}
          resultCountText={resultCountText}
        />

        {/* 8. 2-Column Workout Grid */}
        <ClaudeWorkoutGrid
          workouts={filteredWorkouts}
          hasCoach={hasCoach}
          onSelectWorkout={handleStartWorkout}
          onAskCoach={() => pushRoute(router, '/chat')}
        />
      </ScrollView>

      {/* Modals */}
      {/* 0. Claude Workout Detail Modal (Exact parity with VF Prototype.dc.html lines 1538-1565) */}
      <ClaudeWorkoutDetailModal
        visible={workoutDetailModalVisible}
        onClose={() => setWorkoutDetailModalVisible(false)}
        onStartWorkout={handleStartWorkoutFromDetail}
        workoutTitle={selectedWorkout?.name || 'Workout'}
        kicker={selectedWorkout?.meta ? selectedWorkout.meta.toUpperCase() : 'WORKOUT'}
        description={
          selectedWorkout?.movements?.length
            ? `${selectedWorkout.movements.length} movements. Follow the admin-programmed session and video for this workout.`
            : 'Follow the workout video. Add movements in the admin dashboard to show the full member session here.'
        }
        vimeoId={selectedWorkout?.vimeoId || ''}
        videoUrl={selectedWorkout?.videoUrl || ''}
        completed={Boolean(selectedWorkout?.completed)}
        exercises={selectedExercises}
      />

      {/* 1. Vimeo Player Modal */}
      <ClaudeVimeoPlayerModal
        visible={vimeoModalVisible}
        onClose={() => setVimeoModalVisible(false)}
        workoutTitle={selectedWorkout?.name || 'Workout'}
        workoutMeta={selectedWorkout?.meta || 'FROM THE LIBRARY · 40 MIN'}
        workoutDesc={
          selectedWorkout?.movements?.length
            ? `${selectedWorkout.movements.length} programmed movements from the admin dashboard.`
            : 'Follow the video for this workout.'
        }
        vimeoId={selectedWorkout?.vimeoId || ''}
        videoUrl={selectedWorkout?.videoUrl || ''}
        chapters={selectedExercises.map((exercise, idx) => ({
          at: idx === 0 ? '00:00' : '',
          n: exercise.name,
          active: idx === 0,
        }))}
        onFinishSession={() => {
          setVimeoModalVisible(false);
          setActiveSessionVisible(true);
        }}
      />

      {/* 2. Plan Detail Modal ("Start my session" screen) */}
      <ClaudePlanDetailModal
        visible={planDetailVisible}
        onClose={() => setPlanDetailVisible(false)}
        planTitle={selectedWorkout?.name || 'Workout'}
        dayKicker="DAY 3 OF WEEK 2 · PUSH DAY"
        planSource={hasCoach ? 'BUILT BY YOUR COACH' : 'TODAY’S WORKOUT'}
        onBeginSession={() => {
          setPlanDetailVisible(false);
          setActiveSessionVisible(true);
        }}
        onAdjustWithCoach={() => {
          setPlanDetailVisible(false);
          pushRoute(router, '/chat');
        }}
      />

      {/* 3. Active Session Tracker Modal */}
      <ClaudeActiveSessionModal
        visible={activeSessionVisible}
        onClose={handlePauseActiveSession}
        tier={tier}
        workoutTitle={selectedWorkout?.name || 'Workout'}
        unlockNote={currentUser?.identity_statement || 'Your unlock is ready — your true-crime podcast is yours for this workout.'}
        exercises={selectedExercises}
        onEndSession={(stats) => handleFinishSession(stats, 'feedback')}
      />

      {/* 3. Session Complete Modal with unlabelled sentence */}
      <ClaudeSessionCompleteModal
        visible={completeModalVisible}
        onClose={() => setCompleteModalVisible(false)}
        initialStep={completeInitialStep}
        workoutTitle={selectedWorkout?.name || 'Workout'}
        sessionNumber={Math.max(1, Number(currentUser?.workouts_completed || 0) + 1)}
        minutes={completedStats.minutes}
        setsLogged={completedStats.setsLogged}
        volumeKg={completedStats.volumeKg}
        streakDays={Math.max(0, Number(currentUser?.streak_days || 0))}
        exercises={selectedExercises}
        identityStatement={currentUser?.identity_statement || undefined}
        motivationStatement={currentUser?.motivation_statement || undefined}
        userName={currentUser?.name || 'there'}
        dateStr={formatCompletionDate()}
        tier={tier}
        onDoneHome={() => {
          setCompleteModalVisible(false);
        }}
        onUpgrade={() => {
          setCompleteModalVisible(false);
          pushRoute(router, '/subscription');
        }}
      />

      {/* 4. Plan Build 4-Step Wizard Modal */}
      <ClaudePlanBuildModal
        visible={planBuildModalVisible}
        onClose={() => setPlanBuildModalVisible(false)}
        onPlanBuilt={handlePlanBuilt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: OBSIDIAN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 46,
    paddingBottom: 96,
  },
});
