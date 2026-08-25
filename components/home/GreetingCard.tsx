import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { fetchHomepageQuote } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';

export default function GreetingCard() {
  const [remoteQuote, setRemoteQuote] = useState<{ text: string; author: string } | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    void fetchHomepageQuote().then((quote) => {
      if (isMounted && quote?.text && quote.author) {
        setRemoteQuote({ text: quote.text, author: quote.author });
      }
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={styles.quoteSection}>
      <View style={styles.quoteHeader}>
        <Text style={styles.quoteTitle}>{t('DAILY INSPIRATION')}</Text>
        <Text style={styles.quoteIcon}>“</Text>
      </View>
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          {remoteQuote?.text || t('STAY FOCUS AND KEEP PUSHING YOUR LIMITS TO UNLEASH YOUR TRUE POTENTIAL.')}
        </Text>
        {remoteQuote?.author ? (
          <Text style={styles.quoteAuthor}>— {remoteQuote.author}</Text>
        ) : (
          <Text style={styles.quoteAuthor}>— Victory Team</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quoteSection: {
    backgroundColor: '#111122',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
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
    fontWeight: '700',
    color: '#00F0D0',
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
  },
  quoteIcon: {
    fontSize: 36,
    color: 'rgba(0, 240, 208, 0.15)',
    fontFamily: 'Inter_700Bold',
    height: 30,
    lineHeight: 36,
  },
  quoteBox: {
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
    lineHeight: 22,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
});
