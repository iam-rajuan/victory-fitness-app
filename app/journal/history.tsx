import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { apiRequest } from '../../lib/api';
import { formatAppError } from '../../lib/error';
import { useLanguage } from '../../lib/i18n';
import { ScreenState } from '../../components/ScreenState';
import { useAsyncScreenData } from '../../hooks/useAsyncScreenData';
import { fetchJournalEntries, JOURNAL_ENTRIES_CACHE_KEY, JournalEntry } from '../../lib/screenData';
import { primeCachedResource } from '../../lib/resourceCache';

const MOOD_EMOJI: Record<string, string> = {
  ANGRY: '\u{1F621}',
  ANXIOUS: '\u{1F61F}',
  NEUTRAL: '\u{1F610}',
  GOOD: '\u{1F60A}',
  VICTORIOUS: '\u{1F929}',
};

type FormattedJournalBlock =
  | { type: 'bullet'; content: string }
  | { type: 'section'; title: string; content: string }
  | { type: 'paragraph'; content: string };

function formatEntryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'UNKNOWN DATE';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

function formatEntryTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatJournalContent(content: string): FormattedJournalBlock[] {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!normalized.length) {
    return [];
  }

  const blocks: FormattedJournalBlock[] = [];

  normalized.forEach((line) => {
    const sectionMatch = line.match(/^\*\*(.+?)\*\*\s*:?\s*(.*)$/);
    if (sectionMatch) {
      const rawTitle = sectionMatch[1].trim().replace(/:$/, '');
      const sectionContent = sectionMatch[2].trim();
      blocks.push({
        type: 'section',
        title: rawTitle,
        content: sectionContent,
      });
      return;
    }

    const bulletMatch = line.match(/^([-*\u2022]|\d+[.)])\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({ type: 'bullet', content: bulletMatch[2].trim() });
      return;
    }

    const sentenceChunks = line
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (sentenceChunks.length <= 2) {
      blocks.push({ type: 'paragraph', content: line });
      return;
    }

    for (let i = 0; i < sentenceChunks.length; i += 2) {
      blocks.push({
        type: 'paragraph',
        content: sentenceChunks.slice(i, i + 2).join(' '),
      });
    }
  });

  return blocks;
}

