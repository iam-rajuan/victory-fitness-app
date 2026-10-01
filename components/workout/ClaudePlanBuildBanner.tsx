import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';

interface ClaudePlanBuildBannerProps {
  planBuilt?: boolean;
  planBuiltLine?: string;
  hasCoach?: boolean;
  onPress?: () => void;
}

const GOLD = '#C9943A';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';
const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });

export default function ClaudePlanBuildBanner({
  planBuilt = false,
  planBuiltLine = 'Upper Body, Lower Body & Core · 4 sessions',
  hasCoach = true,
  onPress,
}: ClaudePlanBuildBannerProps) {
  const { t } = useLanguage();
  const kicker = hasCoach ? t('YOUR CUSTOMISED PLAN') : t('GOLD FEATURE');
  const title = hasCoach
    ? (planBuilt ? t('Rebuild your plan') : t('Build a plan around your week'))
    : t('A plan built around your week');
  const note = hasCoach
    ? (planBuilt ? planBuiltLine : t('Four questions — goal, days, session length, equipment. Two minutes and you have six weeks.'))
    : t('Four questions and your coach builds six weeks. Part of Gold.');

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.banner,
          hasCoach ? styles.bannerCoach : styles.bannerDashed,
        ]}
        onPress={onPress}
      >
        <View style={styles.textCol}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.note}>{note}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  banner: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 13,
  },
  bannerCoach: {
    backgroundColor: '#0D2B45',
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },
  bannerDashed: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(201, 148, 58, 0.45)',
    backgroundColor: 'rgba(201, 148, 58, 0.05)',
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
    color: 'rgba(247, 243, 238, 0.58)',
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
