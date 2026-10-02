import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';
import CrossPlatformWebView from '../CrossPlatformWebView';

interface ClaudeResumeSessionCardProps {
  sessionTitle?: string;
  sessionLine?: string;
  minutesLeft?: string;
  progressPct?: number;
  thumbnail?: string;
  videoUrl?: string;
  videoSource?: string;
  completed?: boolean;
  onResume?: () => void;
}

const NAVY = '#0D2B45';
const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

function isDirectVideoUrl(value?: string) {
  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(String(value || '').trim());
}

function buildVideoPreviewHtml(videoUrl: string) {
  const escapedUrl = videoUrl.replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0D2B45;overflow:hidden}video{width:100%;height:100%;object-fit:cover;display:block}</style></head><body><video src="${escapedUrl}" muted playsinline preload="metadata"></video></body></html>`;
}

export default function ClaudeResumeSessionCard({
  sessionTitle = 'Upper Body Strength',
  sessionLine = 'exercise 3 of 7 · Strong at 45+ · week 2',
  minutesLeft = '18 min left',
  progressPct = 43,
  thumbnail = '',
  videoUrl = '',
  videoSource = '',
  completed = false,
  onResume,
}: ClaudeResumeSessionCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [thumbnailLoaded, setThumbnailLoaded] = useState(!thumbnail);

  useEffect(() => {
    setThumbnailLoaded(!thumbnail);
  }, [thumbnail]);

  return (
    <View style={styles.container}>
      <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
        {completed ? t('COMPLETED BEFORE') : t('PICK UP WHERE YOU LEFT OFF')}
      </Text>

      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.08)',
            shadowColor: '#0D2B45',
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 14,
            elevation: 2,
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
        onPress={onResume}
      >
        {/* Top media container */}
        <View style={styles.mediaWrap}>
          {thumbnail ? (
            <>
              {!thumbnailLoaded ? (
                <View style={styles.thumbnailLoading}>
                  <ActivityIndicator size="small" color={GOLD} />
                </View>
              ) : null}
              <Image
                source={{ uri: thumbnail }}
                style={[styles.mediaImage, !thumbnailLoaded && styles.mediaImageHidden]}
                resizeMode="cover"
                onLoad={() => setThumbnailLoaded(true)}
                onError={() => setThumbnailLoaded(true)}
              />
            </>
          ) : videoUrl && (videoSource === 'UPLOAD' || isDirectVideoUrl(videoUrl)) ? (
            Platform.OS === 'web' ? (
              React.createElement('video', {
                src: videoUrl,
                muted: true,
                playsInline: true,
                preload: 'metadata',
                style: {
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: OBSIDIAN,
                  pointerEvents: 'none',
                },
              })
            ) : (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <CrossPlatformWebView
                source={{ html: buildVideoPreviewHtml(videoUrl) }}
                style={StyleSheet.absoluteFill}
                scrollEnabled={false}
                javaScriptEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
              />
              </View>
            )
          ) : null}
          {/* Radial gradient background */}
          <View
            style={[
              StyleSheet.absoluteFillObject,
              Platform.select({
                web: {
                  background: 'radial-gradient(90% 120% at 20% 10%, rgba(201,148,58,.16) 0%, rgba(13,13,13,0) 60%)',
                } as any,
                default: {
                  backgroundColor: 'rgba(201, 148, 58, 0.08)',
                },
              }),
            ]}
            pointerEvents="none"
          />

          {/* Big gold play circle */}
          {thumbnailLoaded ? (
            <View style={styles.playCircle}>
              <View style={styles.playArrow} />
            </View>
          ) : null}

          {/* Time remaining pill badge */}
          {thumbnailLoaded ? <Text style={styles.timeBadge}>{minutesLeft}</Text> : null}
          {completed ? <Text style={styles.completedBadge}>✓ Done</Text> : null}

          {/* Bottom progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* Bottom details row */}
        <View style={styles.bottomRow}>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: isDark ? IVORY : NAVY }]}>{sessionTitle}</Text>
            <Text
              style={[
                styles.line,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              {completed ? `Previously completed · ${sessionLine}` : sessionLine}
            </Text>
          </View>

          <Pressable style={styles.resumeBtn} onPress={onResume}>
            <Text style={styles.resumeBtnText}>{completed ? 'Start again' : 'Resume'}</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
  },
  mediaWrap: {
    position: 'relative',
    height: 168,
    backgroundColor: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mediaImageHidden: {
    opacity: 0,
  },
  thumbnailLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NAVY,
  },
  playCircle: {
    width: 60,
    height: 60,
    borderRadius: 99,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 17,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 12,
    borderTopColor: 'transparent',
    borderBottomWidth: 12,
    borderBottomColor: 'transparent',
    marginLeft: 5,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: IVORY,
    backgroundColor: 'rgba(13, 13, 13, 0.78)',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    left: 14,
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '800',
    color: IVORY,
    backgroundColor: 'rgba(13, 13, 13, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(95, 196, 142, 0.85)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(247, 243, 238, 0.18)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  bottomRow: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 19,
    fontWeight: '600',
    color: IVORY,
  },
  line: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 4,
  },
  resumeBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
