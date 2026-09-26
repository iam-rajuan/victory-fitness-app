import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest, fetchCurrentUser } from '../../lib/api';
import { fetchChallengeOverviewData } from '../../lib/screenData';
import ClaudeChallengeTabs, { ChallengeTabType } from '../../components/challenge/ClaudeChallengeTabs';
import ClaudeActiveChallengeBanner from '../../components/challenge/ClaudeActiveChallengeBanner';
import ClaudeChallengeDirectory, { ChallengeItem } from '../../components/challenge/ClaudeChallengeDirectory';
import ClaudeChallengeDetailModal from '../../components/challenge/ClaudeChallengeDetailModal';
import ClaudeCohortModal from '../../components/challenge/ClaudeCohortModal';
import ClaudeInviteModal from '../../components/challenge/ClaudeInviteModal';
import ClaudeCommunityFeed, { CommunityPost } from '../../components/challenge/ClaudeCommunityFeed';
import { useTheme } from '../../context/ThemeContext';

const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });

type ChallengeOverviewPayload = {
  active_chats?: Array<{
    challenge_id?: string;
    unread_count?: number;
  }>;
  active_challenges?: Array<Record<string, any>>;
  completed_challenges?: Array<Record<string, any>>;
  ready_to_start?: Array<Record<string, any>>;
};

function formatCategory(value: unknown) {
  return String(value || 'Challenge').trim().toUpperCase();
}

function formatPoints(value: unknown) {
  const points = Math.max(0, Number(value || 0));
  return points > 0 ? `${points} pts` : '0 pts';
}

function formatJoined(value: unknown) {
  const joined = Math.max(0, Number(value || 0));
  return `${joined} joined`;
}

function buildChallengeItem(raw: Record<string, any>, status: ChallengeItem['status'], unreadCount = 0): ChallengeItem {
  const challengeId = String(raw.challenge_id || raw.id || '').trim();
  const points = status === 'completed' ? raw.earned_points : raw.points;
  return {
    id: challengeId,
    challengeId,
    n: String(raw.title || 'Untitled challenge').trim(),
    d: Math.max(1, Number(raw.duration_days || raw.total_days || 1)),
    c: formatCategory(raw.type || raw.category),
    p: formatPoints(points),
    joined: formatJoined(raw.participants),
    faces: [],
    desc: String(raw.description || '').trim(),
    why: String(raw.why_it_matters || '').trim(),
    status,
    canStart: Boolean(raw.can_start),
    progress: Math.max(0, Math.min(1, Number(raw.progress || (status === 'completed' ? 1 : 0)))),
    daysLeft: Math.max(0, Number(raw.days_left || 0)),
    unreadCount,
    featured: Boolean(raw.featured),
    currentDayNumber: raw.current_day_number == null ? null : Math.max(1, Number(raw.current_day_number || 1)),
    completedToday: Boolean(raw.completed_today),
    completedTodayAt: String(raw.completed_today_at || ''),
    canCompleteToday: Boolean(raw.can_complete_today),
  };
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || 'VF').slice(0, 2).toUpperCase();
}

function formatRelativeTime(value: unknown) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function mapCommunityPost(raw: Record<string, any>): CommunityPost {
  const likeCount = Math.max(0, Number(raw.like_count || 0));
  const commentCount = Math.max(0, Number(raw.comment_count || 0));
  const videoUrl = String(raw.video_url || '').trim();
  const imageUrl = String(raw.image_url || '').trim();
  const authorName = String(raw.author_name || 'Victory member').trim();
  return {
    id: String(raw.id || ''),
    name: authorName,
    tier: String(raw.author_tier || raw.author_role || 'MEMBER').trim().toUpperCase(),
    i: initialsFromName(authorName),
    when: formatRelativeTime(raw.created_at),
    body: String(raw.content || '').trim(),
    react: `${likeCount} cheers · ${commentCount} comments`,
    cheerCount: likeCount,
    hasCheered: Boolean(raw.viewer_has_liked),
    hasPhoto: Boolean(imageUrl),
    photoNote: imageUrl ? 'photo attached' : undefined,
    hasVideo: Boolean(videoUrl),
    videoTitle: videoUrl ? 'Community video' : undefined,
    videoMeta: videoUrl ? 'Opens from the community feed' : undefined,
  };
}

