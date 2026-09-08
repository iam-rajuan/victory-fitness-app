import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';

const emojis = ['😡', '😟', '😐', '😊', '🤩'];

export default function MoodSection() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View style={styles.moodCard}>
      <Text style={styles.moodTitle}>{t('Your Mindful Moment')}</Text>
      <Text style={styles.moodSubtitle}>
        {t('What is one thing you will do for your well-being tomorrow?')}
      </Text>

      <TouchableOpacity
        style={styles.journalActionBtn}
        onPress={() => router.push('/journal')}
      >
        <Text style={styles.journalActionText}>{t('Write in Journal')}</Text>
      </TouchableOpacity>

      <View style={styles.moodDivider} />

      <Text style={styles.moodPromptText}>{t('How are you feeling right now?')}</Text>
      <View style={styles.moodEmojiRow}>
        {emojis.map((e, i) => (
          <TouchableOpacity key={i} style={styles.moodEmojiBtn}>
            <Text style={styles.moodEmojiText}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moodCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  moodTitle: {
    color: Colors.ivory,
    fontSize: 19,
    fontFamily: Fonts.display,
    marginBottom: 12,
  },
  moodSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.body,
    marginBottom: 24,
  },
  journalActionBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  journalActionText: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  moodDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  moodPromptText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Fonts.bodyMedium,
  },
  moodEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  moodEmojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmojiText: {
    fontSize: 28,
  },
});
