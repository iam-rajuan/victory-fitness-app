import React, { useState, useRef, useEffect } from 'react';
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
  challengeId?: string;
  n: string; // name
  d: number; // days
  c: string; // category
  p: string; // points e.g. "800 pts"
  joined: string; // "142 joined"
  faces: { i: string }[];
  desc?: string;
  why?: string;
  status?: 'ready' | 'active' | 'completed' | 'upcoming' | string;
  canStart?: boolean;
  progress?: number;
  daysLeft?: number;
  unreadCount?: number;
  featured?: boolean;
  currentDayNumber?: number | null;
  completedToday?: boolean;
  completedTodayAt?: string;
  canCompleteToday?: boolean;
}

interface ClaudeChallengeDirectoryProps {
  challenges: ChallengeItem[];
  isLoading?: boolean;
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

const DAY_FILTERS = ['All', '3', '5', '7', '14', '21'];
const CAT_FILTERS = ['All', 'Physical', 'Mental', 'Relational', 'Nutrition'];

function useHorizontalWebScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const isMouseDown = useRef(false);
  const startX = useRef(0);
  const scrollStartLeft = useRef(0);
  const hasDragged = useRef(false);

  const getDomNode = () => {
    return (
      (scrollRef.current as any)?.getScrollResponder?.()?.getScrollableNode?.() ||
      (scrollRef.current as any)
    );
  };

  const handleMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    isMouseDown.current = true;
    hasDragged.current = false;
    startX.current = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const node = getDomNode();
    scrollStartLeft.current = node?.scrollLeft || 0;
  };

  const handleMouseMove = (e: any) => {
    if (Platform.OS !== 'web' || !isMouseDown.current) return;
    const currentX = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const diff = currentX - startX.current;
    if (Math.abs(diff) > 4) {
      hasDragged.current = true;
    }
    const node = getDomNode();
    if (node) {
      node.scrollLeft = scrollStartLeft.current - diff;
    }
  };

  const handleMouseUp = () => {
    if (Platform.OS !== 'web') return;
    isMouseDown.current = false;
    setTimeout(() => {
      hasDragged.current = false;
    }, 100);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = getDomNode();
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && e.deltaY !== 0) {
        node.scrollLeft += e.deltaY * 0.8;
      }
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      node.removeEventListener('wheel', onWheel);
    };
  }, []);

  const webProps = Platform.OS === 'web' ? {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
  } : {};

  const webStyle = Platform.OS === 'web' ? ({
    cursor: 'grab',
    userSelect: 'none',
    WebkitOverflowScrolling: 'touch',
  } as any) : undefined;

  return {
    scrollRef,
    hasDragged,
    getDomNode,
    webProps,
    webStyle,
  };
}

export default function ClaudeChallengeDirectory({
  challenges,
  isLoading = false,
  onSelectChallenge,
  onOpenInviteGuest,
}: ClaudeChallengeDirectoryProps) {
  const { colors, isDark } = useTheme();
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedCat, setSelectedCat] = useState('All');
  const railScroll = useHorizontalWebScroll();
  const daysScroll = useHorizontalWebScroll();
  const catScroll = useHorizontalWebScroll();
  const [railOffset, setRailOffset] = useState(0);

  const allChallenges = Array.isArray(challenges) ? challenges : [];
  const railChallenges = allChallenges
    .slice()
    .sort((a, b) => parseInt(b.joined, 10) - parseInt(a.joined, 10))
    .slice(0, 4);

  const handleSlideRail = () => {
    if (railChallenges.length <= 1) return;
    const node = railScroll.getDomNode();
    const currentX = node ? node.scrollLeft : railOffset;
    // 176px card width + 12px gap = 188px step
    const maxOffset = (railChallenges.length - 1) * 188;
    const nextOffset = currentX >= maxOffset - 10 ? 0 : currentX + 188;

    if (railScroll.scrollRef.current?.scrollTo) {
      railScroll.scrollRef.current.scrollTo({ x: nextOffset, animated: true });
    }
    if (node) {
      if (node.scrollTo) {
        node.scrollTo({ left: nextOffset, behavior: 'smooth' });
      } else {
        node.scrollLeft = nextOffset;
      }
    }
    setRailOffset(nextOffset);
  };

  const filteredChallenges = allChallenges.filter((ch) => {
    if (selectedDay !== 'All') {
      const targetDays = parseInt(selectedDay, 10);
      if (ch.d !== targetDays) return false;
    }
    if (selectedCat !== 'All') {
      const catUpper = selectedCat.trim().toUpperCase();
      const itemCat = String(ch.c || '').trim().toUpperCase();
      if (itemCat !== catUpper && !itemCat.includes(catUpper)) return false;
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
        ref={railScroll.scrollRef}
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
        style={railScroll.webStyle}
        {...railScroll.webProps}
      >
        {railChallenges.map((c) => (
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
            onPress={() => {
              if (railScroll.hasDragged.current) return;
              onSelectChallenge(c);
            }}
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
          ref={daysScroll.scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={daysScroll.webStyle}
          {...daysScroll.webProps}
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
                onPress={() => {
                  if (daysScroll.hasDragged.current) return;
                  setSelectedDay(d);
                }}
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
          ref={catScroll.scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={catScroll.webStyle}
          {...catScroll.webProps}
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
                onPress={() => {
                  if (catScroll.hasDragged.current) return;
                  setSelectedCat(cat);
                }}
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
        {isLoading
          ? 'Loading challenges...'
          : `${filteredChallenges.length} of ${allChallenges.length} challenges${selectedDay === 'All' ? ' · from backend' : ` · ${selectedDay} days`}`}
      </Text>

      {/* Challenge List matching lines 891-906 */}
      <View style={styles.challengeList}>
        {!isLoading && filteredChallenges.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? NAVY : '#FFFFFF' }]}>
            <Text style={[styles.emptyTitle, { color: isDark ? IVORY : NAVY }]}>No challenges available</Text>
            <Text style={styles.emptyBody}>Active challenges from the dashboard will appear here.</Text>
          </View>
        )}
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
              <Text style={styles.joinBtnText}>
                {c.status === 'active' ? 'Open' : c.status === 'completed' ? 'Done' : 'Join'}
              </Text>
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
  emptyCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 18,
  },
  emptyTitle: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  emptyBody: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 5,
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
