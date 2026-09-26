import React from 'react';
import { Image, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import CrossPlatformWebView from '../CrossPlatformWebView';

export interface GridWorkoutItem {
  id?: string;
  name: string;
  meta: string;
  badge: string;
  lvl?: string;
  vimeoId?: string;
  videoUrl?: string;
  videoSource?: string;
  tag?: string;
  equipment?: string;
  durationMinutes?: number;
  thumbnail?: string;
  movements?: Array<{
    id?: string;
    name: string;
    sets?: string;
    reps?: string;
    load?: string;
    equipment?: string;
    restSeconds?: number;
    notes?: string;
    order?: number;
  }>;
}

function isDirectVideoUrl(value?: string) {
  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(String(value || '').trim());
}

function buildVideoPreviewHtml(videoUrl: string) {
  const escapedUrl = videoUrl.replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0D2B45;overflow:hidden}video{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><video src="${escapedUrl}" muted playsinline preload="metadata"></video></body></html>`;
}

interface ClaudeWorkoutGridProps {
  workouts: GridWorkoutItem[];
  hasCoach?: boolean;
  onSelectWorkout: (w: GridWorkoutItem) => void;
  onAskCoach?: () => void;
}

const NAVY = '#0D2B45';
const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

export default function ClaudeWorkoutGrid({
  workouts,
  hasCoach = true,
  onSelectWorkout,
  onAskCoach,
}: ClaudeWorkoutGridProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* 2-Column Grid */}
      <View style={styles.grid}>
        {workouts.map((w, idx) => (
          <Pressable
            key={w.id || idx}
            style={styles.card}
            onPress={() => onSelectWorkout(w)}
          >
            <View style={styles.mediaWrap}>
              {w.thumbnail ? (
                <Image
                  source={{ uri: w.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
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
              {w.thumbnail || w.videoUrl ? <View style={styles.thumbnailOverlay} pointerEvents="none" /> : null}
              <View style={styles.playCircle}>
                <View style={styles.playArrow} />
              </View>
              <Text style={styles.badge}>{w.badge}</Text>
            </View>

            <Text style={[styles.workoutName, { color: colors.text }]}>{w.name}</Text>
            <Text style={[styles.workoutMeta, { color: colors.textMuted }]}>{w.meta}</Text>
          </Pressable>
        ))}
      </View>

      {/* Footnote */}
      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        Every workout streams from Vimeo, quality stepped down automatically on slow connections. Downloaded workouts play with no signal at all.
      </Text>

      {/* Coach Teaser Card */}
      {hasCoach ? (
        <Pressable
          style={[
            styles.coachCard,
            {
              backgroundColor: isDark ? 'rgba(181, 101, 29, 0.04)' : 'rgba(181, 101, 29, 0.07)',
            },
          ]}
          onPress={onAskCoach}
        >
          <View style={styles.coachTextCol}>
            <Text style={[styles.coachTitle, { color: colors.text }]}>None of these fit today?</Text>
            <Text style={[styles.coachSub, { color: colors.textSecondary }]}>Tell your coach your time and kit</Text>
          </View>
          <Text style={styles.coachCta}>Ask coach</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
  },
  mediaWrap: {
    height: 96,
    borderRadius: 12,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 13, 0.18)',
  },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  badge: {
    position: 'absolute',
    bottom: 6,
    right: 7,
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '700',
    color: IVORY,
    backgroundColor: 'rgba(13, 13, 13, 0.78)',
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  workoutName: {
    fontFamily: DMSANS,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: IVORY,
    marginTop: 8,
  },
  workoutMeta: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 3,
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.4)',
    marginTop: 16,
  },
  coachCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(181, 101, 29, 0.5)',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(181, 101, 29, 0.04)',
  },
  coachTextCol: {
    flex: 1,
  },
  coachTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  coachSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  coachCta: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
    paddingHorizontal: 4,
  },
});
