import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';

export type ChallengeTabType = 'challenges' | 'community';

interface ClaudeChallengeTabsProps {
  activeTab: ChallengeTabType;
  onChangeTab: (tab: ChallengeTabType) => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });

export default function ClaudeChallengeTabs({
  activeTab,
  onChangeTab,
}: ClaudeChallengeTabsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabWrap}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.tabActive]}
          activeOpacity={0.8}
          onPress={() => onChangeTab('challenges')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'challenges' ? styles.tabTextActive : styles.tabTextInactive,
            ]}
          >
            Challenges
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'community' && styles.tabActive]}
          activeOpacity={0.8}
          onPress={() => onChangeTab('community')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'community' ? styles.tabTextActive : styles.tabTextInactive,
            ]}
          >
            Community
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  tabWrap: {
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.16)',
    borderRadius: 13,
    padding: 4,
    backgroundColor: '#0A2033',
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: NAVY,
  },
  tabText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: IVORY,
  },
  tabTextInactive: {
    color: 'rgba(247, 243, 238, 0.55)',
  },
});
