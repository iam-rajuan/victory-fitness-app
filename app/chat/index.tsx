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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import {
  fetchCurrentUser,
  AuthUser,
  streamCoachVictorMessage,
} from '../../lib/api';
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
  'I only have 25 minutes tonight and no equipment.',
  'My lower back is tight today.',
  'What should I eat before training?',
  'Swap dinner from my week plan.',
];

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
  const autoPromptHandledRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

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
      await new Promise<void>(async (resolve) => {
        await streamCoachVictorMessage(
          text,
          (chunk) => {
            assistantText += chunk;
          },
          (fullReply) => {
            assistantText = fullReply || assistantText;
            resolve();
          },
          (err) => {
            console.warn('Coach stream error:', err);
            resolve();
          }
        );
      });

      if (!assistantText) {
        assistantText = `I hear you, ${currentUser?.name ? currentUser.name.split(' ')[0] : 'friend'}. Based on your target of ${currentUser?.daily_protein_target || 112} g protein and your training consistency, let's keep showing up. How does that sound?`;
      }

      const coachReply: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: assistantText,
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
    setInputText(initialPrompt);
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
        <Pressable onPress={() => goBackOrReplace(router, '/(tabs)')} hitSlop={10}>
          <Text style={styles.closeBtn}>×</Text>
        </Pressable>
      </View>

      {/* Messages Thread */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.threadScroll}
        showsVerticalScrollIndicator={false}
      >
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
                <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.coachBubbleText]}>
                  {m.text}
                </Text>

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
          {QUICK_PROMPTS.map((p, idx) => (
            <Pressable
              key={idx}
              style={styles.promptPill}
              onPress={() => void handleSendText(p)}
            >
              <Text style={styles.promptPillText}>{p}</Text>
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
    paddingTop: 54,
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
  },
  promptsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  promptPill: {
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(247, 243, 238, 0.03)',
  },
  promptPillText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '500',
    color: IVORY,
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
