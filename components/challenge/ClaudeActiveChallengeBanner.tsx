import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeActiveChallengeBannerProps {
  onOpenCohort: () => void;
  onInvite: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeActiveChallengeBanner({
  onOpenCohort,
  onInvite,
}: ClaudeActiveChallengeBannerProps) {
  const { isDark } = useTheme();
  const [checkedToday, setCheckedToday] = useState(false);

  // 21-day warrior pips: doneTo is 18 when checked, 17 when unchecked
  const daysTotal = 21;
  const doneTo = checkedToday ? 18 : 17;
  const barWidth = checkedToday ? 86 : 81;

  return (
    <View style={styles.container}>
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
        <View style={styles.headerRow}>
          <Text style={[styles.kicker, { color: GOLD }]}>YOU'RE IN · DAY 18 OF 21</Text>
          <Text style={styles.pointsBadge}>800 PTS AT STAKE</Text>
        </View>

        <Text style={[styles.title, { color: isDark ? IVORY : NAVY }]}>21-Day Warrior</Text>

        {/* Progress Bar matching line 2914 */}
        <View
          style={[
            styles.progressBarBg,
            {
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.16)' : 'rgba(13, 43, 69, 0.08)',
            },
          ]}
        >
          <View style={[styles.progressBarFill, { width: `${barWidth}%` }]} />
        </View>

        {/* 21 Day Pips matching line 2915-2922 */}
        <View style={styles.pipsRow}>
          {Array.from({ length: daysTotal }).map((_, i) => {
            const isDone = i < doneTo;
            const isToday = i === 17;
            const pipBg = isDone
              ? GOLD
              : isToday
              ? 'rgba(201, 148, 58, 0.35)'
              : isDark
              ? 'rgba(247, 243, 238, 0.14)'
              : 'rgba(13, 43, 69, 0.1)';

            return (
              <View
                key={`pip-${i}`}
                style={[
                  styles.pip,
                  { backgroundColor: pipBg },
                ]}
              />
            );
          })}
        </View>

        {/* Daily Check Card matching line 2923-2935 */}
        <TouchableOpacity
          style={[
            styles.checkCard,
            checkedToday ? styles.checkCardDone : styles.checkCardPending,
          ]}
          activeOpacity={0.85}
          onPress={() => setCheckedToday((prev) => !prev)}
        >
          <View
            style={[
              styles.checkBox,
              checkedToday ? styles.checkBoxDone : styles.checkBoxPending,
            ]}
          >
            {checkedToday && <View style={styles.checkTick} />}
          </View>
          <View style={styles.checkTextWrap}>
            <Text
              style={[
                styles.checkTitle,
                { color: checkedToday ? IVORY : '#0D0D0D' },
              ]}
            >
              {checkedToday ? 'Day 18 done' : 'Mark day 18 done'}
            </Text>
            <Text
              style={[
                styles.checkNote,
                { color: checkedToday ? 'rgba(247, 243, 238, 0.7)' : '#2A2218' },
              ]}
            >
              {checkedToday
                ? 'Logged at 20:41. Three days to go — tap to undo.'
                : 'Five sessions this week, progressive difficulty. Tap when today is finished.'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons matching lines 845-848 */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cohortBtn} activeOpacity={0.8} onPress={onOpenCohort}>
            <Text style={styles.cohortBtnText}>Cohort chat</Text>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>3</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.8} onPress={onInvite}>
            <Text style={styles.inviteBtnText}>Invite someone</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
  },
  pointsBadge: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 19,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.16)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 99,
  },
  pipsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 12,
  },
  pip: {
    flex: 1,
    height: 5,
    borderRadius: 2,
  },
  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 13,
    padding: 14,
    marginTop: 14,
  },
  checkCardPending: {
    backgroundColor: GOLD,
  },
  checkCardDone: {
    backgroundColor: 'rgba(26, 122, 74, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(95, 196, 142, 0.5)',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxPending: {
    borderWidth: 2,
    borderColor: 'rgba(13, 13, 13, 0.55)',
    backgroundColor: 'transparent',
  },
  checkBoxDone: {
    backgroundColor: '#1A7A4A',
  },
  checkTick: {
    width: 10,
    height: 6,
    borderColor: IVORY,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  checkTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  checkTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: IVORY,
  },
  checkTitleActive: {
    color: GOLD,
  },
  checkNote: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  cohortBtn: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: 'rgba(247, 243, 238, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  cohortBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: IVORY,
  },
  unreadBadge: {
    backgroundColor: GOLD,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  inviteBtn: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
  },
});
