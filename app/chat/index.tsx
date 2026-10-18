import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import {
  fetchCurrentUser,
  AuthUser,
  streamCoachVictorMessage,
  fetchCoachVictorHistory,
  clearCoachVictorHistory,
  applyCoachWorkoutPlanAction,
  CoachWorkoutPlanAction,
  CoachWorkoutPlanPreview,
} from '../../lib/api';
import { savePlanBuiltData } from '../../lib/planStorage';
import { saveLatestStrengthWorkoutPlan } from '../../lib/workout-plans';
import { normalizeSubscriptionTier } from '../../lib/access';
import { pushRoute, goBackOrReplace } from '../../lib/navigation';
import { useLanguage } from '../../lib/i18n';
import { VictorThinkingIndicator } from '../../components/chat/VictorThinkingIndicator';

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  prescriptionCard?: {
    title: string;
    meta: string;
    workoutId?: string;
    workoutTitle?: string;
    vimeoId?: string;
    videoUrl?: string;
    tag?: string;
    thumbnail?: string;
  };
  contextNote?: string;
  homePlanAction?: {
    type?: string;
    sourcePrompt: string;
    scope?: string;
    targetDays?: string[];
    targetMinutes?: number | null;
    dayCount?: number;
    summary?: string;
    buttonLabel?: string;
    status?: 'ready' | 'saving' | 'saved';
    preview?: CoachWorkoutPlanPreview;
  };
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

const QUICK_PROMPTS = [
  'Adjust my current routine',
  'I only have 25 minutes tonight and no equipment.',
  'My lower back is tight today.',
  'What should I eat before training?',
  'Swap dinner from my week plan.',
];

const LANGUAGE_ALIASES: Record<string, string> = {
  english: 'en',
  german: 'de',
  deutsch: 'de',
  bengali: 'bn',
  bangla: 'bn',
  বাংলা: 'bn',
  spanish: 'es',
  español: 'es',
  hindi: 'hi',
  हिन्दी: 'hi',
  urdu: 'ur',
  french: 'fr',
  portuguese: 'pt',
  italian: 'it',
  dutch: 'nl',
};

function detectLanguageOverride(text: string): string | null {
  const lowered = text.toLowerCase();
  const wantsLanguageChange = /(speak|reply|respond|talk|write|answer).{0,24}(in|auf|en)|ভাষা|language|sprache/.test(lowered);
  if (!wantsLanguageChange) return null;
  for (const [label, code] of Object.entries(LANGUAGE_ALIASES)) {
    if (lowered.includes(label.toLowerCase())) return code;
  }
  return null;
}

function planSummaryLineFromPrompt(prompt: string) {
  const lowered = prompt.toLowerCase();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    .filter((day) => lowered.includes(day.toLowerCase().slice(0, 3)))
    .join(', ');
  const minutes = lowered.match(/(\d{1,3})\s*(?:min|minute)/)?.[1];
  const kit = lowered.includes('no equipment') || lowered.includes('bodyweight') ? 'Bodyweight' : lowered.includes('dumbbell') ? 'Dumbbells' : 'Profile kit';
  return `Coach chat plan · ${days || 'your week'} · ${minutes ? `${minutes} min` : 'profile time'} · ${kit}.`;
}

function insertButtonLabel(language?: string) {
  if (language === 'de') return 'In Home-Plan einfügen';
  if (language === 'bn') return 'Home workout plan-এ বসান';
  if (language === 'hi') return 'Home workout plan में डालें';
  if (language === 'es') return 'Insertar en Home';
  return 'insert into my workout plan';
}

function parseInlineMarkdown(text: string, baseStyle: any, keyPrefix: string) {
  if (!text) return null;
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={`${keyPrefix}-b-${idx}`} style={[baseStyle, styles.inlineBold]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <Text key={`${keyPrefix}-i-${idx}`} style={[baseStyle, styles.inlineItalic]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text key={`${keyPrefix}-c-${idx}`} style={[baseStyle, styles.inlineCode]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={`${keyPrefix}-t-${idx}`} style={baseStyle}>
        {part}
      </Text>
    );
  });
}

function isMarkdownTableDivider(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 4;
}

function parseMarkdownTableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function FormattedCoachMessage({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <View style={styles.formattedCoachWrap}>
      {lines.map((rawLine, lineIdx) => {
        const trimmed = rawLine.trim();

        // Empty line -> spacer
        if (!trimmed) {
          return <View key={`sp-${lineIdx}`} style={styles.lineSpacer} />;
        }

        if (isMarkdownTableDivider(trimmed)) {
          return null;
        }

        if (isMarkdownTableRow(trimmed)) {
          const cells = parseMarkdownTableCells(trimmed);
          const isHeader = lineIdx + 1 < lines.length && isMarkdownTableDivider(lines[lineIdx + 1] || '');
          if (!cells.length || isHeader) {
            return null;
          }
          const [name, sets, reps, rest, equipment] = cells;
          return (
            <View key={`tbl-${lineIdx}`} style={styles.planExerciseRow}>
              <Text style={styles.planExerciseName}>
                {parseInlineMarkdown(name, styles.planExerciseName, `tbl-name-${lineIdx}`)}
              </Text>
              <Text style={styles.planExerciseMeta}>
                {[sets, reps, rest, equipment].filter(Boolean).join(' · ')}
              </Text>
            </View>
          );
        }

        // Markdown headings: ### / ## / #
        if (/^#{1,3}\s+/.test(trimmed)) {
          const headingText = trimmed.replace(/^#{1,3}\s+/, '');
          return (
            <Text key={`hd-${lineIdx}`} style={styles.coachHeadingText}>
              {parseInlineMarkdown(headingText, styles.coachHeadingText, `hd-${lineIdx}`)}
            </Text>
          );
        }

        // Section header wrapped in bold: **Heading:** or **Heading**
        const boldHeaderMatch = trimmed.match(/^\*\*(.+?)\*\*:?$/);
        if (boldHeaderMatch) {
          return (
            <View key={`sh-${lineIdx}`} style={styles.coachSectionHeader}>
              <Text style={styles.coachSectionHeaderText}>
                {boldHeaderMatch[1]}
              </Text>
            </View>
          );
        }

        // Numbered list item: 1. Item or 1. **Title** description
        const numberedMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          const num = numberedMatch[2];
          const content = numberedMatch[3];
          return (
            <View key={`num-${lineIdx}`} style={styles.numberedRow}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>{num}</Text>
              </View>
              <View style={styles.numberedContentWrap}>
                <Text style={styles.numberedContentText}>
                  {parseInlineMarkdown(content, styles.coachBubbleText, `num-${lineIdx}`)}
                </Text>
              </View>
            </View>
          );
        }

        // Bullet item: - item or * item or • item (with possible indentation)
        const bulletMatch = rawLine.match(/^(\s*)(?:[-*•])\s+(.*)$/);
        if (bulletMatch) {
          const isIndented = bulletMatch[1].length >= 2;
          const content = bulletMatch[2];
          return (
            <View
              key={`bul-${lineIdx}`}
              style={[styles.bulletRow, isIndented && styles.bulletRowIndented]}
            >
              <Text style={styles.bulletDot}>•</Text>
              <View style={styles.bulletContentWrap}>
                <Text style={styles.bulletContentText}>
                  {parseInlineMarkdown(content, styles.coachBubbleText, `bul-${lineIdx}`)}
                </Text>
              </View>
            </View>
          );
        }

        // Regular paragraph
        return (
          <Text key={`p-${lineIdx}`} style={styles.paragraph}>
            {parseInlineMarkdown(rawLine, styles.coachBubbleText, `p-${lineIdx}`)}
          </Text>
        );
      })}
    </View>
  );
}

