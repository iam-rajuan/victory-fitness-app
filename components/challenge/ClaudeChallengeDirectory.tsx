import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface ChallengeItem {
  id: string;
  n: string; // name
  d: number; // days
  c: string; // category
  p: string; // points e.g. "800 pts"
  joined: string; // "142 joined"
  faces: { i: string }[];
  desc?: string;
  why?: string;
}

interface ClaudeChallengeDirectoryProps {
  onSelectChallenge: (challenge: ChallengeItem) => void;
  onOpenInviteGuest: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

const CLAUDE_CHALLENGES: ChallengeItem[] = [
  {
    id: 'ch-cold-start',
    d: 3,
    n: 'Cold Start',
    c: 'PHYSICAL',
    p: '75 pts',
    joined: '312 joined',
    faces: [{ i: 'AR' }, { i: 'DS' }, { i: 'LM' }],
    desc: 'Finish every shower with 60 seconds of cold water for 3 consecutive days.',
    why: 'Each icy shock teaches your nervous system that discomfort is survivable — and suddenly every hard thing feels smaller.',
  },
  {
    id: 'ch-sleep-lock',
    d: 5,
    n: 'Sleep Lock',
    c: 'MENTAL',
    p: '120 pts',
    joined: '268 joined',
    faces: [{ i: 'AR' }, { i: 'DS' }, { i: 'LM' }],
    desc: 'Go to bed at the same time and wake at the same time for 5 days straight.',
    why: 'Every elite performer guards their sleep schedule like a secret weapon. Five days builds the rhythm that fuels everything else.',
  },
  {
    id: 'ch-week-strength',
    d: 7,
    n: 'Week of Strength',
    c: 'PHYSICAL',
    p: '250 pts',
    joined: '204 joined',
    faces: [{ i: 'AR' }, { i: 'DS' }, { i: 'LM' }],
    desc: 'Complete all 7 scheduled workouts in a single week — zero skipped sessions.',
    why: 'A perfect workout week is not about fitness. It is about proving to yourself that you keep your word to yourself.',
  },
  {
    id: 'ch-deep-connection',
    d: 14,
    n: 'Deep Connection',
    c: 'RELATIONAL',
    p: '420 pts',
    joined: '187 joined',
    faces: [{ i: 'AR' }, { i: 'DS' }, { i: 'LM' }],
    desc: 'One meaningful, uninterrupted conversation per day — no phones on the table.',
    why: 'Fourteen real conversations do more for your wellbeing than a hundred casual exchanges. Deep connection is the one thing no app can replace.',
  },
  {
    id: 'ch-warrior-21',
    d: 21,
    n: '21-Day Warrior',
    c: 'PHYSICAL',
    p: '800 pts',
    joined: '312 joined',
    faces: [{ i: 'AR' }, { i: 'DS' }, { i: 'LM' }],
    desc: 'Five sessions a week, progressive difficulty, for a full 21 days without missing one.',
    why: 'Twenty-one days is the threshold where behaviour becomes identity. Finish this and you are no longer someone who tries to train — you are someone who trains.',
  },
];

const RAIL_CHALLENGES: ChallengeItem[] = CLAUDE_CHALLENGES.slice(0, 4);
const ALL_CHALLENGES: ChallengeItem[] = CLAUDE_CHALLENGES;

const DAY_FILTERS = ['All', '3', '5', '7', '14', '21'];
const CAT_FILTERS = ['All', 'Physical', 'Mental', 'Relational'];

export default function ClaudeChallengeDirectory({
  onSelectChallenge,
  onOpenInviteGuest,
}: ClaudeChallengeDirectoryProps) {
  const { colors, isDark } = useTheme();
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedCat, setSelectedCat] = useState('All');
  const railScrollRef = useRef<ScrollView>(null);
  const [railOffset, setRailOffset] = useState(0);

