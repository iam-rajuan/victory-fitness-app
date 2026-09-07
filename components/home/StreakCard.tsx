import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  const isAtRisk = streakDays > 0;
  const nextMilestone = streakDays < 3 ? 3 : streakDays < 7 ? 7 : streakDays < 14 ? 14 : streakDays + 7;
  const milestonePct = Math.min(Math.round((streakDays / nextMilestone) * 100), 100);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.streakHeaderLeft}>
          <View style={styles.fireCircle}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.streakSub}>{t('TRAINING STREAK')}</Text>
            <View style={styles.daysRow}>
              <Text style={styles.streakVal}>{streakDays} {streakDays === 1 ? t('Day') : t('Days')}</Text>
              <Text style={styles.activeTag}>• {t('Active')}</Text>
            </View>
          </View>
        </View>

        {isAtRisk ? (
          <View style={styles.atRiskBadge}>
            <Ionicons name="time-outline" size={12} color="#FDE047" />
            <Text style={styles.atRiskText}>{t('24H WINDOW ACTIVE')}</Text>
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
          <Ionicons name="arrow-forward" size={13} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161928',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.28)',
    marginBottom: 20,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireEmoji: {
    fontSize: 22,
  },
  streakSub: {
    color: '#F97316',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  streakVal: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  activeTag: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  atRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  atRiskText: {
    color: '#FDE047',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
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
    color: '#F97316',
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
    backgroundColor: '#F97316',
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
});
