import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';
import {
  PointsBreakdownResponse,
  fetchMyPointsBreakdown,
} from '../../lib/api';

interface PointsProgressionCardProps {
  onRefreshNeeded?: () => void;
}

export default function PointsProgressionCard({ onRefreshNeeded }: PointsProgressionCardProps) {
  const { t } = useLanguage();
  const [breakdown, setBreakdown] = useState<PointsBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6); // Default to today (last item)

  const loadBreakdown = async () => {
    try {
      const res = await fetchMyPointsBreakdown();
      setBreakdown(res);
      if (res.seven_day_breakdown && res.seven_day_breakdown.length > 0) {
        setSelectedDayIndex(res.seven_day_breakdown.length - 1);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBreakdown();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.accentGold} />
          <Text style={styles.loadingText}>{t('Loading points & tier progression...')}</Text>
        </View>
      </View>
    );
  }

  if (!breakdown) return null;

  const totalPoints = breakdown.total_points;
  const currentTier = breakdown.current_tier;
  const nextTier = breakdown.next_tier;
  const pointsToNext = breakdown.points_to_next_tier;
  const progressPct = Math.round(breakdown.rank_progress_fraction * 100);
  const days = breakdown.seven_day_breakdown || [];
  const selectedDay = days[selectedDayIndex] || days[days.length - 1];
  const maxDayPoints = Math.max(...days.map((d) => d.total), 50);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.ptsIconCircle}>
            <Ionicons name="flash" size={15} color={Colors.gold} />
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
              {t('POINTS & TIERS')}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {t('Level up through workouts & habits')}
            </Text>
          </View>
        </View>
        <View style={styles.ptsTotalBadge}>
          <Text style={styles.ptsTotalBadgeText}>⚡ {totalPoints} PTS</Text>
        </View>
      </View>

      {/* Tier Progression Bar */}
      <View style={styles.tierProgressionBox}>
        <View style={styles.tierLabelsRow}>
          <View style={styles.tierBadgeWrap}>
            <Text style={styles.tierLabelCurrent}>{currentTier.toUpperCase()}</Text>
          </View>
          <Text style={styles.tierLabelNext}>
            {pointsToNext > 0 ? `${pointsToNext} ${t('pts to')} ${nextTier.toUpperCase()}` : t('MAX TIER REACHED')}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <View style={styles.tierFooterRow}>
          <Text style={styles.tierPctText}>{progressPct}% {t('completed')}</Text>
          <Text style={styles.tierTargetText}>{t('Target')}: {nextTier}</Text>
        </View>
      </View>

      {/* 7-Day Breakdown Header & Category Badges */}
      <View style={styles.breakdownSection}>
        <Text style={styles.breakdownTitle}>{t('7-DAY ACTIVITY BREAKDOWN')}</Text>
        <View style={styles.categoryPillsGrid}>
          <View style={[styles.categoryPill, { borderColor: 'rgba(26, 122, 74, 0.40)', backgroundColor: 'rgba(26, 122, 74, 0.12)' }]}>
            <Text style={styles.categoryPillEmoji}>🏋️</Text>
            <Text style={styles.categoryPillLabel}>{t('Workouts')}</Text>
            <Text style={[styles.categoryPillValue, { color: Colors.victoryGreen }]}>
              +{breakdown.category_totals_7d.workouts}
            </Text>
          </View>

          <View style={[styles.categoryPill, { borderColor: 'rgba(181, 101, 29, 0.40)', backgroundColor: 'rgba(181, 101, 29, 0.12)' }]}>
            <Text style={styles.categoryPillEmoji}>🥗</Text>
            <Text style={styles.categoryPillLabel}>{t('Nutrition')}</Text>
            <Text style={[styles.categoryPillValue, { color: Colors.copper }]}>
              +{breakdown.category_totals_7d.nutrition}
            </Text>
          </View>

          <View style={[styles.categoryPill, { borderColor: 'rgba(13, 43, 69, 0.60)', backgroundColor: 'rgba(13, 43, 69, 0.35)' }]}>
            <Text style={styles.categoryPillEmoji}>🎯</Text>
            <Text style={styles.categoryPillLabel}>{t('Habits')}</Text>
            <Text style={[styles.categoryPillValue, { color: Colors.gold }]}>
              +{breakdown.category_totals_7d.habits}
            </Text>
          </View>

          <View style={[styles.categoryPill, { borderColor: 'rgba(201, 148, 58, 0.40)', backgroundColor: 'rgba(201, 148, 58, 0.12)' }]}>
            <Text style={styles.categoryPillEmoji}>🔥</Text>
            <Text style={styles.categoryPillLabel}>{t('Streaks')}</Text>
            <Text style={[styles.categoryPillValue, { color: Colors.gold }]}>
              +{breakdown.category_totals_7d.streaks}
            </Text>
          </View>
        </View>

        {/* 7-Day Columns Chart */}
        <View style={styles.chartContainer}>
          {days.map((day, idx) => {
            const isSelected = idx === selectedDayIndex;
            const barHeightPct = Math.max(Math.round((day.total / maxDayPoints) * 100), 8);
            return (
              <TouchableOpacity
                key={day.date}
                style={[styles.chartDayCol, isSelected && styles.chartDayColSelected]}
                onPress={() => setSelectedDayIndex(idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chartColPts, isSelected && styles.chartColPtsSelected]}>
                  {day.total > 0 ? day.total : '-'}
                </Text>
                <View style={styles.chartBarTrack}>
                  <View
                    style={[
                      styles.chartBarFill,
                      { height: `${barHeightPct}%` },
                      isSelected && styles.chartBarFillSelected,
                    ]}
                  />
                </View>
                <Text style={[styles.chartColDayName, isSelected && styles.chartColDayNameSelected]}>
                  {day.day_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Details Card */}
        {selectedDay && (
          <View style={styles.selectedDayDetailBox}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailDateText}>
                {selectedDay.day_name} ({selectedDay.date})
              </Text>
              <Text style={styles.detailTotalText}>
                ⚡ {selectedDay.total} {t('points earned')}
              </Text>
            </View>
            <View style={styles.detailChipsRow}>
              <Text style={styles.detailChip}>🏋️ {selectedDay.workouts} pts</Text>
              <Text style={styles.detailChip}>🥗 {selectedDay.nutrition} pts</Text>
              <Text style={styles.detailChip}>🎯 {selectedDay.habits} pts</Text>
              <Text style={styles.detailChip}>🔥 {selectedDay.streaks} pts</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  ptsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    color: Colors.ivory,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.body,
  },
  ptsTotalBadge: {
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  ptsTotalBadgeText: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: Fonts.dataBold,
  },
  tierProgressionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.20)',
  },
  tierLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierBadgeWrap: {
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderWidth: 1,
    borderColor: Colors.copper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierLabelCurrent: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.display,
    letterSpacing: 0.5,
  },
  tierLabelNext: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  tierFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  tierPctText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontFamily: Fonts.data,
  },
  tierTargetText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontFamily: Fonts.body,
  },
  breakdownSection: {
    paddingTop: 2,
  },
  breakdownTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoryPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  categoryPill: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryPillEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  categoryPillLabel: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  categoryPillValue: {
    fontSize: 12,
    fontFamily: Fonts.dataBold,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  chartDayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingVertical: 2,
    borderRadius: 8,
  },
  chartDayColSelected: {
    backgroundColor: 'rgba(201, 148, 58, 0.16)',
  },
  chartColPts: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    fontFamily: Fonts.data,
    marginBottom: 4,
  },
  chartColPtsSelected: {
    color: Colors.gold,
    fontFamily: Fonts.dataBold,
  },
  chartBarTrack: {
    width: 14,
    height: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 7,
  },
  chartBarFillSelected: {
    backgroundColor: Colors.gold,
  },
  chartColDayName: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontFamily: Fonts.data,
    marginTop: 6,
  },
  chartColDayNameSelected: {
    color: Colors.gold,
    fontFamily: Fonts.dataBold,
  },
  selectedDayDetailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailDateText: {
    color: Colors.ivory,
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  detailTotalText: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: Fonts.dataBold,
  },
  detailChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailChip: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontFamily: Fonts.data,
  },
});
