import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import VictoryHeader from '../../components/VictoryHeader';
import GreetingCard from '../../components/home/GreetingCard';
import FeatureCards from '../../components/home/FeatureCards';
import MoodSection from '../../components/home/MoodSection';
import WorkoutSection from '../../components/home/WorkoutSection';
import ChallengesSection from '../../components/home/ChallengesSection';
import AccountabilitySection from '../../components/home/AccountabilitySection';
import InviteFriendsCard from '../../components/home/InviteFriendsCard';
import ProteinRingCard from '../../components/home/ProteinRingCard';
import StreakCard from '../../components/home/StreakCard';
import CoachQuickPromptBar from '../../components/home/CoachQuickPromptBar';
import { WaterTrackerCard } from '../../components/home/WaterTrackerCard';
import { WeeklyActivityChart } from '../../components/home/WeeklyActivityChart';
import SocialContagionWidget from '../../components/home/SocialContagionWidget';
import AccessRestrictionModal from '../../components/AccessRestrictionModal';
import {
  confirmCurrentUserWeight,
  fetchCurrentUser,
  fetchCurrentUserBodyMetrics,
  updateCurrentUserBodyMetrics,
} from '../../lib/api';
import { canAccessFeature, canAccessPlanRoute } from '../../lib/access';
import { useRouter } from 'expo-router';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';
import { useLanguage } from '../../lib/i18n';
import { replaceRoute } from '../../lib/navigation';
import { markWeightPromptHandled, shouldShowWeightUpdatePrompt, updateUserWeight } from '../../lib/onboarding';

