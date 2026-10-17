import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';
import { canonicalizeFitnessText } from '../../lib/workoutTerminology';
import { WORKOUT_PURPOSE_FILTER_OPTIONS } from '../../constants/WorkoutCategories';

interface ClaudeWorkoutFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPurpose: string[];
  onSelectPurpose: (p: string) => void;
  selectedDifficulty: string;
  onSelectDifficulty: (d: string) => void;
  selectedDuration: string;
  onSelectDuration: (d: string) => void;
  selectedKit: string;
  onSelectKit: (k: string) => void;
  resultCountText?: string;
  onResetFilters?: () => void;
}

const GOLD = '#C9943A';
const GOLD_LIGHT = '#F5CF87';
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

const ORDERED_PURPOSES = [
  'All',
  'Full Body',
  'Strength',
  'Upper Body',
  'Lower Body',
  'Core',
  'Cardio',
  'HIIT',
  'Yoga',
  'Pilates',
  'Sport in Schwangerschaft',
];

const DIFFICULTIES = ['Any', 'Beginner', 'Intermediate', 'Advanced'];
const DURATIONS = ['Any', '15', '30', '45', '60'];

export default function ClaudeWorkoutFilters({
  searchQuery,
  onSearchChange,
  selectedPurpose,
  onSelectPurpose,
  selectedDifficulty,
  onSelectDifficulty,
  selectedDuration,
  onSelectDuration,
  selectedKit,
  onSelectKit,
  resultCountText,
  onResetFilters,
}: ClaudeWorkoutFiltersProps) {
  const { isDark } = useTheme();
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);

  const activePurposes = selectedPurpose.filter((p) => p !== 'All');
  const activeFiltersCount =
    activePurposes.length +
    (selectedDifficulty !== 'Any' ? 1 : 0) +
    (selectedDuration !== 'Any' ? 1 : 0) +
    (selectedKit !== 'Any' ? 1 : 0);

  const handleReset = () => {
    onSelectPurpose('All');
    onSelectDifficulty('Any');
    onSelectDuration('Any');
    onSelectKit('Any');
    onResetFilters?.();
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'Sport in Schwangerschaft' || cat === 'Prenatal') {
      return 'Prenatal';
    }
    if (cat === 'All') {
      return t('All');
    }
    return canonicalizeFitnessText(cat);
  };

  const isDurationActive = (dur: string) => {
    if (dur === 'Any') return selectedDuration === 'Any';
    if (selectedDuration === dur) return true;
    if (dur === '15' && selectedDuration === '10') return true;
    if (dur === '30' && (selectedDuration === '25' || selectedDuration === '35')) return true;
    return false;
  };

  return (
    <View style={styles.container}>
      {/* Header: Title & Total Count */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.sectionTitle}>{t('The whole library')}</Text>
          {activeFiltersCount > 0 ? (
            <View style={styles.activeCounterBadge}>
              <Text style={styles.activeCounterBadgeText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.totalBadge}>{t('170 workouts')}</Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIconSymbol}>⌕</Text>
        <TextInput
          style={[
            styles.searchInput,
            Platform.select({
              web: {
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
                borderWidth: 0,
                borderColor: 'transparent',
                boxShadow: 'none',
              } as any,
            }),
          ]}
          placeholder={t('Search by name, muscle or kit…')}
          placeholderTextColor="rgba(247, 243, 238, 0.42)"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery ? (
          <Pressable onPress={() => onSearchChange('')} hitSlop={10} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filters Control Bar (Title, Active count, Reset, Collapse) */}
      <View style={styles.filterControlBar}>
        <View style={styles.filterControlLeft}>
          <Text style={styles.filterKicker}>{t('FILTERS')}</Text>
          {activeFiltersCount > 0 ? (
            <Pressable onPress={handleReset} hitSlop={8} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>{t('Reset all')}</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={styles.toggleExpandBtn}
          onPress={() => setIsExpanded((prev) => !prev)}
          hitSlop={8}
        >
          <Text style={styles.toggleExpandText}>
            {isExpanded ? t('Collapse ▲') : t('Expand ▼')}
          </Text>
        </Pressable>
      </View>

      {/* Collapsed Active Filters Bar */}
      {!isExpanded && activeFiltersCount > 0 ? (
        <View style={styles.collapsedTagsWrap}>
          {activePurposes.map((p) => (
            <Pressable
              key={`collapsed-${p}`}
              onPress={() => onSelectPurpose(p)}
              style={styles.collapsedTag}
            >
              <Text style={styles.collapsedTagText}>{getCategoryLabel(p)} ✕</Text>
            </Pressable>
          ))}
          {selectedDifficulty !== 'Any' ? (
            <Pressable
              onPress={() => onSelectDifficulty('Any')}
              style={styles.collapsedTag}
            >
              <Text style={styles.collapsedTagText}>{t(selectedDifficulty)} ✕</Text>
            </Pressable>
          ) : null}
          {selectedDuration !== 'Any' ? (
            <Pressable
              onPress={() => onSelectDuration('Any')}
              style={styles.collapsedTag}
            >
              <Text style={styles.collapsedTagText}>≤ {selectedDuration}m ✕</Text>
            </Pressable>
          ) : null}
          {selectedKit !== 'Any' ? (
            <Pressable
              onPress={() => onSelectKit('Any')}
              style={styles.collapsedTag}
            >
              <Text style={styles.collapsedTagText}>{t(selectedKit)} ✕</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <View style={styles.filtersCard}>
          {/* 1. PURPOSE / FOCUS (Balanced 3-Column Squircle Tiles) */}
          <View style={styles.facetSection}>
            <View style={styles.facetHeaderRow}>
              <Text style={styles.facetTitle}>{t('FOCUS / PURPOSE')}</Text>
              {activePurposes.length > 0 ? (
                <Text style={styles.facetActiveSummary}>
                  {activePurposes.length === 1
                    ? getCategoryLabel(activePurposes[0])
                    : `${activePurposes.length} ${t('selected')}`}
                </Text>
              ) : null}
            </View>

            <View style={styles.purposeGrid}>
              {ORDERED_PURPOSES.map((item) => {
                const isAll = item === 'All';
                const active = isAll
                  ? selectedPurpose.includes('All') || activePurposes.length === 0
                  : selectedPurpose.includes(item);

                return (
                  <Pressable
                    key={`purpose-${item}`}
                    onPress={() => onSelectPurpose(item)}
                    style={[
                      styles.purposeTile,
                      isAll
                        ? (active ? styles.tileActiveNeutral : styles.tileInactive)
                        : (active ? styles.tileActiveGold : styles.tileInactive),
                    ]}
                  >
                    <Text
                      style={[
                        styles.purposeTileText,
                        isAll
                          ? (active ? styles.tileTextActiveNeutral : styles.tileTextInactive)
                          : (active ? styles.tileTextActiveGold : styles.tileTextInactive),
                      ]}
                      numberOfLines={1}
                    >
                      {getCategoryLabel(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* 2. DIFFICULTY (Precision 4-Segment Control) */}
          <View style={styles.facetSection}>
            <View style={styles.facetHeaderRow}>
              <Text style={styles.facetTitle}>{t('DIFFICULTY')}</Text>
              {selectedDifficulty !== 'Any' ? (
                <Text style={styles.facetActiveSummary}>{t(selectedDifficulty)}</Text>
              ) : null}
            </View>

            <View style={styles.segmentedControl}>
              {DIFFICULTIES.map((item) => {
                const isAny = item === 'Any';
                const active = selectedDifficulty === item;

                return (
                  <Pressable
                    key={`diff-${item}`}
                    onPress={() => onSelectDifficulty(item)}
                    style={[
                      styles.segmentBtn,
                      isAny
                        ? (active && styles.segmentActiveNeutral)
                        : (active && styles.segmentActiveGold),
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isAny
                          ? (active && styles.segmentTextActiveNeutral)
                          : (active && styles.segmentTextActiveGold),
                      ]}
                    >
                      {t(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* 3. DURATION (Precision 5-Segment Control) */}
          <View style={styles.facetSection}>
            <View style={styles.facetHeaderRow}>
              <Text style={styles.facetTitle}>{t('MAX DURATION')}</Text>
              {selectedDuration !== 'Any' ? (
                <Text style={styles.facetActiveSummary}>≤ {selectedDuration}m</Text>
              ) : null}
            </View>

            <View style={styles.segmentedControl}>
              {DURATIONS.map((item) => {
                const isAny = item === 'Any';
                const active = isDurationActive(item);
                const displayLabel = isAny ? t('Any') : `${item}m`;

                return (
                  <Pressable
                    key={`dur-${item}`}
                    onPress={() => onSelectDuration(item)}
                    style={[
                      styles.segmentBtn,
                      isAny
                        ? (active && styles.segmentActiveNeutral)
                        : (active && styles.segmentActiveGold),
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isAny
                          ? (active && styles.segmentTextActiveNeutral)
                          : (active && styles.segmentTextActiveGold),
                      ]}
                    >
                      {displayLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* 4. EQUIPMENT / KIT (Structured 2-Row Balanced Layout) */}
          <View style={styles.facetSection}>
            <View style={styles.facetHeaderRow}>
              <Text style={styles.facetTitle}>{t('EQUIPMENT')}</Text>
              {selectedKit !== 'Any' ? (
                <Text style={styles.facetActiveSummary}>{t(selectedKit)}</Text>
              ) : null}
            </View>

            {/* Row 1: Any & No kit */}
            <View style={styles.kitRow}>
              <Pressable
                onPress={() => onSelectKit('Any')}
                style={[
                  styles.kitTile,
                  selectedKit === 'Any' ? styles.tileActiveNeutral : styles.tileInactive,
                ]}
              >
                <Text
                  style={[
                    styles.kitTileText,
                    selectedKit === 'Any' ? styles.tileTextActiveNeutral : styles.tileTextInactive,
                  ]}
                >
                  {t('Any equipment')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onSelectKit('No kit')}
                style={[
                  styles.kitTile,
                  selectedKit === 'No kit' ? styles.tileActiveGold : styles.tileInactive,
                ]}
              >
                <Text
                  style={[
                    styles.kitTileText,
                    selectedKit === 'No kit' ? styles.tileTextActiveGold : styles.tileTextInactive,
                  ]}
                >
                  {t('Bodyweight / No kit')}
                </Text>
              </Pressable>
            </View>

            {/* Row 2: Dumbbells, Bands, Mat */}
            <View style={[styles.kitRow, { marginTop: 7 }]}>
              {['Dumbbells', 'Bands', 'Mat'].map((item) => {
                const active = selectedKit === item;
                return (
                  <Pressable
                    key={`kit-${item}`}
                    onPress={() => onSelectKit(item)}
                    style={[
                      styles.kitTile,
                      active ? styles.tileActiveGold : styles.tileInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.kitTileText,
                        active ? styles.tileTextActiveGold : styles.tileTextInactive,
                      ]}
                    >
                      {t(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Result Count Banner */}
      <View style={styles.resultCountWrap}>
        <View style={styles.resultDot} />
        <Text style={styles.resultCountText}>
          {resultCountText || t('170 of 170 workouts · shortest first')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: CLASH,
    fontSize: 18,
    fontWeight: '600',
    color: IVORY,
  },
  activeCounterBadge: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  activeCounterBadgeText: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  totalBadge: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: 'rgba(247, 243, 238, 0.035)',
  },
  searchIconSymbol: {
    fontSize: 18,
    marginRight: 8,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  searchInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14,
    color: IVORY,
    padding: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
    outlineWidth: 0 as any,
    outlineColor: 'transparent' as any,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 13,
  },
  filterControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  filterControlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterKicker: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
  },
  resetBtnText: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  toggleExpandBtn: {
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  toggleExpandText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  collapsedTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  collapsedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 148, 58, 0.14)',
    borderColor: 'rgba(201, 148, 58, 0.6)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  collapsedTagText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '600',
    color: GOLD_LIGHT,
  },
  filtersCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(15, 25, 37, 0.65)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
  },
  facetSection: {
    gap: 9,
  },
  facetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  facetTitle: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  facetActiveSummary: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '600',
    color: GOLD_LIGHT,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  // PURPOSE Grid: 3-column balanced squircle tiles
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  purposeTile: {
    flexBasis: '31%',
    flexGrow: 1,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  purposeTileText: {
    fontFamily: DMSANS,
    fontSize: 12,
    textAlign: 'center',
  },
  // Tile States
  tileInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  tileTextInactive: {
    color: 'rgba(247, 243, 238, 0.68)',
    fontWeight: '500',
  },
  tileActiveNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  tileTextActiveNeutral: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tileActiveGold: {
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderWidth: 1,
    borderColor: '#C9943A',
  },
  tileTextActiveGold: {
    color: GOLD_LIGHT,
    fontWeight: '700',
  },
  // Segmented Controls (DIFFICULTY & MINUTES)
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
    height: 38,
  },
  segmentBtn: {
    flex: 1,
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  segmentActiveNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  segmentActiveGold: {
    backgroundColor: 'rgba(201, 148, 58, 0.22)',
    borderWidth: 1,
    borderColor: '#C9943A',
  },
  segmentText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.62)',
  },
  segmentTextActiveNeutral: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  segmentTextActiveGold: {
    color: GOLD_LIGHT,
    fontWeight: '700',
  },
  // KIT / EQUIPMENT Rows
  kitRow: {
    flexDirection: 'row',
    gap: 7,
  },
  kitTile: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  kitTileText: {
    fontFamily: DMSANS,
    fontSize: 12,
    textAlign: 'center',
  },
  // Result Count Banner
  resultCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 7,
  },
  resultDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: GOLD,
    opacity: 0.8,
  },
  resultCountText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '600',
    color: GOLD,
    letterSpacing: 0.2,
  },
});
