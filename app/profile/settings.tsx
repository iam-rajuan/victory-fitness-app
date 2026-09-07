import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { fetchCurrentUser, updateCurrentUserProfile } from '../../lib/api';
import { formatAppError } from '../../lib/error';
import { goBackOrReplace } from '../../lib/navigation';
import { useLanguage } from '../../lib/i18n';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  // Section 20.3: Identity Statement
  const [identityStatement, setIdentityStatement] = useState('');

  // Section 20.5: If-Then Trigger Builder
  const [trainingTriggerContext, setTrainingTriggerContext] = useState('');
  const [trainingTriggerAction, setTrainingTriggerAction] = useState('open the app and start my workout');

  // Section 20.4: Workout Unlock
  const [workoutUnlockLabel, setWorkoutUnlockLabel] = useState('');

  // Commitment statement
  const [motivationStatement, setMotivationStatement] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadUserData = async () => {
      try {
        const user = await fetchCurrentUser({ forceRefresh: true });
        if (cancelled) return;

        setIdentityStatement(user.identity_statement ?? '');
        setTrainingTriggerContext(user.training_trigger_context ?? '');
        setTrainingTriggerAction(
          user.training_trigger_action && user.training_trigger_action.trim()
            ? user.training_trigger_action
            : 'open the app and start my workout'
        );
        setWorkoutUnlockLabel(user.workout_unlock_label ?? '');
        setMotivationStatement(user.motivation_statement ?? '');
      } catch (err) {
        if (!cancelled) {
          setErrorDialog(formatAppError(err, t('Unable to load settings.')));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadUserData();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaveAll = async () => {
    if (saving) return;
    setSaving(true);
    setSaveSuccessMessage(null);

    try {
      await updateCurrentUserProfile({
        identity_statement: identityStatement, // Stored verbatim — not modified, not auto-corrected
        training_trigger_context: trainingTriggerContext.trim(),
        training_trigger_action: trainingTriggerAction.trim() || 'open the app and start my workout',
        workout_unlock_label: workoutUnlockLabel.trim(),
        motivation_statement: motivationStatement.trim(),
      });
      setSaveSuccessMessage(t('Settings updated successfully.'));
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 3000);
    } catch (err) {
      setErrorDialog(formatAppError(err, t('Unable to save settings.')));
    } finally {
      setSaving(false);
    }
  };

  const previewContext = trainingTriggerContext.trim() || 'Kids in bed';
  const previewAction = trainingTriggerAction.trim() || 'open the app and start my workout';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accentBlue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title ?? 'Error'}
        message={errorDialog?.message ?? ''}
        onClose={() => setErrorDialog(null)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBackOrReplace(router, '/profile')}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Habit & Mindset Settings')}</Text>
        <TouchableOpacity
          onPress={handleSaveAll}
          style={[styles.saveHeaderBtn, saving && styles.saveHeaderBtnDisabled]}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>{t('Save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {saveSuccessMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.successBannerText}>{saveSuccessMessage}</Text>
            </View>
          )}

          {/* Section 20.3: Identity Statement */}
          <View style={styles.card}>
            <View style={styles.cardBadgeRow}>
              <View style={styles.tierBadge}>
                <Ionicons name="sparkles" size={12} color="#F59E0B" />
                <Text style={styles.tierBadgeText}>GOLD</Text>
              </View>
              <Text style={styles.sectionCode}>Section 20.3</Text>
            </View>

            <Text style={styles.cardHeadline}>Who are you becoming?</Text>
            <Text style={styles.cardSubtext}>
              Write in your own words a short statement describing who you are becoming.
              Written in present tense. Stored verbatim. Shapes your AI Coach&apos;s tone.
            </Text>

            <TextInput
              style={styles.textArea}
              value={identityStatement}
              onChangeText={setIdentityStatement}
              placeholder="I am someone who..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              textAlignVertical="top"
              maxLength={280}
            />

            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>{t('Examples:')}</Text>
              <TouchableOpacity
                onPress={() => setIdentityStatement('I am someone who trains even when it is hard.')}
                activeOpacity={0.7}
                style={styles.examplePill}
              >
                <Text style={styles.examplePillText}>&ldquo;I am someone who trains even when it is hard.&rdquo;</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIdentityStatement('I am a person who keeps their word to themselves.')}
                activeOpacity={0.7}
                style={styles.examplePill}
              >
                <Text style={styles.examplePillText}>&ldquo;I am a person who keeps their word to themselves.&rdquo;</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIdentityStatement('I am becoming the strongest version of myself.')}
                activeOpacity={0.7}
                style={styles.examplePill}
              >
                <Text style={styles.examplePillText}>&ldquo;I am becoming the strongest version of myself.&rdquo;</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 20.5: If-Then Trigger Builder */}
          <View style={styles.card}>
            <View style={styles.cardBadgeRow}>
              <View style={styles.tierBadge}>
                <Ionicons name="sparkles" size={12} color="#F59E0B" />
                <Text style={styles.tierBadgeText}>GOLD</Text>
              </View>
              <Text style={styles.sectionCode}>Section 20.5</Text>
            </View>

            <Text style={styles.cardHeadline}>My Training Trigger</Text>
            <Text style={styles.cardSubtext}>
              Link your workout to something that already happens in your daily routine to replace generic reminders with a personally-anchored cue.
            </Text>

            <Text style={styles.inputPrompt}>1. &ldquo;After I...&rdquo;</Text>
            <TextInput
              style={styles.textInput}
              value={trainingTriggerContext}
              onChangeText={setTrainingTriggerContext}
              placeholder="e.g. put the kids to bed / close my laptop"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={140}
            />

            <Text style={styles.inputPrompt}>2. &ldquo;I will immediately...&rdquo;</Text>
            <TextInput
              style={styles.textInput}
              value={trainingTriggerAction}
              onChangeText={setTrainingTriggerAction}
              placeholder="open the app and start my workout"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={140}
            />

            {/* Live Notification Preview */}
            <View style={styles.previewBox}>
              <View style={styles.previewHeader}>
                <Ionicons name="notifications" size={14} color="#06B6D4" />
                <Text style={styles.previewTitle}>Personal Anchor Notification Preview</Text>
              </View>
              <Text style={styles.previewText}>
                &ldquo;When {previewContext}? That means — {previewAction}.&rdquo;
              </Text>
              <Text style={styles.previewHint}>
                Sent at your optimal workout notification hour. Coach Victor also references this cue in consistency conversations.
              </Text>
            </View>
          </View>

          {/* Section 20.4: Workout Unlock */}
          <View style={styles.card}>
            <View style={styles.cardBadgeRow}>
              <View style={[styles.tierBadge, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
                <Ionicons name="key" size={12} color="#06B6D4" />
                <Text style={[styles.tierBadgeText, { color: '#06B6D4' }]}>HABIT</Text>
              </View>
              <Text style={styles.sectionCode}>Section 20.4</Text>
            </View>

            <Text style={styles.cardHeadline}>My Workout Unlock</Text>
            <Text style={styles.cardSubtext}>
              A ritual, reward, or sensory anchor you unlock only while training.
            </Text>

            <TextInput
              style={styles.textInput}
              value={workoutUnlockLabel}
              onChangeText={setWorkoutUnlockLabel}
              placeholder="e.g. Favorite Podcast, Fresh Espresso, Cold Shower"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={100}
            />
            <Text style={styles.subtextSmall}>
              Coach Victor will naturally ask: &ldquo;Are you making use of {workoutUnlockLabel.trim() || '[label]'} during sessions?&rdquo;
            </Text>
          </View>

          {/* Primary Commitment */}
          <View style={styles.card}>
            <Text style={styles.cardHeadline}>Motivation & Why</Text>
            <Text style={styles.cardSubtext}>
              Why this commitment matters to you right now.
            </Text>
            <TextInput
              style={styles.textArea}
              value={motivationStatement}
              onChangeText={setMotivationStatement}
              placeholder="Why this matters to you"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              multiline
              maxLength={280}
            />
          </View>

          {/* Bottom Save Button */}
          <TouchableOpacity
            onPress={handleSaveAll}
            style={[styles.bigSaveButton, saving && styles.saveHeaderBtnDisabled]}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bigSaveButtonText}>{t('Save All Changes')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E12',
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  saveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.accentBlue,
  },
  saveHeaderBtnDisabled: {
    opacity: 0.5,
  },
  saveHeaderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successBannerText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    marginBottom: 18,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  sectionCode: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
  },
  cardHeadline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  cardSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 18,
    marginBottom: 14,
  },
  subtextSmall: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#fff',
    fontSize: 15,
    padding: 14,
    minHeight: 88,
    lineHeight: 22,
  },
  inputPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06B6D4',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: '#fff',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  examplesContainer: {
    marginTop: 12,
  },
  examplesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
  },
  examplePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  examplePillText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  previewBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06B6D4',
    textTransform: 'uppercase',
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  previewHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 6,
  },
  bigSaveButton: {
    backgroundColor: Colors.accentBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.accentBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bigSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
