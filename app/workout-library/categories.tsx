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
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { formatAppError } from '../../lib/error';
import { fetchWorkoutLibrary, getWorkoutLibraryCacheKey, WorkoutLibraryCategory, WorkoutLibraryResponse } from '../../lib/workouts';
import { useLanguage } from '../../lib/i18n';
import { goBackOrReplace, pushRoute } from '../../lib/navigation';
import { ScreenState } from '../../components/ScreenState';
import { useAsyncScreenData } from '../../hooks/useAsyncScreenData';
import { useTheme } from '../../context/ThemeContext';

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

// Curated high-resolution fitness photography by discipline
const CATEGORY_IMAGES: Record<string, string> = {
  strength: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  mobility: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  recovery: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
  core: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
  conditioning: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',
  hiit: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=800&q=80',
  yoga: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
  flow: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
  vimeo: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
};

function getCategoryPhoto(name: string, backendImage?: string | null): string {
  const backendTrimmed = String(backendImage || '').trim();
  if (backendTrimmed && !backendTrimmed.includes('undefined') && !backendTrimmed.includes('null')) {
    return backendTrimmed;
  }
  const key = name.toLowerCase().trim();
  for (const [k, url] of Object.entries(CATEGORY_IMAGES)) {
    if (key.includes(k)) return url;
  }
  return CATEGORY_IMAGES.default;
}

