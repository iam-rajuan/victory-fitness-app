import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest, fetchMyConsents, setMyConsent } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { JOURNAL_ENTRIES_CACHE_KEY, JournalEntry } from '../../lib/screenData';
import { hydrateCachedResource, primeCachedResource } from '../../lib/resourceCache';
import RequirementAuditBoundary from '../../components/audit/RequirementAuditBoundary';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

const PROMPTS = [
  'What went better than you expected?',
  'What did you avoid, and why?',
  'Who did you show up for today?',
  'Where did your discipline surprise you?',
  'What friction made training feel hard today?',
];

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getJournalEntryDayLabel(value?: string | null): string {
  const entryDate = value ? new Date(value) : null;
  if (!entryDate || Number.isNaN(entryDate.getTime())) {
    return 'Today';
  }

  const today = startOfLocalDay(new Date());
  const entryDay = startOfLocalDay(entryDate);
  const diffDays = Math.round((today.getTime() - entryDay.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return entryDate.toLocaleDateString(undefined, { weekday: 'long' });
  }

  return entryDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: entryDate.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

export default function JournalScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const consentLanguage = language === 'de' ? 'de' : 'en';
  const [consentGranted, setConsentGranted] = useState<boolean | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [saving, setSaving] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [pastEntries, setPastEntries] = useState<JournalEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Dynamic daily prompt
  const dayIndex = new Date().getDay();
  const currentPrompt = PROMPTS[dayIndex % PROMPTS.length];

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      setLoadingHistory(true);
      try {
        const consent = await fetchMyConsents();
        if (cancelled) return;
        const granted = Boolean(consent.consents.journal?.granted);
        setConsentGranted(granted);
        if (!granted) return;
        const cached = await hydrateCachedResource<{ entries: JournalEntry[] }>(JOURNAL_ENTRIES_CACHE_KEY);
        if (!cancelled && Array.isArray(cached?.entries)) {
          setPastEntries(cached.entries);
          setStreakDays(cached.entries.length);
        }
        const res = await apiRequest<{ entries: JournalEntry[] }>('/journal/entries');
        if (!cancelled && res?.entries) {
          setPastEntries(res.entries);
          setStreakDays(res.entries.length);
          await primeCachedResource(JOURNAL_ENTRIES_CACHE_KEY, { entries: res.entries }, true);
        }
      } catch {
        // Keep cached or current entries on refresh failure.
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateJournalConsent = async (granted: boolean) => {
    if (consentSaving) return;
    setConsentSaving(true);
    try {
      await setMyConsent({ consent_id: 'journal', granted, language: consentLanguage, source: 'journal_dialog' });
      setConsentGranted(granted);
      if (!granted) handleSkipToday();
    } catch {
      Alert.alert('Unable to save your choice', 'Please check your connection and try again.');
    } finally {
      setConsentSaving(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!entryText.trim()) {
      Alert.alert('Empty Entry', 'Please write a sentence or reflection before saving.');
      return;
    }

    setSaving(true);
    try {
      const savedEntry = await apiRequest<JournalEntry>('/journal/entries', {
        method: 'POST',
        body: {
          mood: 'VICTORIOUS',
          content: entryText.trim(),
          prompt: currentPrompt,
        },
      });
      const nextEntries = [savedEntry, ...pastEntries.filter((item) => item.id !== savedEntry.id)];
      setPastEntries(nextEntries);
      await primeCachedResource(JOURNAL_ENTRIES_CACHE_KEY, { entries: nextEntries }, true);
      setEntryText('');
      setStreakDays((prev) => prev + 1);
      Alert.alert('Saved', 'Your reflection is securely saved.');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      Alert.alert('Unable to save', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipToday = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (consentGranted === null) {
    return <View style={[styles.container, styles.consentLoading]}><ActivityIndicator size="large" color={GOLD} /></View>;
  }

  return (
    <RequirementAuditBoundary auditId="APP-EXTRA-011" status="extra" style={{ flex: 1 }}>
      <View style={styles.container}>
        <Modal visible={consentGranted === false} animationType="slide" presentationStyle="fullScreen">
          <ScrollView style={styles.consentScreen} contentContainerStyle={styles.consentContent}>
            <Text style={styles.consentTitle}>{consentLanguage === 'de' ? 'Dein Journal – nur für dich' : 'Your journal – just for you'}</Text>
            <Text style={styles.consentIntro}>{consentLanguage === 'de'
              ? 'Hier kannst du Gedanken, Stimmung, Schlaf, Gewicht oder körperliche Beschwerden festhalten. Solche Angaben können Gesundheitsdaten sein – deshalb fragen wir dich ausdrücklich.'
              : "Here you can record thoughts, mood, sleep, weight or physical complaints. This may be health data – that's why we ask you explicitly."}</Text>
            {(consentLanguage === 'de' ? [
              'Deine Einträge sieht nur du. Weder wir noch andere Mitglieder können sie lesen.',
              'Sie werden verschlüsselt auf Servern in der EU gespeichert.',
              'Du kannst einzelne Einträge oder das ganze Journal jederzeit löschen. Löschst du dein Konto, wird auch dein Journal gelöscht.',
            ] : [
              'Only you can see your entries. Neither we nor other members can read them.',
              'They are stored encrypted on servers in the EU.',
              'You can delete single entries or your whole journal at any time. If you delete your account, your journal is deleted too.',
            ]).map((point) => <Text key={point} style={styles.consentPoint}>• {point}</Text>)}
            <Text style={styles.consentAi}>{consentLanguage === 'de'
              ? 'Damit die App dir passende Impulse geben kann, wertet unser KI-System deine Einträge automatisch aus. Dafür können sie an OpenAI (USA) oder Anthropic (USA) übertragen werden und werden nicht zum Training von KI-Modellen genutzt.'
              : 'So the app can give you relevant prompts, our AI system analyses your entries automatically. For this they may be transferred to OpenAI (USA) or Anthropic (USA) and are not used to train AI models.'}</Text>
            <Text style={styles.consentLabel}>{consentLanguage === 'de'
              ? 'Ich willige ausdrücklich ein, dass Victory Fitness meine Journal-Einträge – auch Angaben zu meiner Gesundheit – für diesen Zweck speichert. Das ist freiwillig: Ohne Zustimmung kann ich die App weiter nutzen, nur das Journal nicht. Ich kann jederzeit in den Einstellungen oder per Mail an hello@victorakko.com widerrufen. Das umfasst auch die automatische Auswertung durch das KI-System.'
              : 'I explicitly consent to Victory Fitness storing my journal entries – including information about my health – for this purpose. This is voluntary: without consent I can still use the app, just not the journal. I can withdraw at any time in the settings or by writing to hello@victorakko.com. This includes automatic analysis by the AI system.'}</Text>
            <TouchableOpacity style={styles.consentAccept} disabled={consentSaving} onPress={() => updateJournalConsent(true)}>
              {consentSaving ? <ActivityIndicator color={OBSIDIAN} /> : <Text style={styles.consentAcceptText}>{consentLanguage === 'de' ? 'Journal starten' : 'Start journal'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.consentDecline} disabled={consentSaving} onPress={() => updateJournalConsent(false)}>
              <Text style={styles.consentDeclineText}>{consentLanguage === 'de' ? 'Jetzt nicht' : 'Not now'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modal>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Top Header matching lines 1506-1509 */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleSkipToday} activeOpacity={0.7} style={{ marginBottom: 12 }}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Journal</Text>
          <Text style={styles.streakBadge}>{`${streakDays} days running`}</Text>
        </View>

        <Text style={styles.subtitle}>
          One prompt a day, two minutes. Nobody sees this — not your duo, not your coach, unless you send it.
        </Text>

        {/* Today's Prompt Card matching lines 1512-1520 */}
        <View style={styles.promptCard}>
          <Text style={styles.promptKicker}>TODAY'S PROMPT</Text>
          <Text style={styles.promptText}>{currentPrompt}</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="Write as much or as little as you like…"
              placeholderTextColor="rgba(247,243,238,0.35)"
              value={entryText}
              onChangeText={setEntryText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.85}
              onPress={handleSaveEntry}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={OBSIDIAN} />
              ) : (
                <Text style={styles.saveBtnText}>Save entry</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              activeOpacity={0.85}
              onPress={handleSkipToday}
            >
              <Text style={styles.skipBtnText}>Skip today</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* EARLIER THIS WEEK matching lines 1522-1534 */}
        <View style={styles.historyWrap}>
          <Text style={styles.historyTitle}>EARLIER THIS WEEK</Text>
          <View style={styles.historyCard}>
            {pastEntries.length > 0 ? (
              pastEntries.slice(0, 3).map((item, idx) => (
                <View
                  key={item.id || idx}
                  style={[
                    styles.historyItem,
                    idx < Math.min(pastEntries.length, 3) - 1 && styles.historyItemBorder,
                  ]}
                >
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyItemDay}>
                      {(item as any).title || getJournalEntryDayLabel(item.created_at)}
                    </Text>
                    <Text style={styles.historyItemPrompt}>
                      {(item as any).prompt || 'Daily check-in'}
                    </Text>
                  </View>
                  <Text style={styles.historyItemContent}>
                    {item.content || (item as any).reflection || ''}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.historyItem}>
                <Text style={styles.historyItemContent}>
                  No entries logged earlier this week yet.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  </RequirementAuditBoundary>
  );
}

const styles = StyleSheet.create({
  consentLoading: { alignItems: 'center', justifyContent: 'center' },
  consentScreen: { flex: 1, backgroundColor: OBSIDIAN },
  consentContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  consentTitle: { fontFamily: DMSANS, color: IVORY, fontSize: 28, fontWeight: '800', marginBottom: 16 },
  consentIntro: { fontFamily: INTER, color: 'rgba(247,243,238,0.82)', fontSize: 16, lineHeight: 24, marginBottom: 18 },
  consentPoint: { fontFamily: INTER, color: 'rgba(247,243,238,0.78)', fontSize: 14, lineHeight: 22, marginBottom: 8 },
  consentAi: { fontFamily: INTER, color: '#F2C66D', fontSize: 14, lineHeight: 22, marginTop: 12, marginBottom: 16 },
  consentLabel: { fontFamily: INTER, color: 'rgba(247,243,238,0.75)', fontSize: 13, lineHeight: 20, marginBottom: 24 },
  consentAccept: { backgroundColor: GOLD, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  consentAcceptText: { color: OBSIDIAN, fontFamily: DMSANS, fontWeight: '800', fontSize: 16 },
  consentDecline: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  consentDeclineText: { color: 'rgba(247,243,238,0.7)', fontFamily: DMSANS, fontWeight: '700' },
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 32 : 54,
    paddingBottom: 96,
  },
  headerRow: {
    paddingTop: 12,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenTitle: {
    fontFamily: DMSANS,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: IVORY,
  },
  streakBadge: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  subtitle: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.55)',
    marginBottom: 18,
  },
  promptCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 20,
    marginBottom: 22,
  },
  promptKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 10,
  },
  promptText: {
    fontFamily: DMSANS,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: IVORY,
    marginBottom: 16,
  },
  inputWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.2)',
    paddingBottom: 24,
    marginBottom: 16,
  },
  textInput: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 22,
    color: IVORY,
    minHeight: 70,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  skipBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.75)',
  },
  historyWrap: {
    paddingTop: 8,
  },
  historyTitle: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  historyCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  historyItem: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  historyItemDay: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
    color: IVORY,
  },
  historyItemPrompt: {
    fontFamily: MONO,
    fontSize: 11,
    color: 'rgba(247, 243, 238, 0.4)',
  },
  historyItemContent: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.75)',
  },
});
