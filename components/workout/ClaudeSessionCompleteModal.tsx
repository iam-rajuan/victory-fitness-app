import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'qrcode';

import RequirementAuditBoundary from '../audit/RequirementAuditBoundary';
import { canonicalizeFitnessText } from '../../lib/workoutTerminology';

interface ClaudeSessionCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  initialStep?: 'feedback' | 'complete';
  workoutTitle?: string;
  workoutUrl?: string;
  sessionNumber?: number;
  minutes?: number;
  setsLogged?: number;
  volumeKg?: number;
  streakDays?: number;
  exercises?: Array<{ n?: string; name?: string; s?: string; cardN?: string }>;
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

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function truncateCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.trim() + '…';
}

function getLogoElement(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(null);
    }
    try {
      const resolved = Image.resolveAssetSource(require('../../assets/logo_dark.png'));
      const src = resolved?.uri || '';
      if (!src) return resolve(null);
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
      if (img.complete && img.naturalWidth) resolve(img);
    } catch {
      resolve(null);
    }
  });
}

async function generateStoryCardCanvasAsync(data: {
  workoutTitle: string;
  minutes: number;
  streakDays: number;
  dateStr: string;
  coachName: string;
  userName: string;
  intensityLabel: string;
  intensityValue: string;
  coachQuote: string;
  workoutUrl: string;
  exercises: { cardN: string }[];
}): Promise<string | null> {
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

    // Top 10px Copper accent bar
    ctx.fillStyle = '#B5651D';
    ctx.fillRect(0, 0, 1080, 10);

    // Subtle ambient glow at bottom
    const gradient = ctx.createRadialGradient(540, 1920, 60, 540, 1920, 1000);
    gradient.addColorStop(0, 'rgba(201, 148, 58, 0.22)');
    gradient.addColorStop(0.5, 'rgba(201, 148, 58, 0.08)');
    gradient.addColorStop(1, 'rgba(13, 13, 13, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 950, 1080, 970);

    const padX = 90;
    let y = 110;

    // Brand logo
    const logoImg = await getLogoElement();
    if (logoImg && logoImg.naturalWidth) {
      const aspect = logoImg.naturalWidth / (logoImg.naturalHeight || 1);
      const targetH = 56;
      const targetW = targetH * aspect;
      ctx.drawImage(logoImg, padX, y, targetW, targetH);
      y += targetH + 34;
    } else {
      ctx.fillStyle = '#C9943A';
      ctx.fillRect(padX, y, 6, 40);
      ctx.fillStyle = '#F7F3EE';
      ctx.font = '700 32px sans-serif';
      ctx.fillText('VICTORY FITNESS', padX + 20, y + 32);
      y += 75;
    }

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
    y += 85;

    // Title: Uppercase, wrapped nicely
    ctx.fillStyle = '#F7F3EE';
    ctx.font = '800 64px sans-serif';
    const titleLines = wrapCanvasText(ctx, data.workoutTitle.toUpperCase(), 1080 - padX * 2);
    for (const line of titleLines) {
      ctx.fillText(line, padX, y);
      y += 78;
    }
    y += 20;

    // Orange/copper divider line
    ctx.strokeStyle = 'rgba(181, 101, 29, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(1080 - padX, y);
    ctx.stroke();
    y += 60;

    // Exercises: up to 5 with 7px gold bullet dots
    const displayExercises = data.exercises.slice(0, 5);
    const maxExerciseWidth = 1080 - padX * 2 - 45;
    for (const ex of displayExercises) {
      ctx.fillStyle = '#C9943A';
      ctx.beginPath();
      ctx.arc(padX + 8, y - 9, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(247, 243, 238, 0.9)';
      ctx.font = '600 28px sans-serif';
      const label = truncateCanvasText(ctx, ex.cardN, maxExerciseWidth);
      ctx.fillText(label, padX + 35, y);
      y += 55;
    }

    if (data.exercises.length > 5) {
      ctx.fillStyle = 'rgba(247, 243, 238, 0.45)';
      ctx.font = '500 22px monospace';
      ctx.fillText(`+${data.exercises.length - 5} MORE MOVEMENTS COMPLETED`, padX + 35, y);
    } else if (data.exercises.length === 0) {
      ctx.fillStyle = '#C9943A';
      ctx.beginPath();
      ctx.arc(padX + 8, y - 9, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(247, 243, 238, 0.9)';
      ctx.font = '600 28px sans-serif';
      ctx.fillText('FULL SESSION COMPLETED', padX + 35, y);
    }

    // Bottom metrics section
    let botY = 1380;
    const colWidth = (1080 - padX * 2) / 3;

    // Divider above metrics
    ctx.strokeStyle = 'rgba(247, 243, 238, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, botY);
    ctx.lineTo(1080 - padX, botY);
    ctx.stroke();

    botY += 45;

    // 1. STREAK
    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('STREAK', padX, botY);

    ctx.fillStyle = '#C9943A';
    ctx.font = '700 64px monospace';
    ctx.fillText(String(data.streakDays), padX, botY + 70);

    // 2. INTENSITY
    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '600 22px sans-serif';
    ctx.fillText(data.intensityLabel, padX + colWidth, botY);

    ctx.fillStyle = '#F7F3EE';
    ctx.font = '700 48px sans-serif';
    ctx.fillText(data.intensityValue, padX + colWidth, botY + 70);

    // 3. TIME
    ctx.fillStyle = 'rgba(247, 243, 238, 0.5)';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('TIME', padX + colWidth * 2, botY);

    ctx.fillStyle = '#F7F3EE';
    ctx.font = '700 64px monospace';
    ctx.fillText(`${data.minutes}′`, padX + colWidth * 2, botY + 70);

    botY += 155;

    // Coach Box with copper vertical bar
    const quoteLines = wrapCanvasText(ctx, data.coachQuote, 1080 - padX * 2 - 40);
    const quoteHeight = Math.max(80, quoteLines.length * 40 + 35);

    ctx.strokeStyle = '#B5651D';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(padX, botY);
    ctx.lineTo(padX, botY + quoteHeight);
    ctx.stroke();

    ctx.fillStyle = '#B5651D';
    ctx.font = '600 20px sans-serif';
    ctx.fillText('FROM YOUR COACH', padX + 25, botY + 22);

    ctx.fillStyle = 'rgba(247, 243, 238, 0.88)';
    ctx.font = '400 28px sans-serif';
    let qY = botY + 60;
    for (const qLine of quoteLines) {
      ctx.fillText(qLine, padX + 25, qY);
      qY += 38;
    }

    botY += quoteHeight + 45;

    // Footer: User Name, App URL & Working QR Box
    ctx.fillStyle = '#F7F3EE';
    ctx.font = '700 32px sans-serif';
    ctx.fillText(data.userName, padX, botY + 12);

    ctx.fillStyle = '#C9943A';
    ctx.font = '600 22px monospace';
    ctx.fillText('VICTORY-FITNESS.APP', padX, botY + 48);

    // Real, Scannable QR Code
    try {
      const qr = QRCode.create(data.workoutUrl, { errorCorrectionLevel: 'M' });
      const qrBoxSize = 136;
      const qrX = 1080 - padX - qrBoxSize;
      const qrY = botY - 50;

      ctx.fillStyle = '#FFFFFF';
      drawRoundRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 14);
      ctx.fill();

      const qrPadding = 12;
      const qrDrawSize = qrBoxSize - qrPadding * 2;
      const moduleSize = qrDrawSize / qr.modules.size;
      ctx.fillStyle = '#0D0D0D';

      for (let r = 0; r < qr.modules.size; r++) {
        for (let c = 0; c < qr.modules.size; c++) {
          if (qr.modules.get(r, c)) {
            ctx.fillRect(
              qrX + qrPadding + c * moduleSize,
              qrY + qrPadding + r * moduleSize,
              moduleSize + 0.35,
              moduleSize + 0.35
            );
          }
        }
      }
    } catch (qrErr) {
      console.warn('QR draw error on canvas:', qrErr);
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate story card', err);
    return null;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ClaudeSessionCompleteModal({
  visible,
  onClose,
  initialStep = 'feedback',
  workoutTitle = 'Workout',
  workoutUrl,
  sessionNumber,
  minutes = 40,
  setsLogged = 12,
  volumeKg = 744,
  streakDays = 13,
  exercises = [],
  identityStatement,
  motivationStatement,
  coachName = 'VICTOR AKKO',
  userName = 'there',
  dateStr,
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
  const completedExercises = React.useMemo(() => {
    return exercises
      .map((exercise) => {
        const rawName = String(exercise.name || exercise.n || '').trim();
        if (!rawName) return null;
        const name = canonicalizeFitnessText(rawName);
        const summary = String(exercise.s || '').trim();
        return {
          n: name,
          s: summary,
          cardN: canonicalizeFitnessText(String(exercise.cardN || name)).trim(),
        };
      })
      .filter((exercise): exercise is { n: string; s: string; cardN: string } => Boolean(exercise));
  }, [exercises]);
  const sessionLabel = `SESSION ${Math.max(1, Number(sessionNumber || 1))} COMPLETE`;
  const displayDate = dateStr || new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).toUpperCase();
  const headlineTitle = canonicalizeFitnessText(workoutTitle.trim()) || 'Workout';
  const storyTitle = headlineTitle.toUpperCase();

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

  const cardRef = useRef<View>(null);
  const [qrPreviewUri, setQrPreviewUri] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sharingLoading, setSharingLoading] = useState<boolean>(false);

  const displayUserName = useMemo(() => {
    const trimmed = (userName || '').trim();
    if (trimmed && trimmed.toLowerCase() !== 'there') {
      return trimmed.toUpperCase();
    }
    return 'MICHAEL KRAUSE';
  }, [userName]);

  const intensityLabel = hasCoach ? 'INTENSITY' : 'COMPLETED';
  const intensityText = useMemo(() => {
    if (!hasCoach) return 'All 5 sections';
    if (selectedRpe === 0) return 'Smooth';
    if (selectedRpe === 2) return 'Hard';
    return 'Strong';
  }, [hasCoach, selectedRpe]);

  const coachQuote = useMemo(() => {
    if (streakDays > 1) {
      const numWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty', 'Twenty-one'];
      const streakWord = numWords[streakDays] || `${streakDays}`;
      return `${streakWord} days straight. That is not motivation any more — that is who you are.`;
    }
    return 'Show up, do the work, raise the standard. That is who you are.';
  }, [streakDays]);

  const resolvedWorkoutUrl = useMemo(() => {
    if (workoutUrl) return workoutUrl;
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/(tabs)/workout?title=${encodeURIComponent(headlineTitle)}`;
    }
    return `https://victory-fitness.app/(tabs)/workout?title=${encodeURIComponent(headlineTitle)}`;
  }, [workoutUrl, headlineTitle]);

  useEffect(() => {
    if (visible && resolvedWorkoutUrl) {
      QRCode.toDataURL(resolvedWorkoutUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0D0D0D',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrPreviewUri(url))
        .catch((err) => console.warn('QR code gen error:', err));
    }
  }, [visible, resolvedWorkoutUrl]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((cur) => (cur === message ? null : cur));
    }, 3500);
  };

  const shareExerciseLines = completedExercises.length
    ? completedExercises.map((exercise) => `• ${exercise.cardN}`).join('\n')
    : '• WORKOUT COMPLETED';
  const shareMessage = `YOUR VICTORY · ${storyTitle}\n\n${shareExerciseLines}\n\nStreak: ${streakDays} days | Time: ${minutes} min | Sets: ${setsLogged}\n\n${userStatement}\n\n${resolvedWorkoutUrl}`;

  const handleShareAction = async (channel: 'whatsapp' | 'instagram' | 'x' | 'linkedin' | 'direct' | 'save') => {
    setSharingLoading(true);
    try {
      let fileBlob: Blob | null = null;
      let fileObj: File | null = null;
      let nativeUri: string | null = null;
      const fileName = `victory-fitness-${headlineTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-story.png`;

      if (Platform.OS === 'web') {
        const dataUrl = await generateStoryCardCanvasAsync({
          workoutTitle,
          minutes,
          streakDays,
          dateStr: displayDate,
          coachName,
          userName: displayUserName,
          intensityLabel,
          intensityValue: intensityText,
          coachQuote,
          workoutUrl: resolvedWorkoutUrl,
          exercises: completedExercises,
        });

        if (dataUrl) {
          const res = await fetch(dataUrl);
          fileBlob = await res.blob();
          if (typeof File !== 'undefined') {
            fileObj = new File([fileBlob], fileName, { type: 'image/png' });
          }
        }
      } else {
        try {
          if (cardRef.current) {
            nativeUri = await captureRef(cardRef, {
              format: 'png',
              quality: 1,
              width: 1080,
              height: 1920,
            });
          }
        } catch (captureErr) {
          console.warn('Native view capture error:', captureErr);
        }
      }

      if (channel === 'save') {
        if (Platform.OS === 'web' && fileBlob) {
          downloadBlob(fileBlob, fileName);
          showToast('Card saved! 1080 × 1920 PNG downloaded.');
        } else if (nativeUri && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(nativeUri, {
            mimeType: 'image/png',
            dialogTitle: 'Save Story Card',
            UTI: 'public.png',
          });
        } else {
          await Share.share({ message: shareMessage });
        }
        return;
      }

      // Check modern Web Share API with file attachment (Mobile Safari, Chrome on Android, etc.)
      if (Platform.OS === 'web' && fileObj && typeof navigator !== 'undefined' && (navigator as any).canShare && (navigator as any).canShare({ files: [fileObj] })) {
        try {
          await (navigator as any).share({
            files: [fileObj],
            title: `Victory Fitness · ${headlineTitle}`,
            text: channel === 'x' ? `Finished ${headlineTitle} with @VictoryFitness! ${minutes}m · ${setsLogged} sets · Streak ${streakDays} days 🔥 ${resolvedWorkoutUrl}` : shareMessage,
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // Native React Native sharing with file attachment
      if (Platform.OS !== 'web' && nativeUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(nativeUri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${headlineTitle}`,
          UTI: 'public.png',
        });
        return;
      }

      // Desktop web fallbacks (auto-download 1080x1920 PNG and open platform)
      if (fileBlob) {
        downloadBlob(fileBlob, fileName);
      }

      if (channel === 'whatsapp') {
        const text = `Just finished ${headlineTitle} with Victory Fitness! 🔥 ${minutes} minutes · ${setsLogged} sets · Streak ${streakDays} days. ${resolvedWorkoutUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        showToast('Story card (1080 × 1920 PNG) downloaded! You can attach it to WhatsApp.');
      } else if (channel === 'instagram') {
        window.open('https://instagram.com', '_blank');
        showToast('Story card (1080 × 1920 PNG) downloaded! Ready for your Instagram Story.');
      } else if (channel === 'x') {
        const tweet = `Finished ${headlineTitle} with @VictoryFitness! ${minutes}m · ${setsLogged} sets · Streak ${streakDays} days 🔥 ${resolvedWorkoutUrl}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
        showToast('Story card downloaded! You can attach it to your tweet.');
      } else if (channel === 'linkedin') {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedWorkoutUrl)}`, '_blank');
        showToast('Story card downloaded! Ready to share on LinkedIn.');
      } else if (channel === 'direct') {
        showToast('Story card downloaded (1080 × 1920 PNG)! Ready to share.');
      }
    } catch (err) {
      console.error('Sharing failed:', err);
      try {
        await Share.share({ message: shareMessage });
      } catch {}
    } finally {
      setSharingLoading(false);
    }
  };

  const handleShareWhatsApp = () => handleShareAction('whatsapp');
  const handleShareInstagram = () => handleShareAction('instagram');
  const handleShareX = () => handleShareAction('x');
  const handleShareLinkedIn = () => handleShareAction('linkedin');
  const handleSave = () => handleShareAction('save');
  const handleDirectShare = () => handleShareAction('direct');

  const handleCircle = () => {
    if (Platform.OS === 'web') {
      window.open('https://circle.so', '_blank');
    } else {
      onDoneHome();
    }
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
              <Text style={styles.statusLabel}>{sessionLabel}</Text>
            </View>

            <Text style={styles.workoutHeadline}>
              {headlineTitle}
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
                {completedExercises.length > 0 ? (
                  completedExercises.map((e, idx) => (
                    <View key={`${e.n}-${idx}`} style={styles.exerciseRow}>
                      <View style={styles.exerciseGreenDot} />
                      <Text style={styles.exerciseName}>{e.n}</Text>
                      <Text style={styles.exerciseSets}>{e.s}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.exerciseRow}>
                    <View style={styles.exerciseGreenDot} />
                    <Text style={styles.exerciseName}>{headlineTitle}</Text>
                    <Text style={styles.exerciseSets}>{`${setsLogged} sets`}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.whatYouDidSection}>
                <Text style={styles.sectionKicker}>WHAT YOU FOLLOWED</Text>
                <View style={styles.silverChaptersBox}>
                  {(completedExercises.length > 0 ? completedExercises : [{ n: headlineTitle, s: `${minutes} min`, cardN: storyTitle }]).map((c, idx) => (
                    <View key={`${c.n}-${idx}`} style={styles.silverChapterRow}>
                      <View style={styles.silverCheckCircle}>
                        <View style={styles.silverCheckTick} />
                      </View>
                      <Text style={styles.silverChapterName}>{c.n}</Text>
                      <Text style={styles.silverChapterAt}>{c.s || ''}</Text>
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
                  {`That is ${sessionLabel.toLowerCase().replace(' complete', '')}, ${userName} — ${headlineTitle}, ${minutes} minutes finished. Same time, same you.`}
                </Text>
                <Text style={styles.readTwiceAuthor}>VICTOR AKKO</Text>
              </View>
            )}

            {/* YOUR SHARE CARD · 9:16 matching Image 2 */}
            <View style={styles.shareCardContainer}>
              <Text style={styles.shareSectionKicker}>YOUR SHARE CARD · 9:16</Text>

              <Pressable style={styles.storyCard} onPress={() => void handleDirectShare()}>
                <View ref={cardRef} collapsable={false} style={[StyleSheet.absoluteFillObject, { justifyContent: 'space-between' }]}>
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
                      <Text style={styles.storyDateLabel}>{displayDate}</Text>
                    </View>

                    <Text style={styles.storyCompleteLabel}>WORKOUT COMPLETE</Text>
                    <Text style={styles.storyWorkoutTitle}>{storyTitle}</Text>

                    {/* Copper/Orange divider line */}
                    <View style={styles.storyOrangeDivider} />

                    {/* Bulleted Exercises with 4px gold dots */}
                    <View style={styles.storyExerciseList}>
                      {completedExercises.length > 0 ? (
                        <>
                          {completedExercises.slice(0, 5).map((e, idx) => (
                            <View key={`${e.cardN}-${idx}`} style={styles.storyExerciseItem}>
                              <View style={styles.storyGoldDot} />
                              <Text style={styles.storyExerciseName} numberOfLines={1} ellipsizeMode="tail">
                                {e.cardN}
                              </Text>
                            </View>
                          ))}
                          {completedExercises.length > 5 ? (
                            <View style={styles.storyMoreItem}>
                              <Text style={styles.storyMoreText}>
                                +{completedExercises.length - 5} MORE MOVEMENTS COMPLETED
                              </Text>
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <View style={styles.storyExerciseItem}>
                          <View style={styles.storyGoldDot} />
                          <Text style={styles.storyExerciseName} numberOfLines={1} ellipsizeMode="tail">
                            SESSION COMPLETED
                          </Text>
                        </View>
                      )}
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
                          {intensityLabel}
                        </Text>
                        <Text style={styles.storyMetricValClash}>
                          {intensityText}
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
                        {coachQuote}
                      </Text>
                    </View>

                    {/* Footer with Athlete Name, App URL, and QR Box */}
                    <View style={styles.storyFooterRow}>
                      <View>
                        <Text style={styles.storyCoachName}>{displayUserName}</Text>
                        <Text style={styles.storyAppUrl}>VICTORY-FITNESS.APP</Text>
                      </View>
                      <View style={styles.storyQrBox}>
                        {qrPreviewUri ? (
                          <Image source={{ uri: qrPreviewUri }} style={styles.storyQrImage} resizeMode="contain" />
                        ) : (
                          <Text style={styles.storyQrText}>QR</Text>
                        )}
                      </View>
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
                <Pressable
                  style={[styles.whatsappBtn, sharingLoading && { opacity: 0.7 }]}
                  onPress={() => void handleShareWhatsApp()}
                  disabled={sharingLoading}
                >
                  <Text style={styles.whatsappBtnText}>{sharingLoading ? 'Preparing...' : 'WhatsApp'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.instagramBtn, sharingLoading && { opacity: 0.7 }]}
                  onPress={() => void handleShareInstagram()}
                  disabled={sharingLoading}
                >
                  <Text style={styles.instagramBtnText}>{sharingLoading ? 'Preparing...' : 'Instagram'}</Text>
                </Pressable>
              </View>
              <View style={styles.socialRow2}>
                <Pressable
                  style={[styles.socialPillBtn, sharingLoading && { opacity: 0.7 }]}
                  onPress={() => void handleShareX()}
                  disabled={sharingLoading}
                >
                  <Text style={styles.socialPillText}>X</Text>
                </Pressable>
                <Pressable
                  style={[styles.socialPillBtn, sharingLoading && { opacity: 0.7 }]}
                  onPress={() => void handleShareLinkedIn()}
                  disabled={sharingLoading}
                >
                  <Text style={styles.socialPillText}>LinkedIn</Text>
                </Pressable>
                <Pressable style={styles.socialPillBtn} onPress={handleCircle}>
                  <Text style={styles.socialPillText}>Circle</Text>
                </Pressable>
                <Pressable
                  style={[styles.socialPillBtn, sharingLoading && { opacity: 0.7 }]}
                  onPress={() => void handleSave()}
                  disabled={sharingLoading}
                >
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

        {toastMessage && (
          <View style={styles.toastContainer} pointerEvents="none">
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
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
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 12.5,
    letterSpacing: 0.6,
    color: 'rgba(247, 243, 238, 0.9)',
  },
  storyMoreItem: {
    paddingLeft: 13,
    marginTop: 2,
  },
  storyMoreText: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: 'rgba(247, 243, 238, 0.45)',
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
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    padding: 2,
  },
  storyQrImage: {
    width: 30,
    height: 30,
    borderRadius: 4,
  },
  storyQrText: {
    fontFamily: MONO,
    fontSize: 8.5,
    color: '#0D0D0D',
  },
  shareCaption: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 10,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1E1E1E',
    borderColor: 'rgba(201, 148, 58, 0.6)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    fontFamily: DMSANS,
    fontSize: 13,
    color: IVORY,
    textAlign: 'center',
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
