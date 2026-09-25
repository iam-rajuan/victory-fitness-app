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
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import RequirementAuditBoundary from '../audit/RequirementAuditBoundary';

interface ClaudeSessionCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  initialStep?: 'feedback' | 'complete';
  workoutTitle?: string;
  minutes?: number;
  setsLogged?: number;
  volumeKg?: number;
  streakDays?: number;
  identityStatement?: string;
  motivationStatement?: string;
  coachName?: string;
  userName?: string;
  dateStr?: string;
  tier?: string;
  onDoneHome: () => void;
  onUpgrade?: () => void;
}

import { Fonts } from '../../constants/Typography';

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

const RPE_OPTS = [
  { id: 0, n: 'Too easy', note: 'I could have done three or four more reps on every set' },
  { id: 1, n: 'Sweet spot', note: 'Hard by the last two reps, and my form held' },
  { id: 2, n: 'Too hard', note: 'I lost form, or I could not finish the sets as written' },
];

const PAIN_CHIPS = ['Shoulder', 'Lower back', 'Knee', 'Wrist', 'Nothing hurt'];

const DEFAULT_EXERCISES = [
  { n: 'Barbell overhead press', s: '4 × 12 kg × 5', cardN: 'BARBELL OVERHEAD PRESS' },
  { n: 'Incline bench press', s: '3 × 12 kg × 6', cardN: 'INCLINE BENCH PRESS' },
  { n: 'Single-arm row', s: '3 × 12 kg × 8', cardN: 'SINGLE-ARM ROW' },
  { n: 'Dead hang', s: '2 × bodyweight × max', cardN: 'DEAD HANG' },
];

const SILVER_VID_CHAPTERS = [
  { n: 'Barbell overhead press', at: '08:14' },
  { n: 'Incline bench press', at: '16:30' },
  { n: 'Single-arm row', at: '24:10' },
  { n: 'Dead hang', at: '32:00' },
  { n: 'Cool down & mobility', at: '38:00' },
];

