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

interface SetRecord {
  setNum: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

interface ExerciseItem {
  name: string;
  note: string;
  kicker?: string;
  sets: SetRecord[];
}

interface ClaudeActiveSessionModalProps {
  visible: boolean;
  onClose: () => void;
  tier?: string;
  workoutTitle?: string;
  unlockNote?: string;
  onEndSession: (stats: { minutes: number; setsLogged: number; volumeKg: number }) => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const DEFAULT_EXERCISES: ExerciseItem[] = [
  {
    name: 'Dumbbell Shoulder Press',
    note: 'Controlled tempo down. 2 s pause at bottom. Full extension overhead without arching lower back.',
    kicker: 'EXERCISE 1 OF 7 · WEEK 2',
    sets: [
      { setNum: 1, weightKg: 12, reps: 10, completed: true },
      { setNum: 2, weightKg: 12, reps: 10, completed: true },
      { setNum: 3, weightKg: 14, reps: 10, completed: false },
    ],
  },
  {
    name: 'Single-Arm Dumbbell Row',
    note: 'Keep spine neutral and pull toward your hip rather than chest.',
    kicker: 'EXERCISE 2 OF 7 · WEEK 2',
    sets: [
      { setNum: 1, weightKg: 14, reps: 10, completed: false },
      { setNum: 2, weightKg: 14, reps: 10, completed: false },
      { setNum: 3, weightKg: 16, reps: 8, completed: false },
    ],
  },
  {
    name: 'Incline Push-Up',
    note: 'Elevated hands for chest engagement and scapular glide.',
    kicker: 'EXERCISE 3 OF 7 · WEEK 2',
    sets: [
      { setNum: 1, weightKg: 0, reps: 12, completed: false },
      { setNum: 2, weightKg: 0, reps: 12, completed: false },
      { setNum: 3, weightKg: 0, reps: 12, completed: false },
    ],
  },
];

export default function ClaudeActiveSessionModal({
  visible,
  onClose,
  tier = 'GOLD',
  workoutTitle = 'Upper Body Strength',
  unlockNote = 'Your unlock is ready — your true-crime podcast is yours for this workout.',
  onEndSession,
}: ClaudeActiveSessionModalProps) {
  const [seconds, setSeconds] = useState(14 * 60 + 22);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(2);
  const [weightKg, setWeightKg] = useState(12);
  const [reps, setReps] = useState(10);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({
    '0-0': true,
    '0-1': true,
  });

  const hasHabit = tier !== 'SILVER' && tier !== 'NONE';
  const hasWear = tier === 'PLATINUM' || tier === 'INNER_CIRCLE';

  useEffect(() => {
    let timer: any;
    if (visible) {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [visible]);

  const clockString = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const currentExercise = DEFAULT_EXERCISES[currentExIdx] || DEFAULT_EXERCISES[0];

  const handleLogSet = () => {
    const key = `${currentExIdx}-${currentSetIdx}`;
    setCompletedSets((prev) => ({ ...prev, [key]: true }));

    if (currentSetIdx < currentExercise.sets.length - 1) {
      setCurrentSetIdx((prev) => prev + 1);
    } else if (currentExIdx < DEFAULT_EXERCISES.length - 1) {
      setCurrentExIdx((prev) => prev + 1);
      setCurrentSetIdx(0);
    } else {
      // Completed all
      handleEnd();
    }
  };

  const handleEnd = () => {
    const totalLogged = Object.keys(completedSets).length;
    const volume = totalLogged * weightKg * reps;
    onEndSession({
      minutes: Math.max(1, Math.round(seconds / 60)),
      setsLogged: Math.max(3, totalLogged),
      volumeKg: Math.max(720, volume),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
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

          <Pressable onPress={handleEnd} hitSlop={10}>
            <Text style={styles.endBtn}>End</Text>
          </Pressable>
        </View>

        {/* Top Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '43%' }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Unlock Habit Banner */}
          {hasHabit ? (
            <View style={styles.habitBanner}>
              <Text style={styles.habitText}>{unlockNote}</Text>
            </View>
          ) : null}

          {/* Wearables HR zones */}
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

          {/* Exercise Info */}
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseKicker}>{currentExercise.kicker}</Text>
            <Text style={styles.exerciseName}>{currentExercise.name}</Text>
            <Text style={styles.exerciseNote}>{currentExercise.note}</Text>
          </View>

          {/* Set Rows */}
          <View style={styles.setRowsContainer}>
            {currentExercise.sets.map((s, idx) => {
              const isDone = Boolean(completedSets[`${currentExIdx}-${idx}`]);
              const isCurrent = idx === currentSetIdx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.setRow,
                    isCurrent && styles.setRowCurrent,
                  ]}
                >
                  <View style={[styles.setTick, isDone && styles.setTickDone]}>
                    {isDone ? <View style={styles.checkMark} /> : null}
                  </View>
                  <Text style={[styles.setNumber, isCurrent && styles.setNumberCurrent]}>
                    {`SET ${s.setNum}`}
                  </Text>
                  <Text style={[styles.setValue, isCurrent && styles.setValueCurrent]}>
                    {s.weightKg > 0 ? `${s.reps} reps · ${s.weightKg} kg` : `${s.reps} reps · bodyweight`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Record Set Box */}
          <View style={styles.recordBox}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordTitle}>{`RECORD SET ${currentSetIdx + 1}`}</Text>
              <Text style={styles.lastTime}>LAST: 12 KG × 10</Text>
            </View>

            <View style={styles.steppersRow}>
              {/* Weight Stepper */}
              <View style={styles.stepperCol}>
                <Text style={styles.stepperLabel}>WEIGHT</Text>
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
              </View>

              <View style={styles.stepperDivider} />

              {/* Reps Stepper */}
              <View style={styles.stepperCol}>
                <Text style={styles.stepperLabel}>REPS</Text>
                <View style={styles.stepperControls}>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => setReps((r) => Math.max(1, r - 1))}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </Pressable>

                  <View style={styles.valWrap}>
                    <Text style={styles.stepperVal}>{reps}</Text>
                  </View>

                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => setReps((r) => r + 1)}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA & Rest Box */}
        <View style={styles.bottomBar}>
          <View style={styles.restBox}>
            <Text style={styles.restTime}>0:45</Text>
            <Text style={styles.restLabel}>REST</Text>
          </View>

          <Pressable style={styles.logSetBtn} onPress={handleLogSet}>
            <Text style={styles.logSetBtnText}>{`Log set ${currentSetIdx + 1} of ${currentExercise.sets.length}`}</Text>
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
    paddingTop: 54,
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
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
  },
  setRowCurrent: {
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.4)',
  },
  setTick: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTickDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkMark: {
    width: 9,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: IVORY,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  setNumber: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
    width: 50,
  },
  setNumberCurrent: {
    color: GOLD,
  },
  setValue: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  setValueCurrent: {
    color: IVORY,
    fontWeight: '700',
  },
  recordBox: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 16,
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
    fontWeight: '500',
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
    alignItems: 'center',
    gap: 12,
  },
  stepperCol: {
    flex: 1,
  },
  stepperDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(247, 243, 238, 0.12)',
  },
  stepperLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 1.0,
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
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: OBSIDIAN,
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
