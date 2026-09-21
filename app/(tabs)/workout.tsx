import React, { useState, useEffect, useMemo } from 'react';
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
import ClaudeActiveSessionModal from '../../components/workout/ClaudeActiveSessionModal';
import ClaudeSessionCompleteModal from '../../components/workout/ClaudeSessionCompleteModal';
import ClaudePlanBuildModal from '../../components/workout/ClaudePlanBuildModal';

const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';

// Full 170 Workouts Library Catalog from Claude Design Reference
const PROTOTYPE_LIB: GridWorkoutItem[] = [
  { id: '1', name: 'Ten-Minute Reset', meta: '10 min · Mobility · No kit', badge: '10:00', lvl: 'All levels', vimeoId: '912440318' },
  { id: '2', name: 'Desk Neck & Shoulders', meta: '8 min · Mobility · No kit', badge: '8:00', lvl: 'Beginner', vimeoId: '912440319' },
  { id: '3', name: 'Core Every Day', meta: '15 min · Core · Mat', badge: '15:00', lvl: 'All levels', vimeoId: '912440320' },
  { id: '4', name: 'Upper Body · No Kit', meta: '25 min · Strength · No kit', badge: '25:00', lvl: 'Intermediate', vimeoId: '912440321' },
  { id: '5', name: 'Push Pull Legs · A', meta: '42 min · Hypertrophy · Dumbbells', badge: '42:00', lvl: 'Intermediate', vimeoId: '912440322' },
  { id: '6', name: 'Full Body Strength', meta: '38 min · Strength · Dumbbells', badge: '38:00', lvl: 'Intermediate', vimeoId: '912440323' },
  { id: '7', name: 'Band Shoulder Build', meta: '22 min · Hypertrophy · Bands', badge: '22:00', lvl: 'Beginner', vimeoId: '912440324' },
  { id: '8', name: 'Conditioning Ladder', meta: '30 min · Conditioning · No kit', badge: '30:00', lvl: 'Advanced', vimeoId: '912440325' },
  { id: '9', name: 'Legs & Glutes', meta: '45 min · Hypertrophy · Dumbbells', badge: '45:00', lvl: 'Intermediate', vimeoId: '912440326' },
  { id: '10', name: 'Sunday Recovery Flow', meta: '20 min · Recovery · Mat', badge: '20:00', lvl: 'All levels', vimeoId: '912440327' },
  { id: '11', name: 'Long Endurance Build', meta: '60 min · Conditioning · Mat', badge: '60:00', lvl: 'Advanced', vimeoId: '912440328' },
  { id: '12', name: 'Hip & Lower Back Care', meta: '14 min · Recovery · Mat', badge: '14:00', lvl: 'Beginner', vimeoId: '912440329' },
];

const PROGRAMS: ProgramCardItem[] = [
  { n: 'Strong at 45+', m: '8 weeks · 4 a week', t: 'STRENGTH', c: '2 140 training now', rank: 1 },
  { n: 'Home Body Reset', m: '6 weeks · 3 a week', t: 'NO KIT', c: '1 870 training now', rank: 2 },
  { n: 'Dumbbell Only', m: '10 weeks · 4 a week', t: 'HYPERTROPHY', c: '1 460 training now', rank: 3 },
  { n: 'Back & Knees Care', m: '4 weeks · 5 a week', t: 'RECOVERY', c: '1 205 training now', rank: 4 },
  { n: 'Lean & Conditioned', m: '8 weeks · 4 a week', t: 'CONDITIONING', c: '980 training now', rank: 5 },
];

const FORYOU: WorkoutRowItem[] = [
  { n: 'Upper Body · No Kit', m: '25 min · bodyweight', t: 'FITS YOUR KIT', v: '912440321' },
  { n: 'Ten-Minute Reset', m: '10 min · mobility', t: 'SHORT ON TIME', v: '912440318' },
  { n: 'Core Every Day', m: '15 min · mat', t: 'YOUR CHALLENGE', v: '912440320' },
  { n: 'Sunday Recovery Flow', m: '20 min · mat', t: 'AFTER LEG DAY', v: '912440327' },
];

const NEWIN: WorkoutRowItem[] = [
  { n: 'Kettlebell Foundations', m: '32 min · new', t: 'ADDED FRIDAY', v: '912440323' },
  { n: 'Desk Neck & Shoulders', m: '8 min · new', t: 'ADDED FRIDAY', v: '912440319' },
  { n: 'Band Shoulder Build', m: '22 min · new', t: 'ADDED LAST WEEK', v: '912440324' },
];

const PLAN_BUILT_KEY = '@victory_plan_built';
const PLAN_SUMMARY_KEY = '@victory_plan_summary';

