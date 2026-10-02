import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatAppError } from '../../../lib/error';
import {
  fetchWorkoutLibrary,
  getCachedWorkoutLibrary,
  getWorkoutLibraryCacheKey,
  WorkoutLibraryItem,
} from '../../../lib/workouts';
import { useLanguage } from '../../../lib/i18n';
import { goBackOrReplace, pushRoute } from '../../../lib/navigation';
import { ScreenState } from '../../../components/ScreenState';
import { useAsyncScreenData } from '../../../hooks/useAsyncScreenData';
import { useTheme } from '../../../context/ThemeContext';

// Luxury Design Tokens
const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';
const JADE = '#1A7A4A';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const FALLBACK_WORKOUT_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80';

function safeImageUri(value: string | null | undefined) {
  const normalized = String(value || '').trim();
  return normalized || FALLBACK_WORKOUT_IMAGE;
}

function formatDuration(minutes: number, seconds: number): string {
  if (minutes > 0) return `${minutes} MIN`;
  if (seconds > 0) return `${Math.round(seconds / 60)} MIN`;
  return 'SESSION';
}

function workoutMatchesCategory(workout: WorkoutLibraryItem, normalizedCategory: string) {
  const purposes = workout.purposes?.length ? workout.purposes : (workout.tag ? [workout.tag] : []);
  return purposes.some((purpose) => purpose.trim().toLowerCase() === normalizedCategory);
}