export default function ClaudeSessionCompleteModal({
  visible,
  onClose,
  initialStep = 'feedback',
  workoutTitle = 'Upper Body Strength',
  minutes = 40,
  setsLogged = 12,
  volumeKg = 744,
  streakDays = 13,
  identityStatement,
  motivationStatement,
  coachName = 'MICHAEL KRAUSE',
  userName = 'Michael Krause',
  dateStr = 'FRI 8 MAY · TODAY',
  tier = 'GOLD',
  onDoneHome,
  onUpgrade,
}: ClaudeSessionCompleteModalProps) {
  const [step, setStep] = useState<'feedback' | 'complete'>(initialStep);
  const [selectedRpe, setSelectedRpe] = useState(1);
  const [selectedPains, setSelectedPains] = useState<string[]>([]);
  const [noteText, setNoteText] = useState('');
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [upsellDismissed, setUpsellDismissed] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setStep(initialStep);
    }
  }, [visible, initialStep]);

  const normalizedTier = (tier || 'GOLD').toLowerCase();
  const isSilver = normalizedTier === 'silver' || normalizedTier === 'none';
  const hasCoach = !isSilver;
  const hasHabit = !isSilver;
  const showUpsell = (isSilver || normalizedTier === 'gold') && !upsellDismissed;

  const userStatement = identityStatement || motivationStatement || 'I am someone who trains even when it is hard.';

  const handleTogglePain = (p: string) => {
    if (p === 'Nothing hurt') {
      setSelectedPains((prev) => (prev.includes('Nothing hurt') ? [] : ['Nothing hurt']));
      return;
    }
    const filtered = selectedPains.filter((item) => item !== 'Nothing hurt');
    if (filtered.includes(p)) {
      setSelectedPains(filtered.filter((item) => item !== p));
    } else {
      setSelectedPains([...filtered, p]);
      if (!noteText.trim()) {
        if (p === 'Shoulder') {
          setNoteText('Right shoulder felt tight on the last set of the press. Not pain exactly, but I noticed it.');
        } else if (p === 'Lower back') {
          setNoteText('Lower back felt stiff on the last set.');
        } else if (p === 'Knee') {
          setNoteText('Left knee felt a slight pinch on extension.');
        } else if (p === 'Wrist') {
          setNoteText('Wrist felt pressure during the set.');
        } else {
          setNoteText(`${p} felt tight.`);
        }
      }
    }
  };

  // Coach feedback calculation matching prototype lines 3140-3160
  const hasShoulder = selectedPains.includes('Shoulder') || noteText.length > 0;
  const coachFeedbackText = (() => {
    if (selectedRpe === 0) {
      return (
        'You added 2 kg and it still felt easy, so the load is behind your strength. I am putting 4 kg on the press next Monday instead of the usual 2.' +
        (hasShoulder ? ' The shoulder note changes the order, not the weight.' : '')
      );
    }
    if (selectedRpe === 2) {
      return (
        'You lost form before the sets were done, which means the jump was too big, not that you were weak. Next Monday repeats this week\'s weight rather than climbing.' +
        (hasShoulder ? ' I am also swapping the overhead press for an incline press until the shoulder settles.' : '')
      );
    }
    return (
      'You added 2 kg on the press and held your rep count. That is exactly how progression should look — steady, not dramatic.' +
      (hasShoulder ? ' The shoulder tightness is worth acting on before it becomes a reason to stop.' : '')
    );
  })();

  const coachActionList = (() => {
    const base =
      selectedRpe === 0
        ? [
            { text: 'Monday: press goes to 16 kg, not 14', tone: 'up' as const },
            { text: 'Adding one set to the row — your pulling is lagging', tone: 'up' as const },
          ]
        : selectedRpe === 2
        ? [
            { text: 'Monday repeats 12 kg. No jump until it feels controlled', tone: 'warn' as const },
            { text: 'Rest between sets goes from 45s to 75s', tone: 'warn' as const },
          ]
        : [
            { text: 'Monday: press goes to 14 kg', tone: 'up' as const },
            { text: 'Everything else in week 3 stays as planned', tone: 'up' as const },
          ];

    const extra = hasShoulder
      ? [
          { text: 'Overhead work swapped for incline until the shoulder is quiet', tone: 'warn' as const },
          { text: 'Face pulls moved to first — they warm that joint', tone: 'up' as const },
          { text: 'I will ask you about the shoulder before Monday\'s session', tone: 'up' as const },
        ]
      : [{ text: 'Nothing to work around — good', tone: 'up' as const }];

    return [...base, ...extra];
  })();

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

  const handleShareInstagram = async () => {
    const text = `Workout Complete: ${workoutTitle} · ${minutes}m · ${setsLogged} sets · Streak ${streakDays} 🔥 @VictoryFitness`;
    if (Platform.OS === 'web') {
      window.open('https://instagram.com', '_blank');
    } else {
      try {
        await Share.share({ message: text });
      } catch {}
    }
  };

  const handleShareX = async () => {
    const tweet = `Finished ${workoutTitle} with @VictoryFitness! ${minutes}m · ${setsLogged} sets · Streak ${streakDays} days.`;
    if (Platform.OS === 'web') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
    } else {
      try {
        await Share.share({ message: tweet });
      } catch {}
    }
  };

