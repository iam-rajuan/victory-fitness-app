import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useLanguage } from '../../lib/i18n';

export interface MealRecord {
  id: string;
  mealKey?: string;
  logId?: string;
  name: string;
  sub: string;
  proteinG: number;
  carbsG?: number;
  fatG?: number;
  kcal?: number;
  logged: boolean;
  isExtraLog?: boolean;
  isDinnerPlanned?: boolean;
}

interface ClaudeFullDayMealsProps {
  meals: MealRecord[];
  updatingMealKey?: string | null;
  onToggleMeal?: (meal: MealRecord) => void;
  onRemoveMeal?: (meal: MealRecord) => void;
  onLogMeal?: (mealId: string) => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeFullDayMeals({ meals, updatingMealKey, onToggleMeal, onRemoveMeal, onLogMeal }: ClaudeFullDayMealsProps) {
  const { t } = useLanguage();
  const visibleMeals = meals.length > 0 ? meals : [
    {
      id: 'empty',
      mealKey: 'breakfast',
      name: t('No backend meals yet'),
      sub: t('Saved meal plan meals appear here'),
      proteinG: 0,
      kcal: 0,
      logged: false,
    },
  ];
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>{t('YOUR FULL DAY')}</Text>

      <View style={styles.card}>
        {visibleMeals.map((m, idx) => {
          const isHighlight = m.isDinnerPlanned && !m.logged;
          const isLast = idx === visibleMeals.length - 1;
          const isUpdating = updatingMealKey === (m.mealKey || m.id);

          return (
            <View
              key={m.id}
              style={[
                styles.mealRow,
                !isLast && styles.mealRowBorder,
                isHighlight && styles.highlightRow,
              ]}
            >
              {/* Status Indicator Dot matching prototype */}
              {m.logged ? (
                <View style={styles.greenDot} />
              ) : isHighlight ? (
                <View style={styles.goldRingDot} />
              ) : (
                <View style={styles.grayRingDot} />
              )}

              {/* Meal Name & Sub */}
              <View style={styles.mealTextCol}>
                <Text style={styles.mealName}>{m.name}</Text>
                <Text style={styles.mealSub}>{m.sub}</Text>
              </View>

              {/* Right Macro & CTA */}
              <View style={styles.rightCol}>
                <Text
                  style={[
                    styles.proteinVal,
                    !m.logged && !isHighlight && { color: 'rgba(247, 243, 238, 0.6)' },
                  ]}
                >
                  {`${m.proteinG} g`}
                </Text>
                {m.logged ? (
                  <>
                    <Text style={styles.kcalVal}>{`${m.kcal} kcal`}</Text>
                    <TouchableOpacity
                      activeOpacity={0.72}
                      onPress={() => onRemoveMeal?.(m)}
                      style={styles.removeBtn}
                      disabled={isUpdating}
                    >
                      <Text style={styles.removeText}>{isUpdating ? '...' : t('REMOVE')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      onToggleMeal?.(m);
                      onLogMeal?.(m.id);
                    }}
                    style={styles.actionBtn}
                    disabled={isUpdating || m.id === 'empty'}
                  >
                    <Text style={styles.actionText}>
                      {isUpdating ? '...' : t('ADD')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.footnote}>
        {t('Every meal of the day is laid out from the start, dinner included — so you can see at 09:00 whether the target is reachable, not at 22:00.')}
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
    flexShrink: 0,
  },
  goldRingDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: GOLD,
    flexShrink: 0,
  },
  grayRingDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    flexShrink: 0,
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
  removeBtn: {
    marginTop: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.45)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  removeText: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: GOLD,
  },
  actionBtn: {
    marginTop: 2,
    paddingVertical: 2,
  },
  actionText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.8,
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 10,
  },
});
