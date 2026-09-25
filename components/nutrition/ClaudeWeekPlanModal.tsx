import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';

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
const FAVORITE_MEALS = ['Chicken & rice', 'Salmon & potatoes', 'Oats & skyr', '+ add your own'];
const ALLERGIES = ['Lactose', 'Nuts', 'Gluten', 'Shellfish', 'Pork'];

const DAYS_PLAN: DayPlan[] = [
  {
    day: 'Monday',
    proteinText: '114 g protein',
    meals: 'Oats with berries · Jollof rice with chicken · Salmon, potatoes, broccoli',
    prepTime: '25 min total',
  },
  {
    day: 'Tuesday',
    proteinText: '110 g protein',
    meals: 'Skyr with honey · Chicken & rice bowl · Groundnut soup with turkey',
    prepTime: '30 min total',
  },
  {
    day: 'Wednesday',
    proteinText: '113 g protein',
    meals: 'Eggs on rye · Lentil stew · Waakye with grilled fish',
    prepTime: '28 min total',
  },
];

export default function ClaudeWeekPlanModal({
  visible,
  onClose,
  onOpenShoppingList,
}: ClaudeWeekPlanModalProps) {
  const [viewMode, setViewMode] = useState<'questionnaire' | 'weekPlan'>('questionnaire');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['German', 'Ghanaian']);
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['Chicken & rice', 'Salmon & potatoes']);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(['Lactose']);

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

  const toggleAllergy = (a: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleBack = () => {
    if (viewMode === 'weekPlan') {
      setViewMode('questionnaire');
    } else {
      onClose();
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
                  {FAVORITE_MEALS.map((m) => {
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
              </View>

              {/* 3 · ALLERGIES AND ANYTHING YOU CANNOT EAT */}
              <View style={[styles.card, styles.cardCopperBorder]}>
                <Text style={styles.cardKicker}>3 · ALLERGIES AND ANYTHING YOU CANNOT EAT</Text>
                <View style={styles.chipsWrap}>
                  {ALLERGIES.map((a) => {
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
                <Text style={styles.cardFootnote}>
                  Anything ticked here is excluded from every plan and every shopping list, permanently.
                </Text>
              </View>

              {/* 4, 5, 6 Parameter Rows */}
              <View style={[styles.card, styles.paramsCard]}>
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>4 · Cooking time on a weekday</Text>
                  <Text style={styles.paramValue}>30 min</Text>
                </View>
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>5 · People you cook for</Text>
                  <Text style={styles.paramValue}>4</Text>
                </View>
                <View style={[styles.paramRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.paramLabel}>6 · Weekly food budget</Text>
                  <Text style={styles.paramValue}>€120</Text>
                </View>
              </View>

              {/* CTA */}
              <Pressable style={styles.primaryBtn} onPress={() => setViewMode('weekPlan')}>
                <Text style={styles.primaryBtnText}>Build my week</Text>
              </Pressable>
            </View>
          ) : (
            /* 2. Week View (matching prototype lines 1621-1653) */
            <View>
              <Text style={styles.headline}>Your week</Text>
              <Text style={styles.subheadline}>
                German and Ghanaian dishes, lactose-free, 30 minutes or less on weekdays, four portions each. Every day lands on 112 g of protein.
              </Text>

              {/* Days Card */}
              <View style={styles.card}>
                {DAYS_PLAN.map((d, idx) => (
                  <View
                    key={d.day}
                    style={[
                      styles.dayBlock,
                      idx < DAYS_PLAN.length - 1 && styles.dayBlockBorder,
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
    marginBottom: 22,
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
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
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