export default function WorkoutCategoryScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const params = useLocalSearchParams<{ name?: string }>();
  const categoryName = typeof params.name === 'string' ? params.name : t('Discipline');

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const cachedLibrary = getCachedWorkoutLibrary();
  const cachedCategoryWorkouts = useMemo(() => {
    const normalizedCategory = categoryName.trim().toLowerCase();
    if (!normalizedCategory) return [];
    return (cachedLibrary?.workouts || []).filter((workout) => workoutMatchesCategory(workout, normalizedCategory));
  }, [cachedLibrary?.workouts, categoryName]);

  const {
    data: workouts,
    loading,
    error,
    reload,
  } = useAsyncScreenData<WorkoutLibraryItem[]>({
    initialData: cachedCategoryWorkouts,
    cacheKey: getWorkoutLibraryCacheKey(categoryName),
    load: async () => {
      const response = await fetchWorkoutLibrary(categoryName);
      const normalizedCategory = categoryName.trim().toLowerCase();
      return response.workouts.filter((workout) => workoutMatchesCategory(workout, normalizedCategory));
    },
    getErrorMessage: (loadError) => formatAppError(loadError).message,
  });

  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) return workouts;
    const q = searchQuery.toLowerCase().trim();
    return workouts.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.equipment.toLowerCase().includes(q) ||
        w.level.toLowerCase().includes(q)
    );
  }, [workouts, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

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

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? OBSIDIAN : IVORY },
      ]}
      edges={['top', 'left', 'right']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            borderBottomColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.08)',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => goBackOrReplace(router, '/workout-library/categories')}
          style={[
            styles.backButton,
            {
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.06)',
              borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.12)',
            },
          ]}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={isDark ? '#F7F3EE' : '#0D2B45'}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: isDark ? GOLD : COPPER }]}>
            {t('DISCIPLINE PROTOCOL')}
          </Text>
          <Text style={[styles.headerTitle, { color: isDark ? '#F7F3EE' : '#0D2B45' }]} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>

        <View
          style={[
            styles.countPill,
            {
              backgroundColor: isDark ? 'rgba(201, 148, 58, 0.15)' : 'rgba(201, 148, 58, 0.12)',
              borderColor: isDark ? 'rgba(201, 148, 58, 0.3)' : 'rgba(201, 148, 58, 0.25)',
            },
          ]}
        >
          <Text style={styles.countPillText}>
            {workouts.length} {workouts.length === 1 ? t('SESSION') : t('SESSIONS')}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        {/* Category Hero / Lead banner */}
        <View style={styles.leadSection}>
          <Text style={[styles.heroHeadline, { color: isDark ? '#F7F3EE' : '#0D2B45' }]}>
            {categoryName} {t('Sessions')}
          </Text>
          <Text
            style={[
              styles.heroSubhead,
              { color: isDark ? 'rgba(247, 243, 238, 0.65)' : 'rgba(13, 43, 69, 0.65)' },
            ]}
          >
            {t(
              'Select any session to review exercise prescriptions, technique guidelines, and launch video playback.'
            )}
          </Text>
        </View>

        {/* Search within Category if multiple workouts */}
        {workouts.length > 2 && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark ? 'rgba(247, 243, 238, 0.05)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.1)',
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={isDark ? 'rgba(247, 243, 238, 0.45)' : 'rgba(13, 43, 69, 0.45)'}
              style={{ marginRight: 10 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('Filter by title, kit, or level...')}
              placeholderTextColor={isDark ? 'rgba(247, 243, 238, 0.35)' : 'rgba(13, 43, 69, 0.4)'}
              style={[
                styles.searchInput,
                { color: isDark ? '#F7F3EE' : '#0D2B45' },
              ]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.5)'}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content States */}
        {loading ? (
          <View style={styles.stateWrap}>
            <ScreenState mode="loading" message={t('Loading category sessions...')} spinnerColor={GOLD} />
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <ScreenState mode="error" message={error} actionLabel={t('Try Again')} onAction={() => void reload()} />
          </View>
        ) : filteredWorkouts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.08)',
              },
            ]}
          >
            <Ionicons name="barbell-outline" size={38} color={GOLD} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: isDark ? '#F7F3EE' : '#0D2B45' }]}>
              {t('No sessions found')}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.6)' },
              ]}
            >
              {t('No workouts currently match this filter in {categoryName}.', { categoryName })}
            </Text>
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.emptyAction}>
                <Text style={styles.emptyActionText}>{t('Clear Filter')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.workoutList}>
            {filteredWorkouts.map((workout) => {
              const durationLabel = formatDuration(workout.durationMinutes, workout.durationSeconds);
              return (
                <TouchableOpacity
                  key={workout.id}
                  style={[
                    styles.workoutCard,
                    {
                      backgroundColor: isDark ? NAVY : '#FFFFFF',
                      borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.08)',
                      shadowColor: isDark ? '#000' : '#0D2B45',
                      shadowOpacity: isDark ? 0.35 : 0.06,
                      shadowRadius: 16,
                      elevation: isDark ? 4 : 2,
                    },
                  ]}
                  activeOpacity={0.88}
                  onPress={() => openWorkout(workout)}
                >
                  {/* Hero Thumbnail */}
                  <Image source={{ uri: safeImageUri(workout.thumbnail) }} style={styles.cardImage} />

                  {/* Gradient Overlay */}
                  <View
                    style={[
                      styles.cardOverlay,
                      {
                        backgroundColor: isDark
                          ? 'rgba(13, 43, 69, 0.72)'
                          : 'rgba(13, 43, 69, 0.68)',
                      },
                    ]}
                  />

                  {/* Top Badges */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.durationPill}>
                      <Ionicons name="time-outline" size={12} color={GOLD} />
                      <Text style={styles.durationPillText}>{durationLabel}</Text>
                    </View>

                    {workout.equipment ? (
                      <View style={styles.equipmentPill}>
                        <Text style={styles.equipmentPillText}>{workout.equipment}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Center Play Button Watermark */}
                  <View style={styles.playCenterWrap} pointerEvents="none">
                    <View style={styles.playButtonCircle}>
                      <Ionicons name="play" size={20} color="#0D0D0D" style={{ marginLeft: 3 }} />
                    </View>
                  </View>

                  {/* Bottom Content Cluster */}
                  <View style={styles.cardBottomCluster}>
                    <Text style={styles.cardWorkoutTitle} numberOfLines={2}>
                      {workout.title}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <Text style={styles.tagText}>{workout.tag}</Text>
                      {workout.level ? (
                        <>
                          <Text style={styles.dotSeparator}>·</Text>
                          <Text style={styles.levelText}>{workout.level}</Text>
                        </>
                      ) : null}
                      <View style={styles.startSessionCue}>
                        <Text style={styles.startText}>{t('Start')}</Text>
                        <Ionicons name="arrow-forward" size={12} color={GOLD} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerEyebrow: {
    fontSize: 9.5,
    letterSpacing: 1.6,
    fontFamily: MONO,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: CLASH,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  countPillText: {
    color: GOLD,
    fontSize: 10.5,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  leadSection: {
    marginBottom: 16,
  },
  heroHeadline: {
    fontSize: 26,
    fontFamily: CLASH,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubhead: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: INTER,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: INTER,
    height: '100%',
    padding: 0,
  },
  workoutList: {
    gap: 16,
  },
  workoutCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    borderWidth: 1,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTopRow: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  durationPillText: {
    color: GOLD,
    fontSize: 10,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  equipmentPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  equipmentPillText: {
    color: 'rgba(247, 243, 238, 0.85)',
    fontSize: 10,
    fontFamily: DMSANS,
    fontWeight: '600',
  },
  playCenterWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardBottomCluster: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 14,
  },
  cardWorkoutTitle: {
    color: '#F7F3EE',
    fontSize: 20,
    fontFamily: CLASH,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    color: 'rgba(247, 243, 238, 0.85)',
    fontSize: 12,
    fontFamily: DMSANS,
    fontWeight: '600',
  },
  dotSeparator: {
    color: 'rgba(247, 243, 238, 0.4)',
    marginHorizontal: 6,
  },
  levelText: {
    color: GOLD,
    fontSize: 11,
    fontFamily: MONO,
    fontWeight: '600',
  },
  startSessionCue: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startText: {
    color: GOLD,
    fontSize: 12,
    fontFamily: DMSANS,
    fontWeight: '700',
  },
  stateWrap: {
    paddingVertical: 40,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: CLASH,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: INTER,
    marginBottom: 18,
    maxWidth: 240,
  },
  emptyAction: {
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyActionText: {
    color: '#0D0D0D',
    fontSize: 12,
    fontFamily: DMSANS,
    fontWeight: '700',
  },
});
