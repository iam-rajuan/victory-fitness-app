import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';
import { useTheme } from '../../context/ThemeContext';

export interface ChallengeItem {
  id?: string;
  n: string;
  d: string;
  pct: number;
  rank: string;
  note: string;
}

interface ClaudeChallengesCarouselProps {
  challenges?: ChallengeItem[];
  onOpenChallenge?: (challenge: ChallengeItem) => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const DEFAULT_CHALLENGES: ChallengeItem[] = [
  {
    n: '21-Day Warrior',
    d: 'Day 18 of 21',
    pct: 86,
    rank: 'Rank 3',
    note: 'Finish today to keep the streak bonus.',
  },
  {
    n: 'Sleep Lock',
    d: 'Day 3 of 5',
    pct: 60,
    rank: 'Rank 1',
    note: 'Same bedtime two nights running. Keep it.',
  },
  {
    n: 'Gratitude Blitz',
    d: 'Day 1 of 3',
    pct: 33,
    rank: '30 pts',
    note: 'One message today. Anyone specific.',
  },
];

export default function ClaudeChallengesCarousel({
  challenges = DEFAULT_CHALLENGES,
  onOpenChallenge,
}: ClaudeChallengesCarouselProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [activeIdx, setActiveIdx] = useState(0);

  const list = challenges.length > 0 ? challenges : DEFAULT_CHALLENGES;
  const current = list[activeIdx] || list[0];

  const goNext = () => {
    setActiveIdx((prev) => (prev + 1) % list.length);
  };

  const goPrev = () => {
    setActiveIdx((prev) => (prev - 1 + list.length) % list.length);
  };

  const handleCardPress = () => {
    if (onOpenChallenge) {
      onOpenChallenge(current);
      return;
    }
    pushRoute(router, '/challenges');
  };

  return (
    <View style={styles.container}>
      {/* Header with counter and arrows */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionKicker, { color: colors.textMuted }]}>YOUR CHALLENGES</Text>
        <View style={styles.controlsRow}>
          <Text style={[styles.countText, { color: colors.textMuted }]}>{`${activeIdx + 1} of ${list.length} active`}</Text>
          <Pressable hitSlop={10} onPress={goPrev}>
            <Text style={styles.arrowBtn}>‹</Text>
          </Pressable>
          <Pressable hitSlop={10} onPress={goNext}>
            <Text style={styles.arrowBtn}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Challenge Card */}
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
        onPress={handleCardPress}
      >
        <View style={styles.cardTopRow}>
          <Text style={[styles.challengeName, { color: isDark ? IVORY : NAVY }]}>{current.n}</Text>
          <Text style={styles.rankBadge}>{current.rank}</Text>
        </View>

        <Text
          style={[
            styles.dayProgressText,
            { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.55)' },
          ]}
        >
          {current.d}
        </Text>

        {/* Progress Bar */}
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: isDark ? 'rgba(247, 243, 238, 0.14)' : 'rgba(13, 43, 69, 0.08)',
            },
          ]}
        >
          <View style={[styles.progressFill, { width: `${Math.min(100, current.pct)}%` }]} />
        </View>

        <Text style={[styles.noteText, { color: isDark ? GOLD : '#B5651D' }]}>{current.note}</Text>
      </Pressable>

      {/* Dots Indicator */}
      <View style={styles.dotsRow}>
        {list.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => setActiveIdx(i)}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIdx
                    ? GOLD
                    : isDark
                    ? 'rgba(247, 243, 238, 0.24)'
                    : 'rgba(13, 43, 69, 0.2)',
              },
              i === activeIdx && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        swipe between your active challenges
      </Text>
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
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countText: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  arrowBtn: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: GOLD,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 18,
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  challengeName: {
    fontFamily: CLASH,
    fontSize: 18,
    fontWeight: '600',
    color: IVORY,
  },
  rankBadge: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '700',
    color: GOLD,
  },
  dayProgressText: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 10,
  },
  progressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.14)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 99,
  },
  noteText: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 19.5,
    fontWeight: '500',
    color: GOLD,
    marginTop: 11,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.24)',
  },
  dotActive: {
    width: 20,
    backgroundColor: GOLD,
  },
  footnote: {
    textAlign: 'center',
    fontFamily: INTER,
    fontSize: 11,
    color: 'rgba(247, 243, 238, 0.35)',
    marginTop: 8,
  },
});
