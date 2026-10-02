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
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeFullDayMeals({ meals, updatingMealKey, onToggleMeal }: ClaudeFullDayMealsProps) {
  const { t } = useLanguage();
  const visibleMeals = meals.length > 0 ? meals : [
    {
      id: 'empty-breakfast',
      mealKey: 'breakfast',
      name: t('Breakfast will appear here'),
      sub: t('Build or refresh your food plan'),
      proteinG: 0,
      kcal: 0,
      logged: false,
    },
    {
      id: 'empty-lunch',
      mealKey: 'lunch',
      name: t('Lunch will appear here'),
      sub: t('Your full day stays ready here'),
      proteinG: 0,
      kcal: 0,
      logged: false,
    },
    {
      id: 'empty-dinner',
      mealKey: 'dinner',
      name: t('Dinner will appear here'),
      sub: t('Plan meals once and track them here'),
      proteinG: 0,
      kcal: 0,
      logged: false,
    },
  ];
  const doneCount = meals.filter((meal) => meal.logged).length;
  const totalCount = meals.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>{t('YOUR FULL DAY')}</Text>
        {totalCount > 0 ? (
          <Text style={styles.trackBadge}>{t('{done} of {total} done', { done: doneCount, total: totalCount })}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        {visibleMeals.map((m, idx) => {
          const isHighlight = m.isDinnerPlanned && !m.logged;
          const isLast = idx === visibleMeals.length - 1;
          const isUpdating = updatingMealKey === (m.mealKey || m.id);
          const canToggle = !m.id.startsWith('empty-') && Boolean(onToggleMeal);

          return (
            <TouchableOpacity
              key={m.id}
              activeOpacity={canToggle ? 0.82 : 1}
              style={[
                styles.mealRow,
                !isLast && styles.mealRowBorder,
                isHighlight && styles.highlightRow,
                m.logged && styles.mealRowDone,
              ]}
              onPress={() => {
                if (!canToggle || isUpdating) return;
                onToggleMeal?.(m);
              }}
              disabled={!canToggle || isUpdating}
            >
              <View
                style={[
                  styles.checkBox,
                  m.logged ? styles.checkBoxDone : styles.checkBoxPending,
                ]}
              />

              <View style={styles.mealTextCol}>
                <Text style={[styles.mealName, m.logged && styles.mealNameDone]} numberOfLines={2}>
                  {m.name}
                </Text>
                <Text style={styles.mealSub} numberOfLines={2}>
                  {m.sub}
                </Text>
              </View>

              <View style={styles.rightCol}>
                <Text
                  style={[
                    styles.proteinVal,
                    m.logged && styles.proteinValDone,
                    !m.logged && !isHighlight && { color: 'rgba(247, 243, 238, 0.6)' },
                  ]}
                >
                  {m.logged ? t('Eaten') : `+${m.proteinG} g`}
                </Text>
                <Text style={styles.kcalVal}>{`${m.kcal || 0} kcal`}</Text>
              </View>
            </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
  },
  trackBadge: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '500',
    color: GOLD,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    minHeight: 76,
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
  mealRowDone: {
    backgroundColor: 'rgba(26, 122, 74, 0.1)',
  },
  checkBox: {
    width: 19,
    height: 19,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkBoxPending: {
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.6)',
  },
  checkBoxDone: {
    backgroundColor: GREEN,
  },
  mealTextCol: {
    flex: 1,
    minWidth: 0,
  },
  mealName: {
    fontFamily: DMSANS,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    color: IVORY,
  },
  mealNameDone: {
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.55)',
    textDecorationLine: 'line-through',
  },
  mealSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 16,
    minHeight: 32,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minHeight: 37,
  },
  proteinVal: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  proteinValDone: {
    color: 'rgba(247, 243, 238, 0.4)',
  },
  kcalVal: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 2,
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
