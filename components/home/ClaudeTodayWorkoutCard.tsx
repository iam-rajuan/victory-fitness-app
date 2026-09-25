import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeTodayWorkoutCardProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
  workoutTitle?: string;
  durationMinutes?: number;
  exerciseCount?: number;
  equipment?: string;
  onStartSession?: () => void;
  onAdjustPlan?: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeTodayWorkoutCard({
  tier,
  workoutTitle = 'Upper Body Strength',
  durationMinutes = 40,
  exerciseCount = 4,
  equipment = 'DUMBBELLS',
  onStartSession,
  onAdjustPlan,
}: ClaudeTodayWorkoutCardProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const hasCoach = tier !== 'SILVER' && tier !== 'NONE';

  const planLabel = hasCoach ? 'YOUR PLAN · WEEK 2 OF 6' : "TODAY'S WORKOUT";
  const planSource = hasCoach ? 'BUILT BY YOUR COACH' : 'VIDEO · FROM THE LIBRARY';
  const planDayLine = (hasCoach ? 'DAY 3 OF WEEK 2 · ' : 'PICKED FOR TODAY · ') + `${durationMinutes} MIN`;
  const planAlt = hasCoach ? 'Adjust this plan with your coach' : 'Pick a different video instead';

  const handleStart = () => {
    if (onStartSession) {
      onStartSession();
      return;
    }
    // Navigate to active workout / library
    pushRoute(router, '/workout');
  };

  const handleAlt = () => {
    if (onAdjustPlan) {
      onAdjustPlan();
      return;
    }
    if (hasCoach) {
      pushRoute(router, '/chat');
    } else {
      pushRoute(router, '/workout-library');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top badges row */}
      <View style={styles.headerRow}>
        <Text style={[styles.planLabel, { color: colors.textMuted }]}>{planLabel}</Text>
        <Text style={[styles.planSource, { color: hasCoach ? GOLD : colors.textMuted }]}>{planSource}</Text>
      </View>

      {/* Main card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowOpacity: isDark ? 0.35 : 0.06,
          },
        ]}
      >
        <View style={styles.accentGoldBar} />

        <Text style={[styles.dayKicker, { color: isDark ? GOLD : '#B5651D' }]}>{planDayLine}</Text>
        <Text style={[styles.title, { color: isDark ? IVORY : NAVY }]}>{workoutTitle}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: isDark ? IVORY : NAVY }]}>{durationMinutes}</Text>
            <Text
              style={[
                styles.statLabel,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              MINUTES
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: isDark ? IVORY : NAVY }]}>{exerciseCount}</Text>
            <Text
              style={[
                styles.statLabel,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              EXERCISES
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: isDark ? IVORY : NAVY }]}>{equipment.toUpperCase()}</Text>
            <Text
              style={[
                styles.statLabel,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              EQUIPMENT
            </Text>
          </View>
        </View>

        {/* Primary CTA */}
        <Pressable style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>Start my session</Text>
        </Pressable>

        {/* Secondary link */}
        <Pressable style={styles.altLinkWrap} onPress={handleAlt}>
          <Text
            style={[
              styles.altLinkText,
              { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.65)' },
            ]}
          >
            {planAlt}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  planLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
  },
  planSource: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 22,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 2,
  },
  accentGoldBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: GOLD,
  },
  dayKicker: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: GOLD,
    marginBottom: 6,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 22,
    marginBottom: 20,
  },
  statCol: {
    alignItems: 'flex-start',
  },
  statVal: {
    fontFamily: MONO,
    fontSize: 19,
    fontWeight: '700',
    color: IVORY,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.6,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  startBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  altLinkWrap: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  altLinkText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.6)',
  },
});
