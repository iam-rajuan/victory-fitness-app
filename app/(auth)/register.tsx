import React, { useMemo, useState } from 'react';
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
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { InternationalPhoneField } from '../../components/InternationalPhoneField';
import { apiRequest, AuthResponse, clearAuthTokens, setAuthTokens } from '../../lib/api';
import { getPostAuthRoute, isAdminRestrictedFromApp } from '../../lib/access';
import { markBiometricSessionUnlocked, maybeOfferBiometricUnlock } from '../../lib/biometricUnlock';
import { formatAppError } from '../../lib/error';
import { signInWithFirebaseGoogle, signInWithGoogleBrowserOAuth, useGoogleIdTokenAuth } from '../../lib/firebaseGoogleAuth';
import { useLanguage } from '../../lib/i18n';
import { detectCountryFromDeviceLocale } from '../../lib/localeCountry';
import { replaceRoute } from '../../lib/navigation';
import { isE164PhoneNumber } from '../../lib/phone';

const { height } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { useDefaultLanguage, syncLanguageWithCurrentUser, t } = useLanguage();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { isConfigured: isGoogleConfigured, request: googleRequest, promptAsync } = useGoogleIdTokenAuth();
  const defaultPhoneCountryCode = useMemo(
    () => detectCountryFromDeviceLocale()?.country.dialCode || '+233',
    []
  );

  React.useEffect(() => {
    useDefaultLanguage();
  }, [useDefaultLanguage]);

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Please enter your name.';
    if (!surname.trim()) errors.surname = 'Please enter your surname.';
    if (!normalizedEmail) errors.email = 'Please enter your email.';
    if (!normalizedMobile) {
      errors.mobile = 'Please enter your mobile number.';
    } else if (!isE164PhoneNumber(normalizedMobile)) {
      errors.mobile = 'Use international format like +233XXXXXXXXX.';
    }
    if (!password) errors.password = 'Please enter your password.';
    if (!marketingConsent) errors.marketingConsent = 'You must check the agreement box to register.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorDialog({
        title: 'Agreement & Information Required',
        message: !marketingConsent && Object.keys(errors).length === 1
          ? 'Please check the box to agree to terms before registering.'
          : 'Please complete all required fields and agree to the terms to continue.',
      });
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          surname: surname.trim(),
          email: normalizedEmail,
          mobile: normalizedMobile,
          password,
          marketing_consent: marketingConsent,
          signup_source: String(source || 'organic').trim().slice(0, 120) || 'organic',
        },
      });
      router.push({
        pathname: '/verification',
        params: { email: normalizedEmail },
      });
    } catch (error) {
      setErrorDialog(formatAppError(error));
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleAuth = async (auth: AuthResponse) => {
    if (isAdminRestrictedFromApp(auth.user)) {
      await clearAuthTokens();
      useDefaultLanguage();
      setErrorDialog({
        title: 'App access restricted',
        message: 'Admin accounts can only sign in to the Victory Fitness dashboard.',
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

  const handleGoogleRegister = async () => {
    if (Platform.OS !== 'web' && (!isGoogleConfigured || !googleRequest)) {
      setErrorDialog({
        title: 'Google sign-in unavailable',
        message: 'Google sign-in is not configured for this app environment yet.',
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
          title: 'Google sign-in cancelled',
          message: 'The Google sign-in flow was cancelled before completion.',
        });
        return;
      }
      if (result.type !== 'success') {
        setErrorDialog({
          title: 'Google sign-in failed',
          message: 'We could not complete Google sign-in. Please try again.',
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

  return (
    <ImageBackground
      source={require('../../assets/w4.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ErrorPopupModal
          visible={Boolean(errorDialog)}
          title={errorDialog?.title ?? 'Error'}
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
            <Text style={styles.heading}>CREATE ACCOUNT</Text>
            <Text style={styles.subheading}>Start your fitness journey</Text>

            {/* Glassmorphic Form Card */}
            <View style={styles.formCard}>
              <AuthInput
                placeholder="Name"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                allowedType="string"
                autoCapitalize="words"
                autoComplete="name"
                icon="person-outline"
                error={fieldErrors.name}
              />
              <AuthInput
                placeholder="Surname"
                value={surname}
                onChangeText={(val) => {
                  setSurname(val);
                  if (fieldErrors.surname) setFieldErrors((prev) => ({ ...prev, surname: '' }));
                }}
                allowedType="string"
                autoCapitalize="words"
                autoComplete="name-family"
                icon="person-outline"
                error={fieldErrors.surname}
              />
              <AuthInput
                placeholder="Email"
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
              <InternationalPhoneField
                label="Mobile Number"
                value={mobile}
                onChangeText={(val) => {
                  setMobile(val);
                  if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: '' }));
                }}
                placeholder="24 123 4567"
                helperText="Choose your country code first, then enter the rest of your phone number."
                error={fieldErrors.mobile}
                defaultCountryCode={defaultPhoneCountryCode}
              />
              <AuthInput
                placeholder="Password"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                allowedType="both"
                secureTextEntry
                autoComplete="password-new"
                icon="lock-closed-outline"
                error={fieldErrors.password}
              />

              {/* Marketing Consent Option */}
              <View style={styles.consentWrapper}>
                <Pressable
                  style={styles.consentRow}
                  onPress={() => {
                    setMarketingConsent((value) => {
                      const next = !value;
                      if (next && fieldErrors.marketingConsent) {
                        setFieldErrors((prev) => ({ ...prev, marketingConsent: '' }));
                      }
                      return next;
                    });
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marketingConsent }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      marketingConsent && styles.checkboxChecked,
                      Boolean(fieldErrors.marketingConsent) && styles.checkboxError,
                    ]}
                  >
                    {marketingConsent ? (
                      <Ionicons name="checkmark-sharp" size={14} color="#051614" />
                    ) : null}
                  </View>
                  <Text style={[styles.consentText, Boolean(fieldErrors.marketingConsent) && styles.consentTextError]}>
                    I agree to receive occasional email or SMS messages about my trial, useful tips, and future offers. I can opt out anytime.
                  </Text>
                </Pressable>

                {fieldErrors.marketingConsent ? (
                  <View style={styles.consentErrorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" style={styles.errorIcon} />
                    <Text style={styles.consentErrorText}>{fieldErrors.marketingConsent}</Text>
                  </View>
                ) : null}
              </View>

              <AuthButton title="Register" onPress={handleRegister} disabled={loading} loading={loading} />
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <GoogleSignInButton
                label="Continue with Google"
                onPress={handleGoogleRegister}
                disabled={loading}
                loading={googleLoading}
              />
            </View>

            {/* Login Link */}
            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
                <Text style={styles.linkHighlight}>Log In</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Information for Developers</Text>
              <Text style={styles.footerContact}>
                Problems? Contact support: office@victorakko.com
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.06,
    paddingBottom: 36,
    alignItems: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 24,
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
  consentWrapper: {
    width: '100%',
    marginTop: 4,
    marginBottom: 20,
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
  consentRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 12,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  checkboxError: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  consentText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  consentTextError: {
    color: '#F87171',
  },
  consentErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 34,
  },
  errorIcon: {
    marginRight: 4,
  },
  consentErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
    marginBottom: 16,
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
    marginTop: 24,
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
