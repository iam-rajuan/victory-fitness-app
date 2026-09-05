declare const process: {
  env?: Record<string, string | undefined>;
};

import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { API_URL, apiRequest, type AuthResponse } from './api';

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

type BrowserGoogleAuthMessage = {
  type?: string;
  ok?: boolean;
  auth?: AuthResponse;
  error?: string;
};

export const GOOGLE_AUTH_STORAGE_KEY = 'victory_google_auth_result';

type GoogleOAuthPollResponse = {
  status?: string;
  payload?: BrowserGoogleAuthMessage;
};

function readEnv(name: string): string {
  return String(process.env?.[name] ?? '').trim();
}

function getDefaultGoogleRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return makeRedirectUri({ preferLocalhost: true });
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
    || String(firebaseExtra.redirectUri ?? '').trim()
    || getDefaultGoogleRedirectUri();

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

export function signInWithGoogleBrowserOAuth(): Promise<AuthResponse> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.reject(new Error('Browser Google sign-in is only available on web.'));
  }

  const flowId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const authUrl = `${API_URL}/auth/google/start?return_origin=${encodeURIComponent(window.location.origin)}&flow_id=${encodeURIComponent(flowId)}`;

  return new Promise<AuthResponse>((resolve, reject) => {
    let completed = false;
    const popup = window.open('about:blank', 'victory-google-sign-in', 'width=515,height=680');

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          popup
            ? 'Google sign-in timed out. Please try again.'
            : 'Popup window was blocked by the browser. Please allow popups for Victory Fitness and try again.',
        ),
      );
    }, 120_000);

    const resultPoll = window.setInterval(() => {
      void pollForResult();
    }, 750);

    function cleanup() {
      window.clearTimeout(timeout);
      window.clearInterval(resultPoll);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      window.localStorage.removeItem(GOOGLE_AUTH_STORAGE_KEY);
    }

    function complete(data: BrowserGoogleAuthMessage) {
      if (data.type !== 'victory-google-auth') {
        return;
      }

      cleanup();
      if (data.ok && data.auth) {
        completed = true;
        resolve(data.auth);
        return;
      }
      completed = true;
      reject(new Error(data.error || 'Google sign-in failed. Please try again.'));
    }

    function handleMessage(event: MessageEvent<BrowserGoogleAuthMessage>) {
      if (event.origin !== window.location.origin) {
        return;
      }

      complete(event.data || {});
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== GOOGLE_AUTH_STORAGE_KEY || !event.newValue) {
        return;
      }

      try {
        complete(JSON.parse(event.newValue));
      } catch {
        complete({ type: 'victory-google-auth', ok: false, error: 'Google sign-in response was invalid.' });
      }
    }

    async function pollForResult() {
      if (completed) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/google/result?flow_id=${encodeURIComponent(flowId)}`, {
          method: 'GET',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          return;
        }
        const result = (await response.json()) as GoogleOAuthPollResponse;
        if (result.status === 'complete' && result.payload) {
          complete(result.payload);
        }
      } catch {
        // Keep polling; the OAuth popup may still be in progress.
      }
    }

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);

    if (popup) {
      popup.location.href = authUrl;
      popup.focus();
    } else {
      window.location.href = authUrl;
    }

    void pollForResult();
  });
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
