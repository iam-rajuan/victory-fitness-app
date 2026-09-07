import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  Image,
  StyleSheet,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { apiRequest, AuthResponse, clearAuthTokens, fetchCurrentUser, getAuthUser, getValidAuthTokens, setAuthTokens } from '../../lib/api';
import { getPostAuthRoute, isAdminRestrictedFromApp } from '../../lib/access';
import { markBiometricSessionUnlocked, maybeOfferBiometricUnlock } from '../../lib/biometricUnlock';
import { formatAppError } from '../../lib/error';
import { signInWithFirebaseGoogle, signInWithGoogleBrowserOAuth, useGoogleIdTokenAuth } from '../../lib/firebaseGoogleAuth';
import { useLanguage } from '../../lib/i18n';
import { replaceRoute } from '../../lib/navigation';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { reauth, challenge_id } = useLocalSearchParams<{ reauth?: string; challenge_id?: string }>();
  const { t, useDefaultLanguage, syncLanguageWithCurrentUser } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { isConfigured: isGoogleConfigured, request: googleRequest, promptAsync } = useGoogleIdTokenAuth();

  useEffect(() => {
    let cancelled = false;

    const redirectIfAuthenticated = async () => {
      const tokens = await getValidAuthTokens();
      const user = tokens?.access_token
        ? await fetchCurrentUser().catch(async () => getAuthUser())
        : await getAuthUser();
      if (cancelled) {
        return;
      }

      if (tokens?.access_token && user) {
        if (isAdminRestrictedFromApp(user)) {
          await clearAuthTokens();
          useDefaultLanguage();
          if (!cancelled) {
            setErrorDialog({
              title: t('App access restricted'),
              message: t('Admin accounts can only sign in to the Victory Fitness dashboard.'),
            });
            setCheckingAuth(false);
          }
          return;
        }

        await syncLanguageWithCurrentUser(user.id);
        replaceRoute(router, getPostAuthRoute(user));
        return;
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
          [{ text: 'Choose your subscription', onPress: () => replaceRoute(router, '/plan') }, { text: 'Continue', style: 'cancel', onPress: () => replaceRoute(router, getPostAuthRoute(auth.user)) }],
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
    router.push('/forgot-password');
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
        [{ text: 'Choose your subscription', onPress: () => replaceRoute(router, '/plan') }, { text: 'Continue', style: 'cancel', onPress: () => replaceRoute(router, getPostAuthRoute(auth.user)) }],
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
      <ImageBackground
        source={require('../../assets/w4.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.checkingAuthWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/w4.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ErrorPopupModal
          visible={Boolean(errorDialog)}
          title={errorDialog?.title ?? t('Error')}
          message={errorDialog?.message ?? ''}
          onClose={() => setErrorDialog(null)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Branding Header */}
            <View style={styles.brandingContainer}>
              <Image
                source={require('../../assets/logo_dark.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>

            {/* Heading */}
            <Text style={styles.heading}>{t('WELCOME BACK')}</Text>
            <Text style={styles.subheading}>{t('Log in to continue')}</Text>

            {/* Glassmorphic Form Card */}
            <View style={styles.formCard}>
              <AuthInput
                placeholder={t('Email')}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                allowedType="both"
                keyboardType="email-address"
                autoComplete="email"
                icon="mail-outline"
                error={fieldErrors.email}
              />
              <AuthInput
                placeholder={t('Password')}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                allowedType="both"
                secureTextEntry
                autoComplete="password"
                icon="lock-closed-outline"
                error={fieldErrors.password}
              />

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>{t('Forgot Password?')}</Text>
              </TouchableOpacity>

              <AuthButton title={t('Log In')} onPress={handleLogin} disabled={loading} loading={loading} />
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('or')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <GoogleSignInButton
                label={t('Continue with Google')}
                onPress={handleGoogleLogin}
                disabled={loading}
                loading={googleLoading}
              />
            </View>

            {/* Register Link */}
            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>{t("Don't have an account? ")}</Text>
              <TouchableOpacity onPress={() => router.push('/register')} activeOpacity={0.7}>
                <Text style={styles.linkHighlight}>{t('Register')}</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('Information for Developers')}</Text>
              <Text style={styles.footerContact}>
                {`${t('Problems? Contact support:')} office@victorakko.com`}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {(loading || googleLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: 13,
    marginHorizontal: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 15, 0.78)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 10, 15, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'auto',
  },
  checkingAuthWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    paddingBottom: 36,
    alignItems: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandLogo: {
    width: 240,
    height: 80,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  subheading: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 28,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(18, 22, 34, 0.82)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -2,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  linkText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  linkHighlight: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 4,
    fontFamily: 'Inter_400Regular',
  },
  footerContact: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
  },
});
