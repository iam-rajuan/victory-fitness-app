import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { fetchHomepageQuote } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';

// Curated pool of version release quotes.
// Guarantees each app release version has an inspiring, deterministic quote
// that remains static throughout usage and updates ONLY when a new app version is released.
const VERSION_RELEASE_QUOTES: Array<{ text: string; author: string }> = [
  { text: 'Every rep is a vote for the person you are becoming.', author: 'Victory Fitness' },
  { text: 'Consistency is what transforms average into excellence.', author: 'Victory Fitness' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Victory Fitness' },
  { text: 'Your only limit is the one you build in your mind.', author: 'Victory Fitness' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Victory Fitness' },
  { text: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Victory Fitness' },
  { text: 'Success starts with self-discipline and daily dedication.', author: 'Victory Fitness' },
];

export function getVersionDeterministicQuote(version: string) {
  let hash = 0;
  for (let i = 0; i < version.length; i++) {
    hash = (hash << 5) - hash + version.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VERSION_RELEASE_QUOTES.length;
  return VERSION_RELEASE_QUOTES[index];
}

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
const QUOTE_CACHE_KEY = `@victory_quote_version_${APP_VERSION}`;

export default function GreetingCard() {
  const defaultVersionQuote = getVersionDeterministicQuote(APP_VERSION);
  const [quote, setQuote] = useState<{ text: string; author: string }>(defaultVersionQuote);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;

    const loadVersionQuote = async () => {
      try {
        // 1. Instant render from local cache if available
        const cached = await AsyncStorage.getItem(QUOTE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.text && isMounted) {
            setQuote(parsed);
          }
        }

        // 2. Fetch current live quote selected by admin from backend
        const remoteQuote = await fetchHomepageQuote(APP_VERSION);
        if (isMounted && remoteQuote?.text && remoteQuote.author) {
          const quoteObj = { text: remoteQuote.text, author: remoteQuote.author };
          setQuote(quoteObj);
          await AsyncStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(quoteObj));
          return;
        }

        // 3. Fallback to the release-deterministic quote if offline or unseeded
        if (isMounted) {
          await AsyncStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(defaultVersionQuote));
        }
      } catch {
        // Maintain deterministic version quote
      }
    };

    void loadVersionQuote();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.quoteSection}>
      <View style={styles.quoteHeader}>
        <Text style={styles.quoteTitle}>{t('DAILY INSPIRATION')}</Text>
        <Text style={styles.quoteIcon}>“</Text>
      </View>
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          {t(quote.text)}
        </Text>
        <Text style={styles.quoteAuthor}>— {t(quote.author)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quoteSection: {
    backgroundColor: Colors.navy,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quoteTitle: {
    fontSize: 10,
    color: Colors.gold,
    letterSpacing: 1.5,
    fontFamily: Fonts.heading,
  },
  quoteIcon: {
    fontSize: 36,
    color: 'rgba(201, 148, 58, 0.22)',
    fontFamily: Fonts.heading,
    height: 30,
    lineHeight: 36,
  },
  quoteBox: {
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 16,
    color: Colors.ivory,
    lineHeight: 23,
    fontFamily: Fonts.display,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: Colors.copper,
    textAlign: 'right',
    fontFamily: Fonts.bodyMedium,
    fontStyle: 'italic',
  },
});
