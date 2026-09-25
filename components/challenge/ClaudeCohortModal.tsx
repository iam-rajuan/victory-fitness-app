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
} from 'react-native';

interface CohortMessage {
  id: string;
  n: string; // name
  i: string; // initials
  t: string; // time
  m: string; // message
  isMe?: boolean;
}

interface ClaudeCohortModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite: () => void;
  challengeTitle?: string;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

const INITIAL_MESSAGES: CohortMessage[] = [
  {
    id: 'cm-1',
    n: 'Anna R.',
    i: 'AR',
    t: '09:12',
    m: 'Day 18 done. Anyone else feel the shoulders today?',
  },
  {
    id: 'cm-2',
    n: 'Dominik S.',
    i: 'DS',
    t: '09:40',
    m: 'Both shoulders. Worth it.',
  },
  {
    id: 'cm-3',
    n: 'Victor Akko',
    i: 'VA',
    t: '10:05',
    m: 'Three days left. Do not let the last stretch be the one you skip.',
  },
  {
    id: 'cm-4',
    n: 'You',
    i: 'MK',
    t: '10:14',
    m: 'Day 18 done here too. Three to go.',
    isMe: true,
  },
];

export default function ClaudeCohortModal({
  visible,
  onClose,
  onInvite,
  challengeTitle = '21-Day Warrior',
}: ClaudeCohortModalProps) {
  const [messages, setMessages] = useState<CohortMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: CohortMessage = {
      id: `cm-${Date.now()}`,
      n: 'You',
      i: 'ME',
      t: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      m: inputText.trim(),
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleQuickSend = (text: string) => {
    const newMsg: CohortMessage = {
      id: `cm-${Date.now()}`,
      n: 'You',
      i: 'ME',
      t: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      m: text,
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar matching lines 1682-1689 */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>{`${challengeTitle} · lobby`}</Text>
            <Text style={styles.headerSub}>9 people · started 21 April · 3 days left</Text>
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
          {messages.map((m) => {
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
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{m.i}</Text>
                </View>
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
              <TouchableOpacity style={styles.sendBtn} activeOpacity={0.8} onPress={handleSend}>
                <Text style={styles.sendBtnText}>Send</Text>
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
