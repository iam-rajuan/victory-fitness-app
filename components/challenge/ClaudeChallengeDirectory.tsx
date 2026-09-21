import React, { useState } from 'react';
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

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const RAIL_CHALLENGES: ChallengeItem[] = [
  {
    id: 'ch-rail-1',
    n: '21-Day Warrior',
    d: 21,
    c: 'STRENGTH',
    p: '800 pts',
    joined: '142 in it',
    faces: [{ i: 'MK' }, { i: 'JR' }, { i: 'AN' }],
    desc: '3 full-body sessions per week plus 1 recovery walk. No missed days allowed.',
    why: 'Three weeks creates the neuro-pathway that turns conscious discipline into automatic behavior.',
  },
  {
    id: 'ch-rail-2',
    n: '7-Day Core Reset',
    d: 7,
    c: 'HABITS',
    p: '350 pts',
    joined: '89 in it',
    faces: [{ i: 'SL' }, { i: 'TK' }],
    desc: '10 minutes of deep core and breathwork before coffee every single morning.',
    why: 'Activates the transverse abdominis and stabilizes lumbar pressure before seated work begins.',
  },
  {
    id: 'ch-rail-3',
    n: '14-Day Morning Hydration',
    d: 14,
    c: 'HABITS',
    p: '500 pts',
    joined: '215 in it',
    faces: [{ i: 'EM' }, { i: 'DA' }, { i: 'LW' }],
    desc: '500ml water with pinch of sea salt upon waking, before checking your smartphone.',
    why: 'Reverses overnight cellular dehydration and stimulates morning cortisol awakening response.',
  },
  {
    id: 'ch-rail-4',
    n: '30-Day Pull-Up Ladder',
    d: 30,
    c: 'STRENGTH',
    p: '1,200 pts',
    joined: '64 in it',
    faces: [{ i: 'VB' }, { i: 'CH' }],
    desc: 'Sub-maximal volume every other day using grease-the-groove methodology.',
    why: 'Builds tendon resilience and vertical pulling capacity without central nervous system fatigue.',
  },
];

const ALL_CHALLENGES: ChallengeItem[] = [
  ...RAIL_CHALLENGES,
  {
    id: 'ch-5',
    n: '14-Day Protein Precision',
    d: 14,
    c: 'HABITS',
    p: '600 pts',
    joined: '112 in it',
    faces: [{ i: 'AK' }],
    desc: 'Hit your bodyweight protein target before dinner every single day for two weeks.',
    why: 'Eliminates late-night hunger spikes and guarantees optimal amino acid availability.',
  },
  {
    id: 'ch-6',
    n: '10,000 Steps Daily',
    d: 21,
    c: 'CARDIO',
    p: '750 pts',
    joined: '198 in it',
    faces: [{ i: 'PL' }],
    desc: 'Hit ten thousand verified steps daily regardless of meetings or weather.',
    why: 'Non-exercise activity thermogenesis (NEAT) accounts for 70% of non-resting metabolic expenditure.',
  },
  {
    id: 'ch-7',
    n: 'Zone 2 Engine Builder',
    d: 30,
    c: 'CARDIO',
    p: '1,000 pts',
    joined: '77 in it',
    faces: [{ i: 'RT' }],
    desc: 'Two 45-minute nasal-breathing aerobic sessions per week.',
    why: 'Expands mitochondrial density and capillary beds in slow-twitch muscle fibers.',
  },
  {
    id: 'ch-8',
    n: 'Evening Screen Sunset',
    d: 7,
    c: 'HABITS',
    p: '300 pts',
    joined: '140 in it',
    faces: [{ i: 'SJ' }],
    desc: 'All screens off 45 minutes before sleep. Read or journal under warm dim light.',
    why: 'Protects natural melatonin surge and deep delta-wave restorative sleep latency.',
  },
  {
    id: 'ch-9',
    n: 'Hip Mobility Flow',
    d: 14,
    c: 'MOBILITY',
    p: '450 pts',
    joined: '93 in it',
    faces: [{ i: 'OM' }],
    desc: '12-minute 90/90 and couch stretch routine every evening.',
    why: 'Restores internal and external hip rotation lost to prolonged chair sitting.',
  },
];

const DAY_FILTERS = ['ALL', '7 DAYS', '14 DAYS', '21 DAYS', '30 DAYS'];
const CAT_FILTERS = ['ALL', 'STRENGTH', 'HABITS', 'CARDIO', 'MOBILITY'];

export default function ClaudeChallengeDirectory({
  onSelectChallenge,
  onOpenInviteGuest,
}: ClaudeChallengeDirectoryProps) {
  const { colors, isDark } = useTheme();
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [selectedCat, setSelectedCat] = useState('ALL');

  const filteredChallenges = ALL_CHALLENGES.filter((ch) => {
    if (selectedDay !== 'ALL') {
      const targetDays = parseInt(selectedDay, 10);
      if (ch.d !== targetDays) return false;
    }
    if (selectedCat !== 'ALL') {
      if (ch.c.toUpperCase() !== selectedCat) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Horizontal Rail: Most joined this week matching line 851-874 */}
      <View style={styles.railHeader}>
        <Text style={[styles.railTitle, { color: colors.text }]}>Most joined this week</Text>
        <Text style={styles.railAllLink}>All ›</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
          {DAY_FILTERS.map((d) => (
            <TouchableOpacity
              key={`day-${d}`}
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.12)',
                },
                selectedDay === d && styles.chipActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedDay(d)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isDark ? 'rgba(247, 243, 238, 0.7)' : colors.text },
                  selectedDay === d && styles.chipTextActive,
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
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
          {CAT_FILTERS.map((cat) => (
            <TouchableOpacity
              key={`cat-${cat}`}
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.12)',
                },
                selectedCat === cat && styles.chipActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedCat(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isDark ? 'rgba(247, 243, 238, 0.7)' : colors.text },
                  selectedCat === cat && styles.chipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Count Line matching line 889 */}
      <Text style={[styles.countLine, { color: colors.textMuted }]}>
        {`${filteredChallenges.length} OF 35 CHALLENGES · SORTED BY POPULARITY`}
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
    backgroundColor: NAVY,
    borderRadius: 14,
    borderLeftWidth: 3,
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
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
  },
  chipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  chipText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  chipTextActive: {
    color: '#0D0D0D',
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
    borderLeftWidth: 3,
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
