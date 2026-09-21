import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeTrainHeaderProps {
  totalWorkouts?: number;
  onPressFilter?: () => void;
}

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeTrainHeader({
  totalWorkouts = 170,
  onPressFilter,
}: ClaudeTrainHeaderProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.headerRow}>
      <Text style={[styles.title, { color: colors.text }]}>Train</Text>
      <View style={styles.rightGroup}>
        <Text style={[styles.countText, { color: colors.textMuted }]}>{`${totalWorkouts} workouts`}</Text>
        <Pressable
          style={[
            styles.filterBtn,
            {
              borderColor: isDark ? 'rgba(247, 243, 238, 0.2)' : 'rgba(13, 43, 69, 0.15)',
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.04)' : '#FFFFFF',
            },
          ]}
          onPress={onPressFilter}
          hitSlop={8}
        >
          <View
            style={[
              styles.filterCircle,
              {
                borderColor: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.6)',
              },
            ]}
          />
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
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCircle: {
    width: 12,
    height: 12,
    borderRadius: 99,
    borderWidth: 1.5,
  },
});

