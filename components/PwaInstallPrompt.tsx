import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const DISMISS_KEY = 'victory-pwa-install-dismissed-v1';

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isIosSafari() {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|chrome|android/.test(ua);
  return isIos && isSafari;
}

function hasDismissedPrompt() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismissPrompt() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Ignore storage issues. Install guidance should remain optional.
  }
}

function clearDismissPrompt() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    // Ignore storage issues. Install guidance should remain optional.
  }
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);
  const [iosHint, setIosHint] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    if (isStandaloneMode()) {
      clearDismissPrompt();
      setVisible(false);
      return;
    }

    const dismissed = hasDismissedPrompt();
    const iosFallback = isIosSafari();

    if (iosFallback && !dismissed) {
      setIosHint(true);
      setVisible(true);
    }

    const onBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setIosHint(false);
      if (!hasDismissedPrompt()) {
        setVisible(true);
      }
    };

    const onInstalled = () => {
      clearDismissPrompt();
      setDeferredPrompt(null);
      setVisible(false);
      setInstalling(false);
      setIosHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleClose = React.useCallback(() => {
    persistDismissPrompt();
    setVisible(false);
  }, []);

  const handleInstall = React.useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        clearDismissPrompt();
        setVisible(false);
      }
    } catch {
      // Ignore prompt failures. The browser controls this flow.
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (Platform.OS !== 'web' || !visible || isStandaloneMode()) {
    return null;
  }

  const title = iosHint ? 'Install Victory Fitness' : 'Install the app';
  const body = iosHint
    ? 'Open Safari Share and tap Add to Home Screen for the full app experience.'
    : 'Add Victory Fitness to your home screen for a faster, full-screen experience.';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>PWA READY</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <View style={styles.actions}>
          {iosHint ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void handleInstall();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                installing && styles.primaryButtonDisabled,
              ]}
              disabled={installing}
            >
              <Text style={styles.primaryButtonText}>{installing ? 'Installing...' : 'Install now'}</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={handleClose} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
            <Text style={styles.secondaryButtonText}>{iosHint ? 'Got it' : 'Maybe later'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    zIndex: 30,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.26)',
    backgroundColor: 'rgba(10, 16, 32, 0.96)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#020617',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  copy: {
    gap: 4,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: 11,
    letterSpacing: 1.6,
    fontFamily: 'Inter_700Bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Inter_700Bold',
  },
  body: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#04111C',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  secondaryButton: {
    minWidth: 104,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
  },
  secondaryButtonPressed: {
    opacity: 0.9,
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
