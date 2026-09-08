import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from "../../constants/Colors";
import { Fonts } from "../../constants/Typography";
import { ErrorPopupModal } from "../../components/ErrorPopupModal";
import { apiRequest } from "../../lib/api";
import { formatAppError } from "../../lib/error";
import { useLanguage } from "../../lib/i18n";
import { getCachedResourceSnapshot, primeCachedResource } from "../../lib/resourceCache";
import { JOURNAL_ENTRIES_CACHE_KEY, JournalEntry } from "../../lib/screenData";

const MOODS = [
  { emoji: "😡", label: "ANGRY" },
  { emoji: "😟", label: "ANXIOUS" },
  { emoji: "😐", label: "NEUTRAL" },
  { emoji: "😊", label: "GOOD" },
  { emoji: "🤩", label: "VICTORIOUS" },
];

export default function JournalScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mood, setMood] = useState(3); // Default to happy
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [analysisModal, setAnalysisModal] = useState<{ source: JournalEntry; summary: string } | null>(null);
  const [showFullJournal, setShowFullJournal] = useState(false);
  const selectedMood = useMemo(() => MOODS[mood] ?? MOODS[3], [mood]);

  const buildJournalPreview = (content: string) => {
    const words = content.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 10) {
      return { text: content.trim(), truncated: false };
    }
    return { text: words.slice(0, 10).join(" "), truncated: true };
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)");
  };

  const handleSecureLog = async () => {
    const content = entry.trim();
    if (!content || saving) {
      return;
    }

    setSaving(true);
    setErrorDialog(null);
    try {
      const response = await apiRequest<JournalEntry>("/journal/entries", {
        method: "POST",
        body: {
          mood: selectedMood.label,
          content,
        },
      });
      const cachedJournalData = getCachedResourceSnapshot<{ entries: JournalEntry[] }>(JOURNAL_ENTRIES_CACHE_KEY);
      await primeCachedResource(
        JOURNAL_ENTRIES_CACHE_KEY,
        {
          entries: [response, ...(cachedJournalData?.entries ?? [])],
        },
        true
      );
      setEntry("");
      router.push("/journal/history");
    } catch (error) {
      setErrorDialog(formatAppError(error, t("Unable to save your journal entry right now.")));
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyzeWithAi = async () => {
    if (analyzing) {
      return;
    }

    setAnalyzing(true);
    setErrorDialog(null);
    try {
      const response = await apiRequest<{ entry: JournalEntry; analysis: string }>("/journal/analyze/latest", {
        method: "POST",
      });
      setShowFullJournal(false);
      setAnalysisModal({
        source: response.entry,
        summary: response.analysis,
      });
    } catch (error) {
      setErrorDialog(formatAppError(error, t("Unable to analyze your journal entry right now.")));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title ?? t("Error")}
        message={errorDialog?.message ?? ""}
        onClose={() => setErrorDialog(null)}
      />
      <Modal
        visible={Boolean(analysisModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setAnalysisModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setAnalysisModal(null);
              setShowFullJournal(false);
            }}
          />
          <View style={styles.modalCard}>
            <View style={styles.analysisHeader}>
              <View style={styles.analysisTitleWrap}>
                <Text style={styles.analysisEyebrow}>{t("LATEST JOURNAL ANALYSIS")}</Text>
                <Text style={styles.analysisTitle}>{t("AI Summary")}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                activeOpacity={0.85}
                onPress={() => {
                  setAnalysisModal(null);
                  setShowFullJournal(false);
                }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {analysisModal ? (
              <>
                <View style={styles.analysisMoodPill}>
                  <Text style={styles.analysisMoodText}>{analysisModal.source.mood}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowFullJournal((prev) => !prev)}
                  style={styles.analysisJournalBlock}
                >
                  <Text style={styles.analysisSectionLabel}>{t("Latest Journal")}</Text>
                  <Text style={styles.analysisBodyText}>
                    {showFullJournal
                      ? analysisModal.source.content
                      : buildJournalPreview(analysisModal.source.content).text}
                    {!showFullJournal && buildJournalPreview(analysisModal.source.content).truncated ? (
                      <Text style={styles.inlineExpandText}>...</Text>
                    ) : null}
                  </Text>
                </TouchableOpacity>
                <ScrollView style={styles.analysisSummaryBlock} showsVerticalScrollIndicator={false}>
                  <Text style={styles.analysisSectionLabel}>{t("AI Summary")}</Text>
                  <Text style={styles.analysisBodyText}>{analysisModal.summary}</Text>
                </ScrollView>
              </>
            ) : null}
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
        <Text style={styles.screenTitle}>{t("JOURNAL")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.dateLabel}>{t("THURSDAY, APRIL 9")}</Text>
          <Text style={styles.mainTitle}>{t("Reflect on your victory.")}</Text>
        </View>

        <View style={styles.glassCard}>
          <Text style={styles.sectionLabel}>{t("CURRENT VIBE")}</Text>
          <View style={styles.moodScale}>
            {MOODS.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setMood(i)}
                style={[
                  styles.moodBtn,
                  mood === i && styles.moodBtnActive,
                  mood === i && {
                    shadowColor: i > 2 ? Colors.accentBlue : "#EF4444",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.moodEmoji,
                    mood === i && styles.moodEmojiActive,
                  ]}
                >
                  {m.emoji}
                </Text>
                {mood === i && (
                  <Text style={styles.activeMoodLabel}>{m.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.composerContainer}>
            <TextInput
              style={styles.composer}
              placeholder={t("Start typing your reflection...")}
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              value={entry}
              onChangeText={setEntry}
            />

            <View style={styles.composerFooter}>
              <Text style={styles.charCount}>{entry.length} {t("characters")}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryAction, saving && styles.primaryActionDisabled]}
            activeOpacity={0.8}
            onPress={handleSecureLog}
            disabled={!entry.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={styles.actionContentRow}>
                <Text style={styles.primaryActionText}>{t("SECURE LOG")}</Text>
                <Ionicons name="shield-checkmark" size={18} color="#000" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aiAction, analyzing && styles.aiActionDisabled]}
            activeOpacity={0.8}
            onPress={handleAnalyzeWithAi}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color={Colors.accentPurple} />
            ) : (
              <View style={styles.actionContentRow}>
                <Ionicons name="sparkles" size={18} color={Colors.accentPurple} />
                <Text style={styles.aiActionText}>{t("ANALYZE WITH AI")}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => router.push("/journal/history")}
          >
            <Text style={styles.historyLinkText}>{t("View All Past Entries")}</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={Colors.accentBlue}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F", // Deeper background
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
    color: '#fff',
    fontSize: 16,
    letterSpacing: 4,
    fontFamily: 'Inter_700Bold',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.76)",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "88%",
    backgroundColor: Colors.surfaceCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  welcomeSection: {
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  dateLabel: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 2,
    marginBottom: 8,
  },
  mainTitle: {
    color: Colors.text,
    fontSize: 28,
    fontFamily: Fonts.display,
    letterSpacing: 0.2,
  },
  glassCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 32,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
    marginBottom: 20,
    textAlign: "center",
  },
  moodScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    height: 80,
    alignItems: "center",
  },
  moodBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(247,243,238,0.04)",
  },
  moodBtnActive: {
    backgroundColor: "rgba(201,148,58,0.18)",
    borderWidth: 1,
    borderColor: Colors.gold,
    height: 70,
    width: 60,
    borderRadius: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 24,
    opacity: 0.4,
  },
  moodEmojiActive: {
    fontSize: 32,
    opacity: 1,
  },
  activeMoodLabel: {
    color: Colors.gold,
    fontSize: 8,
    fontFamily: Fonts.heading,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  composerContainer: {
    backgroundColor: Colors.obsidian,
    borderRadius: 24,
    padding: 20,
    minHeight: 300,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  composer: {
    flex: 1,
    color: Colors.text,
    fontSize: 17,
    fontFamily: Fonts.body,
    lineHeight: 26,
    textAlignVertical: "top",
    outlineStyle: "none" as any,
  },
  composerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 16,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.data,
  },
  primaryAction: {
    backgroundColor: Colors.gold,
    flexDirection: "row",
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionDisabled: {
    opacity: 0.55,
  },
  actionContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryActionText: {
    color: Colors.obsidian,
    fontSize: 15,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
  },
  aiAction: {
    flexDirection: "row",
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(181, 101, 29, 0.35)",
    backgroundColor: "rgba(181, 101, 29, 0.08)",
  },
  aiActionDisabled: {
    opacity: 0.55,
  },
  aiActionText: {
    color: Colors.copper,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  analysisTitleWrap: {
    flex: 1,
  },
  analysisEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  analysisTitle: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: Fonts.display,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,243,238,0.08)",
  },
  analysisMoodPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(201,148,58,0.14)",
    borderWidth: 1,
    borderColor: "rgba(201,148,58,0.28)",
    marginBottom: 14,
  },
  analysisMoodText: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
  },
  analysisJournalBlock: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  analysisSummaryBlock: {
    maxHeight: 260,
    borderRadius: 18,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
  },
  analysisSectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  analysisBodyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.body,
  },
  inlineExpandText: {
    color: Colors.gold,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.heading,
  },
  footer: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  footerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  footerTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201,148,58,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  streakText: {
    color: Colors.gold,
    fontSize: 10,
    fontFamily: Fonts.dataBold,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  historyLinkText: {
    color: Colors.gold,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
});

