import React from 'react';
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
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

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
  {
    day: 'Thursday',
    proteinText: '112 g protein',
    meals: 'Protein smoothie · Lean beef stir-fry · Roasted chickpeas & greens',
    prepTime: '20 min total',
  },
  {
    day: 'Friday',
    proteinText: '115 g protein',
    meals: 'Chia seed pudding · Grilled salmon bowl · Turkey chili',
    prepTime: '25 min total',
  },
  {
    day: 'Saturday',
    proteinText: '111 g protein',
    meals: 'Omelette with spinach · Grilled chicken wrap · Baked cod & asparagus',
    prepTime: '35 min total',
  },
  {
    day: 'Sunday',
    proteinText: '112 g protein',
    meals: 'Greek yogurt parfait · Sunday roast chicken · Stewed beans & plantains',
    prepTime: '40 min total',
  },
];

export default function ClaudeWeekPlanModal({
  visible,
  onClose,
  onOpenShoppingList,
}: ClaudeWeekPlanModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.backBtn}>← Food</Text>
          </Pressable>
          <Text style={styles.weekDates}>11–17 MAY</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.headline}>Your week</Text>
          <Text style={styles.subheadline}>
            German and Ghanaian dishes, lactose-free, 30 minutes or less on weekdays, four portions each. Every day lands on 112 g of protein.
          </Text>

          {/* Days Card */}
          <View style={styles.planCard}>
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

          {/* Bottom Button */}
          <Pressable style={styles.shopBtn} onPress={onOpenShoppingList}>
            <Text style={styles.shopBtnText}>See the shopping list</Text>
          </Pressable>
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
  weekDates: {
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
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 8,
  },
  subheadline: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },
  dayBlock: {
    padding: 18,
  },
  dayBlockBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    lineHeight: 22,
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
    color: 'rgba(247, 243, 238, 0.4)',
  },
  shopBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
