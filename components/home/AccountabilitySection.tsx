import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';

const days = [
  { name: 'MON', active: true },
  { name: 'TUE', active: true },
  { name: 'WED', active: true },
  { name: 'THU', active: true },
  { name: 'FRI', active: true },
  { name: 'SAT', active: false },
  { name: 'SUN', active: false },
];

export default function AccountabilitySection() {
  const { t } = useLanguage();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.accountabilityTitle}>{t('Accountability')}</Text>
        <View style={styles.accountabilityIcons}>
          <Ionicons name="chatbubble-outline" size={22} color={Colors.gold} />
          <Ionicons name="add" size={22} color={Colors.gold} style={{ marginLeft: 16 }} />
        </View>
      </View>

      <View style={styles.accountabilityCard}>
        <View style={styles.accountabilityTopRow}>
          <View style={styles.streakWrapper}>
            <View style={styles.streakAddBtn}>
              <Ionicons name="flame" size={16} color={Colors.gold} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.streakSub}>{t('STREAK')}</Text>
              <Text style={styles.streakVal}>{t('0 Days')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.atRiskBtn} activeOpacity={0.8}>
            <Text style={styles.atRiskText}>{t('STREAK AT RISK!')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.milestoneContainer}>
          <View style={styles.milestoneTextRow}>
            <Text style={styles.milestoneLabel}>{t('NEXT MILESTONE: 3 DAYS')}</Text>
            <Text style={styles.milestonePercent}>0%</Text>
          </View>
          <View style={styles.dividerSubtle} />
          <View style={styles.modernProgressBg}>
            <View style={[styles.modernProgressFill, { width: '0%' }]} />
          </View>
        </View>

        <View style={styles.modernDaysRow}>
          {days.map((d, i) => (
            <View key={i} style={styles.modernDayItem}>
              <Text style={[styles.modernDayLabel, d.active && { color: Colors.gold }]}>
                {d.name}
              </Text>
              <View style={[styles.modernDayDot, d.active && styles.modernDayDotActive]} />
            </View>
          ))}
        </View>

        <View style={styles.championsBannerPill}>
          <View style={styles.avatarStack}>
            <View style={[styles.avatarMini, { backgroundColor: Colors.navy }]} />
            <View style={[styles.avatarMini, { backgroundColor: Colors.copper, marginLeft: -8 }]} />
            <View style={[styles.avatarMini, { backgroundColor: Colors.gold, marginLeft: -8 }]} />
          </View>
          <Text style={styles.championsBannerText}>
            <Text style={{ color: Colors.gold, fontFamily: Fonts.dataBold }}>1,270</Text> {t('CHAMPIONS TRAINING TODAY')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  accountabilityTitle: { fontSize: 20, color: Colors.ivory, fontFamily: Fonts.display },
  accountabilityIcons: { flexDirection: 'row', alignItems: 'center' },
  accountabilityCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  accountabilityTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  streakWrapper: { flexDirection: 'row', alignItems: 'center' },
  streakAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(201, 148, 58, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  streakSub: { color: Colors.gold, fontSize: 11, letterSpacing: 1, fontFamily: Fonts.heading },
  streakVal: { color: Colors.ivory, fontSize: 13, fontFamily: Fonts.dataBold },
  atRiskBtn: {
    backgroundColor: Colors.copper,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  atRiskText: { color: Colors.ivory, fontSize: 9, letterSpacing: 0.8, fontFamily: Fonts.heading },
  milestoneContainer: { marginBottom: 24 },
  milestoneTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dividerSubtle: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
  milestoneLabel: { color: Colors.textSecondary, fontSize: 11, letterSpacing: 0.5, fontFamily: Fonts.heading },
  milestonePercent: { color: Colors.gold, fontSize: 13, fontFamily: Fonts.dataBold },
  modernProgressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  modernProgressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  modernDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modernDayItem: { alignItems: 'center' },
  modernDayLabel: { color: Colors.textSecondary, fontSize: 10, marginBottom: 8, fontFamily: Fonts.data },
  modernDayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)' },
  modernDayDotActive: {
    backgroundColor: Colors.gold,
  },
  championsBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
  },
  avatarStack: { flexDirection: 'row', marginRight: 12 },
  avatarMini: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.surfaceCard },
  championsBannerText: { color: Colors.textSecondary, fontSize: 11, fontFamily: Fonts.bodyMedium },
});
