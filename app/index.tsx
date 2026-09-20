import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { getValidAuthTokens, fetchCurrentUser, getAuthUser } from '../lib/api';
import { getPostAuthRoute } from '../lib/access';
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
          const user = await fetchCurrentUser().catch(() => getAuthUser());
          if (cancelled) return;
          if (user) {
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

  if (isAuthenticated === true) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.obsidian, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <WelcomeScreen />;
}
