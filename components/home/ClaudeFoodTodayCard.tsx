import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';

interface ClaudeFoodTodayCardProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
  onNavigateFood?: () => void;
  onNavigatePlan?: () => void;
  onLogDinner?: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudeFoodTodayCard({
  tier,
  onNavigateFood,
  onNavigatePlan,
  onLogDinner,
}: ClaudeFoodTodayCardProps) {
  const router = useRouter();
  const hasFoodPlanner = tier !== 'SILVER' && tier !== 'NONE';
  const [dinnerLogged, setDinnerLogged] = useState(false);

  const handleOpenFood = () => {
    if (onNavigateFood) {
      onNavigateFood();
      return;
    }
    pushRoute(router, '/mealPlan');
  };

  const handleOpenWeekPlan = () => {
    if (onNavigatePlan) {
      onNavigatePlan();
      return;
    }
    pushRoute(router, '/mealPlan');
  };

  const handleLogDinner = () => {
    setDinnerLogged((prev) => !prev);
    if (onLogDinner) onLogDinner();
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionKicker}>FOOD TODAY</Text>
        <Pressable hitSlop={8} onPress={handleOpenFood}>
          <Text style={styles.screenLink}>Food screen ›</Text>
        </Pressable>
      </View>

      {/* Card Content based on Tier */}
      {hasFoodPlanner ? (
        <View style={styles.card}>
          {/* Breakfast */}
          <Pressable style={styles.mealRow} onPress={handleOpenFood}>
            <View style={styles.greenDot} />
            <View style={styles.mealTextCol}>
              <Text style={styles.mealTitle}>Oats, skyr &amp; berries</Text>
              <Text style={styles.mealSub}>Breakfast · eaten</Text>
            </View>
          </Pressable>

          {/* Lunch */}
          <Pressable style={styles.mealRow} onPress={handleOpenFood}>
            <View style={styles.greenDot} />
            <View style={styles.mealTextCol}>
              <Text style={styles.mealTitle}>Chicken &amp; rice bowl</Text>
              <Text style={styles.mealSub}>Lunch · eaten</Text>
            </View>
          </Pressable>

          {/* Dinner */}
          <Pressable
            style={[styles.mealRow, !dinnerLogged && styles.dinnerHighlightRow]}
            onPress={handleOpenFood}
          >
            {dinnerLogged ? (
              <View style={styles.greenDot} />
            ) : (
              <View style={styles.goldRingDot} />
            )}
            <View style={styles.mealTextCol}>
              <Text style={styles.mealTitle}>Salmon, potatoes &amp; broccoli</Text>
              <Text style={styles.mealSub}>
                {dinnerLogged
                  ? 'Dinner · eaten'
                  : 'Dinner · 19:30, from your week plan'}
              </Text>
            </View>
            <Pressable hitSlop={10} style={styles.logBtn} onPress={handleLogDinner}>
              <Text style={styles.logBtnText}>{dinnerLogged ? 'DONE' : 'LOG'}</Text>
            </Pressable>
          </Pressable>

          {/* Week Plan Row */}
          <Pressable style={styles.weekPlanRow} onPress={handleOpenWeekPlan}>
            <Text style={styles.weekPlanTitle}>This week's food plan</Text>
            <Text style={styles.weekPlanArrow}>›</Text>
          </Pressable>
        </View>
      ) : (
        /* Silver locked card */
        <Pressable
          style={styles.lockedCard}
          onPress={() => pushRoute(router, '/plan')}
        >
          <View style={styles.lockIconBox}>
            <View style={styles.lockIconGraphic} />
          </View>
          <View style={styles.lockedTextCol}>
            <Text style={styles.lockedTitle}>The nutrition planner lives on Gold</Text>
            <Text style={styles.lockedSub}>
              A full week of meals built from your favourites list, hitting your protein target.
            </Text>
          </View>
          <Text style={styles.lockedActionText}>See ›</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.42)',
  },
  screenLink: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  dinnerHighlightRow: {
    backgroundColor: 'rgba(201, 148, 58, 0.09)',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  goldRingDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  mealTextCol: {
    flex: 1,
  },
  mealTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
  },
  mealSub: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  logBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  logBtnText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '700',
    color: GOLD,
  },
  weekPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  weekPlanTitle: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  weekPlanArrow: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
  lockedCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
  },
  lockIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconGraphic: {
    width: 9,
    height: 12,
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 2,
    borderTopWidth: 5,
  },
  lockedTextCol: {
    flex: 1,
  },
  lockedTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 2,
  },
  lockedSub: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  lockedActionText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
});
