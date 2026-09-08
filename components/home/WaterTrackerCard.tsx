import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Switch,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../lib/i18n';

const DEFAULT_TARGET_ML = 2500;
const CUP_SIZE_ML = 250;

function getTodayKey() {
  const d = new Date();
  return `@victory_water_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
}

const REMINDER_KEY = '@victory_water_reminder_enabled';

export function WaterTrackerCard() {
  const { t } = useLanguage();
  const [currentMl, setCurrentMl] = useState<number>(0);
  const [targetMl, setTargetMl] = useState<number>(DEFAULT_TARGET_ML);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const todayKey = getTodayKey();
        const savedVal = await AsyncStorage.getItem(todayKey);
        const savedReminders = await AsyncStorage.getItem(REMINDER_KEY);
        if (mounted) {
          if (savedVal !== null) {
            const parsed = parseInt(savedVal, 10);
            if (!Number.isNaN(parsed)) setCurrentMl(parsed);
          }
          if (savedReminders !== null) {
            setRemindersEnabled(savedReminders === 'true');
          }
        }
      } catch {
        // use default state
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const progress = Math.min(1, currentMl / targetMl);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 650,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [progress, fillAnim]);

  const triggerPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.15,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const addWater = async (amount: number) => {
    const next = Math.max(0, currentMl + amount);
    setCurrentMl(next);
    triggerPulse();
    try {
      await AsyncStorage.setItem(getTodayKey(), next.toString());
    } catch {
      // ignore
    }
  };

  const toggleReminders = async (val: boolean) => {
    setRemindersEnabled(val);
    try {
      await AsyncStorage.setItem(REMINDER_KEY, val ? 'true' : 'false');
    } catch {
      // ignore
    }
  };

  const fillHeightInterpolated = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isGoalReached = currentMl >= targetMl;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="water" size={18} color={Colors.victoryGreen} />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t('Hydration Tracker')}</Text>
            <Text style={styles.cardSubtitle}>
              {currentMl} / {targetMl} ml ({Math.round(progress * 100)}%)
            </Text>
          </View>
        </View>
        {isGoalReached && (
          <View style={styles.badgeContainer}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.victoryGreen} />
            <Text style={styles.badgeText}>{t('Target Met')}</Text>
          </View>
        )}
      </View>

      <View style={styles.bodyRow}>
        {/* Animated Glass Reservoir */}
        <View style={styles.glassContainer}>
          <View style={styles.glassRim} />
          <View style={styles.glassInner}>
            <Animated.View
              style={[
                styles.liquidFill,
                {
                  height: fillHeightInterpolated,
                },
              ]}
            >
              <View style={styles.liquidWaveTop} />
            </Animated.View>
            <View style={styles.glassMarkings}>
              <View style={[styles.markingLine, { top: '25%' }]} />
              <View style={[styles.markingLine, { top: '50%' }]} />
              <View style={[styles.markingLine, { top: '75%' }]} />
            </View>
          </View>
        </View>

        {/* Quick Add Action & Stats */}
        <View style={styles.actionColumn}>
          <Text style={styles.infoLabel}>
            {isGoalReached
              ? t('Outstanding! Optimal hydration maintained.')
              : t('Drink a glass to maintain high metabolic energy.')}
          </Text>

          <View style={styles.buttonRow}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.addCupBtn}
                onPress={() => addWater(CUP_SIZE_ML)}
              >
                <Ionicons name="add-circle" size={20} color="#050814" />
                <Text style={styles.addCupBtnText}>+{CUP_SIZE_ML}ml</Text>
              </TouchableOpacity>
            </Animated.View>

            {currentMl > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.minusBtn}
                onPress={() => addWater(-CUP_SIZE_ML)}
              >
                <Ionicons name="remove" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Push Reminder at Set Times */}
          <View style={styles.reminderRow}>
            <Ionicons
              name={remindersEnabled ? 'notifications' : 'notifications-off-outline'}
              size={15}
              color={remindersEnabled ? Colors.victoryGreen : Colors.textMuted}
            />
            <Text style={styles.reminderText}>{t('Push reminders at set times')}</Text>
            <Switch
              value={remindersEnabled}
              onValueChange={toggleReminders}
              trackColor={{ false: '#262D42', true: Colors.victoryGreen }}
              thumbColor={remindersEnabled ? Colors.ivory : '#8E9BAE'}
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }], marginLeft: 'auto' }}
            />
          </View>
          {remindersEnabled && (
            <View style={styles.schedulePillRow}>
              {['9 AM', '12 PM', '3 PM', '6 PM', '9 PM'].map((slot, i) => (
                <View key={i} style={styles.timeSlotBadge}>
                  <Text style={styles.timeSlotText}>{slot}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.navy,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(26, 122, 74, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(26, 122, 74, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.victoryGreen,
  },
  badgeText: {
    color: Colors.victoryGreen,
    fontSize: 11,
    fontWeight: '700',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  glassContainer: {
    width: 68,
    height: 100,
    alignItems: 'center',
  },
  glassRim: {
    width: 60,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 122, 74, 0.6)',
    backgroundColor: 'rgba(26, 122, 74, 0.15)',
  },
  glassInner: {
    width: 52,
    height: 94,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: 'rgba(26, 122, 74, 0.4)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  liquidFill: {
    width: '100%',
    backgroundColor: Colors.victoryGreen,
    opacity: 0.88,
    position: 'relative',
  },
  liquidWaveTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#2CD483',
    opacity: 0.9,
  },
  glassMarkings: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  markingLine: {
    position: 'absolute',
    right: 4,
    width: 8,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addCupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addCupBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  minusBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  reminderText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  schedulePillRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  timeSlotBadge: {
    backgroundColor: 'rgba(26, 122, 74, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(26, 122, 74, 0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeSlotText: {
    color: Colors.victoryGreen,
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
  },
});
