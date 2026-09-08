import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { fetchCurrentUser } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';

interface StreakCardProps {
  onPressStartWorkout?: () => void;
}

export default function StreakCard({ onPressStartWorkout }: StreakCardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [streakDays, setStreakDays] = useState(0);
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);

  const flameOpacity = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    let cancelled = false;

    const loadStreak = async () => {
      try {
        const user = await fetchCurrentUser();
        if (!cancelled && user) {
          setStreakDays(Math.max(Number(user.streak_days ?? 0), 0));
          setWorkoutsCompleted(Math.max(Number(user.workouts_completed ?? 0), 0));
        }
      } catch {
        // Fallback
      }
    };

    void loadStreak();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (streakDays > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(flameOpacity, {
            toValue: 1,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(flameOpacity, {
            toValue: 0.82,
            duration: 1100,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      flameOpacity.setValue(0.5);
    }
  }, [streakDays, flameOpacity]);

  const isAtRisk = streakDays > 0;
  const nextMilestone = streakDays < 3 ? 3 : streakDays < 7 ? 7 : streakDays < 14 ? 14 : streakDays + 7;
  const milestonePct = Math.min(Math.round((streakDays / nextMilestone) * 100), 100);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.streakHeaderLeft}>
          <Animated.View style={[styles.fireCircle, { opacity: flameOpacity }, streakDays === 0 && styles.fireCircleInactive]}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </Animated.View>
          <View style={styles.streakTextCol}>
            <Text style={styles.streakSub} numberOfLines={1}>{t('TRAINING STREAK')}</Text>
            <View style={styles.daysRow}>
              <Text style={styles.streakVal} numberOfLines={1}>{streakDays} {streakDays === 1 ? t('Day') : t('Days')}</Text>
              <Text style={[styles.activeTag, streakDays === 0 && styles.inactiveTag]} numberOfLines={1}>
                • {streakDays > 0 ? t('Active') : t('Inactive')}
              </Text>
            </View>
          </View>
        </View>

        {isAtRisk ? (
          <View style={styles.atRiskBadge}>
            <Ionicons name="time-outline" size={11} color={Colors.copper} />
            <Text
              style={styles.atRiskText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {t('24H WINDOW ACTIVE')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.milestoneSection}>
        <View style={styles.milestoneTextRow}>
          <Text style={styles.milestoneLabel}>
            {t('NEXT MILESTONE: {count} DAYS', { count: nextMilestone })}
          </Text>
          <Text style={styles.milestonePercent}>{milestonePct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${milestonePct}%` }]} />
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerDesc}>
          {streakDays > 0
            ? t('Log a workout within 24 hours to keep your streak burning.')
            : t('Start today to build your streak and unlock milestone badges.')}
        </Text>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (onPressStartWorkout) {
              onPressStartWorkout();
            } else {
              router.push('/workoutplan/strength-plan');
            }
          }}
        >
          <Text style={styles.actionBtnText}>{t('Log Workout')}</Text>
          <Ionicons name="arrow-forward" size={13} color={Colors.obsidian} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    marginBottom: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  streakHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  fireCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(201, 148, 58, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fireEmoji: {
    fontSize: 20,
  },
  streakTextCol: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
  },
  streakSub: {
    color: Colors.gold,
    fontSize: 10.5,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.1,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    flexWrap: 'nowrap',
  },
  streakVal: {
    color: Colors.ivory,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  activeTag: {
    color: Colors.victoryGreen,
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
  },
  inactiveTag: {
    color: Colors.textMuted,
  },
  fireCircleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  atRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(181, 101, 29, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.38)',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 12,
    flexShrink: 0,
  },
  atRiskText: {
    color: Colors.copper,
    fontSize: 9.5,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  milestoneSection: {
    marginBottom: 14,
  },
  milestoneTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  milestoneLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  milestonePercent: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  progressBg: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerDesc: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnText: {
    color: Colors.obsidian,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
});
