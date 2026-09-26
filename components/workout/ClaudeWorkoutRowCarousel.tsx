import React from 'react';
import { Image, StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import CrossPlatformWebView from '../CrossPlatformWebView';

export interface ProgramCardItem {
  n: string;
  m: string;
  t: string;
  c?: string;
  rank?: number | string;
  image?: string;
}

export interface WorkoutRowItem {
  n: string;
  m: string;
  t: string;
  v?: string;
  videoUrl?: string;
  videoSource?: string;
  thumbnail?: string;
  item?: any;
}

function isDirectVideoUrl(value?: string) {
  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(String(value || '').trim());
}

function buildVideoPreviewHtml(videoUrl: string) {
  const escapedUrl = videoUrl.replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0D2B45;overflow:hidden}video{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><video src="${escapedUrl}" muted playsinline preload="metadata"></video></body></html>`;
}

interface ClaudeWorkoutRowCarouselProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  type: 'programs' | 'workouts';
  programs?: ProgramCardItem[];
  workouts?: WorkoutRowItem[];
  onSelectProgram?: (item: ProgramCardItem) => void;
  onSelectWorkout?: (item: WorkoutRowItem) => void;
}

const NAVY = '#0D2B45';
const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

export default function ClaudeWorkoutRowCarousel({
  title,
  subtitle,
  actionText,
  onActionPress,
  type = 'workouts',
  programs = [],
  workouts = [],
  onSelectProgram,
  onSelectWorkout,
}: ClaudeWorkoutRowCarouselProps) {
  const { isDark } = useTheme();
  const scrollRef = React.useRef<ScrollView>(null);

  const isMouseDown = React.useRef(false);
  const startX = React.useRef(0);
  const scrollStartLeft = React.useRef(0);
  const hasDragged = React.useRef(false);

  const snapInterval = type === 'programs' ? 170 : 208;

  const handleAction = () => {
    if (onActionPress) {
      onActionPress();
    } else {
      scrollRef.current?.scrollTo({ x: snapInterval * 2, animated: true });
    }
  };

  // Mouse drag-to-slide handlers for web
  const handleMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    isMouseDown.current = true;
    hasDragged.current = false;
    startX.current = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const node = (scrollRef.current as any)?.getScrollResponder?.()?.getScrollableNode?.() || (scrollRef.current as any);
    scrollStartLeft.current = node?.scrollLeft || 0;
  };

  const handleMouseMove = (e: any) => {
    if (Platform.OS !== 'web' || !isMouseDown.current) return;
    const currentX = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const diff = currentX - startX.current;
    if (Math.abs(diff) > 4) {
      hasDragged.current = true;
    }
    const node = (scrollRef.current as any)?.getScrollResponder?.()?.getScrollableNode?.() || (scrollRef.current as any);
    if (node) {
      node.scrollLeft = scrollStartLeft.current - diff;
    }
  };

  const handleMouseUp = () => {
    if (Platform.OS !== 'web') return;
    isMouseDown.current = false;
  };

  const getDomNode = () => {
    return (
      (scrollRef.current as any)?.getScrollResponder?.()?.getScrollableNode?.() ||
      (scrollRef.current as any)
    );
  };

  // Mouse wheel horizontal scroll handler for web
  React.useEffect(() => {
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

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {actionText ? (
          <Pressable onPress={handleAction} hitSlop={8}>
            <Text style={styles.actionText}>{actionText}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Horizontal Slideable Snap Scroll Area with native draggable 8px slidebar */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        directionalLockEnabled
        nestedScrollEnabled
        contentContainerStyle={styles.scrollContent}
        {...(Platform.OS === 'web' ? {
          onMouseDown: handleMouseDown,
          onMouseMove: handleMouseMove,
          onMouseUp: handleMouseUp,
          onMouseLeave: handleMouseUp,
        } : {})}
        style={Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none', WebkitOverflowScrolling: 'touch' } as any) : undefined}
      >
        {type === 'programs' &&
          programs.map((p, idx) => (
            <Pressable
              key={idx}
              style={styles.programCard}
              onPress={() => {
                if (hasDragged.current) return;
                onSelectProgram && onSelectProgram(p);
              }}
            >
              <View style={styles.programMedia}>
                {p.image ? (
                  <Image source={{ uri: p.image }} style={styles.mediaImage} resizeMode="cover" />
                ) : null}
                {/* Gradient overlay from prototype: linear-gradient(180deg, rgba(201,148,58,.14) 0%, rgba(13,43,69,0) 55%) */}
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    Platform.select({
                      web: {
                        background: 'linear-gradient(180deg, rgba(201,148,58,.14) 0%, rgba(13,43,69,0) 55%)',
                      } as any,
                      default: {
                        backgroundColor: 'rgba(201, 148, 58, 0.06)',
                      },
                    }),
                  ]}
                />

                {p.rank !== undefined ? (
                  <Text style={styles.programRank}>{p.rank}</Text>
                ) : null}
                <Text style={styles.programTag}>{p.t}</Text>

                <View style={styles.programBottomInfo}>
                  <Text style={styles.programName}>{p.n}</Text>
                  <Text style={styles.programMeta}>{p.m}</Text>
                </View>
              </View>
              {p.c ? <Text style={styles.programCount}>{p.c}</Text> : null}
            </Pressable>
          ))}

        {type === 'workouts' &&
          workouts.map((w, idx) => (
            <Pressable
              key={idx}
              style={styles.workoutCard}
              onPress={() => {
                if (hasDragged.current) return;
                onSelectWorkout && onSelectWorkout(w);
              }}
            >
              <View style={styles.workoutMedia}>
                {w.thumbnail ? (
                  <Image source={{ uri: w.thumbnail }} style={styles.mediaImage} resizeMode="cover" />
                ) : w.videoUrl && (w.videoSource === 'UPLOAD' || isDirectVideoUrl(w.videoUrl)) ? (
                  Platform.OS === 'web' ? (
                    React.createElement('video', {
                      src: w.videoUrl,
                      muted: true,
                      playsInline: true,
                      preload: 'metadata',
                      style: {
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        backgroundColor: NAVY,
                        pointerEvents: 'none',
                      },
                    })
                  ) : (
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <CrossPlatformWebView
                      source={{ html: buildVideoPreviewHtml(w.videoUrl) }}
                      style={StyleSheet.absoluteFill}
                      scrollEnabled={false}
                      javaScriptEnabled
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                    />
                    </View>
                  )
                ) : null}
                {w.thumbnail || w.videoUrl ? <View style={styles.workoutImageOverlay} pointerEvents="none" /> : null}
                <View style={styles.playCircle}>
                  <View style={styles.playArrow} />
                </View>
                <Text style={styles.workoutBadge}>{w.t}</Text>
              </View>
              <Text style={styles.workoutName}>{w.n}</Text>
              <Text style={styles.workoutMeta}>{w.m}</Text>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  subtitle: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 3,
  },
  actionText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  // Program card styles
  programCard: {
    width: 158,
    flexShrink: 0,
  },
  programMedia: {
    height: 200,
    borderRadius: 14,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 12,
    position: 'relative',
  },
  programRank: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontFamily: MONO,
    fontSize: 34,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.22)',
  },
  mediaImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  programTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontFamily: DMSANS,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: GOLD,
  },
  programBottomInfo: {
    position: 'relative',
  },
  programName: {
    fontFamily: CLASH,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '600',
    color: IVORY,
  },
  programMeta: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 5,
  },
  programCount: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 7,
  },
  // Workout card styles
  workoutCard: {
    width: 196,
    flexShrink: 0,
  },
  workoutMedia: {
    position: 'relative',
    height: 112,
    borderRadius: 13,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  workoutImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 13, 0.18)',
  },
  playCircle: {
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 7,
    borderTopColor: 'transparent',
    borderBottomWidth: 7,
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  workoutBadge: {
    position: 'absolute',
    top: 10,
    left: 11,
    fontFamily: DMSANS,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: GOLD,
    backgroundColor: 'rgba(13, 13, 13, 0.7)',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  workoutName: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
    marginTop: 9,
  },
  workoutMeta: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 3,
  },
});
