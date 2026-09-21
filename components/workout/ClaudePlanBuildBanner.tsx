import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ClaudePlanBuildBannerProps {
  planBuilt?: boolean;
  planBuiltLine?: string;
  hasCoach?: boolean;
  onPress?: () => void;
}

const GOLD = '#C9943A';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';
const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudePlanBuildBanner({
  planBuilt = false,
  planBuiltLine = 'Get stronger · Mon, Wed, Fri · 40 min · built around dumbbells.',
  hasCoach = true,
  onPress,
}: ClaudePlanBuildBannerProps) {
  const { colors } = useTheme();

  if (!hasCoach) {
    return null;
  }

  const kicker = planBuilt ? 'YOUR CUSTOM PLAN · SIX WEEKS' : 'CUSTOM PLAN · BUILT AROUND YOU';
  const title = planBuilt ? 'Your plan is active' : 'Build a 6-week plan with your coach';
  const note = planBuilt ? planBuiltLine : 'Four questions: your goal, your days, your time and your kit.';

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.banner, planBuilt && styles.bannerActive]}
        onPress={onPress}
      >
        <View style={styles.textCol}>
          <Text style={[styles.kicker, planBuilt && styles.kickerGreen]}>{kicker}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  banner: {
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.45)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(201, 148, 58, 0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bannerActive: {
    borderColor: GREEN,
    backgroundColor: 'rgba(26, 122, 74, 0.1)',
  },
  textCol: {
    flex: 1,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 5,
  },
  kickerGreen: {
    color: GREEN,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '600',
    color: IVORY,
  },
  note: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.6)',
    marginTop: 4,
  },
  arrow: {
    fontFamily: DMSANS,
    fontSize: 18,
    fontWeight: '700',
    color: GOLD,
    paddingHorizontal: 2,
  },
});
