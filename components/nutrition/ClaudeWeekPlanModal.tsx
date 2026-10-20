import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createNutritionPlan,
  NutritionPlanApiResponse,
  NutritionDayPlan,
  NutritionMealEntry,
  formatStructuredNutritionSummary,
  getMealPreparationSteps,
} from '../../lib/nutrition';
import { useLanguage } from '../../lib/i18n';
import { formatCurrencyAmount, parseBudgetEntry } from '../../lib/currency';

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
  userLocale?: string | null;
  onPlanUpdated?: (plan: NutritionPlanApiResponse) => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

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
  userLocale,
  onPlanUpdated,
}: ClaudeWeekPlanModalProps) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'questionnaire' | 'weekPlan'>('questionnaire');
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [mealHealthPreferences, setMealHealthPreferences] = useState<Record<string, 'healthy_for_me' | 'not_healthy_for_me'>>({});
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customMeal, setCustomMeal] = useState('');
  const [customAllergy, setCustomAllergy] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [peopleCount, setPeopleCount] = useState('');
  const [weeklyBudget, setWeeklyBudget] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<NutritionPlanApiResponse | null>(null);
  const [openPrepMealKeys, setOpenPrepMealKeys] = useState<Record<string, boolean>>({});
  const [isBuilding, setIsBuilding] = useState(false);

  useEffect(() => {
    if (!plan?.profile) return;
    const prof: any = plan.profile;
    const savedFavs: string[] = [];
    const savedPrefs: Record<string, 'healthy_for_me' | 'not_healthy_for_me'> = {};

    if (Array.isArray(prof.favorite_foods_details)) {
      prof.favorite_foods_details.forEach((item: any) => {
        if (item && item.name) {
          const name = String(item.name).trim();
          if (name && !savedFavs.includes(name)) {
            savedFavs.push(name);
          }
          if (item.health_preference === 'healthy_for_me' || item.health_preference === 'not_healthy_for_me') {
            savedPrefs[name] = item.health_preference;
          }
        }
      });
    }

    if (prof.favorite_meals_preferences && typeof prof.favorite_meals_preferences === 'object') {
      Object.entries(prof.favorite_meals_preferences).forEach(([k, v]) => {
        const name = String(k).trim();
        if (name && !savedFavs.includes(name)) {
          savedFavs.push(name);
        }
        if (v === 'healthy_for_me' || v === 'not_healthy_for_me') {
          savedPrefs[name] = v;
        }
      });
    }

    const flatFavs = [
      ...(Array.isArray(prof.favorite_meals) ? prof.favorite_meals : []),
      ...(Array.isArray(prof.favorite_meals_json) ? prof.favorite_meals_json : []),
      ...(prof.favorite_meal ? [prof.favorite_meal] : []),
    ];
    flatFavs.forEach((m: any) => {
      const name = String(m || '').trim();
      if (name && !savedFavs.includes(name)) {
        savedFavs.push(name);
      }
    });

    if (savedFavs.length > 0) {
      setSelectedMeals(savedFavs);
      setMealHealthPreferences(savedPrefs);
    }

    if (prof.cuisine && typeof prof.cuisine === 'string') {
      const cuisines = prof.cuisine.split(',').map((c: string) => c.trim()).filter(Boolean);
      if (cuisines.length > 0) setSelectedCuisines(cuisines);
    }
    if (prof.allergies && typeof prof.allergies === 'string') {
      const allergies = prof.allergies.split(',').map((a: string) => a.trim()).filter(Boolean);
      if (allergies.length > 0) setSelectedAllergies(allergies);
    }
  }, [plan]);
  const [buildError, setBuildError] = useState('');
  const [progress, setProgress] = useState(0);
  const buildRequest = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const toggleMealPrep = (mealKey: string) => {
    setOpenPrepMealKeys((prev) => ({
      ...prev,
      [mealKey]: !prev[mealKey],
    }));
  };

  const handleToggleDayPrep = (dayKey: string, dayPlan: NutritionDayPlan) => {
    const isCurrentlyExpanded = expandedDayKey === dayKey;
    if (!isCurrentlyExpanded) {
      setExpandedDayKey(dayKey);
      setOpenPrepMealKeys((prev) => ({
        ...prev,
        [`${dayKey}-breakfast`]: true,
        [`${dayKey}-lunch`]: true,
        [`${dayKey}-dinner`]: true,
        [`${dayKey}-pre_workout`]: true,
        [`${dayKey}-post_workout`]: true,
      }));
    } else {
      const anyOpen = Boolean(
        openPrepMealKeys[`${dayKey}-breakfast`] ||
        openPrepMealKeys[`${dayKey}-lunch`] ||
        openPrepMealKeys[`${dayKey}-dinner`] ||
        openPrepMealKeys[`${dayKey}-pre_workout`] ||
        openPrepMealKeys[`${dayKey}-post_workout`]
      );
      setOpenPrepMealKeys((prev) => ({
        ...prev,
        [`${dayKey}-breakfast`]: !anyOpen,
        [`${dayKey}-lunch`]: !anyOpen,
        [`${dayKey}-dinner`]: !anyOpen,
        [`${dayKey}-pre_workout`]: !anyOpen,
        [`${dayKey}-post_workout`]: !anyOpen,
      }));
    }
  };

  const renderModalMealCard = (
    slotKey: string,
    slotLabel: string,
    meal: NutritionMealEntry | undefined | null,
    dayKey: string
  ) => {
    if (!meal) return null;
    const mealKey = `${dayKey}-${slotKey}`;
    const isPrepOpen = Boolean(openPrepMealKeys[mealKey]);
    const steps = getMealPreparationSteps(meal);

    return (
      <View style={styles.modalMealCard} key={mealKey}>
        <Text style={styles.modalMealKicker}>{slotLabel.toUpperCase()}</Text>
        <Text style={styles.modalMealName} numberOfLines={1} ellipsizeMode="tail">
          {meal.name}
        </Text>
        <Text style={styles.modalMealMacros}>
          {meal.kcal} kcal · {meal.p}g P · {meal.c}g C · {meal.f}g F
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${slotLabel} ${t('Preparation steps')}`}
          onPress={() => toggleMealPrep(mealKey)}
          style={styles.modalMealPrepBtn}
        >
          <Text style={styles.modalMealPrepBtnText}>
            {t('Preparation steps')} {isPrepOpen ? '▴' : '›'}
          </Text>
        </Pressable>
        {isPrepOpen ? (
          <View style={styles.modalInstructionsList}>
            {steps.map((step, idx) => (
              <View key={`step-${idx}`} style={styles.modalInstructionRow}>
                <View style={styles.modalStepBadge}>
                  <Text style={styles.modalStepBadgeText}>{idx + 1}</Text>
                </View>
                <Text style={styles.modalInstructionText}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };
  const cancelBuild = () => {
    buildRequest.current?.abort();
    buildRequest.current = null;
    setIsBuilding(false);
  };
  useEffect(() => {
    if (visible) {
      setCookingTime('');
      setPeopleCount('');
      setWeeklyBudget('');
      setBuildError('');
    } else {
      cancelBuild();
    }
    return () => { buildRequest.current?.abort(); buildRequest.current = null; };
  }, [visible]);
  useEffect(() => {
    if (!isBuilding) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    const started = Date.now();
    const timer = setInterval(() => {
      // Estimated waiting progress: only a successful response means completion.
      setProgress(Math.min(95, Math.floor(5 + 90 * (1 - Math.exp(-(Date.now() - started) / 60000)))));
    }, 1000);
    return () => clearInterval(timer);
  }, [isBuilding]);
  const activePlan = generatedPlan || plan || null;
  const structuredSummary = React.useMemo(() => {
    return formatStructuredNutritionSummary(activePlan, t);
  }, [activePlan, t]);

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
    setSelectedMeals((prev) => {
      if (prev.includes(m)) {
        setMealHealthPreferences((cur) => {
          const next = { ...cur };
          delete next[m];
          return next;
        });
        return prev.filter((x) => x !== m);
      } else {
        setEditingMeal(m);
        return [...prev, m];
      }
    });
  };

  const removeMeal = (m: string) => {
    setSelectedMeals((prev) => prev.filter((x) => x !== m));
    setMealHealthPreferences((cur) => {
      const next = { ...cur };
      delete next[m];
      return next;
    });
    setEditingMeal((cur) => (cur === m ? null : cur));
  };

  const setMealHealthPreference = (meal: string, preference: 'healthy_for_me' | 'not_healthy_for_me') => {
    setMealHealthPreferences((cur) => {
      const next = { ...cur };
      next[meal] = preference;
      return next;
    });
    setEditingMeal(null);
  };

  const addCustomMeal = () => {
    const meal = customMeal.trim();
    if (!meal) return;
    setSelectedMeals((prev) => {
      if (prev.some((item) => item.toLowerCase() === meal.toLowerCase())) {
        return prev;
      }
      setEditingMeal(meal);
      return [...prev, meal];
    });
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
    cancelBuild();
    if (viewMode === 'weekPlan') {
      setViewMode('questionnaire');
    } else {
      onClose();
    }
  };

  const handleBuildWeek = async () => {
    if (buildRequest.current) return;
    const parsedBudget = weeklyBudget.trim() ? parseBudgetEntry(weeklyBudget) : null;
    if (weeklyBudget.trim() && !parsedBudget) {
      setBuildError('Include a currency with your budget, for example 120 EUR, 500 GHS, £100, or $150.');
      return;
    }
    const controller = new AbortController();
    buildRequest.current = controller;
    setProgress(5);
    const meals = [...selectedMeals, customMeal]
      .map((meal) => meal.trim())
      .filter(Boolean);
    const favoriteMeals = Array.from(new Set(meals)).slice(0, 8);

    const favoriteFoodsDetails = favoriteMeals.map((name) => ({
      name,
      is_favourite: true,
      health_preference: mealHealthPreferences[name] || 'unspecified',
    }));

    const favoriteMealsPreferences: Record<string, string> = {};
    favoriteMeals.forEach((name) => {
      if (mealHealthPreferences[name]) {
        favoriteMealsPreferences[name] = mealHealthPreferences[name];
      }
    });

    setIsBuilding(true);
    setBuildError('');
    try {
      const response = await createNutritionPlan({
        goal: 'maintenance',
        regenerate: true,
        force_refresh: true,
        cuisine: selectedCuisines.join(', ') || 'balanced',
        favorite_meal: favoriteMeals[0],
        favorite_meals: favoriteMeals,
        favorite_meals_json: favoriteMeals,
        favorite_foods_details: favoriteFoodsDetails,
        favorite_meals_preferences: favoriteMealsPreferences,
        diet: 'balanced',
        allergies: Array.from(new Set([...selectedAllergies, customAllergy.trim()].filter(Boolean))).join(', '),
        activity_level: 'moderate',
        weight: String(defaultWeight),
        cooking_time_weekday: cookingTime.trim(),
        people_cooking_for: peopleCount.trim(),
        weekly_food_budget: weeklyBudget.trim() || null,
        weekly_food_budget_amount: parsedBudget ? Number(parsedBudget.amount) : null,
        weekly_food_budget_currency: parsedBudget?.currency || null,
      }, controller.signal);
      if (controller.signal.aborted || buildRequest.current !== controller) return;
      setProgress(100);
      setGeneratedPlan(response.plan);
      onPlanUpdated?.(response.plan);
      setViewMode('weekPlan');
    } catch (error: any) {
      if (controller.signal.aborted || buildRequest.current !== controller) return;
      setBuildError(error?.status === 401 ? 'Your session has expired. Please sign in again.' : error?.status === 429 ? 'You have reached your plan-generation limit. Please check your membership before trying again.' : 'We couldn’t finish your week plan right now. Your answers are still here. Please try again in a moment.');
    } finally {
      if (buildRequest.current === controller) {
        buildRequest.current = null;
        setIsBuilding(false);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={() => { cancelBuild(); onClose(); }}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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

        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isBuilding ? (
            <View style={styles.buildCard}>
              <Text style={styles.buildEyebrow}>YOUR PERSONAL WEEK</Text>
              <Text style={styles.headline}>Preparing your meal plan</Text>
              <Text style={styles.subheadline}>We’re preparing meals around your preferences, portions, and budget.</Text>
              <Text style={styles.buildPercentage}>{progress}%</Text>
              <View accessibilityRole="progressbar" accessibilityLabel="Estimated meal plan progress" accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.buildHint}>Estimated progress · A new plan may take a few minutes.</Text>
              <Pressable accessibilityRole="button" onPress={cancelBuild} style={styles.cancelButton}>
                <Text style={styles.primaryBtnText}>Cancel</Text>
              </Pressable>
              <Text style={styles.buildHint}>Cancel stops waiting here. Preparation may still finish in the background.</Text>
            </View>
          ) : viewMode === 'questionnaire' ? (
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

                {/* Popular suggestions: filter out any already selected */}
                {(() => {
                  const availableSuggestions = [
                    'Grilled Chicken & Rice',
                    'Fufu',
                    'Salmon & Vegetables',
                    'Pasta Bolognese',
                    'Waakye',
                  ].filter(
                    (s) => !selectedMeals.some((m) => m.toLowerCase() === s.toLowerCase())
                  );
                  if (availableSuggestions.length === 0) return null;
                  return (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.favPromptHint}>{t('Quick add:')}</Text>
                      <View style={styles.chipsWrap}>
                        {availableSuggestions.map((s) => (
                          <Pressable key={s} style={styles.chip} onPress={() => toggleMeal(s)}>
                            <Text style={styles.chipText}>+ {s}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })()}

                {/* Render EACH favourite food with streamlined luxury layout */}
                {selectedMeals.length > 0 ? (
                  <View style={styles.favFoodsContainer}>
                    {selectedMeals.map((m) => {
                      const pref = mealHealthPreferences[m];
                      const formattedName =
                        m.trim().length > 0
                          ? m.trim().charAt(0).toUpperCase() + m.trim().slice(1)
                          : m;
                      const isHealthy = pref === 'healthy_for_me';
                      const isNotHealthy = pref === 'not_healthy_for_me';
                      const isConfirmed = isHealthy || isNotHealthy;
                      const isEditing = editingMeal === m || !isConfirmed;

                      return (
                        <View
                          key={m}
                          style={[
                            styles.favFoodItemCard,
                            isHealthy && styles.favFoodItemCardHealthy,
                            isNotHealthy && styles.favFoodItemCardNotHealthy,
                          ]}
                        >
                          {/* Card Main Row: Title & Subtitle on Left, Pill & Delete on Right */}
                          <View style={styles.favFoodTopRow}>
                            <View style={styles.favFoodTitleGroup}>
                              <Text style={styles.favFoodName} numberOfLines={1}>
                                {formattedName}
                              </Text>
                              <Text
                                style={[
                                  styles.favFoodMeta,
                                  isHealthy && styles.favFoodMetaHealthy,
                                  isNotHealthy && styles.favFoodMetaNotHealthy,
                                  !isConfirmed && styles.favFoodMetaUnconfirmed,
                                ]}
                                numberOfLines={1}
                              >
                                {isHealthy
                                  ? t('Regular · Macro-balanced')
                                  : isNotHealthy
                                  ? t('1–3x/wk · Smart moderation')
                                  : t('Select frequency')}
                              </Text>
                            </View>

                            <View style={styles.favFoodRightControls}>
                              {isConfirmed ? (
                                <Pressable
                                  hitSlop={6}
                                  onPress={() => setEditingMeal(isEditing ? null : m)}
                                  style={[
                                    styles.favInteractivePill,
                                    isHealthy
                                      ? styles.favInteractivePillHealthy
                                      : styles.favInteractivePillNotHealthy,
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${m} ${isHealthy ? 'Regular' : '1–3x/wk'}`}
                                >
                                  <View
                                    style={
                                      isHealthy
                                        ? styles.statusDotHealthy
                                        : styles.statusDotNotHealthy
                                    }
                                  />
                                  <Text
                                    style={
                                      isHealthy
                                        ? styles.favPillTextHealthy
                                        : styles.favPillTextNotHealthy
                                    }
                                  >
                                    {isHealthy ? t('Regular') : t('1–3x/wk')}
                                  </Text>
                                  <Ionicons
                                    name={isEditing ? 'chevron-up' : 'chevron-down'}
                                    size={11}
                                    color={isHealthy ? GOLD : COPPER}
                                  />
                                </Pressable>
                              ) : null}

                              <Pressable
                                hitSlop={10}
                                onPress={() => removeMeal(m)}
                                style={({ pressed }) => [
                                  styles.favRemoveCircleBtn,
                                  pressed && styles.favRemoveCircleBtnPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ${m}`}
                              >
                                <Ionicons name="close" size={13} color="rgba(247, 243, 238, 0.65)" />
                              </Pressable>
                            </View>
                          </View>

                          {/* When editing or unselected: show high-contrast interactive buttons */}
                          {isEditing ? (
                            <View style={styles.favEditChoiceContainer}>
                              <Text style={styles.favEditPrompt}>{t('Frequency')}</Text>
                              <View style={styles.favChoiceRow}>
                                <Pressable
                                  style={[
                                    styles.favChoiceBtn,
                                    isHealthy
                                      ? styles.favChoiceBtnHealthyActive
                                      : styles.favChoiceBtnInactive,
                                  ]}
                                  onPress={() => setMealHealthPreference(m, 'healthy_for_me')}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${m} Regular`}
                                >
                                  <Ionicons
                                    name="restaurant-outline"
                                    size={13}
                                    color={isHealthy ? OBSIDIAN : GOLD}
                                    style={{ marginRight: 6 }}
                                  />
                                  <View>
                                    <Text
                                      style={[
                                        styles.favChoiceText,
                                        isHealthy
                                          ? styles.favChoiceTextHealthyActive
                                          : styles.favChoiceTextInactive,
                                      ]}
                                    >
                                      {t('Regular')}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.favChoiceSubText,
                                        isHealthy
                                          ? styles.favChoiceSubHealthyActive
                                          : styles.favChoiceSubInactive,
                                      ]}
                                    >
                                      {t('Daily rotation')}
                                    </Text>
                                  </View>
                                </Pressable>

                                <Pressable
                                  style={[
                                    styles.favChoiceBtn,
                                    isNotHealthy
                                      ? styles.favChoiceBtnNotHealthyActive
                                      : styles.favChoiceBtnInactive,
                                  ]}
                                  onPress={() => setMealHealthPreference(m, 'not_healthy_for_me')}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${m} 1–3x/wk`}
                                >
                                  <Ionicons
                                    name="shield-outline"
                                    size={13}
                                    color={isNotHealthy ? OBSIDIAN : COPPER}
                                    style={{ marginRight: 6 }}
                                  />
                                  <View>
                                    <Text
                                      style={[
                                        styles.favChoiceText,
                                        isNotHealthy
                                          ? styles.favChoiceTextNotHealthyActive
                                          : styles.favChoiceTextInactive,
                                      ]}
                                    >
                                      {t('1–3x / week')}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.favChoiceSubText,
                                        isNotHealthy
                                          ? styles.favChoiceSubNotHealthyActive
                                          : styles.favChoiceSubInactive,
                                      ]}
                                    >
                                      {t('Smart treat')}
                                    </Text>
                                  </View>
                                </Pressable>
                              </View>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <Text style={styles.cardFootnote}>
                  {t(
                    'Victor integrates your favourites while keeping weekly calories and macros balanced.'
                  )}
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
                    placeholder="e.g. 30 min"
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
                    placeholder="e.g. 4"
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>
                <View style={[styles.paramRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.paramLabel}>6 · Weekly food budget (any currency)</Text>
                  <TextInput
                    style={styles.paramInput}
                    value={weeklyBudget}
                    onChangeText={setWeeklyBudget}
                    placeholder="e.g. 120 EUR / 500 GHS / £100"
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    maxLength={24}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* CTA */}
              {buildError ? <View style={styles.errorCard} accessibilityRole="alert"><Text style={styles.buildEyebrow}>PLAN NOT READY</Text><Text style={styles.buildHint}>{buildError}</Text></View> : null}
              {isBuilding ? <Text style={{ color: IVORY, marginBottom: 12 }}>Preparing your week. A new plan can take a few minutes; please keep this screen open.</Text> : null}
              <Pressable style={[styles.primaryBtn, isBuilding && styles.primaryBtnDisabled]} onPress={handleBuildWeek} disabled={isBuilding}>
                <Text style={styles.primaryBtnText}>{isBuilding ? 'Building...' : 'Build my week'}</Text>
              </Pressable>
            </View>
          ) : (
            /* 2. Week View (matching prototype lines 1621-1653) */
            <View>
              <Text style={styles.headline}>Your week</Text>
              <Text style={styles.subheadline}>
                {structuredSummary.fullText}
              </Text>
              <View style={styles.summaryPills}>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryPillLabel}>Cook</Text>
                  <Text style={styles.summaryPillValue}>{cookingTime || 'Not set'}</Text>
                </View>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryPillLabel}>People</Text>
                  <Text style={styles.summaryPillValue}>{peopleCount || 'Not set'}</Text>
                </View>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryPillLabel}>Budget</Text>
                  <Text style={styles.summaryPillValue}>
                    {parseBudgetEntry(weeklyBudget)
                      ? formatCurrencyAmount(parseBudgetEntry(weeklyBudget)!.amount, parseBudgetEntry(weeklyBudget)!.currency, userLocale)
                      : weeklyBudget || 'Not set'}
                  </Text>
                </View>
              </View>

              {/* Days Card */}
              <View style={styles.card}>
                {(activePlan?.days || []).map((d, idx) => {
                  const isExpanded = expandedDayKey === d.day;
                  const dayName = t(formatDayName(d.day));
                  const proteinText = `${proteinForDay(d)} g protein`;
                  const allMeals = [d.breakfast, d.lunch, d.dinner, d.pre_workout, d.post_workout].filter(Boolean);
                  const totalKcal = allMeals.reduce((sum, m: any) => sum + Math.max(0, Number(m?.kcal || 0)), 0);

                  return (
                    <View
                      key={d.day}
                      style={[
                        styles.dayBlock,
                        idx < (activePlan?.days?.length || 0) - 1 && styles.dayBlockBorder,
                      ]}
                    >
                      <Pressable
                        style={styles.dayTopRow}
                        onPress={() => setExpandedDayKey((prev) => (prev === d.day ? null : d.day))}
                        accessibilityRole="button"
                        accessibilityLabel={`${dayName}, ${isExpanded ? t('Collapse day') : t('Expand day')}`}
                      >
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
                          <Text style={styles.dayTitle}>{dayName}</Text>
                          <Text style={styles.dayProtein}>
                            {totalKcal > 0 ? `${totalKcal} kcal · ` : ''}
                            {proteinText}
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={18}
                          color={isExpanded ? GOLD : 'rgba(247, 243, 238, 0.4)'}
                        />
                      </Pressable>

                      {isExpanded ? (
                        <View style={styles.expandedDayContent}>
                          {/* Day-level prep action commented out - each meal card below has its own dedicated preparation steps toggle
                          <View style={styles.dayActionRow}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t('Preparation steps')}
                              onPress={() => handleToggleDayPrep(d.day, d)}
                              style={styles.prepLinkButton}
                            >
                              <Text style={styles.prepLink}>
                                {t('Preparation steps')}{' '}
                                {Boolean(
                                  openPrepMealKeys[`${d.day}-breakfast`] ||
                                  openPrepMealKeys[`${d.day}-lunch`] ||
                                  openPrepMealKeys[`${d.day}-dinner`]
                                )
                                  ? '▴'
                                  : '›'}
                              </Text>
                            </Pressable>
                            <Text style={styles.prepTime}>{`${Math.max(
                              15,
                              Math.min(45, (d.breakfast?.instructions?.length || 1) * 5 + 20)
                            )} min total`}</Text>
                          </View>
                          */}
                          {renderModalMealCard('breakfast', t('Breakfast'), d.breakfast, d.day)}
                          {renderModalMealCard('lunch', t('Lunch'), d.lunch, d.day)}
                          {renderModalMealCard('pre_workout', t('Pre-workout snack'), d.pre_workout, d.day)}
                          {renderModalMealCard('post_workout', t('Post-workout snack'), d.post_workout, d.day)}
                          {renderModalMealCard('dinner', t('Dinner'), d.dinner, d.day)}
                        </View>
                      ) : (
                        <View>
                          <Pressable onPress={() => setExpandedDayKey(d.day)}>
                            <Text style={styles.dayMeals}>{mealNamesForDay(d)}</Text>
                          </Pressable>
                          <View style={styles.dayActionRow}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t('Preparation steps')}
                              onPress={() => handleToggleDayPrep(d.day, d)}
                              style={styles.prepLinkButton}
                            >
                              <Text style={styles.prepLink}>{t('Preparation steps')} ›</Text>
                            </Pressable>
                            <Text style={styles.prepTime}>{`${Math.max(
                              15,
                              Math.min(45, (d.breakfast?.instructions?.length || 1) * 5 + 20)
                            )} min total`}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              {(!activePlan?.days || activePlan.days.length === 0) ? (
                <Text style={styles.moreDaysNote}>No saved plan yet. Go back and build your week.</Text>
              ) : null}

              {/* Bottom Button */}
              <Pressable style={styles.primaryBtn} onPress={onOpenShoppingList}>
                <Text style={styles.primaryBtnText}>See the shopping list</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buildCard: { backgroundColor: NAVY, borderRadius: 24, padding: 24, marginTop: 20, borderWidth: 1, borderColor: 'rgba(201,148,58,0.35)' },
  buildEyebrow: { color: GOLD, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16 },
  buildPercentage: { color: IVORY, fontSize: 48, fontWeight: '700', textAlign: 'center', marginVertical: 20 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(247,243,238,0.15)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: GOLD, borderRadius: 4 },
  buildHint: { color: 'rgba(247,243,238,0.8)', fontSize: 14, lineHeight: 21, marginTop: 16, textAlign: 'center' },
  cancelButton: { backgroundColor: GOLD, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  errorCard: { backgroundColor: NAVY, borderLeftWidth: 3, borderLeftColor: COPPER, padding: 20, borderRadius: 12, marginBottom: 16 },
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.select({ web: 10, default: 4 }),
    paddingBottom: 8,
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
    paddingTop: 4,
    paddingBottom: 36,
  },
  headline: {
    fontFamily: DMSANS,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: IVORY,
    marginBottom: 6,
  },
  subheadline: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 10,
  },
  summaryPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
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
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.16)',
    backgroundColor: 'rgba(4, 14, 24, 0.45)',
    paddingHorizontal: 14,
    fontFamily: INTER,
    fontSize: 13.5,
    color: IVORY,
  },
  addMealBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMealBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
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
  expandedDayContent: {
    marginTop: 10,
    gap: 10,
  },
  modalMealCard: {
    backgroundColor: '#071826',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalMealKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1,
  },
  modalMealName: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
    color: IVORY,
  },
  modalMealMacros: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: GOLD,
  },
  prepLinkButton: {
    paddingVertical: 2,
    paddingRight: 6,
  },
  modalMealPrepBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  modalMealPrepBtnText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  modalInstructionsList: {
    marginTop: 8,
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.08)',
  },
  modalInstructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  modalStepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  modalStepBadgeText: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  modalInstructionText: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.85)',
  },
  modalMealPrep: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.7)',
    lineHeight: 17,
    marginTop: 2,
  },
  favFoodsContainer: {
    marginTop: 14,
    gap: 8,
  },
  favFoodItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  favFoodItemCardHealthy: {
    borderColor: 'rgba(201, 148, 58, 0.35)',
    backgroundColor: 'rgba(201, 148, 58, 0.05)',
  },
  favFoodItemCardNotHealthy: {
    borderColor: 'rgba(181, 101, 29, 0.4)',
    backgroundColor: 'rgba(181, 101, 29, 0.06)',
  },
  favFoodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  favFoodTitleGroup: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  favFoodName: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: IVORY,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  favFoodMeta: {
    fontFamily: INTER,
    fontSize: 11.5,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  favFoodMetaHealthy: {
    color: 'rgba(201, 148, 58, 0.85)',
  },
  favFoodMetaNotHealthy: {
    color: 'rgba(232, 152, 88, 0.85)',
  },
  favFoodMetaUnconfirmed: {
    color: 'rgba(247, 243, 238, 0.5)',
  },
  favFoodRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favInteractivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 99,
    gap: 4,
    borderWidth: 1,
  },
  favInteractivePillHealthy: {
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderColor: 'rgba(201, 148, 58, 0.45)',
  },
  favInteractivePillNotHealthy: {
    backgroundColor: 'rgba(181, 101, 29, 0.18)',
    borderColor: 'rgba(181, 101, 29, 0.45)',
  },
  statusDotHealthy: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: GOLD,
  },
  statusDotNotHealthy: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COPPER,
  },
  favPillTextHealthy: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.2,
  },
  favPillTextNotHealthy: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    color: COPPER,
    letterSpacing: 0.2,
  },
  favRemoveCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favRemoveCircleBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  favEditChoiceContainer: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.08)',
    marginTop: 2,
  },
  favEditPrompt: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  favChoiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  favChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  favChoiceBtnInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(247, 243, 238, 0.16)',
  },
  favChoiceBtnHealthyActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  favChoiceBtnNotHealthyActive: {
    backgroundColor: COPPER,
    borderColor: COPPER,
  },
  favChoiceText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
  },
  favChoiceTextInactive: {
    color: IVORY,
  },
  favChoiceTextHealthyActive: {
    color: OBSIDIAN,
  },
  favChoiceTextNotHealthyActive: {
    color: OBSIDIAN,
  },
  favChoiceSubText: {
    fontFamily: INTER,
    fontSize: 10,
    marginTop: 1,
  },
  favChoiceSubInactive: {
    color: 'rgba(247, 243, 238, 0.55)',
  },
  favChoiceSubHealthyActive: {
    color: 'rgba(4, 14, 24, 0.85)',
  },
  favChoiceSubNotHealthyActive: {
    color: 'rgba(4, 14, 24, 0.85)',
  },
  favPromptHint: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.55)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
