import React from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeWorkoutFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPurpose: string;
  onSelectPurpose: (p: string) => void;
  selectedDuration: string;
  onSelectDuration: (d: string) => void;
  selectedKit: string;
  onSelectKit: (k: string) => void;
  resultCountText?: string;
}

const GOLD = '#C9943A';
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const PURPOSES = ['All', 'Strength', 'Hypertrophy', 'Mobility', 'Conditioning', 'Recovery', 'Core'];
const DURATIONS = ['Any', '10', '25', '40', '60'];
const KITS = ['Any', 'Full gym', 'Dumbbells', 'No kit', 'Bands', 'Mat'];

export default function ClaudeWorkoutFilters({
  searchQuery,
  onSearchChange,
  selectedPurpose,
  onSelectPurpose,
  selectedDuration,
  onSelectDuration,
  selectedKit,
  onSelectKit,
  resultCountText = '12 of 170 workouts · shortest first',
}: ClaudeWorkoutFiltersProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header with Title & Count */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>The whole library</Text>
        <Text style={[styles.totalBadge, { color: colors.textMuted }]}>170 workouts</Text>
      </View>

      {/* Search Input */}
      <View
        style={[
          styles.searchBox,
          {
            borderColor: isDark ? 'rgba(247, 243, 238, 0.18)' : 'rgba(13, 43, 69, 0.15)',
            backgroundColor: isDark ? 'rgba(247, 243, 238, 0.03)' : '#FFFFFF',
          },
        ]}
      >
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, muscle or kit…"
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Purpose Filter Row */}
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>PURPOSE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {PURPOSES.map((p) => {
            const active = p === selectedPurpose;
            return (
              <Pressable
                key={p}
                onPress={() => onSelectPurpose(p)}
                style={[
                  styles.chip,
                  {
                    borderColor: isDark ? 'rgba(247, 243, 238, 0.22)' : 'rgba(13, 43, 69, 0.18)',
                  },
                  active && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isDark ? 'rgba(247, 243, 238, 0.7)' : colors.text },
                    active && styles.chipTextActive,
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Minutes Filter Row */}
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>MINUTES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {DURATIONS.map((d) => {
            const label = d === 'Any' ? 'Any' : `≤ ${d} min`;
            const active = d === selectedDuration;
            return (
              <Pressable
                key={d}
                onPress={() => onSelectDuration(d)}
                style={[
                  styles.chip,
                  {
                    borderColor: isDark ? 'rgba(247, 243, 238, 0.22)' : 'rgba(13, 43, 69, 0.18)',
                  },
                  active && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isDark ? 'rgba(247, 243, 238, 0.7)' : colors.text },
                    active && styles.chipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Kit Filter Row */}
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>KIT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {KITS.map((k) => {
            const active = k === selectedKit;
            return (
              <Pressable
                key={k}
                onPress={() => onSelectKit(k)}
                style={[
                  styles.chip,
                  {
                    borderColor: isDark ? 'rgba(247, 243, 238, 0.22)' : 'rgba(13, 43, 69, 0.18)',
                  },
                  active && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isDark ? 'rgba(247, 243, 238, 0.7)' : colors.text },
                    active && styles.chipTextActive,
                  ]}
                >
                  {k}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Result Count Banner */}
      <Text style={styles.resultCount}>{resultCountText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  totalBadge: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  searchBox: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.18)',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.03)',
  },
  searchInput: {
    fontFamily: INTER,
    fontSize: 14.5,
    color: IVORY,
    padding: 0,
  },
  filterRow: {
    paddingTop: 14,
  },
  filterLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  chipText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  chipTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  resultCount: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
});
