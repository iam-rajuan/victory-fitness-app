import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';
import { fetchHomepageQuote } from '../../lib/api';

interface ClaudeInspirationCardProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
  identityStatement?: string | null;
  userName?: string;
}

const COPPER = '#B5651D';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });

export default function ClaudeInspirationCard({
  tier: _tier,
  identityStatement: _identityStatement,
  userName: _userName = '',
}: ClaudeInspirationCardProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [quote, setQuote] = useState({
    text: 'Every rep is a reminder that growth takes patience.',
    author: 'Victor Akko',
  });

  useEffect(() => {
    let mounted = true;
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    void fetchHomepageQuote(appVersion)
      .then((remoteQuote) => {
        if (!mounted || !remoteQuote?.text) return;
        setQuote({
          text: remoteQuote.text,
          author: remoteQuote.author || 'Victor Akko',
        });
      })
      .catch(() => {
        // Keep the local Victor quote when offline.
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.kicker, { color: colors.textMuted }]}>{t('DAILY INSPIRATION')}</Text>
      <View style={styles.quoteBox}>
        <Text style={[styles.quoteText, { color: colors.text }]}>{`“${t(quote.text).replace(/^["“]|["”]$/g, '')}”`}</Text>
        <Text style={styles.authorText}>{quote.author.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  quoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: COPPER,
    paddingVertical: 2,
    paddingLeft: 15,
  },
  quoteText: {
    fontFamily: CLASH,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  authorText: {
    marginTop: 8,
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.0,
    color: COPPER,
  },
});
