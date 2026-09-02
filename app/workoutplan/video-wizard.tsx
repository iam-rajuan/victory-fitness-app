import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { InternationalPhoneField } from '../../components/InternationalPhoneField';
import VictoryHeader from '../../components/VictoryHeader';
import { createVideoWorkoutPlan } from '../../lib/workout-plans';
import { useModuleAccessGuard } from '../../lib/useModuleAccessGuard';
import { useLanguage } from '../../lib/i18n';

const TOTAL_STEPS = 8;

const GOALS = [
  { id: '1', emoji: '💪', label: 'Build Muscle' },
  { id: '2', emoji: '🔥', label: 'Burn Fat' },
  { id: '3', emoji: '🏃', label: 'Improve Endurance' },
  { id: '4', emoji: '🧘', label: 'Flexibility & Mobility' },
];

const LEVELS = [
  { id: '1', label: 'Beginner', sub: 'Little to no experience' },
  { id: '2', label: 'Intermediate', sub: 'Regular training for 6+ months' },
  { id: '3', label: 'Professional', sub: 'Years of training experience' },
];

const DAYS_PER_WEEK = [
  { id: '1', emoji: '🔥', label: '2-3 Days' },
  { id: '2', emoji: '🔥', label: '3-4 Days' },
  { id: '3', emoji: '🔥', label: '4-5 Days' },
  { id: '4', emoji: '🔥', label: '5+ Days' },
];

const DURATIONS = [
  { id: '1', emoji: '⚡', label: '4 Weeks (Sprint)' },
  { id: '2', emoji: '📈', label: '8 Weeks (Progress)' },
  { id: '3', emoji: '🏆', label: '12 Weeks (Transformation)' },
];

const TIME_PER_SESSION = [
  { id: '1', emoji: '⏱️', label: 'Short & Sharp (15-25 Min)' },
  { id: '2', emoji: '⏳', label: 'Standard (25-45 Min)' },
  { id: '3', emoji: '⏰', label: 'Intensive (45+ Min)' },
];

const EQUIPMENT = [
  { id: '1', emoji: '🏋️', label: 'Full Gym', sub: 'Barbells, dumbbells, machines' },
  { id: '2', emoji: '🎒', label: 'Home Gym', sub: 'Dumbbells or kettlebells' },
  { id: '3', emoji: '🧘', label: 'No Equipment', sub: 'Bodyweight only' },
];

