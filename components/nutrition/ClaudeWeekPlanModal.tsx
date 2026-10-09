import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { createNutritionPlan, NutritionPlanApiResponse, NutritionDayPlan } from '../../lib/nutrition';

interface DayPlan {
  day: string;
  proteinText: string;
  meals: string;
  prepTime: string;
}

interface ClaudeWeekPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenShoppingList: () => void;
  plan?: NutritionPlanApiResponse | null;
  defaultWeight?: number;
  onPlanUpdated?: (plan: NutritionPlanApiResponse) => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

const CUISINES = ['German', 'Ghanaian', 'Italian', 'Turkish', 'Indian', 'Mexican'];
const ALLERGIES = ['Lactose', 'Nuts', 'Gluten', 'Shellfish', 'Pork'];

function formatDayName(day: string) {
  const names: Record<string, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
    Sun: 'Sunday',
  };
  return names[day] || day;
}

function mealNamesForDay(day: NutritionDayPlan) {
  return [day.breakfast, day.lunch, day.dinner]
    .filter(Boolean)
    .map((meal: any) => meal.name)
    .filter(Boolean)
    .join(' · ');
}

function proteinForDay(day: NutritionDayPlan) {
  return [day.breakfast, day.lunch, day.dinner, day.pre_workout, day.post_workout]
    .filter(Boolean)
    .reduce((sum, meal: any) => sum + Math.max(0, Number(meal.p || 0)), 0);
}

