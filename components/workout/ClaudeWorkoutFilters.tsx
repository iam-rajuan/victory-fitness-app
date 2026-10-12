import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';
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
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

const DIFFICULTIES = ['Any', 'Beginner', 'Intermediate', 'Advanced'];
const DURATIONS = ['Any', '10', '15', '25', '35', '45', '60'];
const KITS = ['Any', 'No kit', 'Dumbbells', 'Bands', 'Mat'];

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
  const { t } = useLanguage();
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

  return (
    <View style={styles.container}>
      {/* Header with Title & Total Count */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.sectionTitle}>{t('The whole library')}</Text>
          {activeFiltersCount > 0 ? (
            <View style={styles.activePillBadge}>
              <Text style={styles.activePillBadgeText}>{activeFiltersCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.totalBadge}>{t('170 workouts')}</Text>
      </View>

      {/* Search Input with Search Icon & Clear Button */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
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
          placeholderTextColor="rgba(247, 243, 238, 0.45)"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery ? (
          <Pressable onPress={() => onSearchChange('')} hitSlop={10} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filter Section Header Bar: Controls & Reset button */}
      <View style={styles.filterSectionHeader}>
        <View style={styles.filterHeaderLeft}>
          <Text style={styles.filterSectionTitle}>{t('FILTERS')}</Text>
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

      {/* Collapsed Active Filters Quick Bar */}
      {!isExpanded && activeFiltersCount > 0 ? (
        <View style={styles.collapsedTagsWrap}>
          {activePurposes.map((p) => (
            <Pressable
              key={`collapsed-${p}`}
              onPress={() => onSelectPurpose(p)}
              style={styles.collapsedTag}
            >
              <Text style={styles.collapsedTagText}>{t(p)} ✕</Text>
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
              <Text style={styles.collapsedTagText}>{selectedDuration}m ✕</Text>
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

      {/* Expanded Filter Panel - 100% NON-SCROLLABLE, WRAPPED & SEGMENTED */}
      {isExpanded ? (
        <View style={styles.filtersCard}>
          {/* 1. Purpose (Wrap Chips) */}
          <View style={styles.facetGroup}>
            <Text style={styles.facetLabel}>{t('PURPOSE')}</Text>
            <View style={styles.wrapChipsContainer}>
              {WORKOUT_PURPOSE_FILTER_OPTIONS.map((item) => {
                const active = selectedPurpose.includes(item);
                return (
                  <Pressable
                    key={`purpose-${item}`}
                    onPress={() => onSelectPurpose(item)}
                    style={[styles.wrapChip, active && styles.wrapChipActive]}
                  >
                    <Text style={[styles.wrapChipText, active && styles.wrapChipTextActive]}>
                      {t(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 2. Difficulty (Full-width Segmented Control) */}
          <View style={styles.facetGroup}>
            <Text style={styles.facetLabel}>{t('DIFFICULTY')}</Text>
            <View style={styles.segmentedControl}>
              {DIFFICULTIES.map((item) => {
                const active = selectedDifficulty === item;
                return (
                  <Pressable
                    key={`diff-${item}`}
                    onPress={() => onSelectDifficulty(item)}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {t(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 3. Minutes / Duration (Segmented Number Badge Grid) */}
          <View style={styles.facetGroup}>
            <Text style={styles.facetLabel}>{t('MINUTES')}</Text>
            <View style={styles.durationGrid}>
              {DURATIONS.map((item) => {
                const active = selectedDuration === item;
                const displayLabel = item === 'Any' ? t('Any') : `${item}m`;
                return (
                  <Pressable
                    key={`dur-${item}`}
                    onPress={() => onSelectDuration(item)}
                    style={[styles.durationBadge, active && styles.durationBadgeActive]}
                  >
                    <Text style={[styles.durationText, active && styles.durationTextActive]}>
                      {displayLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Kit / Equipment (Wrap Pills) */}
          <View style={[styles.facetGroup, styles.facetGroupLast]}>
            <Text style={styles.facetLabel}>{t('KIT')}</Text>
            <View style={styles.wrapChipsContainer}>
              {KITS.map((item) => {
                const active = selectedKit === item;
                return (
                  <Pressable
                    key={`kit-${item}`}
                    onPress={() => onSelectKit(item)}
                    style={[styles.wrapChip, active && styles.wrapChipActive]}
                  >
                    <Text style={[styles.wrapChipText, active && styles.wrapChipTextActive]}>
                      {t(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      {/* Result Count Banner */}
      <Text style={styles.resultCount}>
        {resultCountText || t('170 of 170 workouts · shortest first')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.14)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
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
  activePillBadge: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  activePillBadgeText: {
    fontFamily: MONO,
    fontSize: 11,
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
    borderColor: 'rgba(247, 243, 238, 0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14.5,
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
    color: 'rgba(247, 243, 238, 0.6)',
    fontSize: 14,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterSectionTitle: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.5)',
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
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  toggleExpandText: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  collapsedTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  collapsedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderColor: GOLD,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  collapsedTagText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '600',
    color: GOLD,
  },
  filtersCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(13, 43, 69, 0.45)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.08)',
    padding: 16,
    gap: 16,
  },
  facetGroup: {
    gap: 8,
  },
  facetGroupLast: {
    marginBottom: 2,
  },
  facetLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  wrapChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  wrapChip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.18)',
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' as any } : {}),
  },
  wrapChipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  wrapChipText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.75)',
  },
  wrapChipTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderRadius: 12,
    padding: 3,
    width: '100%',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: GOLD,
  },
  segmentText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  segmentTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  durationBadge: {
    flex: 1,
    minWidth: 40,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
  },
  durationBadgeActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  durationText: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.75)',
  },
  durationTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  resultCount: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
});
