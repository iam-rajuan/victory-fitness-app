import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useRouter } from 'expo-router';

import { ErrorPopupModal } from '../components/ErrorPopupModal';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import { apiRequest } from '../lib/api';
import { formatAppError } from '../lib/error';
import { pushRoute, replaceRoute } from '../lib/navigation';

const VF_LOGO = require('../assets/images/onboarding/vf-logo-white.png');

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  const showError = (error: unknown, fallback?: string) =>
    setErrorDialog(formatAppError(error, fallback));

  const requestCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorDialog({
        title: 'Email required',
        message: 'Enter the email address used for your Victory Fitness account.',
      });
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: normalizedEmail },
      });
      setEmail(normalizedEmail);
      setStep('code');
    } catch (error) {
      showError(error, 'Unable to send the reset code right now.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 4) {
      setErrorDialog({
        title: 'Invalid code',
        message: 'Enter the 4-digit code from your email.',
      });
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<{ reset_token: string }>(
        '/auth/verify-reset-code',
        {
          method: 'POST',
          body: { email, code: cleanCode },
        }
      );
      setResetToken(response.reset_token);
      setStep('password');
    } catch (error) {
      showError(error, 'That reset code is not valid.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) {
      setErrorDialog({
        title: 'Password too short',
        message: 'Your new password must be at least 8 characters.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorDialog({
        title: 'Passwords do not match',
        message: 'Enter the same new password in both fields.',
      });
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { reset_token: resetToken, new_password: newPassword },
      });
      setSuccess(true);
    } catch (error) {
      showError(error, 'Unable to reset your password right now.');
    } finally {
      setLoading(false);
    }
  };

  const isWide = Platform.OS === 'web' && width > 768;

  const kicker = success
    ? 'SUCCESS'
    : step === 'email'
    ? 'ACCOUNT RECOVERY'
    : step === 'code'
    ? 'VERIFICATION'
    : 'NEW CREDENTIALS';

  const heading = success
    ? 'Password updated'
    : step === 'email'
    ? 'Forgot your password?'
    : step === 'code'
    ? 'Check your email'
    : 'Set new password';

  const subtitle = success
    ? 'Your password has been updated. You can now sign in with your new password.'
    : step === 'email'
    ? 'Enter your email address and we will send you a code to reset your password.'
    : step === 'code'
    ? `We sent a code to ${email}. Enter it below to proceed.`
    : 'Choose a secure password with at least 8 characters.';

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
          {/* Header with Logo */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={() => pushRoute(router, '/login')}
              activeOpacity={0.8}
            >
              <Image source={VF_LOGO} style={styles.logo} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          {/* Form Container */}
          <View style={styles.container}>
            {/* Top Back Arrow when in step 'code' or 'password' */}
            {!success && step !== 'email' ? (
              <Pressable
                onPress={() => setStep(step === 'password' ? 'code' : 'email')}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text style={styles.backText}>←</Text>
              </Pressable>
            ) : null}

            {/* Kicker & Heading */}
            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.heading}>{heading}</Text>
            <Text style={styles.subheading}>{subtitle}</Text>

            {/* Navy Card for Inputs */}
            {!success ? (
              <View style={styles.formCard}>
                {step === 'email' ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>EMAIL</Text>
                    <TextInput
                      style={[styles.textInput, styles.monoInput]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@email.com"
                      placeholderTextColor="#9C968E"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                ) : null}

                {step === 'code' ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>RESET CODE</Text>
                    <TextInput
                      style={[styles.textInput, styles.codeMonoInput]}
                      value={code}
                      onChangeText={setCode}
                      placeholder="••••"
                      placeholderTextColor="#9C968E"
                      keyboardType="number-pad"
                      maxLength={6}
                      autoCapitalize="none"
                    />
                  </View>
                ) : null}

                {step === 'password' ? (
                  <>
                    <View style={[styles.fieldRow, styles.fieldRowBorder]}>
                      <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[styles.textInput, styles.monoInput, { flex: 1 }]}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder="at least 8 characters"
                          placeholderTextColor="#9C968E"
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword((prev) => !prev)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.passwordToggleText}>
                            {showPassword ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                      <View style={styles.passwordRow}>
                        <TextInput
                          style={[styles.textInput, styles.monoInput, { flex: 1 }]}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="re-type password"
                          placeholderTextColor="#9C968E"
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword((prev) => !prev)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.passwordToggleText}>
                            {showConfirmPassword ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            {/* Primary Action Button */}
            {!success ? (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={
                  step === 'email'
                    ? requestCode
                    : step === 'code'
                    ? verifyCode
                    : resetPassword
                }
                activeOpacity={0.88}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0D0D0D" />
                ) : (
                  <Text style={styles.ctaButtonText}>
                    {step === 'email'
                      ? 'Send code'
                      : step === 'code'
                      ? 'Verify code'
                      : 'Update password'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => replaceRoute(router, '/login')}
                activeOpacity={0.88}
              >
                <Text style={styles.ctaButtonText}>Back to Sign in</Text>
              </TouchableOpacity>
            )}

            {/* Resend Code Action */}
            {!success && step === 'code' ? (
              <TouchableOpacity
                style={styles.resendRow}
                onPress={requestCode}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
                <Text style={styles.resendHighlight}>Resend code</Text>
              </TouchableOpacity>
            ) : null}

            {/* Back to Sign in link */}
            <View style={styles.backRow}>
              <TouchableOpacity
                onPress={() => pushRoute(router, '/login')}
                activeOpacity={0.7}
              >
                <Text style={styles.backLinkText}>← Back to Sign in</Text>
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

  // Centered Container
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingTop: 36,
  },

  // Back Button ←
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    marginBottom: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  backText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(247,243,238,0.55)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Typography
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
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '600',
    color: '#F7F3EE',
    letterSpacing: -0.8,
    marginBottom: 12,
    marginVertical: 0,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Clash Display', 'DM Sans', sans-serif" } as any) : {}),
  },
  subheading: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    color: '#D6D0C8',
    marginBottom: 24,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif", textWrap: 'pretty' } as any) : {}),
  },

  // Form Card
  formCard: {
    backgroundColor: '#0D2B45',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
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
  codeMonoInput: {
    fontFamily: Fonts.dataBold,
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '700',
    color: '#C9943A',
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

  // Resend code
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  resendPrompt: {
    fontFamily: Fonts.body,
    fontSize: 13.5,
    color: '#B8B2AA',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'Inter', sans-serif" } as any) : {}),
  },
  resendHighlight: {
    fontFamily: Fonts.heading,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#C9943A',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Back to Sign In Link
  backRow: {
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  backLinkText: {
    fontFamily: Fonts.heading,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#C9943A',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
});
