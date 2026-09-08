import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';
import {
  createStrengthWorkoutPlan,
  fetchLatestStrengthWorkoutPlan,
  loadLatestStrengthWorkoutPlan,
  loadLatestVideoWorkoutPlan,
  StrengthPlanResponse,
  VideoPlanResponse,
} from '../../lib/workout-plans';
import { fetchCurrentUserBodyMetrics, fetchCurrentUserOnboarding } from '../../lib/api';

type WorkoutSectionProps = {
  canAccessWorkoutPlans?: boolean;
  onRestrictedPress?: (sectionName: string) => void;
};

function getPlanDisplayData(summary: string, defaultTitle: string) {
  if (!summary) return { title: defaultTitle, description: '' };
  
  const cleanSummary = summary.replace(/\s+/g, ' ').trim();
  
  const match = cleanSummary.match(/^(.*?)\s+plan\s+using\s+a\s+(.*)$/i) || 
                cleanSummary.match(/^(.*?)\s+plan\s+with\s+(.*)$/i) ||
                cleanSummary.match(/^(.*?)\s+built\s+for\s+(.*)$/i);
                
  if (match) {
    const rawTitle = match[1];
    let rawDesc = match[2];
    
    const title = rawTitle
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') + ' Plan';
      
    const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
    
    return { title, description };
  }
  
  const words = cleanSummary.split(' ');
  if (words.length > 3) {
    const title = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') + ' Plan';
    const description = words.slice(3).join(' ');
    return { title, description };
  }
  
  return { title: cleanSummary, description: '' };
}

