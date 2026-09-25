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

const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

const PURPOSES = ['All', 'Strength', 'Hypertrophy', 'Conditioning', 'Mobility', 'Core', 'Recovery'];
const DURATIONS = ['Any', '15', '30', '45', '60'];
const KITS = ['Any', 'No kit', 'Dumbbells', 'Bands', 'Mat'];

export default function ClaudeWorkoutFilters({
  searchQuery,
  onSearchChange,
  selectedPurpose,
  onSelectPurpose,
  selectedDuration,
  onSelectDuration,
  selectedKit,
  onSelectKit,
  resultCountText = '170 of 170 workouts · shortest first',
}: ClaudeWorkoutFiltersProps) {
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header with Title & Count */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>The whole library</Text>
        <Text style={styles.totalBadge}>170 workouts</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, muscle or kit…"
          placeholderTextColor="rgba(247, 243, 238, 0.45)"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Purpose Filter Row */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>PURPOSE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {PURPOSES.map((p) => {
            const active = p === selectedPurpose;
            return (
              <Pressable
                key={p}
                onPress={() => onSelectPurpose(p)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Minutes Filter Row */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>MINUTES</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {DURATIONS.map((d) => {
            const active = d === selectedDuration;
            return (
              <Pressable
                key={d}
                onPress={() => onSelectDuration(d)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Kit Filter Row */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>KIT</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {KITS.map((k) => {
            const active = k === selectedKit;
            return (
              <Pressable
                key={k}
                onPress={() => onSelectKit(k)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.14)',
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
    paddingVertical: 13,
    backgroundColor: 'transparent',
  },
  searchInput: {
    fontFamily: INTER,
    fontSize: 14.5,
    color: IVORY,
    padding: 0,
  },
  filterRow: {
    paddingTop: 16,
  },
  filterLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    paddingHorizontal: 20,
    paddingBottom: 9,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
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
