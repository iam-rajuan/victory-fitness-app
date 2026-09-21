import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';

interface ClaudePlanBuildModalProps {
  visible: boolean;
  onClose: () => void;
  onPlanBuilt: (planSummary: {
    goal: string;
    days: string;
    duration: string;
    kit: string;
    line: string;
  }) => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

const GOALS = [
  'Get stronger',
  'Lose weight and keep muscle',
  'Move without pain',
  'Stay consistent',
];

const DAYS_OPTIONS = [
  'Mon, Wed, Fri',
  'Mon, Tue, Thu, Fri',
  'Five weekdays',
  'Weekends only',
];

const DURATIONS = ['25 min', '40 min', '60 min', '90 min'];

const KITS = [
  'A full gym',
  'Home gym',
  'Dumbbells at home',
  'Bodyweight',
];

export default function ClaudePlanBuildModal({
  visible,
  onClose,
  onPlanBuilt,
}: ClaudePlanBuildModalProps) {
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(GOALS[0]);
  const [selectedDays, setSelectedDays] = useState(DAYS_OPTIONS[0]);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1]); // 40 min
  const [selectedKit, setSelectedKit] = useState(KITS[2]); // Dumbbells

  const handleContinue = () => {
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      const line = `${selectedGoal} · ${selectedDays} · ${selectedDuration} · built around ${selectedKit.toLowerCase()}.`;
      onPlanBuilt({
        goal: selectedGoal,
        days: selectedDays,
        duration: selectedDuration,
        kit: selectedKit,
        line,
      });
      setStep(1);
      onClose();
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "What's the main goal right now?";
      case 2:
        return 'Which days can you commit to?';
      case 3:
        return 'How long per session?';
      case 4:
        return 'What kit do you have access to?';
      default:
        return '';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return 'Victor builds the exercise selection and loading patterns around this focus.';
      case 2:
        return 'Rest days are programmed between compound sessions for joint and CNS recovery.';
      case 3:
        return 'Warm-up and cooldown are included within your selected duration.';
      case 4:
        return 'Your 6-week plan will only prescribe movements you have the equipment for.';
      default:
        return '';
    }
  };

  const getCurrentOptions = () => {
    switch (step) {
      case 1:
        return { options: GOALS, selected: selectedGoal, set: setSelectedGoal };
      case 2:
        return { options: DAYS_OPTIONS, selected: selectedDays, set: setSelectedDays };
      case 3:
        return { options: DURATIONS, selected: selectedDuration, set: setSelectedDuration };
      case 4:
        return { options: KITS, selected: selectedKit, set: setSelectedKit };
      default:
        return { options: [], selected: '', set: () => {} };
    }
  };

  const current = getCurrentOptions();

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (step > 1) setStep((s) => s - 1);
              else onClose();
            }}
            hitSlop={10}
          >
            <Text style={styles.backBtn}>{step > 1 ? '← Back' : 'Cancel'}</Text>
          </Pressable>

          <Text style={styles.stepIndicator}>{`STEP ${step} OF 4`}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                s <= step && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>CUSTOM PLAN BUILDER</Text>
          <Text style={styles.headline}>{getStepTitle()}</Text>
          <Text style={styles.subheadline}>{getStepSubtitle()}</Text>

          {/* Options List */}
          <View style={styles.optionsList}>
            {current.options.map((opt) => {
              const active = opt === current.selected;
              return (
                <Pressable
                  key={opt}
                  style={[styles.optCard, active && styles.optCardActive]}
                  onPress={() => current.set(opt)}
                >
                  <Text style={[styles.optText, active && styles.optTextActive]}>
                    {opt}
                  </Text>
                  <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.ctaBtn} onPress={handleContinue}>
            <Text style={styles.ctaBtnText}>
              {step === 4 ? 'Build my 6-week plan' : 'Continue'}
            </Text>
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
  backBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  stepIndicator: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.15)',
  },
  progressSegmentActive: {
    backgroundColor: GOLD,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: COPPER,
    marginBottom: 8,
  },
  headline: {
    fontFamily: CLASH,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 10,
  },
  subheadline: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 24,
  },
  optionsList: {
    gap: 10,
  },
  optCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    backgroundColor: NAVY,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.1)',
  },
  optCardActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(201, 148, 58, 0.1)',
  },
  optText: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.85)',
  },
  optTextActive: {
    color: IVORY,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: GOLD,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: GOLD,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: OBSIDIAN,
  },
  ctaBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
