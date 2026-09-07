import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { fetchCurrentUser, recordAnalyticsEvent, fetchWorkoutLogs, seedTestWorkoutLogs, WorkoutLogItem } from '../../lib/api';
import { canAccessFeature } from '../../lib/access';
import VictoryHeader from '../../components/VictoryHeader';
import { fetchWorkoutLibrary, getCachedWorkoutLibrary, WorkoutLibraryCategory, WorkoutLibraryItem } from '../../lib/workouts';
import { formatAppError } from '../../lib/error';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  clearLatestVideoWorkoutPlan,
  createStrengthWorkoutPlan,
  deleteLatestStrengthWorkoutPlan,
  fetchLatestStrengthWorkoutPlan,
  loadLatestVideoWorkoutPlan,
  StrengthPlanResponse,
  VideoPlanResponse,
} from '../../lib/workout-plans';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';
import { useLanguage } from '../../lib/i18n';
import { pushRoute } from '../../lib/navigation';

const { width } = Dimensions.get('window');
const FALLBACK_WORKOUT_IMAGE = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80';

function safeImageUri(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  return normalized || FALLBACK_WORKOUT_IMAGE;
}

function getCategoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  const lower = name.toLowerCase();
  if (lower.includes('strength') || lower.includes('lift') || lower.includes('power')) {
    return 'barbell-outline';
  }
  if (lower.includes('yoga') || lower.includes('stretch') || lower.includes('mobility') || lower.includes('flexibility') || lower.includes('flow')) {
    return 'body-outline';
  }
  if (lower.includes('cardio') || lower.includes('hiit') || lower.includes('run') || lower.includes('plyo')) {
    return 'walk-outline';
  }
  return 'fitness-outline';
}

function getWorkoutDetails(workout: WorkoutLibraryItem) {
  const idLower = String(workout.id || '').toLowerCase() || 'default';
  const titleLower = String(workout.title || '').toLowerCase() || 'default';

  let duration = 30; // default 30 min
  let level = 'INTERMEDIATE'; // default

  const charCodeAtLast = idLower.charCodeAt(idLower.length - 1) || 0;
  const charCodeAtFirst = idLower.charCodeAt(0) || 0;

  // Determine duration deterministically
  if (titleLower.includes('flow') || titleLower.includes('yoga') || titleLower.includes('stretch')) {
    duration = 20 + (charCodeAtLast % 3) * 5; // 20, 25, 30 min
  } else if (titleLower.includes('power') || titleLower.includes('lift') || titleLower.includes('strength') || titleLower.includes('hypertrophy')) {
    duration = 40 + (charCodeAtLast % 3) * 5; // 40, 45, 50 min
  } else if (titleLower.includes('hiit') || titleLower.includes('plyo') || titleLower.includes('cardio') || titleLower.includes('explosive')) {
    duration = 30 + (charCodeAtLast % 3) * 5; // 30, 35, 40 min
  } else {
    duration = 15 + (charCodeAtLast % 8) * 5; // 15 to 50 min
  }

  // Determine difficulty level deterministically
  if (titleLower.includes('beginner') || titleLower.includes('easy') || titleLower.includes('intro') || titleLower.includes('foundation')) {
    level = 'BEGINNER';
  } else if (titleLower.includes('advanced') || titleLower.includes('power') || titleLower.includes('heavy') || titleLower.includes('beast') || titleLower.includes('elite')) {
    level = 'ADVANCED';
  } else if (charCodeAtFirst % 3 === 0) {
    level = 'BEGINNER';
  } else if (charCodeAtFirst % 3 === 1) {
    level = 'INTERMEDIATE';
  } else {
    level = 'ADVANCED';
  }

  return { duration, level };
}

function getPlanDisplayData(summary: string, defaultTitle: string) {
  if (!summary) return { title: defaultTitle, description: '' };
  
  const cleanSummary = summary.replace(/\s+/g, ' ').trim();
  
  const match = cleanSummary.match(/^(.*?)\s+plan\s+using\s+a\s+(.*)$/i) || 
                cleanSummary.match(/^(.*?)\s+plan\s+with\s+(.*)$/i) ||
                cleanSummary.match(/^(.*?)\s+built\s+for\s+(.*)$/i);
                
  if (match) {
    const rawTitle = match[1];
    let rawDesc = match[2];
    
    const title = rawTitle
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') + ' Plan';
      
    const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
    
    return { title, description };
  }
  
  const words = cleanSummary.split(' ');
  if (words.length > 3) {
    const title = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') + ' Plan';
    const description = words.slice(3).join(' ');
    return { title, description };
  }
  
  return { title: cleanSummary, description: '' };
}

