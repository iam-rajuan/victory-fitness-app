import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import RequirementAuditBoundary from '../audit/RequirementAuditBoundary';
import { useTheme } from '../../context/ThemeContext';

interface ExerciseItem {
  id: string;
  name: string;
  note: string;
  sets: string;
  kind?: string;
  rest?: string;
}

interface ClaudePlanDetailModalProps {
  visible: boolean;
  onClose: () => void;
  onBeginSession: () => void;
  onAdjustWithCoach: () => void;
  planTitle?: string;
  dayKicker?: string;
  planSource?: string;
  exercises?: ExerciseItem[];
}

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
    id: '1',
    name: 'Barbell overhead press',
    note: 'Compound · 2 min rest · 2.5 kg up from Monday',
    sets: '4 × 5',
  },
  {
    id: '2',
    name: 'Incline bench press',
    note: 'Compound · 2 min rest · Chest to the bar, no bounce',
    sets: '3 × 6',
  },
  {
    id: '3',
    name: 'Single-arm row',
    note: 'Compound · 2 min rest · Slow on the way back',
    sets: '3 × 8',
  },
  {
    id: '4',
    name: 'Lateral raise',
    note: 'Accessory · 45 sec rest · Light. Form over load.',
    sets: '3 × 15',
  },
  {
    id: '5',
    name: 'Face pull',
    note: 'Accessory · 45 sec rest · Your shoulders will thank you',
    sets: '3 × 15',
  },
  {
    id: '6',
    name: 'Dead hang',
    note: 'Accessory · 45 sec rest · As long as you can hold',
    sets: '2 × max',
  },
];

const WEEK_PIPS = [
  { label: 'M', state: 'done' },      // Mon: Done (Green)
  { label: 'T', state: 'rest' },      // Tue: Rest
  { label: 'W', state: 'done' },      // Wed: Done (Green)
  { label: 'T', state: 'rest' },      // Thu: Rest
  { label: 'F', state: 'today' },     // Fri: Today (Gold)
  { label: 'S', state: 'optional' },  // Sat: Optional (Muted Gold)
  { label: 'S', state: 'rest' },      // Sun: Rest
];

