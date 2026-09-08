import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { apiRequest, fetchCurrentUser, getAuthUser, streamCoachVictorMessage } from '../../lib/api';
import { formatAppError } from '../../lib/error';
import { goBackOrReplace } from '../../lib/navigation';
import { fetchCoachVictorHistoryData } from '../../lib/screenData';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';

interface Message {
  id: string;
  text: string;
  sender: 'coach' | 'user';
  status?: 'sent' | 'typing';
}

type ChatHistoryItem = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

function buildInitialCoachMessage(name?: string | null): Message[] {
  const trimmed = (name || '').trim();
  const firstName = trimmed ? trimmed.split(/\s+/)[0] : '';
  const displayName = firstName && firstName.toLowerCase() !== 'admin' ? firstName : 'there';
  return [
    {
      id: 'initial-coach-greeting',
      text: `Hi ${displayName}! I'm Coach Victor. How can I help you with your fitness journey today?`,
      sender: 'coach',
    },
  ];
}


const MessageBubble = memo(function MessageBubble({ item }: { item: Message }) {
  const isCoach = item.sender === 'coach';
  if (item.status === 'typing') {
    return (
      <View style={[styles.messageContainer, styles.coachContainer]}>
        <View style={[styles.bubble, styles.coachBubble, styles.typingBubble]}>
          <TypingDots />
        </View>
      </View>
    );
  }

  const coachContent = useMemo(() => {
    if (!isCoach) {
      return null;
    }

    return renderCoachMessage(item.text);
  }, [isCoach, item.text]);

  return (
    <View
      style={[
        styles.messageContainer,
        isCoach ? styles.coachContainer : styles.userContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isCoach ? styles.coachBubble : styles.userBubble,
        ]}
      >
        {isCoach ? coachContent : (
          <Text style={[styles.messageText, styles.userText]}>{item.text}</Text>
        )}
      </View>
    </View>
  );
});

