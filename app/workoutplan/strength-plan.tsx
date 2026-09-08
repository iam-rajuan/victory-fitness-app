import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Share,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import {
  deleteLatestStrengthWorkoutPlan,
  deleteStrengthWorkoutPlan,
  fetchStrengthWorkoutPlans,
  loadLatestStrengthWorkoutPlan,
  StrengthPlanDayProgress,
  StrengthPlanSection,
  StrengthPlanResponse,
  updateStrengthWorkoutPlanProgress,
} from '../../lib/workout-plans';
import { apiRequest, createWorkoutLog, fetchCurrentUser } from '../../lib/api';
import { goBackOrReplace } from '../../lib/navigation';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';
import { useLanguage } from '../../lib/i18n';
import { formatAppError } from '../../lib/error';
import ActiveRestTimer from '../../components/workout/ActiveRestTimer';
import WorkoutCompletionModal from '../../components/workout/WorkoutCompletionModal';

function parseRestSeconds(restStr: string): number {
  const match = String(restStr || '').match(/(\d+)/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (/min/i.test(restStr)) return val * 60;
    return val;
  }
  return 60;
}

type CompletionCard = {
  imageBase64: string;
  fileUri: string;
  mimeType: 'image/png';
  fileName: string;
  shareMessage: string;
  isFullPlan: boolean;
};

async function fetchStrengthCompletionCard(planId: string, dayLabel = '', isFullPlan = false, durationSeconds = 0): Promise<CompletionCard> {
  const durationQuery = durationSeconds > 0 ? `&duration_seconds=${durationSeconds}` : '';
  const response = await apiRequest<{
    file_name: string;
    mime_type: string;
    image_base64: string;
    share_message: string;
  }>(`/ai/workout-plan/strength/${encodeURIComponent(planId)}/report?day=${encodeURIComponent(dayLabel)}&full_plan=${isFullPlan ? 'true' : 'false'}${durationQuery}`);
  const imageBase64 = response.image_base64;
  return {
    imageBase64,
    fileUri: `data:image/png;base64,${imageBase64}`,
    mimeType: 'image/png',
    fileName: 'victory-fitness-strength-completion.png',
    shareMessage: response.share_message,
    isFullPlan,
  };
}