export default function ClaudePlanDetailModal({
  visible,
  onClose,
  onBeginSession,
  onAdjustWithCoach,
  planTitle = 'Upper Body Strength',
  dayKicker = 'DAY 3 OF WEEK 2 · PUSH DAY',
  planSource = 'BUILT BY YOUR COACH',
  exercises = DEFAULT_EXERCISES,
}: ClaudePlanDetailModalProps) {
  const { isDark, colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row: Back to Home + BUILT BY YOUR COACH */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={10}>
              <Text style={styles.backBtnText}>← Home</Text>
            </TouchableOpacity>
            <Text style={styles.coachBadge}>{planSource}</Text>
          </View>

          {/* Subtitle & Title */}
          <Text style={[styles.dayLine, { color: isDark ? COPPER : '#B5651D' }]}>{dayKicker}</Text>
          <Text style={[styles.title, { color: isDark ? IVORY : NAVY }]}>{planTitle}</Text>

          {/* Card 1: WHY TODAY LOOKS LIKE THIS (Marked with Red Audit Border for Sleep/RHR Telemetry) */}
          <RequirementAuditBoundary
            auditId="APP-EXTRA-019"
            status="extra"
            label="NEW FEATURE - NOT IN REQUIREMENT (SLEEP & RHR BIOMETRIC TELEMETRY)"
          >
            <View
              style={[
                styles.whyCard,
                {
                  backgroundColor: isDark ? NAVY : '#FFFFFF',
                  borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                  borderWidth: isDark ? 0 : 1,
                  shadowOpacity: isDark ? 0.35 : 0.06,
                },
              ]}
            >
              <Text style={[styles.whyKicker, { color: isDark ? GOLD : '#C9943A' }]}>
                WHY TODAY LOOKS LIKE THIS
              </Text>
              <Text
                style={[
                  styles.whyBody,
                  { color: isDark ? 'rgba(247, 243, 238, 0.88)' : 'rgba(13, 43, 69, 0.85)' },
                ]}
              >
                Heavier than Monday because you slept 7h 20m and your resting heart rate is down. Wednesday stays light either way.
              </Text>
            </View>
          </RequirementAuditBoundary>

          {/* Card 2: YOUR WEEK (7-Day schedule row) */}
          <View
            style={[
              styles.weekCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                borderWidth: isDark ? 0 : 1,
                shadowOpacity: isDark ? 0.35 : 0.06,
              },
            ]}
          >
            <Text style={[styles.weekKicker, { color: isDark ? GOLD : '#C9943A' }]}>
              YOUR WEEK
            </Text>
            <View style={styles.pipsRow}>
              {WEEK_PIPS.map((p, idx) => {
                const isPipDone = p.state === 'done';
                const isPipToday = p.state === 'today';
                const isPipOptional = p.state === 'optional';

                const pipColor = isPipDone
                  ? GREEN
                  : isPipToday
                  ? GOLD
                  : isPipOptional
                  ? 'rgba(201, 148, 58, 0.38)'
                  : isDark
                  ? 'rgba(247, 243, 238, 0.14)'
                  : 'rgba(13, 43, 69, 0.12)';

                const labelColor = isPipToday
                  ? GOLD
                  : isDark
                  ? 'rgba(247, 243, 238, 0.45)'
                  : 'rgba(13, 43, 69, 0.45)';

                return (
                  <View key={`day-${idx}`} style={styles.pipCol}>
                    <View style={[styles.pipBar, { backgroundColor: pipColor }]} />
                    <Text style={[styles.pipLabel, { color: labelColor }]}>{p.label}</Text>
                  </View>
                );
              })}
            </View>
            <Text
              style={[
                styles.weekNote,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              2 done · today · 1 light session left · Sunday optional
            </Text>
          </View>

          {/* Card 3: TODAY'S SESSION (Exercise List matching lines 1930-1942) */}
          <View
            style={[
              styles.exercisesCard,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                borderWidth: isDark ? 0 : 1,
                shadowOpacity: isDark ? 0.35 : 0.06,
              },
            ]}
          >
            <Text style={[styles.sessionLine, { color: isDark ? GOLD : '#C9943A' }]}>
              {`${exercises.length} EXERCISES · 17 SETS · 3 COMPOUNDS`}
            </Text>
            {exercises.map((e, idx) => (
              <View
                key={e.id || `ex-${idx}`}
                style={[
                  styles.exerciseRow,
                  {
                    borderTopColor: isDark ? 'rgba(247, 243, 238, 0.09)' : 'rgba(13, 43, 69, 0.08)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.exerciseNum,
                    { color: isDark ? 'rgba(247, 243, 238, 0.4)' : 'rgba(13, 43, 69, 0.4)' },
                  ]}
                >
                  {idx + 1}
                </Text>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: isDark ? IVORY : NAVY }]}>
                    {e.name}
                  </Text>
                  <Text
                    style={[
                      styles.exerciseNote,
                      { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
                    ]}
                  >
                    {e.note}
                  </Text>
                </View>
                <Text style={styles.exerciseSets}>{e.sets}</Text>
              </View>
            ))}
          </View>

          {/* Primary CTA: Begin the session */}
          <TouchableOpacity
            style={styles.beginBtn}
            activeOpacity={0.85}
            onPress={onBeginSession}
          >
            <Text style={styles.beginBtnText}>Begin the session</Text>
          </TouchableOpacity>

          {/* Secondary Action: Adjust this with your coach */}
          <TouchableOpacity
            style={styles.adjustLink}
            activeOpacity={0.7}
            onPress={onAdjustWithCoach}
          >
            <Text
              style={[
                styles.adjustLinkText,
                { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.65)' },
              ]}
            >
              Adjust this with your coach
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 36 : 54,
    paddingBottom: 48,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.65)',
  },
  coachBadge: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: GOLD,
  },
  dayLine: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    marginBottom: 9,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '600',
    marginBottom: 18,
  },
  whyCard: {
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  whyKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 9,
  },
  whyBody: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 22,
  },
  weekCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  weekKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 14,
  },
  pipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  pipCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  pipBar: {
    width: '100%',
    height: 6,
    borderRadius: 99,
  },
  pipLabel: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '600',
  },
  weekNote: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
  },
  exercisesCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  sessionLine: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 12,
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  exerciseNum: {
    width: 22,
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseNote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 16,
  },
  exerciseSets: {
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
  },
  beginBtn: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  beginBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  adjustLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 6,
    cursor: 'pointer' as any,
  },
  adjustLinkText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
  },
});
