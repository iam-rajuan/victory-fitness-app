import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { fetchCurrentUser, fetchCurrentUserBodyMetrics } from '../../lib/api';
import {
  getLatestNutritionPlan,
  updateNutritionMealCompletion,
  calculateProteinTarget,
  STARTER_MEAL_PLAN,
  NutritionDayPlan,
} from '../../lib/nutrition';
import { useLanguage } from '../../lib/i18n';

const PLAN_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function getTodayPlanDay(): string {
  const dayIndex = new Date().getDay();
  return PLAN_DAYS[(dayIndex + 6) % 7];
}

interface ProteinRingCardProps {
  onPressLogMeal?: () => void;
}

export default function ProteinRingCard({ onPressLogMeal }: ProteinRingCardProps) {
  const router = useRouter();
  const { t } = useLanguage();

  // Zero by default: NO demo data!
  const [proteinTarget, setProteinTarget] = useState(112);
  const [proteinConsumed, setProteinConsumed] = useState(0);
  const [caloriesTarget, setCaloriesTarget] = useState(2100);
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);

  const [todayPlan, setTodayPlan] = useState<NutritionDayPlan | typeof STARTER_MEAL_PLAN['Mon'] | null>(null);
  const [todayCompletions, setTodayCompletions] = useState<Record<string, boolean>>({});
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [updatingMealKey, setUpdatingMealKey] = useState<string | null>(null);

  const loadTargets = useCallback(async () => {
    try {
      const todayKey = getTodayPlanDay();
      const [user, metrics, plan] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        fetchCurrentUserBodyMetrics().catch(() => null),
        getLatestNutritionPlan({ forceRefresh: true }).catch(() => null),
      ]);

      const weightKg = Number(metrics?.weight) || Number((user as any)?.weight) || 70;
      const calcProtein = calculateProteinTarget(weightKg, (user as any)?.goal || (plan?.profile as any)?.goal);
      const targetP = plan?.daily_protein_target || user?.daily_protein_target || calcProtein.target || 112;
      setProteinTarget(targetP);

      const resolvedDayPlan =
        plan?.days?.find((d) => d.day === todayKey) ||
        STARTER_MEAL_PLAN[todayKey] ||
        STARTER_MEAL_PLAN['Mon'];
      setTodayPlan(resolvedDayPlan);

      const dayMeals = Object.entries(resolvedDayPlan || {}).filter(
        ([k, v]) => k !== 'day' && v && typeof v === 'object' && typeof (v as any).kcal === 'number'
      );
      const targetKcal = dayMeals.reduce((sum, [_, m]: any) => sum + (m.kcal || 0), 0) || 2100;
      setCaloriesTarget(targetKcal);

      const dayCompletions = (plan?.meal_completions?.[todayKey] as Record<string, boolean>) || {};
      setTodayCompletions(dayCompletions);

      let p = 0;
      let kcal = 0;
      dayMeals.forEach(([key, meal]: any) => {
        if (dayCompletions[key]) {
          p += meal.p || 0;
          kcal += meal.kcal || 0;
        }
      });

      setProteinConsumed(p);
      setCaloriesConsumed(kcal);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const handleToggleMeal = async (mealKey: string) => {
    if (updatingMealKey) return;
    const todayKey = getTodayPlanDay();
    const currentlyCompleted = Boolean(todayCompletions[mealKey]);
    const nextCompleted = !currentlyCompleted;

    setUpdatingMealKey(mealKey);
    try {
      await updateNutritionMealCompletion({
        day: todayKey,
        meal_key: mealKey,
        completed: nextCompleted,
      });

      const nextDayCompletions = {
        ...todayCompletions,
        [mealKey]: nextCompleted,
      };
      setTodayCompletions(nextDayCompletions);

      const dayMeals = Object.entries(todayPlan || {}).filter(
        ([k, v]) => k !== 'day' && v && typeof v === 'object' && typeof (v as any).kcal === 'number'
      );
      let p = 0;
      let kcal = 0;
      dayMeals.forEach(([key, meal]: any) => {
        if (nextDayCompletions[key]) {
          p += meal.p || 0;
          kcal += meal.kcal || 0;
        }
      });
      setProteinConsumed(p);
      setCaloriesConsumed(kcal);
    } catch {
      Alert.alert(t('Error'), t('Unable to update meal completion right now.'));
    } finally {
      setUpdatingMealKey(null);
    }
  };

  const proteinRatio = Math.min(Math.max(proteinConsumed / (proteinTarget || 1), 0), 1);
  const caloriesRatio = Math.min(Math.max(caloriesConsumed / (caloriesTarget || 1), 0), 1);

  const proteinPct = Math.round(proteinRatio * 100);
  const caloriesPct = Math.round(caloriesRatio * 100);

  // SVG parameters for concentric rings
  const size = 160;
  const strokeWidth = 10;
  const outerRadius = 66;
  const innerRadius = 50;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const outerOffset = outerCircumference * (1 - caloriesRatio);
  const innerOffset = innerCircumference * (1 - proteinRatio);

  const todayKey = getTodayPlanDay();
  const mealKeyLabels: Record<string, { label: string; icon: string }> = {
    breakfast: { label: t('Breakfast'), icon: '🍳' },
    lunch: { label: t('Lunch'), icon: '🥗' },
    pre_workout: { label: t('Pre-Workout'), icon: '⚡' },
    post_workout: { label: t('Post-Workout'), icon: '💪' },
    dinner: { label: t('Dinner'), icon: '🍲' },
    snack: { label: t('Snack'), icon: '🍎' },
  };

  const dayMealsForItems = Object.entries(todayPlan || {}).filter(
    ([k, v]) => k !== 'day' && v && typeof v === 'object' && typeof (v as any).kcal === 'number'
  );

  const mealItems: Array<{ key: string; label: string; icon: string; meal?: { name: string; kcal: number; p: number } }> = dayMealsForItems.map(([key, m]: any) => ({
    key,
    label: mealKeyLabels[key]?.label || key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    icon: mealKeyLabels[key]?.icon || '🍽️',
    meal: m,
  }));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.eyebrow}>{t('NUTRITION TARGETS')}</Text>
          <Text style={styles.title}>{t('Daily Nutrition Ring')}</Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (onPressLogMeal) {
              onPressLogMeal();
            } else {
              setIsLogModalOpen(true);
            }
          }}
        >
          <Ionicons name="add" size={16} color="#000" />
          <Text style={styles.logBtnText}>{t('Log Meal')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentRow}>
        {/* Dual Concentric Rings */}
        <View style={styles.ringContainer}>
          {Platform.OS === 'web' ? (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
              {/* Outer Track (Calories - Copper) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={outerRadius}
                stroke="rgba(181, 101, 29, 0.20)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Outer Progress (Calories - Copper) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={outerRadius}
                stroke={Colors.copper}
                strokeWidth={strokeWidth}
                strokeDasharray={outerCircumference}
                strokeDashoffset={outerOffset}
                strokeLinecap="round"
                fill="none"
              />

              {/* Inner Track (Protein - Gold) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke="rgba(201, 148, 58, 0.20)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Inner Progress (Protein - Gold or Victory Green when achieved) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={proteinRatio >= 1 ? Colors.victoryGreen : Colors.gold}
                strokeWidth={strokeWidth}
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerOffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : (
            <View style={styles.nativeRingFallback}>
              <View style={[styles.nativeOuterRing, { borderColor: Colors.copper }]}>
                <View style={[styles.nativeInnerRing, { borderColor: proteinRatio >= 1 ? Colors.victoryGreen : Colors.gold }]} />
              </View>
            </View>
          )}

          {/* Center readout: Protein always first! */}
          <View style={styles.ringCenter}>
            <Text style={[styles.ringCenterProteinVal, proteinRatio >= 1 && { color: Colors.victoryGreen }]}>
              {proteinConsumed}g
            </Text>
            <Text style={styles.ringCenterProteinLabel}>{t('PROTEIN')}</Text>
            <Text style={styles.ringCenterCaloriesSub}>{caloriesConsumed} kcal</Text>
          </View>
        </View>

        {/* Legend / Stats Details - Protein listed first */}
        <View style={styles.statsColumn}>
          {/* Protein Target (Gold, First) */}
          <View style={styles.statBoxGold}>
            <View style={styles.statHeaderRow}>
              <View style={styles.goldDot} />
              <Text style={styles.statTitleGold}>{t('PROTEIN (FIRST)')}</Text>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValGold}>{proteinConsumed}</Text>
              <Text style={styles.statTargetGold}>/ {proteinTarget}g</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFillGold, { width: `${proteinPct}%` }]} />
            </View>
            <Text style={styles.statPercentGold}>{proteinPct}% {t('of target')}</Text>
          </View>

          {/* Calories Target (Outer ring, Second) */}
          <View style={styles.statBoxCyan}>
            <View style={styles.statHeaderRow}>
              <View style={styles.cyanDot} />
              <Text style={styles.statTitleCyan}>{t('CALORIES')}</Text>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValCyan}>{caloriesConsumed}</Text>
              <Text style={styles.statTargetCyan}>/ {caloriesTarget} kcal</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFillCyan, { width: `${caloriesPct}%` }]} />
            </View>
            <Text style={styles.statPercentCyan}>{caloriesPct}% {t('of target')}</Text>
          </View>
        </View>
      </View>

      {/* Log Meal Interactive Modal */}
      <Modal
        visible={isLogModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsLogModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalEyebrow}>🍽️ {t('LOG TODAY’S MEALS')}</Text>
                <Text style={styles.modalTitle}>{t('Today • {day}', { day: t(todayKey) })}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseIconBtn}
                onPress={() => setIsLogModalOpen(false)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {t('Mark your planned meals as complete to log protein and calories to your daily nutrition ring.')}
            </Text>

            <View style={styles.mealList}>
              {mealItems.map((item) => {
                const isCompleted = Boolean(todayCompletions[item.key]);
                const isUpdating = updatingMealKey === item.key;

                return (
                  <View key={item.key} style={[styles.mealItemCard, isCompleted && styles.mealItemCardCompleted]}>
                    <View style={styles.mealItemInfo}>
                      <View style={styles.mealItemTop}>
                        <Text style={styles.mealItemIcon}>{item.icon}</Text>
                        <Text style={styles.mealItemLabel}>{item.label}</Text>
                        {isCompleted && (
                          <View style={styles.mealItemDoneBadge}>
                            <Text style={styles.mealItemDoneText}>✓ {t('COMPLETED')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.mealItemName} numberOfLines={1}>
                        {item.meal?.name || t('Planned meal')}
                      </Text>
                      <Text style={styles.mealItemMacros}>
                        🔥 {item.meal?.kcal ?? 0} kcal  •  💪 {item.meal?.p ?? 0}g protein
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.mealActionButton,
                        isCompleted ? styles.mealActionButtonCompleted : styles.mealActionButtonPending,
                      ]}
                      activeOpacity={0.8}
                      disabled={isUpdating}
                      onPress={() => void handleToggleMeal(item.key)}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color={isCompleted ? '#fff' : '#000'} />
                      ) : isCompleted ? (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          <Text style={styles.mealActionButtonTextCompleted}>{t('Eaten')}</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="add-circle" size={16} color="#000" />
                          <Text style={styles.mealActionButtonTextPending}>{t('Log')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.fullPlanBtn}
              activeOpacity={0.85}
              onPress={() => {
                setIsLogModalOpen(false);
                router.push('/mealPlan');
              }}
            >
              <Text style={styles.fullPlanBtnText}>{t('View Full 7-Day Nutrition Plan')} →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    marginBottom: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitleRow: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.ivory,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  logBtnText: {
    color: Colors.obsidian,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ringContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nativeRingFallback: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeInnerRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 8,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterProteinVal: {
    color: Colors.gold,
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    lineHeight: 26,
  },
  ringCenterProteinLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginTop: -2,
    marginBottom: 2,
  },
  ringCenterCaloriesSub: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  statsColumn: {
    flex: 1,
    gap: 10,
  },
  statBoxGold: {
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
    borderRadius: 14,
    padding: 10,
  },
  statBoxCyan: {
    backgroundColor: 'rgba(181, 101, 29, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.30)',
    borderRadius: 14,
    padding: 10,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginRight: 6,
  },
  cyanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.copper,
    marginRight: 6,
  },
  statTitleGold: {
    color: Colors.gold,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  statTitleCyan: {
    color: Colors.copper,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  statValGold: {
    color: Colors.ivory,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginRight: 4,
  },
  statTargetGold: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  statValCyan: {
    color: Colors.ivory,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginRight: 4,
  },
  statTargetCyan: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFillGold: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  progressBarFillCyan: {
    height: '100%',
    backgroundColor: Colors.copper,
    borderRadius: 3,
  },
  statPercentGold: {
    color: Colors.gold,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  statPercentCyan: {
    color: Colors.copper,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0D1B2A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 40 : 26,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(247, 243, 238, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
  },
  modalTitle: {
    color: Colors.ivory,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  mealList: {
    gap: 10,
    marginBottom: 18,
  },
  mealItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111F30',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  mealItemCardCompleted: {
    borderColor: 'rgba(26, 122, 74, 0.50)',
    backgroundColor: 'rgba(26, 122, 74, 0.12)',
  },
  mealItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  mealItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  mealItemIcon: {
    fontSize: 14,
  },
  mealItemLabel: {
    color: Colors.ivory,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  mealItemDoneBadge: {
    backgroundColor: 'rgba(26, 122, 74, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mealItemDoneText: {
    color: Colors.victoryGreen,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  mealItemName: {
    color: Colors.ivory,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 2,
  },
  mealItemMacros: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  mealActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  mealActionButtonPending: {
    backgroundColor: Colors.gold,
  },
  mealActionButtonCompleted: {
    backgroundColor: 'rgba(26, 122, 74, 0.20)',
    borderWidth: 1,
    borderColor: Colors.victoryGreen,
  },
  mealActionButtonTextPending: {
    color: Colors.obsidian,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  mealActionButtonTextCompleted: {
    color: Colors.victoryGreen,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  fullPlanBtn: {
    backgroundColor: 'rgba(181, 101, 29, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fullPlanBtnText: {
    color: Colors.gold,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});
