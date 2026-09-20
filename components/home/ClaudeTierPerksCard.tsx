import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';

interface ClaudeTierPerksCardProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudeTierPerksCard({ tier }: ClaudeTierPerksCardProps) {
  const router = useRouter();

  if (tier !== 'PLATINUM' && tier !== 'INNER_CIRCLE') {
    return null;
  }

  const isInnerCircle = tier === 'INNER_CIRCLE';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionKicker}>
        {isInnerCircle ? 'INNER CIRCLE EXCLUSIVES' : 'PLATINUM PRIVILEGES'}
      </Text>

      <View style={[styles.card, isInnerCircle && styles.cardInnerCircle]}>
        {/* Row 1: Wearables sync */}
        <Pressable
          style={[styles.itemRow, styles.itemRowBorder]}
          onPress={() => pushRoute(router, '/profile')}
        >
          <View style={styles.syncedDot} />
          <View style={styles.textCol}>
            <Text style={styles.itemTitle}>Wearables synced</Text>
            <Text style={styles.itemSub}>
              Resting HR, sleep, calories and heart-rate zones
            </Text>
          </View>
          <Text style={styles.arrowChevron}>›</Text>
        </Pressable>

        {/* Row 2: Human Coaching Session / Brief */}
        <Pressable
          style={[styles.itemRow, styles.itemRowBorder]}
          onPress={() => pushRoute(router, isInnerCircle ? '/profile/application' : '/chat')}
        >
          <View style={styles.goldDot} />
          <View style={styles.textCol}>
            <Text style={styles.itemTitle}>
              {isInnerCircle ? '1-to-1 coaching with Victor' : 'Monthly 1-to-1 coaching session'}
            </Text>
            <Text style={styles.itemSub}>
              {isInnerCircle
                ? 'Coach sees your habit brief before every session'
                : 'Next available Thursday 19:00 · Included in your plan'}
            </Text>
          </View>
          <Text style={styles.arrowChevron}>›</Text>
        </Pressable>

        {/* Row 3: Weekly Habit Digest */}
        <Pressable
          style={styles.itemRow}
          onPress={() => pushRoute(router, '/profile')}
        >
          <View style={styles.copperDot} />
          <View style={styles.textCol}>
            <Text style={styles.itemTitle}>Weekly habit digest</Text>
            <Text style={styles.itemSub}>
              Monday 08:00, built from your four habit fields
            </Text>
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
    marginBottom: 24,
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
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
  },
  cardInnerCircle: {
    borderLeftColor: COPPER,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  syncedDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: GOLD,
  },
  copperDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: COPPER,
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
