import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';

const SUGGESTION_CHIPS = [
  'How do I reach my daily protein goal?',
  'Form tips for squats & bench press',
  'Modify workout for knee or joint pain',
  'What should I eat before training?',
  'How to stay consistent on busy days',
];

interface CoachQuickPromptBarProps {
  canAccessCoachVictor?: boolean;
  onRestrictedPress?: (sectionName: string) => void;
}

export default function CoachQuickPromptBar({
  canAccessCoachVictor = true,
  onRestrictedPress,
}: CoachQuickPromptBarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('');
  const [rotatingIndex, setRotatingIndex] = useState(0);

  // Rotate through the 5 suggestion chips every 3.5s
  React.useEffect(() => {
    const timer = setInterval(() => {
      setRotatingIndex((prev) => (prev + 1) % SUGGESTION_CHIPS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleSend = (textToSend?: string) => {
    const queryText = (textToSend || prompt).trim();
    if (!queryText) return;

    if (!canAccessCoachVictor) {
      onRestrictedPress?.('Coach Victor');
      return;
    }

    setPrompt('');
    router.push({
      pathname: '/chat',
      params: { initialPrompt: queryText },
    } as any);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.coachAvatar}>
          <Ionicons name="sparkles" size={16} color={Colors.gold} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>{t('COACH VICTOR')}</Text>
          <Text style={styles.headerSub}>{t('Instant AI guidance tailored to your goals')}</Text>
        </View>
      </View>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={`${t('Ask your coach anything')} (e.g. "${t(SUGGESTION_CHIPS[rotatingIndex])}")...`}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          style={styles.input}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !prompt.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!prompt.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={18} color={prompt.trim() ? Colors.obsidian : 'rgba(255,255,255,0.4)'} />
        </TouchableOpacity>
      </View>

      {/* 5 Rotating Suggestion Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {SUGGESTION_CHIPS.map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.chip, idx === rotatingIndex && styles.chipActive]}
            activeOpacity={0.75}
            onPress={() => handleSend(chip)}
          >
            <Ionicons
              name={idx === rotatingIndex ? "sparkles" : "chatbubble-ellipses-outline"}
              size={13}
              color={idx === rotatingIndex ? Colors.obsidian : Colors.gold}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.chipText, idx === rotatingIndex && styles.chipTextActive]}>{t(chip)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.28)',
    marginBottom: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 148, 58, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.body,
    marginTop: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.30)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.body,
    paddingVertical: 10,
    outlineStyle: 'none' as any,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 43, 69, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: Colors.ivory,
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  chipActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
    transform: [{ scale: 1.02 }],
  },
  chipTextActive: {
    color: Colors.obsidian,
    fontFamily: Fonts.heading,
  },
});
