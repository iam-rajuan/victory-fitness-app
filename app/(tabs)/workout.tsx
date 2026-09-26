import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  fetchCurrentUser,
  AuthUser,
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

function formatDurationBadge(minutes: number) {
  if (!minutes || minutes <= 0) return '00:00';
  return `${minutes}:00`;
}

function formatWorkoutMeta(workout: WorkoutLibraryItem) {
  const duration = workout.durationMinutes > 0 ? `${workout.durationMinutes} min` : 'Duration not set';
  const tag = workout.tag || 'Workout';
  const equipment = workout.equipment || 'Kit not set';
  return `${duration} · ${tag} · ${equipment}`;
}

function mapLibraryWorkout(workout: WorkoutLibraryItem): GridWorkoutItem {
  return {
    id: workout.id,
    name: workout.title,
    meta: formatWorkoutMeta(workout),
    badge: formatDurationBadge(workout.durationMinutes),
    lvl: workout.level || 'All levels',
    vimeoId: workout.vimeoId,
    videoUrl: workout.videoUrl,
    videoSource: workout.videoSource,
    tag: workout.tag,
    equipment: workout.equipment,
    durationMinutes: workout.durationMinutes,
    thumbnail: workout.thumbnail,
    movements: workout.movements,
  };
}

function mapRowWorkout(workout: GridWorkoutItem, badge: string): WorkoutRowItem {
  return {
    n: workout.name,
    m: workout.meta,
    t: badge,
    v: workout.vimeoId,
    thumbnail: workout.thumbnail,
    item: workout,
  } as WorkoutRowItem & { item: GridWorkoutItem };
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

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('All');
  const [selectedDuration, setSelectedDuration] = useState('Any');
  const [selectedKit, setSelectedKit] = useState('Any');

  // Plan Build State
  const [planBuilt, setPlanBuilt] = useState(false);
  const [planSummaryLine, setPlanSummaryLine] = useState('Get stronger · Mon, Wed, Fri · 40 min · built around dumbbells.');

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
    minutes: 40,
    setsLogged: 7,
    volumeKg: 840,
  });

  const tier = useMemo(() => {
    return normalizeSubscriptionTier(currentUser?.subscription_tier);
  }, [currentUser?.subscription_tier]);

  const hasCoach = tier !== 'SILVER' && tier !== 'NONE';

  const loadData = async () => {
    try {
      const user = await fetchCurrentUser();
      if (user) setCurrentUser(user);

      const library = await fetchWorkoutLibrary();
      const mappedWorkouts = library.workouts.map(mapLibraryWorkout);
      setLibraryWorkouts(mappedWorkouts);
      setLibraryPrograms(library.categories.map(mapLibraryCategory));
      setSelectedWorkout((existing) => existing || mappedWorkouts[0] || null);

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
        const matchMin = w.meta.match(/(\d+)\s*min/);
        if (matchMin && parseInt(matchMin[1], 10) > maxMins) return false;
      }
      return true;
    });
  }, [libraryWorkouts, searchQuery, selectedPurpose, selectedKit, selectedDuration]);

  const resultCountText = `${filteredWorkouts.length} of ${libraryWorkouts.length} workouts · shortest first`;
  const forYouWorkouts = useMemo(() => filteredWorkouts.slice(0, 4).map((workout, idx) => {
    const badges = ['FITS YOUR FILTERS', 'FROM THE LIBRARY', 'READY TO START', 'PUBLISHED'];
    return mapRowWorkout(workout, badges[idx] || 'WORKOUT');
  }), [filteredWorkouts]);
  const newWorkouts = useMemo(() => libraryWorkouts.slice(0, 6).map((workout) => mapRowWorkout(workout, 'NEW FROM DASHBOARD')), [libraryWorkouts]);
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
    if (selectedWorkout?.videoUrl || selectedWorkout?.vimeoId) {
      setVimeoModalVisible(true);
    } else {
      setActiveSessionVisible(true);
    }
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
    stats?: { minutes: number; setsLogged: number; volumeKg: number },
    stepMode: 'feedback' | 'complete' = 'complete'
  ) => {
    if (stats) setCompletedStats(stats);
    setCompleteInitialStep(stepMode);
    setVimeoModalVisible(false);
    setActiveSessionVisible(false);
    setCompleteModalVisible(true);

    // Record analytics event
    void recordAnalyticsEvent('workout_completed', {
      workout_id: selectedWorkout?.id || 'session_64',
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
          minutesLeft={selectedWorkout?.durationMinutes ? `${selectedWorkout.durationMinutes} min` : 'Not set'}
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
          subtitle="Published workouts from your dashboard"
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
        durationBadge={selectedWorkout?.badge || '00:00'}
        vimeoId={selectedWorkout?.vimeoId || ''}
        videoUrl={selectedWorkout?.videoUrl || ''}
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
        onClose={() => setActiveSessionVisible(false)}
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
        minutes={completedStats.minutes}
        setsLogged={completedStats.setsLogged}
        volumeKg={completedStats.volumeKg}
        streakDays={currentUser?.streak_days || 13}
        identityStatement={currentUser?.identity_statement || undefined}
        motivationStatement={currentUser?.motivation_statement || undefined}
        tier={tier}
        onDoneHome={() => {
          setCompleteModalVisible(false);
          pushRoute(router, '/(tabs)');
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
