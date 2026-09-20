import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';

interface ClaudeHomeHeaderProps {
  name: string;
  streakDays: number;
}

const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeHomeHeader({
  name,
  streakDays,
}: ClaudeHomeHeaderProps) {
  const router = useRouter();

  // Format today's date: "FRIDAY, 8 MAY"
  const formattedDate = React.useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${weekday}, ${day} ${month}`;
  }, []);

  const firstName = name ? name.split(' ')[0] : 'there';

  return (
    <View style={styles.container}>
      {/* Top greeting bar */}
      <View style={styles.topRow}>
        <View style={styles.greetingWrap}>
          <Text style={styles.dateLabel}>{formattedDate}</Text>
          <Text style={styles.greetingTitle}>{`Hello ${firstName},`}</Text>
        </View>

        {/* Streak Pill */}
        <Pressable
          style={styles.streakPill}
          onPress={() => pushRoute(router, '/profile')}
        >
          <View style={styles.goldSquareDot} />
          <Text style={styles.streakNumber}>{streakDays || 12}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingWrap: {
    flex: 1,
    paddingRight: 12,
  },
  dateLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.45)',
    marginBottom: 4,
  },
  greetingTitle: {
    fontFamily: CLASH,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
    color: IVORY,
    letterSpacing: -0.3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.2)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
  },
  goldSquareDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  streakNumber: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: IVORY,
  },
});
