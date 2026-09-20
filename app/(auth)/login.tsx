import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import {
  apiRequest,
  AuthResponse,
  clearAuthTokens,
  fetchCurrentUser,
  getAuthUser,
  getValidAuthTokens,
  setAuthTokens,
} from '../../lib/api';
import { getPostAuthRoute, isAdminRestrictedFromApp } from '../../lib/access';
import { markBiometricSessionUnlocked, maybeOfferBiometricUnlock } from '../../lib/biometricUnlock';
import { formatAppError } from '../../lib/error';
import {
  signInWithFirebaseGoogle,
  signInWithGoogleBrowserOAuth,
  useGoogleIdTokenAuth,
} from '../../lib/firebaseGoogleAuth';
import { useLanguage } from '../../lib/i18n';
import { pushRoute, replaceRoute } from '../../lib/navigation';

const VF_LOGO = require('../../assets/images/onboarding/vf-logo-white.png');

const WEB_USES = [
  'Read your plan, the challenge detail and the feed on a bigger screen',
  'Manage your subscription, your data export and your reminders',
  'Log sessions on your phone — the two are the same account',
];

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { reauth, challenge_id } = useLocalSearchParams<{ reauth?: string; challenge_id?: string }>();
  const { t, useDefaultLanguage, syncLanguageWithCurrentUser } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [codeMode, setCodeMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { isConfigured: isGoogleConfigured, request: googleRequest, promptAsync } = useGoogleIdTokenAuth();

  useEffect(() => {
    let cancelled = false;

    const redirectIfAuthenticated = async () => {
      try {
        const tokens = await getValidAuthTokens();
        const user = tokens?.access_token
          ? await fetchCurrentUser().catch(async () => getAuthUser())
          : await getAuthUser();
        if (cancelled) return;

        if (tokens?.access_token && user) {
          if (isAdminRestrictedFromApp(user)) {
            await clearAuthTokens();
            useDefaultLanguage();
            if (!cancelled) setCheckingAuth(false);
            return;
          }

          await syncLanguageWithCurrentUser(user.id);
          replaceRoute(router, getPostAuthRoute(user));
          return;
        }
      } catch {
        // Not authenticated
      }

      useDefaultLanguage();
      if (reauth === '1') {
        setErrorDialog({
          title: t('Session expired'),
          message: t('For your security, please sign in again to continue.'),
        });
      }
      setCheckingAuth(false);
    };

    void redirectIfAuthenticated();

    return () => {
      cancelled = true;
    };
  }, [reauth, router, syncLanguageWithCurrentUser, t, useDefaultLanguage]);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (codeMode) {
      if (!normalizedEmail) {
        setFieldErrors({ email: 'Please enter your email.' });
        setErrorDialog({
          title: 'Email Required',
          message: 'Please enter your email to receive a sign-in code.',
        });
        return;
      }

      setLoading(true);
      try {
        await apiRequest('/auth/forgot-password', {
          method: 'POST',
          body: { email: normalizedEmail },
        });
        router.push({
          pathname: '/forgot-password',
          params: { email: normalizedEmail },
        });
      } catch (error) {
        setErrorDialog(formatAppError(error));
      } finally {
        setLoading(false);
      }
      return;
    }

    const errors: Record<string, string> = {};
    if (!normalizedEmail) errors.email = t('Please enter your email.');
    if (!password) errors.password = t('Please enter your password.');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorDialog({
        title: t('Missing Information'),
        message: t('Please enter your email and password.'),
      });
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const auth = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email: normalizedEmail, password },
      });
      if (isAdminRestrictedFromApp(auth.user)) {
        await clearAuthTokens();
        useDefaultLanguage();
        setErrorDialog({
          title: t('App access restricted'),
          message: t('Admin accounts can only sign in to the Victory Fitness dashboard.'),
        });
        return;
      }
      await setAuthTokens(auth);
      markBiometricSessionUnlocked();
      await syncLanguageWithCurrentUser(auth.user.id);
      void maybeOfferBiometricUnlock(auth.user);
      const pendingChallengeId = challenge_id || (await AsyncStorage.getItem('@pending_challenge_id'));
      if (pendingChallengeId) {
        await AsyncStorage.removeItem('@pending_challenge_id');
        replaceRoute(router, `/challenges/${pendingChallengeId}` as any);
        return;
      }
      if (auth.returning_user) {
        Alert.alert(
          auth.returning_user.title,
          auth.returning_user.message,
          [
            { text: 'Choose your subscription', onPress: () => replaceRoute(router, '/plan') },
            { text: 'Continue', style: 'cancel', onPress: () => replaceRoute(router, getPostAuthRoute(auth.user)) },
          ]
        );
        return;
      }
      replaceRoute(router, getPostAuthRoute(auth.user));
    } catch (error) {
      setErrorDialog(formatAppError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    pushRoute(router, '/forgot-password');
  };

  const finishGoogleAuth = async (auth: AuthResponse) => {
    if (isAdminRestrictedFromApp(auth.user)) {
      await clearAuthTokens();
      useDefaultLanguage();
      setErrorDialog({
        title: t('App access restricted'),
        message: t('Admin accounts can only sign in to the Victory Fitness dashboard.'),
      });
      return;
    }

    await setAuthTokens(auth);
    markBiometricSessionUnlocked();
    await syncLanguageWithCurrentUser(auth.user.id);
    void maybeOfferBiometricUnlock(auth.user);
    if (auth.returning_user) {
      Alert.alert(
        auth.returning_user.title,
        auth.returning_user.message,
        [
          { text: 'Choose your subscription', onPress: () => replaceRoute(router, '/plan') },
          { text: 'Continue', style: 'cancel', onPress: () => replaceRoute(router, getPostAuthRoute(auth.user)) },
        ]
      );
      return;
    }
    replaceRoute(router, getPostAuthRoute(auth.user));
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS !== 'web' && (!isGoogleConfigured || !googleRequest)) {
      setErrorDialog({
        title: t('Google sign-in unavailable'),
        message: t('Google sign-in is not configured for this app environment yet.'),
      });
      return;
    }

    setGoogleLoading(true);
    try {
      if (Platform.OS === 'web') {
        const auth = await signInWithGoogleBrowserOAuth();
        await finishGoogleAuth(auth);
        return;
      }

      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setErrorDialog({
          title: t('Google sign-in cancelled'),
          message: t('The Google sign-in flow was cancelled before completion.'),
        });
        return;
      }
      if (result.type !== 'success') {
        setErrorDialog({
          title: t('Google sign-in failed'),
          message: t('We could not complete Google sign-in. Please try again.'),
        });
        return;
      }

      const auth = await signInWithFirebaseGoogle({
        idToken: result.params?.id_token || result.authentication?.idToken,
        accessToken: result.params?.access_token || result.authentication?.accessToken,
      });
      await finishGoogleAuth(auth);
    } catch (error) {
      setErrorDialog(formatAppError(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9943A" />
      </View>
    );
  }

  const isWide = Platform.OS === 'web' && width > 768;

  return (
    <View style={styles.root}>
      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title ?? t('Error')}
        message={errorDialog?.message ?? ''}
        onClose={() => setErrorDialog(null)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Logo */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={() => pushRoute(router, '/welcome')}
              activeOpacity={0.8}
            >
              <Image source={VF_LOGO} style={styles.logo} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          {/* Main Layout: 2 Columns on Desktop, Single Column on Mobile */}
          <View style={[styles.mainLayout, isWide && styles.mainLayoutWide]}>
            {/* Left Column: Sign In Form */}
            <View style={styles.formColumn}>
              <Text style={styles.kicker}>WELCOME BACK</Text>
              <Text style={styles.heading}>Sign in</Text>
              <Text style={styles.subheading}>
                Use the same method you signed up with. If the app is on your phone, you are already signed in there.
              </Text>

              {/* Continue with Google */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                activeOpacity={0.82}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#C9943A" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider: OR WITH YOUR EMAIL */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR WITH YOUR EMAIL</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Navy Form Card */}
              <View style={styles.formCard}>
                {/* Email Field */}
                <View style={[styles.fieldRow, !codeMode && styles.fieldRowBorder]}>
                  <Text style={styles.fieldLabel}>EMAIL</Text>
                  <TextInput
                    style={[styles.textInput, styles.monoInput]}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="you@email.com"
                    placeholderTextColor="#9C968E"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {fieldErrors.email ? <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text> : null}
                </View>

                {/* Password Field (hidden in code mode) */}
                {!codeMode ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>PASSWORD</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        style={[styles.textInput, styles.monoInput, { flex: 1 }]}
                        value={password}
                        onChangeText={(val) => {
                          setPassword(val);
                          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                        }}
                        placeholder="••••••••"
                        placeholderTextColor="#9C968E"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                      </TouchableOpacity>
                    </View>
                    {fieldErrors.password ? <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text> : null}
                  </View>
                ) : null}
              </View>

              {/* Code Toggle Card */}
              <Pressable
                style={[styles.codeCard, codeMode && styles.codeCardActive]}
                onPress={() => setCodeMode((prev) => !prev)}
                accessibilityRole="button"
              >
                <View style={styles.codeTextContainer}>
                  <Text style={styles.codeTitle}>Sign in with an emailed code</Text>
                  <Text style={styles.codeSubtitle}>Six digits, no password to remember.</Text>
                </View>
                <Text style={styles.codeCta}>{codeMode ? 'On ✓' : 'Use a code'}</Text>
              </Pressable>

              {/* Primary CTA */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleLogin}
                activeOpacity={0.88}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0D0D0D" />
                ) : (
                  <Text style={styles.ctaButtonText}>{codeMode ? 'Email me a code' : 'Sign in'}</Text>
                )}
              </TouchableOpacity>

              {/* Links Row */}
              <View style={styles.linksRow}>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                </TouchableOpacity>
                <View style={styles.signupWrap}>
                  <Text style={styles.signupPrompt}>No account? </Text>
                  <TouchableOpacity onPress={() => pushRoute(router, '/register')} activeOpacity={0.7}>
                    <Text style={styles.signupHighlight}>Start free</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Right Column: Signing In On The Web Card (visible on desktop / wide screen) */}
            {isWide ? (
              <View style={styles.webColumn}>
                <View style={styles.webCard}>
                  <Text style={styles.webKicker}>SIGNING IN ON THE WEB</Text>
                  <Text style={styles.webDesc}>
                    The web version is laid out as a phone column — most people log their sessions on a phone, and the two stay in sync.
                  </Text>
                  {WEB_USES.map((item, idx) => (
                    <View key={idx} style={styles.webBulletRow}>
                      <View style={styles.webBulletDot} />
                      <Text style={styles.webBulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#0D0D0D',
    paddingBottom: 40,
  },

  // Header
  headerContainer: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'web' ? 24 : 54,
    paddingBottom: 8,
  },
  logo: {
    height: 38,
    width: 140,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },

  // Layout
  mainLayout: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    flexDirection: 'column',
    alignItems: 'center',
  },
  mainLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 40,
  },
  formColumn: {
    flex: 1,
    maxWidth: 460,
    width: '100%',
  },
  webColumn: {
    flex: 1,
    maxWidth: 420,
    width: '100%',
    minWidth: 280,
  },

  // Form Column Typography
  kicker: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    letterSpacing: 1.7, // .17em
    fontWeight: '500',
    color: '#C9943A',
    marginBottom: 12,
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 43.2, // 40px * 1.08
    fontWeight: '600',
    color: '#F7F3EE',
    letterSpacing: -0.8, // -.02em
    marginBottom: 14,
    marginVertical: 0,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Clash Display', 'DM Sans', sans-serif" } as any) : {}),
  },
  subheading: {
    fontFamily: Fonts.body,
    fontSize: 15.5,
    lineHeight: 24.8, // 15.5px * 1.6
    fontWeight: '400',
    color: '#D6D0C8',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif", textWrap: 'pretty' } as any) : {}),
  },

  // Google Button
  googleButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#0D2B45',
    borderWidth: 1.5,
    borderColor: 'rgba(201,148,58,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C9943A',
    fontFamily: Fonts.heading,
  },
  googleButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#F7F3EE',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(247,243,238,0.16)',
  },
  dividerText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1.3, // .13em
    fontWeight: '500',
    color: '#B8B2AA',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Form Card
  formCard: {
    backgroundColor: '#0D2B45',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  fieldRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,243,238,0.12)',
  },
  fieldLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '500',
    color: '#B8B2AA',
    marginBottom: 6,
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  textInput: {
    fontFamily: Fonts.data,
    fontSize: 15,
    fontWeight: '500',
    color: '#F7F3EE',
    padding: 0,
    margin: 0,
    ...(Platform.OS === 'web'
      ? ({
          fontFamily: "'JetBrains Mono', monospace",
          outlineStyle: 'none',
        } as any)
      : {}),
  },
  monoInput: {
    fontFamily: Fonts.data,
    fontSize: 15,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'JetBrains Mono', monospace" } as any) : {}),
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passwordToggleText: {
    fontFamily: Fonts.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C9943A',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontFamily: Fonts.body,
  },

  // Code Card
  codeCard: {
    backgroundColor: '#0D2B45',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(217,138,62,0.7)',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  codeCardActive: {
    borderLeftColor: '#C9943A',
  },
  codeTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  codeTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#F7F3EE',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  codeSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    color: '#B8B2AA',
    marginTop: 3,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },
  codeCta: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    fontWeight: '700',
    color: '#C9943A',
    flexShrink: 0,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // CTA Button
  ctaButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#C9943A',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  ctaButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0D0D0D',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Links Row
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  forgotPasswordText: {
    fontFamily: Fonts.heading,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#C9943A',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  signupWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signupPrompt: {
    fontFamily: Fonts.body,
    fontSize: 13.5,
    fontWeight: '400',
    color: '#B8B2AA',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },
  signupHighlight: {
    fontFamily: Fonts.heading,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#C9943A',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Web Info Card
  webCard: {
    backgroundColor: '#0D2B45',
    borderRadius: 22,
    borderLeftWidth: 4,
    borderLeftColor: '#B5651D',
    padding: 24,
  },
  webKicker: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '500',
    color: '#C9943A',
    marginBottom: 14,
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  webDesc: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 23.2,
    fontWeight: '400',
    color: '#E3DED6',
    marginBottom: 16,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif", textWrap: 'pretty' } as any) : {}),
  },
  webBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingVertical: 6,
  },
  webBulletDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: '#5FC48E',
    marginTop: 7,
    flexShrink: 0,
  },
  webBulletText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    color: '#E3DED6',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },
});
