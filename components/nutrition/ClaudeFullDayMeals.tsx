import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface MealRecord {
  id: string;
  name: string;
  sub: string;
  proteinG: number;
  kcal?: number;
  logged: boolean;
  planned?: boolean;
}

interface ClaudeFullDayMealsProps {
  onLogMeal?: (mealId: string) => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeFullDayMeals({ onLogMeal }: ClaudeFullDayMealsProps) {
  const { colors, isDark } = useTheme();
  const [meals, setMeals] = useState<MealRecord[]>([
    {
      id: 'm1',
      name: 'Oats, skyr & berries',
      sub: 'Breakfast · 07:40',
      proteinG: 32,
      kcal: 420,
      logged: true,
    },
    {
      id: 'm2',
      name: 'Chicken & rice bowl',
      sub: 'Lunch · 12:55',
      proteinG: 54,
      kcal: 640,
      logged: true,
    },
    {
      id: 'm3',
      name: 'Salmon, potatoes & broccoli',
      sub: 'Dinner · planned for 19:30',
      proteinG: 31,
      kcal: 680,
      planned: true,
      logged: false,
    },
    {
      id: 'm4',
      name: 'Evening shake',
      sub: 'Only if dinner leaves you short',
      proteinG: 25,
      kcal: 180,
      logged: false,
    },
  ]);

  const handleToggleMeal = (id: string) => {
    setMeals((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const next = !m.logged;
          return {
            ...m,
            logged: next,
            sub: next ? `${m.name.split(' ')[0]} · eaten` : m.sub,
          };
        }
        return m;
      })
    );
    if (onLogMeal) onLogMeal(id);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.kicker, { color: colors.textMuted }]}>YOUR FULL DAY</Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowColor: '#0D2B45',
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 14,
            elevation: 2,
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
      >
        {meals.map((m, idx) => {
          const isHighlight = m.planned && !m.logged;
          return (
            <View
              key={m.id}
              style={[
                styles.mealRow,
                idx < meals.length - 1 && styles.mealRowBorder,
                isHighlight && styles.highlightRow,
                { borderBottomColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.08)' },
              ]}
            >
              {/* Status Indicator Dot */}
              {m.logged ? (
                <View style={styles.greenDot} />
              ) : isHighlight ? (
                <View style={styles.goldRingDot} />
              ) : (
                <View
                  style={[
                    styles.grayRingDot,
                    { borderColor: isDark ? 'rgba(247, 243, 238, 0.3)' : 'rgba(13, 43, 69, 0.25)' },
                  ]}
                />
              )}

              {/* Meal Name & Sub */}
              <View style={styles.mealTextCol}>
                <Text style={[styles.mealName, { color: isDark ? IVORY : NAVY }]}>{m.name}</Text>
                <Text
                  style={[
                    styles.mealSub,
                    { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.55)' },
                  ]}
                >
                  {m.sub}
                </Text>
              </View>

              {/* Action / Value */}
              <View style={styles.rightCol}>
                <Text
                  style={[
                    styles.proteinVal,
                    !m.logged && !isHighlight && {
                      color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.6)',
                    },
                  ]}
                >
                  {`${m.proteinG} g`}
                </Text>
                {m.logged ? (
                  <Text
                    style={[
                      styles.kcalVal,
                      { color: isDark ? 'rgba(247, 243, 238, 0.45)' : 'rgba(13, 43, 69, 0.5)' },
                    ]}
                  >
                    {`${m.kcal} kcal`}
                  </Text>
                ) : (
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleToggleMeal(m.id)}
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionText}>
                      {isHighlight ? 'LOG IT' : 'ADD'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        Every meal of the day is laid out from the start, dinner included — so you can see at 09:00 whether the target is reachable, not at 22:00.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  mealRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  highlightRow: {
    backgroundColor: 'rgba(201, 148, 58, 0.09)',
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  goldRingDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  grayRingDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
  },
  mealTextCol: {
    flex: 1,
    minWidth: 0,
  },
  mealName: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  mealSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  proteinVal: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  kcalVal: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 2,
  },
  actionBtn: {
    marginTop: 2,
  },
  actionText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '700',
    color: GOLD,
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 10,
  },
});
