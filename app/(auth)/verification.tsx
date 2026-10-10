import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { StatusBar } from 'expo-status-bar';

import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { apiRequest, AuthResponse, setAuthTokens } from '../../lib/api';
import { getPostAuthRoute } from '../../lib/access';
import { markBiometricSessionUnlocked, maybeOfferBiometricUnlock } from '../../lib/biometricUnlock';
import { formatAppError } from '../../lib/error';
import { replaceRoute } from '../../lib/navigation';
import {
  ONBOARDING_ANSWERS_KEY,
  ONBOARDING_STEP_KEY,
} from '../../components/onboarding/ClaudeOnboardingFlow';

// Claude Design Reference Palette
const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const RESEND_COOLDOWN_SECONDS = 120; // 2 minutes cooldown

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function VerificationScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const params = useLocalSearchParams<{ email?: string; challenge_id?: string; from?: string }>();
  const email = (params.email ?? '').trim().toLowerCase();

  const codeInputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Blinking gold cursor animation
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0.1,
          duration: 450,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [cursorOpacity]);

  // Resend countdown timer
  useEffect(() => {
    if (resendSeconds === 0) return;
    const timer = setInterval(() => {
      setResendSeconds((curr) => Math.max(curr - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleCodeChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '').slice(0, 4);
    setCode(cleanDigits);
  };

  const handleVerify = async () => {
    if (!email || !/^\d{4}$/.test(code)) {
      setErrorDialog({
        title: 'Verification Code Required',
        message: 'Please enter the 4-digit code sent to your email.',
      });
      return;
    }

    setLoading(true);
    try {
      const auth = await apiRequest<AuthResponse>('/auth/verify-email', {
        method: 'POST',
        body: { email, code },
      });
      await setAuthTokens(auth);
      markBiometricSessionUnlocked();
      void maybeOfferBiometricUnlock(auth.user);
      await AsyncStorage.multiRemove([ONBOARDING_STEP_KEY, ONBOARDING_ANSWERS_KEY]).catch(() => {});

      const pendingChallengeId = params.challenge_id || (await AsyncStorage.getItem('@pending_challenge_id'));
      if (pendingChallengeId) {
        await AsyncStorage.removeItem('@pending_challenge_id');
        replaceRoute(router, `/challenges/${pendingChallengeId}` as any);
        return;
      }
      const postAuthRoute = getPostAuthRoute(auth.user, params.from);
      replaceRoute(router, postAuthRoute === '/onboarding' ? '/onboarding?step=2' : postAuthRoute);
    } catch (error) {
      setErrorDialog(formatAppError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorDialog({
        title: 'Missing Email',
        message: 'Please return to registration and enter your email again.',
      });
      return;
    }

    if (resendSeconds > 0 || resending) return;

    setResending(true);
    setResendSuccess(false);
    try {
      await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (error) {
      setErrorDialog(formatAppError(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
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
          contentContainerStyle={[styles.scrollContent, isDesktop && styles.desktopScrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.container, isDesktop && styles.desktopContainer]}>
            {/* Top Navigation */}
            <View style={styles.topNav}>
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : replaceRoute(router, '/register')}
                hitSlop={12}
                style={styles.backButton}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
            </View>

            {/* Kicker & Headers */}
            <Text style={styles.kicker}>SECURITY CHECK</Text>
            <h1 style={{ margin: 0 } as any}>
              <Text style={styles.heading}>Check your email</Text>
            </h1>
            <Text style={styles.subheading}>
              We sent a 4-digit verification code to{' '}
              <Text style={styles.emailHighlight}>{email || 'your email'}</Text>. Enter it below to confirm your
              account and continue.
            </Text>

            {/* OTP Form Card */}
            <View style={styles.navyCard}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => codeInputRef.current?.focus()}
                style={styles.otpRow}
              >
                {[0, 1, 2, 3].map((index) => {
                  const digit = code[index] ?? '';
                  const isActive = isFocused && (index === code.length || (index === 3 && code.length === 4));

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpCell,
                        digit ? styles.otpCellFilled : null,
                        isActive ? styles.otpCellActive : null,
                      ]}
                    >
                      {digit ? (
                        <Text style={styles.otpDigit}>{digit}</Text>
                      ) : isActive ? (
                        <Animated.View style={[styles.cursorBar, { opacity: cursorOpacity }]} />
                      ) : null}
                    </View>
                  );
                })}
              </TouchableOpacity>

              {/* Hidden Native Input */}
              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={4}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                caretHidden
                style={styles.hiddenInput}
                autoFocus
              />

              {/* Countdown / Resend status */}
              <View style={styles.resendRow}>
                {resendSeconds > 0 ? (
                  <>
                    <Text style={styles.resendText}>Resend code in </Text>
                    <Text style={styles.resendTimer}>{formatCountdown(resendSeconds)}</Text>
                  </>
                ) : (
                  <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
                    <Text style={styles.resendLink}>
                      {resending ? 'Sending new code...' : "Didn't receive code? Resend now"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {resendSuccess && (
                <Text style={styles.resendSuccessNote}>A new code has been sent to your email.</Text>
              )}

              {/* Confirm & Continue CTA */}
              <Pressable
                style={[styles.ctaButton, (loading || code.length < 4) && styles.ctaButtonDisabled]}
                onPress={handleVerify}
                disabled={loading || code.length < 4}
              >
                {loading ? (
                  <ActivityIndicator color={OBSIDIAN} size="small" />
                ) : (
                  <Text style={styles.ctaButtonText}>Confirm and continue</Text>
                )}
              </Pressable>
            </View>

            {/* Assistance & Privacy Guarantee */}
            <View style={styles.footerGuarantees}>
              <View style={styles.guaranteeRow}>
                <View style={styles.greenDot} />
                <Text style={styles.guaranteeText}>
                  Codes expire in 10 minutes. Check your spam folder if it doesn't appear.
                </Text>
              </View>
              <View style={styles.guaranteeRow}>
                <View style={styles.greenDot} />
                <Text style={styles.guaranteeText}>
                  Your data stays in the EU and is never shared with third parties.
                </Text>
              </View>
            </View>

            {/* Wrong Email Link */}
            <TouchableOpacity
              onPress={() => replaceRoute(router, '/register')}
              style={styles.wrongEmailBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.wrongEmailText}>Wrong email address? Register again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: 'center',
  },
  desktopScrollContent: {
    paddingTop: 70,
  },
  container: {
    width: '100%',
    maxWidth: 480,
  },
  desktopContainer: {
    maxWidth: 480,
  },
  topNav: {
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingRight: 16,
  },
  backArrow: {
    fontFamily: DMSANS,
    fontSize: 22,
    color: 'rgba(247,243,238,0.6)',
    fontWeight: '700',
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: COPPER,
    marginBottom: 8,
  },
  heading: {
    fontFamily: CLASH,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    color: IVORY,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247,243,238,0.65)',
    marginBottom: 26,
  },
  emailHighlight: {
    color: IVORY,
    fontWeight: '600',
  },
  navyCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.12)',
    alignItems: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 20,
    marginTop: 4,
  },
  otpCell: {
    width: 62,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'rgba(247,243,238,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,238,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    borderColor: GOLD,
    backgroundColor: 'rgba(201,148,58,0.06)',
  },
  otpCellActive: {
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: 'rgba(201,148,58,0.1)',
  },
  otpDigit: {
    fontFamily: MONO,
    fontSize: 26,
    fontWeight: '700',
    color: IVORY,
  },
  cursorBar: {
    width: 2.5,
    height: 26,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontFamily: INTER,
    fontSize: 13,
    color: 'rgba(247,243,238,0.55)',
  },
  resendTimer: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
  },
  resendLink: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '600',
    color: GOLD,
  },
  resendSuccessNote: {
    fontFamily: INTER,
    fontSize: 12,
    color: '#1A7A4A',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaButtonDisabled: {
    opacity: 0.45,
  },
  ctaButtonText: {
    fontFamily: DMSANS,
    fontSize: 16.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  footerGuarantees: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.12)',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#1A7A4A',
    marginTop: 6,
    flexShrink: 0,
  },
  guaranteeText: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.7)',
  },
  wrongEmailBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  wrongEmailText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.5)',
  },
});
