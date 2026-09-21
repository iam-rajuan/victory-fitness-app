import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';

interface ClaudeTrainHeaderProps {
  totalWorkouts?: number;
  onPressFilter?: () => void;
}

const IVORY = '#F7F3EE';
const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeTrainHeader({
  totalWorkouts = 170,
  onPressFilter,
}: ClaudeTrainHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>Train</Text>
      <View style={styles.rightGroup}>
        <Text style={styles.countText}>{`${totalWorkouts} workouts`}</Text>
        <Pressable
          style={styles.filterBtn}
          onPress={onPressFilter}
          hitSlop={8}
        >
          <View style={styles.filterCircle} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '600',
    color: IVORY,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countText: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
  },
  filterCircle: {
    width: 12,
    height: 12,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.6)',
  },
});
