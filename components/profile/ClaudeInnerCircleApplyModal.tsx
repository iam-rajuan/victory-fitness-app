import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';

interface ClaudeInnerCircleApplyModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
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

const QUESTIONS = [
  {
    n: '1',
    q: 'What have you tried in the last two years, and where did it break down?',
    hint: 'Be honest about routines that worked for three months and then slipped.',
  },
  {
    n: '2',
    q: 'What does an average working week look like for you?',
    hint: 'Hours, travel, screen time, children or commitments that set your schedule.',
  },
  {
    n: '3',
    q: 'What is your current training environment and kit?',
    hint: 'Home gym, commercial gym, barbell, kettlebells, or travelling bodyweight.',
  },
  {
    n: '4',
    q: 'What does success look like in 12 months, in one specific sentence?',
    hint: 'Not “feel better” — what will you actually be able to do or lift?',
  },
  {
    n: '5',
    q: 'Why Victor, and why now?',
    hint: 'What made you decide you need direct human coaching rather than an app?',
  },
];

export default function ClaudeInnerCircleApplyModal({
  visible,
  onClose,
  userName = 'Michael Krause',
  userEmail = 'm.krause@mail.de',
}: ClaudeInnerCircleApplyModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswerChange = (qIndex: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: text }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleFinish = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!submitted ? (
            <>
              {/* Top Bar matching lines 1386-1389 */}
              <View style={styles.topBar}>
                <View style={styles.icBadge}>
                  <Text style={styles.icBadgeText}>INNER CIRCLE</Text>
                </View>
                <Text style={styles.metaText}>APPLICATION · 5 QUESTIONS</Text>
              </View>

              <Text style={styles.title}>Victor reads every one of these himself</Text>
              <Text style={styles.sub}>
                There is no checkout for Inner Circle. Answer these, and if it looks like a fit he'll call you to talk it through.
              </Text>

              {/* 5 Questions matching lines 1392-1403 */}
              <View style={styles.questionsList}>
                {QUESTIONS.map((q) => (
                  <View key={`q-${q.n}`} style={styles.qCard}>
                    <View style={styles.qTopRow}>
                      <View style={styles.qNumCircle}>
                        <Text style={styles.qNumText}>{q.n}</Text>
                      </View>
                      <View style={styles.qTextCol}>
                        <Text style={styles.qTitle}>{q.q}</Text>
                        <Text style={styles.qHint}>{q.hint}</Text>
                        <TextInput
                          style={styles.qInput}
                          placeholder="Type your answer…"
                          placeholderTextColor="rgba(247,243,238,0.35)"
                          value={answers[q.n] || ''}
                          onChangeText={(text) => handleAnswerChange(q.n, text)}
                          multiline
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* So He Can Reach You matching lines 1405-1412 */}
              <Text style={styles.sectionLabel}>SO HE CAN REACH YOU</Text>
              <View style={styles.contactCard}>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Full name</Text>
                  <Text style={styles.contactVal}>{userName}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={[styles.contactVal, { fontFamily: MONO }]}>{userEmail}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>WhatsApp</Text>
                  <Text style={[styles.contactVal, { fontFamily: MONO }]}>+49 171 555 0148</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Country · time zone</Text>
                  <Text style={[styles.contactVal, { fontFamily: MONO }]}>Germany · CET</Text>
                </View>
                <View style={[styles.contactRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.contactLabel}>Best time to call</Text>
                  <Text style={[styles.contactVal, { fontFamily: MONO, color: GOLD }]}>
                    Weekday evenings
                  </Text>
                </View>
              </View>

              {/* Submit CTA matching lines 1413-1414 */}
              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.85}
                onPress={handleSubmit}
              >
                <Text style={styles.submitBtnText}>Send my application</Text>
              </TouchableOpacity>

              <Text style={styles.privacyNote}>
                Your answers go to Victor only. Nothing is published, and nothing is charged at this stage.
              </Text>
            </>
          ) : (
            /* Confirmation: It's with Victor now matching lines 1418-1433 */
            <View style={styles.confirmationWrap}>
              <View style={styles.greenCheckCircle}>
                <View style={styles.checkmarkTick} />
              </View>

              <Text style={styles.appliedKicker}>APPLICATION RECEIVED</Text>
              <Text style={styles.appliedTitle}>It's with Victor now</Text>
              <Text style={styles.appliedSub}>
                He reads applications himself, so this takes a few days rather than a few minutes.
              </Text>

              <View style={styles.stepsCard}>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>1</Text>
                  <View style={styles.stepTextCol}>
                    <Text style={styles.stepTitle}>Victor reads your five answers</Text>
                    <Text style={styles.stepSub}>Within 3 working days</Text>
                  </View>
                </View>

                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>2</Text>
                  <View style={styles.stepTextCol}>
                    <Text style={styles.stepTitle}>A call, at the time you gave</Text>
                    <Text style={styles.stepSub}>Weekday evenings, CET · 30 minutes</Text>
                  </View>
                </View>

                <View style={[styles.stepRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.stepNum}>3</Text>
                  <View style={styles.stepTextCol}>
                    <Text style={styles.stepTitle}>You both decide, and set the rhythm</Text>
                    <Text style={styles.stepSub}>Weekly or monthly 1-to-1s — agreed on the call</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.appliedFootnote}>
                If it isn't a fit he'll tell you straight, and point you at the tier that is. Meanwhile your workouts and challenges stay open.
              </Text>

              <TouchableOpacity
                style={styles.submitBtn}
                activeOpacity={0.85}
                onPress={handleFinish}
              >
                <Text style={styles.submitBtnText}>Back to training</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 36 : 64,
    paddingBottom: 96,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  icBadge: {
    backgroundColor: COPPER,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  icBadgeText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: '#0D0D0D',
  },
  metaText: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  title: {
    fontFamily: CLASH,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 10,
  },
  sub: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 24,
  },
  questionsList: {
    gap: 9,
  },
  qCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 18,
  },
  qTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  qNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 99,
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qNumText: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '700',
    color: GOLD,
  },
  qTextCol: {
    flex: 1,
  },
  qTitle: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '600',
    color: IVORY,
  },
  qHint: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 4,
  },
  qInput: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.2)',
    marginTop: 13,
    paddingBottom: 9,
    fontFamily: INTER,
    fontSize: 13.5,
    color: IVORY,
  },
  sectionLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 20,
    marginBottom: 10,
  },
  contactCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  contactLabel: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 14.5,
    color: 'rgba(247, 243, 238, 0.7)',
  },
  contactVal: {
    fontFamily: DMSANS,
    fontSize: 14,
    color: IVORY,
  },
  submitBtn: {
    height: 52,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  privacyNote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 14,
  },
  confirmationWrap: {
    paddingTop: 40,
  },
  greenCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 99,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmarkTick: {
    width: 20,
    height: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: IVORY,
    transform: [{ rotate: '-45deg' }, { translateY: -3 }],
  },
  appliedKicker: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.6,
    color: COPPER,
    marginBottom: 10,
  },
  appliedTitle: {
    fontFamily: CLASH,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 12,
  },
  appliedSub: {
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(247, 243, 238, 0.65)',
    marginBottom: 28,
  },
  stepsCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 13,
    paddingVertical: 17,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  stepNum: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    width: 18,
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  stepSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  appliedFootnote: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.55)',
    marginBottom: 24,
  },
});
