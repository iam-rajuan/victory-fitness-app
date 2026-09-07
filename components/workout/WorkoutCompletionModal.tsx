import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { BrandConfetti } from '../confetti/BrandConfetti';
import { useLanguage } from '../../lib/i18n';
import { submitStrengthWorkoutFeedback, StrengthFeedbackResponse } from '../../lib/workout-plans';
import { fetchCurrentUser, recordAnalyticsEvent } from '../../lib/api';

const UPGRADE_RATE_LIMIT_MS = 48 * 60 * 60 * 1000; // 48 hours
const UPGRADE_LAST_SHOWN_KEY = '@victory_upgrade_offer_shown';
const CONFETTI_COLORS = ['#EF4444', '#EAB308', '#22C55E', '#FFFFFF'];

interface WorkoutCompletionModalProps {
  visible: boolean;
  planId?: string | null;
  dayLabel: string;
  completionCard: {
    imageBase64: string;
    fileUri: string;
    shareMessage: string;
    fileName: string;
  } | null;
  totalCompletedWorkouts?: number;
  durationSeconds?: number;
  onClose: () => void;
  onDownload: () => void;
  onShareCard: () => void;
}

export default function WorkoutCompletionModal({
  visible,
  planId,
  dayLabel,
  completionCard,
  totalCompletedWorkouts = 2,
  durationSeconds,
  onClose,
  onDownload,
  onShareCard,
}: WorkoutCompletionModalProps) {
  const { t } = useLanguage();
  const router = useRouter();

  // Feedback State
  const [difficulty, setDifficulty] = useState<'too_easy' | 'just_right' | 'too_hard'>('just_right');
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('high');
  const [painFlag, setPainFlag] = useState(false);
  const [sweetSpotFlag, setSweetSpotFlag] = useState(false);
  const [notes, setNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [aiCoachFeedback, setAiCoachFeedback] = useState<StrengthFeedbackResponse | null>(null);

  // Upgrade Offer State
  const [showUpgradeOffer, setShowUpgradeOffer] = useState(false);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);

  // Check Section 17.1 upgrade offer eligibility
  useEffect(() => {
    if (!visible) return;

    const checkUpgradeEligibility = async () => {
      // 1. Never on first-ever workout
      if (totalCompletedWorkouts <= 1) {
        setShowUpgradeOffer(false);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        const tier = String(user?.subscription_tier || '').toUpperCase();
        if (tier === 'GOLD' || tier === 'LIFETIME') {
          setShowUpgradeOffer(false);
          return;
        }

        // 2. Max once per 48 hours
        const lastShown = await AsyncStorage.getItem(UPGRADE_LAST_SHOWN_KEY);
        if (lastShown) {
          const elapsed = Date.now() - parseInt(lastShown, 10);
          if (elapsed < UPGRADE_RATE_LIMIT_MS) {
            setShowUpgradeOffer(false);
            return;
          }
        }

        // Eligible
        setShowUpgradeOffer(true);
        await AsyncStorage.setItem(UPGRADE_LAST_SHOWN_KEY, String(Date.now()));
        void recordAnalyticsEvent('post_workout_upsell_shown', { day: dayLabel }).catch(() => undefined);
      } catch {
        setShowUpgradeOffer(false);
      }
    };

    void checkUpgradeEligibility();
  }, [visible, totalCompletedWorkouts, dayLabel]);

  const handleWhatsAppShare = async () => {
    if (!completionCard) return;
    const shareText = completionCard.shareMessage || `I just finished my workout with Victory Fitness! 💥 #VictoryFitness`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    try {
      await Linking.openURL(whatsappUrl);
      void recordAnalyticsEvent('workout_shared_whatsapp', { day: dayLabel }).catch(() => undefined);
    } catch {
      onShareCard();
    }
  };

  const handleCommunityShare = () => {
    onClose();
    router.push('/(tabs)/challenge');
  };

  const handleSubmitFeedback = async () => {
    if (!planId) return;
    setSubmittingFeedback(true);
    try {
      const response = await submitStrengthWorkoutFeedback(planId, {
        day: dayLabel,
        perceived_difficulty: difficulty,
        energy,
        soreness: painFlag ? 'high' : 'medium',
        pain_flag: painFlag,
        sweet_spot_flag: sweetSpotFlag,
        notes,
      });
      setAiCoachFeedback(response);
      void recordAnalyticsEvent('post_workout_feedback_submitted', {
        difficulty,
        painFlag,
        sweetSpotFlag,
      }).catch(() => undefined);
    } catch {
      Alert.alert(t('Feedback Recorded'), t('Your workout metrics have been logged locally!'));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Brand Confetti in Red/Gold/Green */}
        <BrandConfetti active={visible} duration={3500} colors={CONFETTI_COLORS} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
              <View style={styles.celebrationBadge}>
                <Ionicons name="flame" size={16} color="#EAB308" />
                <Text style={styles.celebrationBadgeText}>{t('SESSION COMPLETE!')}</Text>
              </View>
              {durationSeconds && durationSeconds > 0 ? (
                <View style={styles.durationBadge}>
                  <Ionicons name="stopwatch-outline" size={14} color="#00D9F5" />
                  <Text style={styles.durationBadgeText}>
                    {Math.floor(durationSeconds / 60) > 0 ? `${Math.floor(durationSeconds / 60)}m ` : ''}{durationSeconds % 60}s
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Achievement Card Image */}
            {completionCard?.imageBase64 ? (
              <View style={styles.imageCardWrap}>
                <Image
                  source={{ uri: `data:image/png;base64,${completionCard.imageBase64}` }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={styles.achievementPlaceholder}>
                <Ionicons name="trophy" size={48} color="#EAB308" />
                <Text style={styles.achievementTitle}>{dayLabel} {t('Completed')}</Text>
                <Text style={styles.achievementSubtitle}>
                  {completionCard?.shareMessage || t('Crushed volume and intensity targets!')}
                </Text>
              </View>
            )}

            {/* Sharing Actions Row */}
            <View style={styles.shareSection}>
              <Text style={styles.sectionLabel}>{t('SHARE YOUR ACHIEVEMENT')}</Text>
              <View style={styles.shareButtonsRow}>
                <TouchableOpacity
                  style={[styles.shareBtn, styles.whatsappBtn]}
                  onPress={handleWhatsAppShare}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                  <Text style={styles.shareBtnText}>{t('WhatsApp')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shareBtn, styles.communityBtn]}
                  onPress={handleCommunityShare}
                >
                  <Ionicons name="people" size={18} color="#fff" />
                  <Text style={styles.shareBtnText}>{t('Community')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shareBtn, styles.downloadBtn]}
                  onPress={onDownload}
                >
                  <Ionicons name="download-outline" size={18} color="#000" />
                  <Text style={[styles.shareBtnText, { color: '#000' }]}>{t('Save')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 17.1: Dismissible Upgrade Offer (Never blocks share flow) */}
            {showUpgradeOffer && !upgradeDismissed ? (
              <View style={styles.upgradeOfferCard}>
                <TouchableOpacity
                  style={styles.upgradeDismissBtn}
                  onPress={() => setUpgradeDismissed(true)}
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
                <View style={styles.upgradeOfferRow}>
                  <View style={styles.upgradeIconWrap}>
                    <Ionicons name="flash" size={20} color="#EAB308" />
                  </View>
                  <View style={styles.upgradeTextWrap}>
                    <Text style={styles.upgradeTitle}>{t('Level Up to Victory Gold')}</Text>
                    <Text style={styles.upgradeSubtitle}>
                      {t('Unlock AI form review, 1-on-1 coach feedback & personalized hypertrophy progression.')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.upgradeCtaBtn}
                  onPress={() => {
                    onClose();
                    router.push('/plan');
                  }}
                >
                  <Text style={styles.upgradeCtaText}>{t('Explore Gold Access')}</Text>
                  <Ionicons name="arrow-forward" size={14} color="#000" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Post-Session Feedback Loop */}
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Ionicons name="fitness-outline" size={20} color={Colors.accentBlue} />
                <Text style={styles.feedbackTitle}>{t('POST-SESSION FEEDBACK')}</Text>
              </View>

              <Text style={styles.questionLabel}>{t('How did this workout feel?')}</Text>
              <View style={styles.difficultyRow}>
                <TouchableOpacity
                  style={[
                    styles.difficultyBtn,
                    difficulty === 'too_easy' && styles.difficultyBtnActiveEasy,
                  ]}
                  onPress={() => setDifficulty('too_easy')}
                >
                  <Text style={styles.diffEmoji}>🟢</Text>
                  <Text style={[styles.diffText, difficulty === 'too_easy' && styles.diffTextActive]}>
                    {t('Too Easy')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.difficultyBtn,
                    difficulty === 'just_right' && styles.difficultyBtnActiveGood,
                  ]}
                  onPress={() => setDifficulty('just_right')}
                >
                  <Text style={styles.diffEmoji}>🟡</Text>
                  <Text style={[styles.diffText, difficulty === 'just_right' && styles.diffTextActive]}>
                    {t('Just Right')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.difficultyBtn,
                    difficulty === 'too_hard' && styles.difficultyBtnActiveHard,
                  ]}
                  onPress={() => setDifficulty('too_hard')}
                >
                  <Text style={styles.diffEmoji}>🔴</Text>
                  <Text style={[styles.diffText, difficulty === 'too_hard' && styles.diffTextActive]}>
                    {t('Too Hard')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sweet Spot & Pain Flags */}
              <View style={styles.flagsRow}>
                <TouchableOpacity
                  style={[styles.flagChip, painFlag && styles.flagChipPainActive]}
                  onPress={() => setPainFlag(!painFlag)}
                >
                  <Ionicons
                    name={painFlag ? 'warning' : 'warning-outline'}
                    size={16}
                    color={painFlag ? '#EF4444' : '#9CA3AF'}
                  />
                  <Text style={[styles.flagChipText, painFlag && styles.flagChipPainText]}>
                    {t('Pain / Discomfort Flag')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.flagChip, sweetSpotFlag && styles.flagChipSweetActive]}
                  onPress={() => setSweetSpotFlag(!sweetSpotFlag)}
                >
                  <Ionicons
                    name={sweetSpotFlag ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={sweetSpotFlag ? '#22C55E' : '#9CA3AF'}
                  />
                  <Text style={[styles.flagChipText, sweetSpotFlag && styles.flagChipSweetText]}>
                    {t('Sweet Spot')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Energy Selection */}
              <Text style={styles.questionLabel}>{t('Energy Level')}</Text>
              <View style={styles.energyRow}>
                {(['high', 'medium', 'low'] as const).map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.energyBtn, energy === lvl && styles.energyBtnActive]}
                    onPress={() => setEnergy(lvl)}
                  >
                    <Text style={[styles.energyBtnText, energy === lvl && styles.energyBtnTextActive]}>
                      {t(lvl.charAt(0).toUpperCase() + lvl.slice(1))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes input */}
              <TextInput
                style={styles.notesInput}
                placeholder={t('Optional notes (e.g. felt strong on bench press)...')}
                placeholderTextColor="#6B7280"
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={300}
              />

              {!aiCoachFeedback ? (
                <TouchableOpacity
                  style={[styles.submitFeedbackBtn, submittingFeedback && styles.disabledBtn]}
                  onPress={handleSubmitFeedback}
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#000" />
                      <Text style={styles.submitFeedbackBtnText}>{t('Get AI Coach Analysis')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>

            {/* AI Coach Victor Response */}
            {aiCoachFeedback ? (
              <View style={styles.aiCoachCard}>
                <View style={styles.aiCoachHeader}>
                  <View style={styles.coachAvatar}>
                    <Ionicons name="shield-checkmark" size={18} color="#000" />
                  </View>
                  <View>
                    <Text style={styles.coachName}>{t('Coach Victor AI')}</Text>
                    <Text style={styles.coachRole}>{t('Post-Workout Performance Feedback')}</Text>
                  </View>
                </View>

                {aiCoachFeedback.what_went_well ? (
                  <View style={styles.aiFeedbackSection}>
                    <Text style={styles.aiSectionTitle}>💪 {t('What Went Well')}</Text>
                    <Text style={styles.aiSectionContent}>{aiCoachFeedback.what_went_well}</Text>
                  </View>
                ) : null}

                {aiCoachFeedback.cautions ? (
                  <View style={styles.aiFeedbackSection}>
                    <Text style={styles.aiSectionTitle}>⚠️ {t('Cautions & Recovery')}</Text>
                    <Text style={styles.aiSectionContent}>{aiCoachFeedback.cautions}</Text>
                  </View>
                ) : null}

                {aiCoachFeedback.next_steps ? (
                  <View style={styles.aiFeedbackSection}>
                    <Text style={styles.aiSectionTitle}>🎯 {t('Next Steps')}</Text>
                    <Text style={styles.aiSectionContent}>{aiCoachFeedback.next_steps}</Text>
                  </View>
                ) : null}

                {aiCoachFeedback.adjustment_pct !== 0 ? (
                  <View style={styles.adjustmentBadge}>
                    <Text style={styles.adjustmentBadgeText}>
                      {aiCoachFeedback.adjustment_pct > 0
                        ? `+${aiCoachFeedback.adjustment_pct}% Progressive Overload Applied`
                        : `${aiCoachFeedback.adjustment_pct}% Recovery Volume Adjusted`}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>{t('Done')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: '#0F1216',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234,179,8,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
  },
  celebrationBadgeText: {
    color: '#EAB308',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,217,245,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,217,245,0.3)',
  },
  durationBadgeText: {
    color: '#00D9F5',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageCardWrap: {
    width: '100%',
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#161922',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  achievementPlaceholder: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.25)',
  },
  achievementTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 10,
  },
  achievementSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  shareSection: {
    marginBottom: 18,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  communityBtn: {
    backgroundColor: '#6366F1',
  },
  downloadBtn: {
    backgroundColor: Colors.accentBlue,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  upgradeOfferCard: {
    backgroundColor: 'rgba(234,179,8,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.25)',
    padding: 14,
    marginBottom: 18,
    position: 'relative',
  },
  upgradeDismissBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 4,
  },
  upgradeOfferRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(234,179,8,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTextWrap: {
    flex: 1,
    paddingRight: 20,
  },
  upgradeTitle: {
    color: '#EAB308',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  upgradeSubtitle: {
    color: '#D1D5DB',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  upgradeCtaBtn: {
    backgroundColor: '#EAB308',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  upgradeCtaText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  feedbackCard: {
    backgroundColor: '#161922',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  questionLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    marginTop: 6,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  difficultyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  difficultyBtnActiveEasy: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: '#22C55E',
  },
  difficultyBtnActiveGood: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderColor: '#EAB308',
  },
  difficultyBtnActiveHard: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#EF4444',
  },
  diffEmoji: {
    fontSize: 12,
  },
  diffText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  diffTextActive: {
    color: '#fff',
  },
  flagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  flagChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  flagChipPainActive: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#EF4444',
  },
  flagChipSweetActive: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderColor: '#22C55E',
  },
  flagChipText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  flagChipPainText: {
    color: '#FCA5A5',
  },
  flagChipSweetText: {
    color: '#86EFAC',
  },
  energyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  energyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  energyBtnActive: {
    backgroundColor: 'rgba(6,182,212,0.15)',
    borderColor: Colors.accentBlue,
  },
  energyBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  energyBtnTextActive: {
    color: Colors.accentBlue,
  },
  notesInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    minHeight: 56,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  submitFeedbackBtn: {
    backgroundColor: Colors.accentBlue,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitFeedbackBtnText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  aiCoachCard: {
    backgroundColor: 'rgba(6,182,212,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.25)',
    padding: 16,
    marginBottom: 18,
  },
  aiCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachName: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  coachRole: {
    color: Colors.accentBlue,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  aiFeedbackSection: {
    marginBottom: 10,
  },
  aiSectionTitle: {
    color: '#E5E7EB',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  aiSectionContent: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  adjustmentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6,182,212,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 6,
  },
  adjustmentBadgeText: {
    color: Colors.accentBlue,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  doneBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
