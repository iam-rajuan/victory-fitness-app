import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';
import { canonicalizeFitnessText } from '../../lib/workoutTerminology';

interface ClaudeTodayWorkoutCardProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
  workoutTitle?: string;
  durationMinutes?: number;
  exerciseCount?: number;
  equipment?: string;
  isPlanBuilt?: boolean;
  hasActivePlan?: boolean;
  isGeneratingPlan?: boolean;
  onStartSession?: () => void;
  onAdjustPlan?: () => void;
  onCreatePlan?: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

export default function ClaudeTodayWorkoutCard({
  tier,
  workoutTitle = 'Workout',
  durationMinutes = 0,
  exerciseCount = 0,
  equipment = '',
  isPlanBuilt = false,
  hasActivePlan = true,
  isGeneratingPlan = false,
  onStartSession,
  onAdjustPlan,
  onCreatePlan,
}: ClaudeTodayWorkoutCardProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const hasCoach = tier !== 'SILVER' && tier !== 'NONE';

  const planLabel = !hasActivePlan
    ? t('YOUR PLAN')
    : hasCoach
    ? (isPlanBuilt ? t('YOUR NEW PLAN · WEEK 1 OF 6') : t('YOUR PLAN · WEEK 2 OF 6'))
    : t("TODAY'S WORKOUT");
  const planSource = hasCoach ? t('BUILT BY YOUR COACH') : t('VIDEO · FROM THE LIBRARY');
  const planDayLine = hasCoach
    ? (isPlanBuilt ? t('DAY 1 OF WEEK 1 · {duration} MIN', { duration: durationMinutes }) : t('DAY 3 OF WEEK 2 · {duration} MIN', { duration: durationMinutes }))
    : t('PICKED FOR TODAY · {duration} MIN', { duration: durationMinutes });
  const planAlt = hasCoach ? t('Adjust this plan with your coach') : t('Pick a different video instead');

  const resolvedTitle = hasActivePlan ? canonicalizeFitnessText(workoutTitle) : t('Create your 7 day workout plan');

  // Dynamically compute font size to ensure the title always stays on 1 line across screen sizes and languages
  const titleFontSize = useMemo(() => {
    const textLen = (resolvedTitle || '').length;
    if (!textLen) return 20;
    const effectiveWidth = Math.max(220, Math.min(windowWidth || 375, 520) - 94);
    const factor = 0.55;
    const fitted = Math.floor(effectiveWidth / (textLen * factor));
    return Math.min(20, Math.max(12, fitted));
  }, [resolvedTitle, windowWidth]);

  const formattedEquipment = useMemo(() => {
    if (!equipment) return 'Bodyweight';
    const parts = equipment
      .split(/[,·+]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return 'Bodyweight';
    return parts
      .map((p) => canonicalizeFitnessText(p))
      .join(' · ');
  }, [equipment]);

  const handleStart = () => {
    if (!hasActivePlan) {
      onCreatePlan?.();
      return;
    }
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

        <Text style={[styles.dayKicker, { color: isDark ? GOLD : '#B5651D' }]}>
          {hasActivePlan ? planDayLine : t('READY WHEN YOU ARE')}
        </Text>
        <Text
          style={[
            styles.title,
            {
              color: isDark ? IVORY : NAVY,
              fontSize: titleFontSize,
              lineHeight: Math.max(18, Math.round(titleFontSize * 1.25)),
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {resolvedTitle}
        </Text>

        {/* Stats bar */}
        {hasActivePlan ? (
          <View
            style={[
              styles.statsBar,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(13, 43, 69, 0.05)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(13, 43, 69, 0.1)',
              },
            ]}
          >
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: isDark ? IVORY : NAVY }]}>
                {durationMinutes}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.5)' },
                ]}
              >
                {t('MINUTES')}
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(13, 43, 69, 0.1)' },
              ]}
            />

            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color: isDark ? IVORY : NAVY }]}>
                {exerciseCount}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.5)' },
                ]}
              >
                {t('EXERCISES')}
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(13, 43, 69, 0.1)' },
              ]}
            />

            <View style={[styles.statCol, styles.equipmentStatCol]}>
              <Text
                style={[styles.equipmentVal, { color: isDark ? IVORY : NAVY }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {formattedEquipment}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.5)' },
                ]}
              >
                {t('EQUIPMENT')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Primary CTA */}
        <Pressable style={[styles.startBtn, isGeneratingPlan && styles.startBtnDisabled]} onPress={handleStart} disabled={isGeneratingPlan}>
          <Text style={styles.startBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {hasActivePlan ? t('Start my session') : isGeneratingPlan ? t('Generating plan...') : t('Build my plan')}
          </Text>
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
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 14,
    letterSpacing: -0.3,
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap',
      },
    }),
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  statCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  statDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  equipmentStatCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statVal: {
    fontFamily: CLASH,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
    color: IVORY,
  },
  equipmentVal: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: IVORY,
    textAlign: 'center',
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap',
      },
    }),
  },
  statLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  startBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnDisabled: {
    opacity: 0.72,
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