export default function WorkoutSection({
  canAccessWorkoutPlans = false,
  onRestrictedPress,
}: WorkoutSectionProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [strengthPlan, setStrengthPlan] = useState<StrengthPlanResponse | null>(null);
  const [videoPlan, setVideoPlan] = useState<VideoPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingPlan, setIsStartingPlan] = useState(false);

  const handleStartPlan = async () => {
    if (strengthPlan) {
      router.push('/workoutplan/strength-plan');
      return;
    }
    if (videoPlan) {
      router.push('/workoutplan/video-plan');
      return;
    }

    setIsStartingPlan(true);
    try {
      const [onboarding, metrics] = await Promise.all([
        fetchCurrentUserOnboarding().catch(() => null),
        fetchCurrentUserBodyMetrics().catch(() => null),
      ]);

      const goal = onboarding?.anamnese?.primaryGoal;
      const mappedGoal =
        goal === 'Build muscle' ? 'HYPERTROPHY' :
        goal === 'Improve endurance' ? 'POWER & SPEED' :
        goal === 'Lose weight' ? 'BODY RECOMP' : 'PURE STRENGTH';

      const equip = onboarding?.anamnese?.equipmentAccess;
      const mappedEquip =
        equip === 'No equipment' ? ['Bodyweight Only'] :
        equip === 'Home gym' ? ['Dumbbells', 'Bench', 'Resistance Bands', 'Pull-up Bar'] :
        ['Barbell', 'Dumbbells', 'Cable Machine', 'Gym Machines', 'Squat Rack', 'Bench'];

      const days = onboarding?.anamnese?.daysPerWeek;
      const mappedFreq = days === '1-2 days' ? '2' : days === '5+ days' ? '5' : '4';

      await createStrengthWorkoutPlan({
        goal: mappedGoal,
        level: 'INTERMEDIATE',
        split: 'FULL BODY',
        height: String(onboarding?.personalProfile?.height || metrics?.height || '175'),
        gender: String(onboarding?.personalProfile?.gender || metrics?.gender || 'Male'),
        bench: '',
        squat: '',
        deadlift: '',
        equipment: mappedEquip,
        frequency: mappedFreq,
        days: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        age: String(onboarding?.personalProfile?.age || metrics?.age || '25'),
        weight: String(onboarding?.personalProfile?.weight || metrics?.weight || '75'),
      });

      router.push('/workoutplan/strength-plan');
    } catch {
      router.push('/workoutplan/strength-wizard');
    } finally {
      setIsStartingPlan(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      if (!canAccessWorkoutPlans) {
        setStrengthPlan(null);
        setVideoPlan(null);
        setLoading(false);
        return;
      }

      try {
        const [latestStrength, latestVideo] = await Promise.all([
          fetchLatestStrengthWorkoutPlan().catch(() => loadLatestStrengthWorkoutPlan()),
          loadLatestVideoWorkoutPlan().catch(() => null),
        ]);
        if (!cancelled) {
          setStrengthPlan(latestStrength);
          setVideoPlan(latestVideo);
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
  }, [canAccessWorkoutPlans]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  const hasPlan = Boolean(strengthPlan || videoPlan);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {hasPlan ? t('YOUR ACTIVE PLAN') : t('NEXT UP: YOUR WORKOUT')}
      </Text>

      {canAccessWorkoutPlans ? (
        hasPlan ? (
          <View style={styles.plansContainer}>
            {strengthPlan ? (() => {
              const totalDays = strengthPlan.days?.length || 0;
              const completedDays = strengthPlan.progress?.filter((p) => p.completed).length || 0;
              const progressPercent = totalDays > 0 ? completedDays / totalDays : 0;
              const display = getPlanDisplayData(strengthPlan.summary, t('Custom Strength Plan'));

              return (
                <View style={styles.planCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardEyebrow}>{t('CUSTOM STRENGTH PLAN')}</Text>
                    <Ionicons name="barbell-outline" size={16} color={Colors.primary} />
                  </View>
                  <Text style={styles.planTitle} numberOfLines={1}>{display.title}</Text>
                  {display.description ? (
                    <Text style={styles.planDescription} numberOfLines={2}>{display.description}</Text>
                  ) : null}
                  
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>
                      {completedDays} {t('of')} {totalDays} {totalDays === 1 ? t('Day') : t('Days')} {t('Completed')}
                    </Text>
                    <Text style={styles.progressPercent}>{Math.round(progressPercent * 100)}%</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progressPercent * 100}%` }]} />
                  </View>

                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => router.push('/workoutplan/strength-plan')}
                  >
                    <Text style={styles.actionBtnText}>{completedDays === 0 ? t('START PLAN') : t('RESUME WORKOUT')}</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.obsidian} style={styles.actionBtnIcon} />
                  </TouchableOpacity>
                </View>
              );
            })() : null}

            {videoPlan ? (() => {
              const activeDays = videoPlan.days?.filter((day) => day.workouts_count > 0).length || 0;
              const progressPercent = activeDays / 7;
              const display = getPlanDisplayData(videoPlan.summary, t('7-Day Video Plan'));

              return (
                <View style={styles.planCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardEyebrow}>{t('7-DAY VIDEO PLAN')}</Text>
                    <Ionicons name="play-outline" size={16} color={Colors.primary} />
                  </View>
                  <Text style={styles.planTitle} numberOfLines={1}>{display.title}</Text>
                  {display.description ? (
                    <Text style={styles.planDescription} numberOfLines={2}>{display.description}</Text>
                  ) : null}

                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>
                      {activeDays} {t('Active')} {activeDays === 1 ? t('Day') : t('Days')}
                    </Text>
                    <Text style={styles.progressPercent}>{Math.round(progressPercent * 100)}%</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progressPercent * 100}%` }]} />
                  </View>

                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => router.push('/workoutplan/video-plan')}
                  >
                    <Text style={styles.actionBtnText}>{t('RESUME VIDEO PLAN')}</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.obsidian} style={styles.actionBtnIcon} />
                  </TouchableOpacity>
                </View>
              );
            })() : null}
          </View>
        ) : (
          <View style={styles.workoutCardFallback}>
            <Text style={styles.workoutHeading}>{t('NO PLAN? NO PROBLEM.')}</Text>
            <Text style={styles.workoutDesc}>
              {t('Launch your personalized plan tailored from your onboarding goals, or choose a custom split.')}
            </Text>
            <View style={styles.workoutFallbackButtons}>
              <TouchableOpacity 
                style={[styles.workoutBtnPrimary, { backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
                onPress={() => void handleStartPlan()}
                disabled={isStartingPlan}
              >
                {isStartingPlan ? (
                  <ActivityIndicator size="small" color={Colors.obsidian} />
                ) : (
                  <>
                    <Ionicons name="play" size={16} color={Colors.obsidian} style={{ marginRight: 6 }} />
                    <Text style={styles.workoutBtnPrimaryText}>{t('START PLAN')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.workoutBtnOutline}
                onPress={() => router.push('/workoutplan/video-wizard')}
              >
                <Text style={styles.workoutBtnOutlineText}>{t('7-DAY VIDEO PLAN')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.workoutBtnOutline}
                onPress={() => router.push('/workoutplan/strength-wizard')}
              >
                <Text style={styles.workoutBtnOutlineText}>{t('CUSTOM STRENGTH PLAN')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        <View style={styles.workoutCardFallback}>
          <Text style={styles.workoutHeading}>{t('WORKOUT LIBRARY READY.')}</Text>
          <Text style={styles.workoutDesc}>
            {t('Your current plan includes the workout library. Upgrade to unlock custom workout plans.')}
          </Text>
          <TouchableOpacity
            style={styles.workoutBtnPrimary}
            onPress={() => onRestrictedPress?.('Workout Plans')}
          >
            <Text style={styles.workoutBtnPrimaryText}>{t('UNLOCK WORKOUT PLANS')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.1,
  },
  planTitle: {
    color: Colors.ivory,
    fontSize: 20,
    fontFamily: Fonts.display,
    marginBottom: 6,
  },
  planDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.body,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  progressPercent: {
    color: Colors.gold,
    fontSize: 13,
    fontFamily: Fonts.dataBold,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  actionBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  actionBtnIcon: {
    marginLeft: 2,
  },
  workoutCardFallback: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  workoutHeading: {
    fontSize: 20,
    color: Colors.ivory,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Fonts.display,
    textTransform: 'uppercase',
  },
  workoutDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: Fonts.body,
  },
  workoutFallbackButtons: {
    width: '100%',
    gap: 10,
  },
  workoutBtnPrimary: {
    width: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  workoutBtnPrimaryText: {
    color: Colors.obsidian,
    fontSize: 13,
    letterSpacing: 0.5,
    fontFamily: Fonts.heading,
  },
  workoutBtnOutline: {
    width: '100%',
    backgroundColor: Colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
  },
  workoutBtnOutlineText: {
    color: Colors.ivory,
    fontSize: 13,
    letterSpacing: 0.5,
    fontFamily: Fonts.heading,
  },
});
