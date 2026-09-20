import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import ClaudeOnboardingFlow from '../../components/onboarding/ClaudeOnboardingFlow';
import { AuthUser, fetchCurrentUser } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';

export default function OnboardMotivationScreen() {
  const { t } = useLanguage();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const currentUser = await fetchCurrentUser({ forceRefresh: true });
        if (!cancelled) {
          setUser(currentUser);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !user) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>{t('Loading your profile...')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ClaudeOnboardingFlow user={user} initialStep={2} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.obsidian,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.body,
    marginTop: 12,
    textAlign: 'center',
  },
});
