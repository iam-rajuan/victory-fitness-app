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
import { Colors } from '../../constants/Colors';
import {
  fetchCurrentUser,
  AuthUser,
  streamCoachVictorMessage,
  fetchCoachVictorHistory,
  clearCoachVictorHistory,
  applyCoachWorkoutPlanAction,
  CoachWorkoutPlanAction,
} from '../../lib/api';
import { savePlanBuiltData } from '../../lib/planStorage';
import { saveLatestStrengthWorkoutPlan } from '../../lib/workout-plans';
import { normalizeSubscriptionTier } from '../../lib/access';
import { pushRoute, goBackOrReplace } from '../../lib/navigation';

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
    sourcePrompt: string;
    scope?: string;
    targetDays?: string[];
    targetMinutes?: number | null;
    summary?: string;
    buttonLabel?: string;
    status?: 'ready' | 'saving' | 'saved';
  };
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationLanguage, setConversationLanguage] = useState<string | null>(null);
  const [insertingPlanMessageId, setInsertingPlanMessageId] = useState<string | null>(null);
  const autoPromptHandledRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Call live backend or smart fallback
    try {
      let assistantText = '';
      let planAction: CoachWorkoutPlanAction | null = null;
      await new Promise<void>(async (resolve) => {
        await streamCoachVictorMessage(
          backendMessage,
          (chunk) => {
            assistantText += chunk;
          },
          (fullReply, _threadId, action) => {
            assistantText = fullReply || assistantText;
            planAction = action || null;
            resolve();
          },
          (err) => {
            console.warn('Coach stream error:', err);
            resolve();
          }
          ,
          { languageOverride: nextLanguage }
        );
      });

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
              sourcePrompt: actionForReply.source_prompt,
              scope: actionForReply.scope,
              targetDays: actionForReply.target_days || [],
              targetMinutes: actionForReply.target_minutes ?? null,
              summary: actionForReply.summary,
              buttonLabel: actionForReply.button_label,
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
      setSending(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    const initialPrompt = typeof params.initialPrompt === 'string' ? params.initialPrompt.trim() : '';
    if (!hasCoach || !currentUser || !initialPrompt || autoPromptHandledRef.current) return;
    autoPromptHandledRef.current = true;
    if (params.autoSend === '1') {
      void handleSendText(initialPrompt, buildPrescriptionOptionsFromParams());
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

  const handleInsertHomePlan = async (messageId: string, action: NonNullable<ChatMessage['homePlanAction']>) => {
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

  // If Silver tier, show the locked paywall teaser per prototype
  if (!hasCoach) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.coachName}>Your coach</Text>
            <Text style={styles.coachStatusText}>AVAILABLE ON GOLD</Text>
          </View>
          <Pressable onPress={() => goBackOrReplace(router, '/(tabs)')} hitSlop={10}>
            <Text style={styles.closeBtn}>×</Text>
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
      <View style={styles.topBar}>
        <View>
          <Text style={styles.coachName}>Your coach</Text>
          <Text style={[styles.coachStatusText, isPriority && styles.statusPriority]}>
            {coachStatus}
          </Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            style={styles.newChatButton}
            onPress={handleClearConversation}
            disabled={sending || historyLoading}
            hitSlop={8}
          >
            <Text style={styles.newChatText}>New</Text>
          </Pressable>
          <Pressable onPress={() => goBackOrReplace(router, '/(tabs)')} hitSlop={10}>
            <Text style={styles.closeBtn}>×</Text>
          </Pressable>
        </View>
      </View>

      {/* Messages Thread */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.threadScroll}
        showsVerticalScrollIndicator={false}
      >
        {historyLoading && !messages.length ? (
          <View style={styles.typingIndicator}>
            <ActivityIndicator color={GOLD} size="small" />
            <Text style={styles.typingText}>Loading your last coach chat...</Text>
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
                  <View style={styles.homePlanActionCard}>
                    <Text style={styles.homePlanActionTitle}>
                      {m.homePlanAction.status === 'saved'
                        ? 'Home workout plan updated'
                        : m.homePlanAction.summary || 'Ready to update your Home workout plan'}
                    </Text>
                    <Text style={styles.homePlanActionText}>
                      {m.homePlanAction.scope === 'day'
                        ? 'This will update the selected day in your active Home workout plan.'
                        : 'This will replace your current Home workout plan with the plan from this chat.'}
                    </Text>
                    <Pressable
                      style={[
                        styles.homePlanActionButton,
                        m.homePlanAction.status === 'saved' && styles.homePlanActionButtonSaved,
                        m.homePlanAction.status === 'saving' && styles.homePlanActionButtonDisabled,
                      ]}
                      disabled={m.homePlanAction.status === 'saving' || m.homePlanAction.status === 'saved'}
                      onPress={() => void handleInsertHomePlan(m.id, m.homePlanAction!)}
                    >
                      {m.homePlanAction.status === 'saving' ? (
                        <ActivityIndicator color={OBSIDIAN} size="small" />
                      ) : (
                        <Text style={styles.homePlanActionButtonText}>
                          {m.homePlanAction.status === 'saved'
                            ? 'Inserted'
                            : m.homePlanAction.buttonLabel || insertButtonLabel(conversationLanguage || currentUser?.preferred_language)}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {/* Context Footnote */}
              {m.contextNote ? (
                <Text style={styles.contextFootnote}>{m.contextNote}</Text>
              ) : null}
            </View>
          );
        })}

        {sending ? (
          <View style={styles.typingIndicator}>
            <ActivityIndicator color={GOLD} size="small" />
            <Text style={styles.typingText}>Victor is thinking…</Text>
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
      <View style={styles.inputContainer}>
        <View style={styles.inputBox}>
          <TextInput
            style={[
              styles.textInput,
              Platform.select({
                web: {
                  outlineStyle: 'none',
                  outlineWidth: 0,
                  outlineColor: 'transparent',
                  borderWidth: 0,
                  borderColor: 'transparent',
                  boxShadow: 'none',
                } as any,
              }),
            ]}
            placeholder="Ask anything…"
            placeholderTextColor="rgba(247, 243, 238, 0.45)"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSubmitInput}
            returnKeyType="send"
          />
          <Pressable
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            disabled={!inputText.trim() || sending}
            onPress={handleSubmitInput}
          >
            <View style={styles.sendArrow} />
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Your coach never diagnoses, treats, or prescribes. For pain or medical questions it will tell you to see a doctor.
        </Text>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.12)',
  },
  coachName: {
    fontFamily: CLASH,
    fontSize: 20,
    fontWeight: '600',
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
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.45)',
    paddingHorizontal: 11,
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
  },
  newChatText: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '800',
    color: GOLD,
    textTransform: 'uppercase',
  },
  closeBtn: {
    fontFamily: DMSANS,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
    paddingHorizontal: 6,
  },
  threadScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 14,
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
  contextFootnote: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.4)',
    marginTop: 5,
    paddingLeft: 4,
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
    fontFamily: CLASH,
    fontSize: 16,
    fontWeight: '700',
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
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.08)',
  },
  inputBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(247, 243, 238, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 243, 238, 0.02)',
  },
  textInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14,
    color: IVORY,
    paddingVertical: 6,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
    outlineWidth: 0 as any,
    outlineColor: 'transparent' as any,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
  disclaimer: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 16,
    color: 'rgba(247, 243, 238, 0.38)',
    marginTop: 10,
    textAlign: 'center',
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
    fontFamily: CLASH,
    fontSize: 22,
    fontWeight: '600',
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
