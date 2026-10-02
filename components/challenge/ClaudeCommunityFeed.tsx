import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import CrossPlatformWebView from '../CrossPlatformWebView';

export interface CommunityPost {
  id: string;
  name: string;
  tier: string;
  i: string; // initials
  when: string;
  body: string;
  react: string;
  cheerCount: number;
  commentCount?: number;
  hasCheered?: boolean;
  hasPhoto?: boolean;
  photoNote?: string;
  imageUrl?: string;
  hasVideo?: boolean;
  videoTitle?: string;
  videoMeta?: string;
  videoUrl?: string;
  comments?: CommunityComment[];
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorName: string;
  authorInitials: string;
  authorRole: string;
  content: string;
  when: string;
}

export type CommunityPostDraft = {
  content: string;
  kind: 'Text only' | 'Photo' | 'YouTube link';
  audience: 'auto' | 'tier' | 'all';
  imageBase64?: string;
  imageMimeType?: string;
  imageFileName?: string;
  externalVideoUrl?: string;
};

interface ClaudeCommunityFeedProps {
  userTier?: string;
  userInitials?: string;
  posts?: CommunityPost[];
  onPublishPost?: (draft: CommunityPostDraft) => Promise<void>;
  onToggleCheer?: (postId: string) => Promise<void>;
  onLoadComments?: (postId: string) => Promise<CommunityComment[]>;
  onAddComment?: (postId: string, content: string) => Promise<CommunityComment>;
  onScopeChange?: (scope: 'auto' | 'tier' | 'all') => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isDirectVideoUrl(value?: string) {
  const normalized = String(value || '').trim();
  return /\.(mp4|mov|m4v|webm|ogv)(\?.*)?$/i.test(normalized) || normalized.includes('/community-videos/');
}

function getYouTubeVideoId(value?: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return url.pathname.replace(/^\/+/, '').split('/')[0] || '';
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname.startsWith('/watch')) return url.searchParams.get('v') || '';
      if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/').filter(Boolean)[1] || '';
      }
    }
  } catch {
    const match = normalized.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
    return match?.[1] || '';
  }
  return '';
}

function getYouTubeThumbnailUrl(value?: string) {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
}

function getVideoProviderLabel(value?: string) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'YouTube';
  if (normalized.includes('vimeo.com')) return 'Vimeo';
  return 'Video';
}

function normalizeExternalVideoEmbedUrl(value?: string) {
  const normalized = String(value || '').trim();
  if (!normalized || isDirectVideoUrl(normalized)) return normalized;

  const youtubeVideoId = getYouTubeVideoId(normalized);
  if (youtubeVideoId) {
    return `https://www.youtube.com/embed/${youtubeVideoId}?playsinline=1&autoplay=1&rel=0&modestbranding=1`;
  }

  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'player.vimeo.com' && url.pathname.startsWith('/video/')) {
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('playsinline', '1');
      return url.toString();
    }
    if (host === 'vimeo.com') {
      const videoId = url.pathname.split('/').filter(Boolean)[0] || '';
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}?autoplay=1&playsinline=1`;
      }
    }
  } catch {
    const vimeoMatch = normalized.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch?.[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&playsinline=1`;
    }
  }

  return normalized;
}