  const handleSlideRail = () => {
    if (railScrollRef.current) {
      // 176px card width + 12px gap = 188px step
      const maxOffset = (RAIL_CHALLENGES.length - 1) * 188;
      const nextOffset = railOffset >= maxOffset ? 0 : railOffset + 188;
      railScrollRef.current.scrollTo({ x: nextOffset, animated: true });
      setRailOffset(nextOffset);
    }
  };

  const filteredChallenges = ALL_CHALLENGES.filter((ch) => {
    if (selectedDay !== 'All') {
      const targetDays = parseInt(selectedDay, 10);
      if (ch.d !== targetDays) return false;
    }
    if (selectedCat !== 'All') {
      if (ch.c.toUpperCase() !== selectedCat.toUpperCase()) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Horizontal Rail: Most joined this week matching line 851-874 */}
      <View style={styles.railHeader}>
        <Text style={[styles.railTitle, { color: colors.text }]}>Most joined this week</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={handleSlideRail}>
          <Text style={styles.railAllLink}>All ›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={railScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={188}
        snapToAlignment="start"
        directionalLockEnabled
        nestedScrollEnabled
        onScroll={(e) => setRailOffset(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.railScroll}
      >
        {RAIL_CHALLENGES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.railCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                shadowColor: '#0D2B45',
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 10,
                elevation: 2,
                shadowOpacity: isDark ? 0.35 : 0.05,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => onSelectChallenge(c)}
          >
            <View style={styles.railCardTop}>
              <Text style={[styles.railCardDays, { color: isDark ? IVORY : NAVY }]}>{c.d}</Text>
              <Text style={styles.railCardCategory}>{c.c}</Text>
            </View>

            <Text style={[styles.railCardName, { color: isDark ? IVORY : NAVY }]} numberOfLines={2}>
              {c.n}
            </Text>
            <Text style={styles.railCardPoints}>{c.p}</Text>

            <View style={styles.railCardFooter}>
              <View style={styles.avatarRow}>
                {c.faces.map((f, i) => (
                  <View key={`avatar-${i}`} style={[styles.avatarCircle, { marginLeft: i > 0 ? -6 : 0 }]}>
                    <Text style={styles.avatarText}>{f.i}</Text>
                  </View>
                ))}
              </View>
              <Text
                style={[
                  styles.railCardJoined,
                  { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.55)' },
                ]}
              >
                {c.joined}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* HOW MANY DAYS? Filter Chips matching lines 876-881 */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>HOW MANY DAYS?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {DAY_FILTERS.map((d) => {
            const isCircle = d !== 'All';
            const isSelected = selectedDay === d;
            return (
              <TouchableOpacity
                key={`day-${d}`}
                style={[
                  isCircle ? styles.circleChip : styles.chip,
                  {
                    backgroundColor: isSelected ? GOLD : (isDark ? 'transparent' : '#FFFFFF'),
                    borderColor: isSelected ? GOLD : (isDark ? 'rgba(247, 243, 238, 0.22)' : 'rgba(13, 43, 69, 0.2)'),
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedDay(d)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#0D0D0D' : (isDark ? 'rgba(247, 243, 238, 0.7)' : colors.text) },
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* WHAT KIND? Filter Chips matching lines 882-887 */}
      <View style={styles.filterSectionSmall}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>WHAT KIND?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CAT_FILTERS.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <TouchableOpacity
                key={`cat-${cat}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? GOLD : (isDark ? 'transparent' : '#FFFFFF'),
                    borderColor: isSelected ? GOLD : (isDark ? 'rgba(247, 243, 238, 0.22)' : 'rgba(13, 43, 69, 0.2)'),
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setSelectedCat(cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#0D0D0D' : (isDark ? 'rgba(247, 243, 238, 0.7)' : colors.text) },
                    isSelected && styles.chipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Count Line matching line 889 & 3354 */}
      <Text style={[styles.countLine, { color: GOLD }]}>
        {`${filteredChallenges.length} of 35 challenges${selectedDay === 'All' ? ' · 3 to 21 days' : ` · ${selectedDay} days`}`}
      </Text>

      {/* Challenge List matching lines 891-906 */}
      <View style={styles.challengeList}>
        {filteredChallenges.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.challengeCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                shadowColor: '#0D2B45',
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 10,
                elevation: 2,
                shadowOpacity: isDark ? 0.35 : 0.05,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => onSelectChallenge(c)}
          >
            <View style={styles.challengeDaysCol}>
              <Text style={[styles.challengeDaysNum, { color: isDark ? IVORY : NAVY }]}>{c.d}</Text>
              <Text
                style={[
                  styles.challengeDaysLabel,
                  { color: isDark ? 'rgba(247, 243, 238, 0.45)' : 'rgba(13, 43, 69, 0.55)' },
                ]}
              >
                DAYS
              </Text>
            </View>

            <View
              style={[
                styles.challengeDivider,
                {
                  backgroundColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.08)',
                },
              ]}
            />

            <View style={styles.challengeInfoCol}>
              <Text style={[styles.challengeCardName, { color: isDark ? IVORY : NAVY }]}>{c.n}</Text>
              <View style={styles.challengeMetaRow}>
                <Text style={styles.challengeMetaCategory}>{c.c}</Text>
                <Text style={styles.challengeMetaPoints}>{c.p}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.joinBtn}
              activeOpacity={0.85}
              onPress={() => onSelectChallenge(c)}
            >
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* Guest pull-in card matching lines 908-911 */}
      <TouchableOpacity
        style={styles.guestCard}
        activeOpacity={0.85}
        onPress={onOpenInviteGuest}
      >
        <View style={styles.guestTextCol}>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Pull someone in from outside</Text>
          <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
            They don't need the app. They follow the challenge as a guest for its full length.
          </Text>
        </View>
        <Text style={styles.guestArrow}>Invite →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  railHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  railTitle: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  railAllLink: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  railScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 6,
  },
  railCard: {
    width: 176,
    flexShrink: 0,
    backgroundColor: NAVY,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 14,
  },
  railCardTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  railCardDays: {
    fontFamily: MONO,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
    color: IVORY,
  },
  railCardCategory: {
    fontFamily: DMSANS,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: COPPER,
  },
  railCardName: {
    fontFamily: CLASH,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    color: IVORY,
    minHeight: 36,
  },
  railCardPoints: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    marginTop: 8,
  },
  railCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
  },
  avatarRow: {
    flexDirection: 'row',
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderWidth: 1,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: DMSANS,
    fontSize: 8.5,
    fontWeight: '700',
    color: GOLD,
  },
  railCardJoined: {
    fontFamily: MONO,
    fontSize: 10,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  filterSection: {
    paddingTop: 22,
  },
  filterSectionSmall: {
    paddingTop: 14,
  },
  filterLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    paddingHorizontal: 20,
    marginBottom: 9,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 99,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  chipText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  chipTextActive: {
    color: '#0D0D0D',
    fontWeight: '700',
  },
  countLine: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  challengeList: {
    paddingHorizontal: 20,
    gap: 9,
  },
  challengeCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  challengeDaysCol: {
    width: 40,
    alignItems: 'center',
  },
  challengeDaysNum: {
    fontFamily: MONO,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
    color: IVORY,
  },
  challengeDaysLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 2,
  },
  challengeDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(247, 243, 238, 0.14)',
  },
  challengeInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  challengeCardName: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '600',
    color: IVORY,
  },
  challengeMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    marginTop: 4,
  },
  challengeMetaCategory: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.9,
    color: COPPER,
  },
  challengeMetaPoints: {
    fontFamily: MONO,
    fontSize: 12.5,
    fontWeight: '700',
    color: GOLD,
  },
  joinBtn: {
    height: 36,
    paddingHorizontal: 17,
    borderRadius: 11,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  guestCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(181, 101, 29, 0.5)',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestTextCol: {
    flex: 1,
  },
  guestTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  guestSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  guestArrow: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
  },
});