export default function HomeScreen() {
  const checkingAccess = useModuleAccessGuard('/');
  const router = useRouter();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshToken, setRefreshToken] = React.useState(0);
  const [canAccessNutrition, setCanAccessNutrition] = React.useState(false);
  const [canAccessChallenges, setCanAccessChallenges] = React.useState(false);
  const [canAccessCoachVictor, setCanAccessCoachVictor] = React.useState(false);
  const [canAccessWorkoutPlans, setCanAccessWorkoutPlans] = React.useState(false);
  const [restrictedSection, setRestrictedSection] = React.useState('');
  const [weightPromptVisible, setWeightPromptVisible] = React.useState(false);
  const [weightPromptEditing, setWeightPromptEditing] = React.useState(false);
  const [weightPromptSaving, setWeightPromptSaving] = React.useState(false);
  const [weightDraft, setWeightDraft] = React.useState('');
  const [weightPromptUserId, setWeightPromptUserId] = React.useState('');
  const [currentWeight, setCurrentWeight] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    const loadAccess = async () => {
      try {
        const [user, metrics] = await Promise.all([
          fetchCurrentUser(),
          fetchCurrentUserBodyMetrics().catch(() => null),
        ]);
        if (!cancelled) {
          setCanAccessNutrition(canAccessPlanRoute('/mealPlan', user));
          setCanAccessChallenges(canAccessFeature('challenge', user));
          setCanAccessCoachVictor(canAccessFeature('coach_victor', user));
          setCanAccessWorkoutPlans(canAccessFeature('workoutplan', user));

          const existingWeight = metrics?.weight || '';
          if (existingWeight) {
            setCurrentWeight(existingWeight);
          }

          const shouldPrompt =
            metrics && typeof metrics.should_prompt_weight_update === 'boolean'
              ? metrics.should_prompt_weight_update
              : Boolean(user.onboarding_completed) && (await shouldShowWeightUpdatePrompt(user.id));

          if (!cancelled && shouldPrompt) {
            setWeightPromptUserId(user.id);
            setWeightDraft(existingWeight);
            setWeightPromptEditing(false);
            setWeightPromptVisible(true);
          }
        }
      } catch {
        if (!cancelled) {
          setCanAccessNutrition(false);
          setCanAccessChallenges(false);
          setCanAccessCoachVictor(false);
          setCanAccessWorkoutPlans(false);
        }
      }
    };
    void loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setRefreshToken((current) => current + 1);
    setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, []);

  const openRestrictedSection = React.useCallback((sectionName: string) => {
    setRestrictedSection(sectionName);
  }, []);

  const handleConfirmCurrentWeight = React.useCallback(async () => {
    if (!weightPromptUserId || weightPromptSaving) return;
    setWeightPromptSaving(true);
    try {
      await Promise.allSettled([
        confirmCurrentUserWeight(0),
        markWeightPromptHandled(weightPromptUserId, 0),
      ]);
      setWeightPromptVisible(false);
    } finally {
      setWeightPromptSaving(false);
    }
  }, [weightPromptSaving, weightPromptUserId]);

  const handleSnoozeWeightPrompt = React.useCallback(async () => {
    if (!weightPromptUserId || weightPromptSaving) return;
    setWeightPromptSaving(true);
    try {
      await Promise.allSettled([
        confirmCurrentUserWeight(7),
        markWeightPromptHandled(weightPromptUserId, 7),
      ]);
      setWeightPromptVisible(false);
    } finally {
      setWeightPromptSaving(false);
    }
  }, [weightPromptSaving, weightPromptUserId]);

  const handleSaveWeightPrompt = React.useCallback(async () => {
    if (!weightPromptUserId || !weightDraft.trim() || weightPromptSaving) {
      return;
    }
    setWeightPromptSaving(true);
    try {
      await Promise.allSettled([
        updateUserWeight(weightPromptUserId, weightDraft),
        updateCurrentUserBodyMetrics({ weight: weightDraft.trim() }),
        markWeightPromptHandled(weightPromptUserId, 0),
      ]);
      setCurrentWeight(weightDraft.trim());
      setWeightPromptVisible(false);
      setWeightPromptEditing(false);
      setWeightDraft('');
    } finally {
      setWeightPromptSaving(false);
    }
  }, [weightDraft, weightPromptSaving, weightPromptUserId]);

  if (checkingAccess) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <VictoryHeader showGreeting={true} />
        <GreetingCard />

        <ProteinRingCard />
        <StreakCard />
        <CoachQuickPromptBar />

        {weightPromptVisible ? (
          <View style={styles.weightReminderCard}>
            <View style={styles.weightReminderHeader}>
              <Text style={styles.weightReminderEyebrow}>⚖️ {t('PERIODIC CHECK-IN')}</Text>
              <TouchableOpacity
                onPress={() => void handleSnoozeWeightPrompt()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.weightReminderCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.weightReminderTitle}>
              {currentWeight
                ? `${t('Is your weight still')} ${currentWeight} kg?`
                : t('Confirm your current weight')}
            </Text>
            <Text style={styles.weightReminderText}>
              {t('Confirm or update your weight to keep your training and nutrition accurate.')}
            </Text>

            {weightPromptEditing ? (
              <View style={styles.weightEditContainer}>
                <TextInput
                  value={weightDraft}
                  onChangeText={setWeightDraft}
                  placeholder={t('Enter current weight')}
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="numeric"
                  style={styles.weightInput}
                  autoFocus
                />
                <View style={styles.weightEditActions}>
                  <TouchableOpacity
                    style={styles.weightSaveBtn}
                    onPress={() => void handleSaveWeightPrompt()}
                    disabled={weightPromptSaving}
                  >
                    <Text style={styles.weightSaveBtnText}>{t('Save Weight')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.weightCancelBtn}
                    onPress={() => setWeightPromptEditing(false)}
                  >
                    <Text style={styles.weightCancelBtnText}>{t('Cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.weightActionRow}>
                {currentWeight ? (
                  <TouchableOpacity
                    style={styles.weightConfirmBtn}
                    onPress={() => void handleConfirmCurrentWeight()}
                    disabled={weightPromptSaving}
                  >
                    <Text style={styles.weightConfirmBtnText}>
                      {`${t('Keep')} ${currentWeight} kg`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.weightUpdateBtn}
                  onPress={() => setWeightPromptEditing(true)}
                >
                  <Text style={styles.weightUpdateBtnText}>{t('Update Weight')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.weightSnoozeBtn}
                  onPress={() => void handleSnoozeWeightPrompt()}
                  disabled={weightPromptSaving}
                >
                  <Text style={styles.weightSnoozeBtnText}>{t('Remind in 7 days')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        <FeatureCards
          canAccessCoachVictor={canAccessCoachVictor}
          canAccessNutrition={canAccessNutrition}
          onRestrictedPress={openRestrictedSection}
        />
        <MoodSection />
        <WorkoutSection canAccessWorkoutPlans={canAccessWorkoutPlans} onRestrictedPress={openRestrictedSection} />
        <WeeklyActivityChart />
        <WaterTrackerCard />
        {canAccessChallenges ? (
          <ChallengesSection refreshToken={refreshToken} />
        ) : (
          <View style={styles.lockedSectionCard}>
            <Text style={styles.lockedSectionEyebrow}>{t('CHALLENGES')}</Text>
            <Text style={styles.lockedSectionTitle}>{t('This section needs a higher plan.')}</Text>
            <Text style={styles.lockedSectionText}>
              {t('Update your plan to unlock challenge access and community participation.')}
            </Text>
            <TouchableOpacity style={styles.lockedSectionBtn} onPress={() => openRestrictedSection(t('CHALLENGES'))}>
              <Text style={styles.lockedSectionBtnText}>{t('CHECK ACCESS')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* <AccountabilitySection /> */}
        <SocialContagionWidget />
        <InviteFriendsCard />
        <View style={{ height: 80 }} />
      </ScrollView>

      <AccessRestrictionModal
        visible={Boolean(restrictedSection)}
        sectionName={restrictedSection}
        onClose={() => setRestrictedSection('')}
        onUpdatePlan={() => {
          setRestrictedSection('');
          router.push('/plan');
        }}
        onBackHome={() => {
          setRestrictedSection('');
          replaceRoute(router, '/(tabs)');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  weightReminderCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    marginBottom: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  weightReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weightReminderEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: Fonts.heading,
  },
  weightReminderCloseBtn: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  weightReminderTitle: {
    color: Colors.ivory,
    fontSize: 17,
    fontFamily: Fonts.display,
    marginBottom: 6,
  },
  weightReminderText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.body,
    marginBottom: 14,
  },
  weightActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  weightConfirmBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  weightConfirmBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  weightUpdateBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  weightUpdateBtnText: {
    color: Colors.ivory,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  weightSnoozeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  weightSnoozeBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  weightEditContainer: {
    marginTop: 4,
  },
  weightInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    backgroundColor: Colors.surfaceCard,
    color: Colors.ivory,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
    marginBottom: 10,
    outlineStyle: 'none' as any,
  },
  weightEditActions: {
    flexDirection: 'row',
    gap: 10,
  },
  weightSaveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  weightSaveBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  weightCancelBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightCancelBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  lockedSectionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    marginBottom: 24,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  lockedSectionEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: Fonts.heading,
    marginBottom: 10,
  },
  lockedSectionTitle: {
    color: Colors.ivory,
    fontSize: 18,
    fontFamily: Fonts.display,
    marginBottom: 8,
  },
  lockedSectionText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.body,
    marginBottom: 16,
  },
  lockedSectionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lockedSectionBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 0.5,
  },
});
