import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import type { AuthUser } from './api';

const BIOMETRIC_ENABLED_KEY_PREFIX = 'victory-biometric-enabled:user:';
const BIOMETRIC_DECISION_KEY_PREFIX = 'victory-biometric-decision:user:';
let biometricUnlockedForSession = false;

function getEnabledKey(userId: string) {
  return `${BIOMETRIC_ENABLED_KEY_PREFIX}${userId}`;
}

function getDecisionKey(userId: string) {
  return `${BIOMETRIC_DECISION_KEY_PREFIX}${userId}`;
}

export function isBiometricPlatformSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function markBiometricSessionUnlocked() {
  biometricUnlockedForSession = true;
}

export function markBiometricSessionLocked() {
  biometricUnlockedForSession = false;
}

export function isBiometricSessionUnlocked() {
  return biometricUnlockedForSession;
}

export async function getBiometricAvailability() {
  if (!isBiometricPlatformSupported()) {
    return { available: false, label: 'biometric unlock' };
  }

  const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync().catch(() => false),
    LocalAuthentication.isEnrolledAsync().catch(() => false),
    LocalAuthentication.supportedAuthenticationTypesAsync().catch((): LocalAuthentication.AuthenticationType[] => []),
  ]);

  const usesFace = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const usesFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const label = usesFace ? 'Face ID' : usesFingerprint ? 'fingerprint' : 'biometric unlock';

  return {
    available: Boolean(hasHardware && isEnrolled),
    label,
  };
}

export async function isBiometricUnlockEnabled(userId?: string | null) {
  if (!userId || !isBiometricPlatformSupported()) {
    return false;
  }
  return (await AsyncStorage.getItem(getEnabledKey(userId))) === '1';
}

export async function setBiometricUnlockEnabled(userId: string, enabled: boolean) {
  await AsyncStorage.setItem(getDecisionKey(userId), enabled ? 'enabled' : 'declined');
  if (enabled) {
    await AsyncStorage.setItem(getEnabledKey(userId), '1');
  } else {
    await AsyncStorage.removeItem(getEnabledKey(userId));
  }
}

export async function authenticateWithBiometrics(reason = 'Unlock Victory Fitness') {
  const availability = await getBiometricAvailability();
  if (!availability.available) {
    return { success: false, error: 'Biometric unlock is not available on this device.' };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  }).catch(() => ({ success: false as const }));

  if (result.success) {
    markBiometricSessionUnlocked();
    return { success: true, error: '' };
  }

  return { success: false, error: 'Biometric unlock was cancelled or did not match.' };
}

export async function maybeOfferBiometricUnlock(user: AuthUser) {
  if (!user?.id || !isBiometricPlatformSupported()) {
    return;
  }

  const [availability, decision, enabled] = await Promise.all([
    getBiometricAvailability(),
    AsyncStorage.getItem(getDecisionKey(user.id)),
    isBiometricUnlockEnabled(user.id),
  ]);

  if (!availability.available || decision || enabled) {
    return;
  }

  Alert.alert(
    `Enable ${availability.label}?`,
    `Use ${availability.label} to unlock Victory Fitness faster on this device.`,
    [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => {
          void setBiometricUnlockEnabled(user.id, false);
        },
      },
      {
        text: 'Enable',
        onPress: () => {
          void authenticateWithBiometrics(`Enable ${availability.label}`)
            .then((result) => setBiometricUnlockEnabled(user.id, result.success));
        },
      },
    ],
  );
}
