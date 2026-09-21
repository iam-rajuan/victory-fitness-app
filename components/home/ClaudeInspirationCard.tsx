import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeInspirationCardProps {
  tier: 'SILVER' | 'GOLD' | 'GOLD_BETA' | 'PLATINUM' | 'INNER_CIRCLE' | 'NONE';
  identityStatement?: string | null;
  userName?: string;
}

const COPPER = '#B5651D';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });

export default function ClaudeInspirationCard({
  tier,
  identityStatement,
  userName = '',
}: ClaudeInspirationCardProps) {
  const { colors } = useTheme();
  const isSilverOrNone = tier === 'SILVER' || tier === 'NONE';

  const kicker = isSilverOrNone ? 'DAILY INSPIRATION' : 'WHO YOU ARE BECOMING';
  const quote = isSilverOrNone || !identityStatement?.trim()
    ? '“Every rep is a reminder that growth takes patience.”'
    : `“${identityStatement.trim()}”`;
  const author = isSilverOrNone || !identityStatement?.trim()
    ? 'VICTOR AKKO'
    : userName ? `${userName.toUpperCase()} · IN YOUR OWN WORDS` : 'IN YOUR OWN WORDS';

  return (
    <View style={styles.container}>
      <Text style={[styles.kicker, { color: colors.textMuted }]}>{kicker}</Text>
      <View style={styles.quoteBox}>
        <Text style={[styles.quoteText, { color: colors.text }]}>{quote}</Text>
        <Text style={styles.authorText}>{author}</Text>
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