export default function WorkoutScreen() {
  const router = useRouter();
  const checkingAccess = useModuleAccessGuard('/workout');
  const { isDark, colors } = useTheme();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('All');
  const [selectedDuration, setSelectedDuration] = useState('Any');
  const [selectedKit, setSelectedKit] = useState('Any');

  // Plan Build State
  const [planBuilt, setPlanBuilt] = useState(false);
  const [planSummaryLine, setPlanSummaryLine] = useState('Get stronger · Mon, Wed, Fri · 40 min · built around dumbbells.');

  // Modals State
  const [vimeoModalVisible, setVimeoModalVisible] = useState(false);
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

      const savedPlan = await AsyncStorage.getItem(PLAN_BUILT_KEY);
      const savedSummary = await AsyncStorage.getItem(PLAN_SUMMARY_KEY);
      if (savedPlan === 'true') setPlanBuilt(true);
      if (savedSummary) setPlanSummaryLine(savedSummary);
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
    return PROTOTYPE_LIB.filter((w) => {
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
  }, [searchQuery, selectedPurpose, selectedKit, selectedDuration]);

  const shownCount = Math.max(1, Math.round((170 * filteredWorkouts.length) / PROTOTYPE_LIB.length));
  const resultCountText = `${shownCount} of 170 workouts · shortest first`;

  // Actions
  const handleStartWorkout = (w: GridWorkoutItem) => {
    setSelectedWorkout(w);
    // If user has coach, start active tracking session. Otherwise, launch Vimeo video session.
    if (hasCoach) {
      setActiveSessionVisible(true);
    } else {
      setVimeoModalVisible(true);
    }
  };

  const handleResumeSession = () => {
    setSelectedWorkout(PROTOTYPE_LIB[5]); // Full Body Strength / Upper Body
    if (hasCoach) {
      setActiveSessionVisible(true);
    } else {
      setVimeoModalVisible(true);
    }
  };

  const handleFinishSession = (stats?: { minutes: number; setsLogged: number; volumeKg: number }) => {
    if (stats) setCompletedStats(stats);
    setVimeoModalVisible(false);
    setActiveSessionVisible(false);
    setCompleteModalVisible(true);

    // Record analytics event
    void recordAnalyticsEvent('workout_completed', {
      workout_id: selectedWorkout?.id || 'session_64',
      tier,
    });
  };

  const handlePlanBuilt = async (summary: { line: string }) => {
    setPlanBuilt(true);
    setPlanSummaryLine(summary.line);
    await AsyncStorage.setItem(PLAN_BUILT_KEY, 'true');
    await AsyncStorage.setItem(PLAN_SUMMARY_KEY, summary.line);
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
        {/* 1. Header: Train, 170 workouts */}
        <ClaudeTrainHeader
          totalWorkouts={170}
          onPressFilter={() => {}}
        />

        {/* 2. Custom Plan Banner */}
        <ClaudePlanBuildBanner
          planBuilt={planBuilt}
          planBuiltLine={planSummaryLine}
          hasCoach={hasCoach}
          onPress={() => setPlanBuildModalVisible(true)}
        />

        {/* 3. Pick Up Where You Left Off */}
        <ClaudeResumeSessionCard
          sessionTitle={selectedWorkout?.name || 'Upper Body Strength'}
          sessionLine="exercise 3 of 7 · Strong at 45+ · week 2"
          minutesLeft="18 min left"
          progressPct={43}
          onResume={handleResumeSession}
        />

        {/* 4. Most trained programmes */}
        <ClaudeWorkoutRowCarousel
          title="Most trained programmes"
          type="programs"
          programs={PROGRAMS}
          onSelectProgram={(p) => {
            setSelectedWorkout({
              name: p.n,
              meta: p.m,
              badge: p.t,
            });
            if (hasCoach) setActiveSessionVisible(true);
            else setVimeoModalVisible(true);
          }}
        />

        {/* 5. Because of how you train */}
        <ClaudeWorkoutRowCarousel
          title="Because of how you train"
          subtitle={hasCoach ? 'Dumbbells at home, 40 minutes, four evenings a week' : 'All workouts unlocked'}
          type="workouts"
          workouts={FORYOU}
          onSelectWorkout={(w) => {
            setSelectedWorkout({
              name: w.n,
              meta: w.m,
              badge: w.t,
              vimeoId: w.v,
            });
            setVimeoModalVisible(true);
          }}
        />

        {/* 6. New from Victor */}
        <ClaudeWorkoutRowCarousel
          title="New from Victor"
          type="workouts"
          workouts={NEWIN}
          onSelectWorkout={(w) => {
            setSelectedWorkout({
              name: w.n,
              meta: w.m,
              badge: w.t,
              vimeoId: w.v,
            });
            setVimeoModalVisible(true);
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
      {/* 1. Vimeo Player Modal */}
      <ClaudeVimeoPlayerModal
        visible={vimeoModalVisible}
        onClose={() => setVimeoModalVisible(false)}
        workoutTitle={selectedWorkout?.name || 'Upper Body Strength'}
        workoutMeta={selectedWorkout?.meta || 'FROM THE LIBRARY · 40 MIN'}
        vimeoId={selectedWorkout?.vimeoId || '912440318'}
        onFinishSession={() => handleFinishSession()}
      />

      {/* 2. Active Session Tracker Modal */}
      <ClaudeActiveSessionModal
        visible={activeSessionVisible}
        onClose={() => setActiveSessionVisible(false)}
        tier={tier}
        workoutTitle={selectedWorkout?.name || 'Upper Body Strength'}
        unlockNote={currentUser?.identity_statement || 'Your unlock is ready — your true-crime podcast is yours for this workout.'}
        onEndSession={(stats) => handleFinishSession(stats)}
      />

      {/* 3. Session Complete Modal with unlabelled sentence */}
      <ClaudeSessionCompleteModal
        visible={completeModalVisible}
        onClose={() => setCompleteModalVisible(false)}
        workoutTitle={selectedWorkout?.name || 'Upper Body Strength'}
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