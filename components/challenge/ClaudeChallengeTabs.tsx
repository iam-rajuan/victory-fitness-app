import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type ChallengeTabType = 'challenges' | 'community';

interface ClaudeChallengeTabsProps {
  activeTab: ChallengeTabType;
  onChangeTab: (tab: ChallengeTabType) => void;
}

const NAVY = '#0D2B45';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });

export default function ClaudeChallengeTabs({
  activeTab,
  onChangeTab,
}: ClaudeChallengeTabsProps) {
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tabWrap,
          {
            backgroundColor: isDark ? '#0A2033' : '#EDE8E1',
            borderColor: isDark ? 'rgba(247, 243, 238, 0.16)' : 'rgba(13, 43, 69, 0.12)',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'challenges' && {
              backgroundColor: isDark ? NAVY : '#FFFFFF',
            },
          ]}
          activeOpacity={0.8}
          onPress={() => onChangeTab('challenges')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'challenges'
                    ? isDark
                      ? IVORY
                      : NAVY
                    : isDark
                    ? 'rgba(247, 243, 238, 0.55)'
                    : 'rgba(13, 43, 69, 0.6)',
              },
            ]}
          >
            Challenges
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'community' && {
              backgroundColor: isDark ? NAVY : '#FFFFFF',
            },
          ]}
          activeOpacity={0.8}
          onPress={() => onChangeTab('community')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'community'
                    ? isDark
                      ? IVORY
                      : NAVY
                    : isDark
                    ? 'rgba(247, 243, 238, 0.55)'
                    : 'rgba(13, 43, 69, 0.6)',
              },
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
    borderRadius: 13,
    padding: 4,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
  },
});

