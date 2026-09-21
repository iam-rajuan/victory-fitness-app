import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert } from 'react-native';

interface ClaudeActiveChallengeBannerProps {
  onOpenCohort: () => void;
  onInvite: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeActiveChallengeBanner({
  onOpenCohort,
  onInvite,
}: ClaudeActiveChallengeBannerProps) {
  const [checkedToday, setCheckedToday] = useState(true);

  // 21-day warrior pips: 18 done, 3 to go
  const daysTotal = 21;
  const currentDay = 18;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.kicker}>YOU'RE IN · DAY 18 OF 21</Text>
          <Text style={styles.pointsBadge}>800 PTS AT STAKE</Text>
        </View>

        <Text style={styles.title}>21-Day Warrior</Text>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(currentDay / daysTotal) * 100}%` }]} />
        </View>

        {/* 21 Day Pips matching line 836 */}
        <View style={styles.pipsRow}>
          {Array.from({ length: daysTotal }).map((_, i) => {
            const isDone = i < currentDay - 1 || (i === currentDay - 1 && checkedToday);
            const isToday = i === currentDay - 1;
            return (
              <View
                key={`pip-${i}`}
                style={[
                  styles.pip,
                  isDone
                    ? styles.pipDone
                    : isToday
                    ? styles.pipToday
                    : styles.pipFuture,
                ]}
              />
            );
          })}
        </View>

        {/* Daily Check Card matching line 838-844 */}
        <TouchableOpacity
          style={styles.checkCard}
          activeOpacity={0.85}
          onPress={() => setCheckedToday((prev) => !prev)}
        >
          <View style={[styles.checkBox, checkedToday && styles.checkBoxActive]}>
            {checkedToday && <View style={styles.checkTick} />}
          </View>
          <View style={styles.checkTextWrap}>
            <Text style={[styles.checkTitle, checkedToday && styles.checkTitleActive]}>
              {checkedToday ? 'Day 18 complete ✓' : 'Log Day 18 workout'}
            </Text>
            <Text style={styles.checkNote}>
              {checkedToday ? 'Counted toward your 800 pts finish' : 'Tap to mark today completed'}
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
  pipDone: {
    backgroundColor: GREEN,
  },
  pipToday: {
    backgroundColor: GOLD,
  },
  pipFuture: {
    backgroundColor: 'rgba(247, 243, 238, 0.18)',
  },
  checkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  checkTick: {
    width: 6,
    height: 10,
    borderColor: '#0D0D0D',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '45deg' }, { translateY: -1 }],
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
