import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { ChallengeItem } from './ClaudeChallengeDirectory';

interface ClaudeActiveChallengeBannerProps {
  challenge?: ChallengeItem | null;
  onOpenCohort: () => void;
  onInvite: () => void;
  onOpenChallenge?: () => void;
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
  challenge,
  onOpenCohort,
  onInvite,
  onOpenChallenge,
}: ClaudeActiveChallengeBannerProps) {
  const { isDark } = useTheme();

  if (!challenge) {
    return null;
  }

  const daysTotal = Math.max(1, challenge.d || 1);
  const isJoined = challenge.status === 'active' || challenge.status === 'completed';
  const isCompleted = challenge.status === 'completed';
  const progressPct = Math.max(0, Math.min(100, Math.round(Number(challenge.progress || 0) * 100)));
  const doneTo = Math.max(0, Math.min(daysTotal, Math.round(daysTotal * (progressPct / 100))));
  const currentDay = Math.min(daysTotal, doneTo + 1);
  const daysLeft = Math.max(0, Number(challenge.daysLeft || daysTotal - doneTo));
  const unreadCount = Math.max(0, Number(challenge.unreadCount || 0));
  const kickerText = isJoined ? `YOU'RE IN · DAY ${currentDay} OF ${daysTotal}` : `FEATURED · ${daysTotal} DAYS`;

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
          <Text style={[styles.kicker, { color: GOLD }]}>{kickerText}</Text>
          <Text style={styles.pointsBadge}>{challenge.p}</Text>
        </View>

        <Text style={[styles.title, { color: isDark ? IVORY : NAVY }]}>{challenge.n}</Text>

        {/* Progress Bar matching line 2914 */}
        <View
          style={[
            styles.progressBarBg,
            {
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.16)' : 'rgba(13, 43, 69, 0.08)',
            },
          ]}
        >
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>

        {/* 21 Day Pips matching line 2915-2922 */}
        <View style={styles.pipsRow}>
          {Array.from({ length: daysTotal }).map((_, i) => {
            const isDone = i < doneTo;
            const isToday = i === currentDay - 1;
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
            isCompleted ? styles.checkCardDone : styles.checkCardPending,
          ]}
          activeOpacity={0.85}
          onPress={onOpenChallenge || onOpenCohort}
        >
          <View
            style={[
              styles.checkBox,
              isCompleted ? styles.checkBoxDone : styles.checkBoxPending,
            ]}
          >
            {isCompleted && <View style={styles.checkTick} />}
          </View>
          <View style={styles.checkTextWrap}>
            <Text
              style={[
                styles.checkTitle,
                { color: isCompleted ? IVORY : '#0D0D0D' },
              ]}
            >
              {isCompleted ? 'Challenge complete' : isJoined ? `Day ${currentDay} in progress` : 'Join this challenge'}
            </Text>
            <Text
              style={[
                styles.checkNote,
                { color: isCompleted ? 'rgba(247, 243, 238, 0.7)' : '#2A2218' },
              ]}
            >
              {isJoined
                ? daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Continue from your challenge hub.`
                  : 'Your challenge progress is saved.'
                : challenge.desc || 'Featured from the admin dashboard. Tap to see details.'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons matching lines 845-848 */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cohortBtn} activeOpacity={0.8} onPress={isJoined ? onOpenCohort : onOpenChallenge}>
            <Text style={styles.cohortBtnText}>{isJoined ? 'Cohort chat' : 'Details'}</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
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
