import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';

export type ChallengeTabType = 'challenges' | 'community';

interface ClaudeChallengeTabsProps {
  activeTab: ChallengeTabType;
  onChangeTab: (tab: ChallengeTabType) => void;
}

const NAVY = '#0D2B45';
const IVORY = '#F7F3EE';

const GOLD = '#C9943A';
const OBSIDIAN = '#0D0D0D';

const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });

export default function ClaudeChallengeTabs({
  activeTab,
  onChangeTab,
}: ClaudeChallengeTabsProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tabWrap,
          {
            borderColor: isDark ? 'rgba(247, 243, 238, 0.16)' : 'rgba(13, 43, 69, 0.15)',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'challenges' && styles.tabActive,
          ]}
          activeOpacity={0.85}
          onPress={() => onChangeTab('challenges')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'challenges'
                ? styles.tabTextActive
                : { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.6)' },
            ]}
          >
            {t('Challenges')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'community' && styles.tabActive,
          ]}
          activeOpacity={0.85}
          onPress={() => onChangeTab('community')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'community'
                ? styles.tabTextActive
                : { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.6)' },
            ]}
          >
            {t('Community')}
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
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: GOLD,
  },
  tabText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '500',
  },
  tabTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
});