function buildCommunityVideoHtml(videoUrl: string) {
  const directVideo = isDirectVideoUrl(videoUrl);
  const embeddedUrl = directVideo ? videoUrl : normalizeExternalVideoEmbedUrl(videoUrl);
  const escapedUrl = escapeHtmlAttribute(embeddedUrl);
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>
      html,body{margin:0;width:100%;height:100%;background:#0D2B45;overflow:hidden}
      .frame{position:fixed;inset:0;width:100%;height:100%;border:0;background:#0D2B45}
      video.frame{object-fit:cover}
    </style>
  </head>
  <body>
    ${
      directVideo
        ? `<video class="frame" src="${escapedUrl}" controls playsinline preload="metadata"></video>`
        : `<iframe class="frame" src="${escapedUrl}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    }
  </body>
</html>`;
}

function normalizePickedImageMimeType(asset: ImagePicker.ImagePickerAsset) {
  const rawMime = String(asset.mimeType || '').trim().toLowerCase();
  if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'].includes(rawMime)) {
    return rawMime;
  }

  const sourceName = `${asset.fileName || ''} ${asset.uri || ''}`.toLowerCase();
  if (sourceName.includes('.png')) return 'image/png';
  if (sourceName.includes('.webp')) return 'image/webp';
  if (sourceName.includes('.gif')) return 'image/gif';
  if (sourceName.includes('.heic')) return 'image/heic';
  if (sourceName.includes('.heif')) return 'image/heif';
  return 'image/jpeg';
}

function normalizePickedImageFileName(asset: ImagePicker.ImagePickerAsset, mimeType: string) {
  const existingName = String(asset.fileName || '').trim();
  if (existingName) {
    return existingName;
  }
  const extensionByMime: Record<string, string> = {
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return `community-photo-${Date.now()}.${extensionByMime[mimeType] || 'jpg'}`;
}

function CommunityVideoPlayer({ videoUrl }: { videoUrl?: string }) {
  const normalizedUrl = String(videoUrl || '').trim();
  const playableUrl = normalizeExternalVideoEmbedUrl(normalizedUrl);
  const thumbnailUrl = getYouTubeThumbnailUrl(normalizedUrl);
  const providerLabel = getVideoProviderLabel(normalizedUrl);
  const [isInlinePlaying, setIsInlinePlaying] = useState(false);

  if (!normalizedUrl) {
    return (
      <View style={styles.videoPlaceholder}>
        <View style={styles.videoPlayBtn}>
          <View style={styles.playTriangle} />
        </View>
      </View>
    );
  }

  if (Platform.OS === 'web' && isDirectVideoUrl(normalizedUrl)) {
    return React.createElement('video', {
      src: normalizedUrl,
      controls: true,
      playsInline: true,
      preload: 'metadata',
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: NAVY,
      },
    });
  }

  if (!isDirectVideoUrl(normalizedUrl)) {
    if (isInlinePlaying) {
      return (
        <CrossPlatformWebView
          source={{ html: buildCommunityVideoHtml(playableUrl) }}
          style={StyleSheet.absoluteFill}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          startInLoadingState
        />
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.externalVideoPreview}
        onPress={() => setIsInlinePlaying(true)}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.externalVideoThumb} resizeMode="cover" />
        ) : null}
        <View style={styles.externalVideoShade} />
        <View style={styles.externalVideoPlayBtn}>
          <View style={styles.playTriangle} />
        </View>
        <View style={styles.externalVideoProviderPill}>
          <Text style={styles.externalVideoProviderText}>{providerLabel}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <CrossPlatformWebView
      source={{ html: buildCommunityVideoHtml(playableUrl) }}
      style={StyleSheet.absoluteFill}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      scrollEnabled={false}
      setSupportMultipleWindows={false}
      javaScriptCanOpenWindowsAutomatically={false}
      startInLoadingState
    />
  );
}