export default function ChallengeScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();

  const [activeTab, setActiveTab] = useState<ChallengeTabType>('challenges');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const [challengeItems, setChallengeItems] = useState<ChallengeItem[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeItem | null>(null);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [completingChallengeId, setCompletingChallengeId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [userTier, setUserTier] = useState('GOLD');
  const [userName, setUserName] = useState('Member');
  const [userInitials, setUserInitials] = useState('ME');

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (cancelled || !user) return;
        const u = user as any;
        setUserId(String(u.id || u._id || '').trim());
        const tier = (u.tier || u.membership_tier || 'gold').toUpperCase();
        setUserTier(tier);
        if (u.name) {
          setUserName(u.name);
          const parts = u.name.split(' ');
          const inits = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
          setUserInitials(inits.toUpperCase());
        }
      } catch {
        // Fallback silently
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadChallenges = useCallback(async ({ forceRefresh = false } = {}) => {
    setIsLoadingChallenges(true);
    try {
      const overview = (await fetchChallengeOverviewData({ forceRefresh })) as ChallengeOverviewPayload;
      const unreadByChallenge = new Map<string, number>();
      (overview.active_chats || []).forEach((chat) => {
        const id = String(chat.challenge_id || '').trim();
        if (id) unreadByChallenge.set(id, Math.max(0, Number(chat.unread_count || 0)));
      });

      const active = (overview.active_challenges || []).map((item) => {
        const id = String(item.challenge_id || item.id || '').trim();
        return buildChallengeItem(item, 'active', unreadByChallenge.get(id) || 0);
      });
      const ready = (overview.ready_to_start || []).map((item) => buildChallengeItem(item, 'ready'));
      const completed = (overview.completed_challenges || []).map((item) => buildChallengeItem(item, 'completed'));
      const combined = [...active, ...ready, ...completed].filter((item) => item.challengeId);

      setActiveChallenge(active[0] || null);
      setChallengeItems(combined);
    } catch (error: any) {
      setActiveChallenge(null);
      setChallengeItems([]);
      Alert.alert('Failed to load challenges', error?.message || 'Please try again.');
    } finally {
      setIsLoadingChallenges(false);
    }
  }, []);

  const loadCommunityPosts = useCallback(async () => {
    try {
      const response = await apiRequest<{ posts?: Array<Record<string, any>> }>('/community/posts?limit=50');
      setCommunityPosts((response.posts || []).map(mapCommunityPost).filter((post) => post.id));
    } catch {
      setCommunityPosts([]);
    }
  }, []);

  useEffect(() => {
    void loadChallenges();
    void loadCommunityPosts();
  }, [loadChallenges, loadCommunityPosts]);

  const handleSelectChallenge = (c: ChallengeItem) => {
    setSelectedChallenge(c);
    setShowDetailModal(true);
  };

  const handleJoinChallenge = async (c: ChallengeItem) => {
    const challengeId = c.challengeId || c.id;
    if (!challengeId) return;
    setShowDetailModal(false);
    if (c.status === 'active') {
      setSelectedChallenge(c);
      setShowCohortModal(true);
      return;
    }
    if (c.status === 'completed') {
      router.push(`/challenges/${challengeId}` as any);
      return;
    }
    if (c.canStart === false) {
      Alert.alert('Challenge limit reached', 'Finish or leave another active challenge before starting this one.');
      return;
    }
    try {
      await apiRequest(`/challenges/${encodeURIComponent(challengeId)}/start`, { method: 'POST' });
      setSelectedChallenge({ ...c, status: 'active', canStart: false });
      setShowCohortModal(true);
      await loadChallenges({ forceRefresh: true });
    } catch (error: any) {
      Alert.alert('Failed to start challenge', error?.message || 'Please try again.');
    }
  };

  const handleInviteSomeone = () => {
    setShowInviteModal(true);
  };

  const handlePublishCommunityPost = useCallback(async (content: string, kind: 'Text only' | 'Photo' | 'YouTube link') => {
    await apiRequest('/community/posts', {
      method: 'POST',
      body: {
        content: content || (kind === 'Photo' ? 'Shared a training photo.' : 'Shared a community update.'),
      },
    });
    await loadCommunityPosts();
  }, [loadCommunityPosts]);

  const handleToggleCommunityCheer = useCallback(async (postId: string) => {
    await apiRequest(`/community/posts/${encodeURIComponent(postId)}/reactions/toggle`, { method: 'POST' });
  }, []);

  const refreshScreen = useCallback(async () => {
    await Promise.all([
      loadChallenges({ forceRefresh: true }),
      loadCommunityPosts(),
    ]);
  }, [loadChallenges, loadCommunityPosts]);

  const featuredChallenge = useMemo(() => {
    return (
      challengeItems.find((item) => item.featured && (item.status === 'active' || item.status === 'ready')) ||
      activeChallenge ||
      challengeItems.find((item) => item.status === 'ready') ||
      null
    );
  }, [activeChallenge, challengeItems]);

  const openFeaturedChallenge = useCallback(() => {
    if (!featuredChallenge) return;
    handleSelectChallenge(featuredChallenge);
  }, [featuredChallenge]);

  const openCohortForSelected = useCallback(() => {
    const challenge = selectedChallenge || activeChallenge;
    if (challenge) {
      setSelectedChallenge(challenge);
    }
    setShowCohortModal(true);
  }, [activeChallenge, selectedChallenge]);

  const completeFeaturedToday = useCallback(async () => {
    const challenge = featuredChallenge;
    const challengeId = challenge?.challengeId || challenge?.id;
    if (!challenge || !challengeId || challenge.status !== 'active') {
      openFeaturedChallenge();
      return;
    }

    const totalDays = Math.max(1, Number(challenge.d || 1));
    const currentDay = Math.max(1, Math.min(totalDays, Number(challenge.currentDayNumber || 1)));
    const shouldUndo = Boolean(challenge.completedToday);

    setCompletingChallengeId(challengeId);
    try {
      if (shouldUndo) {
        await apiRequest(`/challenges/${encodeURIComponent(challengeId)}/plan/days/${currentDay}/complete`, {
          method: 'POST',
          body: { completed: false },
        });
      } else {
        await apiRequest(`/challenges/${encodeURIComponent(challengeId)}/complete-today`, { method: 'POST' });
      }
      await loadChallenges({ forceRefresh: true });
    } catch (error: any) {
      Alert.alert('Could not update challenge', error?.message || 'Please try again.');
    } finally {
      setCompletingChallengeId(null);
    }
  }, [featuredChallenge, loadChallenges, openFeaturedChallenge]);

  const inviteChallenge = useMemo(() => selectedChallenge || activeChallenge, [activeChallenge, selectedChallenge]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingChallenges}
            onRefresh={refreshScreen}
            tintColor="#C9943A"
          />
        }
      >
        {/* Screen Title matching line 824 */}
        <Text style={[styles.screenTitle, { color: colors.text }]}>Challenges</Text>

        {/* Top Tab Toggle: Challenges vs Community matching lines 825-827 */}
        <ClaudeChallengeTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        {activeTab === 'challenges' ? (
          <>
            <ClaudeActiveChallengeBanner
              challenge={featuredChallenge}
              onOpenChallenge={openFeaturedChallenge}
              onOpenCohort={openCohortForSelected}
              onInvite={handleInviteSomeone}
              onCompleteToday={completeFeaturedToday}
              completingToday={Boolean(featuredChallenge && completingChallengeId === (featuredChallenge.challengeId || featuredChallenge.id))}
            />

            <ClaudeChallengeDirectory
              challenges={challengeItems}
              isLoading={isLoadingChallenges}
              onSelectChallenge={handleSelectChallenge}
              onOpenInviteGuest={handleInviteSomeone}
            />
          </>
        ) : (
          /* Community Feed matching lines 915-963 */
          <ClaudeCommunityFeed
            userTier={userTier}
            userInitials={userInitials}
            posts={communityPosts}
            onPublishPost={handlePublishCommunityPost}
            onToggleCheer={handleToggleCommunityCheer}
          />
        )}
      </ScrollView>

      {/* Challenge Detail Modal matching lines 1718-1769 */}
      <ClaudeChallengeDetailModal
        challenge={selectedChallenge}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onJoin={handleJoinChallenge}
        userName={userName}
        inviterId={userId}
        onInvite={handleInviteSomeone}
        onOpenCohort={() => {
          if (selectedChallenge && selectedChallenge.status !== 'active') {
            void handleJoinChallenge(selectedChallenge);
            return;
          }
          setShowDetailModal(false);
          openCohortForSelected();
        }}
      />

      {/* Cohort Lobby Modal matching lines 1680-1717 */}
      <ClaudeCohortModal
        visible={showCohortModal}
        onClose={() => setShowCohortModal(false)}
        onInvite={() => {
          setShowCohortModal(false);
          setShowInviteModal(true);
        }}
        challengeId={inviteChallenge?.challengeId || inviteChallenge?.id}
        challengeTitle={inviteChallenge?.n || 'Challenge'}
        challengeDays={inviteChallenge?.d || 1}
      />

      {/* Guest Mode Invite Modal matching lines 1461-1502 */}
      <ClaudeInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        challengeId={inviteChallenge?.challengeId || inviteChallenge?.id}
        challengeTitle={inviteChallenge?.n || 'Challenge'}
        challengeDays={inviteChallenge?.d || 1}
        userName={userName}
        inviterId={userId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'web' ? 32 : 54,
    paddingBottom: 110,
  },
  screenTitle: {
    fontFamily: CLASH,
    fontSize: 27,
    fontWeight: '600',
    color: IVORY,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
