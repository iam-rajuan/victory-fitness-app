import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import RequirementAuditBoundary from '../audit/RequirementAuditBoundary';

interface ActiveExerciseItem {
  id: string;
  name: string;
  note: string;
  targetSets: number;
  targetReps: number | 'max';
  defaultKg: number;
  restTime: string;
  isHold?: boolean;
}

interface ClaudeActiveSessionModalProps {
  visible: boolean;
  onClose: () => void;
  tier?: string;
  workoutTitle?: string;
  unlockNote?: string;
  exercises?: ActiveExerciseItem[];
  onEndSession: (stats: { minutes: number; setsLogged: number; volumeKg: number }) => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeActiveSessionModal({
  visible,
  onClose,
  tier = 'GOLD',
  workoutTitle = 'Workout',
  unlockNote = 'Your unlock is ready — your true-crime podcast is yours for this workout.',
  exercises = [],
  onEndSession,
}: ClaudeActiveSessionModalProps) {
  const [seconds, setSeconds] = useState(14 * 60 + 22);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [loggedSets, setLoggedSets] = useState<Record<string, string>>({});

  const currentExercise = exercises[currentExIdx] || null;
  const [weightKg, setWeightKg] = useState(currentExercise?.defaultKg || 0);
  const [reps, setReps] = useState<number | 'max'>(currentExercise?.targetReps || 1);

  const normalizedTier = (tier || 'GOLD').toLowerCase();
  const hasHabit = normalizedTier !== 'silver' && normalizedTier !== 'none';
  const hasWear = normalizedTier === 'platinum' || normalizedTier === 'ic' || normalizedTier === 'inner_circle' || normalizedTier === 'inner circle';

  useEffect(() => {
    setCurrentExIdx(0);
    setCurrentSetIdx(0);
    setLoggedSets({});
  }, [workoutTitle, exercises]);

  // Synchronize exercise weight & reps when moving between exercises
  useEffect(() => {
    setWeightKg(currentExercise?.defaultKg || 0);
    setReps(currentExercise?.targetReps || 1);
  }, [currentExIdx, currentExercise]);

  // Session clock timer
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const clockString = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const handleLogSet = () => {
    if (!currentExercise) {
      handleFinish();
      return;
    }

    const key = `${currentExIdx}:${currentSetIdx}`;
    const entry = currentExercise.isHold
      ? 'bodyweight × max'
      : `${weightKg} kg × ${reps}`;

    const newLogged = { ...loggedSets, [key]: entry };
    setLoggedSets(newLogged);

    // If more sets remain in this exercise
    if (currentSetIdx < currentExercise.targetSets - 1) {
      setCurrentSetIdx((prev) => prev + 1);
    } else if (currentExIdx < exercises.length - 1) {
      // Advance to next exercise
      setCurrentExIdx((prev) => prev + 1);
      setCurrentSetIdx(0);
    } else {
      // Completed last exercise
      handleFinish(newLogged);
    }
  };

  const handleFinish = (finalLogged = loggedSets) => {
    const totalLoggedCount = Object.keys(finalLogged).length;
    const volume = totalLoggedCount * weightKg * (typeof reps === 'number' ? reps : 5);
    onEndSession({
      minutes: Math.max(1, Math.round(seconds / 60)),
      setsLogged: totalLoggedCount,
      volumeKg: Math.max(0, volume),
    });
  };

  // Button text matching prototype
  const setCtaText =
    !currentExercise
      ? 'Finish workout'
      : currentSetIdx >= currentExercise.targetSets - 1
      ? currentExIdx >= exercises.length - 1
        ? 'Finish workout'
        : 'Next exercise'
      : `Log set ${currentSetIdx + 1}`;

  const totalWorkoutSets = exercises.reduce((acc, e) => acc + e.targetSets, 0);
  const setsDoneCount = Object.keys(loggedSets).length;
  const progressPct =
    totalWorkoutSets <= 0
      ? 0
      : Math.min(100, Math.max(8, Math.round((setsDoneCount / totalWorkoutSets) * 100)));

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.pauseBtn}>Pause</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.workoutHeaderTitle}>{workoutTitle.toUpperCase()}</Text>
            <Text style={styles.headerClock}>{clockString}</Text>
          </View>

          <Pressable onPress={() => handleFinish()} hitSlop={10}>
            <Text style={styles.endBtn}>End</Text>
          </Pressable>
        </View>

        {/* Top Progress Bar matching line 539 */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Unlock Habit Banner matching line 542-545 */}
          {hasHabit ? (
            <View style={styles.habitBanner}>
              <Text style={styles.habitText}>{unlockNote}</Text>
            </View>
          ) : null}

          {/* Wearables HR zones matching line 547-561 */}
          {hasWear ? (
            <RequirementAuditBoundary
              auditId="APP-EXTRA-006"
              status="extra"
              label="NEW FEATURE - LIVE WEARABLE HR ZONES NOT IN REQUIREMENT"
            >
              <View style={styles.wearableCard}>
                <View style={styles.wearableTop}>
                  <Text style={styles.heartRate}>148</Text>
                  <Text style={styles.wearableMeta}>bpm · zone 3 · Garmin</Text>
                </View>
                <View style={styles.zoneBarsRow}>
                  <View style={[styles.zoneBar, styles.zoneBarGreen]} />
                  <View style={[styles.zoneBar, styles.zoneBarGreen]} />
                  <View style={[styles.zoneBar, styles.zoneBarGold]} />
                  <View style={styles.zoneBar} />
                  <View style={styles.zoneBar} />
                </View>
              </View>
            </RequirementAuditBoundary>
          ) : null}

          {/* Exercise Info matching lines 563-567 */}
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseKicker}>
              {currentExercise ? `EXERCISE ${currentExIdx + 1} OF ${exercises.length}` : 'NO MOVEMENTS ADDED'}
            </Text>
            <Text style={styles.exerciseName}>
              {currentExercise?.name || 'Follow the workout video'}
            </Text>
            <Text style={styles.exerciseNote}>
              {currentExercise?.note || 'This workout has no admin-programmed movements yet.'}
            </Text>
          </View>

          {/* Set Rows matching lines 570-577 & lines 3083-3102 */}
          <View style={styles.setRowsContainer}>
            {Array.from({ length: currentExercise?.targetSets || 0 }).map((_, idx) => {
              const key = `${currentExIdx}:${idx}`;
              const doneVal = loggedSets[key];
              const isLive = idx === currentSetIdx;

              const displayVal = doneVal
                ? doneVal
                : isLive
                ? currentExercise.isHold
                  ? 'bodyweight × max'
                  : `${weightKg} kg × ${reps}`
                : '—';

              return (
                <View
                  key={idx}
                  style={[
                    styles.setRow,
                    isLive ? styles.setRowLive : styles.setRowInactive,
                  ]}
                >
                  {/* Left Ring / Tick Circle */}
                  <View
                    style={[
                      styles.setRing,
                      doneVal
                        ? styles.setRingDone
                        : isLive
                        ? styles.setRingLive
                        : styles.setRingInactive,
                    ]}
                  >
                    {doneVal ? <View style={styles.checkMarkWhite} /> : null}
                  </View>

                  {/* Set Number */}
                  <Text
                    style={[
                      styles.setNumText,
                      isLive ? styles.setNumLive : styles.setNumInactive,
                    ]}
                  >
                    {String(idx + 1)}
                  </Text>

                  {/* Set Value */}
                  <Text
                    style={[
                      styles.setValText,
                      doneVal || isLive ? styles.setValHighlight : styles.setValMuted,
                    ]}
                  >
                    {displayVal}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Record Set Box matching lines 579-613 */}
          {currentExercise ? (
          <View style={styles.recordBox}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordTitle}>{`RECORD SET ${currentSetIdx + 1}`}</Text>
              <Text style={styles.lastTime}>
                {currentExercise.isHold
                  ? 'hold as long as you can'
                  : `prescribed ${currentExercise.targetSets} × ${currentExercise.targetReps}`}
              </Text>
            </View>

            <View style={styles.steppersRow}>
              {/* Weight Stepper */}
              <View style={styles.stepperCol}>
                <Text style={styles.stepperLabel}>WEIGHT</Text>
                {!currentExercise.isHold ? (
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setWeightKg((w) => Math.max(0, w - 2))}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </Pressable>

                    <View style={styles.valWrap}>
                      <Text style={styles.stepperVal}>{weightKg}</Text>
                      <Text style={styles.stepperUnit}> kg</Text>
                    </View>

                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setWeightKg((w) => w + 2)}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.bodyweightWrap}>
                    <Text style={styles.bodyweightText}>bodyweight</Text>
                  </View>
                )}
              </View>

              <View style={styles.stepperDivider} />

              {/* Reps Stepper */}
              <View style={styles.stepperCol}>
                <Text style={styles.stepperLabel}>REPS</Text>
                {!currentExercise.isHold ? (
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => {
                        if (typeof reps === 'number') {
                          setReps(Math.max(1, reps - 1));
                        }
                      }}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </Pressable>

                    <View style={styles.valWrap}>
                      <Text style={styles.stepperVal}>{reps}</Text>
                    </View>

                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => {
                        if (typeof reps === 'number') {
                          setReps(reps + 1);
                        }
                      }}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.bodyweightWrap}>
                    <Text style={styles.bodyweightText}>max</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          ) : null}
        </ScrollView>

        {/* Bottom CTA & Rest Box matching lines 615-618 */}
        <View style={styles.bottomBar}>
          <View style={styles.restBox}>
            <Text style={styles.restTime}>{currentExercise?.restTime || '--'}</Text>
            <Text style={styles.restLabel}>REST</Text>
          </View>

          <Pressable style={styles.logSetBtn} onPress={handleLogSet}>
            <Text style={styles.logSetBtnText}>{setCtaText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 54,
    paddingBottom: 14,
  },
  pauseBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  headerCenter: {
    alignItems: 'center',
  },
  workoutHeaderTitle: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  headerClock: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: IVORY,
    marginTop: 2,
  },
  endBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(247, 243, 238, 0.14)',
    marginHorizontal: 20,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  scrollContent: {
    paddingBottom: 24,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  habitBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderLeftWidth: 3,
    borderLeftColor: COPPER,
  },
  habitText: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.9)',
  },
  wearableCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  wearableTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    marginBottom: 10,
  },
  heartRate: {
    fontFamily: MONO,
    fontSize: 30,
    fontWeight: '700',
    color: IVORY,
    lineHeight: 30,
  },
  wearableMeta: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.6)',
  },
  zoneBarsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  zoneBar: {
    flex: 1,
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.14)',
  },
  zoneBarGreen: {
    backgroundColor: GREEN,
  },
  zoneBarGold: {
    backgroundColor: GOLD,
  },
  exerciseHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  exerciseKicker: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: COPPER,
  },
  exerciseName: {
    fontFamily: CLASH,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginTop: 5,
  },
  exerciseNote: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 7,
  },
  setRowsContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY,
    borderRadius: 14,
    marginBottom: 8,
  },
  setRowLive: {
    borderWidth: 2,
    borderColor: GOLD,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  setRowInactive: {
    borderWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  setRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRingDone: {
    backgroundColor: GREEN,
  },
  setRingLive: {
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: 'transparent',
  },
  setRingInactive: {
    borderWidth: 2,
    borderColor: 'rgba(247, 243, 238, 0.25)',
    backgroundColor: 'transparent',
  },
  checkMarkWhite: {
    width: 8,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: IVORY,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  setNumText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
  },
  setNumLive: {
    color: IVORY,
  },
  setNumInactive: {
    color: 'rgba(247, 243, 238, 0.55)',
  },
  setValText: {
    fontFamily: MONO,
    fontSize: 15,
  },
  setValHighlight: {
    fontWeight: '700',
    color: IVORY,
  },
  setValMuted: {
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.4)',
  },
  recordBox: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordTitle: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: GOLD,
  },
  lastTime: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  steppersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperCol: {
    flex: 1,
  },
  stepperLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 1,
    color: 'rgba(247, 243, 238, 0.45)',
    marginBottom: 7,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: IVORY,
    marginTop: -2,
  },
  valWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  stepperVal: {
    fontFamily: MONO,
    fontSize: 24,
    fontWeight: '700',
    color: IVORY,
  },
  stepperUnit: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  bodyweightWrap: {
    height: 40,
    justifyContent: 'center',
  },
  bodyweightText: {
    fontFamily: MONO,
    fontSize: 20,
    fontWeight: '700',
    color: IVORY,
  },
  stepperDivider: {
    width: 1,
    backgroundColor: 'rgba(247, 243, 238, 0.12)',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  restBox: {
    width: 62,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTime: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: IVORY,
  },
  restLabel: {
    fontFamily: DMSANS,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.8,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 1,
  },
  logSetBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logSetBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
