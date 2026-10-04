import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { goBackOrReplace } from '../../lib/navigation';
import { useAsyncScreenData } from '../../hooks/useAsyncScreenData';
import { fetchTermsConditions, TERMS_CONDITIONS_CACHE_KEY } from '../../lib/screenData';
import { useLanguage } from '../../lib/i18n';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS_BOLD = Platform.select({ web: "'DM Sans', sans-serif", default: 'DMSans-Bold' });
const DMSANS_SEMI = Platform.select({ web: "'DM Sans', sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

type PolicySection = {
  heading: string;
  body: string[];
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function normalizePolicySections(text: string): PolicySection[] {
  const cleaned = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^last updated\s*:/i.test(line));

  const sections: PolicySection[] = [];
  let current: PolicySection | null = null;

  cleaned.forEach((line) => {
    const isNumberedHeading = /^\d+\.\s+/.test(line);
    const isPlainHeading = !isNumberedHeading && line.length < 80 && !/[.!?]$/.test(line);

    if (isNumberedHeading || (!current && isPlainHeading)) {
      current = { heading: line, body: [] };
      sections.push(current);
      return;
    }

    if (!current) {
      current = { heading: '', body: [] };
      sections.push(current);
    }
    current.body.push(line);
  });

  return sections.filter((section) => section.heading || section.body.length);
}

export default function TermsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { data: terms, loading } = useAsyncScreenData({
    initialData: null as Awaited<ReturnType<typeof fetchTermsConditions>> | null,
    cacheKey: TERMS_CONDITIONS_CACHE_KEY,
    load: fetchTermsConditions,
  });

  const sections = useMemo(() => normalizePolicySections(terms?.plain_text || ''), [terms?.plain_text]);
  const publishedLabel = formatDate(terms?.published_at || terms?.updated_at);
  const effectiveLabel = formatDate(terms?.effective_at);
  const versionLabel = terms?.version || 'v1';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBackOrReplace(router, '/profile')}
          style={styles.backButton}
          hitSlop={12}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={24} color={IVORY} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{t('LEGAL')}</Text>
          <Text style={styles.headerTitle}>{t('Terms & Conditions')}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={GOLD} size="large" />
            <Text style={styles.loadingText}>{t('Loading terms & conditions...')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroBlock}>
              <Text style={styles.updatedText}>
                {publishedLabel ? `${t('Last updated')}: ${publishedLabel}` : t('Latest terms & conditions')}
              </Text>
              <Text style={styles.pageTitle}>{terms?.title || t('Terms & Conditions')}</Text>
              <Text style={styles.summaryText}>
                {t('The rules, guidelines, and agreements governing your membership and use of Victory Fitness.')}
              </Text>

              <View style={styles.metaGrid}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaLabel}>{t('VERSION')}</Text>
                  <Text style={styles.metaValue}>{versionLabel}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaLabel}>{t('EFFECTIVE')}</Text>
                  <Text style={styles.metaValue}>{effectiveLabel || publishedLabel || t('Now')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.documentCard}>
              {sections.length ? (
                sections.map((section, index) => (
                  <View key={`${index}-${section.heading || 'body'}`} style={styles.sectionBlock}>
                    {section.heading ? (
                      <Text style={styles.sectionHeading}>{section.heading}</Text>
                    ) : null}
                    {section.body.map((line, lineIndex) => (
                      <Text
                        key={`${index}-${lineIndex}`}
                        style={line.startsWith('- ') ? styles.bulletText : styles.bodyText}
                      >
                        {line.startsWith('- ') ? `• ${line.slice(2)}` : line}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.bodyText}>{t('The current terms & conditions are not available right now.')}</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(247,243,238,0.10)',
    backgroundColor: OBSIDIAN,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: GOLD,
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 3,
  },
  headerTitle: {
    color: IVORY,
    fontFamily: DMSANS_BOLD,
    fontSize: 17,
    letterSpacing: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 54,
  },
  loadingBlock: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: 'rgba(247,243,238,0.62)',
    fontSize: 14,
    fontFamily: INTER,
  },
  heroBlock: {
    marginBottom: 20,
  },
  updatedText: {
    color: GOLD,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: MONO,
    marginBottom: 18,
    letterSpacing: 0.4,
  },
  pageTitle: {
    color: IVORY,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: CLASH,
    letterSpacing: 0,
    marginBottom: 10,
  },
  summaryText: {
    color: 'rgba(247,243,238,0.64)',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: INTER,
    maxWidth: 420,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  metaPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.10)',
    backgroundColor: NAVY,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metaLabel: {
    color: 'rgba(247,243,238,0.44)',
    fontSize: 9,
    fontFamily: MONO,
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  metaValue: {
    color: IVORY,
    fontSize: 13,
    fontFamily: DMSANS_SEMI,
  },
  documentCard: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(247,243,238,0.10)',
    paddingTop: 6,
  },
  sectionBlock: {
    paddingTop: 26,
    paddingBottom: 2,
  },
  sectionHeading: {
    color: IVORY,
    fontSize: 16,
    lineHeight: 23,
    fontFamily: DMSANS_BOLD,
    letterSpacing: 0.2,
    marginBottom: 13,
  },
  bodyText: {
    color: 'rgba(247,243,238,0.62)',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: INTER,
    marginBottom: 12,
  },
  bulletText: {
    color: 'rgba(247,243,238,0.66)',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: INTER,
    marginBottom: 10,
    paddingLeft: 4,
  },
});