export default function JournalHistoryScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftMood, setDraftMood] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const {
    data: journalData,
    loading,
    refreshing,
    error,
    reload,
    setData,
  } = useAsyncScreenData({
    initialData: { entries: [] as JournalEntry[] },
    cacheKey: JOURNAL_ENTRIES_CACHE_KEY,
    load: fetchJournalEntries,
    getErrorMessage: (loadError) => formatAppError(loadError, t('Unable to load journal history right now.')).message,
  });
  const entries = journalData.entries;
  const formattedSelectedEntry = selectedEntry ? formatJournalContent(selectedEntry.content) : [];

  const openEntry = useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsEditing(false);
    setDraftMood(entry.mood);
    setDraftContent(entry.content);
  }, []);

  const handleBackPress = useCallback(() => {
    setSelectedEntry(null);
    setDeleteTarget(null);
    setIsEditing(false);
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/journal');
  }, [router]);

  const handleDeleteEntry = useCallback(async () => {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);
    setErrorDialog(null);
    try {
      await apiRequest(`/journal/entries/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      const nextEntries = entries.filter((item) => item.id !== deleteTarget.id);
      setData({ entries: nextEntries });
      await primeCachedResource(JOURNAL_ENTRIES_CACHE_KEY, { entries: nextEntries }, true);
      setSelectedEntry(null);
      setDeleteTarget(null);
    } catch (deleteError) {
      setErrorDialog(formatAppError(deleteError, t('Unable to delete this journal entry right now.')));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, entries, setData, t]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedEntry || savingEdit) {
      return;
    }

    const nextContent = draftContent.trim();
    const nextMood = draftMood.trim();
    if (!nextContent || !nextMood) {
      return;
    }

    setSavingEdit(true);
    setErrorDialog(null);
    try {
      const updatedEntry = await apiRequest<JournalEntry>(`/journal/entries/${encodeURIComponent(selectedEntry.id)}`, {
        method: 'PATCH',
        body: {
          mood: nextMood,
          content: nextContent,
        },
      });
      const nextEntries = entries.map((item) => (item.id === updatedEntry.id ? updatedEntry : item));
      setData({ entries: nextEntries });
      await primeCachedResource(JOURNAL_ENTRIES_CACHE_KEY, { entries: nextEntries }, true);
      setSelectedEntry(updatedEntry);
      setDraftMood(updatedEntry.mood);
      setDraftContent(updatedEntry.content);
      setIsEditing(false);
    } catch (saveError) {
      setErrorDialog(formatAppError(saveError, t('Unable to update this journal entry right now.')));
    } finally {
      setSavingEdit(false);
    }
  }, [draftContent, draftMood, entries, savingEdit, selectedEntry, setData, t]);

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const moodEmoji = MOOD_EMOJI[item.mood] ?? '\u{1F4DD}';
    const previewBlocks = formatJournalContent(item.content).slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.entryCard}
        activeOpacity={0.7}
        onPress={() => openEntry(item)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dateText}>{formatEntryDate(item.created_at)}</Text>
            <Text style={styles.timeText}>{formatEntryTime(item.created_at)}</Text>
          </View>
          <Text style={styles.moodEmoji}>{moodEmoji}</Text>
        </View>
        <View style={styles.entryPreview}>
          {previewBlocks.map((block, index) =>
            block.type === 'bullet' ? (
              <View key={`${item.id}-${block.type}-${index}`} style={styles.previewBulletRow}>
                <View style={styles.previewBulletDot} />
                <Text style={styles.entryText} numberOfLines={2}>
                  {block.content}
                </Text>
              </View>
            ) : block.type === 'section' ? (
              <View key={`${item.id}-${block.type}-${index}`} style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>{block.title}</Text>
                <Text style={styles.entryText} numberOfLines={2}>
                  {block.content}
                </Text>
              </View>
            ) : (
              <Text key={`${item.id}-${block.type}-${index}`} style={styles.entryText} numberOfLines={2}>
                {block.content}
              </Text>
            )
          )}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.viewMoreText}>{t('View entry')}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.accentBlue} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title ?? t('Error')}
        message={errorDialog?.message ?? ''}
        onClose={() => setErrorDialog(null)}
      />
      <Modal
        visible={Boolean(selectedEntry)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!savingEdit) {
            setSelectedEntry(null);
            setIsEditing(false);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!savingEdit) {
              setSelectedEntry(null);
              setIsEditing(false);
            }
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalDateText}>
                  {selectedEntry ? formatEntryDate(selectedEntry.created_at) : ''}
                </Text>
                <Text style={styles.modalTimeText}>
                  {selectedEntry ? formatEntryTime(selectedEntry.created_at) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEntry(null)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <>
                <View style={styles.moodPickerRow}>
                  {Object.entries(MOOD_EMOJI).map(([label, emoji]) => (
                    <TouchableOpacity
                      key={label}
                      style={[styles.moodOption, draftMood === label && styles.moodOptionActive]}
                      activeOpacity={0.85}
                      onPress={() => setDraftMood(label)}
                      disabled={savingEdit}
                    >
                      <Text style={styles.moodOptionEmoji}>{emoji}</Text>
                      <Text style={[styles.moodOptionLabel, draftMood === label && styles.moodOptionLabelActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.editInput}
                  multiline
                  value={draftContent}
                  onChangeText={setDraftContent}
                  placeholder={t('Update your journal entry...')}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  textAlignVertical="top"
                  editable={!savingEdit}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    activeOpacity={0.85}
                    onPress={() => {
                      setDraftMood(selectedEntry?.mood ?? '');
                      setDraftContent(selectedEntry?.content ?? '');
                      setIsEditing(false);
                    }}
                    disabled={savingEdit}
                  >
                    <Text style={styles.cancelButtonText}>{t('Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, (!draftContent.trim() || !draftMood || savingEdit) && styles.deleteButtonDisabled]}
                    activeOpacity={0.85}
                    onPress={() => {
                      void handleSaveEdit();
                    }}
                    disabled={!draftContent.trim() || !draftMood || savingEdit}
                  >
                    {savingEdit ? <ActivityIndicator color={Colors.obsidian} /> : <Text style={styles.saveButtonText}>{t('Save')}</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.modalMoodRow}>
                  <Text style={styles.modalMoodEmoji}>
                    {selectedEntry ? MOOD_EMOJI[selectedEntry.mood] ?? '\u{1F4DD}' : ''}
                  </Text>
                  <Text style={styles.modalMoodLabel}>{selectedEntry?.mood ?? ''}</Text>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {formattedSelectedEntry.map((block, index) =>
                    block.type === 'bullet' ? (
                      <View key={`${block.type}-${index}`} style={styles.bulletRow}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.modalEntryText}>{block.content}</Text>
                      </View>
                    ) : block.type === 'section' ? (
                      <View key={`${block.type}-${index}`} style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{block.title}</Text>
                        {!!block.content && <Text style={styles.modalEntryText}>{block.content}</Text>}
                      </View>
                    ) : (
                      <Text key={`${block.type}-${index}`} style={styles.modalEntryText}>
                        {block.content}
                      </Text>
                    )
                  )}
                </ScrollView>
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={styles.editButton}
                    activeOpacity={0.85}
                    onPress={() => {
                      setDraftMood(selectedEntry?.mood ?? '');
                      setDraftContent(selectedEntry?.content ?? '');
                      setIsEditing(true);
                    }}
                    disabled={deleting}
                  >
                    <Ionicons name="create-outline" size={18} color={Colors.gold} />
                    <Text style={styles.editButtonText}>{t('Edit Journal')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (selectedEntry && !deleting) {
                        setDeleteTarget(selectedEntry);
                      }
                    }}
                    disabled={deleting}
                  >
                    <Ionicons name="trash-outline" size={18} color="#F87171" />
                    <Text style={styles.deleteButtonText}>{t('Delete Journal')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={Boolean(deleteTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <View style={styles.confirmOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!deleting) {
                setDeleteTarget(null);
              }
            }}
          />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash-outline" size={24} color="#F87171" />
            </View>
            <Text style={styles.confirmTitle}>{t('Delete journal entry?')}</Text>
            <Text style={styles.confirmText}>{t('This will permanently remove the selected journal entry from your history.')}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                activeOpacity={0.85}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={styles.confirmCancelText}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteButton, deleting && styles.deleteButtonDisabled]}
                activeOpacity={0.85}
                onPress={() => {
                  void handleDeleteEntry();
                }}
                disabled={deleting}
              >
                {deleting ? (
                  <Ionicons name="hourglass-outline" size={18} color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>{t('Delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{t('JOURNAL HISTORY')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ScreenState mode="loading" message={t('Loading saved journal entries...')} />
      ) : error ? (
        <ScreenState
          mode="error"
          message={error}
          actionLabel={t('Try Again')}
          onAction={() => {
            void reload().catch((loadError) => {
              setErrorDialog(formatAppError(loadError, t('Unable to load journal history right now.')));
            });
          }}
        />
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<View style={{ height: 100 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={34} color="rgba(255,255,255,0.25)" />
               <Text style={styles.emptyTitle}>{t('No journal entries yet')}</Text>
               <Text style={styles.emptyText}>{t('Save a journal entry to see it here.')}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void reload().catch((loadError) => {
                  setErrorDialog(formatAppError(loadError, t('Unable to load journal history right now.')));
                });
              }}
              tintColor={Colors.accentBlue}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    color: Colors.text,
    fontSize: 16,
    letterSpacing: 2,
    fontFamily: Fonts.display,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  emptyState: {
    flex: 1,
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: Fonts.heading,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: Fonts.body,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateText: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
  },
  timeText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  moodEmoji: {
    fontSize: 32,
  },
  entryText: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.body,
  },
  entryPreview: {
    marginBottom: 16,
  },
  previewBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.gold,
    marginTop: 9,
  },
  previewSection: {
    marginBottom: 4,
  },
  previewSectionTitle: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 12,
  },
  viewMoreText: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  modalDateText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: Fonts.display,
    letterSpacing: 0.5,
  },
  modalTimeText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalMoodEmoji: {
    fontSize: 28,
  },
  modalMoodLabel: {
    color: Colors.gold,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
  },
  moodPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  moodOption: {
    minWidth: '30%',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(247, 243, 238, 0.04)',
    alignItems: 'center',
    gap: 4,
  },
  moodOptionActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
  },
  moodOptionEmoji: {
    fontSize: 22,
  },
  moodOptionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 0.6,
  },
  moodOptionLabelActive: {
    color: Colors.gold,
  },
  modalBody: {
    maxHeight: 380,
  },
  editInput: {
    minHeight: 260,
    maxHeight: 420,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.obsidian,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.body,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    outlineStyle: 'none' as any,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: Colors.obsidian,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.1)',
  },
  editButtonText: {
    color: Colors.gold,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deleteButtonDisabled: {
    opacity: 0.55,
  },
  deleteButtonText: {
    color: '#F87171',
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  modalEntryText: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Fonts.body,
    paddingBottom: 12,
  },
  sectionBlock: {
    paddingBottom: 6,
  },
  sectionTitle: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
    marginTop: 10,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: Fonts.display,
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.body,
    textAlign: 'center',
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  confirmCancelButton: {
    minWidth: 110,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
  },
  confirmCancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  confirmDeleteButton: {
    minWidth: 110,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
});
