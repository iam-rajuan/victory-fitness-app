import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { clearAuthTokens, fetchCurrentUser, getValidAuthTokens } from '../lib/api';
import { getPostAuthRoute, isAdminRestrictedFromApp } from '../lib/access';
import { replaceRoute } from '../lib/navigation';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';

export default function SplashScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver,
        }),
      ])
    ).start();

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const resolveNextRoute = async () => {
      const tokens = await getValidAuthTokens();
      if (cancelled) {
        return;
      }

      if (tokens) {
        try {
          const user = await fetchCurrentUser();
          if (isAdminRestrictedFromApp(user)) {
            await clearAuthTokens();
            replaceRoute(router, '/login');
            return;
          }
          replaceRoute(router, getPostAuthRoute(user));
        } catch {
          replaceRoute(router, '/login');
        }
        return;
      }

      await clearAuthTokens({ preserveBrowserRefreshFailure: Platform.OS === 'web' });
      timer = setTimeout(() => {
        replaceRoute(router, '/onboarding');
      }, 800);
    };

    void resolveNextRoute();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [pulseAnim, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Image source={require('../assets/logo_dark.png')} style={{ width: 220, height: 75 }} resizeMode="contain" />
        <View style={styles.pulseDot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.obsidian,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 32,
    color: Colors.text,
    letterSpacing: 10,
    fontFamily: Fonts.display,
  },
  brandSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 8,
    marginTop: 8,
    fontFamily: Fonts.heading,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
    marginTop: 30,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});

