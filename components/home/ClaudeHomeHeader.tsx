import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeHomeHeaderProps {
  name: string;
  streakDays: number;
}

const GOLD = '#C9943A';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeHomeHeader({
  name,
  streakDays,
}: ClaudeHomeHeaderProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

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
      {/* Left: Date & Greeting */}
      <View style={styles.greetingWrap}>
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {formattedDate}
        </Text>
        <Text style={[styles.greetingTitle, { color: colors.text }]}>
          {`Hello ${firstName},`}
        </Text>
      </View>

      {/* Right: Streak Pill */}
      <Pressable
        style={[
          styles.streakPill,
          {
            borderColor: isDark ? 'rgba(247, 243, 238, 0.2)' : 'rgba(13, 43, 69, 0.12)',
            backgroundColor: isDark ? 'rgba(13, 43, 69, 0.6)' : '#FFFFFF',
          },
        ]}
        onPress={() => pushRoute(router, '/profile')}
      >
        <View style={styles.goldSquareDot} />
        <Text style={[styles.streakNumber, { color: colors.text }]}>
          {streakDays || 12}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
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
    marginBottom: 4,
  },
  greetingTitle: {
    fontFamily: CLASH,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
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
  },
});

