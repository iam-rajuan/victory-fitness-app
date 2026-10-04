import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';

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
  difficulty?: string;
  difficulties?: string[];
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

export function formatDifficultyLabel(difficulties?: string[], singleDifficulty?: string): string {
  const list = Array.isArray(difficulties) && difficulties.length > 0
    ? difficulties
    : singleDifficulty
      ? [singleDifficulty]
      : [];
  const normalized = list.map((item) => String(item).trim().toUpperCase());

  const hasBeg = normalized.includes('BEGINNER');
  const hasInt = normalized.includes('INTERMEDIATE');
  const hasAdv = normalized.includes('ADVANCED');

  if ((hasBeg && hasInt && hasAdv) || normalized.includes('ALL') || normalized.includes('ALL LEVELS')) {
    return 'All Levels';
  }
  if (hasBeg && hasInt) {
    return 'Beg • Int';
  }
  if (hasInt && hasAdv) {
    return 'Int • Adv';
  }
  if (hasBeg && hasAdv) {
    return 'Beg & Adv';
  }
  if (hasAdv) {
    return 'Advanced';
  }
  if (hasInt) {
    return 'Intermediate';
  }
  if (hasBeg) {
    return 'Beginner';
  }
  if (normalized.length > 0) {
    const raw = normalized[0];
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
  return 'All Levels';
}

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
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();

  const isSlim = windowWidth > 0 && windowWidth < 380;
  const isUltraSlim = windowWidth > 0 && windowWidth < 330;
  const hPad = isSlim ? 14 : 20;

  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedCat, setSelectedCat] = useState('All');
  const railScroll = useHorizontalWebScroll();
  const daysScroll = useHorizontalWebScroll();
  const catScroll = useHorizontalWebScroll();
  const [railOffset, setRailOffset] = useState(0);
  const [showAllRailChallenges, setShowAllRailChallenges] = useState(false);

  const allChallenges = Array.isArray(challenges) ? challenges : [];
  const railChallenges = allChallenges
    .slice()
    .sort((a, b) => parseInt(b.joined, 10) - parseInt(a.joined, 10))
    .slice(0, showAllRailChallenges ? allChallenges.length : 5);

  const resetRailPosition = () => {
    const node = railScroll.getDomNode();
    if (railScroll.scrollRef.current?.scrollTo) {
      railScroll.scrollRef.current.scrollTo({ x: 0, animated: true });
    }
    if (node) {
      if (node.scrollTo) {
        node.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        node.scrollLeft = 0;
      }
    }
    setRailOffset(0);
  };

  const handleShowAllRail = () => {
    if (railChallenges.length <= 0) return;
    setSelectedDay('All');
    setSelectedCat('All');
    setShowAllRailChallenges((current) => !current);
    resetRailPosition();
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
      {/* Horizontal Rail: Most joined this week */}
      <View style={[styles.railHeader, { paddingHorizontal: hPad }]}>
        <Text style={[styles.railTitle, { color: colors.text }]}>{t('Most joined this week')}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={handleShowAllRail}>
          <Text style={styles.railAllLink}>
            {showAllRailChallenges ? t('Top 5') : t('All ›')}
          </Text>
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
        contentContainerStyle={[styles.railScroll, { paddingHorizontal: hPad }]}
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

      {/* HOW MANY DAYS? Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterLabel, { color: colors.textMuted, paddingHorizontal: hPad }]}>
          {t('HOW MANY DAYS?')}
        </Text>
        <ScrollView
          ref={daysScroll.scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, { paddingHorizontal: hPad }]}
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

      {/* WHAT KIND? Filter Chips */}
      <View style={styles.filterSectionSmall}>
        <Text style={[styles.filterLabel, { color: colors.textMuted, paddingHorizontal: hPad }]}>
          {t('WHAT KIND?')}
        </Text>
        <ScrollView
          ref={catScroll.scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, { paddingHorizontal: hPad }]}
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
                  {t(cat)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Challenge Count Indicator */}
      <View style={[styles.countLineRow, { paddingHorizontal: hPad }]}>
        <Text style={[styles.countLine, { color: GOLD }]}>
          {isLoading
            ? t('Preparing your challenges')
            : t('{active} of {total} challenges', { active: filteredChallenges.length, total: allChallenges.length })}
        </Text>
      </View>

      {/* Challenge List - Robust, Unbreakable Responsive Card Architecture */}
      <View style={[styles.challengeList, { paddingHorizontal: hPad }]}>
        {isLoading && filteredChallenges.length === 0 && [0, 1, 2].map((item) => (
          <View
            key={`challenge-skeleton-${item}`}
            style={[
              styles.challengeCard,
              styles.skeletonCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                paddingVertical: isSlim ? 12 : 14,
                paddingHorizontal: isSlim ? 12 : 15,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.durationBadge,
                  styles.skeletonBox,
                  { width: isSlim ? 42 : 46, height: isSlim ? 42 : 46 },
                ]}
              />
              <View style={styles.cardContentCol}>
                <View style={[styles.skeletonLine, { width: '70%', height: 16, marginBottom: 8 }]} />
                <View style={[styles.skeletonLine, { width: '45%', height: 13 }]} />
              </View>
            </View>
            <View
              style={[
                styles.cardDivider,
                {
                  backgroundColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.06)',
                },
              ]}
            />
            <View style={styles.cardFooterRow}>
              <View style={[styles.skeletonLine, { width: 110, height: 16 }]} />
              <View style={[styles.skeletonLine, { width: 56, height: 28, borderRadius: 8 }]} />
            </View>
          </View>
        ))}

        {!isLoading && filteredChallenges.length === 0 && (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderLeftColor: COPPER,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: isDark ? IVORY : NAVY }]}>
              {t('Your next challenge is being prepared')}
            </Text>
            <Text
              style={[
                styles.emptyBody,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.6)' },
              ]}
            >
              {t('Check back soon or ask your coach what to start with today.')}
            </Text>
          </View>
        )}

        {filteredChallenges.map((c) => {
          const difficultyLabel = formatDifficultyLabel(c.difficulties, c.difficulty);
          const isDone = c.status === 'completed';
          const isActive = c.status === 'active';

          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.challengeCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.08)',
                  paddingVertical: isSlim ? 12 : 14,
                  paddingHorizontal: isSlim ? 12 : 15,
                  shadowColor: '#0D2B45',
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 10,
                  elevation: 2,
                  shadowOpacity: isDark ? 0.35 : 0.05,
                },
              ]}
              activeOpacity={0.88}
              onPress={() => onSelectChallenge(c)}
            >
              {/* Top Section: Duration Badge + Title & Tags */}
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.durationBadge,
                    {
                      width: isSlim ? 42 : 46,
                      height: isSlim ? 42 : 46,
                      backgroundColor: isDark ? 'rgba(247, 243, 238, 0.06)' : 'rgba(13, 43, 69, 0.04)',
                      borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationNum,
                      { color: isDark ? IVORY : NAVY, fontSize: isSlim ? 18 : 20 },
                    ]}
                  >
                    {c.d}
                  </Text>
                  <Text
                    style={[
                      styles.durationLabel,
                      { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.5)' },
                    ]}
                  >
                    {t('DAYS')}
                  </Text>
                </View>

                <View style={styles.cardContentCol}>
                  <Text
                    style={[
                      styles.challengeTitle,
                      { color: isDark ? IVORY : NAVY, fontSize: isSlim ? 15 : 16 },
                    ]}
                    numberOfLines={2}
                  >
                    {c.n}
                  </Text>

                  <View style={styles.tagRow}>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{c.c}</Text>
                    </View>
                    <View
                      style={[
                        styles.difficultyPill,
                        {
                          backgroundColor: isDark ? 'rgba(247, 243, 238, 0.06)' : 'rgba(13, 43, 69, 0.04)',
                          borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.1)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.difficultyPillText,
                          { color: isDark ? 'rgba(247, 243, 238, 0.72)' : 'rgba(13, 43, 69, 0.65)' },
                        ]}
                      >
                        {t(difficultyLabel)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Hairline Divider */}
              <View
                style={[
                  styles.cardDivider,
                  {
                    backgroundColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.06)',
                  },
                ]}
              />

              {/* Bottom Row: Rewards & Social Proof + CTA */}
              <View style={styles.cardFooterRow}>
                <View style={styles.footerMetaGroup}>
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsBadgeText}>{c.p}</Text>
                  </View>
                  <Text
                    style={[
                      styles.footerDot,
                      { color: isDark ? 'rgba(247, 243, 238, 0.3)' : 'rgba(13, 43, 69, 0.3)' },
                    ]}
                  >
                    •
                  </Text>
                  <Text
                    style={[
                      styles.joinedText,
                      { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
                    ]}
                    numberOfLines={1}
                  >
                    {c.joined}
                  </Text>
                </View>

                <View
                  style={[
                    styles.actionBtn,
                    isSlim && styles.actionBtnSlim,
                    isActive && styles.actionBtnActive,
                    isDone && styles.actionBtnCompleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionBtnText,
                      isActive && styles.actionBtnTextActive,
                      isDone && styles.actionBtnTextCompleted,
                    ]}
                  >
                    {isActive ? t('Open ›') : isDone ? t('Done ✓') : t('Join')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Guest pull-in card */}
      <TouchableOpacity
        style={[
          styles.guestCard,
          {
            marginHorizontal: hPad,
            backgroundColor: isDark ? 'rgba(181, 101, 29, 0.04)' : 'rgba(181, 101, 29, 0.03)',
          },
        ]}
        activeOpacity={0.85}
        onPress={onOpenInviteGuest}
      >
        <View style={styles.guestTextCol}>
          <Text style={[styles.guestTitle, { color: colors.text }]}>{t('Pull someone in from outside')}</Text>
          <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
            {t("They don't need the app. They follow the challenge as a guest for its full length.")}
          </Text>
        </View>
        <View style={styles.guestArrowWrap}>
          <Text style={styles.guestArrow}>{t('Invite →')}</Text>
        </View>
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
    marginBottom: 9,
  },
  chipRow: {
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
  countLineRow: {
    paddingTop: 18,
    paddingBottom: 10,
  },
  countLine: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  challengeList: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
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
    marginTop: 5,
  },

  /* Master Challenge Card */
  challengeCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  durationBadge: {
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  durationNum: {
    fontFamily: MONO,
    lineHeight: 20,
    fontWeight: '700',
  },
  durationLabel: {
    fontFamily: DMSANS,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  cardContentCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  challengeTitle: {
    fontFamily: DMSANS,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    backgroundColor: 'rgba(181, 101, 29, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.32)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryPillText: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COPPER,
  },
  difficultyPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  difficultyPillText: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cardDivider: {
    height: 1,
    marginVertical: 11,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  pointsBadge: {
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  pointsBadgeText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  footerDot: {
    fontSize: 10,
  },
  joinedText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '500',
    flexShrink: 1,
  },
  actionBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionBtnSlim: {
    height: 30,
    paddingHorizontal: 12,
  },
  actionBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  actionBtnCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  actionBtnText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  actionBtnTextActive: {
    color: '#38BDF8',
  },
  actionBtnTextCompleted: {
    color: '#22C55E',
  },

  /* Skeleton Loading State */
  skeletonCard: {
    borderLeftColor: 'rgba(201, 148, 58, 0.45)',
  },
  skeletonBox: {
    backgroundColor: 'rgba(247, 243, 238, 0.1)',
  },
  skeletonLine: {
    borderRadius: 6,
    backgroundColor: 'rgba(247, 243, 238, 0.1)',
  },

  /* Pull-in Guest Card */
  guestCard: {
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(181, 101, 29, 0.5)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestTextCol: {
    flex: 1,
    minWidth: 0,
  },
  guestTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
  },
  guestSub: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  guestArrowWrap: {
    flexShrink: 0,
  },
  guestArrow: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
});
