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
import ClaudeCommunityFeed from '../../components/challenge/ClaudeCommunityFeed';

const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });

export default function ChallengeScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ChallengeTabType>('challenges');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [userTier, setUserTier] = useState('GOLD');
  const [userInitials, setUserInitials] = useState('ME');

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
    Alert.alert('Joined Challenge', `Welcome to the ${c.n} cohort!`);
  };

  const handleInviteSomeone = () => {
    const code = 'CH-WARRIOR';
    Alert.alert('Guest Invite Code', `Share guest link with a friend:\nvictoryfitness.app/join/${code}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Title matching line 824 */}
        <Text style={styles.screenTitle}>Challenges</Text>

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