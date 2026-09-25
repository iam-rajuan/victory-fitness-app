import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchCurrentUser } from '../../lib/api';
import ClaudeChallengeTabs, { ChallengeTabType } from '../../components/challenge/ClaudeChallengeTabs';
import ClaudeActiveChallengeBanner from '../../components/challenge/ClaudeActiveChallengeBanner';
import ClaudeChallengeDirectory, { ChallengeItem } from '../../components/challenge/ClaudeChallengeDirectory';
import ClaudeChallengeDetailModal from '../../components/challenge/ClaudeChallengeDetailModal';
import ClaudeCohortModal from '../../components/challenge/ClaudeCohortModal';
import ClaudeInviteModal from '../../components/challenge/ClaudeInviteModal';
import ClaudeCommunityFeed from '../../components/challenge/ClaudeCommunityFeed';
import { useTheme } from '../../context/ThemeContext';

const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });

export default function ChallengeScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();

  const [activeTab, setActiveTab] = useState<ChallengeTabType>('challenges');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userTier, setUserTier] = useState('GOLD');
  const [userName, setUserName] = useState('Michael');
  const [userInitials, setUserInitials] = useState('MK');

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (cancelled || !user) return;
        const u = user as any;
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

  const handleSelectChallenge = (c: ChallengeItem) => {
    setSelectedChallenge(c);
    setShowDetailModal(true);
  };

  const handleJoinChallenge = (c: ChallengeItem) => {
    setShowDetailModal(false);
    setShowCohortModal(true);
  };

  const handleInviteSomeone = () => {
    setShowInviteModal(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Title matching line 824 */}
        <Text style={[styles.screenTitle, { color: colors.text }]}>Challenges</Text>

        {/* Top Tab Toggle: Challenges vs Community matching lines 825-827 */}
        <ClaudeChallengeTabs activeTab={activeTab} onChangeTab={setActiveTab} />

        {activeTab === 'challenges' ? (
          <>
            {/* Active Challenge Card: 21-Day Warrior matching lines 831-850 */}
            <ClaudeActiveChallengeBanner
              onOpenCohort={() => setShowCohortModal(true)}
              onInvite={handleInviteSomeone}
            />

            {/* Directory with rails, filters, count line, and 35 challenges matching lines 851-912 */}
            <ClaudeChallengeDirectory
              onSelectChallenge={handleSelectChallenge}
              onOpenInviteGuest={handleInviteSomeone}
            />
          </>
        ) : (
          /* Community Feed matching lines 915-963 */
          <ClaudeCommunityFeed userTier={userTier} userInitials={userInitials} />
        )}
      </ScrollView>

      {/* Challenge Detail Modal matching lines 1718-1769 */}
      <ClaudeChallengeDetailModal
        challenge={selectedChallenge}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onJoin={handleJoinChallenge}
        onInvite={handleInviteSomeone}
        onOpenCohort={() => {
          setShowDetailModal(false);
          setShowCohortModal(true);
        }}
      />

      {/* Cohort Lobby Modal matching lines 1680-1717 */}
      <ClaudeCohortModal
        visible={showCohortModal}
        onClose={() => setShowCohortModal(false)}
        onInvite={handleInviteSomeone}
        challengeTitle={selectedChallenge?.n || '21-Day Warrior'}
      />

      {/* Guest Mode Invite Modal matching lines 1461-1502 */}
      <ClaudeInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        challengeTitle={selectedChallenge?.n || '21-Day Warrior'}
        userName={userName}
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