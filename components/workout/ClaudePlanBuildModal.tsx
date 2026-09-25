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

interface OptionWithNote {
  title: string;
  note: string;
}

interface StepConfig {
  kicker: string;
  title: string;
  sub: string;
  options: OptionWithNote[];
  cta: string;
}

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

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

const BUILD_STEPS: StepConfig[] = [
  {
    kicker: 'STEP 1 OF 4 · YOUR GOAL',
    title: 'What are you training for?',
    sub: 'One answer. It decides how the whole plan is shaped, not just today.',
    options: [
      { title: 'Get stronger', note: 'Progressive load, longer rests, fewer sessions' },
      { title: 'Lose weight and keep muscle', note: 'Higher volume, shorter rests, protein target enforced' },
      { title: 'Move without pain', note: 'Mobility first, strength second, nothing explosive' },
      { title: 'Stay consistent', note: 'Short sessions you will actually finish, four a week' },
    ],
    cta: 'Next',
  },
  {
    kicker: 'STEP 2 OF 4 · YOUR WEEK',
    title: 'Which days can you train?',
    sub: 'Pick the days that are realistically yours. I would rather build four you keep than six you abandon.',
    options: [
      { title: 'Monday, Wednesday, Friday', note: 'Three days, a rest day between each' },
      { title: 'Mon, Tue, Thu, Fri', note: 'Four days, weekend free' },
      { title: 'Five weekdays', note: 'Shorter sessions, more of them' },
      { title: 'Weekends only', note: 'Two longer sessions' },
    ],
    cta: 'Next',
  },
  {
    kicker: 'STEP 3 OF 4 · YOUR TIME',
    title: 'How long have you got per session?',
    sub: 'The plan is built to this number. If a day runs short, I cut the accessory work, never the main lift.',
    options: [
      { title: '25 minutes', note: 'Tight, focused, no wasted sets' },
      { title: '40 minutes', note: 'The sweet spot for most people' },
      { title: '60 minutes', note: 'Full warm-up, main work and accessories' },
      { title: '90 minutes', note: 'Proper strength work — 4 to 5 sets on the compounds, long rests' },
      { title: 'It varies', note: 'I will give you a short and a long version of each day' },
    ],
    cta: 'Next',
  },
  {
    kicker: 'STEP 4 OF 4 · YOUR KIT',
    title: 'What do you actually have?',
    sub: 'Last question. Then I build six weeks and you can change any of it.',
    options: [
      { title: 'Full gym', note: 'Barbells, machines, everything' },
      { title: 'Home gym', note: 'Dumbbells, bands, a pull-up bar' },
      { title: 'Dumbbells only', note: 'One pair, and I will work around it' },
      { title: 'Nothing at all', note: 'Bodyweight, and it is enough' },
    ],
    cta: 'Build my plan',
  },
];

export default function ClaudePlanBuildModal({
  visible,
  onClose,
  onPlanBuilt,
}: ClaudePlanBuildModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [picks, setPicks] = useState<number[]>([0, 0, 1, 1]);

  const currentStep = BUILD_STEPS[stepIdx];
  const currentPick = picks[stepIdx] !== undefined ? picks[stepIdx] : 0;

  const handleSelectOption = (idx: number) => {
    setPicks((prev) => {
      const copy = [...prev];
      copy[stepIdx] = idx;
      return copy;
    });
  };

  const handleNext = () => {
    if (stepIdx < 3) {
      setStepIdx((s) => s + 1);
    } else {
      const goalList = ['Get stronger', 'Lose weight and keep muscle', 'Move without pain', 'Stay consistent'];
      const daysList = ['Mon, Wed, Fri', 'Mon, Tue, Thu, Fri', 'Five weekdays', 'Weekends only'];
      const goal = goalList[picks[0]] || 'Get stronger';
      const days = daysList[picks[1]] || 'Mon, Wed, Fri';
      const duration = BUILD_STEPS[2].options[picks[2]]?.title || '40 minutes';
      const kit = BUILD_STEPS[3].options[picks[3]]?.title || 'Home gym';
      const minsNum = duration.replace(' minutes', '').replace(' min', '');

      const kitPhrases: Record<string, string> = {
        'Full gym': 'a full gym',
        'Home gym': 'your home gym',
        'Dumbbells only': 'one pair of dumbbells',
        'Nothing at all': 'bodyweight only',
      };
      const kitPhrase = kitPhrases[kit] || `your ${kit.toLowerCase()}`;
      const line = `${goal} · ${days} · ${minsNum} min · built around ${kitPhrase}.`;

      onPlanBuilt({
        goal,
        days,
        duration,
        kit,
        line,
      });
      setStepIdx(0);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (stepIdx > 0) setStepIdx((s) => s - 1);
              else onClose();
            }}
            hitSlop={10}
          >
            <Text style={styles.backBtn}>{stepIdx > 0 ? '← Back' : 'Cancel'}</Text>
          </Pressable>

          <Text style={styles.stepIndicator}>PLAN BUILDER</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Progress Bar (4 steps) */}
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                s <= stepIdx && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>{currentStep.kicker}</Text>
          <Text style={styles.headline}>{currentStep.title}</Text>
          <Text style={styles.subheadline}>{currentStep.sub}</Text>

          {/* Options List matching prototype lines 3215-3228 */}
          <View style={styles.optionsList}>
            {currentStep.options.map((opt, i) => {
              const on = i === currentPick;
              return (
                <Pressable
                  key={i}
                  style={[styles.optCard, on && styles.optCardActive]}
                  onPress={() => handleSelectOption(i)}
                >
                  <View style={[styles.radioCircle, on && styles.radioCircleActive]} />
                  <View style={styles.optContent}>
                    <Text style={[styles.optName, on && styles.optNameActive]}>{opt.title}</Text>
                    <Text style={styles.optNote}>{opt.note}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Fine text below options */}
          <Text style={styles.fineText}>
            {stepIdx === 3
              ? 'You can change any session afterwards, and the plan adapts when your sleep or recovery moves.'
              : 'Nothing here is permanent. Your coach re-reads these answers every week.'}
          </Text>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.ctaBtn} onPress={handleNext}>
            <Text style={styles.ctaBtnText}>{currentStep.cta}</Text>
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
    backgroundColor: 'rgba(247, 243, 238, 0.18)',
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
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 8,
  },
  headline: {
    fontFamily: CLASH,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 8,
  },
  subheadline: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(247, 243, 238, 0.58)',
    marginBottom: 22,
  },
  optionsList: {
    gap: 9,
  },
  optCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    padding: 16,
    borderRadius: 16,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
  },
  optCardActive: {
    borderColor: GOLD,
    borderWidth: 2,
  },
  radioCircle: {
    width: 19,
    height: 19,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    marginTop: 2,
    flexShrink: 0,
  },
  radioCircleActive: {
    borderWidth: 6,
    borderColor: GOLD,
  },
  optContent: {
    flex: 1,
    minWidth: 0,
  },
  optName: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '600',
    color: IVORY,
  },
  optNameActive: {
    color: IVORY,
  },
  optNote: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  fineText: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 18,
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
