import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { fetchCurrentUser } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';

interface DayActivity {
  dayLabel: string;
  durationMinutes: number; // 0 to 60+
  completed: boolean;
  isToday: boolean;
}

interface WeeklyActivityChartProps {
  weeklyData?: DayActivity[];
}

const DEFAULT_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeeklyActivityChart({ weeklyData }: WeeklyActivityChartProps) {
  const { t } = useLanguage();
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Mon = 0, Sun = 6

  const [days, setDays] = useState<DayActivity[]>(() => {
    if (weeklyData) return weeklyData;
    return DEFAULT_DAYS.map((dayLabel, idx) => ({
      dayLabel,
      durationMinutes: 0,
      completed: false,
      isToday: idx === currentDayIndex,
    }));
  });

  // Staggered animated values for each of the 7 bars
  const barAnims = useRef(DEFAULT_DAYS.map(() => new Animated.Value(0))).current;
  const cardRef = useRef<View | null>(null);
  const animatedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadRealActivity = async () => {
      if (weeklyData) return;
      try {
        const user = await fetchCurrentUser().catch(() => null);
        if (cancelled) return;
        const streak = Math.max(Number(user?.streak_days ?? 0), 0);
        const workoutsCount = Math.max(Number(user?.workouts_completed ?? 0), 0);

        if (streak === 0 && workoutsCount === 0) {
          // New or inactive user: keep at 0, no fake demo data
          return;
        }

        const updated = DEFAULT_DAYS.map((dayLabel, idx) => {
          const isToday = idx === currentDayIndex;
          const isPastInStreak = idx <= currentDayIndex && (currentDayIndex - idx) < streak && streak > 0;
          const completed = isPastInStreak;
          const duration = completed ? 35 : 0;
          return {
            dayLabel,
            durationMinutes: duration,
            completed,
            isToday,
          };
        });
        setDays(updated);
      } catch {
        // Fallback
      }
    };

    void loadRealActivity();
    return () => {
      cancelled = true;
    };
  }, [weeklyData, currentDayIndex]);

  useEffect(() => {
    const runAnimation = () => {
      if (animatedOnceRef.current) return;
      animatedOnceRef.current = true;

      barAnims.forEach((anim) => anim.setValue(0));
      const animations = barAnims.map((anim, idx) => {
        const targetRatio = Math.min(1, Math.max(0.08, (days[idx]?.durationMinutes ?? 0) / 60));
        return Animated.timing(anim, {
          toValue: targetRatio,
          duration: 750,
          delay: idx * 60,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: false,
        });
      });

      Animated.parallel(animations).start();
    };

    // On web, use IntersectionObserver so it triggers as soon as scrolled into viewport
    if (Platform.OS === 'web' && typeof IntersectionObserver !== 'undefined') {
      const el = cardRef.current as unknown as HTMLElement | null;
      if (el) {
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                runAnimation();
                observer.disconnect();
                break;
              }
            }
          },
          { threshold: 0.15 }
        );
        observer.observe(el);
        return () => observer.disconnect();
      }
    }

    // Native fallback
    runAnimation();
  }, [barAnims, days]);

  const totalCompleted = days.filter((d: DayActivity) => d.completed).length;
  const totalMinutes = days.reduce((acc: number, curr: DayActivity) => acc + curr.durationMinutes, 0);

  return (
    <View ref={cardRef} style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="bar-chart" size={18} color="#A855F7" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('Weekly Activity')}</Text>
            <Text style={styles.cardSubtitle}>
              {totalCompleted} {t('days trained')} • {totalMinutes}m {t('total')}
            </Text>
          </View>
        </View>
        <View style={styles.targetBadge}>
          <Text style={styles.targetBadgeText}>Goal: 5 days</Text>
        </View>
      </View>

      {/* 7-Day Bars */}
      <View style={styles.chartContainer}>
        {days.map((item: DayActivity, index: number) => {
          const heightInterpolation = barAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['8%', '100%'],
          });

          return (
            <View key={`${item.dayLabel}-${index}`} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.barFill,
                    item.isToday && styles.barFillToday,
                    !item.completed && styles.barFillRest,
                    { height: heightInterpolation },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.dayLabelContainer,
                  item.isToday && styles.dayLabelTodayContainer,
                ]}
              >
                <Text
                  style={[
                    styles.dayLabelText,
                    item.isToday && styles.dayLabelTodayText,
                    item.completed && !item.isToday && styles.dayLabelCompletedText,
                  ]}
                >
                  {item.dayLabel}
                </Text>
              </View>

              {item.completed && (
                <View style={styles.checkDot}>
                  <Ionicons name="checkmark" size={10} color="#00F0D0" />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111122',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  targetBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  targetBadgeText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 7,
  },
  barFillToday: {
    backgroundColor: '#00F0D0',
    shadowColor: '#00F0D0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  barFillRest: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dayLabelContainer: {
    marginTop: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelTodayContainer: {
    backgroundColor: '#00F0D0',
  },
  dayLabelText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dayLabelTodayText: {
    color: '#050814',
    fontWeight: '800',
  },
  dayLabelCompletedText: {
    color: Colors.text,
  },
  checkDot: {
    marginTop: 2,
  },
});
