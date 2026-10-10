import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { getValidAuthTokens, fetchCurrentUser, getAuthUser } from '../lib/api';
import { getPostAuthRoute } from '../lib/access';
import { redirectToGermanyDomainPreservingPath, shouldRedirectGermanyUserToGermanyDomain } from '../lib/domainContext';
import { replaceRoute } from '../lib/navigation';
import WelcomeScreen from './(auth)/welcome';
import { Colors } from '../constants/Colors';

export default function Index() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const tokens = await getValidAuthTokens();
        if (cancelled) return;
        if (tokens?.access_token) {
          // Prefer the server record: onboarding completion and trial expiry
          // are persisted there and a cached profile may be stale after login.
          const user = await fetchCurrentUser({ forceRefresh: true }).catch(() => getAuthUser());
          if (cancelled) return;
          if (user) {
            if (await shouldRedirectGermanyUserToGermanyDomain(user)) {
              redirectToGermanyDomainPreservingPath();
              return;
            }
            setIsAuthenticated(true);
            replaceRoute(router, getPostAuthRoute(user));
            return;
          }
        }
      } catch {
        // Unauthenticated
      }

      if (!cancelled) {
        setIsAuthenticated(false);
      }
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (isAuthenticated === null || isAuthenticated === true) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.obsidian, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <WelcomeScreen />;
}
