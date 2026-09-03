declare const process: {
  env?: Record<string, string | undefined>;
};

import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { apiRequest, type AuthResponse } from './api';

WebBrowser.maybeCompleteAuthSession();

type FirebaseGoogleConfig = {
  firebaseApiKey: string;
  projectId: string;
  androidClientId: string;
  iosClientId: string;
  googleClientId: string;
  redirectUri: string;
};

type GoogleTokens = {
  idToken?: string | null;
  accessToken?: string | null;
};

function readEnv(name: string): string {
  return String(process.env?.[name] ?? '').trim();
}

export function getFirebaseGoogleConfig(): FirebaseGoogleConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  const firebaseExtra = (extra.firebase ?? {}) as Record<string, any>;
  const googleExtra = (extra.googleHealthConnect ?? {}) as Record<string, any>;

  const firebaseApiKey =
    readEnv('EXPO_PUBLIC_FIREBASE_API_KEY')
    || String(firebaseExtra.apiKey ?? '').trim();
  const projectId =
    readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID')
    || String(firebaseExtra.projectId ?? '').trim()
    || String(googleExtra.projectId ?? '').trim();
  const androidClientId =
    readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID')
    || String(firebaseExtra.androidClientId ?? '').trim();
  const iosClientId =
    readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID')
    || String(firebaseExtra.iosClientId ?? '').trim();
  const googleClientId =
    readEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID')
    || String(firebaseExtra.webClientId ?? '').trim()
    || String(googleExtra.clientId ?? '').trim();
  const redirectUri =
    readEnv('EXPO_PUBLIC_GOOGLE_REDIRECT_URI')
    || makeRedirectUri({ preferLocalhost: true });

  return {
    firebaseApiKey,
    projectId,
    androidClientId,
    iosClientId,
    googleClientId,
    redirectUri,
  };
}

export function useGoogleIdTokenAuth() {
  const config = getFirebaseGoogleConfig();
  const clientId = config.googleClientId || config.androidClientId || config.iosClientId;
  const isConfigured = Boolean(clientId);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    isConfigured
      ? {
          clientId,
          webClientId: config.googleClientId || undefined,
          androidClientId: config.androidClientId || undefined,
          iosClientId: config.iosClientId || undefined,
          redirectUri: config.redirectUri,
          scopes: ['openid', 'email', 'profile'],
          selectAccount: true,
        }
      : {},
  );

  return {
    isConfigured,
    request,
    response,
    promptAsync,
    redirectUri: config.redirectUri,
  };
}

export async function signInWithFirebaseGoogle(tokens: GoogleTokens): Promise<AuthResponse> {
  const idToken = String(tokens.idToken || '').trim();
  const accessToken = String(tokens.accessToken || '').trim();
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }

  return apiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body: {
      id_token: idToken,
      access_token: accessToken || undefined,
    },
  });
}