function WorkoutPlanActionCard({
  action,
  onConfirm,
  defaultButtonLabel,
}: {
  action: NonNullable<ChatMessage['homePlanAction']>;
  onConfirm: () => void;
  defaultButtonLabel: string;
}) {
  const preview = action.preview;
  const days = preview?.days || [];
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  if (!preview || days.length === 0) {
    return (
      <View style={styles.homePlanActionCard}>
        <Text style={styles.homePlanActionTitle}>
          {action.status === 'saved'
            ? 'Home workout plan updated'
            : action.summary || 'Ready to update your Home workout plan'}
        </Text>
        <Text style={styles.homePlanActionText}>
          {action.scope === 'day'
            ? 'This will update the selected day in your active Home workout plan.'
            : 'This will replace your current Home workout plan with the plan from this chat.'}
        </Text>
        <Pressable
          style={[
            styles.homePlanActionButton,
            action.status === 'saved' && styles.homePlanActionButtonSaved,
            action.status === 'saving' && styles.homePlanActionButtonDisabled,
          ]}
          disabled={action.status === 'saving' || action.status === 'saved'}
          onPress={onConfirm}
        >
          {action.status === 'saving' ? (
            <ActivityIndicator color={OBSIDIAN} size="small" />
          ) : (
            <Text style={styles.homePlanActionButtonText}>
              {action.status === 'saved' ? 'Inserted' : action.buttonLabel || defaultButtonLabel}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  const safeIndex = Math.min(selectedDayIndex, days.length - 1);
  const activeDay = days[safeIndex] || days[0];
  const duration = activeDay.expected_duration || preview.expected_duration || action.targetMinutes || 90;

  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <View style={styles.previewBadgeRow}>
          <View style={styles.previewPlanBadge}>
            <Ionicons name="barbell-outline" size={13} color={GOLD} />
            <Text style={styles.previewPlanBadgeText}>
              {`${days.length}-DAY ROUTINE PREVIEW`}
            </Text>
          </View>
          <View style={styles.previewDurationBadge}>
            <Ionicons name="time-outline" size={12} color={IVORY} />
            <Text style={styles.previewDurationText}>{duration} min / session</Text>
          </View>
        </View>

        <Text style={styles.previewTitle}>
          {preview.plan_name || action.summary || `${days.length}-Day Workout Plan`}
        </Text>

        {preview.equipment && preview.equipment.length > 0 && (
          <View style={styles.previewEquipmentRow}>
            <Text style={styles.previewEquipmentLabel}>Equipment:</Text>
            {preview.equipment.map((eq, i) => (
              <View key={i} style={styles.previewEquipmentPill}>
                <Text style={styles.previewEquipmentPillText}>{eq}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {preview.uncertainties && preview.uncertainties.length > 0 && (
        <View style={styles.previewWarningBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#E0A82E" />
          <View style={{ flex: 1 }}>
            {preview.uncertainties.map((u, i) => (
              <Text key={i} style={styles.previewWarningText}>{u}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Day Selector Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewDayTabs}>
        {days.map((day, idx) => {
          const isSelected = idx === safeIndex;
          return (
            <Pressable
              key={idx}
              onPress={() => setSelectedDayIndex(idx)}
              style={[
                styles.previewDayTab,
                isSelected && styles.previewDayTabActive,
              ]}
            >
              <Text style={[styles.previewDayTabText, isSelected && styles.previewDayTabTextActive]}>
                {`Day ${idx + 1}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Active Day Detail */}
      <View style={styles.previewDayContent}>
        <View style={styles.previewDayHeader}>
          <Text style={styles.previewDayName}>{activeDay.day_name}</Text>
          <Text style={styles.previewDayMeta}>
            {activeDay.exercises.length} exercises • {activeDay.expected_duration || duration} min
          </Text>
        </View>

        <View style={styles.previewExercisesList}>
          {activeDay.exercises.map((ex, exIdx) => (
            <View key={exIdx} style={styles.previewExerciseCard}>
              <View style={styles.previewExerciseTopRow}>
                <Text style={styles.previewExerciseName}>{ex.exercise_name}</Text>
                {ex.type ? (
                  <View style={styles.previewExerciseTypePill}>
                    <Text style={styles.previewExerciseTypePillText}>{ex.type}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.previewExerciseMetrics}>
                {ex.weight ? (
                  <View style={styles.previewMetricTagWeight}>
                    <Ionicons name="barbell-outline" size={12} color={GOLD} />
                    <Text style={styles.previewMetricTagWeightText}>{ex.weight}</Text>
                  </View>
                ) : null}

                <View style={styles.previewMetricTag}>
                  <Text style={styles.previewMetricTagText}>
                    {ex.sets} × {ex.reps}
                  </Text>
                </View>

                {ex.rest ? (
                  <View style={styles.previewMetricTag}>
                    <Ionicons name="timer-outline" size={11} color="rgba(247,243,238,0.7)" />
                    <Text style={styles.previewMetricTagText}>{ex.rest}</Text>
                  </View>
                ) : null}
              </View>

              {ex.notes ? (
                <View style={styles.previewExerciseNotesRow}>
                  <Ionicons name="information-circle-outline" size={12} color="rgba(247,243,238,0.5)" />
                  <Text style={styles.previewExerciseNotesText}>{ex.notes}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Confirmation Button */}
      <Pressable
        style={[
          styles.homePlanActionButton,
          action.status === 'saved' && styles.homePlanActionButtonSaved,
          action.status === 'saving' && styles.homePlanActionButtonDisabled,
          { marginTop: 14 },
        ]}
        disabled={action.status === 'saving' || action.status === 'saved'}
        onPress={onConfirm}
      >
        {action.status === 'saving' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={OBSIDIAN} size="small" />
            <Text style={styles.homePlanActionButtonText}>Importing {days.length}-Day Plan…</Text>
          </View>
        ) : action.status === 'saved' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="checkmark-circle" size={16} color={OBSIDIAN} />
            <Text style={styles.homePlanActionButtonText}>Imported to Home Plan</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="cloud-download-outline" size={16} color={OBSIDIAN} />
            <Text style={styles.homePlanActionButtonText}>
              {action.buttonLabel || `Import ${days.length}-Day Plan to Home`}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default function ClaudeCoachScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    initialPrompt?: string;
    autoSend?: string;
    prescriptionTitle?: string;
    prescriptionMeta?: string;
    prescriptionWorkoutId?: string;
    prescriptionWorkoutTitle?: string;
    prescriptionVimeoId?: string;
    prescriptionVideoUrl?: string;
    prescriptionTag?: string;
    prescriptionThumbnail?: string;
    contextNote?: string;
  }>();
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [inputText, setInputText] = useState('');
  const [contentHeight, setContentHeight] = useState(38);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [conversationLanguage, setConversationLanguage] = useState<string | null>(null);
  const [insertingPlanMessageId, setInsertingPlanMessageId] = useState<string | null>(null);
  const autoPromptHandledRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const activeStreamCancelRef = useRef<(() => void) | null>(null);
  const activeStreamResolveRef = useRef<(() => void) | null>(null);
  const activeRequestRef = useRef<{ cancelled: boolean } | null>(null);

  // Auto-reset content height when input is cleared
  useEffect(() => {
    if (!inputText) {
      setContentHeight(38);
    }
  }, [inputText]);

  const composerHeight = Math.min(140, Math.max(38, contentHeight));

  const isMac = useMemo(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
  }, []);

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent?.key || e.key;
    if (key === 'Enter') {
      const isCtrlOrCmd = Boolean(
        e.nativeEvent?.ctrlKey ||
        e.nativeEvent?.metaKey ||
        e.ctrlKey ||
        e.metaKey
      );
      if (isCtrlOrCmd) {
        e.preventDefault?.();
        handleSubmitInput();
      }
      // Plain Enter naturally creates a newline in multiline mode
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Horizontal mouse-drag and wheel scrolling for Quick Prompts
  const promptScrollRef = useRef<ScrollView>(null);
  const isPromptMouseDown = useRef(false);
  const promptStartX = useRef(0);
  const promptScrollStartLeft = useRef(0);
  const promptHasDragged = useRef(false);

  const getPromptDomNode = () => {
    return (
      (promptScrollRef.current as any)?.getScrollResponder?.()?.getScrollableNode?.() ||
      (promptScrollRef.current as any)
    );
  };

  const handlePromptMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    isPromptMouseDown.current = true;
    promptHasDragged.current = false;
    promptStartX.current = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const node = getPromptDomNode();
    promptScrollStartLeft.current = node?.scrollLeft || 0;
  };

  const handlePromptMouseMove = (e: any) => {
    if (Platform.OS !== 'web' || !isPromptMouseDown.current) return;
    const currentX = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const diff = currentX - promptStartX.current;
    if (Math.abs(diff) > 4) {
      promptHasDragged.current = true;
    }
    const node = getPromptDomNode();
    if (node) {
      node.scrollLeft = promptScrollStartLeft.current - diff;
    }
  };

  const handlePromptMouseUp = () => {
    if (Platform.OS !== 'web') return;
    isPromptMouseDown.current = false;
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = getPromptDomNode();
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && e.deltaY !== 0) {
        node.scrollLeft += e.deltaY * 0.8;
      }
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      node.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    void fetchCurrentUser().then((u) => {
      if (u) setCurrentUser(u);
    });
  }, []);

  const tier = useMemo(() => {
    return normalizeSubscriptionTier(currentUser?.subscription_tier);
  }, [currentUser?.subscription_tier]);

  const hasCoach = tier !== 'SILVER' && tier !== 'NONE';
  const isPriority = tier === 'PLATINUM' || tier === 'INNER_CIRCLE';

  const coachStatus = isPriority
    ? 'PRIORITY RESPONSES · FRONT OF QUEUE'
    : 'UNLIMITED · REPLIES IN ~2S';

  useEffect(() => {
    if (!hasCoach) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetchCoachVictorHistory({ skipResponseCache: true })
      .then((history) => {
        if (cancelled || !Array.isArray(history.messages)) return;
        const loadedMessages = history.messages
          .filter((item) => item.role === 'user' || item.role === 'assistant')
          .slice(-40)
          .map((item) => ({
            id: item.id || `${item.role}-${item.created_at}`,
            sender: item.role === 'user' ? 'user' : 'coach',
            text: item.content,
            contextNote: item.role === 'assistant' ? 'from your last coach conversation' : undefined,
          } satisfies ChatMessage));
        setMessages(loadedMessages);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 120);
      })
      .catch(() => {
        // History should never block a fresh coaching conversation.
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasCoach]);

  const handleSendText = async (
    textToSend: string,
    options?: {
      prescriptionTitle?: string;
      prescriptionMeta?: string;
      prescriptionWorkoutId?: string;
      prescriptionWorkoutTitle?: string;
      prescriptionVimeoId?: string;
      prescriptionVideoUrl?: string;
      prescriptionTag?: string;
      prescriptionThumbnail?: string;
      contextNote?: string;
    }
  ) => {
    const text = textToSend.trim();
    if (!text || sending) return;
    const requestState = { cancelled: false };
    activeRequestRef.current = requestState;
    const requestedLanguage = detectLanguageOverride(text);
    const nextLanguage = requestedLanguage || conversationLanguage || currentUser?.preferred_language || undefined;
    const backendMessage = text;
    if (requestedLanguage) {
      setConversationLanguage(requestedLanguage);
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);
    setStreamingText('');

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Call live backend or smart fallback
    try {
      let assistantText = '';
      let planAction: CoachWorkoutPlanAction | null = null;
      await new Promise<void>(async (resolve) => {
        activeStreamResolveRef.current = resolve;
        const cancelStream = await streamCoachVictorMessage(
          backendMessage,
          (chunk) => {
            if (requestState.cancelled) return;
            assistantText += chunk;
            setStreamingText(assistantText);
            scrollViewRef.current?.scrollToEnd({ animated: false });
          },
          (fullReply, _threadId, action) => {
            if (requestState.cancelled) {
              resolve();
              return;
            }
            assistantText = fullReply || assistantText;
            planAction = action || null;
            resolve();
          },
          (err) => {
            if (!requestState.cancelled) {
              console.warn('Coach stream error:', err);
            }
            resolve();
          },
          { languageOverride: nextLanguage }
        );
        if (requestState.cancelled) {
          cancelStream();
          resolve();
          return;
        }
        if (activeRequestRef.current === requestState) {
          activeStreamCancelRef.current = cancelStream;
        }
      });

      if (requestState.cancelled) return;

      if (!assistantText) {
        assistantText = `I hear you, ${currentUser?.name ? currentUser.name.split(' ')[0] : 'friend'}. Based on your target of ${currentUser?.daily_protein_target || 112} g protein and your training consistency, let's keep showing up. How does that sound?`;
      }

      const actionForReply = planAction as CoachWorkoutPlanAction | null;
      const coachReply: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: assistantText,
        homePlanAction: actionForReply
          ? {
              type: actionForReply.type,
              sourcePrompt: actionForReply.source_prompt,
              scope: actionForReply.scope,
              targetDays: actionForReply.target_days || [],
              targetMinutes: actionForReply.target_minutes ?? null,
              dayCount: actionForReply.day_count ?? (actionForReply.preview?.days_count ?? undefined),
              summary: actionForReply.summary,
              buttonLabel: actionForReply.button_label,
              preview: actionForReply.preview,
              status: 'ready',
            }
          : undefined,
        prescriptionCard: options?.prescriptionTitle
          ? {
              title: options.prescriptionTitle,
              meta: options.prescriptionMeta || '',
              workoutId: options.prescriptionWorkoutId,
              workoutTitle: options.prescriptionWorkoutTitle,
              vimeoId: options.prescriptionVimeoId,
              videoUrl: options.prescriptionVideoUrl,
              tag: options.prescriptionTag,
              thumbnail: options.prescriptionThumbnail,
            }
          : undefined,
        contextNote: options?.contextNote || 'used your identity statement & habit data',
      };

      setMessages((prev) => [...prev, coachReply]);
    } catch {
      const fallbackReply: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: `Got it. Remember your statement: "${currentUser?.identity_statement || 'Every rep is a reminder that growth takes patience.'}". Let's execute today.`,
        contextNote: 'connected to your habit engine',
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      if (activeRequestRef.current === requestState) {
        activeRequestRef.current = null;
        activeStreamCancelRef.current = null;
        activeStreamResolveRef.current = null;
        setStreamingText('');
        setSending(false);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }
  };

  useEffect(() => {
    const initialPrompt = typeof params.initialPrompt === 'string' ? params.initialPrompt.trim() : '';
    if (!hasCoach || !currentUser || !initialPrompt || autoPromptHandledRef.current) return;
    autoPromptHandledRef.current = true;
    if (params.autoSend === '1') {
      void handleSendText(initialPrompt, buildPrescriptionOptionsFromParams());
    } else {
      setInputText(initialPrompt);
    }
  }, [currentUser, hasCoach, params.autoSend, params.initialPrompt]);

  const buildPrescriptionOptionsFromParams = () => ({
    prescriptionTitle: typeof params.prescriptionTitle === 'string' ? params.prescriptionTitle : undefined,
    prescriptionMeta: typeof params.prescriptionMeta === 'string' ? params.prescriptionMeta : undefined,
    prescriptionWorkoutId: typeof params.prescriptionWorkoutId === 'string' ? params.prescriptionWorkoutId : undefined,
    prescriptionWorkoutTitle: typeof params.prescriptionWorkoutTitle === 'string' ? params.prescriptionWorkoutTitle : undefined,
    prescriptionVimeoId: typeof params.prescriptionVimeoId === 'string' ? params.prescriptionVimeoId : undefined,
    prescriptionVideoUrl: typeof params.prescriptionVideoUrl === 'string' ? params.prescriptionVideoUrl : undefined,
    prescriptionTag: typeof params.prescriptionTag === 'string' ? params.prescriptionTag : undefined,
    prescriptionThumbnail: typeof params.prescriptionThumbnail === 'string' ? params.prescriptionThumbnail : undefined,
    contextNote: typeof params.contextNote === 'string' ? params.contextNote : 'used your workout filters and profile',
  });

  const handleOpenPrescriptionWorkout = (card: NonNullable<ChatMessage['prescriptionCard']>) => {
    if (!card.workoutId) return;
    pushRoute(router, {
      pathname: '/workout',
      params: {
        workoutId: card.workoutId,
        open: '1',
      },
    });
  };

  const handleInsertHomePlan = async (
    messageId: string,
    action: NonNullable<ChatMessage['homePlanAction']>,
    generatedReply: string
  ) => {
    if (insertingPlanMessageId) return;
    setInsertingPlanMessageId(messageId);
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId && message.homePlanAction
          ? { ...message, homePlanAction: { ...message.homePlanAction, status: 'saving' } }
          : message
      )
    );
    try {
      const plan = await applyCoachWorkoutPlanAction({
        source_prompt: action.sourcePrompt,
        generated_reply: generatedReply,
        scope: action.scope || 'full_plan',
        target_days: action.targetDays || [],
        target_minutes: action.targetMinutes ?? null,
        summary: action.summary || '',
      });
      await saveLatestStrengthWorkoutPlan(plan);
      await savePlanBuiltData({
        line: plan.summary || action.summary || planSummaryLineFromPrompt(action.sourcePrompt),
        kit: action.sourcePrompt.toLowerCase().includes('bodyweight') || action.sourcePrompt.toLowerCase().includes('no equipment') ? 'Bodyweight' : 'Profile kit',
        duration: action.targetMinutes
          ? `${action.targetMinutes} minutes`
          : action.sourcePrompt.match(/(\d{1,3})\s*(?:min|minute)/i)?.[1]
          ? `${action.sourcePrompt.match(/(\d{1,3})\s*(?:min|minute)/i)?.[1]} minutes`
          : 'Profile time',
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId && message.homePlanAction
            ? { ...message, homePlanAction: { ...message.homePlanAction, status: 'saved' } }
            : message
        )
      );
      Alert.alert('Home plan updated', 'This workout plan is now active on your Home screen.');
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId && message.homePlanAction
            ? { ...message, homePlanAction: { ...message.homePlanAction, status: 'ready' } }
            : message
        )
      );
      Alert.alert('Insert failed', 'Unable to insert this plan into Home right now. Please try again.');
    } finally {
      setInsertingPlanMessageId(null);
    }
  };

  const handleClearConversation = async () => {
    if (sending || historyLoading) return;
    try {
      await clearCoachVictorHistory();
      setMessages([]);
      setConversationLanguage(null);
      autoPromptHandledRef.current = false;
    } catch {
      Alert.alert('Could not clear chat', 'Please try again in a moment.');
    }
  };

  const handleSubmitInput = () => {
    const initialPrompt = typeof params.initialPrompt === 'string' ? params.initialPrompt.trim() : '';
    const shouldAttachPrescription = Boolean(initialPrompt && inputText.trim() === initialPrompt);
    void handleSendText(inputText, shouldAttachPrescription ? buildPrescriptionOptionsFromParams() : undefined);
  };

  const handleCancelGeneration = () => {
    if (!sending) return;
    if (activeRequestRef.current) {
      activeRequestRef.current.cancelled = true;
    }
    activeStreamCancelRef.current?.();
    activeStreamResolveRef.current?.();
    activeStreamCancelRef.current = null;
    activeStreamResolveRef.current = null;
    setStreamingText('');
    setSending(false);
  };

  // If Silver tier, show the locked paywall teaser per prototype
  if (!hasCoach) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.coachName}>Your coach</Text>
            <Text style={styles.coachStatusText}>AVAILABLE ON GOLD</Text>
          </View>
          <Pressable
            onPress={() => goBackOrReplace(router, '/(tabs)')}
            hitSlop={10}
            style={({ pressed }) => [styles.closeBtnPressable, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="rgba(247, 243, 238, 0.6)" />
          </Pressable>
        </View>

        <View style={styles.lockedContainer}>
          <View style={styles.lockBox}>
            <View style={styles.lockGraphic} />
          </View>
          <Text style={styles.lockedTitle}>AI Coach is part of Gold</Text>
          <Text style={styles.lockedDesc}>
            Your coach knows your 4 habit fields, your favourite meals, and your equipment. It builds circuits on the fly when you're short on time.
          </Text>

          <Pressable style={styles.upgradeBtn} onPress={() => pushRoute(router, '/plan')}>
            <Text style={styles.upgradeBtnText}>Upgrade to Gold</Text>
          </Pressable>

          <Pressable style={styles.backHomeBtn} onPress={() => goBackOrReplace(router, '/(tabs)')}>
            <Text style={styles.backHomeBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Bar */}
      <View style={styles.topBarWrap}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.coachName}>Your coach</Text>
            <Text style={[styles.coachStatusText, isPriority && styles.statusPriority]}>
              {coachStatus}
            </Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              style={({ pressed }) => [
                styles.newChatButton,
                pressed && styles.newChatButtonPressed,
                (sending || historyLoading) && styles.newChatButtonDisabled,
              ]}
              onPress={handleClearConversation}
              disabled={sending || historyLoading}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('New chat')}
            >
              <Ionicons name="create-outline" size={14} color={GOLD} />
              <Text style={styles.newChatText}>{t('New chat')}</Text>
            </Pressable>
            <Pressable
              onPress={() => goBackOrReplace(router, '/(tabs)')}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtnPressable, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="rgba(247, 243, 238, 0.6)" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Messages Thread */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.threadScrollView}
        contentContainerStyle={styles.threadScroll}
        showsVerticalScrollIndicator={false}
      >
        {historyLoading && !messages.length ? (
          <View style={[styles.messageWrap, styles.coachMessageWrap]}>
            <VictorThinkingIndicator text={t('Loading previous chat…')} />
          </View>
        ) : null}

        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <View
              key={m.id}
              style={[
                styles.messageWrap,
                isUser ? styles.userMessageWrap : styles.coachMessageWrap,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.coachBubble,
                ]}
              >
                {isUser ? (
                  <Text style={[styles.bubbleText, styles.userBubbleText]}>
                    {m.text}
                  </Text>
                ) : (
                  <FormattedCoachMessage text={m.text} />
                )}

                {/* Prescription Card */}
                {m.prescriptionCard ? (
                  <Pressable
                    style={styles.prescriptionCard}
                    onPress={() => handleOpenPrescriptionWorkout(m.prescriptionCard!)}
                    disabled={!m.prescriptionCard.workoutId}
                  >
                    <Text style={styles.prescriptionTitle}>{m.prescriptionCard.title}</Text>
                    <Text style={styles.prescriptionMeta}>{m.prescriptionCard.meta}</Text>
                    {m.prescriptionCard.workoutId ? (
                      <Text style={styles.prescriptionOpenHint}>Open workout</Text>
                    ) : null}
                  </Pressable>
                ) : null}

                {m.homePlanAction ? (
                  <WorkoutPlanActionCard
                    action={m.homePlanAction}
                    onConfirm={() => void handleInsertHomePlan(m.id, m.homePlanAction!, m.text)}
                    defaultButtonLabel={insertButtonLabel(conversationLanguage || currentUser?.preferred_language)}
                  />
                ) : null}
              </View>

              {/* Context Footnote */}
              {m.contextNote ? (
                <Text style={styles.contextFootnote}>{m.contextNote}</Text>
              ) : null}
            </View>
          );
        })}

        {sending && !streamingText ? (
          <View style={[styles.messageWrap, styles.coachMessageWrap]}>
            <VictorThinkingIndicator />
          </View>
        ) : null}

        {sending && streamingText ? (
          <View style={[styles.messageWrap, styles.coachMessageWrap]}>
            <View style={[styles.bubble, styles.coachBubble]}>
              <FormattedCoachMessage text={streamingText} />
              <View style={styles.streamingCursorWrap}>
                <View style={styles.streamingCursor} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Quick Prompt Pills */}
      <View style={styles.quickPromptsRow}>
        <ScrollView
          ref={promptScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsScroll}
          style={
            Platform.OS === 'web'
              ? ({
                  cursor: 'grab',
                  userSelect: 'none',
                  WebkitOverflowScrolling: 'touch',
                  overflowX: 'auto',
                } as any)
              : undefined
          }
          {...(Platform.OS === 'web'
            ? {
                onMouseDown: handlePromptMouseDown,
                onMouseMove: handlePromptMouseMove,
                onMouseUp: handlePromptMouseUp,
                onMouseLeave: handlePromptMouseUp,
              }
            : {})}
        >
          {QUICK_PROMPTS.map((p, idx) => (
            <Pressable
              key={idx}
              style={styles.promptPill}
              onPress={() => {
                if (promptHasDragged.current) return;
                void handleSendText(p);
              }}
            >
              <Text style={styles.promptPillText} numberOfLines={1}>
                {p}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Input Box */}
      <View style={styles.inputWrap}>
        <View style={styles.inputContainer}>
          <View style={styles.inputBox}>
            <TextInput
              style={[
                styles.textInput,
                { height: composerHeight },
                Platform.select({
                  web: {
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    outlineColor: 'transparent',
                    borderWidth: 0,
                    borderColor: 'transparent',
                    boxShadow: 'none',
                    resize: 'none',
                    overflowY: 'auto',
                  } as any,
                }),
              ]}
              placeholder={t('Ask your coach anything…')}
              placeholderTextColor="rgba(247, 243, 238, 0.45)"
              value={inputText}
              onChangeText={setInputText}
              onKeyPress={handleKeyPress}
              onContentSizeChange={(e) => {
                const h = e.nativeEvent?.contentSize?.height;
                if (h && h > 0) {
                  setContentHeight(h);
                }
              }}
              multiline
              blurOnSubmit={false}
              scrollEnabled
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.sendBtn, !sending && !inputText.trim() && styles.sendBtnDisabled]}
              disabled={!sending && !inputText.trim()}
              onPress={sending ? handleCancelGeneration : handleSubmitInput}
              accessibilityRole="button"
              accessibilityLabel={sending ? t('Cancel response') : t('Send message')}
            >
              {sending ? (
                <View style={styles.stopIcon} />
              ) : (
                <View style={styles.sendArrow} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  topBarWrap: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    maxWidth: 860,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  coachName: {
    fontFamily: DMSANS,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: IVORY,
  },
  coachStatusText: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  statusPriority: {
    color: GOLD,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.40)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: 'rgba(201, 148, 58, 0.10)',
    gap: 5,
  },
  newChatButtonPressed: {
    backgroundColor: 'rgba(201, 148, 58, 0.22)',
    borderColor: 'rgba(201, 148, 58, 0.65)',
  },
  newChatButtonDisabled: {
    opacity: 0.4,
  },
  newChatText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.2,
  },
  closeBtnPressable: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadScrollView: {
    flex: 1,
    width: '100%',
  },
  threadScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  messageWrap: {
    width: '100%',
  },
  userMessageWrap: {
    alignItems: 'flex-end',
  },
  coachMessageWrap: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: GOLD,
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    maxWidth: '90%',
    backgroundColor: NAVY,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14.5,
  },
  userBubbleText: {
    fontFamily: DMSANS,
    fontWeight: '500',
    lineHeight: 21,
    color: OBSIDIAN,
  },
  coachBubbleText: {
    fontFamily: INTER,
    fontWeight: '400',
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.88)',
  },
  prescriptionCard: {
    marginTop: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.07)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  prescriptionTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  prescriptionMeta: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.6)',
    marginTop: 3,
  },
  prescriptionOpenHint: {
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '800',
    color: GOLD,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  homePlanActionCard: {
    marginTop: 12,
    backgroundColor: 'rgba(247, 243, 238, 0.07)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  homePlanActionTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: IVORY,
  },
  homePlanActionText: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.65)',
    marginTop: 4,
    marginBottom: 10,
  },
  homePlanActionButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  homePlanActionButtonDisabled: {
    opacity: 0.72,
  },
  homePlanActionButtonSaved: {
    backgroundColor: GREEN,
  },
  homePlanActionButtonText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '800',
    color: OBSIDIAN,
  },
  previewContainer: {
    marginTop: 12,
    backgroundColor: '#121214',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  previewHeader: {
    marginBottom: 10,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  previewPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  previewPlanBadgeText: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.5,
  },
  previewDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  previewDurationText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '600',
    color: IVORY,
  },
  previewTitle: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '800',
    color: IVORY,
    marginTop: 4,
  },
  previewEquipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  previewEquipmentLabel: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  previewEquipmentPill: {
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewEquipmentPillText: {
    fontFamily: INTER,
    fontSize: 11,
    color: 'rgba(247, 243, 238, 0.8)',
  },
  previewWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(224, 168, 46, 0.12)',
    borderColor: 'rgba(224, 168, 46, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  previewWarningText: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#E0A82E',
  },
  previewDayTabsScroll: {
    marginBottom: 10,
  },
  previewDayTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  previewDayTab: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
  },
  previewDayTabActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  previewDayTabText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  previewDayTabTextActive: {
    color: OBSIDIAN,
    fontWeight: '800',
  },
  previewDayContent: {
    backgroundColor: 'rgba(247, 243, 238, 0.03)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.06)',
  },
  previewDayHeader: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.06)',
  },
  previewDayName: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '800',
    color: IVORY,
  },
  previewDayMeta: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  previewExercisesList: {
    gap: 6,
  },
  previewExerciseCard: {
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.05)',
  },
  previewExerciseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewExerciseName: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: IVORY,
    flex: 1,
  },
  previewExerciseTypePill: {
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  previewExerciseTypePillText: {
    fontFamily: MONO,
    fontSize: 9.5,
    color: GOLD,
    fontWeight: '600',
  },
  previewExerciseMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  previewMetricTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewMetricTagText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.85)',
  },
  previewMetricTagWeight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewMetricTagWeightText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  previewExerciseNotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.04)',
  },
  previewExerciseNotesText: {
    fontFamily: INTER,
    fontSize: 10.5,
    fontStyle: 'italic',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  contextFootnote: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.4)',
    marginTop: 5,
    paddingLeft: 4,
  },
  streamingCursorWrap: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamingCursor: {
    width: 6,
    height: 14,
    backgroundColor: GOLD,
    borderRadius: 2,
    opacity: 0.85,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingLeft: 4,
  },
  typingText: {
    fontFamily: DMSANS,
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  quickPromptsRow: {
    paddingVertical: 8,
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  promptsScroll: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptPill: {
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(247, 243, 238, 0.03)',
    flexShrink: 0,
  },
  promptPillText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '500',
    color: IVORY,
  },
  formattedCoachWrap: {
    width: '100%',
  },
  coachHeadingText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '600',
    color: GOLD,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 4,
  },
  coachSectionHeader: {
    marginTop: 10,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 148, 58, 0.22)',
  },
  coachSectionHeaderText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 3,
  },
  numberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 148, 58, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    marginTop: 2,
    flexShrink: 0,
  },
  numberBadgeText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  numberedContentWrap: {
    flex: 1,
  },
  numberedContentText: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.95)',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 4,
  },
  bulletRowIndented: {
    paddingLeft: 20,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 21,
    color: GOLD,
    marginRight: 8,
  },
  bulletContentWrap: {
    flex: 1,
  },
  bulletContentText: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.88)',
  },
  planExerciseRow: {
    marginTop: 7,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(247, 243, 238, 0.06)',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(201, 148, 58, 0.65)',
  },
  planExerciseName: {
    fontFamily: DMSANS,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: IVORY,
  },
  planExerciseMeta: {
    fontFamily: MONO,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.62)',
    marginTop: 3,
  },
  paragraph: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.92)',
    marginVertical: 2,
  },
  lineSpacer: {
    height: 8,
  },
  inlineBold: {
    fontFamily: DMSANS,
    fontWeight: '700',
    color: IVORY,
  },
  inlineItalic: {
    fontStyle: 'italic',
    color: 'rgba(247, 243, 238, 0.95)',
  },
  inlineCode: {
    fontFamily: MONO,
    backgroundColor: 'rgba(247, 243, 238, 0.1)',
    fontSize: 12.5,
    color: GOLD,
  },
  inputWrap: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.08)',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 860,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  inputBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(247, 243, 238, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(247, 243, 238, 0.02)',
  },
  textInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 20,
    color: IVORY,
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
    outlineWidth: 0 as any,
    outlineColor: 'transparent' as any,
    minHeight: 38,
    maxHeight: 140,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 5,
    borderTopColor: 'transparent',
    borderBottomWidth: 5,
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  stopIcon: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: OBSIDIAN,
  },
  // Locked styles for Silver
  lockedContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(201, 148, 58, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockGraphic: {
    width: 18,
    height: 24,
    borderWidth: 3,
    borderColor: GOLD,
    borderRadius: 3,
    borderTopWidth: 8,
  },
  lockedTitle: {
    fontFamily: DMSANS,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: IVORY,
    textAlign: 'center',
    marginBottom: 10,
  },
  lockedDesc: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.6)',
    textAlign: 'center',
    marginBottom: 28,
  },
  upgradeBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  upgradeBtnText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  backHomeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backHomeBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    color: 'rgba(247, 243, 238, 0.5)',
  },
});
