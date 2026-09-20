import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';

interface ClaudeTodayWorkoutCardProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
  workoutTitle?: string;
  durationMinutes?: number;
  exerciseCount?: number;
  equipment?: string;
  onStartSession?: () => void;
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
  exerciseCount = 7,
  equipment = 'DUMBBELLS',
  onStartSession,
}: ClaudeTodayWorkoutCardProps) {
  const router = useRouter();
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
        <Text style={styles.planLabel}>{planLabel}</Text>
        <Text style={[styles.planSource, hasCoach && styles.planSourceCoach]}>{planSource}</Text>
      </View>

      {/* Main card */}
      <View style={styles.card}>
        <View style={styles.accentGoldBar} />

        <Text style={styles.dayKicker}>{planDayLine}</Text>
        <Text style={styles.title}>{workoutTitle}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{durationMinutes}</Text>
            <Text style={styles.statLabel}>MINUTES</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{exerciseCount}</Text>
            <Text style={styles.statLabel}>EXERCISES</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{equipment.toUpperCase()}</Text>
            <Text style={styles.statLabel}>EQUIPMENT</Text>
          </View>
        </View>

        {/* Primary CTA */}
        <Pressable style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>Start my session</Text>
        </Pressable>

        {/* Secondary link */}
        <Pressable style={styles.altLinkWrap} onPress={handleAlt}>
          <Text style={styles.altLinkText}>{planAlt}</Text>
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
    color: 'rgba(247, 243, 238, 0.42)',
  },
  planSource: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: 'rgba(247, 243, 238, 0.42)',
  },
  planSourceCoach: {
    color: GOLD,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 22,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
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
