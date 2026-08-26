import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CrossPlatformWebView from '../../components/CrossPlatformWebView';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../lib/i18n';
import { goBackOrReplace } from '../../lib/navigation';
import { recordAnalyticsEvent } from '../../lib/api';

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=300&auto=format&fit=crop';

function buildWorkoutPlayerHtml(videoUrl: string) {
  const isDirectVideo =
    /^https?:\/\/.+\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(videoUrl) ||
    videoUrl.includes('/workout-videos/');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #0E1326;
        overflow: hidden;
      }
      .frame {
        position: fixed;
        inset: 0;
        border: 0;
        width: 100%;
        height: 100%;
        background: #0E1326;
      }
      video.frame {
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    ${
      isDirectVideo
        ? `<video class="frame" controls playsinline preload="metadata" src="${videoUrl}"></video>`
        : `<iframe
      class="frame"
      src="${videoUrl}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>`
    }
    <script>
      window.open = function () { return null; };
      document.addEventListener('click', function (event) {
        var target = event.target;
        if (target && target.closest && target.closest('a')) {
          event.preventDefault();
          event.stopPropagation();
        }
      }, true);
    </script>
  </body>
</html>`;
}

function isAllowedWorkoutPlayerRequest(url: string): boolean {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) {
    return false;
  }

  if (
    normalizedUrl === 'about:blank' ||
    normalizedUrl.startsWith('data:') ||
    normalizedUrl.startsWith('blob:')
  ) {
    return true;
  }

  if (normalizedUrl.startsWith('https://player.vimeo.com/video/')) {
    return true;
  }

  if (normalizedUrl.startsWith('https://www.youtube.com/embed/')) {
    return true;
  }

  if (normalizedUrl.startsWith('https://www.youtube-nocookie.com/embed/')) {
    return true;
  }

  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return true;
  }

  return false;
}

export default function WorkoutPlayerScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [playerBlocked, setPlayerBlocked] = React.useState(false);
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    vimeoId?: string;
    videoUrl?: string;
    videoSource?: string;
    tag?: string;
    thumbnail?: string;
  }>();

  const title = typeof params.title === 'string' ? params.title : t('Workout');
  const vimeoId = typeof params.vimeoId === 'string' ? params.vimeoId : '';
  const videoUrl = typeof params.videoUrl === 'string' ? params.videoUrl : '';
  const tag = typeof params.tag === 'string' ? params.tag : t('Workout');
  const thumbnail = typeof params.thumbnail === 'string' ? params.thumbnail : DEFAULT_THUMBNAIL;
  const isVimeoStream = Boolean(vimeoId) || embedUrlIncludesVimeo(videoUrl);

  const embedUrl = useMemo(() => {
    if (videoUrl) {
      return videoUrl;
    }
    if (!vimeoId) {
      return '';
    }

    return `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}?autoplay=1&title=0&byline=0&portrait=0&playsinline=1&dnt=1`;
  }, [videoUrl, vimeoId]);
  const playerHtml = useMemo(() => (embedUrl ? buildWorkoutPlayerHtml(embedUrl) : ''), [embedUrl]);
  const externalVideoUrl = useMemo(() => {
    if (videoUrl) {
      return buildExternalVideoUrl(videoUrl);
    }
    if (vimeoId) {
      return `https://vimeo.com/${encodeURIComponent(vimeoId)}`;
    }
    return '';
  }, [videoUrl, vimeoId]);

  useEffect(() => {
    if (typeof params.id !== 'string' || !params.id) {
      return;
    }
    void recordAnalyticsEvent('workout_library_item_viewed', {
      workout_id: params.id,
      title,
    }).catch(() => undefined);
  }, [params.id, title]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrReplace(router, '/workout-library/categories')} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>{t('VICTORY FITNESS SECURE PLAYER')}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.headerMeta} numberOfLines={1}>
            {tag.toUpperCase()} · {t('IN-APP STREAM')}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {embedUrl ? (
        <View style={styles.playerWrap}>
          <CrossPlatformWebView
            source={{ html: playerHtml }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={false}
            onShouldStartLoadWithRequest={(request: any) => isAllowedWorkoutPlayerRequest(request.url)}
            onError={() => setPlayerBlocked(true)}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>{t('Preparing secure workout stream...')}</Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Image source={{ uri: thumbnail }} style={styles.emptyImage} />
          <Text style={styles.emptyTitle}>{t('Workout unavailable')}</Text>
          <Text style={styles.emptyText}>{t('This workout does not have an active in-app stream right now.')}</Text>
        </View>
      )}

      {embedUrl && (playerBlocked || isVimeoStream) ? (
        <View style={styles.fallbackCard}>
          <View style={styles.fallbackHeaderRow}>
            <View style={styles.fallbackIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.fallbackTitle}>
              {playerBlocked ? 'Protected stream blocked in-app' : 'Protected stream fallback'}
            </Text>
          </View>
          <Text style={styles.fallbackText}>
            {playerBlocked
              ? 'This video is protected by the provider and cannot be embedded on this device or domain right now. Open it in your browser to continue watching.'
              : 'Some Vimeo videos may be blocked inside the in-app player because of embed privacy settings. If playback fails, open the secure stream in your browser.'}
          </Text>
          {externalVideoUrl ? (
            <TouchableOpacity
              style={styles.fallbackButton}
              activeOpacity={0.88}
              onPress={() => {
                void Linking.openURL(externalVideoUrl);
              }}
            >
              <Ionicons name="open-outline" size={16} color="#03111D" />
              <Text style={styles.fallbackButtonText}>Open secure stream</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function embedUrlIncludesVimeo(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.includes('vimeo.com') || normalized.includes('player.vimeo.com/video/');
}

function buildExternalVideoUrl(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  const vimeoEmbedMatch = normalized.match(/player\.vimeo\.com\/video\/(\d+)/i);
  if (vimeoEmbedMatch?.[1]) {
    return `https://vimeo.com/${vimeoEmbedMatch[1]}`;
  }

  return normalized;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    color: Colors.primary,
    fontSize: 11,
    letterSpacing: 1.6,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  headerMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.8,
    fontFamily: 'Inter_500Medium',
  },
  playerWrap: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0E1326',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0E1326',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E1326',
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  emptyState: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0E1326',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyImage: {
    width: 160,
    height: 160,
    borderRadius: 18,
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  fallbackCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.16)',
    backgroundColor: '#0B1120',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  fallbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fallbackIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
  },
  fallbackTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  fallbackText: {
    color: 'rgba(226,232,240,0.78)',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  fallbackButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fallbackButtonText: {
    color: '#03111D',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