const TypingDots = memo(function TypingDots() {
  const pulseA = useRef(new Animated.Value(0.35)).current;
  const pulseB = useRef(new Animated.Value(0.35)).current;
  const pulseC = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const createPulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.35,
            duration: 280,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );

    const animations = [
      createPulse(pulseA, 0),
      createPulse(pulseB, 120),
      createPulse(pulseC, 240),
    ];

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [pulseA, pulseB, pulseC]);

  return (
    <View style={styles.typingDotsRow}>
      {[pulseA, pulseB, pulseC].map((value, index) => (
        <Animated.View
          key={`typing-dot-${index}`}
          style={[
            styles.typingDot,
            {
              opacity: value,
              transform: [
                {
                  scale: value.interpolate({
                    inputRange: [0.35, 1],
                    outputRange: [0.88, 1.08],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
});

export default function ChatScreen() {
  const checkingAccess = useModuleAccessGuard('/chat');
  const router = useRouter();
  const params = useLocalSearchParams<{ initialPrompt?: string }>();
  const [messages, setMessages] = useState<Message[]>(() => buildInitialCoachMessage());
  const [inputText, setInputText] = useState(typeof params.initialPrompt === 'string' ? params.initialPrompt : '');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (params.initialPrompt && typeof params.initialPrompt === 'string') {
      setInputText(params.initialPrompt);
    }
  }, [params.initialPrompt]);

  useEffect(() => {
    let cancelled = false;

    const loadHistoryAndUser = async () => {
      setLoadingHistory(true);
      try {
        let currentUserName = '';
        try {
          const cachedUser = await getAuthUser();
          if (cachedUser?.name) {
            currentUserName = cachedUser.name;
          } else {
            const freshUser = await fetchCurrentUser();
            if (freshUser?.name) {
              currentUserName = freshUser.name;
            }
          }
        } catch {
          // ignore user resolution error
        }

        const fallbackMessages = buildInitialCoachMessage(currentUserName);

        const response = await fetchCoachVictorHistoryData() as { messages: ChatHistoryItem[] };
        if (cancelled) {
          return;
        }

        const mapped: Message[] = response.messages.map((item) => ({
          id: item.id,
          text: item.content,
          sender: item.role === 'assistant' ? 'coach' : 'user',
        }));

        setMessages(mapped.length > 0 ? mapped : fallbackMessages);
      } catch (error) {
        if (!cancelled) {
          setMessages(buildInitialCoachMessage());
          setErrorDialog(formatAppError(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    };

    void loadHistoryAndUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const isSubmittingRef = useRef(false);

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 300);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
    };
    const coachMsgId = `${Date.now()}-coach`;
    const coachPlaceholder: Message = {
      id: coachMsgId,
      text: '',
      sender: 'coach',
      status: 'typing',
    };
    setMessages([...messages, userMessage, coachPlaceholder]);
    setInputText('');
    setSending(true);

    let accumulatedText = '';
    try {
      await streamCoachVictorMessage(
        trimmed,
        (token) => {
          accumulatedText += token;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === coachMsgId
                ? { ...msg, text: accumulatedText, status: undefined }
                : msg
            )
          );
        },
        (finalReply) => {
          const finalText = finalReply || accumulatedText;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === coachMsgId
                ? { ...msg, text: finalText, status: undefined }
                : msg
            )
          );
          setSending(false);
        },
        (error) => {
          setErrorDialog(formatAppError(error, 'Coach Victor is unavailable right now. Please try again in a moment.'));
          setMessages((current) => current.filter((msg) => msg.id !== coachMsgId));
          setSending(false);
        }
      );
    } catch (error) {
      setErrorDialog(formatAppError(error, 'Coach Victor is unavailable right now. Please try again in a moment.'));
      setMessages((current) => current.filter((msg) => msg.id !== coachMsgId));
      setSending(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 40);

    return () => clearTimeout(timer);
  }, [messages, sending]);

  const conversationMessages = useMemo(
    () => messages,
    [messages],
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => <MessageBubble item={item} />,
    []
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  if (checkingAccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.historyLoading}>
          <ActivityIndicator color={Colors.accentBlue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title ?? 'Error'}
        message={errorDialog?.message ?? ''}
        onClose={() => setErrorDialog(null)}
      />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrReplace(router, '/profile/support')} style={styles.headerIcon}>
          <Ionicons name="add" size={24} color="#fff" style={{ transform: [{ rotate: '45deg' }] }} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatarInner}>
                <Ionicons name="add" size={16} color="#fff" />
              </View>
            </View>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>COACH VICTOR</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>ONLINE & READY</Text>
            </View>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={listRef}
          data={conversationMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
        />
        {loadingHistory && (
          <View style={styles.historyLoading}>
            <ActivityIndicator color={Colors.accentBlue} />
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View
            style={[styles.inputWrapper, sending && styles.inputWrapperDisabled]}
          >
            <TextInput
              style={styles.input}
              placeholder={sending ? 'Coach Victor is thinking...' : 'Ask me anything...'}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={inputText}
              onChangeText={(value) => {
                if (sending) {
                  return;
                }
                setInputText(value);
              }}
              multiline
              returnKeyType="send"
              enablesReturnKeyAutomatically
              blurOnSubmit={false}
              submitBehavior="submit"
              onSubmitEditing={() => {
                void sendMessage();
              }}
              onKeyPress={(e: any) => {
                if (e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
                  e.preventDefault?.();
                  void sendMessage();
                }
              }}
              {...(Platform.OS === 'web'
                ? {
                    enterKeyHint: 'send' as any,
                  }
                : {})}
              editable={!sending}
            />
            <TouchableOpacity
              onPress={sendMessage}
              {...(Platform.OS === 'web'
                ? {
                    onMouseDown: (e: any) => {
                      e.preventDefault?.();
                    },
                  }
                : {})}
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
              disabled={sending || !inputText.trim()}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-forward" size={20} color={sending || !inputText.trim() ? Colors.textMuted : Colors.obsidian} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function renderCoachMessage(text: string) {
  const lines = text.split(/\r?\n/);

  return (
    <View>
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <View key={index} style={styles.markdownGap} />;
        }

        if (trimmed === '---') {
          return <View key={index} style={styles.markdownDivider} />;
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          const level = heading[1].length;
          return (
            <Text
              key={index}
              style={[
                styles.markdownHeading,
                level === 1 && styles.markdownHeadingOne,
                level === 2 && styles.markdownHeadingTwo,
              ]}
            >
              {renderInlineMarkdown(heading[2], `heading-${index}`)}
            </Text>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
          return (
            <View key={index} style={styles.markdownListRow}>
              <Text style={styles.markdownListMarker}>•</Text>
              <Text style={styles.markdownText}>{renderInlineMarkdown(bullet[1], `bullet-${index}`)}</Text>
            </View>
          );
        }

        const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numbered) {
          return (
            <View key={index} style={styles.markdownListRow}>
              <Text style={styles.markdownNumberMarker}>{numbered[1]}.</Text>
              <Text style={styles.markdownText}>{renderInlineMarkdown(numbered[2], `number-${index}`)}</Text>
            </View>
          );
        }

        return (
          <Text key={index} style={styles.markdownText}>
            {renderInlineMarkdown(trimmed, `text-${index}`)}
          </Text>
        );
      })}
    </View>
  );
}

function renderInlineMarkdown(text: string, keyPrefix: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*)/g);

  return tokens.map((token, idx) => {
    const boldMatch = token.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <Text key={`${keyPrefix}-bold-${idx}`} style={styles.markdownBold}>
          {boldMatch[1]}
        </Text>
      );
    }
    return <React.Fragment key={`${keyPrefix}-txt-${idx}`}>{token}</React.Fragment>;
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatarOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.obsidian,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.victoryGreen,
    marginRight: 5,
  },
  statusText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  coachContainer: {
    alignSelf: 'flex-start',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  bubble: {
    padding: 14,
    borderRadius: 16,
  },
  coachBubble: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.gold,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.body,
  },
  coachText: {
    color: Colors.text,
  },
  userText: {
    color: Colors.obsidian,
  },
  markdownText: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.body,
    marginBottom: 8,
  },
  markdownBold: {
    color: Colors.text,
    fontFamily: Fonts.bodyBold,
  },
  markdownHeading: {
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.heading,
    marginTop: 8,
    marginBottom: 8,
  },
  markdownHeadingOne: {
    fontSize: 18,
    lineHeight: 24,
    marginTop: 0,
    fontFamily: Fonts.display,
  },
  markdownHeadingTwo: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: Fonts.heading,
  },
  markdownListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  markdownListMarker: {
    color: Colors.gold,
    fontSize: 15,
    lineHeight: 22,
    width: 18,
    fontFamily: Fonts.heading,
  },
  markdownNumberMarker: {
    color: Colors.gold,
    fontSize: 15,
    lineHeight: 22,
    minWidth: 26,
    fontFamily: Fonts.heading,
  },
  markdownGap: {
    height: 6,
  },
  markdownDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  typingBubble: {
    minWidth: 74,
    paddingVertical: 16,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  inputBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.obsidian,
  },
  historyLoading: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inputWrapperDisabled: {
    opacity: 0.72,
    pointerEvents: 'none',
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    fontFamily: Fonts.body,
    outlineStyle: 'none' as any,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(201, 148, 58, 0.2)',
  },
});
