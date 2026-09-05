import { Platform } from 'react-native';

declare const process: { env?: Record<string, string | undefined> };

let cleanupStarted = false;

export function cleanupLocalWebServiceWorkers() {
  if (
    cleanupStarted
    || Platform.OS !== 'web'
    || process.env?.NODE_ENV === 'production'
    || typeof window === 'undefined'
    || !('serviceWorker' in navigator)
  ) {
    return;
  }

  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return;
  }

  cleanupStarted = true;
  void navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => {
      if (!('caches' in window)) {
        return null;
      }
      return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    })
    .catch(() => {
      // Local cleanup is best-effort; development must continue if the browser denies it.
    });
}