function generateStoryCardCanvas(data: {
  workoutTitle: string;
  minutes: number;
  streakDays: number;
  dateStr: string;
  coachName: string;
  exercises: { cardN: string }[];
}): string | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background: Pure dark obsidian
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle ambient glow at bottom
    const gradient = ctx.createRadialGradient(540, 1920, 50, 540, 1920, 950);
    gradient.addColorStop(0, 'rgba(201, 148, 58, 0.15)');
    gradient.addColorStop(1, 'rgba(13, 13, 13, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 1000, 1080, 920);

    const padX = 100;
    let y = 140;

    // Brand logo
    ctx.fillStyle = '#F7F3EE';
    ctx.font = '700 32px sans-serif';
    ctx.fillText('VICTORY FITNESS', padX, y);
    y += 90;

    // Row: YOUR VICTORY & Date
    ctx.fillStyle = '#C9943A';
    ctx.font = '600 24px sans-serif';
    ctx.fillText('YOUR VICTORY', padX, y);

    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '500 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(data.dateStr, 1080 - padX, y);
    ctx.textAlign = 'left';
    y += 50;

    // WORKOUT COMPLETE
    ctx.fillStyle = 'rgba(247, 243, 238, 0.55)';
    ctx.font = '600 24px sans-serif';
    ctx.fillText('WORKOUT COMPLETE', padX, y);
    y += 90;

    // Title: UPPER BODY STRENGTH
    ctx.fillStyle = '#F7F3EE';
    ctx.font = '800 68px sans-serif';
    const lines = data.workoutTitle.toUpperCase().split('\n');
    if (lines.length === 1 && lines[0] === 'UPPER BODY STRENGTH') {
      ctx.fillText('UPPER BODY', padX, y);
      y += 82;
      ctx.fillText('STRENGTH', padX, y);
    } else {
      for (const line of lines) {
        ctx.fillText(line, padX, y);
        y += 82;
      }
    }
    y += 40;

    // Orange divider line
    ctx.strokeStyle = 'rgba(181, 101, 29, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(1080 - padX, y);
    ctx.stroke();
    y += 65;

    // Exercises
    for (const ex of data.exercises) {
      // 4px gold bullet dot
      ctx.fillStyle = '#C9943A';
      ctx.beginPath();
      ctx.arc(padX + 8, y - 9, 7, 0, Math.PI * 2);
      ctx.fill();

      // Exercise name
      ctx.fillStyle = 'rgba(247, 243, 238, 0.9)';
      ctx.font = '600 28px sans-serif';
      ctx.fillText(ex.cardN, padX + 35, y);
      y += 55;
    }

    // Bottom metrics section
    let botY = 1420;
    const colWidth = (1080 - padX * 2) / 3;

    // 3 column top lines
    ctx.strokeStyle = 'rgba(247, 243, 238, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, botY);
    ctx.lineTo(1080 - padX, botY);
    ctx.stroke();

    botY += 45;

    // STREAK
    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('STREAK', padX, botY);

    ctx.fillStyle = '#C9943A';
    ctx.font = '700 64px monospace';
    ctx.fillText(String(data.streakDays), padX, botY + 70);

    // INTENSITY
    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('INTENSITY', padX + colWidth, botY);

    ctx.fillStyle = '#F7F3EE';
    ctx.font = '700 52px sans-serif';
    ctx.fillText('Strong', padX + colWidth, botY + 70);

    // TIME
    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('TIME', padX + colWidth * 2, botY);

    ctx.fillStyle = '#F7F3EE';
    ctx.font = '700 64px monospace';
    ctx.fillText(`${data.minutes}′`, padX + colWidth * 2, botY + 70);

    botY += 150;

    // Coach Box
    ctx.strokeStyle = '#B5651D';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(padX, botY);
    ctx.lineTo(padX, botY + 95);
    ctx.stroke();

    ctx.fillStyle = '#B5651D';
    ctx.font = '600 20px sans-serif';
    ctx.fillText('FROM YOUR COACH', padX + 25, botY + 22);

    ctx.fillStyle = 'rgba(247, 243, 238, 0.85)';
    ctx.font = '400 28px sans-serif';
    ctx.fillText('Thirteen days straight. That is not motivation any more —', padX + 25, botY + 60);
    ctx.fillText('that is who you are.', padX + 25, botY + 96);

    botY += 150;

    // Footer
    ctx.fillStyle = '#F7F3EE';
    ctx.font = '700 30px sans-serif';
    ctx.fillText(data.coachName, padX, botY);

    ctx.fillStyle = '#C9943A';
    ctx.font = '600 22px monospace';
    ctx.fillText('VICTORY-FITNESS.APP', padX, botY + 36);

    // QR box
    const qrSize = 75;
    ctx.strokeStyle = 'rgba(247, 243, 238, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1080 - padX - qrSize, botY - 30, qrSize, qrSize);

    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '700 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QR', 1080 - padX - qrSize / 2, botY + 16);
    ctx.textAlign = 'left';

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate story card', err);
    return null;
  }
}

  const shareMessage = `YOUR VICTORY · UPPER BODY STRENGTH\n\n• BARBELL OVERHEAD PRESS\n• INCLINE BENCH PRESS\n• SINGLE-ARM ROW\n• DEAD HANG\n\nStreak: ${streakDays} days | Intensity: Strong | Time: ${minutes} min\n\n“Thirteen days straight. That is not motivation any more — that is who you are.” — Michael Krause\n\nhttps://victory-fitness.app`;

  const handleShareLinkedIn = async () => {
    if (Platform.OS === 'web') {
      window.open('https://www.linkedin.com/sharing/share-offsite/?url=https://victory-fitness.app', '_blank');
    } else {
      try {
        await Share.share({ message: shareMessage });
      } catch {}
    }
  };

  const handleCircle = () => {
    if (Platform.OS === 'web') {
      window.open('https://circle.so', '_blank');
    } else {
      onDoneHome();
    }
  };

  const handleSave = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const dataUrl = generateStoryCardCanvas({
        workoutTitle,
        minutes,
        streakDays,
        dateStr,
        coachName,
        exercises: DEFAULT_EXERCISES,
      });

      if (dataUrl) {
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = `victory-fitness-${workoutTitle.toLowerCase().replace(/\s+/g, '-')}-story.png`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        alert('Card saved locally (1080 × 1920 PNG downloaded).');
        return;
      }
    }

    try {
      await Share.share({
        title: 'Victory Fitness Share Card',
        message: shareMessage,
        url: 'https://victory-fitness.app',
      });
    } catch {}
  };

  const handleDirectShare = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Victory Fitness Share Card',
          text: shareMessage,
          url: 'https://victory-fitness.app',
        });
        return;
      } catch {}
    }

    try {
      await Share.share({
        title: 'Victory Fitness Share Card',
        message: shareMessage,
        url: 'https://victory-fitness.app',
      });
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {step === 'feedback' ? (
          /* Step 1: Feedback Form matching prototype lines 622-660 */
          <ScrollView
            contentContainerStyle={styles.feedbackScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Coach Banner */}
            <View style={styles.coachHeader}>
              <View style={styles.coachAvatar}>
                <Text style={styles.coachInitials}>VA</Text>
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachTitle}>Your coach</Text>
                <Text style={styles.coachMeta}>
                  {`${minutes} min · 4 exercises · 12 sets logged`}
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
                    <View style={[styles.radioCircle, active && styles.radioCircleActive]} />
                    <View style={styles.rpeTextCol}>
                      <Text style={styles.rpeName}>{opt.n}</Text>
                      <Text style={styles.rpeNote}>{opt.note}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Pain / Notes matching lines 645-654 */}
            <View style={styles.painSection}>
              <View style={styles.painHeaderRow}>
                <Text style={styles.painTitle}>ANYTHING HURT, OR ANYTHING TO SAY?</Text>
                <Text style={styles.painOpt}>OPTIONAL</Text>
              </View>

              <View
                style={[
                  styles.noteInputBox,
                  isNoteFocused && styles.noteInputBoxFocused,
                ]}
              >
                <TextInput
                  style={styles.noteTextInput}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Type here — or tap a spot below"
                  placeholderTextColor="rgba(247, 243, 238, 0.4)"
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                  onFocus={() => setIsNoteFocused(true)}
                  onBlur={() => setIsNoteFocused(false)}
                />
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
          /* Step 2: Complete Screen matching Reference Images 1 & 2 + Prototype lines 661-820 */
          <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
            {/* Top Status Badge matching Image 1: Green circle with white tick + label */}
            <View style={styles.statusRow}>
              <View style={styles.badgeCircle}>
                <View style={styles.badgeCheckTick} />
              </View>
              <Text style={styles.statusLabel}>SESSION 64 COMPLETE</Text>
            </View>

            {/* Title: Upper Body Strength */}
            <Text style={styles.workoutHeadline}>
              {'Upper Body\nStrength'}
            </Text>

            {/* 4 Metric Stats: MINUTES, SETS, KG LIFTED, STREAK */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{minutes}</Text>
                <Text style={styles.statLabel}>MINUTES</Text>
              </View>
              {hasCoach ? (
                <>
                  <View style={styles.statCol}>
                    <Text style={styles.statVal}>{setsLogged}</Text>
                    <Text style={styles.statLabel}>SETS</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statVal}>{volumeKg}</Text>
                    <Text style={styles.statLabel}>KG LIFTED</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.statCol}>
                    <Text style={styles.statVal}>5</Text>
                    <Text style={styles.statLabel}>SECTIONS</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={[styles.statVal, { color: '#5FC48E' }]}>100%</Text>
                    <Text style={styles.statLabel}>WATCHED</Text>
                  </View>
                </>
              )}
              <View style={styles.statCol}>
                <Text style={[styles.statVal, styles.statValGold]}>{streakDays}</Text>
                <Text style={styles.statLabel}>STREAK</Text>
              </View>
            </View>

            {/* WHAT YOU DID (or WHAT YOU FOLLOWED for Silver) matching Image 1 */}
            {hasCoach ? (
              <View style={styles.whatYouDidSection}>
                <Text style={styles.sectionKicker}>WHAT YOU DID</Text>
                {DEFAULT_EXERCISES.map((e, idx) => (
                  <View key={idx} style={styles.exerciseRow}>
                    <View style={styles.exerciseGreenDot} />
                    <Text style={styles.exerciseName}>{e.n}</Text>
                    <Text style={styles.exerciseSets}>{e.s}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.whatYouDidSection}>
                <Text style={styles.sectionKicker}>WHAT YOU FOLLOWED</Text>
                <View style={styles.silverChaptersBox}>
                  {SILVER_VID_CHAPTERS.map((c, idx) => (
                    <View key={idx} style={styles.silverChapterRow}>
                      <View style={styles.silverCheckCircle}>
                        <View style={styles.silverCheckTick} />
                      </View>
                      <Text style={styles.silverChapterName}>{c.n}</Text>
                      <Text style={styles.silverChapterAt}>{c.at}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.silverFollowedNote}>
                  Watched end to end. Nothing to log on Silver — showing up is the whole measure.
                </Text>
              </View>
            )}

            {/* WORTH READING TWICE Card with Unlabelled User Statement matching Image 1 */}
            <View style={styles.readTwiceCard}>
              <Text style={styles.readTwiceKicker}>WORTH READING TWICE</Text>
              <Text style={styles.readTwiceQuote}>“Every rep is a reminder that growth takes patience.”</Text>
              <Text style={styles.readTwiceAuthor}>VICTOR AKKO</Text>
              {hasHabit ? (
                <>
                  <View style={styles.readTwiceDivider} />
                  <Text style={styles.unlabelledSentence}>{userStatement}</Text>
                </>
              ) : null}
            </View>

            {/* WHAT YOUR COACH TOOK FROM THAT Card matching Image 1 */}
            {hasCoach ? (
              <View style={styles.coachReadCard}>
                <Text style={styles.coachReadKicker}>WHAT YOUR COACH TOOK FROM THAT</Text>
                <Text style={styles.coachReadBody}>{coachFeedbackText}</Text>
                {coachActionList.map((action, i) => (
                  <View key={i} style={styles.coachActionRow}>
                    <View
                      style={[
                        styles.coachActionDot,
                        action.tone === 'warn' && styles.coachActionDotWarn,
                      ]}
                    />
                    <Text style={styles.coachActionText}>{action.text}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.coachReadCard, styles.fromVictorCard]}>
                <Text style={styles.coachReadKicker}>FROM VICTOR</Text>
                <Text style={styles.coachReadBody}>
                  {`That is session 64, ${userName} — Upper Body Strength, all thirty-eight minutes of it, on a Friday evening when most people had already decided not to. Wednesday is Legs and Glutes. Same time, same you.`}
                </Text>
                <Text style={styles.readTwiceAuthor}>VICTOR AKKO</Text>
              </View>
            )}

            {/* YOUR SHARE CARD · 9:16 matching Image 2 */}
            <View style={styles.shareCardContainer}>
              <Text style={styles.shareSectionKicker}>YOUR SHARE CARD · 9:16</Text>

              <Pressable style={styles.storyCard} onPress={() => void handleDirectShare()}>
                {/* 5px Top Copper Bar matching Claude reference */}
                <View style={styles.storyTopAccent} />

                {/* Ambient Radial Golden Glow at Bottom matching Claude reference */}
                <LinearGradient
                  colors={['transparent', 'rgba(201, 148, 58, 0.03)', 'rgba(201, 148, 58, 0.16)', 'rgba(201, 148, 58, 0.28)']}
                  locations={[0, 0.45, 0.8, 1]}
                  style={styles.storyBottomGlow}
                  pointerEvents="none"
                />

                {/* Top Section */}
                <View style={styles.storyTopSection}>
                  {/* Victory Fitness White Logo */}
                  <Image
                    source={require('../../assets/logo_dark.png')}
                    style={styles.storyLogo}
                    resizeMode="contain"
                  />

                  <View style={styles.storyVictoryRow}>
                    <Text style={styles.storyVictoryLabel}>YOUR VICTORY</Text>
                    <Text style={styles.storyDateLabel}>{dateStr}</Text>
                  </View>

                  <Text style={styles.storyCompleteLabel}>WORKOUT COMPLETE</Text>
                  <Text style={styles.storyWorkoutTitle}>{'UPPER BODY\nSTRENGTH'}</Text>

                  {/* Copper/Orange divider line */}
                  <View style={styles.storyOrangeDivider} />

                  {/* 4 Bulleted Exercises with 4px gold dots */}
                  <View style={styles.storyExerciseList}>
                    {DEFAULT_EXERCISES.map((e, idx) => (
                      <View key={idx} style={styles.storyExerciseItem}>
                        <View style={styles.storyGoldDot} />
                        <Text style={styles.storyExerciseName}>{e.cardN}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Bottom Section */}
                <View style={styles.storyBottomSection}>
                  {/* 3 Metric Columns with top border */}
                  <View style={styles.storyMetricsRow}>
                    <View style={styles.storyMetricCol}>
                      <Text style={styles.storyMetricLabel}>STREAK</Text>
                      <Text style={[styles.storyMetricVal, styles.storyMetricValGold]}>
                        {streakDays}
                      </Text>
                    </View>
                    <View style={styles.storyMetricCol}>
                      <Text style={styles.storyMetricLabel}>
                        {hasCoach ? 'INTENSITY' : 'COMPLETED'}
                      </Text>
                      <Text style={styles.storyMetricValClash}>
                        {hasCoach ? 'Strong' : 'All 5 sections'}
                      </Text>
                    </View>
                    <View style={styles.storyMetricCol}>
                      <Text style={styles.storyMetricLabel}>TIME</Text>
                      <Text style={styles.storyMetricValMono}>{`${minutes}′`}</Text>
                    </View>
                  </View>

                  {/* FROM YOUR COACH Quote with left copper border */}
                  <View style={styles.storyCoachBox}>
                    <Text style={styles.storyCoachKicker}>FROM YOUR COACH</Text>
                    <Text style={styles.storyCoachQuote}>
                      Thirteen days straight. That is not motivation any more — that is who you are.
                    </Text>
                  </View>

                  {/* Footer with Coach Name, App URL, and QR Box */}
                  <View style={styles.storyFooterRow}>
                    <View>
                      <Text style={styles.storyCoachName}>MICHAEL KRAUSE</Text>
                      <Text style={styles.storyAppUrl}>VICTORY-FITNESS.APP</Text>
                    </View>
                    <View style={styles.storyQrBox}>
                      <Text style={styles.storyQrText}>QR</Text>
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* Caption text */}
              <Text style={styles.shareCaption}>
                Rendered at 1080 × 1920 for stories and status. The line is written by your coach from this session — regenerate it before sharing if it doesn't sound like you. The QR opens this exact workout.
              </Text>

              {/* SHARE & MOTIVATE FRIENDS */}
              <Text style={styles.shareFriendsKicker}>SHARE & MOTIVATE FRIENDS</Text>
              <View style={styles.socialRow1}>
                <Pressable style={styles.whatsappBtn} onPress={() => void handleShareWhatsApp()}>
                  <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                </Pressable>
                <Pressable style={styles.instagramBtn} onPress={() => void handleShareInstagram()}>
                  <Text style={styles.instagramBtnText}>Instagram</Text>
                </Pressable>
              </View>
              <View style={styles.socialRow2}>
                <Pressable style={styles.socialPillBtn} onPress={() => void handleShareX()}>
                  <Text style={styles.socialPillText}>X</Text>
                </Pressable>
                <Pressable style={styles.socialPillBtn} onPress={() => void handleShareLinkedIn()}>
                  <Text style={styles.socialPillText}>LinkedIn</Text>
                </Pressable>
                <Pressable style={styles.socialPillBtn} onPress={handleCircle}>
                  <Text style={styles.socialPillText}>Circle</Text>
                </Pressable>
                <Pressable style={styles.socialPillBtn} onPress={() => void handleSave()}>
                  <Text style={styles.socialPillText}>Save</Text>
                </Pressable>
              </View>
            </View>

            {/* Bottom Done Gold CTA Button matching line 818 */}
            <Pressable style={styles.doneBtn} onPress={onDoneHome}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
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
    paddingBottom: Platform.OS === 'ios' ? 80 : 50,
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
    gap: 13,
    padding: 16,
    borderRadius: 16,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
    marginBottom: 9,
  },
  rpeCardActive: {
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: NAVY,
  },
  radioCircle: {
    width: 19,
    height: 19,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    marginTop: 2,
  },
  radioCircleActive: {
    borderWidth: 6,
    borderColor: GOLD,
    backgroundColor: 'transparent',
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
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  painSection: {
    marginTop: 16,
  },
  painHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  painTitle: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.42)',
  },
  painOpt: {
    fontFamily: MONO,
    fontSize: 10,
    color: 'rgba(247, 243, 238, 0.35)',
  },
  noteInputBox: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
    marginBottom: 12,
    minHeight: 74,
  },
  noteInputBoxFocused: {
    borderColor: GOLD,
    borderWidth: 1.5,
  },
  noteTextInput: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 20,
    color: IVORY,
    padding: 0,
    margin: 0,
    textAlignVertical: 'top',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  painChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
  },
  painChipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  painChipText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  painChipTextActive: {
    fontWeight: '700',
    color: OBSIDIAN,
  },
  sendCoachBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sendCoachBtnText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipLinkText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.55)',
  },

  /* Step 2: Complete Screen Styles */
  completeScroll: {
    paddingHorizontal: 20,
    paddingTop: 66,
    paddingBottom: 40,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  badgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 99,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheckTick: {
    width: 11,
    height: 6,
    borderLeftWidth: 2.5,
    borderLeftColor: IVORY,
    borderBottomWidth: 2.5,
    borderBottomColor: IVORY,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  statusLabel: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.65,
    color: GREEN,
  },
  workoutHeadline: {
    fontFamily: CLASH,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.34,
    color: IVORY,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 18,
    paddingBottom: 20,
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

  /* WHAT YOU DID section */
  whatYouDidSection: {
    marginTop: 20,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.575,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.09)',
  },
  exerciseGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  exerciseName: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '500',
    color: IVORY,
  },
  exerciseSets: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.55)',
  },

  /* Silver video chapters fallback */
  silverChaptersBox: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  silverChapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.09)',
  },
  silverCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 99,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silverCheckTick: {
    width: 7,
    height: 4,
    borderLeftWidth: 2,
    borderLeftColor: IVORY,
    borderBottomWidth: 2,
    borderBottomColor: IVORY,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  silverChapterName: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: IVORY,
  },
  silverChapterAt: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  silverFollowedNote: {
    marginTop: 11,
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.5)',
  },

  /* WORTH READING TWICE */
  readTwiceCard: {
    marginTop: 22,
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 22,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  readTwiceKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.47,
    color: GOLD,
    marginBottom: 10,
  },
  readTwiceQuote: {
    fontFamily: CLASH,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 12,
  },
  readTwiceAuthor: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.1,
    color: COPPER,
  },
  readTwiceDivider: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.14)',
    marginBottom: 16,
  },
  unlabelledSentence: {
    fontFamily: CLASH,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: IVORY,
  },

  /* WHAT YOUR COACH TOOK FROM THAT */
  coachReadCard: {
    marginTop: 12,
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 17,
  },
  fromVictorCard: {
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  coachReadKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.365,
    color: GOLD,
    marginBottom: 9,
  },
  coachReadBody: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.88)',
    marginBottom: 10,
  },
  coachActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 5,
  },
  coachActionDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: GREEN,
    marginTop: 7,
  },
  coachActionDotWarn: {
    backgroundColor: COPPER,
  },
  coachActionText: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(247, 243, 238, 0.78)',
  },

  /* 9:16 SHARE CARD SECTION */
  shareCardContainer: {
    marginTop: 20,
  },
  shareSectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.575,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  storyCard: {
    width: '100%',
    aspectRatio: 9 / 16,
    minHeight: 560,
    backgroundColor: OBSIDIAN,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  storyTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: COPPER,
    zIndex: 10,
  },
  storyBottomGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '44%',
  },
  storyTopSection: {
    paddingHorizontal: 22,
    paddingTop: 24,
    position: 'relative',
    zIndex: 2,
  },
  storyLogo: {
    height: 44,
    width: 44,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  storyVictoryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  storyVictoryLabel: {
    fontFamily: DMSANS,
    fontSize: 11,
    letterSpacing: 1.98,
    color: GOLD,
  },
  storyDateLabel: {
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: 0.63,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  storyCompleteLabel: {
    fontFamily: DMSANS,
    fontSize: 11,
    letterSpacing: 1.98,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  storyWorkoutTitle: {
    marginTop: 10,
    fontFamily: CLASH,
    fontSize: 28,
    lineHeight: 30,
    color: IVORY,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  storyOrangeDivider: {
    height: 1,
    backgroundColor: 'rgba(181, 101, 29, 0.4)',
    marginTop: 14,
    marginBottom: 14,
  },
  storyExerciseList: {
    gap: 7,
  },
  storyExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  storyGoldDot: {
    width: 4,
    height: 4,
    borderRadius: 99,
    backgroundColor: GOLD,
    marginTop: 1,
  },
  storyExerciseName: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    letterSpacing: 0.6,
    color: 'rgba(247, 243, 238, 0.9)',
    textTransform: 'uppercase',
  },
  storyBottomSection: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    position: 'relative',
    zIndex: 2,
  },
  storyMetricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  storyMetricCol: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.16)',
    paddingTop: 12,
  },
  storyMetricLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    letterSpacing: 1.6,
    color: 'rgba(247, 243, 238, 0.5)',
    marginBottom: 4,
  },
  storyMetricVal: {
    fontFamily: MONO,
    fontSize: 26,
    color: IVORY,
  },
  storyMetricValGold: {
    color: GOLD,
  },
  storyMetricValClash: {
    fontFamily: CLASH,
    fontSize: 22,
    lineHeight: 26,
    color: IVORY,
  },
  storyMetricValMono: {
    fontFamily: MONO,
    fontSize: 26,
    color: IVORY,
  },
  storyCoachBox: {
    borderLeftWidth: 2,
    borderLeftColor: COPPER,
    paddingVertical: 1,
    paddingLeft: 12,
    marginBottom: 16,
  },
  storyCoachKicker: {
    fontFamily: DMSANS,
    fontSize: 9,
    letterSpacing: 1.3,
    color: COPPER,
    marginBottom: 4,
  },
  storyCoachQuote: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.85)',
  },
  storyFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  storyCoachName: {
    fontFamily: DMSANS,
    fontSize: 14,
    letterSpacing: 0.8,
    color: IVORY,
    textTransform: 'uppercase',
  },
  storyAppUrl: {
    fontFamily: MONO,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: GOLD,
    marginTop: 3,
  },
  storyQrBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  storyQrText: {
    fontFamily: MONO,
    fontSize: 8.5,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  shareCaption: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 10,
  },
  shareFriendsKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.575,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 18,
    marginBottom: 10,
  },
  socialRow1: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 10,
  },
  whatsappBtn: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: IVORY,
  },
  instagramBtn: {
    flex: 1,
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instagramBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: IVORY,
  },
  socialRow2: {
    flexDirection: 'row',
    gap: 9,
  },
  socialPillBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialPillText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.8)',
  },

  /* Upsell Card */
  upsellCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.16)',
    padding: 16,
    backgroundColor: 'rgba(13, 43, 69, 0.35)',
  },
  upsellHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  upsellLine: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '600',
    color: IVORY,
  },
  upsellFine: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 4,
  },
  upsellDismiss: {
    fontFamily: DMSANS,
    fontSize: 20,
    color: 'rgba(247, 243, 238, 0.4)',
    marginTop: -4,
  },
  upsellCtaBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
  },
  upsellCtaText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },

  /* Done Button */
  doneBtn: {
    marginTop: 22,
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontFamily: DMSANS,
    fontSize: 16.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
