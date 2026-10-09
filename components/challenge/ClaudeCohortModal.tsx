import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { apiRequest } from '../../lib/api';

interface CohortMessage {
  id: string;
  n: string; // name
  i: string; // initials
  profileImage?: string;
  t: string; // time
  m: string; // message
  isMe?: boolean;
}

interface ClaudeCohortModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: () => void;
  challengeId?: string;
  challengeTitle?: string;
  challengeDays?: number;
}

type ChallengeChatMessage = {
  id: string;
  author_name: string;
  author_role: string;
  author_profile_image?: string;
  content: string;
  created_at: string;
  can_edit?: boolean;
  is_deleted?: boolean;
};

type ChallengeChatThread = {
  title?: string;
  duration_days?: number;
  participant_count?: number;
  messages?: ChallengeChatMessage[];
};

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeCohortModal({
  visible,
  onClose,
  onInvite,
  challengeId,
  challengeTitle = 'Challenge',
  challengeDays,
}: ClaudeCohortModalProps) {
  const [messages, setMessages] = useState<CohortMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [thread, setThread] = useState<ChallengeChatThread | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const title = thread?.title || challengeTitle;
  const days = Math.max(1, Number(thread?.duration_days || challengeDays || 1));
  const participantCount = Math.max(0, Number(thread?.participant_count || 0));
  const headerSub = `${participantCount} ${participantCount === 1 ? 'person' : 'people'} · ${days} ${days === 1 ? 'day' : 'days'}`;

  const loadThread = useCallback(async () => {
    if (!challengeId) {
      setMessages([]);
      setThread(null);
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiRequest<ChallengeChatThread>(`/challenges/${encodeURIComponent(challengeId)}/chat`, {
        skipResponseCache: true,
      });
      setThread(response);
      setMessages((response.messages || []).filter((message) => !message.is_deleted).map(mapChatMessage));
    } finally {
      setIsLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    if (visible) {
      void loadThread();
    } else {
      setInputText('');
    }
  }, [loadThread, visible]);

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || isSending) return;
    setIsSending(true);
    try {
      if (challengeId) {
        const created = await apiRequest<ChallengeChatMessage>(
          `/challenges/${encodeURIComponent(challengeId)}/chat/messages`,
          {
            method: 'POST',
            body: { content },
          }
        );
        setMessages((prev) => [...prev, mapChatMessage(created)]);
      } else {
        setMessages((prev) => [...prev, buildLocalMessage(content)]);
      }
      setInputText('');
    } finally {
      setIsSending(false);
    }
  }, [challengeId, isSending]);

  const handleSend = () => {
    void sendMessage(inputText);
  };

  const handleQuickSend = (text: string) => {
    void sendMessage(text);
  };

  const emptyText = useMemo(() => {
    if (isLoading) return 'Loading cohort lobby...';
    return 'No messages yet. Start the lobby.';
  }, [isLoading]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar matching lines 1682-1689 */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>{`${title} · lobby`}</Text>
            <Text style={styles.headerSub}>{headerSub}</Text>
          </View>
          <TouchableOpacity onPress={onInvite} activeOpacity={0.7}>
            <Text style={styles.inviteLink}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Message Stream matching lines 1691-1704 */}
        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={GOLD} />
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : messages.map((m) => {
            if (m.isMe) {
              return (
                <View key={m.id} style={styles.myBubbleWrap}>
                  <View style={styles.myBubble}>
                    <Text style={styles.myBubbleText}>{m.m}</Text>
                  </View>
                </View>
              );
            }
            return (
              <View key={m.id} style={styles.otherMessageRow}>
                {m.profileImage ? (
                  <Image source={{ uri: m.profileImage }} style={styles.avatarCircle} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{m.i}</Text>
                  </View>
                )}
                <View style={styles.otherBubbleWrap}>
                  <View style={styles.otherMetaRow}>
                    <Text style={styles.otherName}>{m.n}</Text>
                    <Text style={styles.otherTime}>{m.t}</Text>
                  </View>
                  <View style={styles.otherBubble}>
                    <Text style={styles.otherBubbleText}>{m.m}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Composer and Quick Pills matching lines 1707-1714 */}
        <View style={styles.footerWrap}>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={styles.pill}
              activeOpacity={0.8}
              onPress={() => handleQuickSend('Done for today ✓')}
            >
              <Text style={styles.pillText}>Done for today ✓</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pill}
              activeOpacity={0.8}
              onPress={() => handleQuickSend('Struggling today, but pushing through')}
            >
              <Text style={styles.pillText}>Struggling today</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.composerBox}>
            <TextInput
              style={styles.composerInput}
              placeholder="Message the cohort…"
              placeholderTextColor="rgba(247,243,238,0.45)"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
            />
            {inputText.trim().length > 0 && (
              <TouchableOpacity style={[styles.sendBtn, isSending && styles.sendBtnDisabled]} activeOpacity={0.8} onPress={handleSend}>
                <Text style={styles.sendBtnText}>{isSending ? '...' : 'Send'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.lobbyFootnote}>
            The lobby exists for the length of the challenge and then archives itself. Victor drops in on all of them.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || '').slice(0, 2).toUpperCase();
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function mapChatMessage(message: ChallengeChatMessage): CohortMessage {
  const authorName = String(message.author_name || '').trim();
  return {
    id: String(message.id || `cm-${Date.now()}`),
    n: message.can_edit ? 'You' : authorName,
    i: getInitials(authorName),
    profileImage: message.can_edit ? '' : String(message.author_profile_image || '').trim(),
    t: formatMessageTime(String(message.created_at || '')),
    m: String(message.content || '').trim(),
    isMe: Boolean(message.can_edit),
  };
}

function buildLocalMessage(content: string): CohortMessage {
  return {
    id: `cm-${Date.now()}`,
    n: 'You',
    i: '',
    t: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    m: content,
    isMe: true,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingTop: Platform.OS === 'web' ? 24 : 54,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.12)',
  },
  backBtn: {
    paddingRight: 4,
  },
  backArrow: {
    fontFamily: DMSANS,
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  headerSub: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  inviteLink: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
    color: GOLD,
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 14,
  },
  emptyState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: INTER,
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.48)',
  },
  otherMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  otherBubbleWrap: {
    flex: 1,
    minWidth: 0,
  },
  otherMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  otherName: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
    color: IVORY,
  },
  otherTime: {
    fontFamily: MONO,
    fontSize: 11,
    color: 'rgba(247, 243, 238, 0.4)',
  },
  otherBubble: {
    backgroundColor: NAVY,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  otherBubbleText: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.85)',
  },
  myBubbleWrap: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },
  myBubble: {
    backgroundColor: GOLD,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  myBubbleText: {
    fontFamily: DMSANS,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    color: '#0D0D0D',
  },
  footerWrap: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 24 : 36,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  pillText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '500',
    color: IVORY,
  },
  composerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(247, 243, 238, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  composerInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14,
    color: IVORY,
    height: 44,
  },
  sendBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sendBtnDisabled: {
    opacity: 0.65,
  },
  sendBtnText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  lobbyFootnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.4)',
    marginTop: 12,
  },
});
