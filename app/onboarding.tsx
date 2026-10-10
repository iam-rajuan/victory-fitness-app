import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AuthUser,
  clearAuthTokens,
  fetchCurrentUser,
  getAuthTokens,
} from '../lib/api';
import { getPostAuthRoute, isSubscriptionActive } from '../lib/access';
import { replaceRoute } from '../lib/navigation';
import ClaudeOnboardingFlow, {
  ONBOARDING_STEP_KEY,
} from '../components/onboarding/ClaudeOnboardingFlow';

const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const [resolvedStep, setResolvedStep] = useState<number>(() => {
    const s = Number(params.step);
    if (!isNaN(s) && s >= 2 && s <= 11) return s;
    return 2;
  });

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      let targetStep = Number(params.step);
      const savedStep = await AsyncStorage.getItem(ONBOARDING_STEP_KEY);
      if (isNaN(targetStep) || targetStep < 2 || targetStep > 11) {
        if (savedStep && !isNaN(Number(savedStep))) {
          targetStep = Math.max(2, Math.min(11, Number(savedStep)));
        } else {
          targetStep = 2;
        }
      }
      if (!cancelled) {
        setResolvedStep(targetStep);
      }

      const tokens = await getAuthTokens();
      if (cancelled) return;

      if (tokens) {
        try {
          const user = await fetchCurrentUser({ forceRefresh: true });
          // Completion is server-owned. A stale local step is only progress
          // for an unfinished flow and must never reopen completed onboarding.
          if (user.onboarding_completed) {
            await AsyncStorage.removeItem(ONBOARDING_STEP_KEY);
            await AsyncStorage.removeItem('@vf_onboarding_answers');
            replaceRoute(router, getPostAuthRoute(user));
            return;
          }
          if (!cancelled) {
            setAuthenticatedUser(user);
            setCheckingAuth(false);
          }
          return;
        } catch {
          await clearAuthTokens();
        }
      }

      if (!cancelled) {
        setCheckingAuth(false);
      }
    };

    void checkStatus();
    return () => {
      cancelled = true;
    };
  }, [params.step, router]);

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={GOLD} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ClaudeOnboardingFlow
        user={authenticatedUser}
        initialStep={resolvedStep}
        onComplete={() => {
          replaceRoute(router, '/(tabs)');
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            setTimeout(() => {
              if (window.location.pathname.includes('/onboarding')) {
                window.location.href = '/';
              }
            }, 300);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OBSIDIAN,
  },
});