export default function StrengthPlanDashboard() {
  const checkingAccess = useModuleAccessGuard('/workoutplan');
  const router = useRouter();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<StrengthPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [updatingProgressKey, setUpdatingProgressKey] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeSessionDay, setActiveSessionDay] = useState<string | null>(null);
  const [completedSessionSeconds, setCompletedSessionSeconds] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('Victory Member');
  const [workoutUnlockLabel, setWorkoutUnlockLabel] = useState<string | null>(null);
  const [completionCard, setCompletionCard] = useState<CompletionCard | null>(null);
  const [cardAction, setCardAction] = useState<'download' | 'share' | 'preview' | ''>('');
  const [planToDelete, setPlanToDelete] = useState<StrengthPlanResponse | null>(null);

  // Accordion and Day selection states
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Day 1');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Active Rest Timer & Completion State
  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null);
  const [activeRestExercise, setActiveRestExercise] = useState<string>('');
  const [completedWorkoutsCount, setCompletedWorkoutsCount] = useState(2);
  const [completedDayLabel, setCompletedDayLabel] = useState<string>('');
  const [activePlanIdForFeedback, setActivePlanIdForFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      try {
        const serverPlans = await fetchStrengthWorkoutPlans();
        if (!cancelled) {
          setPlans(serverPlans);
          if (serverPlans.length > 0) {
            const defaultPlan = serverPlans[0];
            const defaultPlanId = defaultPlan.plan_id ?? defaultPlan.summary;
            setExpandedPlanId(defaultPlanId);
            if (defaultPlan.days && defaultPlan.days.length > 0) {
              setSelectedDay(defaultPlan.days[0].day);
            }
          }
          setLoading(false);
        }
      } catch {
        const storedPlan = await loadLatestStrengthWorkoutPlan();
        if (!cancelled) {
          const plansList = storedPlan ? [storedPlan] : [];
          setPlans(plansList);
          if (plansList.length > 0) {
            const defaultPlan = plansList[0];
            const defaultPlanId = defaultPlan.plan_id ?? defaultPlan.summary;
            setExpandedPlanId(defaultPlanId);
            if (defaultPlan.days && defaultPlan.days.length > 0) {
              setSelectedDay(defaultPlan.days[0].day);
            }
          }
          setLoading(false);
        }
      }
    };

    void loadPlans();
    void fetchCurrentUser().then((user) => {
      setCurrentUserName(user.name || 'Victory Member');
      if (user.workout_unlock_label && user.workout_unlock_label.trim()) {
        setWorkoutUnlockLabel(user.workout_unlock_label.trim());
      } else {
        setWorkoutUnlockLabel(null);
      }
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const getDayProgress = (plan: StrengthPlanResponse, dayLabel: string): StrengthPlanDayProgress | undefined =>
    Array.isArray(plan.progress) ? plan.progress.find((entry) => entry.day === dayLabel) : undefined;

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  // Continuous timer ticking effect - runs exclusively when isTimerRunning is true
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Session day initialization effect: only runs when switching day or plan
  useEffect(() => {
    const currentPlan = plans.find((item) => (item.plan_id ?? item.summary) === expandedPlanId);
    if (!currentPlan) return;

    const dayProgress = getDayProgress(currentPlan, selectedDay);
    const workoutStarted = Boolean(dayProgress?.started);
    const workoutCompleted = Boolean(dayProgress?.completed);

    if (workoutStarted && !workoutCompleted) {
      if (activeSessionDay !== selectedDay) {
        setActiveSessionDay(selectedDay);
        if (dayProgress?.started_at && sessionSeconds === 0) {
          const startMs = new Date(dayProgress.started_at).getTime();
          const rawDiff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
          // If started recently (< 2.5 hours), adopt elapsed time; otherwise start fresh
          const initialSecs = rawDiff < 9000 ? rawDiff : 0;
          setSessionSeconds(initialSecs);
        }
        setIsTimerRunning(true);
      }
    } else if (workoutCompleted) {
      if (activeSessionDay === selectedDay && isTimerRunning) {
        setIsTimerRunning(false);
      }
    }
  }, [expandedPlanId, selectedDay, plans.length]);

  const handleTogglePauseTimer = () => {
    setIsTimerRunning((prev) => !prev);
  };

  const handleResetTimer = async () => {
    const currentPlan = plans.find((item) => (item.plan_id ?? item.summary) === expandedPlanId);
    if (!currentPlan?.plan_id) return;
    setSessionSeconds(0);
    try {
      const nextPlan = await updateStrengthWorkoutPlanProgress(currentPlan.plan_id, {
        day: selectedDay,
        started: true,
        reset_timer: true,
        started_at: new Date().toISOString(),
      });
      updatePlanProgressState(nextPlan);
    } catch {
      // silent fallback
    }
  };

  if (checkingAccess) {
    return null;
  }

  const updatePlanProgressState = (nextPlan: StrengthPlanResponse) => {
    setPlans((current) =>
      current.map((item) => ((item.plan_id ?? item.summary) === (nextPlan.plan_id ?? nextPlan.summary) ? nextPlan : item))
    );
  };

  const toggleSectionExpand = (sectionKey: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  const handleCompleteWorkout = async (plan: StrengthPlanResponse, dayLabel: string) => {
    if (!plan.plan_id) {
      return;
    }

    const dayProgress = getDayProgress(plan, dayLabel);
    const alreadyCompleted = Boolean(dayProgress?.completed);

    // Freeze timer and calculate final session duration
    setIsTimerRunning(false);
    const finalDuration = sessionSeconds > 0
      ? Math.max(sessionSeconds, 30)
      : (dayProgress?.duration_seconds || completedSessionSeconds || 30);
    setCompletedSessionSeconds(finalDuration);

    const progressKey = `complete-${plan.plan_id}-${dayLabel}`;
    try {
      setUpdatingProgressKey(progressKey);

      let updatedPlan = plan;
      if (!alreadyCompleted) {
        updatedPlan = await updateStrengthWorkoutPlanProgress(plan.plan_id, {
          day: dayLabel,
          completed: true,
          duration_seconds: finalDuration,
        });
        updatePlanProgressState(updatedPlan);

        // Log workout session to backend with ACTUAL recorded duration!
        const matchedDay = plan.days?.find((d) => d.day?.toLowerCase() === dayLabel.toLowerCase());
        const dayTitle = matchedDay?.title || matchedDay?.day || dayLabel;
        const planSummary = plan.summary || 'Strength Plan';
        const cleanPlanName = planSummary.includes(' using ')
          ? planSummary.split(' using ')[0].replace(/ plan/i, '').trim()
          : (planSummary.toLowerCase().includes(' plan')
              ? planSummary.split(/ plan/i)[0].trim()
              : planSummary.trim());
        const workoutTitle = dayTitle ? `${cleanPlanName} - ${dayTitle}` : cleanPlanName;

        void createWorkoutLog({
          workout_id: `${plan.plan_id}-${dayLabel.toLowerCase().replace(/\s+/g, '-')}`,
          title: workoutTitle,
          duration_seconds: finalDuration,
          status: 'completed',
        }).catch(() => undefined);
        setCompletedWorkoutsCount((prev) => prev + 1);
      }

      const isFullPlan = updatedPlan.days.length > 0 && updatedPlan.days.every((day) => getDayProgress(updatedPlan, day.day)?.completed);
      const card = await fetchStrengthCompletionCard(plan.plan_id, dayLabel, isFullPlan, finalDuration);
      setCompletionCard(card);
      setCompletedDayLabel(dayLabel);
      setActivePlanIdForFeedback(plan.plan_id);
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, t('Unable to complete workout right now.')).message);
    } finally {
      setUpdatingProgressKey(null);
    }
  };

  const handleShowFullPlanBadge = async (plan: StrengthPlanResponse) => {
    if (!plan.plan_id) return;
    setCardAction('preview');
    try {
      setCompletionCard(await fetchStrengthCompletionCard(plan.plan_id, '', true));
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, 'Unable to prepare your completion badge.').message);
    } finally {
      setCardAction('');
    }
  };

  const prepareCardFile = async (card: CompletionCard) => {
    if (Platform.OS === 'web') return card.fileUri;
    const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const fileUri = `${directory}${card.fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, card.imageBase64, { encoding: FileSystem.EncodingType.Base64 });
    return fileUri;
  };

  const handleDownloadCard = async () => {
    if (!completionCard) return;
    setCardAction('download');
    try {
      if (Platform.OS === 'web') {
        const anchor = document.createElement('a');
        anchor.href = completionCard.fileUri;
        anchor.download = completionCard.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        await Share.share({ url: await prepareCardFile(completionCard), message: completionCard.shareMessage });
      }
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, 'Unable to export your completion card.').message);
    } finally {
      setCardAction('');
    }
  };

  const handleShareCard = async () => {
    if (!completionCard) return;
    setCardAction('share');
    try {
      if (Platform.OS === 'web' && navigator.share) {
        const blob = await (await fetch(completionCard.fileUri)).blob();
        const file = new File([blob], completionCard.fileName, { type: completionCard.mimeType });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: 'Victory Fitness Strength Card', text: completionCard.shareMessage, files: [file] });
        } else {
          await navigator.share({ title: 'Victory Fitness Strength Card', text: completionCard.shareMessage });
        }
      } else if (Platform.OS === 'web') {
        await handleDownloadCard();
      } else {
        const fileUri = await prepareCardFile(completionCard);
        const shareUrl = Platform.OS === 'android' ? await FileSystem.getContentUriAsync(fileUri) : fileUri;
        await Share.share({ title: 'Victory Fitness Strength Card', url: shareUrl, message: completionCard.shareMessage });
      }
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, 'Unable to share your completion card.').message);
    } finally {
      setCardAction('');
    }
  };

  const handleStartWorkout = async (plan: StrengthPlanResponse, dayLabel: string) => {
    if (!plan.plan_id) {
      return;
    }

    setSessionSeconds(0);
    setActiveSessionDay(dayLabel);
    setIsTimerRunning(true);

    const progressKey = `start-${plan.plan_id}-${dayLabel}`;
    try {
      setUpdatingProgressKey(progressKey);
      const updatedPlan = await updateStrengthWorkoutPlanProgress(plan.plan_id, {
        day: dayLabel,
        started: true,
        started_at: new Date().toISOString(),
      });
      updatePlanProgressState(updatedPlan);
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, t('Unable to start workout right now.')).message);
    } finally {
      setUpdatingProgressKey(null);
    }
  };

  const handleRestartWorkout = async (plan: StrengthPlanResponse, dayLabel: string) => {
    if (!plan.plan_id) {
      return;
    }

    setSessionSeconds(0);
    setActiveSessionDay(dayLabel);
    setIsTimerRunning(true);
    setCompletedSessionSeconds(null);

    const progressKey = `restart-${plan.plan_id}-${dayLabel}`;
    try {
      setUpdatingProgressKey(progressKey);
      const updatedPlan = await updateStrengthWorkoutPlanProgress(plan.plan_id, {
        day: dayLabel,
        started: true,
        completed: false,
        reset_timer: true,
        started_at: new Date().toISOString(),
      });
      updatePlanProgressState(updatedPlan);
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, t('Unable to restart workout right now.')).message);
    } finally {
      setUpdatingProgressKey(null);
    }
  };

  const handleExerciseToggle = async (
    plan: StrengthPlanResponse,
    dayLabel: string,
    exerciseId: string,
    completed: boolean
  ) => {
    if (!plan.plan_id) {
      return;
    }

    // Ensure session timer is actively running if not already started
    if (!isTimerRunning) {
      setActiveSessionDay(dayLabel);
      setIsTimerRunning(true);
    }

    const progressKey = `exercise-${plan.plan_id}-${dayLabel}-${exerciseId}`;
    try {
      setUpdatingProgressKey(progressKey);
      const updatedPlan = await updateStrengthWorkoutPlanProgress(plan.plan_id, {
        day: dayLabel,
        exercise_id: exerciseId,
        completed,
      });
      updatePlanProgressState(updatedPlan);

      // Trigger Rest Timer automatically when a set is completed
      if (completed) {
        const planDay = plan.days?.find((d) => d.day === dayLabel);
        const allExercises = planDay?.sections?.flatMap((s) => s.exercises) || planDay?.exercises || [];
        const targetEx = allExercises.find((e) => e.id === exerciseId);
        if (targetEx) {
          setActiveRestSeconds(parseRestSeconds(targetEx.rest));
          setActiveRestExercise(targetEx.name);
        }
      }
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, t('Unable to update workout progress right now.')).message);
    } finally {
      setUpdatingProgressKey(null);
    }
  };

  const handleSectionToggle = async (
    plan: StrengthPlanResponse,
    dayLabel: string,
    sectionId: string,
    completed: boolean
  ) => {
    if (!plan.plan_id) {
      return;
    }

    // Ensure session timer is actively running if not already started
    if (!isTimerRunning) {
      setActiveSessionDay(dayLabel);
      setIsTimerRunning(true);
    }

    const progressKey = `section-${plan.plan_id}-${dayLabel}-${sectionId}`;
    try {
      setUpdatingProgressKey(progressKey);
      const updatedPlan = await updateStrengthWorkoutPlanProgress(plan.plan_id, {
        day: dayLabel,
        section_id: sectionId,
        completed,
      });
      updatePlanProgressState(updatedPlan);
    } catch (error) {
      Alert.alert(t('Error'), formatAppError(error, t('Unable to update workout section right now.')).message);
    } finally {
      setUpdatingProgressKey(null);
    }
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete || deletingPlanId) {
      return;
    }
    const targetPlan = planToDelete;
    const planId = targetPlan.plan_id ?? targetPlan.summary;
    try {
      setDeletingPlanId(planId);
      if (targetPlan.plan_id) {
        await deleteStrengthWorkoutPlan(targetPlan.plan_id);
      } else {
        await deleteLatestStrengthWorkoutPlan();
      }
      setPlans((current) => current.filter((item) => (item.plan_id ?? item.summary) !== planId));
      if (expandedPlanId === planId) {
        setExpandedPlanId(null);
      }
      setPlanToDelete(null);
    } catch (error) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(formatAppError(error, t('Unable to delete workout plan.')).message);
      } else {
        Alert.alert(t('Error'), formatAppError(error, t('Unable to delete workout plan.')).message);
      }
    } finally {
      setDeletingPlanId(null);
    }
  };

  const handleDeletePlan = (targetPlan: StrengthPlanResponse) => {
    if (deletingPlanId) {
      return;
    }
    setPlanToDelete(targetPlan);
  };

  const handleToggleExpand = (plan: StrengthPlanResponse) => {
    const planId = plan.plan_id ?? plan.summary;
    if (expandedPlanId === planId) {
      setExpandedPlanId(null);
    } else {
      setExpandedPlanId(planId);
      if (plan.days && plan.days.length > 0) {
        setSelectedDay(plan.days[0].day);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={Boolean(completionCard)} transparent animationType="fade" onRequestClose={() => setCompletionCard(null)}>
        <View style={styles.cardModalOverlay}>
          <View style={styles.cardModal}>
            <Text style={styles.cardModalTitle}>{completionCard?.isFullPlan ? 'Custom strength plan completed' : 'Strength workout completed'}</Text>
            {completionCard ? <Image source={{ uri: completionCard.fileUri }} style={styles.completionCardImage} resizeMode="contain" /> : null}
            <View style={styles.cardModalActions}>
              <TouchableOpacity style={styles.cardModalButton} onPress={() => void handleDownloadCard()} disabled={cardAction !== ''}>
                {cardAction === 'download' ? <ActivityIndicator color="#000" /> : <Ionicons name="download-outline" size={18} color="#000" />}
                <Text style={styles.cardModalButtonText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardModalButton} onPress={() => void handleShareCard()} disabled={cardAction !== ''}>
                {cardAction === 'share' ? <ActivityIndicator color="#000" /> : <Ionicons name="share-social-outline" size={18} color="#000" />}
                <Text style={styles.cardModalButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cardModalClose} onPress={() => setCompletionCard(null)}><Text style={styles.cardModalCloseText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('CUSTOM STRENGTH PLAN'),
          headerTransparent: true,
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: Fonts.heading, fontSize: 13, letterSpacing: 2, color: Colors.ivory } as any,
          headerLeft: () => (
            <TouchableOpacity onPress={() => goBackOrReplace(router, '/workoutplan')} style={{ marginLeft: 16 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingStateText}>{t('Loading your custom strength plans...')}</Text>
        </View>
      ) : plans.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{t('No custom strength plan yet')}</Text>
          <Text style={styles.emptyStateText}>{t('Create a plan first from the wizard to see it here.')}</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => router.replace('/workoutplan/strength-wizard')}>
            <Text style={styles.emptyStateButtonText}>{t('Create Plan')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>{t('YOUR CUSTOM PLANS')}</Text>
            <TouchableOpacity style={styles.generateBtn} activeOpacity={0.8} onPress={() => router.push('/workoutplan/strength-wizard')}>
              <Ionicons name="sparkles" size={13} color={Colors.obsidian} style={{ marginRight: 5 }} />
              <Text style={styles.generateBtnText}>{t('GENERATE NEW')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.planList}>
            {plans.map((plan, index) => {
              const planId = plan.plan_id ?? plan.summary;
              const isExpanded = expandedPlanId === planId;
              const dayLabels = plan.days?.map((d) => d.day) ?? [];
              const selectedPlanDay = plan.days?.find((d) => d.day === selectedDay) ?? plan.days?.[0] ?? null;
              const selectedDayProgress = selectedPlanDay ? getDayProgress(plan, selectedPlanDay.day) : undefined;
              const completedSectionIds = Array.isArray(selectedDayProgress?.completed_section_ids)
                ? selectedDayProgress.completed_section_ids
                : [];
              const completedExerciseIds = Array.isArray(selectedDayProgress?.completed_exercise_ids)
                ? selectedDayProgress.completed_exercise_ids
                : [];
              const daySections = Array.isArray(selectedPlanDay?.sections) ? selectedPlanDay.sections : [];
              const totalExercises = daySections.reduce((total, section) => total + section.exercises.length, 0);
              const completedExercises = daySections.reduce(
                (total, section) => total + section.exercises.filter((exercise) => completedExerciseIds.includes(exercise.id)).length,
                0
              );
              const completedSections = daySections.filter((section) => completedSectionIds.includes(section.id)).length;
              const totalSections = daySections.length;
              const workoutStarted = Boolean(selectedDayProgress?.started);
              const workoutCompleted = Boolean(selectedDayProgress?.completed);
              const progressSummaryLabel = totalSections > 0
                ? `${completedSections}/${totalSections} ${t('sections completed')} · ${completedExercises}/${totalExercises} ${t('exercises completed')}`
                : 0;
              const startButtonKey = selectedPlanDay ? `start-${plan.plan_id}-${selectedPlanDay.day}` : '';
              const completeButtonKey = selectedPlanDay ? `complete-${plan.plan_id}-${selectedPlanDay.day}` : '';
              const restartButtonKey = selectedPlanDay ? `restart-${plan.plan_id}-${selectedPlanDay.day}` : '';
              const startButtonBusy = updatingProgressKey === startButtonKey || updatingProgressKey === completeButtonKey;
              const restartBusy = updatingProgressKey === restartButtonKey;
              const isSessionBusy = startButtonBusy || restartBusy;
              const startButtonLabel = workoutCompleted
                ? t('VIEW COMPLETION CARD')
                : workoutStarted
                  ? t('CONTINUE WORKOUT')
                  : t('START WORKOUT');
              const progressSummaryText = typeof progressSummaryLabel === 'string'
                ? progressSummaryLabel
                : t('Start this workout to track progress for the day.');

              return (
                <View key={planId ?? `${plan.summary}-${index}`} style={[styles.planCard, isExpanded && styles.planCardExpanded]}>
                  {/* Plan Card Header */}
                  <View style={styles.planHeader}>
                    <TouchableOpacity
                      style={styles.planMain}
                      activeOpacity={0.7}
                      onPress={() => handleToggleExpand(plan)}
                    >
                      <Text style={styles.planSummary} numberOfLines={isExpanded ? 3 : 1}>{plan.summary}</Text>
                    </TouchableOpacity>
                    <View style={styles.planActions}>
                      <TouchableOpacity
                        style={[styles.deleteBtnIcon, deletingPlanId === (plan.plan_id ?? plan.summary) && styles.disabledBtn]}
                        disabled={Boolean(deletingPlanId)}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          handleDeletePlan(plan);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Delete plan"
                      >
                        <Ionicons name="trash-outline" size={18} color="#F87171" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleToggleExpand(plan)}
                        hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={Colors.copper}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {plan.days.length > 0 && plan.days.every((day) => getDayProgress(plan, day.day)?.completed) && (
                    <TouchableOpacity
                      style={styles.planBadgeButton}
                      onPress={() => void handleShowFullPlanBadge(plan)}
                      disabled={cardAction !== ''}
                    >
                      <Ionicons name="ribbon-outline" size={17} color={Colors.obsidian} />
                      <Text style={styles.planBadgeButtonText}>VIEW COMPLETION BADGE</Text>
                    </TouchableOpacity>
                  )}

                  {/* Expanded Portion showing details */}
                  {isExpanded && (
                    <View style={styles.planDetails}>
                      <View style={styles.divider} />

                      {workoutStarted && !workoutCompleted ? (
                        /* Active Session Player View */
                        <View style={styles.activeSessionContainer}>
                          {/* Active Session Header */}
                          <View style={styles.activeSessionHeader}>
                            <View style={styles.activeSessionLeft}>
                              <Text style={styles.activeSessionSubtitle}>{t('ACTIVE SESSION')}</Text>
                              <Text style={styles.activeSessionTitle}>{selectedPlanDay ? selectedPlanDay.title.toUpperCase() : ''}</Text>
                            </View>
                            <View style={styles.activeSessionRight}>
                              <View style={styles.activeTimerControls}>
                                <Text style={[styles.activeSessionElapsedLabel, !isTimerRunning && { color: Colors.accentGold }]}>
                                  {!isTimerRunning ? t('PAUSED') : t('ELAPSED')}
                                </Text>
                                <TouchableOpacity
                                  onPress={handleTogglePauseTimer}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  accessibilityLabel={!isTimerRunning ? "Resume timer" : "Pause timer"}
                                >
                                  <Ionicons
                                    name={!isTimerRunning ? 'play-circle' : 'pause-circle'}
                                    size={18}
                                    color={!isTimerRunning ? '#10B981' : Colors.accentGold}
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => void handleResetTimer()}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  accessibilityLabel="Reset timer"
                                >
                                  <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.4)" />
                                </TouchableOpacity>
                              </View>
                              <Text style={[styles.activeSessionElapsedTimer, !isTimerRunning && { color: Colors.accentGold }]}>
                                {formatTimer(sessionSeconds)}
                              </Text>
                            </View>
                          </View>

                          {/* Section 20.4: Persistent Workout Unlock Banner */}
                          {workoutUnlockLabel ? (
                            <View style={styles.workoutUnlockBanner}>
                              <View style={styles.workoutUnlockIconWrap}>
                                <Ionicons name="key" size={15} color="#06B6D4" />
                              </View>
                              <Text style={styles.workoutUnlockBannerText}>
                                {t('Your unlock is ready — ')}
                                <Text style={styles.workoutUnlockHighlight}>{workoutUnlockLabel}</Text>
                                {t(' is yours for this workout.')}
                              </Text>
                            </View>
                          ) : null}

                          {/* Progress Bar */}
                          <View style={styles.activeSessionProgressBarContainer}>
                            <View 
                              style={[
                                styles.activeSessionProgressBar, 
                                { width: `${totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0}%` }
                              ]} 
                            />
                          </View>

                          {/* Collapsible Sections */}
                          {selectedPlanDay && daySections.length > 0 ? (
                            <View style={styles.exerciseList}>
                              {daySections.map((section: StrengthPlanSection) => {
                                const sectionCompleted = completedSectionIds.includes(section.id);
                                const sectionProgressKey = `section-${plan.plan_id}-${selectedPlanDay.day}-${section.id}`;
                                const sectionBusy = updatingProgressKey === sectionProgressKey;
                                const sectionExpandKey = `${planId}-${selectedPlanDay.day}-${section.id}`;
                                const sectionExpanded = expandedSections[sectionExpandKey] ?? true;
                                const sectionCompletedCount = section.exercises.filter((exercise) => completedExerciseIds.includes(exercise.id)).length;
                                return (
                                  <View key={section.id} style={[styles.activeSectionCard, sectionCompleted && styles.activeSectionCardCompleted]}>
                                    <TouchableOpacity
                                      style={styles.sectionRow}
                                      activeOpacity={0.8}
                                      onPress={() => toggleSectionExpand(sectionExpandKey)}
                                    >
                                      <View style={styles.sectionTitleWrap}>
                                        <Text style={styles.activeSectionType}>{t('SECTION')}</Text>
                                        <Text style={styles.activeSectionName}>{section.title}</Text>
                                        <Text style={styles.activeSectionMetaText}>
                                          {`${sectionCompletedCount}/${section.exercises.length} ${t('exercises')} · ${section.estimated_minutes} ${t('min')}`}
                                        </Text>
                                      </View>
                                      <View style={styles.sectionActions}>
                                        <TouchableOpacity
                                          style={[styles.activeCheckButton, sectionCompleted && styles.activeCheckButtonCompleted]}
                                          activeOpacity={0.8}
                                          disabled={sectionBusy}
                                          onPress={() => handleSectionToggle(plan, selectedPlanDay.day, section.id, !sectionCompleted)}
                                        >
                                          {sectionBusy ? (
                                            <ActivityIndicator size="small" color={Colors.obsidian} />
                                          ) : (
                                            <Ionicons
                                              name={sectionCompleted ? 'checkmark' : 'checkmark-outline'}
                                              size={18}
                                              color={sectionCompleted ? '#fff' : Colors.gold}
                                            />
                                          )}
                                        </TouchableOpacity>
                                        <Ionicons
                                          name={sectionExpanded ? 'chevron-up' : 'chevron-down'}
                                          size={18}
                                          color="rgba(255,255,255,0.45)"
                                        />
                                      </View>
                                    </TouchableOpacity>

                                    {sectionExpanded ? (
                                      <View style={styles.sectionExercises}>
                                        {section.exercises.map((ex) => {
                                          const exerciseCompleted = completedExerciseIds.includes(ex.id);
                                          const exerciseProgressKey = `exercise-${plan.plan_id}-${selectedPlanDay.day}-${ex.id}`;
                                          const exerciseBusy = updatingProgressKey === exerciseProgressKey;
                                          return (
                                            <View key={ex.id} style={[styles.activeExerciseSubCard, exerciseCompleted && styles.activeExerciseSubCardCompleted]}>
                                              <View style={styles.exerciseHeader}>
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                  <Text style={styles.activeExerciseTag}>{ex.type.toUpperCase()}</Text>
                                                  <Text style={styles.activeExerciseName}>{ex.name}</Text>
                                                </View>
                                                <TouchableOpacity
                                                  style={[styles.activeCheckButton, exerciseCompleted && styles.activeCheckButtonCompleted]}
                                                  activeOpacity={0.8}
                                                  disabled={exerciseBusy}
                                                  onPress={() => handleExerciseToggle(plan, selectedPlanDay.day, ex.id, !exerciseCompleted)}
                                                >
                                                  {exerciseBusy ? (
                                                    <ActivityIndicator size="small" color={Colors.obsidian} />
                                                  ) : (
                                                    <Ionicons
                                                      name={exerciseCompleted ? 'checkmark' : 'checkmark-outline'}
                                                      size={18}
                                                      color={exerciseCompleted ? '#fff' : Colors.gold}
                                                    />
                                                  )}
                                                </TouchableOpacity>
                                              </View>

                                              <View style={styles.exerciseMetrics}>
                                                <View style={styles.metricItem}>
                                                  <Ionicons name="layers-outline" size={13} color={Colors.gold} />
                                                  <Text style={styles.metricValue}>{ex.sets} {t('Sets')}</Text>
                                                </View>
                                                <View style={styles.metricItem}>
                                                  <Ionicons name="repeat-outline" size={13} color={Colors.gold} />
                                                  <Text style={styles.metricValue}>{ex.reps} {t('Reps')}</Text>
                                                </View>
                                                <View style={styles.metricItem}>
                                                  <Ionicons name="fitness-outline" size={13} color={Colors.gold} />
                                                  <Text style={styles.metricValue}>{ex.weight}</Text>
                                                </View>
                                                <TouchableOpacity
                                                  style={styles.metricItem}
                                                  activeOpacity={0.7}
                                                  onPress={() => {
                                                    setActiveRestSeconds(parseRestSeconds(ex.rest));
                                                    setActiveRestExercise(ex.name);
                                                  }}
                                                >
                                                  <Ionicons name="timer-outline" size={13} color={Colors.gold} />
                                                  <Text style={[styles.metricValue, { color: Colors.gold }]}>{ex.rest} {t('Rest')}</Text>
                                                </TouchableOpacity>
                                              </View>
                                            </View>
                                          );
                                        })}
                                      </View>
                                    ) : null}
                                  </View>
                                );
                              })}
                            </View>
                          ) : null}

                          {/* Complete Session Button */}
                          <TouchableOpacity
                            style={[styles.completeSessionBtn, isSessionBusy && styles.disabledBtn]}
                            activeOpacity={0.8}
                            disabled={isSessionBusy}
                            onPress={() => handleCompleteWorkout(plan, selectedPlanDay.day)}
                          >
                            {startButtonBusy ? (
                              <ActivityIndicator size="small" color={Colors.obsidian} />
                            ) : (
                              <>
                               <Ionicons name="checkmark-circle" size={20} color="#000" />
                                <Text style={styles.completeSessionBtnText}>{t('WORKOUT COMPLETED')}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : (
                        /* Preview View (Not started or already completed) */
                        <>
                          {/* Day Selector */}
                          {dayLabels.length > 0 && (
                            <View style={styles.daySelectorContainer}>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorScroll}>
                                <View style={styles.daySelector}>
                                  {dayLabels.map((day) => {
                                    const isActive = selectedDay === day;
                                    return (
                                      <TouchableOpacity
                                        key={day}
                                        onPress={() => setSelectedDay(day)}
                                        style={[styles.dayBtn, isActive && styles.dayBtnActive]}
                                      >
                                        <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day}</Text>
                                        {isActive && <View style={styles.activeDot} />}
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </ScrollView>
                            </View>
                          )}

                          {/* Daily Stats */}
                          {selectedPlanDay && (
                            <View style={styles.statsRow}>
                              <View style={styles.statBox}>
                                <Text style={styles.statLabel}>{workoutCompleted ? t('WORKOUT TIME') : t('EST. TIME')}</Text>
                                <Text style={[styles.statValue, workoutCompleted && { color: '#10B981' }]}>
                                  {workoutCompleted && selectedDayProgress?.duration_seconds
                                    ? `${Math.floor(selectedDayProgress.duration_seconds / 60)}m ${selectedDayProgress.duration_seconds % 60}s`
                                    : (selectedPlanDay.est_time ?? '-')}
                                </Text>
                              </View>
                              <View style={styles.statDivider} />
                              <View style={styles.statBox}>
                                <Text style={styles.statLabel}>{t('VOLUME')}</Text>
                                <Text style={styles.statValue}>{selectedPlanDay.volume ?? '-'}</Text>
                              </View>
                              <View style={styles.statDivider} />
                              <View style={styles.statBox}>
                                <Text style={styles.statLabel}>{t('INTENSITY')}</Text>
                                <Text style={styles.statValue}>{selectedPlanDay.intensity ?? '-'}</Text>
                              </View>
                            </View>
                          )}

                          {selectedPlanDay ? (
                            <View style={styles.progressSummaryCard}>
                              <View style={styles.progressSummaryHeader}>
                                <Text style={styles.progressSummaryTitle}>{t('DAY PROGRESS')}</Text>
                                <Text style={[styles.progressSummaryBadge, workoutCompleted && styles.progressSummaryBadgeCompleted]}>
                                  {workoutCompleted ? t('COMPLETED') : workoutStarted ? t('IN PROGRESS') : t('NOT STARTED')}
                                </Text>
                              </View>
                              <Text style={styles.progressSummaryText}>{progressSummaryText}</Text>
                            </View>
                          ) : null}

                          {/* Section List */}
                          {selectedPlanDay && daySections.length > 0 ? (
                            <View style={styles.exerciseList}>
                              <Text style={styles.sectionHeader}>{t("TODAY'S SECTIONS")}</Text>
                              {daySections.map((section: StrengthPlanSection) => {
                                const sectionCompleted = completedSectionIds.includes(section.id);
                                const sectionProgressKey = `section-${plan.plan_id}-${selectedPlanDay.day}-${section.id}`;
                                const sectionBusy = updatingProgressKey === sectionProgressKey;
                                const sectionExpandKey = `${planId}-${selectedPlanDay.day}-${section.id}`;
                                const sectionExpanded = expandedSections[sectionExpandKey] ?? true;
                                const sectionCompletedCount = section.exercises.filter((exercise) => completedExerciseIds.includes(exercise.id)).length;
                                return (
                                  <View key={section.id} style={[styles.exerciseCard, sectionCompleted && styles.exerciseCardCompleted]}>
                                    <TouchableOpacity
                                      style={styles.sectionRow}
                                      activeOpacity={0.8}
                                      onPress={() => toggleSectionExpand(sectionExpandKey)}
                                    >
                                      <View style={styles.sectionTitleWrap}>
                                        <Text style={styles.exerciseType}>{t('SECTION')}</Text>
                                        <Text style={styles.exerciseName}>{section.title}</Text>
                                        <Text style={styles.sectionMetaText}>
                                          {`${sectionCompletedCount}/${section.exercises.length} ${t('exercises')} · ${section.estimated_minutes} ${t('min')}`}
                                        </Text>
                                      </View>
                                      <View style={styles.sectionActions}>
                                        <TouchableOpacity
                                          style={[styles.exerciseCheckButton, sectionCompleted && styles.exerciseCheckButtonCompleted]}
                                          activeOpacity={0.8}
                                          disabled={sectionBusy}
                                          onPress={() => handleSectionToggle(plan, selectedPlanDay.day, section.id, !sectionCompleted)}
                                        >
                                          {sectionBusy ? (
                                            <ActivityIndicator size="small" color={sectionCompleted ? '#fff' : Colors.gold} />
                                          ) : (
                                            <Ionicons
                                              name={sectionCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                              size={22}
                                              color={sectionCompleted ? '#fff' : Colors.gold}
                                            />
                                          )}
                                        </TouchableOpacity>
                                        <Ionicons
                                          name={sectionExpanded ? 'chevron-up' : 'chevron-down'}
                                          size={18}
                                          color="rgba(255,255,255,0.45)"
                                        />
                                      </View>
                                    </TouchableOpacity>

                                    {sectionExpanded ? (
                                      <View style={styles.sectionExercises}>
                                        {section.exercises.map((ex) => {
                                          const exerciseCompleted = completedExerciseIds.includes(ex.id);
                                          const exerciseProgressKey = `exercise-${plan.plan_id}-${selectedPlanDay.day}-${ex.id}`;
                                          const exerciseBusy = updatingProgressKey === exerciseProgressKey;
                                          return (
                                            <View key={ex.id} style={[styles.exerciseSubCard, exerciseCompleted && styles.exerciseSubCardCompleted]}>
                                              <View style={styles.exerciseHeader}>
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                  <Text style={styles.exerciseType}>{ex.type.toUpperCase()}</Text>
                                                  <Text style={styles.exerciseName}>{ex.name}</Text>
                                                </View>
                                                <TouchableOpacity
                                                  style={[styles.exerciseCheckButton, exerciseCompleted && styles.exerciseCheckButtonCompleted]}
                                                  activeOpacity={0.8}
                                                  disabled={exerciseBusy}
                                                  onPress={() => handleExerciseToggle(plan, selectedPlanDay.day, ex.id, !exerciseCompleted)}
                                                >
                                                  {exerciseBusy ? (
                                                    <ActivityIndicator size="small" color={exerciseCompleted ? '#fff' : Colors.gold} />
                                                  ) : (
                                                    <Ionicons
                                                      name={exerciseCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                                      size={22}
                                                      color={exerciseCompleted ? '#fff' : Colors.gold}
                                                    />
                                                  )}
                                                </TouchableOpacity>
                                              </View>

                                              <View style={styles.exerciseMetrics}>
                                                <View style={styles.metricItem}>
                                                  <Ionicons name="layers-outline" size={13} color={Colors.gold} />
                                                  <Text style={styles.metricValue}>{ex.sets} {t('Sets')}</Text>
                                                </View>
                                                <View style={styles.metricItem}>
                                                  <Ionicons name="repeat-outline" size={13} color={Colors.gold} />
                                                  <Text style={styles.metricValue}>{ex.reps} {t('Reps')}</Text>
                                                </View>
                                                <View style={styles.metricItem}>
                                                  <Ionicons name="fitness-outline" size={13} color={Colors.gold} />
                                                  <Text style={styles.metricValue}>{ex.weight}</Text>
                                                </View>
                                                <TouchableOpacity
                                                  style={styles.metricItem}
                                                  activeOpacity={0.7}
                                                  onPress={() => {
                                                    setActiveRestSeconds(parseRestSeconds(ex.rest));
                                                    setActiveRestExercise(ex.name);
                                                  }}
                                                >
                                                  <Ionicons name="timer-outline" size={13} color={Colors.gold} />
                                                  <Text style={[styles.metricValue, { color: Colors.gold }]}>{ex.rest} {t('Rest')}</Text>
                                                </TouchableOpacity>
                                              </View>
                                            </View>
                                          );
                                        })}
                                      </View>
                                    ) : null}
                                  </View>
                                );
                              })}
                            </View>
                          ) : null}

                          {/* Start Workout / View Completion Card Button */}
                          <TouchableOpacity
                            style={[styles.startWorkoutBtn, workoutCompleted && styles.startWorkoutBtnCompleted]}
                            activeOpacity={0.8}
                            disabled={!selectedPlanDay || isSessionBusy}
                            onPress={() => {
                              if (!selectedPlanDay) {
                                return;
                              }
                              if (workoutCompleted) {
                                void handleCompleteWorkout(plan, selectedPlanDay.day);
                              } else {
                                void handleStartWorkout(plan, selectedPlanDay.day);
                              }
                            }}
                          >
                            {startButtonBusy ? (
                              <ActivityIndicator size="small" color={Colors.obsidian} />
                            ) : (
                              <Ionicons name={workoutCompleted ? 'trophy-outline' : 'play'} size={18} color={workoutCompleted ? '#fff' : Colors.obsidian} />
                            )}
                            <Text style={styles.startWorkoutBtnText} numberOfLines={1} ellipsizeMode="tail">
                              {startButtonLabel}
                            </Text>
                          </TouchableOpacity>

                          {/* Redo / Restart Workout link for completed workouts */}
                          {workoutCompleted && selectedPlanDay && (
                            <TouchableOpacity
                              style={[styles.redoWorkoutBtn, isSessionBusy && styles.disabledBtn]}
                              activeOpacity={0.7}
                              disabled={isSessionBusy}
                              onPress={() => void handleRestartWorkout(plan, selectedPlanDay.day)}
                            >
                              {restartBusy ? (
                                <ActivityIndicator size="small" color="#E0E7FF" />
                              ) : (
                                <Ionicons name="refresh" size={15} color="#E0E7FF" />
                              )}
                              <Text style={styles.redoWorkoutBtnText}>{t('Restart / Redo Workout')}</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Active Rest Timer Floating Overlay */}
      {activeRestSeconds !== null && (
        <ActiveRestTimer
          initialSeconds={activeRestSeconds}
          exerciseName={activeRestExercise}
          onClose={() => setActiveRestSeconds(null)}
          onFinished={() => {
            // chime & vibration handled internally
          }}
        />
      )}

      {/* Workout Completion, Confetti & Feedback Modal */}
      <WorkoutCompletionModal
        visible={Boolean(completionCard)}
        planId={activePlanIdForFeedback}
        dayLabel={completedDayLabel || selectedDay}
        completionCard={completionCard}
        totalCompletedWorkouts={completedWorkoutsCount}
        durationSeconds={completedSessionSeconds ?? sessionSeconds}
        onClose={() => setCompletionCard(null)}
        onDownload={handleDownloadCard}
        onShareCard={handleShareCard}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={Boolean(planToDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setPlanToDelete(null)}
      >
        <View style={styles.confirmModalBackdrop}>
          <View style={styles.confirmModalBox}>
            <View style={styles.confirmModalIconWrap}>
              <Ionicons name="trash-outline" size={26} color="#EF4444" />
            </View>
            <Text style={styles.confirmModalTitle}>{t('Delete Strength Plan?')}</Text>
            <Text style={styles.confirmModalText}>
              {t('Are you sure you want to delete this custom workout plan? This action cannot be undone.')}
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelBtn}
                onPress={() => setPlanToDelete(null)}
                disabled={Boolean(deletingPlanId)}
              >
                <Text style={styles.confirmModalCancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalDeleteBtn, Boolean(deletingPlanId) && styles.disabledBtn]}
                onPress={() => void confirmDeletePlan()}
                disabled={Boolean(deletingPlanId)}
              >
                {deletingPlanId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmModalDeleteText}>{t('Delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  cardModal: { width: '100%', maxWidth: 430, maxHeight: '92%', backgroundColor: '#0B1520', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,217,245,0.35)' },
  cardModalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  completionCardImage: { width: '100%', height: 560, backgroundColor: '#03192A', borderRadius: 16 },
  cardModalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 14 },
  cardModalButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: Colors.accentBlue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cardModalButtonText: { color: '#000', fontFamily: 'Inter_700Bold' },
  cardModalClose: { padding: 12 },
  cardModalCloseText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_600SemiBold' },
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  loadingStateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: Colors.accentBlue,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  emptyStateButtonText: {
    color: '#000',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 12,
    paddingBottom: 130,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: Colors.copper,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
  },
  generateBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  generateBtnText: {
    color: Colors.obsidian,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },
  planList: {
    gap: 14,
  },
  planCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    marginBottom: 4,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  planCardExpanded: {
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  planHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planBadgeButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  planBadgeButtonText: {
    color: Colors.obsidian,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },
  planMain: {
    flex: 1,
    gap: 4,
  },
  planSummary: {
    color: Colors.ivory,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.heading,
  },
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtnIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  planDetails: {
    paddingHorizontal: 8,
    paddingBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(181, 101, 29, 0.2)',
    marginBottom: 14,
    marginHorizontal: 4,
  },
  daySelectorContainer: {
    marginBottom: 16,
  },
  daySelectorScroll: {
    paddingBottom: 2,
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 43, 69, 0.5)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
    gap: 4,
  },
  dayBtn: {
    paddingHorizontal: 16,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    minWidth: 54,
  },
  dayBtnActive: {
    backgroundColor: Colors.gold,
  },
  dayText: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  dayTextActive: {
    color: Colors.obsidian,
    fontFamily: Fonts.heading,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.obsidian,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 43, 69, 0.45)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: Colors.copper,
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.dataBold,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(181, 101, 29, 0.2)',
  },
  progressSummaryCard: {
    backgroundColor: 'rgba(13, 43, 69, 0.35)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
  },
  progressSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressSummaryTitle: {
    color: Colors.copper,
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
  },
  progressSummaryBadge: {
    color: Colors.gold,
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },
  progressSummaryBadgeCompleted: {
    color: Colors.victoryGreen,
  },
  progressSummaryText: {
    color: Colors.ivory,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.data,
  },
  sectionHeader: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  exerciseList: {
    gap: 10,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: 'rgba(13, 43, 69, 0.35)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
  },
  exerciseCardCompleted: {
    borderColor: 'rgba(26, 122, 74, 0.4)',
    backgroundColor: 'rgba(26, 122, 74, 0.05)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionMetaText: {
    color: 'rgba(247, 243, 238, 0.65)',
    fontSize: 12,
    fontFamily: Fonts.data,
    marginTop: 4,
  },
  exerciseType: {
    color: Colors.copper,
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    marginBottom: 2,
  },
  exerciseName: {
    color: Colors.ivory,
    fontSize: 16,
    fontFamily: Fonts.display,
  },
  exerciseCheckButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.25)',
  },
  exerciseCheckButtonCompleted: {
    backgroundColor: Colors.victoryGreen,
    borderColor: Colors.victoryGreen,
  },
  sectionExercises: {
    gap: 8,
    marginTop: 10,
  },
  exerciseSubCard: {
    backgroundColor: 'rgba(13, 13, 13, 0.65)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.18)',
  },
  exerciseSubCardCompleted: {
    borderColor: 'rgba(26, 122, 74, 0.35)',
    backgroundColor: 'rgba(26, 122, 74, 0.08)',
  },
  exerciseMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.2)',
  },
  metricItemRest: {
    backgroundColor: 'rgba(201, 148, 58, 0.14)',
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  metricValue: {
    color: Colors.ivory,
    fontSize: 12,
    fontFamily: Fonts.data,
  },
  startWorkoutBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  startWorkoutBtnCompleted: {
    backgroundColor: Colors.victoryGreen,
  },
  startWorkoutBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
    textAlign: 'center',
    flexShrink: 1,
  },
  startWorkoutBtnTextCompleted: {
    color: '#FFFFFF',
  },
  redoWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 43, 69, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
  },
  redoWorkoutBtnText: {
    color: Colors.ivory,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 0.3,
  },

  /* Active Session Styles */
  activeSessionContainer: {
    paddingBottom: 16,
  },
  activeSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activeSessionLeft: {
    flex: 1,
    paddingRight: 16,
  },
  activeSessionSubtitle: {
    color: Colors.copper,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  activeSessionTitle: {
    color: Colors.ivory,
    fontSize: 22,
    fontFamily: Fonts.display,
    lineHeight: 28,
  },
  activeSessionRight: {
    alignItems: 'flex-end',
  },
  activeTimerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activeSessionElapsedLabel: {
    color: 'rgba(247, 243, 238, 0.5)',
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
  },
  activeSessionElapsedTimer: {
    color: Colors.gold,
    fontSize: 18,
    fontFamily: Fonts.dataBold,
  },
  activeSessionProgressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  activeSessionProgressBar: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },
  activeSectionCard: {
    backgroundColor: 'rgba(13, 43, 69, 0.35)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
    marginBottom: 10,
  },
  activeSectionCardCompleted: {
    borderColor: 'rgba(26, 122, 74, 0.4)',
    backgroundColor: 'rgba(26, 122, 74, 0.05)',
  },
  activeSectionType: {
    color: Colors.copper,
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  activeSectionName: {
    color: Colors.ivory,
    fontSize: 17,
    fontFamily: Fonts.display,
  },
  activeSectionMetaText: {
    color: 'rgba(247, 243, 238, 0.65)',
    fontSize: 12,
    fontFamily: Fonts.data,
    marginTop: 4,
  },
  activeCheckButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.25)',
  },
  activeCheckButtonCompleted: {
    backgroundColor: Colors.victoryGreen,
    borderColor: Colors.victoryGreen,
  },
  activeExerciseSubCard: {
    backgroundColor: 'rgba(13, 13, 13, 0.65)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.18)',
  },
  activeExerciseSubCardCompleted: {
    borderColor: 'rgba(26, 122, 74, 0.35)',
    backgroundColor: 'rgba(26, 122, 74, 0.08)',
  },
  activeExerciseTag: {
    color: Colors.gold,
    fontSize: 9,
    fontFamily: Fonts.dataBold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  activeExerciseName: {
    color: Colors.ivory,
    fontSize: 15,
    fontFamily: Fonts.heading,
  },
  completeSessionBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  completeSessionBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  confirmModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmModalIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    color: Colors.ivory,
    fontFamily: Fonts.display,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.7)',
    fontFamily: Fonts.body,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalCancelText: {
    fontSize: 14,
    color: Colors.ivory,
    fontFamily: Fonts.heading,
  },
  confirmModalDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalDeleteText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: Fonts.heading,
  },
  workoutUnlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(13, 43, 69, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  workoutUnlockIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutUnlockBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.ivory,
    fontFamily: Fonts.body,
    lineHeight: 18,
  },
  workoutUnlockHighlight: {
    color: Colors.gold,
    fontFamily: Fonts.heading,
  },
});
