import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { triggerRestTimerFinishedAlert } from '../../lib/restTimerAudio';
import { useLanguage } from '../../lib/i18n';

interface ActiveRestTimerProps {
  initialSeconds?: number;
  exerciseName?: string;
  onClose: () => void;
  onFinished?: () => void;
}

export default function ActiveRestTimer({
  initialSeconds = 60,
  exerciseName,
  onClose,
  onFinished,
}: ActiveRestTimerProps) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const totalSecondsRef = useRef(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    totalSecondsRef.current = initialSeconds;
    setIsRunning(true);
    setIsFinished(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || isFinished) return;

    if (secondsLeft <= 0) {
      setIsFinished(true);
      setIsRunning(false);
      triggerRestTimerFinishedAlert();
      onFinished?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsFinished(true);
          setIsRunning(false);
          triggerRestTimerFinishedAlert();
          onFinished?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, secondsLeft, isFinished, onFinished]);

  const addSeconds = (amount: number) => {
    setSecondsLeft((prev) => {
      const next = Math.max(0, prev + amount);
      if (next > totalSecondsRef.current) {
        totalSecondsRef.current = next;
      }
      if (next > 0) setIsFinished(false);
      return next;
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPct = totalSecondsRef.current > 0
    ? Math.min(100, Math.max(0, ((totalSecondsRef.current - secondsLeft) / totalSecondsRef.current) * 100))
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Ionicons name="timer" size={18} color={isFinished ? '#22C55E' : Colors.accentBlue} />
            <Text style={styles.title}>
              {isFinished ? t('REST COMPLETE!') : t('REST TIMER')}
            </Text>
            {exerciseName ? (
              <Text style={styles.subtext} numberOfLines={1}>• {exerciseName}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPct}%`, backgroundColor: isFinished ? '#22C55E' : Colors.accentBlue },
            ]}
          />
        </View>

        <View style={styles.timerRow}>
          <Text style={[styles.timerDigits, isFinished && styles.timerDigitsFinished]}>
            {formatTime(secondsLeft)}
          </Text>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => addSeconds(-15)}
              disabled={secondsLeft <= 15}
            >
              <Text style={styles.adjustBtnText}>-15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => addSeconds(30)}
            >
              <Text style={styles.adjustBtnText}>+30s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, isRunning && styles.actionBtnActive]}
              onPress={() => setIsRunning(!isRunning)}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={16}
                color="#000"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={onClose}
            >
              <Text style={styles.skipBtnText}>{t('Skip')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isFinished ? (
          <View style={styles.finishedNotice}>
            <Ionicons name="volume-high" size={14} color="#22C55E" />
            <Text style={styles.finishedText}>
              {t('Chime & vibration triggered! Ready for next set.')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 999,
    elevation: 8,
  },
  content: {
    backgroundColor: '#181A20',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(6,182,212,0.4)',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  subtext: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    flexShrink: 1,
  },
  closeBtn: {
    padding: 4,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerDigits: {
    color: '#fff',
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerDigitsFinished: {
    color: '#22C55E',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adjustBtnText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  actionBtn: {
    backgroundColor: Colors.accentBlue,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: '#E5E7EB',
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  finishedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34,197,94,0.2)',
  },
  finishedText: {
    color: '#22C55E',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});
