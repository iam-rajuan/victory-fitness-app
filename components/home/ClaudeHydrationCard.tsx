import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeHydrationCardProps {
  targetLiters?: number;
  initialMl?: number;
  onWaterChange?: (ml: number) => void;
  reminderEnabled?: boolean;
  reminderMode?: 'Vibrate' | 'Tone';
  onReminderChange?: (enabled: boolean, mode: 'Vibrate' | 'Tone') => void;
}

const NAVY = '#0D2B45';
const OBSIDIAN = '#0D0D0D';
const BLUE_GRAY = '#8FA8C4';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

function getTodayKey() {
  const d = new Date();
  return `@victory_water_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
}

const REMINDER_KEY = '@victory_water_reminder_enabled';
const REMINDER_MODE_KEY = '@victory_water_reminder_mode';

export default function ClaudeHydrationCard({
  targetLiters = 2.5,
  initialMl = 1400,
  onWaterChange,
  reminderEnabled,
  reminderMode,
  onReminderChange,
}: ClaudeHydrationCardProps) {
  const { colors, isDark } = useTheme();
  const [waterMl, setWaterMl] = useState(initialMl);
  const [remindEnabled, setRemindEnabled] = useState(Boolean(reminderEnabled));
  const [remindMode, setRemindMode] = useState<'Vibrate' | 'Tone'>(reminderMode || 'Vibrate');

  const fillAnim = useRef(new Animated.Value(Math.min(1, initialMl / (targetLiters * 1000)))).current;

  useEffect(() => {
    setWaterMl(initialMl);
  }, [initialMl]);

  useEffect(() => {
    if (typeof reminderEnabled === 'boolean') {
      setRemindEnabled(reminderEnabled);
    }
  }, [reminderEnabled]);

  useEffect(() => {
    if (reminderMode === 'Tone' || reminderMode === 'Vibrate') {
      setRemindMode(reminderMode);
    }
  }, [reminderMode]);

  // Hydrate from storage when backend state has not arrived yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedVal = await AsyncStorage.getItem(getTodayKey());
        const savedRemind = await AsyncStorage.getItem(REMINDER_KEY);
        const savedMode = await AsyncStorage.getItem(REMINDER_MODE_KEY);
        if (cancelled) return;
        if (initialMl === 0 && savedVal !== null) {
          const parsed = Number(savedVal);
          if (!isNaN(parsed)) setWaterMl(parsed);
        }
        if (typeof reminderEnabled !== 'boolean' && savedRemind !== null) {
          setRemindEnabled(savedRemind === 'true');
        }
        if (!reminderMode && (savedMode === 'Tone' || savedMode === 'Vibrate')) {
          setRemindMode(savedMode);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [initialMl, reminderEnabled, reminderMode]);

  const targetMl = targetLiters * 1000;
  const pctNum = Math.min(100, Math.round((waterMl / targetMl) * 100));

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.min(1, waterMl / targetMl),
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [waterMl, targetMl, fillAnim]);

  const addWater = async (amount: number) => {
    const next = Math.max(0, Math.min(4000, waterMl + amount));
    setWaterMl(next);
    if (onWaterChange) onWaterChange(next);
    try {
      await AsyncStorage.setItem(getTodayKey(), String(next));
    } catch {}
  };

  const toggleRemind = async () => {
    const next = !remindEnabled;
    setRemindEnabled(next);
    if (onReminderChange) onReminderChange(next, remindMode);
    try {
      await AsyncStorage.setItem(REMINDER_KEY, String(next));
    } catch {}
  };

  const changeMode = async (m: 'Vibrate' | 'Tone') => {
    setRemindMode(m);
    if (onReminderChange) onReminderChange(remindEnabled, m);
    try {
      await AsyncStorage.setItem(REMINDER_MODE_KEY, m);
    } catch {}
  };

  const waterLabel = `${(waterMl / 1000).toFixed(1)} L`;
  const waterNote =
    waterMl >= targetMl
      ? 'Target hit. Anything more is a bonus.'
      : `${Math.ceil((targetMl - waterMl) / 250)} more glasses to go`;

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionKicker, { color: colors.textMuted }]}>HYDRATION</Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
      >
        {/* Glass Graphic Container */}
        <View
          style={[
            styles.glassOutline,
            {
              backgroundColor: isDark ? 'rgba(13, 43, 69, 0.5)' : 'rgba(143, 168, 196, 0.12)',
            },
          ]}
        >
          <Animated.View style={[styles.liquidFill, { height: fillHeight }]} />
          <View style={styles.pctCenterWrap}>
            <Text style={styles.pctText}>{`${pctNum}%`}</Text>
          </View>
        </View>

        {/* Info & Stepper Controls */}
        <View style={styles.infoCol}>
          <View style={styles.volumeRow}>
            <Text style={styles.waterValue}>{waterLabel}</Text>
            <Text
              style={[
                styles.waterTarget,
                { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              {`of ${targetLiters.toFixed(1)} L`}
            </Text>
          </View>

          <Text
            style={[
              styles.waterNote,
              { color: isDark ? BLUE_GRAY : '#3A6B94' },
            ]}
          >
            {waterNote}
          </Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.addBtn} onPress={() => void addWater(250)}>
              <Text style={styles.addBtnText}>+ 250 ml</Text>
            </Pressable>

            <Pressable style={styles.minusBtn} onPress={() => void addWater(-250)}>
              <Text style={styles.minusBtnText}>−</Text>
            </Pressable>

            <Pressable
              style={[styles.bellBtn, remindEnabled && styles.bellBtnActive]}
              onPress={() => void toggleRemind()}
            >
              <View style={[styles.bellBody, remindEnabled && styles.bellBodyActive]}>
                <View style={[styles.bellClapper, remindEnabled && styles.bellClapperActive]} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Expandable Reminder Row */}
      {remindEnabled ? (
        <View
          style={[
            styles.reminderRow,
            {
              backgroundColor: isDark ? 'rgba(143, 168, 196, 0.12)' : '#FFFFFF',
              borderColor: isDark ? 'transparent' : colors.cardBorder,
              borderWidth: isDark ? 0 : 1,
            },
          ]}
        >
          <View style={styles.reminderTextCol}>
            <Text style={[styles.reminderTitle, { color: colors.text }]}>Reminder every 2 hours</Text>
            <Text style={[styles.reminderSubtitle, { color: colors.textSecondary }]}>
              {remindMode === 'Vibrate'
                ? 'A short buzz, 09:00 to 21:00. Silent.'
                : 'A soft tone, 09:00 to 21:00.'}
            </Text>
          </View>

          <View style={styles.modesRow}>
            {(['Vibrate', 'Tone'] as const).map((m) => {
              const isActive = m === remindMode;
              return (
                <Pressable
                  key={m}
                  onPress={() => void changeMode(m)}
                  style={[
                    styles.modePill,
                    isActive && styles.modePillActive,
                    !isActive && !isDark && { borderColor: 'rgba(13, 43, 69, 0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      isActive && styles.modePillTextActive,
                      !isActive && !isDark && { color: colors.text },
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: BLUE_GRAY,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  glassOutline: {
    width: 74,
    height: 104,
    borderWidth: 2,
    borderColor: 'rgba(143, 168, 196, 0.55)',
    borderTopWidth: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(13, 43, 69, 0.5)',
  },
  liquidFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BLUE_GRAY,
  },
  pctCenterWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  infoCol: {
    flex: 1,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  waterValue: {
    fontFamily: MONO,
    fontSize: 30,
    fontWeight: '700',
    color: BLUE_GRAY,
  },
  waterTarget: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  waterNote: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: BLUE_GRAY,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  addBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: BLUE_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  minusBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(143, 168, 196, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusBtnText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: BLUE_GRAY,
  },
  bellBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(143, 168, 196, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtnActive: {
    backgroundColor: BLUE_GRAY,
    borderColor: BLUE_GRAY,
  },
  bellBody: {
    width: 15,
    height: 14,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    borderWidth: 2,
    borderColor: BLUE_GRAY,
    borderBottomWidth: 3,
    position: 'relative',
  },
  bellBodyActive: {
    borderColor: OBSIDIAN,
  },
  bellClapper: {
    position: 'absolute',
    bottom: -5,
    left: 4,
    width: 3,
    height: 3,
    borderRadius: 99,
    backgroundColor: BLUE_GRAY,
  },
  bellClapperActive: {
    backgroundColor: OBSIDIAN,
  },
  reminderRow: {
    marginTop: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(143, 168, 196, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: BLUE_GRAY,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderTextCol: {
    flex: 1,
  },
  reminderTitle: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '600',
    color: IVORY,
  },
  reminderSubtitle: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  modesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modePill: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(143, 168, 196, 0.45)',
  },
  modePillActive: {
    backgroundColor: BLUE_GRAY,
    borderColor: BLUE_GRAY,
  },
  modePillText: {
    fontFamily: DMSANS,
    fontSize: 11.5,
    fontWeight: '500',
    color: BLUE_GRAY,
  },
  modePillTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
});