function shortPlanSummary(summary?: string | null) {
  const text = String(summary || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'A practical week built from your food preferences, schedule, portions, and budget.';
  const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  const candidate = firstSentence && firstSentence.length >= 45 ? firstSentence : text;
  return candidate.length > 150 ? `${candidate.slice(0, 147).trim()}...` : candidate;
}

export default function ClaudeWeekPlanModal({
  visible,
  onClose,
  onOpenShoppingList,
  plan,
  defaultWeight = 75,
  onPlanUpdated,
}: ClaudeWeekPlanModalProps) {
  const [viewMode, setViewMode] = useState<'questionnaire' | 'weekPlan'>('questionnaire');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customMeal, setCustomMeal] = useState('');
  const [customAllergy, setCustomAllergy] = useState('');
  const [cookingTime, setCookingTime] = useState('30 min');
  const [peopleCount, setPeopleCount] = useState('4');
  const [weeklyBudget, setWeeklyBudget] = useState('€120');
  const [generatedPlan, setGeneratedPlan] = useState<NutritionPlanApiResponse | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const activePlan = generatedPlan || plan || null;
  const dayPlans: DayPlan[] = (activePlan?.days || []).map((day) => ({
    day: formatDayName(day.day),
    proteinText: `${proteinForDay(day)} g protein`,
    meals: mealNamesForDay(day),
    prepTime: `${Math.max(15, Math.min(45, (day.breakfast?.instructions?.length || 1) * 5 + 20))} min total`,
  }));

  const toggleCuisine = (c: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const toggleMeal = (m: string) => {
    setSelectedMeals((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const addCustomMeal = () => {
    const meal = customMeal.trim();
    if (!meal) return;
    setSelectedMeals((prev) => (prev.some((item) => item.toLowerCase() === meal.toLowerCase()) ? prev : [...prev, meal]));
    setCustomMeal('');
  };

  const toggleAllergy = (a: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const addCustomAllergy = () => {
    const item = customAllergy.trim();
    if (!item) return;
    setSelectedAllergies((prev) => (prev.some((value) => value.toLowerCase() === item.toLowerCase()) ? prev : [...prev, item]));
    setCustomAllergy('');
  };

  const handleBack = () => {
    if (viewMode === 'weekPlan') {
      setViewMode('questionnaire');
    } else {
      onClose();
    }
  };

  const handleBuildWeek = async () => {
    if (isBuilding) return;
    const meals = [...selectedMeals, customMeal]
      .map((meal) => meal.trim())
      .filter(Boolean);
    const favoriteMeals = Array.from(new Set(meals)).slice(0, 8);
    const hasSpecificCuisine = selectedCuisines.length > 0;
    if (!hasSpecificCuisine && favoriteMeals.length < 3) {
      Alert.alert('Add meal preferences', 'Choose at least one cuisine or add at least three meals you already eat.');
      return;
    }

    setIsBuilding(true);
    try {
      const response = await createNutritionPlan({
        goal: 'maintenance',
        cuisine: selectedCuisines.join(', ') || 'balanced',
        favorite_meal: favoriteMeals[0],
        favorite_meals: favoriteMeals,
        favorite_meals_json: favoriteMeals,
        diet: 'balanced',
        allergies: Array.from(new Set([...selectedAllergies, customAllergy.trim()].filter(Boolean))).join(', '),
        activity_level: 'moderate',
        weight: String(defaultWeight),
        cooking_time_weekday: cookingTime.trim(),
        people_cooking_for: peopleCount.trim(),
        weekly_food_budget: weeklyBudget.trim(),
        regenerate: true,
        force_refresh: true,
      });
      setGeneratedPlan(response.plan);
      onPlanUpdated?.(response.plan);
      setViewMode('weekPlan');
    } catch (error: any) {
      Alert.alert('Could not build meal plan', error?.message || 'Please try again.');
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} hitSlop={10}>
            <Text style={styles.backBtn}>
              {viewMode === 'weekPlan' ? '← Questionnaire' : '← Food'}
            </Text>
          </Pressable>
          <Text style={styles.headerRightTag}>
            {viewMode === 'weekPlan' ? '11–17 MAY' : '6 QUESTIONS · 2 MIN'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {viewMode === 'questionnaire' ? (
            /* 1. Questionnaire View (matching prototype lines 1567-1619) */
            <View>
              <Text style={styles.headline}>Tell me what you like eating</Text>
              <Text style={styles.subheadline}>
                The plan is built from your answers, not from a template. Answer once and we reuse it every week.
              </Text>

              {/* 1 · CUISINES YOU COOK */}
              <View style={styles.card}>
                <Text style={styles.cardKicker}>1 · CUISINES YOU COOK</Text>
                <View style={styles.chipsWrap}>
                  {CUISINES.map((c) => {
                    const active = selectedCuisines.includes(c);
                    return (
                      <Pressable
                        key={c}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleCuisine(c)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.cardFootnote}>
                  You pick these. We never assume a cuisine from your country.
                </Text>
              </View>

              {/* 2 · MEALS YOU ALREADY LOVE */}
              <View style={styles.card}>
                <Text style={styles.cardKicker}>2 · MEALS YOU ALREADY LOVE</Text>
                <View style={styles.chipsWrap}>
                  {selectedMeals.map((m) => {
                    const active = selectedMeals.includes(m);
                    return (
                      <Pressable
                        key={m}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => toggleMeal(m)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {m}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.mealInputRow}>
                  <TextInput
                    style={styles.mealInput}
                    placeholder="Type a meal you already eat..."
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    value={customMeal}
                    onChangeText={setCustomMeal}
                    onSubmitEditing={addCustomMeal}
                    returnKeyType="done"
                  />
                  <Pressable style={styles.addMealBtn} onPress={addCustomMeal}>
                    <Text style={styles.addMealBtnText}>Add</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardFootnote}>
                  Add at least three. These are sent to the backend plan generator.
                </Text>
              </View>

              {/* 3 · ALLERGIES AND ANYTHING YOU CANNOT EAT */}
              <View style={[styles.card, styles.cardCopperBorder]}>
                <Text style={styles.cardKicker}>3 · ALLERGIES AND ANYTHING YOU CANNOT EAT</Text>
                <View style={styles.chipsWrap}>
                  {Array.from(new Set([...ALLERGIES, ...selectedAllergies])).map((a) => {
                    const active = selectedAllergies.includes(a);
                    return (
                      <Pressable
                        key={a}
                        style={[styles.chip, active && styles.chipCopperActive]}
                        onPress={() => toggleAllergy(a)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {a}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.mealInputRow}>
                  <TextInput
                    style={styles.mealInput}
                    placeholder="Type anything else..."
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    value={customAllergy}
                    onChangeText={setCustomAllergy}
                    onSubmitEditing={addCustomAllergy}
                    returnKeyType="done"
                  />
                  <Pressable style={styles.addMealBtn} onPress={addCustomAllergy}>
                    <Text style={styles.addMealBtnText}>Add</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardFootnote}>
                  Anything ticked here is excluded from every plan and every shopping list, permanently.
                </Text>
              </View>

              {/* 4, 5, 6 Parameter Rows */}
              <View style={[styles.card, styles.paramsCard]}>
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>4 · Cooking time on a weekday</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={cookingTime}
                    onChangeText={setCookingTime}
                    placeholder="30 min"
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    returnKeyType="done"
                  />
                </View>
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>5 · People you cook for</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={peopleCount}
                    onChangeText={(value) => setPeopleCount(value.replace(/[^\d]/g, '').slice(0, 2))}
                    placeholder="4"
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>
                <View style={[styles.paramRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.paramLabel}>6 · Weekly food budget</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={weeklyBudget}
                    onChangeText={(value) => setWeeklyBudget(value.slice(0, 24))}
                    placeholder="€120"
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* CTA */}
              <Pressable style={[styles.primaryBtn, isBuilding && styles.primaryBtnDisabled]} onPress={handleBuildWeek} disabled={isBuilding}>
                <Text style={styles.primaryBtnText}>{isBuilding ? 'Building...' : 'Build my week'}</Text>
              </Pressable>
            </View>
          ) : (
            /* 2. Week View (matching prototype lines 1621-1653) */
            <View>
              <Text style={styles.headline}>Your week</Text>
              <Text style={styles.subheadline}>
                {shortPlanSummary(activePlan?.summary)}
              </Text>
              <View style={styles.summaryPills}>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryPillLabel}>Cook</Text>
                  <Text style={styles.summaryPillValue}>{cookingTime || '30 min'}</Text>
                </View>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryPillLabel}>People</Text>
                  <Text style={styles.summaryPillValue}>{peopleCount || '4'}</Text>
                </View>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryPillLabel}>Budget</Text>
                  <Text style={styles.summaryPillValue}>{weeklyBudget || '€120'}</Text>
                </View>
              </View>

              {/* Days Card */}
              <View style={styles.card}>
                {(dayPlans.length > 0 ? dayPlans : []).map((d, idx) => (
                  <View
                    key={d.day}
                    style={[
                      styles.dayBlock,
                      idx < dayPlans.length - 1 && styles.dayBlockBorder,
                    ]}
                  >
                    <View style={styles.dayTopRow}>
                      <Text style={styles.dayTitle}>{d.day}</Text>
                      <Text style={styles.dayProtein}>{d.proteinText}</Text>
                    </View>

                    <Text style={styles.dayMeals}>{d.meals}</Text>

                    <View style={styles.dayActionRow}>
                      <Text style={styles.prepLink}>Preparation steps ›</Text>
                      <Text style={styles.prepTime}>{d.prepTime}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {dayPlans.length === 0 ? (
                <Text style={styles.moreDaysNote}>No saved plan yet. Go back and build your week.</Text>
              ) : null}

              <Text style={styles.moreDaysNote}>Thursday to Sunday below ⌄</Text>

              {/* Bottom Button */}
              <Pressable style={styles.primaryBtn} onPress={onOpenShoppingList}>
                <Text style={styles.primaryBtnText}>See the shopping list</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
  },
  backBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  headerRightTag: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headline: {
    fontFamily: CLASH,
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 10,
  },
  subheadline: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 14,
  },
  summaryPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 13,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  summaryPillLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: GOLD,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryPillValue: {
    fontFamily: MONO,
    fontSize: 12.5,
    fontWeight: '700',
    color: IVORY,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 9,
  },
  cardCopperBorder: {
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  cardKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.2,
    color: GOLD,
    marginBottom: 11,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  chipCopperActive: {
    backgroundColor: COPPER,
    borderColor: COPPER,
  },
  chipText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  chipTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  cardFootnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 11,
  },
  mealInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  mealInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.18)',
    paddingHorizontal: 12,
    fontFamily: INTER,
    fontSize: 13,
    color: IVORY,
  },
  addMealBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMealBtnText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  paramsCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 14,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  paramLabel: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.75)',
  },
  paramValue: {
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '700',
    color: IVORY,
  },
  paramInput: {
    width: 120,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.18)',
    backgroundColor: 'rgba(13, 13, 13, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'right',
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '700',
    color: IVORY,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  dayBlock: {
    paddingVertical: 16,
  },
  dayBlockBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  dayTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  dayProtein: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  dayMeals: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.72)',
  },
  dayActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 11,
  },
  prepLink: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  prepTime: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.4)',
  },
  moreDaysNote: {
    textAlign: 'center',
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
    marginVertical: 14,
  },
});
