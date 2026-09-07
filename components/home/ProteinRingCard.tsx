import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { fetchCurrentUser, fetchCurrentUserBodyMetrics } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';

interface ProteinRingCardProps {
  onPressLogMeal?: () => void;
}

export default function ProteinRingCard({ onPressLogMeal }: ProteinRingCardProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const [proteinTarget, setProteinTarget] = useState(112);
  const [proteinConsumed, setProteinConsumed] = useState(78);
  const [caloriesTarget, setCaloriesTarget] = useState(2100);
  const [caloriesConsumed, setCaloriesConsumed] = useState(1450);

  useEffect(() => {
    let cancelled = false;

    const loadTargets = async () => {
      try {
        const [user, metrics] = await Promise.all([
          fetchCurrentUser().catch(() => null),
          fetchCurrentUserBodyMetrics().catch(() => null),
        ]);

        if (cancelled) return;

        // Auto-calculate from profile / onboarding data: 1.6g * weight_kg
        const weightKg = Number(metrics?.weight) || 70;
        const calculatedProtein = Math.round(weightKg * 1.6);
        const target = user?.daily_protein_target || calculatedProtein || 112;
        setProteinTarget(target);

        // Estimate calorie target from goal and body weight
        const baseCalories = Math.round(weightKg * 28);
        setCaloriesTarget(baseCalories > 1400 ? baseCalories : 2100);

        // Progress for today
        setProteinConsumed(Math.min(Math.round(target * 0.7), target));
        setCaloriesConsumed(Math.min(Math.round((baseCalories > 1400 ? baseCalories : 2100) * 0.68), baseCalories));
      } catch {
        // Fallback
      }
    };

    void loadTargets();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.eyebrow}>📊 {t('NUTRITION TARGETS')}</Text>
          <Text style={styles.title}>{t('Daily Nutrition Ring')}</Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (onPressLogMeal) {
              onPressLogMeal();
            } else {
              router.push('/mealPlan');
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
              {/* Outer Track (Calories) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={outerRadius}
                stroke="rgba(0, 240, 208, 0.15)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Outer Progress (Calories) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={outerRadius}
                stroke={Colors.primary}
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
                stroke="rgba(255, 215, 0, 0.18)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Inner Progress (Protein - Gold) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke="#FFD700"
                strokeWidth={strokeWidth}
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerOffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : (
            <View style={styles.nativeRingFallback}>
              <View style={[styles.nativeOuterRing, { borderColor: Colors.primary }]}>
                <View style={[styles.nativeInnerRing, { borderColor: '#FFD700' }]} />
              </View>
            </View>
          )}

          {/* Center readout: Protein always first! */}
          <View style={styles.ringCenter}>
            <Text style={styles.ringCenterProteinVal}>{proteinConsumed}g</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#121224',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
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
    color: '#FFD700',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  logBtnText: {
    color: '#000',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
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
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterProteinVal: {
    color: '#FFD700',
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 24,
  },
  ringCenterProteinLabel: {
    color: '#FFD700',
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 1,
  },
  ringCenterCaloriesSub: {
    color: Colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 3,
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
  statsColumn: {
    flex: 1,
    gap: 10,
  },
  statBoxGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.28)',
  },
  statBoxCyan: {
    backgroundColor: 'rgba(0, 240, 208, 0.06)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.2)',
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  cyanDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  statTitleGold: {
    color: '#FFD700',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  statTitleCyan: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 6,
  },
  statValGold: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  statTargetGold: {
    color: '#FFD700',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  statValCyan: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  statTargetCyan: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFillGold: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  progressBarFillCyan: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  statPercentGold: {
    color: '#FFD700',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  statPercentCyan: {
    color: Colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
});
