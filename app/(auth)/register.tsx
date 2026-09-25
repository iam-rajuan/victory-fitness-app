import React, { useMemo, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { apiRequest, AuthResponse, clearAuthTokens, setAuthTokens } from '../../lib/api';
import { getPostAuthRoute, isAdminRestrictedFromApp } from '../../lib/access';
import { markBiometricSessionUnlocked, maybeOfferBiometricUnlock } from '../../lib/biometricUnlock';
import { formatAppError } from '../../lib/error';
import { signInWithFirebaseGoogle, signInWithGoogleBrowserOAuth, useGoogleIdTokenAuth } from '../../lib/firebaseGoogleAuth';
import { useLanguage } from '../../lib/i18n';
import { detectCountryFromDeviceLocale } from '../../lib/localeCountry';
import { pushRoute, replaceRoute } from '../../lib/navigation';
import { isE164PhoneNumber } from '../../lib/phone';
import {
  ONBOARDING_ANSWERS_KEY,
  ONBOARDING_STEP_KEY,
} from '../../components/onboarding/ClaudeOnboardingFlow';

type RegionKey = 'de' | 'gh' | 'in' | 'uk' | 'us';

const REGIONS: Record<
  RegionKey,
  { dial: string; sample: string; n: string; note: string }
> = {
  de: {
    dial: '+49',
    sample: '171 555 0148',
    n: 'Germany',
    note: 'Sets your currency, your payment options and the clock your reminders run on. You can change it later.',
  },
  gh: {
    dial: '+233',
    sample: '24 000 0000',
    n: 'Ghana',
    note: 'Prices in cedis, charged locally — no foreign-card fee. Mobile Money first.',
  },
  in: {
    dial: '+91',
    sample: '98 0000 0000',
    n: 'India',
    note: 'The app stays in English in India — only prices and payment become local.',
  },
  uk: {
    dial: '+44',
    sample: '7700 900148',
    n: 'United Kingdom',
    note: 'Prices in pounds. Cancel any time from your profile.',
  },
  us: {
    dial: '+1',
    sample: '(415) 555-0148',
    n: 'United States',
    note: 'Prices in dollars. Sales tax added at checkout where it applies.',
  },
};

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    source?: string;
    inviter_id?: string;
    challenge_id?: string;
    invite_id?: string;
    referral_code?: string;
  }>();
  const source = params.source;
  const { useDefaultLanguage, syncLanguageWithCurrentUser } = useLanguage();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true);

  // Region selection
  const detectedLocale = useMemo(() => detectCountryFromDeviceLocale(), []);
  const initialRegionKey: RegionKey = useMemo(() => {
    const code = (detectedLocale?.country.code || 'DE').toLowerCase();
    if (code in REGIONS) return code as RegionKey;
    if (code === 'gb') return 'uk';
    return 'de';
  }, [detectedLocale]);

  const [selectedRegion, setSelectedRegion] = useState<RegionKey>(initialRegionKey);
  const currentRegion = REGIONS[selectedRegion];

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { isConfigured: isGoogleConfigured, request: googleRequest, promptAsync } = useGoogleIdTokenAuth();

  React.useEffect(() => {
    useDefaultLanguage();
  }, [useDefaultLanguage]);

  const handleRegister = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = rawPhone.trim().replace(/[\s()-]+/g, '');
    const fullMobile = cleanPhone.startsWith('+')
      ? cleanPhone
      : `${currentRegion.dial}${cleanPhone.replace(/^0+/, '')}`;

    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Please enter your first name.';
    if (!surname.trim()) errors.surname = 'Please enter your surname.';
    if (!normalizedEmail) errors.email = 'Please enter your email.';
    if (!cleanPhone) {
      errors.mobile = 'Please enter your mobile number.';
    } else if (!isE164PhoneNumber(fullMobile)) {
      errors.mobile = `Invalid format for ${currentRegion.dial}. E.g. ${currentRegion.sample}`;
    }
    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    if (!marketingConsent) {
      errors.marketingConsent = 'You must agree to continue.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorDialog({
        title: 'Information Required',
        message: errors.marketingConsent && Object.keys(errors).length === 1
          ? 'Please agree to terms before continuing.'
          : Object.values(errors)[0] || 'Please complete all fields.',
      });
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await AsyncStorage.multiRemove([ONBOARDING_STEP_KEY, ONBOARDING_ANSWERS_KEY]).catch(() => {});
      if (params.challenge_id) {
        await AsyncStorage.setItem('@pending_challenge_id', String(params.challenge_id));
      }
      await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          surname: surname.trim(),
          email: normalizedEmail,
          mobile: fullMobile,
          password,
          marketing_consent: marketingConsent,
          signup_source: String(source || (params.challenge_id ? 'challenge_invite' : 'organic')).trim().slice(0, 120) || 'organic',
          inviter_id: params.inviter_id,
          invite_id: params.invite_id,
          challenge_id: params.challenge_id,
          referral_code: params.referral_code,
        },
      });
      router.push({
        pathname: '/verification',
        params: {
          email: normalizedEmail,
          challenge_id: params.challenge_id,
        },
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
        [
          { text: 'Choose your subscription', onPress: () => replaceRoute(router, '/plan') },
          { text: 'Continue', style: 'cancel', onPress: () => replaceRoute(router, getPostAuthRoute(auth.user)) },
        ]
      );
      return;
    }
    await AsyncStorage.multiRemove([ONBOARDING_STEP_KEY, ONBOARDING_ANSWERS_KEY]).catch(() => {});
    const pendingChallengeId = params.challenge_id || (await AsyncStorage.getItem('@pending_challenge_id'));
    if (pendingChallengeId) {
      await AsyncStorage.removeItem('@pending_challenge_id');
      replaceRoute(router, `/challenges/${pendingChallengeId}` as any);
      return;
    }
    const postAuthRoute = getPostAuthRoute(auth.user);
    replaceRoute(router, postAuthRoute === '/onboarding' ? '/onboarding?step=2' : postAuthRoute);
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

  const isDesktop = Platform.OS === 'web' && width > 480;

  return (
    <View style={styles.root}>
      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title ?? 'Error'}
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
          <View style={[styles.deviceFrame, isDesktop && styles.deviceFrameDesktop]}>
            {/* Back button ← */}
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : replaceRoute(router, '/welcome')}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.backText}>←</Text>
            </Pressable>

            {/* Title & Subtitle */}
            <Text style={styles.title}>One account, no forms</Text>
            <Text style={styles.subtitle}>
              Nothing is charged yet. You can see your whole plan before you decide anything.
            </Text>

            {/* Challenge Invite Banner if present */}
            {params.challenge_id ? (
              <View style={styles.challengeBanner}>
                <Text style={styles.challengeKicker}>CHALLENGE INVITE</Text>
                <Text style={styles.challengeTitle}>You've been invited to join a Challenge!</Text>
                <Text style={styles.challengeDesc}>
                  Create your account to accept the invite and preview the training schedule.
                </Text>
              </View>
            ) : null}

            {/* Continue with Google */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleRegister}
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

            {/* Divider: OR SIGN UP WITH EMAIL */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN UP WITH EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Navy Form Card */}
            <View style={styles.formCard}>
              {/* First Name */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>FIRST NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Your first name"
                  placeholderTextColor="rgba(247,243,238,.35)"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {fieldErrors.name ? <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text> : null}
              </View>

              {/* Surname */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>SURNAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={surname}
                  onChangeText={(val) => {
                    setSurname(val);
                    if (fieldErrors.surname) setFieldErrors((prev) => ({ ...prev, surname: '' }));
                  }}
                  placeholder="Your surname"
                  placeholderTextColor="rgba(247,243,238,.35)"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {fieldErrors.surname ? <Text style={styles.fieldErrorText}>{fieldErrors.surname}</Text> : null}
              </View>

              {/* Email */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <TextInput
                  style={[styles.textInput, styles.monoInput]}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="you@email.com"
                  placeholderTextColor="rgba(247,243,238,.35)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {fieldErrors.email ? <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text> : null}
              </View>

              {/* Mobile Number */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.phoneDialBadge}>
                    <Text style={styles.phoneDialText}>{currentRegion.dial}</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.monoInput, { flex: 1 }]}
                    value={rawPhone}
                    onChangeText={(val) => {
                      setRawPhone(val);
                      if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: '' }));
                    }}
                    placeholder={currentRegion.sample}
                    placeholderTextColor="rgba(247,243,238,.35)"
                    keyboardType="phone-pad"
                  />
                </View>
                {fieldErrors.mobile ? <Text style={styles.fieldErrorText}>{fieldErrors.mobile}</Text> : null}
              </View>

              {/* Password */}
              <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.textInput, styles.monoInput, { flex: 1 }]}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="at least 8 characters"
                    placeholderTextColor="rgba(247,243,238,.35)"
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
            </View>

            {/* Region Selector Card: WHERE ARE YOU? */}
            <View style={styles.regionCard}>
              <View style={styles.regionHeader}>
                <Text style={styles.regionKicker}>WHERE ARE YOU?</Text>
                <Text style={styles.regionDetected}>
                  DETECTED · {currentRegion.n.toUpperCase()}
                </Text>
              </View>
              <View style={styles.chipsContainer}>
                {(Object.keys(REGIONS) as RegionKey[]).map((k) => {
                  const active = k === selectedRegion;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setSelectedRegion(k)}
                      style={[
                        styles.chip,
                        active ? styles.chipActive : styles.chipInactive,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active ? styles.chipTextActive : styles.chipTextInactive,
                        ]}
                      >
                        {REGIONS[k].n}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.regionNote}>{currentRegion.note}</Text>
            </View>

            {/* Marketing & Terms Consent Checkbox */}
            <Pressable
              style={styles.consentRow}
              onPress={() => setMarketingConsent((prev) => !prev)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marketingConsent }}
            >
              <View style={[styles.checkbox, marketingConsent && styles.checkboxChecked]}>
                {marketingConsent ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.consentText}>
                I agree to receive occasional updates about my plan, training tips, and offers. I can opt out anytime.
              </Text>
            </Pressable>

            {/* Primary Continue CTA */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleRegister}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0D0D0D" />
              ) : (
                <Text style={styles.ctaButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Privacy Footnote */}
            <Text style={styles.footnote}>
              Your data stays in the EU. We never sell it, and you can export or delete everything from your profile in two taps.
            </Text>

            {/* Already have an account? Sign in */}
            <View style={styles.signinRow}>
              <Text style={styles.signinPrompt}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => pushRoute(router, '/login')}
                activeOpacity={0.7}
              >
                <Text style={styles.signinHighlight}>Sign in</Text>
              </TouchableOpacity>
            </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#0D0D0D',
  },
  deviceFrame: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 26,
    paddingTop: Platform.OS === 'web' ? 36 : 54,
    paddingBottom: 40,
    backgroundColor: '#0D0D0D',
  },
  deviceFrameDesktop: {
    maxWidth: 520,
    paddingHorizontal: 32,
    paddingTop: 40,
  },

  // Back Button ←
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    marginBottom: 4,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(247,243,238,0.55)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Header
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 35.2, // 32px * 1.1
    fontWeight: '600',
    color: '#F7F3EE',
    letterSpacing: -0.5,
    marginTop: 14,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Clash Display', 'DM Sans', sans-serif" } as any) : {}),
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14.5,
    lineHeight: 23.2, // 14.5px * 1.6
    fontWeight: '400',
    color: 'rgba(247,243,238,0.6)',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif", textWrap: 'pretty' } as any) : {}),
  },

  // Challenge Banner
  challengeBanner: {
    backgroundColor: '#0D2B45',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#C9943A',
    padding: 14,
    marginBottom: 16,
  },
  challengeKicker: {
    fontSize: 10,
    letterSpacing: 1.3,
    fontFamily: Fonts.heading,
    fontWeight: '700',
    color: '#C9943A',
    marginBottom: 4,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F7F3EE',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.7)',
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
    marginBottom: 10,
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
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(247,243,238,0.14)',
  },
  dividerText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.4)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Form Card
  formCard: {
    backgroundColor: '#0D2B45',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,243,238,0.1)',
  },
  fieldLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.45)',
    marginBottom: 6,
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  textInput: {
    fontFamily: Fonts.body,
    fontSize: 15.5,
    fontWeight: '500',
    color: '#F7F3EE',
    padding: 0,
    margin: 0,
    ...(Platform.OS === 'web'
      ? ({
          fontFamily: "'DM Sans', sans-serif",
          outlineStyle: 'none',
        } as any)
      : {}),
  },
  monoInput: {
    fontFamily: Fonts.data,
    fontSize: 15,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'JetBrains Mono', monospace" } as any) : {}),
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneDialBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(201,148,58,0.14)',
  },
  phoneDialText: {
    fontFamily: Fonts.dataBold,
    fontSize: 13,
    color: '#C9943A',
    fontWeight: '700',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'JetBrains Mono', monospace" } as any) : {}),
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  passwordToggleText: {
    fontFamily: Fonts.heading,
    fontSize: 11,
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

  // Region Selector Card
  regionCard: {
    backgroundColor: '#0D2B45',
    borderRadius: 14,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#B5651D',
    marginBottom: 14,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  regionKicker: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '500',
    color: '#C9943A',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  regionDetected: {
    fontFamily: Fonts.data,
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.5)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'JetBrains Mono', monospace" } as any) : {}),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderRadius: 99,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  chipActive: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#C9943A',
  },
  chipInactive: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.24)',
  },
  chipText: {
    fontFamily: Fonts.heading,
    fontSize: 12.5,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  chipTextActive: {
    color: '#0D0D0D',
    fontWeight: '700',
  },
  chipTextInactive: {
    color: 'rgba(247,243,238,0.72)',
    fontWeight: '500',
  },
  regionNote: {
    marginVertical: 0,
    marginTop: 11,
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.6)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },

  // Consent Row
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,238,0.3)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#C9943A',
    borderColor: '#C9943A',
  },
  checkmark: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  consentText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.65)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },

  // CTA Button
  ctaButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: '#C9943A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  ctaButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#0D0D0D',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Footnote
  footnote: {
    marginTop: 16,
    fontFamily: Fonts.body,
    fontSize: 11.5,
    lineHeight: 18.4, // 11.5px * 1.6
    color: 'rgba(247,243,238,0.42)',
    textAlign: 'left',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },

  // Sign In Row
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  signinPrompt: {
    fontFamily: Fonts.body,
    fontSize: 13.5,
    color: 'rgba(247,243,238,0.5)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },
  signinHighlight: {
    fontFamily: Fonts.heading,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#C9943A',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
});