export default function ClaudeCommunityFeed({
  userTier = 'gold',
  userInitials = 'ME',
  posts = [],
  onPublishPost,
  onToggleCheer,
  onLoadComments,
  onAddComment,
  onScopeChange,
}: ClaudeCommunityFeedProps) {
  const { colors, isDark } = useTheme();

  // Tier normalization
  const normTier = userTier.toLowerCase().replace(/_/g, '').replace(/\s+/g, '');
  const cleanTier = normTier.includes('ic') || normTier.includes('inner')
    ? 'ic'
    : normTier.includes('plat')
    ? 'platinum'
    : normTier.includes('silver')
    ? 'silver'
    : 'gold';

  const order = ['silver', 'gold', 'platinum', 'ic'];
  const tierNames: Record<string, string> = {
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    ic: 'Inner Circle',
  };
  const tierIndex = Math.max(0, order.indexOf(cleanTier));
  const reachString = order
    .slice(0, tierIndex + 1)
    .map((k) => tierNames[k])
    .join(' + ');

  const [scope, setScope] = useState<'auto' | 'tier' | 'all'>('auto');
  const [feed, setFeed] = useState<CommunityPost[]>(posts);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(null);
  const [sendingCommentFor, setSendingCommentFor] = useState<string | null>(null);

  React.useEffect(() => {
    setFeed(posts);
  }, [posts]);

  // New Post Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postKind, setPostKind] = useState<'Text only' | 'Photo' | 'YouTube link'>('Photo');
  const [postDraft, setPostDraft] = useState('');
  const [postScope, setPostScope] = useState<'auto' | 'tier' | 'all'>('auto');
  const [attachedPhoto, setAttachedPhoto] = useState<{
    uri: string;
    base64: string;
    mimeType: string;
    fileName: string;
  } | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Feed scope titles matching lines 3398-3407
  const feedScopeTitle =
    scope === 'auto'
      ? `Your circle · ${feed.length} ${feed.length === 1 ? 'post' : 'posts'}`
      : scope === 'all'
      ? `Everyone on Victory Fitness · ${feed.length} ${feed.length === 1 ? 'post' : 'posts'}`
      : cleanTier === 'silver'
      ? `Silver members · ${feed.length} ${feed.length === 1 ? 'post' : 'posts'}`
      : cleanTier === 'gold'
      ? `Gold and Silver members · ${feed.length} ${feed.length === 1 ? 'post' : 'posts'}`
      : cleanTier === 'platinum'
      ? `Platinum, Gold and Silver · ${feed.length} ${feed.length === 1 ? 'post' : 'posts'}`
      : `Every tier, including Inner Circle · ${feed.length} ${feed.length === 1 ? 'post' : 'posts'}`;

  const feedScopeNote =
    scope === 'auto'
      ? 'Showing posts returned by your backend community circle.'
      : scope === 'all'
      ? 'Showing backend posts available to your account.'
      : 'Showing backend posts for your selected tier audience.';

  // Post audience descriptions matching lines 3396-3397
  const postAudience =
    postScope === 'auto'
      ? 'Your duo and the people you train with'
      : postScope === 'all'
      ? 'Everyone on Victory Fitness'
      : 'Your tier and the tiers below it';

  const postAudienceShort =
    postScope === 'auto' ? 'my circle' : postScope === 'all' ? 'everyone' : 'my tier';

  const handleCheer = async (postId: string) => {
    setFeed((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextCheered = !p.hasCheered;
          const nextCount = Math.max(0, nextCheered ? p.cheerCount + 1 : p.cheerCount - 1);
          return {
            ...p,
            hasCheered: nextCheered,
            cheerCount: nextCount,
            react: `${nextCount} cheers · ${Math.max(0, Number(p.commentCount || 0))} comments`,
          };
        }
        return p;
      })
    );
    try {
      await onToggleCheer?.(postId);
    } catch {
      setFeed((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const nextCheered = !p.hasCheered;
          const nextCount = nextCheered ? p.cheerCount + 1 : Math.max(0, p.cheerCount - 1);
          return {
            ...p,
            hasCheered: nextCheered,
            cheerCount: nextCount,
            react: `${nextCount} cheers · ${Math.max(0, Number((p.react.match(/(\d+)\s+comments/) || [])[1] || 0))} comments`,
          };
        })
      );
      Alert.alert('Could not update cheer', 'Please try again.');
    }
  };

  const handleToggleComments = async (postId: string) => {
    const isOpening = openCommentsFor !== postId;
    setOpenCommentsFor(isOpening ? postId : null);
    if (!isOpening) return;

    const currentPost = feed.find((p) => p.id === postId);
    if (currentPost?.comments && currentPost.comments.length >= Math.max(0, Number(currentPost.commentCount || 0))) {
      return;
    }

    setLoadingCommentsFor(postId);
    try {
      const comments = await onLoadComments?.(postId);
      if (comments) {
        setFeed((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments,
                  commentCount: comments.length,
                  react: `${p.cheerCount} cheers · ${comments.length} comments`,
                }
              : p
          )
        );
      }
    } catch {
      Alert.alert('Could not load comments', 'Please try again.');
    } finally {
      setLoadingCommentsFor(null);
    }
  };

  const handleSubmitComment = async (postId: string) => {
    const content = String(commentDrafts[postId] || '').trim();
    if (!content) return;
    setSendingCommentFor(postId);
    try {
      const created = await onAddComment?.(postId, content);
      if (created) {
        setFeed((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const comments = [...(p.comments || []), created];
            return {
              ...p,
              comments,
              commentCount: Math.max(Number(p.commentCount || 0) + 1, comments.length),
              react: `${p.cheerCount} cheers · ${Math.max(Number(p.commentCount || 0) + 1, comments.length)} comments`,
            };
          })
        );
      }
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    } catch (error: any) {
      Alert.alert('Comment failed', error?.message || 'Please try again.');
    } finally {
      setSendingCommentFor(null);
    }
  };

  const handlePublishPost = async () => {
    const hasActivePhoto = postKind === 'Photo' && Boolean(attachedPhoto?.base64);
    const hasActiveVideo = postKind === 'YouTube link' && Boolean(youtubeUrl.trim());

    if (!postDraft.trim() && !hasActivePhoto && !hasActiveVideo) {
      Alert.alert('Empty Post', 'Please write something to share with your circle.');
      return;
    }
    setIsPublishing(true);
    try {
      await onPublishPost?.({
        content: postDraft.trim(),
        kind: hasActivePhoto || hasActiveVideo ? postKind : 'Text only',
        audience: postScope,
        imageBase64: hasActivePhoto ? attachedPhoto?.base64 : undefined,
        imageMimeType: hasActivePhoto ? attachedPhoto?.mimeType : undefined,
        imageFileName: hasActivePhoto ? attachedPhoto?.fileName : undefined,
        externalVideoUrl: hasActiveVideo ? youtubeUrl.trim() : undefined,
      });
      setPostDraft('');
      setAttachedPhoto(null);
      setYoutubeUrl('');
      setScope(postScope);
      setShowPostModal(false);
      Alert.alert('Posted', `Your post has been published to ${postAudienceShort}.`);
    } catch (error: any) {
      Alert.alert('Post failed', error?.message || 'Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const selectPhoto = async (source: 'camera' | 'library') => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', source === 'camera' ? 'Please allow camera access to take a photo.' : 'Please allow photo library access to upload a photo.');
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.78,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.78,
            base64: true,
          });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const base64 = asset.base64;
      if (!base64) return;
      const mimeType = normalizePickedImageMimeType(asset);
      setAttachedPhoto({
        uri: asset.uri,
        base64,
        mimeType,
        fileName: normalizePickedImageFileName(asset, mimeType),
      });
      setPostKind('Photo');
    } catch (error: any) {
      Alert.alert('Photo failed', error?.message || 'Please try again.');
    }
  };

  const selectPostKind = (kind: CommunityPostDraft['kind']) => {
    setPostKind(kind);
    if (kind !== 'Photo') {
      setAttachedPhoto(null);
    }
    if (kind !== 'YouTube link') {
      setYoutubeUrl('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Scope Card matching lines 917-924 */}
      <View
        style={[
          styles.scopeCard,
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
      >
        <View style={styles.scopeHeader}>
          <Text style={[styles.scopeTitle, { color: isDark ? IVORY : NAVY }]}>
            {feedScopeTitle}
          </Text>
          <Text
            style={[
              styles.scopeSub,
              { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
            ]}
          >
            {feedScopeNote}
          </Text>
        </View>

        {/* Scope Chips matching lines 3379-3394 */}
        <View style={styles.scopeChipsRow}>
          {[
            { id: 'auto' as const, label: 'My circle' },
            { id: 'tier' as const, label: reachString },
            { id: 'all' as const, label: 'Everyone' },
          ].map((c) => {
            const on = scope === c.id;
            return (
              <TouchableOpacity
                key={`scope-${c.id}`}
                style={[
                  styles.scopeChip,
                  on ? styles.scopeChipActive : styles.scopeChipInactive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setScope(c.id);
                  onScopeChange?.(c.id);
                }}
              >
                <Text
                  style={[
                    styles.scopeChipText,
                    on ? styles.scopeChipTextActive : styles.scopeChipTextInactive,
                  ]}
                  numberOfLines={1}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Quick Composer Trigger matching lines 925-929 */}
      <TouchableOpacity
        style={[
          styles.composerCard,
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
        onPress={() => setShowPostModal(true)}
      >
        <View style={styles.composerAvatar}>
          <Text style={styles.composerAvatarText}>{userInitials}</Text>
        </View>
        <Text style={styles.composerPlaceholder}>Share something with your circle…</Text>
        <Text style={styles.composerPostLink}>Post</Text>
      </TouchableOpacity>

      {/* Feed Posts matching lines 931-960 */}
      <View style={styles.postsList}>
        {feed.length === 0 && (
          <View style={[styles.emptyPostCard, { backgroundColor: isDark ? NAVY : '#FFFFFF' }]}>
            <Text style={[styles.emptyPostTitle, { color: isDark ? IVORY : NAVY }]}>Your circle is quiet right now</Text>
            <Text style={styles.emptyPostBody}>Share a win, a question, or a quick training note to start the conversation.</Text>
          </View>
        )}
        {feed.map((p) => (
          <View
            key={p.id}
            style={[
              styles.postCard,
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
          >
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}>
                <Text style={styles.postAvatarText}>{p.i}</Text>
              </View>

              <View style={styles.postMetaCol}>
                <View style={styles.postNameRow}>
                  <Text style={[styles.postAuthor, { color: isDark ? IVORY : NAVY }]}>{p.name}</Text>
                  <Text style={styles.postTierBadge}>{p.tier}</Text>
                </View>
                <Text style={styles.postTime}>{p.when}</Text>
              </View>
            </View>

            <Text style={[styles.postBody, { color: isDark ? 'rgba(247, 243, 238, 0.85)' : '#1F2937' }]}>
              {p.body}
            </Text>

            {/* Photo attachment if present matching lines 938-942 */}
            {p.hasPhoto && (
              <View style={styles.photoContainer}>
                {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.photoImage} resizeMode="cover" /> : null}
                <Text style={styles.photoTag}>{p.photoNote || 'workout logged'}</Text>
              </View>
            )}

            {/* Video attachment if present matching lines 943-953 */}
            {p.hasVideo && (
              <View style={styles.videoContainer}>
                <View style={styles.videoPlayerBox}>
                  <CommunityVideoPlayer videoUrl={p.videoUrl} />
                </View>
                <View style={styles.videoMetaWrap}>
                  <Text style={styles.videoTitleText}>{p.videoTitle || `${getVideoProviderLabel(p.videoUrl)} video`}</Text>
                  <Text style={styles.videoMetaText} numberOfLines={1}>
                    {p.videoMeta || `${getVideoProviderLabel(p.videoUrl)} link`}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.postFooter}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => void handleToggleComments(p.id)}>
                <Text style={styles.postReactText}>{p.react}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleCheer(p.id)}>
                <Text style={[styles.cheerBtnText, p.hasCheered && styles.cheerBtnTextActive]}>
                  {p.hasCheered ? 'Cheered ✓' : 'Cheer'}
                </Text>
              </TouchableOpacity>
            </View>

            {openCommentsFor === p.id && (
              <View style={styles.commentsPanel}>
                {loadingCommentsFor === p.id ? (
                  <Text style={styles.commentMuted}>Loading comments...</Text>
                ) : (p.comments || []).length > 0 ? (
                  (p.comments || []).map((comment) => (
                    <View key={comment.id} style={styles.commentRow}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>{comment.authorInitials}</Text>
                      </View>
                      <View style={styles.commentBody}>
                        <View style={styles.commentMetaRow}>
                          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                          <Text style={styles.commentWhen}>{comment.when}</Text>
                        </View>
                        <Text style={styles.commentText}>{comment.content}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.commentMuted}>No comments yet.</Text>
                )}

                <View style={styles.commentComposer}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Write a comment..."
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    value={commentDrafts[p.id] || ''}
                    onChangeText={(text) => setCommentDrafts((prev) => ({ ...prev, [p.id]: text }))}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.commentSendBtn,
                      (!String(commentDrafts[p.id] || '').trim() || sendingCommentFor === p.id) && styles.commentSendBtnDisabled,
                    ]}
                    activeOpacity={0.82}
                    disabled={!String(commentDrafts[p.id] || '').trim() || sendingCommentFor === p.id}
                    onPress={() => void handleSubmitComment(p.id)}
                  >
                    <Text style={styles.commentSendText}>{sendingCommentFor === p.id ? '...' : 'Send'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Moderation Footnote matching line 961 */}
      <Text style={[styles.moderationFootnote, { color: colors.textMuted }]}>
        Posts are pre-checked before they appear. Report anything off and a human reviews it within 4 hours.
      </Text>

      {/* NEW POST MODAL matching lines 1850-1901 of VF Prototype.dc.html */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPostModal(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalKicker}>NEW POST</Text>
              <TouchableOpacity
                onPress={() => setShowPostModal(false)}
                activeOpacity={0.7}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* User row */}
            <View style={styles.modalUserRow}>
              <View style={styles.modalAvatarCircle}>
                <Text style={styles.modalAvatarText}>{userInitials}</Text>
              </View>
              <View style={styles.modalUserCol}>
                <Text style={styles.modalUserName}>You</Text>
                <Text style={styles.modalUserAudience}>{postAudience}</Text>
              </View>
            </View>

            {/* Input area */}
            <View style={styles.modalInputBox}>
              <TextInput
                style={styles.modalTextInput}
                placeholder="What happened today?"
                placeholderTextColor="rgba(247,243,238,0.4)"
                multiline
                numberOfLines={4}
                value={postDraft}
                onChangeText={setPostDraft}
              />
            </View>

            {/* ADD SOMETHING Kinds */}
            <Text style={styles.modalSectionLabel}>ADD SOMETHING</Text>
            <View style={styles.postKindsRow}>
              {(['Text only', 'Photo', 'YouTube link'] as const).map((kind) => {
                const on = postKind === kind;
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[
                      styles.kindChip,
                      on ? styles.kindChipActive : styles.kindChipInactive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => selectPostKind(kind)}
                  >
                    <Text
                      style={[
                        styles.kindChipText,
                        on ? styles.kindChipTextActive : styles.kindChipTextInactive,
                      ]}
                    >
                      {kind}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Photo slot if Photo selected */}
            {postKind === 'Photo' && (
              <View style={styles.photoSlotCard}>
                <View style={styles.photoPlaceholderBox}>
                  <Text style={styles.photoPlaceholderText}>
                    {attachedPhoto ? 'photo ready to publish' : 'your photo appears here'}
                  </Text>
                  {attachedPhoto ? <Image source={{ uri: attachedPhoto.uri }} style={styles.photoPreviewImage} resizeMode="cover" /> : null}
                </View>
                <View style={styles.photoActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.photoPrimaryBtn}
                    activeOpacity={0.85}
                    onPress={() => void selectPhoto('camera')}
                  >
                    <Text style={styles.photoPrimaryBtnText}>Take a photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoOutlineBtn}
                    activeOpacity={0.8}
                    onPress={() => void selectPhoto('library')}
                  >
                    <Text style={styles.photoOutlineBtnText}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Video slot if YouTube link selected */}
            {postKind === 'YouTube link' && (
              <View style={styles.videoSlotCard}>
                <Text style={styles.videoSlotKicker}>VIDEO LINK</Text>
                <View style={styles.videoUrlInputWrap}>
                  <TextInput
                    style={styles.videoUrlInput}
                    placeholder="Paste YouTube or Vimeo link..."
                    placeholderTextColor="rgba(247,243,238,0.38)"
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {youtubeUrl.trim() ? (
                  <View style={styles.videoPreviewSnippet}>
                    <View style={styles.videoMiniThumb}>
                      {getYouTubeThumbnailUrl(youtubeUrl) ? (
                        <Image source={{ uri: getYouTubeThumbnailUrl(youtubeUrl) }} style={styles.videoMiniThumbImage} resizeMode="cover" />
                      ) : null}
                      <View style={styles.videoMiniThumbShade} />
                      <View style={styles.miniPlayCircle}>
                        <View style={styles.miniPlayTriangle} />
                      </View>
                    </View>
                    <View style={styles.videoMiniInfo}>
                      <Text style={styles.videoMiniTitle}>{getVideoProviderLabel(youtubeUrl)} preview ready</Text>
                      <Text style={styles.videoMiniSub} numberOfLines={1}>Tap post to share this link</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* WHO SEES IT Section */}
            <Text style={styles.modalSectionLabel}>WHO SEES IT</Text>
            <View style={styles.scopeChipsRow}>
              {[
                { id: 'auto' as const, label: 'My circle' },
                { id: 'tier' as const, label: reachString },
                { id: 'all' as const, label: 'Everyone' },
              ].map((c) => {
                const on = postScope === c.id;
                return (
                  <TouchableOpacity
                    key={`modal-scope-${c.id}`}
                    style={[
                      styles.scopeChip,
                      on ? styles.scopeChipActive : styles.scopeChipInactive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setPostScope(c.id)}
                  >
                    <Text
                      style={[
                        styles.scopeChipText,
                        on ? styles.scopeChipTextActive : styles.scopeChipTextInactive,
                      ]}
                      numberOfLines={1}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Submit Post Button */}
            <TouchableOpacity
              style={styles.modalSubmitBtn}
              activeOpacity={0.85}
              onPress={handlePublishPost}
              disabled={isPublishing}
            >
              <Text style={styles.modalSubmitBtnText}>{isPublishing ? 'Posting...' : `Post to ${postAudienceShort}`}</Text>
            </TouchableOpacity>

            <Text style={styles.modalFootnote}>
              Photos and links are checked before they appear. Nothing from your training data is attached unless you add it yourself.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 96,
  },
  scopeCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: NAVY,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  scopeHeader: {
    marginBottom: 12,
  },
  scopeTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
  },
  scopeSub: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  scopeChipsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  scopeChip: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  scopeChipActive: {
    backgroundColor: GOLD,
  },
  scopeChipInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
  },
  scopeChipText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
  },
  scopeChipTextActive: {
    fontWeight: '700',
    color: '#0D0D0D',
  },
  scopeChipTextInactive: {
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  composerCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  composerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  composerPlaceholder: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  composerPostLink: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
  postsList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyPostCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 16,
  },
  emptyPostTitle: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  emptyPostBody: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 5,
  },
  postCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
    color: GOLD,
  },
  postMetaCol: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  postAuthor: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  postTierBadge: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: COPPER,
  },
  postTime: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 2,
  },
  postBody: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 22,
  },
  photoContainer: {
    marginTop: 12,
    height: 168,
    borderRadius: 14,
    backgroundColor: '#0a2439',
    justifyContent: 'flex-end',
    padding: 12,
    overflow: 'hidden',
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  photoTag: {
    alignSelf: 'flex-start',
    fontFamily: DMSANS,
    fontSize: 10.5,
    letterSpacing: 0.9,
    color: 'rgba(247, 243, 238, 0.65)',
    backgroundColor: 'rgba(13, 13, 13, 0.6)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoContainer: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 36, 57, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.08)',
  },
  videoPlayerBox: {
    aspectRatio: 16 / 9,
    width: '100%',
    backgroundColor: '#0D2B45',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  externalVideoPreview: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#081B2B',
  },
  externalVideoThumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  externalVideoShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 12, 18, 0.24)',
  },
  externalVideoPlayBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  externalVideoProviderPill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(13, 13, 13, 0.72)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  externalVideoProviderText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: IVORY,
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayBtn: {
    width: 52,
    height: 38,
    borderRadius: 10,
    backgroundColor: COPPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  videoMetaWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  videoTitleText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
    color: IVORY,
  },
  videoMetaText: {
    fontFamily: MONO,
    fontSize: 11,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 3,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.12)',
  },
  postReactText: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  cheerBtnText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
  cheerBtnTextActive: {
    color: '#1A7A4A',
  },
  commentsPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.12)',
    gap: 10,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 9,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    color: GOLD,
  },
  commentBody: {
    flex: 1,
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  commentAuthor: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
    color: IVORY,
  },
  commentWhen: {
    fontFamily: MONO,
    fontSize: 10,
    color: 'rgba(247, 243, 238, 0.42)',
  },
  commentText: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.82)',
  },
  commentMuted: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.48)',
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: 'rgba(13, 13, 13, 0.24)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
    padding: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 34,
    maxHeight: 86,
    fontFamily: INTER,
    fontSize: 13,
    color: IVORY,
    paddingVertical: 6,
    textAlignVertical: 'top',
  },
  commentSendBtn: {
    minWidth: 56,
    height: 34,
    borderRadius: 9,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  commentSendBtnDisabled: {
    opacity: 0.45,
  },
  commentSendText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  moderationFootnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 17,
    marginHorizontal: 20,
    marginTop: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 54,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: COPPER,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontFamily: DMSANS,
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  modalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 14,
  },
  modalAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 99,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  modalUserCol: {
    flex: 1,
  },
  modalUserName: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  modalUserAudience: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  modalInputBox: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    marginBottom: 14,
  },
  modalTextInput: {
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 23,
    color: IVORY,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalSectionLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  postKindsRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 14,
  },
  kindChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  kindChipActive: {
    backgroundColor: GOLD,
  },
  kindChipInactive: {
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    backgroundColor: 'transparent',
  },
  kindChipText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
  },
  kindChipTextActive: {
    fontWeight: '700',
    color: '#0D0D0D',
  },
  kindChipTextInactive: {
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  photoSlotCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 16,
    marginBottom: 16,
  },
  photoPlaceholderBox: {
    height: 150,
    borderRadius: 12,
    backgroundColor: '#0a2439',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  photoPreviewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  photoPlaceholderText: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  photoActionButtonsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  photoPrimaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPrimaryBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  photoOutlineBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOutlineBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
  videoSlotCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 16,
    marginBottom: 16,
  },
  videoSlotKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: 'rgba(247, 243, 238, 0.45)',
    marginBottom: 8,
  },
  videoSlotUrl: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '500',
    color: IVORY,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.22)',
    marginBottom: 12,
  },
  videoUrlInputWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.22)',
    marginBottom: 12,
  },
  videoUrlInput: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '500',
    color: IVORY,
    paddingVertical: 0,
    paddingBottom: 10,
  },
  videoPreviewSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.055)',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.08)',
    borderRadius: 12,
    padding: 9,
  },
  videoMiniThumb: {
    width: 72,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#081B2B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  videoMiniThumbImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  videoMiniThumbShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 12, 18, 0.22)',
  },
  miniPlayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 5,
    borderTopColor: 'transparent',
    borderBottomWidth: 5,
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  videoMiniInfo: {
    flex: 1,
  },
  videoMiniTitle: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '600',
    color: IVORY,
  },
  videoMiniSub: {
    fontFamily: MONO,
    fontSize: 11,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 2,
  },
  modalSubmitBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  modalSubmitBtnText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  modalFootnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.42)',
  },
});
