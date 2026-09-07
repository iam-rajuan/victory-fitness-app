import { Platform, Vibration } from 'react-native';

export function triggerRestTimerFinishedAlert() {
  // 1. Silent-mode friendly native vibration pattern: vibrate 500ms, pause 200ms, vibrate 500ms
  try {
    Vibration.vibrate([0, 500, 200, 500]);
  } catch {}

  // 2. Audible chime alert
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        // Double alert beep
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    }
  } catch {}
}
