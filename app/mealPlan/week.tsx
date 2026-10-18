import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getLatestNutritionPlan,
  NutritionPlanApiResponse,
  NutritionDayPlan,
  NutritionMealEntry,
} from '../../lib/nutrition';
import { useLanguage } from '../../lib/i18n';
import { Typography, Fonts } from '../../constants/Typography';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const CARD_BG = '#102A43';
const CARD_SURFACE = '#0C2033';
const GOLD = '#C9943A';
const GOLD_MUTED = 'rgba(201, 148, 58, 0.16)';
const GOLD_BORDER = 'rgba(201, 148, 58, 0.35)';
const IVORY = '#F7F3EE';
const IVORY_MUTED = 'rgba(247, 243, 238, 0.65)';
const BORDER_COLOR = '#1F3F5E';

const DAY_NAME_KEYS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
  Saturday: 'Saturday',
  Sunday: 'Sunday',
};

function formatDayLabel(rawDay: string, t: (k: string) => string): string {
  const canonical = DAY_NAME_KEYS[rawDay] || rawDay;
  return t(canonical);
}

function getDayMacros(day: NutritionDayPlan) {
  const meals: NutritionMealEntry[] = [
    day.breakfast,
    day.lunch,
    day.dinner,
    day.pre_workout,
    day.post_workout,
  ].filter(Boolean) as NutritionMealEntry[];

  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (Number(m.kcal) || 0),
      p: acc.p + (Number(m.p) || 0),
      c: acc.c + (Number(m.c) || 0),
      f: acc.f + (Number(m.f) || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}

export default function SavedWeekScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [plan, setPlan] = useState<NutritionPlanApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Single-day accordion: tracks the day key of the currently open day
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getLatestNutritionPlan({ forceRefresh: true })
      .then((value) => {
        if (!active) return;
        setPlan(value);
        if (value && value.days && value.days.length > 0) {
          // Default expand today if found, else first day
          const dayShorts = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const todayShort = dayShorts[new Date().getDay()];
          const matchedDay = value.days.find(
            (d) => d.day === todayShort || DAY_NAME_KEYS[d.day] === DAY_NAME_KEYS[todayShort]
          );
          setExpandedDay(matchedDay ? matchedDay.day : value.days[0].day);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const toggleDay = (dayKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDay((current) => (current === dayKey ? null : dayKey));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Navigation & Header */}
      <View style={styles.topNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Back to Food')}
          onPress={() => router.replace('/mealPlan' as any)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={18} color={GOLD} />
          <Text style={styles.backButtonText}>{t('Food')}</Text>
        </Pressable>
      </View>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>{t('Your saved week')}</Text>
        {plan?.summary ? (
          <Text style={styles.summaryText}>{plan.summary}</Text>
        ) : null}
      </View>

      {/* States */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={GOLD} size="large" accessibilityLabel="Loading saved week" />
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.text}>
            {t('We couldn’t load your saved week. Please try again.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAttempt((value) => value + 1)}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>{t('Try again')}</Text>
          </Pressable>
        </View>
      ) : !plan || !plan.days || plan.days.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.text}>
            {t('No saved week yet. Build a plan from the Food tab to get started.')}
          </Text>
        </View>
      ) : (
        <>
          {/* Day Accordion List */}
          <View style={styles.accordionContainer}>
            {plan.days.map((dayPlan) => {
              const isExpanded = expandedDay === dayPlan.day;
              const dayLabel = formatDayLabel(dayPlan.day, t);
              const macros = getDayMacros(dayPlan);

              // Gather snacks
              const snacks: { label: string; meal: NutritionMealEntry }[] = [];
              if (dayPlan.pre_workout) {
                snacks.push({ label: t('Pre-workout snack'), meal: dayPlan.pre_workout });
              }
              if (dayPlan.post_workout) {
                snacks.push({ label: t('Post-workout snack'), meal: dayPlan.post_workout });
              }

              // Also check any extra snack fields
              Object.keys(dayPlan).forEach((key) => {
                if (!['day', 'breakfast', 'lunch', 'dinner', 'pre_workout', 'post_workout'].includes(key)) {
                  const val = dayPlan[key] as any;
                  if (val && typeof val === 'object' && val.name && val.kcal !== undefined) {
                    snacks.push({ label: t(key.replace(/_/g, ' ')), meal: val });
                  }
                }
              });

              return (
                <View key={dayPlan.day} style={[styles.dayCard, isExpanded && styles.dayCardExpanded]}>
                  {/* Day Header Row */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded }}
                    accessibilityLabel={`${dayLabel}, ${isExpanded ? t('Collapse day') : t('Expand day')}`}
                    onPress={() => toggleDay(dayPlan.day)}
                    style={styles.dayHeaderRow}
                  >
                    <View style={styles.dayHeaderInfo}>
                      <Text style={styles.dayTitle}>{dayLabel}</Text>
                      {macros.kcal > 0 ? (
                        <Text style={styles.daySummaryBadge}>
                          {macros.kcal} {t('kcal')} · {macros.p}g {t('protein')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.chevronWrap}>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={20}
                        color={isExpanded ? GOLD : IVORY_MUTED}
                      />
                    </View>
                  </Pressable>

                  {/* Expanded Day Meals */}
                  {isExpanded ? (
                    <View style={styles.dayBody}>
                      {/* 1. Breakfast */}
                      {dayPlan.breakfast ? (
                        <MealItemCard
                          slotLabel={t('Breakfast')}
                          meal={dayPlan.breakfast}
                          t={t}
                        />
                      ) : null}

                      {/* 2. Lunch */}
                      {dayPlan.lunch ? (
                        <MealItemCard
                          slotLabel={t('Lunch')}
                          meal={dayPlan.lunch}
                          t={t}
                        />
                      ) : null}

                      {/* 3. Snacks */}
                      {snacks.map((snack, idx) => (
                        <MealItemCard
                          key={`snack-${idx}`}
                          slotLabel={snack.label || t('Snacks')}
                          meal={snack.meal}
                          t={t}
                        />
                      ))}

                      {/* 4. Dinner */}
                      {dayPlan.dinner ? (
                        <MealItemCard
                          slotLabel={t('Dinner')}
                          meal={dayPlan.dinner}
                          t={t}
                        />
                      ) : null}

                      {/* Optional Day-Level Preparation Info */}
                      {(dayPlan as any).preparation_info || (dayPlan as any).notes ? (
                        <View style={styles.dayPrepCard}>
                          <Text style={styles.prepCardTitle}>
                            {t('Preparation information')}
                          </Text>
                          <Text style={styles.prepCardText}>
                            {(dayPlan as any).preparation_info || (dayPlan as any).notes}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Shopping List Section */}
          {plan.shopping_list && plan.shopping_list.length > 0 ? (
            <View style={styles.shoppingListSection}>
              <View style={styles.shoppingHeaderRow}>
                <Ionicons name="basket-outline" size={22} color={GOLD} />
                <Text style={styles.shoppingTitle}>{t('Shopping list')}</Text>
              </View>
              {plan.shopping_list.map((section, index) => (
                <View key={`shop-sec-${index}`} style={styles.shoppingCard}>
                  <Text style={styles.shoppingCategory}>{section.category}</Text>
                  <View style={styles.shoppingItemsList}>
                    {section.items.map((item, i) => (
                      <View key={`shop-item-${i}`} style={styles.shoppingItemRow}>
                        <View style={styles.shoppingBullet} />
                        <Text style={styles.shoppingItemName}>{item.name}</Text>
                        <Text style={styles.shoppingItemQty}>{item.qty}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

interface MealItemCardProps {
  slotLabel: string;
  meal: NutritionMealEntry;
  t: (k: string) => string;
}

function MealItemCard({ slotLabel, meal, t }: MealItemCardProps) {
  return (
    <View style={styles.mealCard}>
      {/* Slot Header */}
      <View style={styles.mealSlotRow}>
        <Text style={styles.mealSlotLabel}>{slotLabel.toUpperCase()}</Text>
        {meal.timing ? (
          <Text style={styles.mealTimingText}>{meal.timing}</Text>
        ) : null}
      </View>

      {/* Meal Name */}
      <Text style={styles.mealName}>{meal.name}</Text>

      {/* Macros Badge Row */}
      <View style={styles.macroPillRow}>
        <View style={styles.macroPill}>
          <Text style={styles.macroPillValue}>{meal.kcal}</Text>
          <Text style={styles.macroPillUnit}>{t('kcal')}</Text>
        </View>
        <View style={styles.macroPill}>
          <Text style={styles.macroPillValue}>{meal.p}g</Text>
          <Text style={styles.macroPillUnit}>{t('protein')}</Text>
        </View>
        <View style={styles.macroPill}>
          <Text style={styles.macroPillValue}>{meal.c}g</Text>
          <Text style={styles.macroPillUnit}>{t('carbs')}</Text>
        </View>
        <View style={styles.macroPill}>
          <Text style={styles.macroPillValue}>{meal.f}g</Text>
          <Text style={styles.macroPillUnit}>{t('fat')}</Text>
        </View>
      </View>

      {/* Description */}
      {meal.desc ? <Text style={styles.mealDesc}>{meal.desc}</Text> : null}

      {/* Ingredients */}
      {meal.ingredients && meal.ingredients.length > 0 ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailHeading}>{t('Ingredients')}</Text>
          <Text style={styles.detailText}>{meal.ingredients.join(', ')}</Text>
        </View>
      ) : null}

      {/* Preparation Steps */}
      {meal.instructions && meal.instructions.length > 0 ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailHeading}>{t('Preparation steps')}</Text>
          <View style={styles.instructionsList}>
            {meal.instructions.map((step, idx) => (
              <View key={`step-${idx}`} style={styles.instructionRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 80,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    gap: 16,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    ...Typography.bodyMedium,
    color: GOLD,
    fontSize: 15,
  },
  headerBlock: {
    gap: 8,
    marginBottom: 6,
  },
  title: {
    ...Typography.h1,
    color: IVORY,
  },
  summaryText: {
    ...Typography.body,
    color: IVORY_MUTED,
    fontSize: 14,
    lineHeight: 21,
  },
  centerContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E53E3E',
  },
  emptyCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  text: {
    ...Typography.body,
    color: IVORY,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  retryButtonText: {
    ...Typography.bodyMedium,
    color: OBSIDIAN,
    fontWeight: '600',
  },

  // Accordion Day Card
  accordionContainer: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  dayCardExpanded: {
    borderColor: GOLD_BORDER,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  dayHeaderInfo: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  dayTitle: {
    ...Typography.h2,
    color: IVORY,
    fontSize: 18,
  },
  daySummaryBadge: {
    fontFamily: Fonts.data,
    color: GOLD,
    fontSize: 13,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded Day Content
  dayBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 4,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },

  // Meal Card
  mealCard: {
    backgroundColor: CARD_SURFACE,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  mealSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealSlotLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    color: GOLD,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  mealTimingText: {
    ...Typography.caption,
    color: IVORY_MUTED,
    fontSize: 12,
  },
  mealName: {
    ...Typography.h3,
    color: IVORY,
    fontSize: 16,
  },
  macroPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 2,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 148, 58, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  macroPillValue: {
    fontFamily: Fonts.dataBold,
    fontSize: 12,
    color: GOLD,
  },
  macroPillUnit: {
    ...Typography.caption,
    fontSize: 11,
    color: IVORY_MUTED,
  },
  mealDesc: {
    ...Typography.body,
    color: IVORY_MUTED,
    fontSize: 13.5,
    lineHeight: 19,
  },
  detailSection: {
    gap: 4,
    paddingTop: 4,
  },
  detailHeading: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12.5,
    color: GOLD,
    letterSpacing: 0.3,
  },
  detailText: {
    ...Typography.body,
    color: IVORY,
    fontSize: 13,
    lineHeight: 18,
  },
  instructionsList: {
    gap: 8,
    marginTop: 2,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GOLD_MUTED,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontFamily: Fonts.dataBold,
    fontSize: 10.5,
    color: GOLD,
  },
  instructionText: {
    ...Typography.body,
    color: IVORY,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // Day Preparation Card
  dayPrepCard: {
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
  },
  prepCardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: GOLD,
    fontWeight: '600',
  },
  prepCardText: {
    ...Typography.body,
    color: IVORY,
    fontSize: 13,
    lineHeight: 18,
  },

  // Shopping List Section
  shoppingListSection: {
    marginTop: 20,
    gap: 12,
  },
  shoppingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  shoppingTitle: {
    ...Typography.h2,
    color: IVORY,
  },
  shoppingCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  shoppingCategory: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: GOLD,
    fontWeight: '600',
  },
  shoppingItemsList: {
    gap: 8,
  },
  shoppingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  shoppingBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
  },
  shoppingItemName: {
    ...Typography.body,
    color: IVORY,
    flex: 1,
    fontSize: 13.5,
  },
  shoppingItemQty: {
    fontFamily: Fonts.data,
    color: IVORY_MUTED,
    fontSize: 13,
  },
});
