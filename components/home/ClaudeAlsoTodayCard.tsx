import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';

interface ClaudeAlsoTodayCardProps {
  partnerName?: string;
  partnerTrainedToday?: boolean;
  sessionsDoneThisWeek?: number;
  sessionsTargetThisWeek?: number;
  journalWrittenToday?: boolean;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudeAlsoTodayCard({
  partnerName,
  partnerTrainedToday = true,
  sessionsDoneThisWeek = 3,
  sessionsTargetThisWeek = 4,
  journalWrittenToday = false,
}: ClaudeAlsoTodayCardProps) {
  const router = useRouter();

  const duoTitle = partnerName
    ? (partnerTrainedToday ? `${partnerName} trained today` : `${partnerName} has not trained yet`)
    : 'No accountability duo yet';
  const duoNote = partnerName
    ? 'Your duo · your turn, they will see the tick'
    : 'Two people, one tick a day. Set it up in a minute.';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionKicker}>ALSO TODAY</Text>

      <View style={styles.card}>
        {/* Row 1: Accountability Duo */}
        <Pressable
          style={[styles.itemRow, styles.itemRowBorder]}
          onPress={() => pushRoute(router, '/duo')}
        >
          {partnerName ? (
            <View style={[styles.dot, partnerTrainedToday ? styles.dotGreen : styles.dotGoldRing]} />
          ) : (
            <View style={styles.dotOutline} />
          )}

          <View style={styles.textCol}>
            <Text style={styles.itemTitle}>{duoTitle}</Text>
            <Text style={styles.itemSub}>{duoNote}</Text>
          </View>

          <Text style={styles.arrowChevron}>›</Text>
        </Pressable>

        {/* Row 2: Daily Journal */}
        <Pressable
          style={[styles.itemRow, styles.itemRowBorder]}
          onPress={() => pushRoute(router, '/journal')}
        >
          <View style={[styles.dot, journalWrittenToday ? styles.dotGreen : styles.dotCopperRing]} />

          <View style={styles.textCol}>
            <Text style={styles.itemTitle}>
              {journalWrittenToday ? 'Journal completed for today' : 'Journal not written yet'}
            </Text>
            <Text style={styles.itemSub}>One prompt a day · lives in your profile</Text>
          </View>

          <Text style={styles.arrowChevron}>›</Text>
        </Pressable>

        {/* Row 3: Weekly Target & Library */}
        <Pressable
          style={styles.itemRow}
          onPress={() => pushRoute(router, '/workout-library')}
        >
          <View style={styles.textCol}>
            <Text style={styles.itemTitle}>
              {`${sessionsDoneThisWeek} of ${sessionsTargetThisWeek} sessions this week`}
            </Text>
            <Text style={styles.itemSub}>Browse the library for a short one</Text>
          </View>

          <Text style={styles.arrowChevron}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  dotGreen: {
    backgroundColor: GREEN,
  },
  dotGoldRing: {
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: 'transparent',
  },
  dotCopperRing: {
    borderWidth: 1.5,
    borderColor: COPPER,
    backgroundColor: 'transparent',
  },
  dotOutline: {
    width: 9,
    height: 9,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.35)',
  },
  textCol: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 2,
  },
  itemSub: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  arrowChevron: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
});
