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
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface CommunityPost {
  id: string;
  name: string;
  tier: string;
  i: string; // initials
  when: string;
  body: string;
  react: string;
  cheerCount: number;
  hasCheered?: boolean;
  hasPhoto?: boolean;
  photoNote?: string;
  hasVideo?: boolean;
  videoTitle?: string;
  videoMeta?: string;
}

interface ClaudeCommunityFeedProps {
  userTier?: string;
  userInitials?: string;
  posts?: CommunityPost[];
  onPublishPost?: (content: string, kind: 'Text only' | 'Photo' | 'YouTube link') => Promise<void>;
  onToggleCheer?: (postId: string) => Promise<void>;
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

export default function ClaudeCommunityFeed({
  userTier = 'gold',
  userInitials = 'ME',
  posts = [],
  onPublishPost,
  onToggleCheer,
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

  React.useEffect(() => {
    setFeed(posts);
  }, [posts]);

  // New Post Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postKind, setPostKind] = useState<'Text only' | 'Photo' | 'YouTube link'>('Photo');
  const [postDraft, setPostDraft] = useState('');
  const [postScope, setPostScope] = useState<'auto' | 'tier' | 'all'>('auto');
  const [hasAttachedPhoto, setHasAttachedPhoto] = useState(false);

  // Feed scope titles matching lines 3398-3407
  const feedScopeTitle =
    scope === 'auto'
      ? 'Your circle · 9 people'
      : scope === 'all'
      ? 'Everyone on Victory Fitness'
      : cleanTier === 'silver'
      ? 'Silver members'
      : cleanTier === 'gold'
      ? 'Gold and Silver members'
      : cleanTier === 'platinum'
      ? 'Platinum, Gold and Silver'
      : 'Every tier, including Inner Circle';

  const feedScopeNote =
    scope === 'auto'
      ? '6 of 9 trained today. You are one of them.'
      : scope === 'all'
      ? 'Busier, and nobody is hidden from you.'
      : 'Your tier and everything below it.';

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
          const nextCount = nextCheered ? p.cheerCount + 1 : p.cheerCount - 1;
          return {
            ...p,
            hasCheered: nextCheered,
            cheerCount: nextCount,
            react: `${nextCount} cheers · 3 comments`,
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

  const handlePublishPost = async () => {
    if (!postDraft.trim() && !hasAttachedPhoto && postKind !== 'YouTube link') {
      Alert.alert('Empty Post', 'Please write something to share with your circle.');
      return;
    }
    try {
      await onPublishPost?.(postDraft.trim(), postKind);
      setPostDraft('');
      setHasAttachedPhoto(false);
      setShowPostModal(false);
      Alert.alert('Posted', `Your post has been published to ${postAudienceShort}.`);
    } catch (error: any) {
      Alert.alert('Post failed', error?.message || 'Please try again.');
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
                onPress={() => setScope(c.id)}
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
            <Text style={[styles.emptyPostTitle, { color: isDark ? IVORY : NAVY }]}>No community posts yet</Text>
            <Text style={styles.emptyPostBody}>Posts from the backend community feed will appear here.</Text>
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
                <Text style={styles.photoTag}>{p.photoNote || 'workout logged'}</Text>
              </View>
            )}

            {/* Video attachment if present matching lines 943-953 */}
            {p.hasVideo && (
              <View style={styles.videoContainer}>
                <View style={styles.videoPlayerBox}>
                  <View style={styles.videoPlayBtn}>
                    <View style={styles.playTriangle} />
                  </View>
                </View>
                <View style={styles.videoMetaWrap}>
                  <Text style={styles.videoTitleText}>{p.videoTitle}</Text>
                  <Text style={styles.videoMetaText}>{p.videoMeta}</Text>
                </View>
              </View>
            )}

            <View style={styles.postFooter}>
              <Text style={styles.postReactText}>{p.react}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleCheer(p.id)}>
                <Text style={[styles.cheerBtnText, p.hasCheered && styles.cheerBtnTextActive]}>
                  {p.hasCheered ? 'Cheered ✓' : 'Cheer'}
                </Text>
              </TouchableOpacity>
            </View>
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
                    onPress={() => setPostKind(kind)}
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
                    {hasAttachedPhoto ? 'photo ready to publish' : 'your photo appears here'}
                  </Text>
                </View>
                <View style={styles.photoActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.photoPrimaryBtn}
                    activeOpacity={0.85}
                    onPress={() => setHasAttachedPhoto(true)}
                  >
                    <Text style={styles.photoPrimaryBtnText}>Take a photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoOutlineBtn}
                    activeOpacity={0.8}
                    onPress={() => setHasAttachedPhoto(true)}
                  >
                    <Text style={styles.photoOutlineBtnText}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Video slot if YouTube link selected */}
            {postKind === 'YouTube link' && (
              <View style={styles.videoSlotCard}>
                <Text style={styles.videoSlotKicker}>YOUTUBE LINK</Text>
                <Text style={styles.videoSlotUrl}>youtu.be/dQw4w9WgXcQ</Text>
                <View style={styles.videoPreviewSnippet}>
                  <View style={styles.videoMiniThumb}>
                    <View style={styles.miniPlayTriangle} />
                  </View>
                  <View style={styles.videoMiniInfo}>
                    <Text style={styles.videoMiniTitle}>Preview loaded</Text>
                    <Text style={styles.videoMiniSub}>Plays inside the feed · 4:12</Text>
                  </View>
                </View>
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
            >
              <Text style={styles.modalSubmitBtnText}>{`Post to ${postAudienceShort}`}</Text>
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
    backgroundColor: '#0a2439',
  },
  videoPlayerBox: {
    height: 150,
    backgroundColor: '#0D2B45',
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
    borderLeftColor: IVORY,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  videoMetaWrap: {
    padding: 12,
  },
  videoTitleText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
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
  videoPreviewSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderRadius: 12,
    padding: 11,
  },
  videoMiniThumb: {
    width: 54,
    height: 38,
    borderRadius: 8,
    backgroundColor: COPPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderLeftColor: IVORY,
    borderTopWidth: 7,
    borderTopColor: 'transparent',
    borderBottomWidth: 7,
    borderBottomColor: 'transparent',
    marginLeft: 3,
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