export default function WorkoutCategoriesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isDark, colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: libraryData,
    loading,
    error,
    reload,
  } = useAsyncScreenData<WorkoutLibraryResponse | WorkoutLibraryCategory[] | null>({
    initialData: null,
    cacheKey: getWorkoutLibraryCacheKey(),
    load: async () => {
      const response = await fetchWorkoutLibrary();
      return response;
    },
    getErrorMessage: (loadError) => formatAppError(loadError).message,
  });

  const categories = useMemo(() => {
    if (Array.isArray(libraryData)) {
      return libraryData;
    }
    return Array.isArray(libraryData?.categories) ? libraryData.categories : [];
  }, [libraryData]);

  const totalWorkouts = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.count || 0), 0);
  }, [categories]);

  // Filtered categories by search text and filter chip
  const filteredCategories = useMemo(() => {
    let list = categories;

    if (selectedFilter !== 'All') {
      list = list.filter((c) => c.name.toLowerCase() === selectedFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    return list;
  }, [categories, selectedFilter, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const openCategory = (category: WorkoutLibraryCategory) => {
    pushRoute(router, {
      pathname: '/workout-library/category/[name]',
      params: {
        name: category.name,
      },
    });
  };

  // Filter chips
  const filterChips = useMemo(() => {
    const names = ['All', ...categories.map((c) => c.name)];
    return Array.from(new Set(names));
  }, [categories]);

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? OBSIDIAN : IVORY },
      ]}
      edges={['top', 'left', 'right']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            borderBottomColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.08)',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => goBackOrReplace(router, '/(tabs)/workout')}
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
            {t('WORKOUT LIBRARY')} · {t('DISCIPLINES')}
          </Text>
          <Text style={[styles.headerTitle, { color: isDark ? '#F7F3EE' : '#0D2B45' }]}>
            {t('Categories')}
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
            {categories.length} {t('TIERS')}
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
        {/* Editorial Subhead & Context Banner */}
        <View style={styles.leadSection}>
          <Text style={[styles.heroHeadline, { color: isDark ? '#F7F3EE' : '#0D2B45' }]}>
            {t('Explore Every Discipline')}
          </Text>
          <Text style={[styles.heroSubhead, { color: isDark ? 'rgba(247, 243, 238, 0.65)' : 'rgba(13, 43, 69, 0.65)' }]}>
            {t('Targeted movement protocols engineered for strength, mobility, recovery, and conditioning. Filter or select a discipline below.')}
          </Text>
        </View>

        {/* Live Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.05)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.1)',
              shadowColor: isDark ? '#000' : '#0D2B45',
              shadowOpacity: isDark ? 0 : 0.04,
              shadowRadius: 10,
              elevation: isDark ? 0 : 1,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? 'rgba(247, 243, 238, 0.45)' : 'rgba(13, 43, 69, 0.45)'}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('Search disciplines or movements...')}
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

        {/* Horizontal Quick Filter Chips */}
        {filterChips.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {filterChips.map((chip) => {
              const active = selectedFilter === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setSelectedFilter(chip)}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    active
                      ? {
                          backgroundColor: GOLD,
                          borderColor: GOLD,
                        }
                      : {
                          backgroundColor: isDark ? 'rgba(247, 243, 238, 0.06)' : 'rgba(13, 43, 69, 0.05)',
                          borderColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.08)',
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active ? '#0D0D0D' : isDark ? 'rgba(247, 243, 238, 0.75)' : '#0D2B45',
                        fontFamily: active ? 'Inter_700Bold' : 'Inter_600SemiBold',
                      },
                    ]}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Section Count Subtext */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: isDark ? '#F7F3EE' : '#0D2B45' }]}>
            {selectedFilter === 'All' ? t('All Disciplines') : selectedFilter}
          </Text>
          <Text style={[styles.sectionCount, { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.5)' }]}>
            {filteredCategories.length} {t('categories')} · {totalWorkouts} {t('sessions')}
          </Text>
        </View>

        {/* Body State Handling */}
        {loading ? (
          <View style={styles.stateWrap}>
            <ScreenState mode="loading" message={t('Loading workout disciplines...')} spinnerColor={GOLD} />
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <ScreenState mode="error" message={error} actionLabel={t('Try Again')} onAction={() => void reload()} />
          </View>
        ) : filteredCategories.length === 0 ? (
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
              {t('No matching disciplines')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.6)' }]}>
              {t('Try searching for another keyword or clear filters.')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSelectedFilter('All');
              }}
              style={styles.emptyAction}
            >
              <Text style={styles.emptyActionText}>{t('Reset Filters')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* High-End Category Grid */
          <View style={styles.categoryGrid}>
            {filteredCategories.map((category, index) => {
              const rankNumber = String(index + 1).padStart(2, '0');
              const imageUrl = getCategoryPhoto(category.name, category.image);

              return (
                <TouchableOpacity
                  key={category.id || category.name}
                  style={[
                    styles.categoryCard,
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
                  onPress={() => openCategory(category)}
                >
                  {/* Hero Background Image */}
                  <Image source={{ uri: imageUrl }} style={styles.cardImage} />

                  {/* Multi-Stop Editorial Gradient Overlay */}
                  <View
                    style={[
                      styles.cardOverlay,
                      {
                        backgroundColor: isDark
                          ? 'rgba(13, 43, 69, 0.72)'
                          : 'rgba(13, 43, 69, 0.65)',
                      },
                    ]}
                  />

                  {/* Rank Watermark: 01, 02, 03 */}
                  <View style={styles.rankWatermarkWrap} pointerEvents="none">
                    <Text style={styles.rankWatermark}>{rankNumber}</Text>
                  </View>

                  {/* Brand Wings Tag top right */}
                  <View style={styles.cardBrandBadge}>
                    <Text style={styles.cardBrandText}>VICTORY PROTOCOL</Text>
                  </View>

                  {/* Bottom Content Cluster */}
                  <View style={styles.cardBottomCluster}>
                    <Text style={styles.cardCategoryName} numberOfLines={1}>
                      {category.name}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.countBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.countBadgeText}>
                          {category.count} {category.count === 1 ? t('Workout') : t('Workouts')}
                        </Text>
                      </View>

                      <View style={styles.exploreAction}>
                        <Text style={styles.exploreText}>{t('Explore')}</Text>
                        <Ionicons name="arrow-forward" size={13} color={GOLD} />
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
    marginBottom: 18,
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
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: INTER,
    height: '100%',
    padding: 0,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: CLASH,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionCount: {
    fontSize: 11.5,
    fontFamily: MONO,
  },
  categoryGrid: {
    gap: 16,
  },
  categoryCard: {
    height: 185,
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
  rankWatermarkWrap: {
    position: 'absolute',
    top: -6,
    left: 14,
  },
  rankWatermark: {
    fontSize: 54,
    fontFamily: MONO,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.12)',
    letterSpacing: -2,
  },
  cardBrandBadge: {
    position: 'absolute',
    top: 14,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  cardBrandText: {
    color: GOLD,
    fontSize: 8.5,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cardBottomCluster: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
  },
  cardCategoryName: {
    color: '#F7F3EE',
    fontSize: 24,
    fontFamily: CLASH,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: JADE,
  },
  countBadgeText: {
    color: 'rgba(247, 243, 238, 0.9)',
    fontSize: 11.5,
    fontFamily: MONO,
    fontWeight: '600',
  },
  exploreAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exploreText: {
    color: GOLD,
    fontSize: 12.5,
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
