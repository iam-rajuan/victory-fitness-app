import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors } from '../constants/Colors';
import { GOOGLE_AUTH_STORAGE_KEY } from '../lib/firebaseGoogleAuth';
import { API_URL, CONFIGURED_API_URL, clearAuthTokens, setAuthTokens, type AuthResponse } from '../lib/api';
import { getPostAuthRoute, isAdminRestrictedFromApp } from '../lib/access';
import { markBiometricSessionUnlocked } from '../lib/biometricUnlock';
import { replaceRoute } from '../lib/navigation';

type GoogleOAuthResultResponse = {
  status?: string;
  payload?: {
    type?: string;
    ok?: boolean;
    auth?: AuthResponse;
    error?: string;
  };
};

function sendPopupResult(payload: GoogleOAuthResultResponse['payload']) {
  if (!payload || typeof window === 'undefined') {
    return;
  }

  const encodedPayload = JSON.stringify(payload);
  window.localStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, encodedPayload);
  window.opener?.postMessage(payload, window.location.origin);
}

export default function GoogleAuthCompleteScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('Finishing Google sign-in...');

  const payload = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    return params.get('victory_google_auth');
  }, []);

  const flowId = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return new URLSearchParams(window.location.search || '').get('flow_id') || '';
  }, []);

  const resultApiOrigin = useMemo(() => {
    const fallbackOrigin = (() => {
      try {
        return new URL(CONFIGURED_API_URL || API_URL).origin;
      } catch {
        return API_URL;
      }
    })();

    if (typeof window === 'undefined') {
      return fallbackOrigin;
    }

    const value = new URLSearchParams(window.location.search || '').get('result_origin') || '';
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // Older callbacks do not include a result origin and use the configured API.
    }
    return fallbackOrigin;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (flowId) {
      let cancelled = false;
      let attempts = 0;
      const isPopupWindow = Boolean(window.opener);

      const finishFromBackend = async () => {
        attempts += 1;
        try {
          const response = await fetch(`${resultApiOrigin}/auth/google/result?flow_id=${encodeURIComponent(flowId)}`, {
            method: 'GET',
            credentials: 'omit',
            headers: { Accept: 'application/json' },
          });
          const result = (await response.json()) as GoogleOAuthResultResponse;
          if (cancelled) {
            return;
          }

          if (result.status !== 'complete') {
            if (attempts < 20) {
              window.setTimeout(finishFromBackend, 500);
              return;
            }
            setMessage('Google sign-in timed out. Please return to Victory Fitness and try again.');
            return;
          }

          if (!result.payload?.ok || !result.payload.auth) {
            if (isPopupWindow) {
              sendPopupResult(result.payload || {
                type: 'victory-google-auth',
                ok: false,
                error: 'Google sign-in failed. Please try again.',
              });
              setMessage('Google sign-in failed. Returning to Victory Fitness...');
              window.setTimeout(() => window.close(), 250);
              return;
            }
            setMessage(result.payload?.error || 'Google sign-in failed. Please return to Victory Fitness and try again.');
            return;
          }

          const auth = result.payload.auth;
          if (isPopupWindow) {
            sendPopupResult(result.payload);
            setMessage('Google sign-in complete. Returning to Victory Fitness...');
            window.setTimeout(() => window.close(), 250);
            return;
          }

          if (isAdminRestrictedFromApp(auth.user)) {
            await clearAuthTokens();
            setMessage('App access restricted. Admin accounts can only sign in to the Victory Fitness dashboard.');
            window.setTimeout(() => replaceRoute(router, '/login'), 1800);
            return;
          }

          await setAuthTokens(auth);
          markBiometricSessionUnlocked();
          setMessage('Google sign-in complete. Opening Victory Fitness...');
          replaceRoute(router, getPostAuthRoute(auth.user));
        } catch {
          if (attempts < 20) {
            window.setTimeout(finishFromBackend, 500);
            return;
          }
          setMessage('Google sign-in failed. Please return to Victory Fitness and try again.');
        }
      };

      void finishFromBackend();

      return () => {
        cancelled = true;
      };
    }

    if (!payload) {
      setMessage('Google sign-in complete. Returning to Victory Fitness...');
      window.setTimeout(() => window.close(), 500);
      return;
    }

    try {
      const decodedPayload = decodeURIComponent(payload);
      const parsedPayload = JSON.parse(decodedPayload);
      window.localStorage.setItem(GOOGLE_AUTH_STORAGE_KEY, decodedPayload);
      window.opener?.postMessage(parsedPayload, window.location.origin);
      setMessage('Google sign-in complete. Returning to Victory Fitness...');
      window.setTimeout(() => window.close(), 250);
      window.setTimeout(() => router.replace('/login'), 1200);
    } catch {
      setMessage('Google sign-in response was invalid. You can close this window.');
    }
  }, [flowId, payload, resultApiOrigin, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  message: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginTop: 18,
    textAlign: 'center',
  },
});
