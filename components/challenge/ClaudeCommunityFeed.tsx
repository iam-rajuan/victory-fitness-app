import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';

interface CommunityPost {
  id: string;
  name: string;
  tier: string;
  i: string; // initials
  when: string;
  body: string;
  react: string;
  cheerCount: number;
  hasCheered?: boolean;
}

interface ClaudeCommunityFeedProps {
  userTier?: string;
  userInitials?: string;
  onOpenCreatePost?: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    name: 'Marcus Vance',
    tier: 'PLATINUM',
    i: 'MV',
    when: '24m ago · Upper Body session',
    body: 'Hit 40kg dumbbell bench press for 4x8 today. The coach feedback suggested pinning scapulae harder before un-racking, and shoulder stability was night and day.',
    react: '14 cheers · 3 comments',
    cheerCount: 14,
  },
  {
    id: 'post-2',
    name: 'Elena Rostova',
    tier: 'GOLD',
    i: 'ER',
    when: '1h ago · Week plan prep',
    body: 'Prepped the Sunday roasted salmon and sweet potato mash from the week plan. 112g of protein hit seamlessly before 20:00.',
    react: '22 cheers · 5 comments',
    cheerCount: 22,
  },
  {
    id: 'post-3',
    name: 'David Adeleke',
    tier: 'INNER CIRCLE',
    i: 'DA',
    when: '3h ago · 21-Day Warrior',
    body: 'Day 18 complete. When fatigue set in at 21:00, the habit trigger did the heavy lifting. Never underestimate setting your gym kit out before work.',
    react: '38 cheers · 8 comments',
    cheerCount: 38,
  },
];

export default function ClaudeCommunityFeed({
  userTier = 'GOLD',
  userInitials = 'ME',
}: ClaudeCommunityFeedProps) {
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);
  const [scope, setScope] = useState<'GLOBAL' | 'INNER_CIRCLE' | 'COHORT'>('GLOBAL');
  const [postDraft, setPostDraft] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleCheer = (postId: string) => {
    setPosts((prev) =>
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
  };

  const handleCreatePost = () => {
    if (!postDraft.trim()) return;
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      name: 'You',
      tier: userTier.toUpperCase(),
      i: userInitials,
      when: 'Just now',
      body: postDraft.trim(),
      react: '1 cheer · 0 comments',
      cheerCount: 1,
      hasCheered: true,
    };
    setPosts([newPost, ...posts]);
    setPostDraft('');
    setIsPosting(false);
    Alert.alert('Posted', 'Your share was submitted and posted to your circle.');
  };

  return (
    <View style={styles.container}>
      {/* Scope Filter matching lines 917-924 */}
      <View style={styles.scopeCard}>
        <View style={styles.scopeHeader}>
          <Text style={styles.scopeTitle}>
            {scope === 'GLOBAL'
              ? 'Victory Community'
              : scope === 'INNER_CIRCLE'
              ? 'Inner Circle Lounge'
              : 'Cohort Feed'}
          </Text>
          <Text style={styles.scopeSub}>
            {scope === 'GLOBAL'
              ? 'All active members training across tiers'
              : scope === 'INNER_CIRCLE'
              ? 'Exclusive room for Inner Circle members'
              : 'Discussions from your active challenge group'}
          </Text>
        </View>

        <View style={styles.scopeChipsRow}>
          <TouchableOpacity
            style={[styles.scopeChip, scope === 'GLOBAL' && styles.scopeChipActive]}
            activeOpacity={0.8}
            onPress={() => setScope('GLOBAL')}
          >
            <Text style={[styles.scopeChipText, scope === 'GLOBAL' && styles.scopeChipTextActive]}>
              GLOBAL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeChip, scope === 'INNER_CIRCLE' && styles.scopeChipActive]}
            activeOpacity={0.8}
            onPress={() => {
              if (userTier.toLowerCase() !== 'inner_circle' && userTier.toLowerCase() !== 'inner circle') {
                Alert.alert('Inner Circle Lounge', 'Exclusive feed reserved for Inner Circle members.');
                return;
              }
              setScope('INNER_CIRCLE');
            }}
          >
            <Text style={[styles.scopeChipText, scope === 'INNER_CIRCLE' && styles.scopeChipTextActive]}>
              INNER CIRCLE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scopeChip, scope === 'COHORT' && styles.scopeChipActive]}
            activeOpacity={0.8}
            onPress={() => setScope('COHORT')}
          >
            <Text style={[styles.scopeChipText, scope === 'COHORT' && styles.scopeChipTextActive]}>
              MY COHORT
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Composer Card matching lines 925-929 */}
      <View style={styles.composerCard}>
        <View style={styles.composerAvatar}>
          <Text style={styles.composerAvatarText}>{userInitials}</Text>
        </View>

        <TextInput
          style={styles.composerInput}
          placeholder="Share something with your circle…"
          placeholderTextColor="rgba(247,243,238,0.5)"
          value={postDraft}
          onChangeText={setPostDraft}
        />

        <TouchableOpacity
          style={styles.postSubmitBtn}
          activeOpacity={0.8}
          onPress={handleCreatePost}
        >
          <Text style={styles.postSubmitBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Feed Posts matching lines 931-960 */}
      <View style={styles.postsList}>
        {posts.map((p) => (
          <View key={p.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}>
                <Text style={styles.postAvatarText}>{p.i}</Text>
              </View>

              <View style={styles.postMetaCol}>
                <View style={styles.postNameRow}>
                  <Text style={styles.postAuthor}>{p.name}</Text>
                  <Text style={styles.postTierBadge}>{p.tier}</Text>
                </View>
                <Text style={styles.postTime}>{p.when}</Text>
              </View>
            </View>

            <Text style={styles.postBody}>{p.body}</Text>

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
      <Text style={styles.moderationFootnote}>
        Posts are pre-checked before they appear. Report anything off and a human reviews it within 4 hours.
      </Text>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
  },
  scopeChipActive: {
    backgroundColor: GOLD,
  },
  scopeChipText: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(247, 243, 238, 0.65)',
  },
  scopeChipTextActive: {
    color: '#0D0D0D',
  },
  composerCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
  composerInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14,
    color: IVORY,
  },
  postSubmitBtn: {
    paddingHorizontal: 8,
  },
  postSubmitBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
  },
  postsList: {
    paddingHorizontal: 20,
    gap: 10,
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
    color: 'rgba(247, 243, 238, 0.85)',
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
    color: 'rgba(247, 243, 238, 0.4)',
    marginHorizontal: 20,
    marginTop: 12,
  },
});