export default function WorkoutScreen() {
  const checkingAccess = useModuleAccessGuard('/workout');
  const router = useRouter();
  const { t } = useLanguage();
  const hasLoadedLibraryRef = React.useRef(false);
  const initialLibrary = React.useMemo(
    () =>
      getCachedWorkoutLibrary() ?? {
        featuredWorkout: null,
        workouts: [],
        categories: [],
      },
    []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 350);
  const [library, setLibrary] = useState<{
    featuredWorkout: WorkoutLibraryItem | null;
    workouts: WorkoutLibraryItem[];
    categories: WorkoutLibraryCategory[];
  }>(initialLibrary);
  const [loading, setLoading] = useState(!initialLibrary.featuredWorkout && initialLibrary.workouts.length === 0 && initialLibrary.categories.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [strengthPlan, setStrengthPlan] = useState<StrengthPlanResponse | null>(null);
  const [videoPlan, setVideoPlan] = useState<VideoPlanResponse | null>(null);
  const [canAccessWorkoutPlans, setCanAccessWorkoutPlans] = useState(true);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Workout History (Paginated at 20 items per page)
  const [historyLogs, setHistoryLogs] = useState<WorkoutLogItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [seedingLogs, setSeedingLogs] = useState(false);
  const [generatingProfilePlan, setGeneratingProfilePlan] = useState(false);

  const loadHistory = React.useCallback(async (pageToLoad = 1) => {
    setHistoryLoading(true);
    try {
      const res = await fetchWorkoutLogs(pageToLoad, 20);
      setHistoryLogs(res.items || []);
      setHistoryTotal(res.total || 0);
      setHistoryTotalPages(res.total_pages || 1);
      setHistoryPage(res.page || 1);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSeed50Logs = async () => {
    setSeedingLogs(true);
    try {
      await seedTestWorkoutLogs(55);
      await loadHistory(1);
      Alert.alert(t('Success'), t('55 realistic workout logs seeded! Test pagination (20 items/page) below.'));
    } catch (seedErr) {
      Alert.alert(t('Error'), formatAppError(seedErr).message);
    } finally {
      setSeedingLogs(false);
    }
  };

  const handle1TapGenerateFromProfile = async () => {
    setGeneratingProfilePlan(true);
    try {
      const plan = await createStrengthWorkoutPlan({});
      setStrengthPlan(plan);
      Alert.alert(t('Plan Generated!'), t('Your custom workout plan was generated from your onboarding profile and is now pinned.'));
    } catch (err) {
      Alert.alert(t('Generation Failed'), formatAppError(err).message);
    } finally {
      setGeneratingProfilePlan(false);
    }
  };

  const todaysWorkoutInfo = useMemo(() => {
    if (strengthPlan && strengthPlan.days && strengthPlan.days.length > 0) {
      const completedDays = strengthPlan.progress?.filter((p) => p.completed).map((p) => p.day) || [];
      const nextDay = strengthPlan.days.find((d) => !completedDays.includes(d.day)) || strengthPlan.days[0];
      const totalDays = strengthPlan.days.length;
      const completedCount = completedDays.length;
      const progressPercent = totalDays > 0 ? completedCount / totalDays : 0;
      const display = getPlanDisplayData(strengthPlan.summary, t('Custom Strength Plan'));

      return {
        type: 'STRENGTH',
        planId: strengthPlan.plan_id,
        title: display.title,
        dayTitle: nextDay.title || nextDay.day,
        dayLabel: nextDay.day,
        estTime: nextDay.est_time || '45 MIN',
        volume: nextDay.volume || 'Optimal',
        intensity: nextDay.intensity || 'Hypertrophy',
        totalDays,
        completedCount,
        progressPercent,
        isFinishedAll: completedCount >= totalDays,
      };
    }

    if (videoPlan && videoPlan.days && videoPlan.days.length > 0) {
      const activeDays = videoPlan.days.filter((day) => day.workouts_count > 0).length || 0;
      const display = getPlanDisplayData(videoPlan.summary, t('7-Day Video Plan'));
      const firstActiveDay = videoPlan.days.find((d) => d.workouts_count > 0) || videoPlan.days[0];

      return {
        type: 'VIDEO',
        planId: null,
        title: display.title,
        dayTitle: firstActiveDay.day,
        dayLabel: firstActiveDay.day,
        estTime: firstActiveDay.duration_label || '30 MIN',
        volume: `${firstActiveDay.workouts_count} Workouts`,
        intensity: 'Video Flow',
        totalDays: 7,
        completedCount: activeDays,
        progressPercent: activeDays / 7,
        isFinishedAll: false,
      };
    }

    return null;
  }, [strengthPlan, videoPlan, t]);

  useFocusEffect(
    React.useCallback(() => {
      void recordAnalyticsEvent('workout_library_visited').catch(() => undefined);
    }, [])
  );

  useEffect(() => {
    hasLoadedLibraryRef.current =
      Boolean(initialLibrary.featuredWorkout) || initialLibrary.workouts.length > 0 || initialLibrary.categories.length > 0;
  }, [initialLibrary]);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const user = await fetchCurrentUser();
        if (!cancelled) {
          setCanAccessWorkoutPlans(canAccessFeature('workoutplan', user));
        }
      } catch {
        if (!cancelled) {
          setCanAccessWorkoutPlans(false);
        }
      }
    };

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLibrary = async () => {
      const cachedLibrary = debouncedSearchQuery ? null : getCachedWorkoutLibrary();
      if (cachedLibrary && isMounted) {
        setLibrary(cachedLibrary);
        hasLoadedLibraryRef.current = true;
        setLoading(false);
      }

      const shouldShowFullScreenLoader = !hasLoadedLibraryRef.current && !cachedLibrary;

      if (shouldShowFullScreenLoader) {
        setLoading(true);
      } else if (hasLoadedLibraryRef.current) {
        setSearching(true);
      }
      setError('');
      try {
        const response = await fetchWorkoutLibrary(debouncedSearchQuery);
        if (!isMounted) {
          return;
        }
        setLibrary(response);
        hasLoadedLibraryRef.current = true;
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(formatAppError(loadError).message);
        setLibrary({
          featuredWorkout: null,
          workouts: [],
          categories: [],
        });
      } finally {
        if (isMounted) {
          setLoading(false);
          setSearching(false);
        }
      }
    };

    loadLibrary();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchQuery]);

  useFocusEffect(
    React.useCallback(() => {
      if (!canAccessWorkoutPlans) {
        setStrengthPlan(null);
        setVideoPlan(null);
        return () => {
          return;
        };
      }

      let active = true;

      const loadSavedPlans = async () => {
        const [latestStrength, latestVideo] = await Promise.all([
          fetchLatestStrengthWorkoutPlan().catch(() => null),
          loadLatestVideoWorkoutPlan().catch(() => null),
        ]);
        if (!active) {
          return;
        }
        setStrengthPlan(latestStrength);
        setVideoPlan(latestVideo);
      };

      void loadSavedPlans();
      void loadHistory(1);

      return () => {
        active = false;
      };
    }, [canAccessWorkoutPlans])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetchWorkoutLibrary(debouncedSearchQuery);
      setLibrary(response);
    } catch (refreshError) {
      setError(formatAppError(refreshError).message);
    } finally {
      setRefreshing(false);
    }
  };

  const featuredWorkout = library.featuredWorkout;
  const filteredWorkouts = useMemo(() => {
    if (!selectedCategoryName) {
      return library.workouts;
    }
    return library.workouts.filter(
      (w) => w.tag.toLowerCase() === selectedCategoryName.toLowerCase()
    );
  }, [library.workouts, selectedCategoryName]);

  const newAndPopular = useMemo(() => filteredWorkouts.slice(0, 8), [filteredWorkouts]);

  if (checkingAccess) {
    return null;
  }

  const openWorkout = (workout: WorkoutLibraryItem) => {
    pushRoute(router, {
      pathname: '/workout-library/[id]',
      params: {
        id: workout.id,
        title: workout.title,
        vimeoId: workout.vimeoId,
        videoUrl: workout.videoUrl,
        videoSource: workout.videoSource,
        tag: workout.tag,
        thumbnail: workout.thumbnail,
      },
    });
  };

  const openCategory = (category: WorkoutLibraryCategory) => {
    pushRoute(router, {
      pathname: '/workout-library/category/[name]',
      params: {
        name: category.name,
      },
    });
  };

  const openAllCategories = () => {
    pushRoute(router, '/workout-library/categories');
  };

  const handleRemoveStrengthPlan = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm ? window.confirm(t('Delete your saved custom strength plan?')) : true;
      if (confirmed) {
        void (async () => {
          try {
            await deleteLatestStrengthWorkoutPlan();
            setStrengthPlan(null);
          } catch (deleteError) {
            setError(formatAppError(deleteError).message);
          }
        })();
      }
      return;
    }

    Alert.alert(t('Remove Plan'), t('Delete your saved custom strength plan?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLatestStrengthWorkoutPlan();
            setStrengthPlan(null);
          } catch (deleteError) {
            setError(formatAppError(deleteError).message);
          }
        },
      },
    ]);
  };

  const handleRemoveVideoPlan = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm ? window.confirm(t('Delete your saved 7-day video plan from this device?')) : true;
      if (confirmed) {
        void (async () => {
          try {
            await clearLatestVideoWorkoutPlan();
            setVideoPlan(null);
          } catch (deleteError) {
            setError(formatAppError(deleteError).message);
          }
        })();
      }
      return;
    }

    Alert.alert(t('Remove Plan'), t('Delete your saved 7-day video plan from this device?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await clearLatestVideoWorkoutPlan();
            setVideoPlan(null);
          } catch (deleteError) {
            setError(formatAppError(deleteError).message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <VictoryHeader />

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('Search workouts...')}
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.searchActions}>
            <TouchableOpacity style={styles.searchActionBtn} onPress={handleRefresh} disabled={refreshing || searching}>
              {refreshing || searching ? (
                <ActivityIndicator size="small" color={Colors.textMuted} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.searchActionBtn}
                disabled={searching}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('Loading workout library...')}</Text>
          </View>
        ) : (
          <>
                        {/* 0. PINNED TODAY'S WORKOUT (Always pinned at the top, never pushed down) */}
            <View style={styles.pinnedSection}>
              <View style={styles.pinnedHeaderRow}>
                <View style={styles.pinnedBadge}>
                  <Ionicons name="pin" size={13} color="#EAB308" />
                  <Text style={styles.pinnedBadgeText}>{t("PINNED • TODAY'S WORKOUT")}</Text>
                </View>
                {todaysWorkoutInfo ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.pinnedReplanBtn}
                      onPress={() => router.push('/workoutplan/strength-wizard')}
                    >
                      <Ionicons name="refresh-outline" size={13} color="#06B6D4" />
                      <Text style={styles.pinnedReplanText}>{t('New Plan')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.pinnedDayTag}>{todaysWorkoutInfo.dayLabel}</Text>
                  </View>
                ) : null}
              </View>

              {todaysWorkoutInfo ? (
                <TouchableOpacity
                  style={styles.pinnedCard}
                  activeOpacity={0.88}
                  onPress={() => {
                    if (todaysWorkoutInfo.type === 'STRENGTH') {
                      router.push('/workoutplan/strength-plan');
                    } else {
                      router.push('/workoutplan/video-plan');
                    }
                  }}
                >
                  <View style={styles.pinnedCardTop}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.pinnedCardCategory}>{todaysWorkoutInfo.title.toUpperCase()}</Text>
                      <Text style={styles.pinnedCardTitle} numberOfLines={2}>
                        {todaysWorkoutInfo.dayTitle}
                      </Text>
                    </View>
                    <View style={styles.pinnedDurationWrap}>
                      <Ionicons name="time-outline" size={14} color="#06B6D4" />
                      <Text style={styles.pinnedDurationText}>{todaysWorkoutInfo.estTime}</Text>
                    </View>
                  </View>

                  {/* Metrics Row */}
                  <View style={styles.pinnedMetricsRow}>
                    <View style={styles.pinnedMetricItem}>
                      <Text style={styles.pinnedMetricLabel}>{t('VOLUME')}</Text>
                      <Text style={styles.pinnedMetricVal}>{todaysWorkoutInfo.volume}</Text>
                    </View>
                    <View style={styles.pinnedMetricDivider} />
                    <View style={styles.pinnedMetricItem}>
                      <Text style={styles.pinnedMetricLabel}>{t('INTENSITY')}</Text>
                      <Text style={styles.pinnedMetricVal}>{todaysWorkoutInfo.intensity}</Text>
                    </View>
                    <View style={styles.pinnedMetricDivider} />
                    <View style={styles.pinnedMetricItem}>
                      <Text style={styles.pinnedMetricLabel}>{t('PLAN PROGRESS')}</Text>
                      <Text style={styles.pinnedMetricVal}>
                        {todaysWorkoutInfo.completedCount}/{todaysWorkoutInfo.totalDays} {t('Days')}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.pinnedProgressBarContainer}>
                    <View
                      style={[
                        styles.pinnedProgressBarFill,
                        { width: `${Math.max(5, todaysWorkoutInfo.progressPercent * 100)}%` },
                      ]}
                    />
                  </View>

                  {/* Action CTA Button */}
                  <View style={styles.pinnedActionBtn}>
                    <Ionicons name="play-circle" size={20} color="#000" />
                    <Text style={styles.pinnedActionBtnText}>
                      {todaysWorkoutInfo.isFinishedAll
                        ? t('REVIEW COMPLETED PLAN')
                        : todaysWorkoutInfo.completedCount > 0
                          ? t("RESUME TODAY'S SESSION")
                          : t("START TODAY'S WORKOUT")}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#000" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.pinnedEmptyCard}>
                  <View style={styles.pinnedEmptyHeader}>
                    <Ionicons name="sparkles" size={22} color="#06B6D4" />
                    <Text style={styles.pinnedEmptyTitle}>{t('No Active Plan Pinned')}</Text>
                  </View>
                  <Text style={styles.pinnedEmptyText}>
                    {t('Generate an AI workout plan tailored to your profile & equipment, or customize manually.')}
                  </Text>
                  <View style={{ gap: 8, marginTop: 14 }}>
                    <TouchableOpacity
                      style={styles.pinnedCreateBtn}
                      disabled={generatingProfilePlan}
                      onPress={handle1TapGenerateFromProfile}
                    >
                      {generatingProfilePlan ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <>
                          <Ionicons name="flash" size={15} color="#000" />
                          <Text style={styles.pinnedCreateBtnText}>{t('⚡ 1-TAP PLAN FROM PROFILE')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pinnedCreateBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }]}
                      onPress={() => router.push('/workoutplan/strength-wizard')}
                    >
                      <Ionicons name="options-outline" size={15} color="#fff" />
                      <Text style={[styles.pinnedCreateBtnText, { color: '#fff' }]}>{t('CUSTOMIZE IN WIZARD')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* 1. Featured Workout */}
            {featuredWorkout ? (
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() => openWorkout(featuredWorkout)}
              >
                <Image
                  source={{ uri: safeImageUri(featuredWorkout.thumbnail) }}
                  style={styles.heroImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.heroOverlayGradient}
                />
                <View style={styles.heroContent}>
                  <View style={styles.heroHeaderRow}>
                    <View style={styles.heroBadge}>
                      <Text style={styles.heroBadgeText}>{t('FEATURED')}</Text>
                    </View>
                    <View style={styles.heroDurationContainer}>
                      <Ionicons name="time-outline" size={14} color="#fff" style={styles.heroDurationIcon} />
                      <Text style={styles.heroDurationText}>
                        {getWorkoutDetails(featuredWorkout).duration} {t('MIN')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {featuredWorkout.title}
                  </Text>
                  <View style={styles.heroFooterRow}>
                    <Text style={styles.heroMeta}>
                      {t(featuredWorkout.tag)} · {t('Video ready')}
                    </Text>
                    <View style={styles.heroStartButton}>
                      <Text style={styles.heroStartButtonText}>{t('START')}</Text>
                      <Ionicons name="chevron-forward" size={12} color="#000" style={styles.heroStartIcon} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyHero}>
                <Text style={styles.emptyHeroTitle}>{t('No published workouts yet')}</Text>
                <Text style={styles.emptyHeroText}>{t('Add and publish workouts from the dashboard.')}</Text>
              </View>
            )}

            {/* 2. Categories Pills */}
            <View style={styles.categoriesContainer}>
              <Pressable onPress={openAllCategories} style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('CATEGORIES')}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScroll}
              >
                {library.categories.map((category) => {
                  const isSelected = selectedCategoryName === category.name;
                  const iconName = getCategoryIcon(category.name);
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedCategoryName(
                          selectedCategoryName === category.name ? null : category.name
                        );
                      }}
                    >
                      <Ionicons
                        name={iconName}
                        size={16}
                        color={isSelected ? Colors.primary : Colors.textMuted}
                        style={styles.categoryPillIcon}
                      />
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextSelected,
                        ]}
                      >
                        {t(category.name).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 3. New & Popular (Vertical List) */}
            <View style={styles.popularSection}>
              <Text style={styles.sectionTitleMain}>{t('NEW & POPULAR')}</Text>
              <View style={styles.popularList}>
                {newAndPopular.map((workout) => {
                  const details = getWorkoutDetails(workout);
                  return (
                    <TouchableOpacity
                      key={workout.id}
                      style={styles.popularCardVertical}
                      activeOpacity={0.9}
                      onPress={() => openWorkout(workout)}
                    >
                      <View style={styles.popularImageContainer}>
                        <Image
                          source={{ uri: safeImageUri(workout.thumbnail) }}
                          style={styles.popularImageVertical}
                        />
                        <View style={styles.popularLevelBadge}>
                          <Text style={styles.popularLevelBadgeText}>{t(details.level)}</Text>
                        </View>
                      </View>
                      <View style={styles.popularContentVertical}>
                        <Text style={styles.popularTitleVertical} numberOfLines={2}>
                          {workout.title}
                        </Text>
                        <View style={styles.popularMetaRow}>
                          <Text style={styles.popularMetaDuration}>{details.duration} {t('MIN')}</Text>
                          <Text style={styles.popularMetaDivider}>•</Text>
                          <Text style={styles.popularMetaTag}>{t(workout.tag).toUpperCase()}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {!searching && newAndPopular.length === 0 ? (
              <View style={styles.inlineEmptyState}>
                <Text style={styles.inlineEmptyStateText}>
                  {t('No workouts match your current filter.')}
                </Text>
              </View>
            ) : null}

            {/* 4. Saved Plan */}
            {canAccessWorkoutPlans && (strengthPlan || videoPlan) ? (
              <View style={styles.savedPlansSection}>
                <Text style={styles.sectionTitleSavedPlan}>{t('YOUR SAVED PLAN')}</Text>
                
                {strengthPlan ? (() => {
                  const totalDays = strengthPlan.days?.length || 0;
                  const completedDays = strengthPlan.progress?.filter((p) => p.completed).length || 0;
                  const progressPercent = totalDays > 0 ? completedDays / totalDays : 0;
                  const display = getPlanDisplayData(strengthPlan.summary, t('Custom Strength Plan'));
                  
                  return (
                    <TouchableOpacity
                      style={styles.savedPlanCard}
                      activeOpacity={0.88}
                      onPress={() => router.push('/workoutplan/strength-plan')}
                    >
                      <View style={styles.savedPlanTopRow}>
                        <Text style={styles.savedPlanEyebrow}>{t('CUSTOM STRENGTH PLAN')}</Text>
                        <TouchableOpacity style={styles.savedPlanRemoveBtn} onPress={handleRemoveStrengthPlan}>
                          <Ionicons name="trash-outline" size={15} color="#FCA5A5" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.savedPlanTitle} numberOfLines={2}>
                        {display.title}
                      </Text>
                      {display.description ? (
                        <Text style={styles.savedPlanDescription} numberOfLines={2}>
                          {display.description}
                        </Text>
                      ) : null}
                      <View style={styles.savedPlanProgressInfo}>
                        <Text style={styles.savedPlanProgressText}>
                          {completedDays} {t('of')} {totalDays} {totalDays === 1 ? t('Day') : t('Days')} {t('Completed')}
                        </Text>
                        <Text style={styles.savedPlanProgressPercent}>
                          {Math.round(progressPercent * 100)}%
                        </Text>
                      </View>
                      <View style={styles.savedPlanProgressBarContainer}>
                        <View style={[styles.savedPlanProgressBar, { width: `${progressPercent * 100}%` }]} />
                      </View>
                    </TouchableOpacity>
                  );
                })() : null}

                {videoPlan ? (() => {
                  const activeDays = videoPlan.days?.filter((day) => day.workouts_count > 0).length || 0;
                  const progressPercent = activeDays / 7;
                  const display = getPlanDisplayData(videoPlan.summary, t('7-Day Video Plan'));
                  
                  return (
                    <TouchableOpacity
                      style={styles.savedPlanCard}
                      activeOpacity={0.88}
                      onPress={() => router.push('/workoutplan/video-plan')}
                    >
                      <View style={styles.savedPlanTopRow}>
                        <Text style={styles.savedPlanEyebrow}>{t('7-DAY VIDEO PLAN')}</Text>
                        <TouchableOpacity style={styles.savedPlanRemoveBtn} onPress={handleRemoveVideoPlan}>
                          <Ionicons name="trash-outline" size={15} color="#FCA5A5" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.savedPlanTitle} numberOfLines={2}>
                        {display.title}
                      </Text>
                      {display.description ? (
                        <Text style={styles.savedPlanDescription} numberOfLines={2}>
                          {display.description}
                        </Text>
                      ) : null}
                      <View style={styles.savedPlanProgressInfo}>
                        <Text style={styles.savedPlanProgressText}>
                          {activeDays} {t('Active')} {activeDays === 1 ? t('Day') : t('Days')}
                        </Text>
                        <Text style={styles.savedPlanProgressPercent}>
                          {Math.round(progressPercent * 100)}%
                        </Text>
                      </View>
                      <View style={styles.savedPlanProgressBarContainer}>
                        <View style={[styles.savedPlanProgressBar, { width: `${progressPercent * 100}%` }]} />
                      </View>
                    </TouchableOpacity>
                  );
                })() : null}
              </View>
            ) : null}
                      {/* 5. WORKOUT HISTORY (Paginated at 20 items per page) */}
            <View style={styles.historySection}>
              <View style={styles.historyHeaderRow}>
                <View>
                  <Text style={styles.sectionTitleHistory}>{t('WORKOUT HISTORY')}</Text>
                  <Text style={styles.historySubtitle}>
                    {historyTotal > 0
                      ? `${historyTotal} ${t('Total Sessions Logged')}`
                      : t('Completed past sessions recorded here')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.seedBtn}
                  onPress={handleSeed50Logs}
                  disabled={seedingLogs}
                >
                  {seedingLogs ? (
                    <ActivityIndicator size="small" color="#06B6D4" />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={14} color="#06B6D4" />
                      <Text style={styles.seedBtnText}>{t('Seed 50+ Logs')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {historyLoading ? (
                <View style={styles.historyLoadingBox}>
                  <ActivityIndicator size="small" color="#06B6D4" />
                  <Text style={styles.historyLoadingText}>{t('Loading workout history...')}</Text>
                </View>
              ) : historyLogs.length > 0 ? (
                <View style={styles.historyListBox}>
                  {historyLogs.map((log) => {
                    const mins = Math.max(1, Math.round((log.duration_seconds || 1800) / 60));
                    const logDate = log.started_at
                      ? new Date(log.started_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently';

                    return (
                      <View key={log.id} style={styles.historyItemRow}>
                        <View style={styles.historyIconWrap}>
                          <Ionicons name="barbell-outline" size={18} color="#06B6D4" />
                        </View>
                        <View style={styles.historyItemMain}>
                          <Text style={styles.historyItemTitle} numberOfLines={1}>
                            {log.title}
                          </Text>
                          <Text style={styles.historyItemDate}>{logDate}</Text>
                        </View>
                        <View style={styles.historyItemMeta}>
                          <Text style={styles.historyDurationText}>{mins} {t('min')}</Text>
                          <View style={styles.historyBadgeCompleted}>
                            <Text style={styles.historyBadgeText}>{t('COMPLETED')}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Pagination Controls (20 items per page) */}
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, historyPage <= 1 && styles.pageBtnDisabled]}
                      onPress={() => loadHistory(historyPage - 1)}
                      disabled={historyPage <= 1 || historyLoading}
                    >
                      <Ionicons name="chevron-back" size={16} color={historyPage <= 1 ? '#4B5563' : '#fff'} />
                      <Text style={[styles.pageBtnText, historyPage <= 1 && styles.pageBtnTextDisabled]}>
                        {t('Prev')}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.pageInfoText}>
                      {t('Page')} {historyPage} / {historyTotalPages || 1}
                    </Text>

                    <TouchableOpacity
                      style={[styles.pageBtn, historyPage >= historyTotalPages && styles.pageBtnDisabled]}
                      onPress={() => loadHistory(historyPage + 1)}
                      disabled={historyPage >= historyTotalPages || historyLoading}
                    >
                      <Text style={[styles.pageBtnText, historyPage >= historyTotalPages && styles.pageBtnTextDisabled]}>
                        {t('Next')}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={historyPage >= historyTotalPages ? '#4B5563' : '#fff'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.historyEmptyBox}>
                  <Ionicons name="time-outline" size={28} color="#4B5563" />
                  <Text style={styles.historyEmptyText}>{t('No workout history found yet.')}</Text>
                  <Text style={styles.historyEmptySubtext}>
                    {t('Complete a session or tap "Seed 50+ Logs" to verify 20-items-per-page pagination.')}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none' as never,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchActionBtn: {
    padding: 4,
  },
  errorCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    padding: 14,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 19,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    height: 240,
    marginBottom: 24,
    position: 'relative',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  heroBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroBadgeText: {
    color: '#000',
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
  heroDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroDurationIcon: {
    opacity: 0.8,
  },
  heroDurationText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    lineHeight: 30,
    marginBottom: 10,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  heroStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  heroStartButtonText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  heroStartIcon: {
    marginLeft: 2,
  },
  emptyHero: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    backgroundColor: '#10182B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyHeroTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  emptyHeroText: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPillSelected: {
    borderColor: Colors.primary,
  },
  categoryPillIcon: {
    marginRight: 2,
  },
  categoryPillText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  categoryPillTextSelected: {
    color: Colors.primary,
  },
  popularSection: {
    paddingHorizontal: 16,
  },
  sectionTitleMain: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 14,
  },
  popularList: {
    gap: 16,
  },
  popularCardVertical: {
    backgroundColor: '#121212',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  popularImageContainer: {
    height: 180,
    position: 'relative',
    backgroundColor: '#161616',
  },
  popularImageVertical: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  popularLevelBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  popularLevelBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  popularContentVertical: {
    padding: 16,
  },
  popularTitleVertical: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    lineHeight: 24,
  },
  popularMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popularMetaDuration: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  popularMetaDivider: {
    color: Colors.primary,
    fontSize: 12,
  },
  popularMetaTag: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  inlineEmptyState: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inlineEmptyStateText: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  savedPlansSection: {
    paddingHorizontal: 16,
    marginTop: 28,
    gap: 12,
  },
  sectionTitleSavedPlan: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  savedPlanCard: {
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  savedPlanTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  savedPlanEyebrow: {
    color: Colors.primary,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.1,
  },
  savedPlanRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  savedPlanTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  savedPlanDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 14,
  },
  savedPlanProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  savedPlanProgressText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  savedPlanProgressPercent: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  savedPlanProgressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  savedPlanProgressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  pinnedSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  pinnedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234,179,8,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.25)',
  },
  pinnedBadgeText: {
    color: '#EAB308',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  pinnedDayTag: {
    color: '#06B6D4',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  pinnedReplanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6,182,212,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinnedReplanText: {
    color: '#06B6D4',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  pinnedCard: {
    backgroundColor: '#161922',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(6,182,212,0.3)',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  pinnedCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pinnedCardCategory: {
    color: '#06B6D4',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  pinnedCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    lineHeight: 24,
  },
  pinnedDurationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6,182,212,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pinnedDurationText: {
    color: '#06B6D4',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  pinnedMetricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  pinnedMetricItem: {
    alignItems: 'center',
  },
  pinnedMetricLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  pinnedMetricVal: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  pinnedMetricDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pinnedProgressBarContainer: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  pinnedProgressBarFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 3,
  },
  pinnedActionBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pinnedActionBtnText: {
    color: '#000',
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.6,
  },
  pinnedEmptyCard: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pinnedEmptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pinnedEmptyTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  pinnedEmptyText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  pinnedCreateBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pinnedCreateBtnText: {
    color: '#000',
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.8,
  },
  historySection: {
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 30,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleHistory: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.2,
  },
  historySubtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.25)',
  },
  seedBtnText: {
    color: '#06B6D4',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  historyLoadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  historyLoadingText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  historyListBox: {
    backgroundColor: '#161922',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  historyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(6,182,212,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyItemMain: {
    flex: 1,
  },
  historyItemTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  historyItemDate: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  historyItemMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyDurationText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  historyBadgeCompleted: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyBadgeText: {
    color: '#22C55E',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  pageBtnTextDisabled: {
    color: '#4B5563',
  },
  pageInfoText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  historyEmptyBox: {
    backgroundColor: '#161922',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyEmptyText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  historyEmptySubtext: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 260,
  },
});