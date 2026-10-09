import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';

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

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'DMSans-Medium' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeChallengesCarousel({
  challenges = [],
  onOpenChallenge,
}: ClaudeChallengesCarouselProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [activeIdx, setActiveIdx] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const isMouseDown = useRef(false);
  const startX = useRef(0);
  const scrollStartLeft = useRef(0);
  const hasDragged = useRef(false);

  const list = Array.isArray(challenges) ? challenges : [];

  const screenWidth = Dimensions.get('window').width;
  const defaultWidth = Math.min(600, screenWidth);
  const effectiveWidth = containerWidth > 0 ? containerWidth : defaultWidth;
  const cardWidth = Math.max(260, effectiveWidth - 40);
  const snapInterval = cardWidth + 12;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

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

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    if (snapInterval > 0) {
      const idx = Math.round(offsetX / snapInterval);
      const clamped = Math.max(0, Math.min(list.length - 1, idx));
      if (clamped !== activeIdx) {
        setActiveIdx(clamped);
      }
    }
  };

  const scrollToIndex = (index: number, animated = true) => {
    const target = Math.max(0, Math.min(list.length - 1, index));
    setActiveIdx(target);
    const offset = target * snapInterval;
    scrollRef.current?.scrollTo({ x: offset, animated });
    const node = getDomNode();
    if (node && node.scrollTo) {
      node.scrollTo({ left: offset, behavior: animated ? 'smooth' : 'auto' });
    }
  };

  const goNext = () => {
    scrollToIndex((activeIdx + 1) % list.length);
  };

  const goPrev = () => {
    scrollToIndex((activeIdx - 1 + list.length) % list.length);
  };

  const handleCardPress = (item: ChallengeItem) => {
    if (hasDragged.current) return;
    if (onOpenChallenge) {
      onOpenChallenge(item);
      return;
    }
    pushRoute(router, '/(tabs)/challenge');
  };

  if (list.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Header with counter and arrows */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionKicker, { color: colors.textMuted }]}>{t('YOUR CHALLENGES')}</Text>
        <View style={styles.controlsRow}>
          <Text style={[styles.countText, { color: colors.textMuted }]}>
            {t('{active} of {total} active', { active: activeIdx + 1, total: list.length })}
          </Text>
          {list.length > 1 && (
            <>
              <Pressable hitSlop={10} onPress={goPrev}>
                <Text style={styles.arrowBtn}>‹</Text>
              </Pressable>
              <Pressable hitSlop={10} onPress={goNext}>
                <Text style={styles.arrowBtn}>›</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Slideable Horizontal Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        directionalLockEnabled
        nestedScrollEnabled
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        style={[
          styles.scrollContainer,
          Platform.OS === 'web'
            ? ({ cursor: 'grab', userSelect: 'none', WebkitOverflowScrolling: 'touch' } as any)
            : undefined,
        ]}
        {...(Platform.OS === 'web'
          ? {
              onMouseDown: handleMouseDown,
              onMouseMove: handleMouseMove,
              onMouseUp: handleMouseUp,
              onMouseLeave: handleMouseUp,
            }
          : {})}
      >
        {list.map((c, i) => (
          <Pressable
            key={c.id || `challenge-${i}`}
            style={[
              styles.card,
              {
                width: cardWidth,
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                shadowOpacity: isDark ? 0.35 : 0.05,
              },
            ]}
            onPress={() => handleCardPress(c)}
          >
            <View style={styles.cardTopRow}>
              <Text style={[styles.challengeName, { color: isDark ? IVORY : NAVY }]}>{t(c.n)}</Text>
              <Text style={styles.rankBadge}>{t(c.rank)}</Text>
            </View>

            <Text
              style={[
                styles.dayProgressText,
                { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              {t(c.d)}
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
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, c.pct))}%` }]} />
            </View>

            <Text style={[styles.noteText, { color: isDark ? GOLD : '#B5651D' }]}>{t(c.note)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Dots Indicator */}
      {list.length > 1 && (
        <View style={styles.dotsRow}>
          {list.map((_, i) => (
            <Pressable
              key={i}
              hitSlop={8}
              onPress={() => scrollToIndex(i)}
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
      )}

      {list.length > 1 && (
        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          swipe between your active challenges
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 20,
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
    paddingHorizontal: 4,
  },
  scrollContainer: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
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
    minHeight: 140,
    justifyContent: 'space-between',
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
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
  },
});
