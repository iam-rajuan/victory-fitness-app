import React, { useEffect, useRef, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import { clearAuthTokens, fetchCurrentUser, getAuthUser, getValidAuthTokens, setAuthFailureHandler } from '../lib/api';
import { getPostAuthRoute, isAdminRestrictedFromApp, isPublicRoute, isRouteAllowedForPlan, isSubscriptionActive } from '../lib/access';
import {
  authenticateWithBiometrics,
  isBiometricSessionUnlocked,
  isBiometricUnlockEnabled,
  markBiometricSessionLocked,
} from '../lib/biometricUnlock';
import { appendRunLog, formatRunLogMessage } from '../lib/runLog';
import { LanguageProvider } from '../lib/i18n';
import { blurActiveElementBeforeNavigation, replaceRoute } from '../lib/navigation';
import { PushNotificationEvent, registerForPushNotificationsAsync, startForegroundNotificationStream, stopForegroundNotificationStream, subscribeToPushNotifications } from '../lib/pushNotifications';
import { cleanupLocalWebServiceWorkers } from '../lib/webServiceWorker';

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorBoundary}>
      <Text style={styles.errorBoundaryTitle}>Something went wrong</Text>
      <Text style={styles.errorBoundaryMessage}>
        We couldn&apos;t load this screen. Your data is safe—please try again.
      </Text>
      <TouchableOpacity style={styles.errorBoundaryButton} onPress={retry} activeOpacity={0.85}>
        <Text style={styles.errorBoundaryButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const lastLoggedRouteRef = useRef<string | null>(null);
  const knownNotificationIdsRef = useRef<Set<string> | null>(null);
  const [fontsLoaded] = useFonts({
    // Role 1: Display / Hero
    'ClashDisplay-Bold': require('../assets/fonts/ClashDisplay-Bold.ttf'),
    // Role 2: Headings
    'DMSans-SemiBold': require('../assets/fonts/DMSans_600SemiBold.ttf'),
    // Role 3: Body
    'Inter-Regular': require('../assets/fonts/Inter_400Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter_500Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter_600SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter_700Bold.ttf'),
    // Role 4: Data / Numbers
    'JetBrainsMono-Medium': require('../assets/fonts/JetBrainsMono_500Medium.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono_700Bold.ttf'),
    // Backward-compatibility keys for existing code
    Inter_400Regular: require('../assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('../assets/fonts/Inter_700Bold.ttf'),
  });
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [toastNotification, setToastNotification] = useState<PushNotificationEvent | null>(null);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricUnlocking, setBiometricUnlocking] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [biometricUnlockNonce, setBiometricUnlockNonce] = useState(0);

  useEffect(() => {
    cleanupLocalWebServiceWorkers();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        markBiometricSessionLocked();
        return;
      }

      if (state === 'active' && !isPublicRoute(pathnameRef.current)) {
        setCheckingAccess(true);
        setBiometricUnlockNonce((value) => value + 1);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPushNotifications((notification) => {
      const notificationId = typeof notification.data?.notificationId === 'string' ? notification.data.notificationId : null;
      if (notificationId) {
        if (!knownNotificationIdsRef.current) knownNotificationIdsRef.current = new Set();
        if (knownNotificationIdsRef.current.has(notificationId)) return;
        knownNotificationIdsRef.current.add(notificationId);
      }
      setToastNotification(notification);
      setTimeout(() => setToastNotification(null), 5000);
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!fontsLoaded || checkingAccess || isPublicRoute(pathname)) return;
    startForegroundNotificationStream();
    return () => {
      stopForegroundNotificationStream();
    };
  }, [checkingAccess, fontsLoaded, pathname]);

  useEffect(() => {
    setAuthFailureHandler(() => {
        if (isPublicRoute(pathnameRef.current)) {
          return;
        }
        void appendRunLog({
          level: 'warning',
          title: 'Authentication redirect',
          message: 'Session guard redirected to /login.',
          route: pathnameRef.current,
          context: 'RootLayout',
        });
        replaceRoute(router, '/login?reauth=1');
      });

    return () => {
      setAuthFailureHandler(null);
    };
  }, [router]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    let cancelled = false;

    const guard = async () => {
      if (isPublicRoute(pathname)) {
        setCheckingAccess(false);
        return;
      }

      const verifyBiometricUnlock = async (user: Awaited<ReturnType<typeof getAuthUser>>) => {
        if (!user?.id || isBiometricSessionUnlocked()) {
          return true;
        }

        if (!(await isBiometricUnlockEnabled(user.id))) {
          return true;
        }

        const result = await authenticateWithBiometrics('Unlock Victory Fitness');
        if (result.success) {
          setBiometricLocked(false);
          setBiometricError('');
          return true;
        }

        setBiometricLocked(true);
        setBiometricError(result.error);
        setCheckingAccess(false);
        return false;
      };

      const applyAccess = async (user: Awaited<ReturnType<typeof getAuthUser>>) => {
        if (!user) {
          return false;
        }

        if (isAdminRestrictedFromApp(user)) {
          await clearAuthTokens();
          if (!isPublicRoute(pathname)) {
            void appendRunLog({
              level: 'warning',
              title: 'Admin app access blocked',
              message: `Admin session blocked in app for ${pathname}; redirecting to /login.`,
              route: pathname,
              context: 'RootLayout',
            });
            replaceRoute(router, '/login?reauth=1');
            return true;
          }

          setCheckingAccess(false);
          return false;
        }

        if (isPublicRoute(pathname)) {
          if (pathname === '/onboarding' && !isSubscriptionActive(user)) {
            setCheckingAccess(false);
            return false;
          }

          const target = getPostAuthRoute(user);
          if (pathname === target) {
            setCheckingAccess(false);
            return false;
          }

          void appendRunLog({
            level: 'route',
            title: 'Route redirect',
            message: `Authenticated user redirected from ${pathname} to ${target}.`,
            route: pathname,
            context: 'RootLayout',
          });
          replaceRoute(router, target);
          return true;
        }

        if (!isRouteAllowedForPlan(pathname, user)) {
          const target = getPostAuthRoute(user);
          if (pathname === target) {
            setCheckingAccess(false);
            return false;
          }

          void appendRunLog({
            level: 'warning',
            title: 'Route blocked',
            message: `Plan access blocked for ${pathname}; redirecting to ${target}.`,
            route: pathname,
            context: 'RootLayout',
          });
          replaceRoute(router, target);
          return true;
        }

        setCheckingAccess(false);
        return false;
      };

      try {
        const tokens = await getValidAuthTokens();
        if (cancelled) {
          return;
        }

        if (!tokens) {
          if (!isPublicRoute(pathname)) {
            void appendRunLog({
              level: 'warning',
              title: 'Route blocked',
              message: `Blocked unauthenticated access to ${pathname}; redirecting to /login.`,
              route: pathname,
              context: 'RootLayout',
            });
            replaceRoute(router, '/login');
          }
          setCheckingAccess(false);
          return;
        }

        const cachedUser = await getAuthUser();
        if (cancelled) {
          return;
        }

        if (!(await verifyBiometricUnlock(cachedUser))) {
          return;
        }

        if (await applyAccess(cachedUser)) {
          return;
        }

        const user = await fetchCurrentUser();
        if (cancelled) {
          return;
        }

        if (!(await verifyBiometricUnlock(user))) {
          return;
        }

        if (await applyAccess(user)) {
          return;
        }

        setCheckingAccess(false);
      } catch {
        if (cancelled) {
          return;
        }

        if (!isPublicRoute(pathname)) {
          void appendRunLog({
            level: 'error',
            title: 'Auth check failed',
            message: `Unable to verify access for ${pathname}; redirecting to /login.`,
            route: pathname,
            context: 'RootLayout',
          });
          replaceRoute(router, '/login?reauth=1');
        }

        setCheckingAccess(false);
      }
    };

    void guard();

    return () => {
      cancelled = true;
    };
  }, [biometricUnlockNonce, fontsLoaded, pathname, router]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    blurActiveElementBeforeNavigation();
  }, [pathname]);

  useEffect(() => {
    if (!fontsLoaded || checkingAccess || isPublicRoute(pathname)) {
      return;
    }

    void registerForPushNotificationsAsync().catch(() => {
      // Notifications are optional and must not block app access.
    });
  }, [checkingAccess, fontsLoaded, pathname]);

  useEffect(() => {
    if (lastLoggedRouteRef.current === pathname) {
      return;
    }

    lastLoggedRouteRef.current = pathname;
    void appendRunLog({
      level: 'route',
      title: 'Route changed',
      message: `Active route: ${pathname}`,
      route: pathname,
      context: 'RootLayout',
    });
  }, [pathname]);

  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const shouldIgnoreDevWarning = (args: unknown[]) => {
      const message = formatRunLogMessage(args);
      return (
        message.includes('"shadow*" style props are deprecated. Use "boxShadow".')
        || message.includes('props.pointerEvents is deprecated. Use style.pointerEvents')
      );
    };

    console.error = (...args: unknown[]) => {
      void appendRunLog({
        level: 'error',
        title: 'Console error',
        message: formatRunLogMessage(args),
        route: pathnameRef.current,
        context: 'Console',
      });
      originalError(...args);
    };

    console.warn = (...args: unknown[]) => {
      if (shouldIgnoreDevWarning(args)) {
        return;
      }

      void appendRunLog({
        level: 'warning',
        title: 'Console warning',
        message: formatRunLogMessage(args),
        route: pathnameRef.current,
        context: 'Console',
      });
      originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  if (!fontsLoaded || checkingAccess) {
    return null;
  }

  if (biometricLocked && !isPublicRoute(pathname)) {
    return (
      <View style={styles.biometricScreen}>
        <StatusBar style="light" />
        <View style={styles.biometricCard}>
          <View style={styles.biometricIcon}>
            <Text style={styles.biometricIconText}>VF</Text>
          </View>
          <Text style={styles.biometricTitle}>Unlock Victory Fitness</Text>
          <Text style={styles.biometricMessage}>
            Use Face ID or fingerprint to continue with your signed-in session.
          </Text>
          {biometricError ? <Text style={styles.biometricError}>{biometricError}</Text> : null}
          <TouchableOpacity
            style={styles.biometricButton}
            disabled={biometricUnlocking}
            activeOpacity={0.85}
            onPress={async () => {
              setBiometricUnlocking(true);
              setBiometricError('');
              const result = await authenticateWithBiometrics('Unlock Victory Fitness');
              setBiometricUnlocking(false);
              if (!result.success) {
                setBiometricError(result.error);
                return;
              }
              setBiometricLocked(false);
              setCheckingAccess(true);
              setBiometricUnlockNonce((value) => value + 1);
            }}
          >
            {biometricUnlocking ? (
              <ActivityIndicator color="#06111f" />
            ) : (
              <Text style={styles.biometricButtonText}>Unlock</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.biometricSignOutButton}
            activeOpacity={0.75}
            onPress={async () => {
              markBiometricSessionLocked();
              setBiometricLocked(false);
              await clearAuthTokens();
              replaceRoute(router, '/login');
            }}
          >
            <Text style={styles.biometricSignOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <LanguageProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'none',
          }}
        />
        <PwaInstallPrompt />
        {toastNotification ? (
          <TouchableOpacity
            style={styles.notificationToast}
            onPress={() => {
              setToastNotification(null);
              router.push('/notifications');
            }}
            activeOpacity={0.9}
          >
            <View style={styles.notificationToastIcon}><Text style={styles.notificationToastIconText}>!</Text></View>
            <View style={styles.notificationToastCopy}>
              <Text style={styles.notificationToastTitle}>{toastNotification.title}</Text>
              <Text style={styles.notificationToastMessage}>{toastNotification.message}</Text>
            </View>
            <TouchableOpacity onPress={() => setToastNotification(null)} hitSlop={10} accessibilityLabel="Dismiss notification">
              <Text style={styles.notificationToastClose}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : null}
      </View>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  errorBoundary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: Colors.background,
    gap: 12,
  },
  errorBoundaryTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  errorBoundaryMessage: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  errorBoundaryButton: {
    marginTop: 6,
    minHeight: 46,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentBlue,
  },
  errorBoundaryButtonText: {
    color: '#06111f',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  biometricScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  biometricCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 14,
    padding: 28,
    borderRadius: 24,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
  biometricIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.16)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  biometricIconText: {
    color: '#DFFFFB',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  biometricTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  biometricMessage: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  biometricError: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  biometricButton: {
    width: '100%',
    minHeight: 50,
    marginTop: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  biometricButtonText: {
    color: '#06111f',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  biometricSignOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  biometricSignOutText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  notificationToast: {
    position: 'absolute',
    top: 48,
    left: 14,
    right: 14,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    backgroundColor: '#14213D',
    borderWidth: 1,
    borderColor: `${Colors.primary}80`,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  notificationToastIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  notificationToastIconText: { color: '#07111F', fontSize: 18, fontFamily: 'Inter_700Bold' },
  notificationToastCopy: { flex: 1 },
  notificationToastTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  notificationToastMessage: { marginTop: 2, color: '#CBD5E1', fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  notificationToastClose: { color: '#CBD5E1', fontSize: 24, lineHeight: 24 },
});
