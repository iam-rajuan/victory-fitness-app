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
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../lib/api';
import { JOURNAL_ENTRIES_CACHE_KEY, JournalEntry } from '../../lib/screenData';
import { primeCachedResource } from '../../lib/resourceCache';
import RequirementAuditBoundary from '../../components/audit/RequirementAuditBoundary';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

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
  const [entryText, setEntryText] = useState('');
  const [saving, setSaving] = useState(false);
  const [streakDays, setStreakDays] = useState(5);
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
        const res = await apiRequest<{ entries: JournalEntry[] }>('/journal/entries');
        if (!cancelled && res?.entries) {
          setPastEntries(res.entries);
          if (res.entries.length > 0) {
            setStreakDays(Math.max(res.entries.length, 3));
          }
        }
      } catch {
        if (!cancelled) {
          setPastEntries([]);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <RequirementAuditBoundary auditId="APP-EXTRA-011" status="extra" style={{ flex: 1 }}>
      <View style={styles.container}>
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
    fontFamily: CLASH,
    fontSize: 27,
    fontWeight: '600',
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
    fontFamily: CLASH,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
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
