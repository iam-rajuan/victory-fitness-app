import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { Fonts } from '../../../constants/Typography';
import { fetchStrengthWorkoutPlans, StrengthPlanResponse } from '../../../lib/workout-plans';
import { useModuleAccessGuard } from '../../../lib/useModuleAccessGuard';
import { useLanguage } from '../../../lib/i18n';

export default function StrengthPlanDetailScreen() {
  const checkingAccess = useModuleAccessGuard('/workoutplan');
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = typeof params.planId === 'string' ? params.planId : '';
  const [plans, setPlans] = useState<StrengthPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const plan = useMemo(() => plans.find((item) => item.plan_id === planId) ?? null, [plans, planId]);
  const dayLabels = useMemo(() => (plan?.days?.length ? plan.days.map((day) => day.day) : ['Mon']), [plan]);
  const [selectedDay, setSelectedDay] = useState(dayLabels[0] ?? 'Mon');
  const selectedPlanDay = plan?.days?.find((day) => day.day === selectedDay) ?? plan?.days?.[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      try {
        const response = await fetchStrengthWorkoutPlans();
        if (!cancelled) {
          setPlans(response);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (dayLabels.length > 0 && !dayLabels.includes(selectedDay)) {
      setSelectedDay(dayLabels[0]);
    }
  }, [dayLabels, selectedDay]);

  if (checkingAccess) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('CUSTOM STRENGTH PLAN'),
          headerTransparent: true,
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: Fonts.heading, fontSize: 13, letterSpacing: 2, color: Colors.ivory } as any,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingStateText}>{t('Loading your custom strength plan...')}</Text>
        </View>
      ) : !plan || !selectedPlanDay ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{t('Custom strength plan not found')}</Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={() => router.replace('/workoutplan/strength-plan')}>
            <Text style={styles.emptyStateButtonText}>{t('Back to Plans')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topSection}>
            <Text style={styles.welcomeText}>{plan.summary}</Text>
            <Text style={styles.dateText}>
              {selectedPlanDay ? `Day ${dayLabels.indexOf(selectedPlanDay.day) + 1}: ${selectedPlanDay.title}` : t('No generated plan')}
            </Text>
          </View>

          <View style={styles.daySelectorContainer}>
            <View style={styles.daySelector}>
              {dayLabels.map((day) => {
                const isActive = selectedDay === day;
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={[styles.dayBtn, isActive && styles.dayBtnActive]}
                  >
                    <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day}</Text>
                    {isActive && <View style={styles.activeDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{t('EST. TIME')}</Text>
              <Text style={styles.statValue}>{selectedPlanDay.est_time ?? '-'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{t('VOLUME')}</Text>
              <Text style={styles.statValue}>{selectedPlanDay.volume ?? '-'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{t('INTENSITY')}</Text>
              <Text style={styles.statValue}>{selectedPlanDay.intensity ?? '-'}</Text>
            </View>
          </View>

          <Text style={styles.sectionHeader}>{t("TODAY'S EXERCISES")}</Text>
          <View style={styles.exerciseList}>
            {(selectedPlanDay.exercises ?? []).map((ex) => (
              <View key={ex.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View>
                    <Text style={styles.exerciseType}>{ex.type.toUpperCase()}</Text>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                  </View>
                  <TouchableOpacity style={styles.infoIcon}>
                    <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </View>

                <View style={styles.exerciseMetrics}>
                  <View style={styles.metricItem}>
                    <Ionicons name="layers-outline" size={14} color={Colors.gold} />
                    <Text style={styles.metricValue}>{ex.sets} {t('Sets')}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="repeat-outline" size={14} color={Colors.gold} />
                    <Text style={styles.metricValue}>{ex.reps} {t('Reps')}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="fitness-outline" size={14} color={Colors.gold} />
                    <Text style={styles.metricValue}>{ex.weight}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="timer-outline" size={14} color={Colors.gold} />
                    <Text style={styles.metricValue}>{ex.rest} {t('Rest')}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.obsidian,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  loadingStateText: {
    color: Colors.ivory,
    fontSize: 15,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    color: Colors.ivory,
    fontSize: 20,
    fontFamily: Fonts.display,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  emptyStateButtonText: {
    color: Colors.obsidian,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 120,
  },
  topSection: {
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  welcomeText: {
    color: Colors.copper,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    marginBottom: 4,
  },
  dateText: {
    color: Colors.ivory,
    fontSize: 22,
    fontFamily: Fonts.display,
  },
  daySelectorContainer: {
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 43, 69, 0.45)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
    gap: 4,
  },
  dayBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  dayBtnActive: {
    backgroundColor: Colors.gold,
  },
  dayText: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  dayTextActive: {
    color: Colors.obsidian,
    fontFamily: Fonts.heading,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.obsidian,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 43, 69, 0.45)',
    marginHorizontal: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: Colors.copper,
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: Colors.ivory,
    fontSize: 15,
    fontFamily: Fonts.dataBold,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(181, 101, 29, 0.2)',
  },
  sectionHeader: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  exerciseList: {
    paddingHorizontal: 14,
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.22)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  exerciseType: {
    color: Colors.copper,
    fontSize: 9,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  exerciseName: {
    color: Colors.ivory,
    fontSize: 16,
    fontFamily: Fonts.display,
    lineHeight: 22,
  },
  infoIcon: {
    padding: 4,
  },
  exerciseMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.2)',
  },
  metricValue: {
    color: Colors.ivory,
    fontSize: 12,
    fontFamily: Fonts.data,
  },
});