export default function WorkoutVideoWizard() {
  const checkingAccess = useModuleAccessGuard('/workoutplan');
  const router = useRouter();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  if (checkingAccess) {
    return null;
  }

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else if (step === TOTAL_STEPS) {
      generatePlan();
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const generatePlan = async () => {
    setLoading(true);
    try {
      await createVideoWorkoutPlan({
        goal: formData.goal,
        level: formData.level,
        days: formData.days,
        duration: formData.duration,
        time: formData.time,
        notes: formData.notes,
        phone: formData.phone,
        equipment: formData.equipment,
      });
      setLoading(false);
      router.replace('/workoutplan/video-plan');
    } catch {
      setLoading(false);
    }
  };

  const updateData = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const progress = (step / TOTAL_STEPS) * 100;
  const isCompactWidth = width < 380;
  const contentPadding = isCompactWidth ? 16 : 24;
  const footerShouldStack = width < 360;

  const renderStep = () => {
    if (loading) {
      return (
        <View style={[styles.content, styles.loadingContent]}>
          <ActivityIndicator size="large" color={Colors.accentBlue} />
          <Text style={styles.loadingText}>{t('Creating your personalized video plan...')}</Text>
        </View>
      );
    }

    switch (step) {
      case 1:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('What is your main goal?')}</Text>
            <Text style={styles.subtitle}>{t('Choose the goal that fits you best.')}</Text>
            <View style={styles.optionList}>
              {GOALS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionCard, formData.goal === item.id && styles.optionCardActive]}
                  onPress={() => updateData('goal', item.id)}
                >
                  <Text style={styles.optionEmoji}>{item.emoji}</Text>
                  <Text style={[styles.optionLabel, formData.goal === item.id && styles.optionLabelActive]}>{t(item.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('What is your current fitness level?')}</Text>
            <Text style={styles.subtitle}>{t('Be honest with yourself.')}</Text>
            <View style={styles.optionList}>
              {LEVELS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionCard, formData.level === item.id && styles.optionCardActive]}
                  onPress={() => updateData('level', item.id)}
                >
                  <View>
                    <Text style={[styles.optionLabel, formData.level === item.id && styles.optionLabelActive]}>{t(item.label)}</Text>
                    <Text style={styles.optionSub}>{t(item.sub)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('How many days per week do you want to train?')}</Text>
            <Text style={styles.subtitle}>{t('Consistency is the key to success.')}</Text>
            <View style={styles.optionList}>
              {DAYS_PER_WEEK.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionCard, formData.days === item.id && styles.optionCardActive]}
                  onPress={() => updateData('days', item.id)}
                >
                  <View style={styles.iconContainer}>
                    <Text style={styles.optionEmoji}>{item.emoji}</Text>
                  </View>
                  <Text style={[styles.optionLabel, formData.days === item.id && styles.optionLabelActive]}>{t(item.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('How long should your plan last?')}</Text>
            <Text style={styles.subtitle}>{t('Choose your focus period.')}</Text>
            <View style={styles.optionList}>
              {DURATIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionCard, formData.duration === item.id && styles.optionCardActive]}
                  onPress={() => updateData('duration', item.id)}
                >
                  <Text style={styles.optionEmoji}>{item.emoji}</Text>
                  <Text style={[styles.optionLabel, formData.duration === item.id && styles.optionLabelActive]}>{t(item.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('How much time do you have per session?')}</Text>
            <Text style={styles.subtitle}>{t('Every workout counts, no matter how long.')}</Text>
            <View style={styles.optionList}>
              {TIME_PER_SESSION.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionCard, formData.time === item.id && styles.optionCardActive]}
                  onPress={() => updateData('time', item.id)}
                >
                  <Text style={styles.optionEmoji}>{item.emoji}</Text>
                  <Text style={[styles.optionLabel, formData.time === item.id && styles.optionLabelActive]}>{t(item.label)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 6:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('Is there anything we should know?')}</Text>
            <Text style={styles.subtitle}>{t('Do you have any injuries or limitations we should consider?')}</Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('e.g. Knee problems, shoulder strain...')}
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              numberOfLines={6}
              value={formData.notes || ''}
              onChangeText={(text) => updateData('notes', text)}
            />
          </View>
        );
      case 7:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('Accountability Text Reminder')}</Text>
            <Text style={styles.subtitle}>
              {t('Provide your phone number to receive motivational messages (Gold Tier & higher).')}
            </Text>
            <InternationalPhoneField
              value={formData.phone || ''}
              onChangeText={(text) => updateData('phone', text)}
              placeholder="24 123 4567"
              helperText={t('Choose your country code first, then enter the rest of your phone number.')}
              defaultCountryCode="+233"
            />
            <Text style={styles.disclaimer}>
              {t('Your number will only be used for accountability reminders.')}
            </Text>
          </View>
        );
      case 8:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>{t('Which equipment do you have?')}</Text>
            <Text style={styles.subtitle}>{t("We'll tailor your plan to the tools you have available.")}</Text>
            <View style={styles.optionList}>
              {EQUIPMENT.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionCard, formData.equipment === item.id && styles.optionCardActive]}
                  onPress={() => updateData('equipment', item.id)}
                >
                  <Text style={styles.optionEmoji}>{item.emoji}</Text>
                  <View>
                  <Text style={[styles.optionLabel, formData.equipment === item.id && styles.optionLabelActive]}>{t(item.label)}</Text>
                    <Text style={styles.optionSub}>{t(item.sub)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <VictoryHeader />
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Step Header */}
        <View style={[styles.header, { paddingHorizontal: contentPadding, paddingBottom: isCompactWidth ? 16 : 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {!loading && (
            <>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.stepIndicator}>{step}/{TOTAL_STEPS}</Text>
            </>
          )}
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPadding, paddingBottom: footerShouldStack ? 132 : 120 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Navigation Footer */}
        {step <= TOTAL_STEPS && !loading && (
          <View style={[styles.footer, footerShouldStack && styles.footerStack, { paddingHorizontal: isCompactWidth ? 20 : 40 }]}>
            <TouchableOpacity onPress={prevStep} disabled={step === 1}>
              <Text style={[styles.navBtnText, step === 1 && { opacity: 0.2 }]}>{t('Back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextStep}>
              <Text style={styles.navBtnText}>
                {step === TOTAL_STEPS ? t('Generate Plan') : t('Next')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    gap: 15,
  },
  closeBtn: {
    width: 32,
  },
  progressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accentBlue,
    borderRadius: 4,
  },
  stepIndicator: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    width: 32,
  },
  scrollContent: {
    paddingBottom: 120, 
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C252E',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 16,
  },
  optionCardActive: {
    borderColor: Colors.accentBlue,
    backgroundColor: '#121921',
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  optionLabelActive: {
    color: '#fff',
  },
  optionSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    backgroundColor: '#1C252E',
    borderRadius: 12,
    padding: 20,
    color: '#fff',
    fontSize: 16,
    minHeight: 180,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none',
  } as any,
  disclaimer: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  footerStack: {
    gap: 16,
    alignItems: 'stretch',
  },
  navBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  loadingContent: {
    marginTop: 100,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    marginTop: 24,
    fontFamily: 'Inter_400Regular',
  },
});

