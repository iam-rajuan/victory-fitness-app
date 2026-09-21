import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Linking,
  Share,
} from 'react-native';

interface ClaudeSessionCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  workoutTitle?: string;
  minutes?: number;
  setsLogged?: number;
  volumeKg?: number;
  streakDays?: number;
  identityStatement?: string;
  motivationStatement?: string;
  tier?: string;
  onDoneHome: () => void;
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

const RPE_OPTS = [
  { id: 7, n: 'RPE 7 · Felt solid', note: 'Could have done two more reps on most sets' },
  { id: 8, n: 'RPE 8 · Tough on the last sets', note: 'One rep left in reserve' },
  { id: 9, n: 'RPE 9 · Near max effort', note: 'Pushed close to failure' },
];

const PAIN_CHIPS = ['None', 'Left shoulder', 'Lower back', 'Right knee', 'Neck', 'Wrist'];

export default function ClaudeSessionCompleteModal({
  visible,
  onClose,
  workoutTitle = 'Upper Body Strength',
  minutes = 40,
  setsLogged = 7,
  volumeKg = 840,
  streakDays = 13,
  identityStatement,
  motivationStatement,
  tier = 'GOLD',
  onDoneHome,
}: ClaudeSessionCompleteModalProps) {
  const [step, setStep] = useState<'feedback' | 'complete'>('feedback');
  const [selectedRpe, setSelectedRpe] = useState(8);
  const [selectedPains, setSelectedPains] = useState<string[]>(['None']);

  const hasHabit = tier !== 'SILVER' && tier !== 'NONE';

  const userStatement = identityStatement || motivationStatement || 'I am someone who trains even when it is hard.';

  const handleTogglePain = (p: string) => {
    if (p === 'None') {
      setSelectedPains(['None']);
      return;
    }
    const filtered = selectedPains.filter((item) => item !== 'None');
    if (filtered.includes(p)) {
      const next = filtered.filter((item) => item !== p);
      setSelectedPains(next.length ? next : ['None']);
    } else {
      setSelectedPains([...filtered, p]);
    }
  };

  const handleShareWhatsApp = async () => {
    const text = `Just finished ${workoutTitle} with Victory Fitness! 🔥 ${minutes} minutes · ${setsLogged} sets · Streak ${streakDays} days.`;
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      try {
        await Share.share({ message: text });
      } catch {}
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {step === 'feedback' ? (
          /* Step 1: Feedback Form */
          <ScrollView contentContainerStyle={styles.feedbackScroll} showsVerticalScrollIndicator={false}>
            {/* Coach Banner */}
            <View style={styles.coachHeader}>
              <View style={styles.coachAvatar}>
                <Text style={styles.coachInitials}>VA</Text>
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachTitle}>Your coach</Text>
                <Text style={styles.coachMeta}>
                  {`${minutes} min · 7 exercises · ${setsLogged} sets logged`}
                </Text>
              </View>
            </View>

            <Text style={styles.headline}>How did that feel?</Text>
            <Text style={styles.subheadline}>
              Your answer changes next week, not just today. Be honest — there is no credit for saying it was easy.
            </Text>

            {/* RPE Options */}
            <View style={styles.rpeList}>
              {RPE_OPTS.map((opt) => {
                const active = opt.id === selectedRpe;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.rpeCard, active && styles.rpeCardActive]}
                    onPress={() => setSelectedRpe(opt.id)}
                  >
                    <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.rpeTextCol}>
                      <Text style={styles.rpeName}>{opt.n}</Text>
                      <Text style={styles.rpeNote}>{opt.note}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Pain / Notes */}
            <View style={styles.painSection}>
              <View style={styles.painHeaderRow}>
                <Text style={styles.painTitle}>ANYTHING HURT, OR ANYTHING TO SAY?</Text>
                <Text style={styles.painOpt}>OPTIONAL</Text>
              </View>

              <View style={styles.chipsRow}>
                {PAIN_CHIPS.map((p) => {
                  const active = selectedPains.includes(p);
                  return (
                    <Pressable
                      key={p}
                      onPress={() => handleTogglePain(p)}
                      style={[styles.painChip, active && styles.painChipActive]}
                    >
                      <Text style={[styles.painChipText, active && styles.painChipTextActive]}>
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable style={styles.sendCoachBtn} onPress={() => setStep('complete')}>
              <Text style={styles.sendCoachBtnText}>Send to my coach</Text>
            </Pressable>

            <Pressable style={styles.skipLink} onPress={() => setStep('complete')}>
              <Text style={styles.skipLinkText}>Skip — just log the session</Text>
            </Pressable>
          </ScrollView>
        ) : (
          /* Step 2: Complete Screen */
          <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
            {/* Top Status */}
            <View style={styles.statusRow}>
              <View style={styles.greenCheck}>
                <View style={styles.checkMarkWhite} />
              </View>
              <Text style={styles.statusLabel}>SESSION 64 COMPLETE</Text>
            </View>

            <Text style={styles.workoutHeadline}>{workoutTitle}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{minutes}</Text>
                <Text style={styles.statLabel}>MINUTES</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{setsLogged}</Text>
                <Text style={styles.statLabel}>SETS</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{volumeKg}</Text>
                <Text style={styles.statLabel}>KG LIFTED</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statVal, styles.statValGold]}>{streakDays}</Text>
                <Text style={styles.statLabel}>STREAK</Text>
              </View>
            </View>

            {/* WORTH READING TWICE (User Sentence Returns Unlabelled) */}
            <View style={styles.readTwiceCard}>
              <Text style={styles.readTwiceKicker}>WORTH READING TWICE</Text>
              <Text style={styles.readTwiceQuote}>“Every rep is a reminder that growth takes patience.”</Text>
              <Text style={styles.readTwiceAuthor}>VICTOR AKKO</Text>

              {hasHabit ? (
                <View style={styles.unlabelledWrap}>
                  <Text style={styles.unlabelledSentence}>{`“${userStatement}”`}</Text>
                </View>
              ) : null}
            </View>

            {/* What your coach took from that */}
            <View style={styles.coachReadCard}>
              <Text style={styles.coachReadKicker}>WHAT YOUR COACH TOOK FROM THAT</Text>
              <Text style={styles.coachReadNote}>
                RPE 8 logged. Sets 1 and 2 moved with explosive concentric speed. We will step your working weight to 14 kg on Thursday.
              </Text>
            </View>

            {/* Share Card 9:16 Preview */}
            <View style={styles.shareSection}>
              <Text style={styles.shareKicker}>YOUR SHARE CARD · 9:16</Text>

              <View style={styles.shareCardGraphic}>
                <View style={styles.topAccentCopper} />
                <View style={styles.shareCardContent}>
                  <Text style={styles.shareCardBrand}>VICTORY FITNESS</Text>
                  <Text style={styles.shareCardDate}>TODAY'S WORKOUT</Text>
                  <Text style={styles.shareCardTitle}>{workoutTitle}</Text>

                  <View style={styles.shareCardStats}>
                    <Text style={styles.shareCardStatVal}>{`${minutes}m · ${setsLogged} sets · Streak ${streakDays}`}</Text>
                  </View>

                  <Text style={styles.shareCardSentence}>{`“${userStatement}”`}</Text>
                </View>
              </View>

              <Pressable style={styles.whatsappBtn} onPress={() => void handleShareWhatsApp()}>
                <Text style={styles.whatsappBtnText}>Share to WhatsApp</Text>
              </Pressable>

              <Pressable style={styles.doneHomeBtn} onPress={onDoneHome}>
                <Text style={styles.doneHomeBtnText}>Done · back to home</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  feedbackScroll: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 20,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 99,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitials: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  coachInfo: {
    flex: 1,
  },
  coachTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  coachMeta: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  headline: {
    fontFamily: CLASH,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 10,
  },
  subheadline: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 20,
  },
  rpeList: {
    gap: 10,
  },
  rpeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
  },
  rpeCardActive: {
    borderColor: GOLD,
    backgroundColor: 'rgba(201, 148, 58, 0.1)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: GOLD,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: GOLD,
  },
  rpeTextCol: {
    flex: 1,
  },
  rpeName: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '600',
    color: IVORY,
  },
  rpeNote: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  painSection: {
    marginTop: 20,
  },
  painHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  painTitle: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  painOpt: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    color: 'rgba(247, 243, 238, 0.4)',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  painChip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    backgroundColor: 'transparent',
  },
  painChipActive: {
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderColor: GOLD,
  },
  painChipText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.65)',
  },
  painChipTextActive: {
    color: GOLD,
    fontWeight: '700',
  },
  sendCoachBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  sendCoachBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  skipLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  skipLinkText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  // Step 2: Complete Styles
  completeScroll: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  greenCheck: {
    width: 26,
    height: 26,
    borderRadius: 99,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkWhite: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: IVORY,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  statusLabel: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: GREEN,
  },
  workoutHeadline: {
    fontFamily: CLASH,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '600',
    color: IVORY,
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 22,
    marginTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.14)',
  },
  statCol: {
    alignItems: 'flex-start',
  },
  statVal: {
    fontFamily: MONO,
    fontSize: 24,
    fontWeight: '700',
    color: IVORY,
  },
  statValGold: {
    color: GOLD,
  },
  statLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.7,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  readTwiceCard: {
    marginTop: 20,
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  readTwiceKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: GOLD,
    marginBottom: 8,
  },
  readTwiceQuote: {
    fontFamily: CLASH,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 8,
  },
  readTwiceAuthor: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.0,
    color: COPPER,
  },
  unlabelledWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.14)',
  },
  unlabelledSentence: {
    fontFamily: CLASH,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: IVORY,
  },
  coachReadCard: {
    marginTop: 14,
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 18,
  },
  coachReadKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 8,
  },
  coachReadNote: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.85)',
  },
  shareSection: {
    marginTop: 22,
  },
  shareKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  shareCardGraphic: {
    backgroundColor: OBSIDIAN,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    paddingBottom: 24,
  },
  topAccentCopper: {
    height: 5,
    backgroundColor: COPPER,
  },
  shareCardContent: {
    padding: 20,
  },
  shareCardBrand: {
    fontFamily: CLASH,
    fontSize: 18,
    fontWeight: '700',
    color: IVORY,
    marginBottom: 4,
  },
  shareCardDate: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: GOLD,
    marginBottom: 10,
  },
  shareCardTitle: {
    fontFamily: CLASH,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 12,
  },
  shareCardStats: {
    backgroundColor: 'rgba(247, 243, 238, 0.05)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  shareCardStatVal: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: IVORY,
  },
  shareCardSentence: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.8)',
    fontStyle: 'italic',
  },
  whatsappBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  whatsappBtnText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: '#071A10',
  },
  doneHomeBtn: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  doneHomeBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.55)',
  },
});
