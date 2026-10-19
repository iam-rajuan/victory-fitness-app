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
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });

export function formatPlanSummaryLine(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) return '';
  if (raw.length <= 50 && (raw.includes('·') || raw.includes('•') || raw.includes('|'))) {
    return raw;
  }

  const daysMatch = raw.match(/(\d+)\s*(?:main\s*)?(?:training\s*)?days/i) || raw.match(/(\d+)\s*sessions?/i);
  const minsMatch = raw.match(/(?:around|~)?\s*(\d+)\s*min(?:ute)?s?/i);

  let focus = '';
  const focusMatch = raw.match(/focused on\s+([^,.]+)/i) || raw.match(/(?:using a|with a)\s+([^,.]+?)\s+split/i);
  if (focusMatch) {
    focus = focusMatch[1].replace(/plan/i, '').trim();
  } else {
    const goalMatch = raw.match(/^([A-Za-z\s]+?)\s+plan/i);
    if (goalMatch) {
      focus = goalMatch[1].trim();
    }
  }

  const parts: string[] = [];
  if (focus) {
    const cleanedFocus = focus.replace(/full-body/i, 'Full Body').trim();
    parts.push(cleanedFocus);
  }
  if (daysMatch) {
    parts.push(`${daysMatch[1]} days/week`);
  }
  if (minsMatch) {
    parts.push(`~${minsMatch[1]} min`);
  }

  if (parts.length >= 2) {
    return parts.join(' · ');
  }

  return raw
    .replace(/^([A-Za-z\s]+?)\s+plan focused on\s+/i, '')
    .replace(/using a\s+[A-Za-z\s-]+\s+split with\s+/i, '')
    .trim();
}

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
  const rawNote = hasCoach
    ? (planBuilt ? formatPlanSummaryLine(planBuiltLine) : t('Four questions — goal, days, session length, equipment. Two minutes and you have six weeks.'))
    : t('Four questions and your coach builds six weeks. Part of Gold.');
  const note = rawNote;

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
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
          <Text style={styles.note} numberOfLines={2} ellipsizeMode="tail">{note}</Text>
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
    fontFamily: DMSANS,
    fontSize: 16.5,
    lineHeight: 22,
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
