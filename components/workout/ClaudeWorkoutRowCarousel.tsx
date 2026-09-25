import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface ProgramCardItem {
  n: string;
  m: string;
  t: string;
  c?: string;
  rank?: number | string;
}

export interface WorkoutRowItem {
  n: string;
  m: string;
  t: string;
  v?: string;
}

interface ClaudeWorkoutRowCarouselProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  type: 'programs' | 'workouts';
  programs?: ProgramCardItem[];
  workouts?: WorkoutRowItem[];
  onSelectProgram?: (item: ProgramCardItem) => void;
  onSelectWorkout?: (item: WorkoutRowItem) => void;
}

const NAVY = '#0D2B45';
const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeWorkoutRowCarousel({
  title,
  subtitle,
  actionText,
  onActionPress,
  type = 'workouts',
  programs = [],
  workouts = [],
  onSelectProgram,
  onSelectWorkout,
}: ClaudeWorkoutRowCarouselProps) {
  const { colors, isDark } = useTheme();
  const scrollRef = React.useRef<ScrollView>(null);

  const snapInterval = type === 'programs' ? 170 : 208;

  const handleAction = () => {
    if (onActionPress) {
      onActionPress();
    } else {
      scrollRef.current?.scrollTo({ x: snapInterval * 2, animated: true });
    }
  };

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>

        {actionText ? (
          <Pressable onPress={handleAction} hitSlop={8}>
            <Text style={styles.actionText}>{actionText}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Horizontal Snap Scroll Area */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        directionalLockEnabled
        nestedScrollEnabled
        contentContainerStyle={styles.scrollContent}
      >
        {type === 'programs' &&
          programs.map((p, idx) => (
            <Pressable
              key={idx}
              style={styles.programCard}
              onPress={() => onSelectProgram && onSelectProgram(p)}
            >
              <View
                style={[
                  styles.programMedia,
                  {
                    backgroundColor: isDark ? NAVY : '#FFFFFF',
                    borderColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.08)',
                    shadowColor: '#0D2B45',
                    shadowOffset: { width: 0, height: 4 },
                    shadowRadius: 10,
                    elevation: 2,
                    shadowOpacity: isDark ? 0.35 : 0.05,
                  },
                ]}
              >
                {p.rank !== undefined ? (
                  <Text
                    style={[
                      styles.programRank,
                      { color: isDark ? 'rgba(247, 243, 238, 0.22)' : 'rgba(13, 43, 69, 0.12)' },
                    ]}
                  >
                    {p.rank}
                  </Text>
                ) : null}
                <Text style={styles.programTag}>{p.t}</Text>

                <View style={styles.programBottomInfo}>
                  <Text style={[styles.programName, { color: isDark ? IVORY : NAVY }]}>{p.n}</Text>
                  <Text
                    style={[
                      styles.programMeta,
                      { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
                    ]}
                  >
                    {p.m}
                  </Text>
                </View>
              </View>
              {p.c ? <Text style={[styles.programCount, { color: colors.textMuted }]}>{p.c}</Text> : null}
            </Pressable>
          ))}

        {type === 'workouts' &&
          workouts.map((w, idx) => (
            <Pressable
              key={idx}
              style={styles.workoutCard}
              onPress={() => onSelectWorkout && onSelectWorkout(w)}
            >
              <View style={styles.workoutMedia}>
                <View style={styles.playCircle}>
                  <View style={styles.playArrow} />
                </View>
                <Text style={styles.workoutBadge}>{w.t}</Text>
              </View>
              <Text style={[styles.workoutName, { color: colors.text }]}>{w.n}</Text>
              <Text style={[styles.workoutMeta, { color: colors.textMuted }]}>{w.m}</Text>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  subtitle: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 3,
  },
  actionText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  // Program card styles
  programCard: {
    width: 158,
    flexShrink: 0,
  },
  programMedia: {
    height: 200,
    borderRadius: 14,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 12,
    position: 'relative',
  },
  programRank: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontFamily: MONO,
    fontSize: 34,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.22)',
  },
  programTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontFamily: DMSANS,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: GOLD,
  },
  programBottomInfo: {
    position: 'relative',
  },
  programName: {
    fontFamily: CLASH,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '600',
    color: IVORY,
  },
  programMeta: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 5,
  },
  programCount: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 7,
  },
  // Workout card styles
  workoutCard: {
    width: 196,
    flexShrink: 0,
  },
  workoutMedia: {
    position: 'relative',
    height: 112,
    borderRadius: 13,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playCircle: {
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 7,
    borderTopColor: 'transparent',
    borderBottomWidth: 7,
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  workoutBadge: {
    position: 'absolute',
    top: 10,
    left: 11,
    fontFamily: DMSANS,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: GOLD,
    backgroundColor: 'rgba(13, 13, 13, 0.7)',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  workoutName: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
    marginTop: 9,
  },
  workoutMeta: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 3,
  },
});
