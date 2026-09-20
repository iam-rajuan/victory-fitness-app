import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';

interface ClaudeCoachBarProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
}

const GOLD = '#C9943A';
const COPPER = '#B5651D';
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudeCoachBar({ tier }: ClaudeCoachBarProps) {
  const router = useRouter();
  const hasCoach = tier !== 'SILVER' && tier !== 'NONE';
  const isPriority = tier === 'PLATINUM' || tier === 'INNER_CIRCLE';

  const handleOpenCoach = () => {
    pushRoute(router, '/chat');
  };

  const handleOpenUpgrade = () => {
    pushRoute(router, '/plan');
  };

  if (hasCoach) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.activeCoachCard} onPress={handleOpenCoach}>
          <View style={styles.promptTextCol}>
            <Text style={styles.promptPlaceholder}>Ask your coach anything…</Text>
            {isPriority ? (
              <View style={styles.priorityPill}>
                <Text style={styles.priorityText}>PRIORITY RESPONSES</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sendArrowBtn}>
            <View style={styles.arrowTriangle} />
          </View>
        </Pressable>
      </View>
    );
  }

  // Silver locked teaser
  return (
    <View style={styles.container}>
      <Pressable style={styles.lockedCard} onPress={handleOpenUpgrade}>
        <View style={styles.lockBox}>
          <View style={styles.lockGraphic} />
        </View>

        <View style={styles.lockedTextCol}>
          <Text style={styles.lockedTitle}>AI Coach is part of Gold</Text>
          <Text style={styles.lockedSub}>
            Workouts, journal and challenges stay open either way
          </Text>
        </View>

        <Text style={styles.lockedActionLink}>See</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  activeCoachCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(181, 101, 29, 0.55)',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(181, 101, 29, 0.04)',
  },
  promptTextCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promptPlaceholder: {
    fontFamily: INTER,
    fontSize: 14,
    color: 'rgba(247, 243, 238, 0.65)',
  },
  priorityPill: {
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  priorityText: {
    fontFamily: DMSANS,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: GOLD,
  },
  sendArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  lockedCard: {
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.16)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: 'rgba(247, 243, 238, 0.02)',
  },
  lockBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGraphic: {
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
    color: 'rgba(247, 243, 238, 0.55)',
  },
  lockedActionLink: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
});
