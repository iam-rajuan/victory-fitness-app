import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
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
import {
  createCompletionCardRecord,
  fetchCurrentUser,
  recordAnalyticsEvent,
  updateCompletionCardUpsellState,
} from '../../lib/api';

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

function getImmediateCoachFeedback(
  difficulty: 'too_easy' | 'just_right' | 'too_hard',
  energy: 'low' | 'medium' | 'high',
  painFlag: boolean,
  sweetSpotFlag: boolean,
  t: (key: string) => string
) {
  const isHard = difficulty === 'too_hard' || energy === 'low';
  const isEasy = difficulty === 'too_easy' && energy === 'high';

  let adj_pct = 0;
  let direction = 'maintain';
  let summary = t('Keep the next workout steady and reinforce consistency before changing load again.');
  let what_went_well = t('Hit the optimal hypertrophy and strength stimulus zone without inducing excessive CNS fatigue.');
  let cautions = t('Keep hydration, electrolytes, and daily protein targets (1.6g/kg) consistent for optimal muscle repair.');
  let next_steps = t('Maintain baseline intensity and consolidate motor patterns on the upcoming session.');

  if (isHard) {
    adj_pct = -10;
    direction = 'decrease';
    summary = t('Reduce the next workout slightly so recovery stays ahead of fatigue.');
    what_went_well = t('Commendable effort and perseverance completing a demanding session under high load.');
    cautions = t('Elevated systemic strain detected. Prioritize 8+ hours of sleep, recovery nutrition, and light mobility.');
    next_steps = t('We will dial back volume by 10% on the next session to prevent cumulative overtraining.');
  } else if (isEasy) {
    adj_pct = 5;
    direction = 'increase';
    summary = t('You handled this session well, so the next workout can progress slightly.');
    what_went_well = t('Excellent execution, high motor unit recruitment, and clean mechanical control throughout sets.');
    cautions = t('Ensure strict tempo control on the eccentric phase before adding external load.');
    next_steps = t('Slightly advancing progressive overload by +5% on primary compound lifts next workout.');
  }

  if (painFlag) {
    cautions = t('⚠️ Pain / discomfort noted: Deload affected joint angles, substitute with pain-free movement variations, and consult coach if discomfort persists.');
  }
  if (sweetSpotFlag) {
    what_went_well = t('🎯 Sweet spot achieved! Perfect muscular stimulation with optimal tension-to-fatigue ratio.');
  }

  return {
    adjustment_pct: adj_pct,
    next_volume_direction: direction,
    summary,
    what_went_well,
    cautions,
    next_steps,
  };
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
  const [aiCoachFeedback, setAiCoachFeedback] = useState<StrengthFeedbackResponse | null>(null);

  const activeFeedback = aiCoachFeedback || getImmediateCoachFeedback(difficulty, energy, painFlag, sweetSpotFlag, t);

  const [upgradeOffer, setUpgradeOffer] = useState<{ title: string; message: string } | null>(null);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [userIdentityStatement, setUserIdentityStatement] = useState<string | null>(null);
  const [completionCardRecordId, setCompletionCardRecordId] = useState<string | null>(null);

  // Check Section 17.1 upgrade offer eligibility & Section 20.3 Identity statement
  useEffect(() => {
    if (!visible) return;
    setUpgradeOffer(null);
    setUpgradeDismissed(false);
    setCompletionCardRecordId(null);

    void fetchCurrentUser()
      .then((user) => {
        if (user?.identity_statement && user.identity_statement.trim()) {
          setUserIdentityStatement(user.identity_statement.trim());
        } else {
          setUserIdentityStatement(null);
        }
      })
      .catch(() => undefined);

    const checkUpgradeEligibility = async () => {
      // 1. Never on first-ever workout
      if (totalCompletedWorkouts <= 1) {
        setUpgradeOffer(null);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        const tier = String(user?.subscription_tier || '').toUpperCase();
        // Section 17.1 Trigger: Silver or Gold users not yet at next tier
        if (tier !== 'SILVER' && tier !== 'GOLD') {
          setUpgradeOffer(null);
          return;
        }

        const cardRecord = await createCompletionCardRecord({
          workout_id: `${planId || 'strength'}:${dayLabel || 'workout'}`,
          shared_to_whatsapp: false,
          image_url: '',
          upsell_shown: false,
          upsell_clicked: false,
        });
        if (cardRecord.id) {
          setCompletionCardRecordId(cardRecord.id);
        }
        if (!cardRecord.upsell?.eligible) {
          setUpgradeOffer(null);
          return;
        }

        // Prompt content: 'You just finished workout #{streak_count}. Unlock unlimited AI coaching to keep this going.'
        const streakCount = Math.max(Number(user?.workouts_completed || user?.streak_days || totalCompletedWorkouts || 1), 1);
        const title = cardRecord.upsell.title || t('Keep this streak moving');
        const message = cardRecord.upsell.message || `${t('You just finished workout #')}${streakCount}. ${t('Unlock unlimited AI coaching to keep this going.')}`;

        setUpgradeOffer({ title, message });
        if (cardRecord.id) {
          void updateCompletionCardUpsellState(cardRecord.id, { upsell_shown: true }).catch(() => undefined);
        }
        await AsyncStorage.setItem(UPGRADE_LAST_SHOWN_KEY, String(Date.now()));

        // Section 17.1: Reuses upgrade_screen_viewed analytics event with source: 'completion_card'
        void recordAnalyticsEvent('upgrade_screen_viewed', {
          source: 'completion_card',
          day: dayLabel,
          streak_count: streakCount,
          tier,
        }).catch(() => undefined);
      } catch {
        setUpgradeOffer(null);
      }
    };

    void checkUpgradeEligibility();
  }, [visible, totalCompletedWorkouts, dayLabel, planId, t]);

  const handleUpgradeClick = () => {
    if (completionCardRecordId) {
      void updateCompletionCardUpsellState(completionCardRecordId, { upsell_clicked: true }).catch(() => undefined);
    }
    // Section 17.1: Reuses upgrade_prompt_clicked analytics event with source: 'completion_card'
    void recordAnalyticsEvent('upgrade_prompt_clicked', {
      source: 'completion_card',
      day: dayLabel,
    }).catch(() => undefined);

    onClose();
    router.push('/plan');
  };

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
    const mins = Math.max(Math.round((durationSeconds || 1800) / 60), 1);
    const estimatedCals = Math.round(mins * 7.5);
    const streak = Math.max(totalCompletedWorkouts || 1, 1);
    const cardImg = completionCard?.fileUri || (completionCard?.imageBase64 ? `data:image/png;base64,${completionCard.imageBase64}` : '');
    router.push({
      pathname: '/(tabs)/challenge',
      params: {
        tab: 'COMMUNITY',
        prefillSource: 'workout_completion',
        prefillWorkoutName: dayLabel || t('Strength Workout'),
        prefillDurationMinutes: String(mins),
        prefillCalories: String(estimatedCals),
        prefillStreakCount: String(streak),
        prefillImageUri: cardImg,
        prefillImageFileName: completionCard?.fileName || 'workout-completion.png',
        prefillImageMimeType: 'image/png',
        prefillStatus: `🔥 Completed ${dayLabel || t('Strength Workout')}!\n⏱️ Duration: ${mins} mins | ⚡ Burned: ~${estimatedCals} kcal | 🏆 Streak: ${streak} days\n${completionCard?.shareMessage || ''}\n#WorkoutCompleted #VictoryFitness`,
      },
    } as any);
  };

  useEffect(() => {
    if (!visible || !planId) return;
    const timer = setTimeout(() => {
      void submitStrengthWorkoutFeedback(planId, {
        day: dayLabel,
        perceived_difficulty: difficulty,
        energy,
        soreness: painFlag ? 'high' : 'medium',
        pain_flag: painFlag,
        sweet_spot_flag: sweetSpotFlag,
      })
        .then((res) => {
          setAiCoachFeedback(res);
        })
        .catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [visible, planId, dayLabel, difficulty, energy, painFlag, sweetSpotFlag]);

  const handleDone = () => {
    if (planId) {
      void submitStrengthWorkoutFeedback(planId, {
        day: dayLabel,
        perceived_difficulty: difficulty,
        energy,
        soreness: painFlag ? 'high' : 'medium',
        pain_flag: painFlag,
        sweet_spot_flag: sweetSpotFlag,
      }).catch(() => undefined);
      void recordAnalyticsEvent('post_workout_feedback_submitted', {
        difficulty,
        painFlag,
        sweetSpotFlag,
      }).catch(() => undefined);
    }
    onClose();
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
            {upgradeOffer && !upgradeDismissed ? (
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
                    <Text style={styles.upgradeTitle}>{upgradeOffer.title}</Text>
                    <Text style={styles.upgradeSubtitle}>{upgradeOffer.message}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.upgradeCtaBtn}
                  onPress={handleUpgradeClick}
                >
                  <Text style={styles.upgradeCtaText}>{t('Unlock Unlimited AI Coaching')}</Text>
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
            </View>

            {/* AI Coach Victor Response based on difficulty rating */}
            <View style={styles.aiCoachCard}>
              <View style={styles.aiCoachHeader}>
                <View style={styles.coachAvatar}>
                  <Ionicons name="shield-checkmark" size={18} color="#000" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.coachName}>{t('Coach Victor AI')}</Text>
                    <View style={styles.aiActiveBadge}>
                      <Text style={styles.aiActiveBadgeText}>{t('POST-WORKOUT FEEDBACK')}</Text>
                    </View>
                  </View>
                  <Text style={styles.coachRole}>{t('Real-time coaching response to difficulty rating')}</Text>
                </View>
              </View>

              {activeFeedback.what_went_well ? (
                <View style={styles.aiFeedbackSection}>
                  <Text style={styles.aiSectionTitle}>💪 {t('What Went Well')}</Text>
                  <Text style={styles.aiSectionContent}>{activeFeedback.what_went_well}</Text>
                </View>
              ) : null}

              {activeFeedback.cautions ? (
                <View style={styles.aiFeedbackSection}>
                  <Text style={styles.aiSectionTitle}>⚠️ {t('Cautions & Recovery')}</Text>
                  <Text style={styles.aiSectionContent}>{activeFeedback.cautions}</Text>
                </View>
              ) : null}

              {activeFeedback.next_steps ? (
                <View style={styles.aiFeedbackSection}>
                  <Text style={styles.aiSectionTitle}>🎯 {t('Next Steps')}</Text>
                  <Text style={styles.aiSectionContent}>{activeFeedback.next_steps}</Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.adjustmentBadge,
                  activeFeedback.adjustment_pct > 0 && styles.adjustmentBadgeOverload,
                  activeFeedback.adjustment_pct < 0 && styles.adjustmentBadgeDeload,
                ]}
              >
                <Ionicons
                  name={activeFeedback.adjustment_pct > 0 ? 'trending-up' : activeFeedback.adjustment_pct < 0 ? 'trending-down' : 'checkmark-circle'}
                  size={14}
                  color={activeFeedback.adjustment_pct > 0 ? '#10B981' : activeFeedback.adjustment_pct < 0 ? '#F59E0B' : '#00D9F5'}
                />
                <Text
                  style={[
                    styles.adjustmentBadgeText,
                    activeFeedback.adjustment_pct > 0 && { color: '#10B981' },
                    activeFeedback.adjustment_pct < 0 && { color: '#F59E0B' },
                  ]}
                >
                  {activeFeedback.adjustment_pct > 0
                    ? `+${activeFeedback.adjustment_pct}% Progressive Overload Applied`
                    : activeFeedback.adjustment_pct < 0
                      ? `${activeFeedback.adjustment_pct}% Recovery Volume Adjusted`
                      : t('Optimal Stimulus Maintained')}
                </Text>
              </View>
            </View>

            {/* Section 20.3: Single quiet line below AI performance feedback */}
            {userIdentityStatement ? (
              <View style={styles.identityStatementQuietWrap}>
                <Text style={styles.identityStatementQuietText}>
                  &ldquo;{userIdentityStatement}&rdquo;
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
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
  aiActiveBadge: {
    backgroundColor: 'rgba(6,182,212,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.3)',
  },
  aiActiveBadgeText: {
    color: '#00D9F5',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  coachRole: {
    color: Colors.accentBlue,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 6,
  },
  adjustmentBadgeOverload: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  adjustmentBadgeDeload: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
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
  identityStatementQuietWrap: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  identityStatementQuietText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.48)',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});
