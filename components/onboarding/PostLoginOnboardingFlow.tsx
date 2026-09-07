import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { AuthButton } from '../AuthButton';
import { AuthInput } from '../AuthInput';
import { AuthUser, fetchCurrentUser, fetchCurrentUserOnboarding, startGoldTrial, updateCurrentUserOnboarding, updateCurrentUserProfile } from '../../lib/api';
import {
  OnboardingAnamnese,
  OnboardingData,
  OnboardingLanguage,
  OnboardingSuggestion,
} from '../../lib/onboarding';
import { SUPPORTED_LANGUAGES, LanguageCode, useLanguage } from '../../lib/i18n';
import { detectCountryFromDeviceLocale, detectLanguageFromDeviceLocale } from '../../lib/localeCountry';
import { replaceRoute } from '../../lib/navigation';
import { getPostAuthRoute } from '../../lib/access';
const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((language) => ({
  value: language.code as OnboardingLanguage,
  label: language.label,
  nativeLabel: language.nativeLabel,
}));
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const PRIMARY_GOAL_OPTIONS = ['Lose weight', 'Build muscle', 'Improve endurance', 'General health and energy', 'Recovery and rehab'];
const ACTIVITY_LEVEL_OPTIONS = ['Sedentary', 'Lightly active', 'Moderately active', 'Very active'];
const HEALTH_CONCERN_OPTIONS = ['Knee', 'Back', 'Shoulder', 'Heart condition', 'None'];
const DAYS_OPTIONS = ['1-2 days', '3-4 days', '5+ days'];
const EQUIPMENT_OPTIONS = ['No equipment', 'Home gym', 'Full gym', 'Outdoors'];
const COMMITMENT_OPTIONS = [
  'I want to feel strong and confident again',
  'I want to improve my health for my future',
  'I want consistency, structure, and accountability',
];
const STEP_TITLES = ['Language', 'Country', 'Profile', 'Protein Target', 'Health', 'Motivation', 'Identity', 'Recommendation'];
const getHealthConcernLabel = (option: string) => (option === 'Back' ? 'Back concern' : option);
const POPULAR_COUNTRIES = [
  { name: 'United States', code: 'US' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Germany', code: 'DE' },
  { name: 'Canada', code: 'CA' },
  { name: 'Australia', code: 'AU' },
  { name: 'Italy', code: 'IT' },
];
const ALL_COUNTRIES = [
  { name: 'Afghanistan', code: 'AF' },
  { name: 'Albania', code: 'AL' },
  { name: 'Algeria', code: 'DZ' },
  { name: 'Andorra', code: 'AD' },
  { name: 'Angola', code: 'AO' },
  { name: 'Argentina', code: 'AR' },
  { name: 'Armenia', code: 'AM' },
  { name: 'Australia', code: 'AU' },
  { name: 'Austria', code: 'AT' },
  { name: 'Azerbaijan', code: 'AZ' },
  { name: 'Bahamas', code: 'BS' },
  { name: 'Bahrain', code: 'BH' },
  { name: 'Bangladesh', code: 'BD' },
  { name: 'Barbados', code: 'BB' },
  { name: 'Belgium', code: 'BE' },
  { name: 'Belize', code: 'BZ' },
  { name: 'Benin', code: 'BJ' },
  { name: 'Bhutan', code: 'BT' },
  { name: 'Bolivia', code: 'BO' },
  { name: 'Bosnia and Herzegovina', code: 'BA' },
  { name: 'Botswana', code: 'BW' },
  { name: 'Brazil', code: 'BR' },
  { name: 'Brunei', code: 'BN' },
  { name: 'Bulgaria', code: 'BG' },
  { name: 'Burkina Faso', code: 'BF' },
  { name: 'Burundi', code: 'BI' },
  { name: 'Cambodia', code: 'KH' },
  { name: 'Cameroon', code: 'CM' },
  { name: 'Canada', code: 'CA' },
  { name: 'Cape Verde', code: 'CV' },
  { name: 'Chile', code: 'CL' },
  { name: 'China', code: 'CN' },
  { name: 'Colombia', code: 'CO' },
  { name: 'Costa Rica', code: 'CR' },
  { name: 'Croatia', code: 'HR' },
  { name: 'Cuba', code: 'CU' },
  { name: 'Cyprus', code: 'CY' },
  { name: 'Czech Republic', code: 'CZ' },
  { name: 'Denmark', code: 'DK' },
  { name: 'Djibouti', code: 'DJ' },
  { name: 'Dominica', code: 'DM' },
  { name: 'Dominican Republic', code: 'DO' },
  { name: 'Ecuador', code: 'EC' },
  { name: 'Egypt', code: 'EG' },
  { name: 'El Salvador', code: 'SV' },
  { name: 'Estonia', code: 'EE' },
  { name: 'Ethiopia', code: 'ET' },
  { name: 'Fiji', code: 'FJ' },
  { name: 'Finland', code: 'FI' },
  { name: 'France', code: 'FR' },
  { name: 'Georgia', code: 'GE' },
  { name: 'Germany', code: 'DE' },
  { name: 'Ghana', code: 'GH' },
  { name: 'Greece', code: 'GR' },
  { name: 'Guatemala', code: 'GT' },
  { name: 'Honduras', code: 'HN' },
  { name: 'Hungary', code: 'HU' },
  { name: 'Iceland', code: 'IS' },
  { name: 'India', code: 'IN' },
  { name: 'Indonesia', code: 'ID' },
  { name: 'Iran', code: 'IR' },
  { name: 'Iraq', code: 'IQ' },
  { name: 'Ireland', code: 'IE' },
  { name: 'Israel', code: 'IL' },
  { name: 'Italy', code: 'IT' },
  { name: 'Jamaica', code: 'JM' },
  { name: 'Japan', code: 'JP' },
  { name: 'Jordan', code: 'JO' },
  { name: 'Kazakhstan', code: 'KZ' },
  { name: 'Kenya', code: 'KE' },
  { name: 'Kuwait', code: 'KW' },
  { name: 'Latvia', code: 'LV' },
  { name: 'Lebanon', code: 'LB' },
  { name: 'Libya', code: 'LY' },
  { name: 'Liechtenstein', code: 'LI' },
  { name: 'Lithuania', code: 'LT' },
  { name: 'Luxembourg', code: 'LU' },
  { name: 'Macedonia', code: 'MK' },
  { name: 'Madagascar', code: 'MG' },
  { name: 'Malaysia', code: 'MY' },
  { name: 'Maldives', code: 'MV' },
  { name: 'Malta', code: 'MT' },
  { name: 'Mexico', code: 'MX' },
  { name: 'Moldova', code: 'MD' },
  { name: 'Monaco', code: 'MC' },
  { name: 'Mongolia', code: 'MN' },
  { name: 'Montenegro', code: 'ME' },
  { name: 'Morocco', code: 'MA' },
  { name: 'Nepal', code: 'NP' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'New Zealand', code: 'NZ' },
  { name: 'Nicaragua', code: 'NI' },
  { name: 'Nigeria', code: 'NG' },
  { name: 'Norway', code: 'NO' },
  { name: 'Oman', code: 'OM' },
  { name: 'Pakistan', code: 'PK' },
  { name: 'Panama', code: 'PA' },
  { name: 'Paraguay', code: 'PY' },
  { name: 'Peru', code: 'PE' },
  { name: 'Philippines', code: 'PH' },
  { name: 'Poland', code: 'PL' },
  { name: 'Portugal', code: 'PT' },
  { name: 'Qatar', code: 'QA' },
  { name: 'Romania', code: 'RO' },
  { name: 'Russia', code: 'RU' },
  { name: 'Rwanda', code: 'RW' },
  { name: 'Saudi Arabia', code: 'SA' },
  { name: 'Senegal', code: 'SN' },
  { name: 'Serbia', code: 'RS' },
  { name: 'Singapore', code: 'SG' },
  { name: 'Slovakia', code: 'SK' },
  { name: 'Slovenia', code: 'SI' },
  { name: 'Somalia', code: 'SO' },
  { name: 'South Africa', code: 'ZA' },
  { name: 'South Korea', code: 'KR' },
  { name: 'Spain', code: 'ES' },
  { name: 'Sri Lanka', code: 'LK' },
  { name: 'Sudan', code: 'SD' },
  { name: 'Sweden', code: 'SE' },
  { name: 'Switzerland', code: 'CH' },
  { name: 'Syria', code: 'SY' },
  { name: 'Taiwan', code: 'TW' },
  { name: 'Tajikistan', code: 'TJ' },
  { name: 'Tanzania', code: 'TZ' },
  { name: 'Thailand', code: 'TH' },
  { name: 'Tunisia', code: 'TN' },
  { name: 'Turkey', code: 'TR' },
  { name: 'Uganda', code: 'UG' },
  { name: 'Ukraine', code: 'UA' },
  { name: 'United Arab Emirates', code: 'AE' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'United States', code: 'US' },
  { name: 'Uruguay', code: 'UY' },
  { name: 'Uzbekistan', code: 'UZ' },
  { name: 'Venezuela', code: 'VE' },
  { name: 'Vietnam', code: 'VN' },
  { name: 'Yemen', code: 'YE' },
  { name: 'Zambia', code: 'ZM' },
  { name: 'Zimbabwe', code: 'ZW' }
];
function isSupportedAppLanguage(value: OnboardingLanguage): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}
type Props = {
  user: AuthUser;
};
type ValidationErrors = Record<string, string>;
function getSuggestedTier(anamnese: OnboardingAnamnese): OnboardingSuggestion {
  return {
    tier: 'GOLD',
    title: 'Victory Gold Trial',
    reason: 'This is the best starting point for building consistency with nutrition and training support. If you are unsure, the 5-days paid trial with money back Guarantee (Gold Tier) lets you test the AI services first.',
  };
}
function convertWeightToKilograms(weight: string, unit: 'kg' | 'lb') {
  const numericWeight = Number.parseFloat(weight);
  if (!Number.isFinite(numericWeight)) {
    return weight.trim();
  }
  if (unit === 'lb') {
    return (numericWeight * 0.45359237).toFixed(1);
  }
  return numericWeight.toString();
}
function deriveCountryFromLocale() {
  const detected = detectCountryFromDeviceLocale();
  return detected ? ALL_COUNTRIES.find((country) => country.code === detected.country.code) ?? null : null;
}
export default function PostLoginOnboardingFlow({ user }: Props) {
  const router = useRouter();
  const { setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveError, setSaveError] = useState('');
  const [data, setData] = useState<OnboardingData | null>(null);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(user.country || '');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [stored, latestUser] = await Promise.all([
        fetchCurrentUserOnboarding().catch(() => null),
        fetchCurrentUser().catch(() => null),
      ]);
      if (!cancelled) {
        if (latestUser && latestUser.country) {
          setSelectedCountry(latestUser.country);
        }
        const nextData: OnboardingData = stored ? {
          userId: stored.userId,
          currentStep: stored.currentStep,
          language: stored.language,
          country: stored.country,
          countryCode: stored.countryCode,
          motivationStatement: stored.motivationStatement,
          identityStatement: stored.identityStatement,
          personalProfile: stored.personalProfile,
          anamnese: stored.anamnese,
          suggestion: stored.suggestion,
          updatedAt: stored.updatedAt,
        } : {
          userId: user.id,
          currentStep: 0,
          language: '',
          country: '',
          countryCode: null,
          motivationStatement: '',
          identityStatement: '',
          personalProfile: { age: '', gender: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg' },
          anamnese: {
            primaryGoal: '',
            activityLevel: '',
            healthConcerns: [],
            healthNotes: '',
            daysPerWeek: '',
            timePerSession: '',
            equipmentAccess: '',
          },
          suggestion: null,
          updatedAt: null,
        };
        if (nextData.country) {
          setSelectedCountry(nextData.country);
        }
        setData(nextData);
        setStep(Math.min(nextData.currentStep ?? 0, STEP_TITLES.length - 1));
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);
  useEffect(() => {
    if (data?.language) {
      return;
    }
    const detectedLanguage = detectLanguageFromDeviceLocale();
    if (!detectedLanguage) {
      return;
    }
    setData((current) => {
      if (!current || current.language) {
        return current;
      }
      return {
        ...current,
        language: detectedLanguage,
      };
    });
  }, [data?.language]);
  useEffect(() => {
    if (selectedCountry.trim() || data?.country?.trim()) {
      return;
    }
    const detectedCountry = deriveCountryFromLocale();
    if (!detectedCountry) {
      return;
    }
    setSelectedCountry(detectedCountry.name);
    setData((current) => {
      if (!current || current.country.trim()) {
        return current;
      }
      return {
        ...current,
        country: detectedCountry.name,
        countryCode: detectedCountry.code,
      };
    });
  }, [data?.country, selectedCountry]);
  const suggestion = useMemo(() => (data ? getSuggestedTier(data.anamnese) : null), [data]);

  const currentWeightKg = useMemo(() => {
    if (!data?.personalProfile?.weight) return 0;
    const raw = parseFloat(data.personalProfile.weight);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    if (data.personalProfile.weightUnit === 'lb') {
      return parseFloat((raw * 0.45359237).toFixed(1));
    }
    return parseFloat(raw.toFixed(1));
  }, [data?.personalProfile?.weight, data?.personalProfile?.weightUnit]);

  const onboardingProteinTarget = useMemo(() => {
    if (currentWeightKg <= 0) return 0;
    return Math.round(currentWeightKg * 1.6);
  }, [currentWeightKg]);
  const persistDraft = async (nextData: OnboardingData, nextStep = step) => {
    const draft: OnboardingData = { ...nextData, currentStep: nextStep };
    setData(draft);
    await updateCurrentUserOnboarding({
      currentStep: draft.currentStep,
      language: draft.language,
      country: draft.country,
      countryCode: draft.countryCode,
      motivationStatement: draft.motivationStatement,
      identityStatement: draft.identityStatement,
      personalProfile: draft.personalProfile,
      anamnese: draft.anamnese,
      suggestion: draft.suggestion,
      completed: false,
    });
  };
  const validateCurrentStep = () => {
    if (!data) {
      return false;
    }
    const nextErrors: ValidationErrors = {};
    if (step === 0) {
      if (!data.language) {
        nextErrors.language = 'Please select your preferred language.';
      }
    }
    if (step === 1) {
      if (!selectedCountry || !selectedCountry.trim()) {
        nextErrors.country = 'Please select your country.';
      }
    }
    if (step === 2) {
      const age = Number(data.personalProfile.age);
      const height = Number(data.personalProfile.height);
      const weight = Number(data.personalProfile.weight);
      if (!data.personalProfile.age.trim()) {
        nextErrors.age = 'Age is required.';
      } else if (!Number.isFinite(age) || age < 16 || age > 120) {
        nextErrors.age = 'Enter an age between 16 and 120.';
      }
      if (!data.personalProfile.gender.trim()) {
        nextErrors.gender = 'Gender is required.';
      }
      if (!data.personalProfile.height.trim()) {
        nextErrors.height = 'Height is required.';
      } else if (!Number.isFinite(height) || height < 80 || height > 250) {
        nextErrors.height = 'Enter a height between 80 and 250 cm.';
      }
      if (!data.personalProfile.weight.trim()) {
        nextErrors.weight = 'Weight is required.';
      } else if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
        nextErrors.weight = 'Enter a valid weight.';
      }
    }
    if (step === 4) {
      if (!data.anamnese.primaryGoal) {
        nextErrors.primaryGoal = 'Please choose your primary goal.';
      }
      if (!data.anamnese.activityLevel) {
        nextErrors.activityLevel = 'Please choose your activity level.';
      }
      if (data.anamnese.healthConcerns.length === 0) {
        nextErrors.healthConcerns = 'Please choose any injuries/conditions, or select None.';
      }
      if (!data.anamnese.daysPerWeek) {
        nextErrors.daysPerWeek = 'Please choose your weekly commitment.';
      }
      if (!data.anamnese.equipmentAccess) {
        nextErrors.equipmentAccess = 'Please choose your available environment.';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleNext = async () => {
    if (!data || saving) {
      return;
    }
    if (!validateCurrentStep()) {
      return;
    }
    setSaveError('');
    if (step === 0 && data.language && isSupportedAppLanguage(data.language)) {
      await setLanguage(data.language);
    }
    let workingData = data;
    if (step === 1) {
      setSaving(true);
      try {
        const countryObj = ALL_COUNTRIES.find(c => c.name === selectedCountry);
        const nextData: OnboardingData = {
          ...workingData,
          country: selectedCountry.trim(),
          countryCode: countryObj?.code ?? null,
        };
        await updateCurrentUserProfile({
          country: selectedCountry,
          ...(countryObj ? { country_code: countryObj.code } : {})
        });
        workingData = nextData;
        setData(nextData);
      } catch (err) {
        setSaveError('Unable to save your country selection. Please try again.');
        setSaving(false);
        return;
      }
    }
    if (step === STEP_TITLES.length - 1) {
      setSaving(true);
      try {
        const countryObj = ALL_COUNTRIES.find(c => c.name === selectedCountry);
        const finalData: OnboardingData = {
          ...workingData,
          country: selectedCountry.trim(),
          countryCode: countryObj?.code ?? null,
          suggestion,
          currentStep: STEP_TITLES.length - 1,
          updatedAt: new Date().toISOString(),
        };
        await updateCurrentUserOnboarding({
          currentStep: finalData.currentStep,
          language: finalData.language,
          country: selectedCountry.trim(),
          countryCode: countryObj?.code ?? null,
          motivationStatement: finalData.motivationStatement,
          identityStatement: finalData.identityStatement,
          personalProfile: {
            ...finalData.personalProfile,
            weight: convertWeightToKilograms(finalData.personalProfile.weight, finalData.personalProfile.weightUnit),
            weightUnit: 'kg',
          },
          anamnese: finalData.anamnese,
          suggestion: finalData.suggestion,
          completed: true,
        });
        const updatedUser = await updateCurrentUserProfile({
          country: selectedCountry,
          ...(countryObj ? { country_code: countryObj.code } : {}),
          motivation_statement: finalData.motivationStatement,
          identity_statement: finalData.identityStatement,
          onboarding_completed: true
        });
        replaceRoute(router, getPostAuthRoute(updatedUser));
      } catch {
        setSaveError('Unable to save your onboarding details. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }
    const nextStep = step + 1;
    const nextData: OnboardingData = {
      ...workingData,
      suggestion: nextStep >= STEP_TITLES.length - 1 ? suggestion : data.suggestion,
    };
    setSaving(true);
    try {
      await persistDraft(nextData, nextStep);
      setStep(nextStep);
      setErrors({});
    } catch {
      setSaveError('Unable to save your progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const handleBack = async () => {
    if (!data || step === 0 || saving) {
      return;
    }
    const nextStep = step - 1;
    setSaveError('');
    setSaving(true);
    try {
      await persistDraft(data, nextStep);
      setStep(nextStep);
      setErrors({});
    } catch {
      setSaveError('Unable to save your progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const updateData = async (updater: (current: OnboardingData) => OnboardingData) => {
    if (!data) {
      return;
    }
    const nextData = {
      ...updater(data),
      currentStep: step,
    };
    setData(nextData);
  };
  const completeAndStartGoldTrial = async () => {
    if (!data || saving) {
      return;
    }
    if (!validateCurrentStep()) {
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const countryObj = ALL_COUNTRIES.find(c => c.name === selectedCountry);
      const finalData: OnboardingData = {
        ...data,
        country: selectedCountry.trim(),
        countryCode: countryObj?.code ?? null,
        suggestion,
        currentStep: STEP_TITLES.length - 1,
        updatedAt: new Date().toISOString(),
      };
      await updateCurrentUserOnboarding({
        currentStep: finalData.currentStep,
        language: finalData.language,
        country: selectedCountry.trim(),
        countryCode: countryObj?.code ?? null,
        motivationStatement: finalData.motivationStatement,
        identityStatement: finalData.identityStatement,
        personalProfile: {
          ...finalData.personalProfile,
          weight: convertWeightToKilograms(finalData.personalProfile.weight, finalData.personalProfile.weightUnit),
          weightUnit: 'kg',
        },
        anamnese: finalData.anamnese,
        suggestion: finalData.suggestion,
        completed: true,
      });
      await updateCurrentUserProfile({
        country: selectedCountry,
        ...(countryObj ? { country_code: countryObj.code } : {}),
        motivation_statement: finalData.motivationStatement,
        identity_statement: finalData.identityStatement,
        onboarding_completed: true,
      });
      await startGoldTrial();
      const updatedUser = await fetchCurrentUser();
      replaceRoute(router, getPostAuthRoute(updatedUser));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('commercial 5-day gold trial is disabled')) {
        replaceRoute(router, '/plan');
        return;
      }
      setSaveError('Unable to start your Gold trial right now. Please try again or choose another plan.');
    } finally {
      setSaving(false);
    }
  };
  const handleLanguageSelect = async (language: OnboardingLanguage) => {
    void updateData((current) => ({ ...current, language }));
    if (!isSupportedAppLanguage(language)) {
      return;
    }
    try {
      await setLanguage(language);
      await updateCurrentUserProfile({ preferred_language: language });
    } catch {
      setSaveError('Unable to save language preference. Please try again.');
    }
  };
  const toggleHealthConcern = (value: string) => {
    if (!data) {
      return;
    }
    const current = data.anamnese.healthConcerns;
    let nextValues = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    if (value === 'None') {
      nextValues = current.includes('None') ? [] : ['None'];
    } else {
      nextValues = nextValues.filter((item) => item !== 'None');
    }
    void updateData((currentData) => ({
      ...currentData,
      anamnese: {
        ...currentData.anamnese,
        healthConcerns: nextValues,
      },
    }));
  };
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    const query = searchQuery.toLowerCase().trim();
    return ALL_COUNTRIES.filter((country) =>
      country.name.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [searchQuery]);
  if (loading || !data) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>VICTORY FITNESS</Text>
        <Text style={styles.title}>{t('Build your personalized start')}</Text>
        <Text style={styles.subtitle}>{t('Complete these steps once and we will keep your plan setup on this device.')}</Text>
        <View style={styles.progressRow}>
          {STEP_TITLES.map((label, index) => (
            <View key={label} style={styles.progressItem}>
              <View style={[styles.progressDot, index <= step && styles.progressDotActive]}>
                <Text style={[styles.progressDotText, index <= step && styles.progressDotTextActive]}>{index + 1}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.currentStepText}>
          {t('Step {step} of {total}', { step: step + 1, total: STEP_TITLES.length })}  •  {t(STEP_TITLES[step])}
        </Text>
        <View style={styles.card}>
          {step === 0 ? (
            <View>
              <Text style={styles.stepTitle}>{t('Preferred language')}</Text>
              <Text style={styles.stepText}>{t('Choose the language you want to use inside the app.')}</Text>
              <View style={styles.optionGrid}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => void handleLanguageSelect(option.value)}
                    style={[styles.optionCard, data.language === option.value && styles.optionCardActive]}
                  >
                    <Text style={[styles.optionLabel, data.language === option.value && styles.optionLabelActive]}>{option.nativeLabel}</Text>
                    <Text style={[styles.optionSubLabel, data.language === option.value && styles.optionLabelActive]}>{t(option.label)}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.language ? <Text style={styles.errorText}>{t(errors.language)}</Text> : null}
            </View>
          ) : null}
          {step === 1 ? (
            <View>
              <Text style={styles.stepTitle}>{t('Select your country')}</Text>
              <Text style={styles.stepText}>{t('Choose your country to help us customize recommendations and local activity.')}</Text>
              
              <AuthInput
                placeholder={t('Search country...')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                icon="search-outline"
                error={errors.country ? t(errors.country) : undefined}
              />
              <View style={{ marginTop: 6 }}>
                {searchQuery.trim().length > 0 ? (
                  <View>
                    <Text style={styles.sectionHeader}>{t('Search Results')}</Text>
                    {filteredCountries.length > 0 ? (
                      <View style={styles.optionGridSingle}>
                        {filteredCountries.map((c) => {
                          const isSelected = selectedCountry === c.name;
                          return (
                            <Pressable
                              key={c.code}
                              onPress={() => setSelectedCountry(c.name)}
                              style={[styles.optionCard, isSelected && styles.optionCardActive]}
                            >
                              <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{c.name}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.noResultsText}>{t('No countries match your search.')}</Text>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.sectionHeader}>{t('Popular countries')}</Text>
                    <View style={styles.optionGridSingle}>
                      {POPULAR_COUNTRIES.map((c) => {
                        const isSelected = selectedCountry === c.name;
                        return (
                          <Pressable
                            key={c.code}
                            onPress={() => setSelectedCountry(c.name)}
                            style={[
                              styles.optionCard,
                              isSelected && styles.optionCardActive
                            ]}
                          >
                            <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>{c.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : null}
          {step === 2 ? (
            <View>
              <Text style={styles.stepTitle}>{t('Personal profile')}</Text>
              <Text style={styles.stepText}>{t('These answers set your personalized targets and can be updated later from your profile.')}</Text>
              
              {/* Age - Numbers only, strings CANNOT be typed! */}
              <AuthInput
                placeholder={t('Age')}
                value={data.personalProfile.age}
                onChangeText={(value) => void updateData((current) => ({ ...current, personalProfile: { ...current.personalProfile, age: value } }))}
                allowedType="number"
                keyboardType="number-pad"
                icon="calendar-outline"
                error={errors.age}
              />
              <Text style={styles.fieldLabel}>{t('Gender')}</Text>
              <Pressable style={styles.dropdownField} onPress={() => setShowGenderModal(true)}>
                <Text style={[styles.dropdownFieldText, !data.personalProfile.gender && styles.dropdownFieldPlaceholder]}>
                  {data.personalProfile.gender ? t(data.personalProfile.gender) : t('Select gender')}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
              </Pressable>
              {errors.gender ? <Text style={styles.errorText}>{t(errors.gender)}</Text> : null}
              <Text style={styles.fieldLabel}>{t('Height')}</Text>
              {/* Height - Decimals only, strings CANNOT be typed! */}
              <View style={styles.measurementField}>
                <TextInput
                  style={styles.measurementInput}
                  placeholder={t('How many cm')}
                  placeholderTextColor={Colors.placeholder}
                  value={data.personalProfile.height}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    void updateData((current) => ({ ...current, personalProfile: { ...current.personalProfile, height: clean } }));
                  }}
                  keyboardType="decimal-pad"
                />
                <View style={styles.measurementUnitBadge}>
                  <Text style={styles.measurementUnitText}>cm</Text>
                </View>
              </View>
              {errors.height ? <Text style={styles.errorText}>{t(errors.height)}</Text> : null}
              <Text style={styles.helperText}>{t('This helps us calculate your personalized nutrition and training targets - visible only to you.')}</Text>
              <Text style={styles.fieldLabel}>{t('Weight')}</Text>
              {/* Weight - Decimals only, strings CANNOT be typed! */}
              <View style={styles.measurementField}>
                <TextInput
                  style={styles.measurementInput}
                  placeholder={data.personalProfile.weightUnit === 'lb' ? t('How many lb') : t('How many kg')}
                  placeholderTextColor={Colors.placeholder}
                  value={data.personalProfile.weight}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                    void updateData((current) => ({ ...current, personalProfile: { ...current.personalProfile, weight: clean } }));
                  }}
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitSelectorRow}>
                  {(['kg', 'lb'] as const).map((unit) => (
                    <Pressable
                      key={unit}
                      onPress={() => void updateData((current) => ({ ...current, personalProfile: { ...current.personalProfile, weightUnit: unit } }))}
                      style={[styles.unitSelectorPill, data.personalProfile.weightUnit === unit && styles.unitSelectorPillActive]}
                    >
                      <Text style={[styles.unitSelectorText, data.personalProfile.weightUnit === unit && styles.unitSelectorTextActive]}>{unit.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {errors.weight ? <Text style={styles.errorText}>{t(errors.weight)}</Text> : null}
            </View>
          ) : null}
                    {step === 3 ? (
            <View>
              <Text style={styles.stepTitle}>{t('Your Daily Protein Target')}</Text>
              <Text style={styles.stepText}>{t('Calculated scientifically based on your body weight to optimize recovery and energy.')}</Text>

              {/* Main Hero Card */}
              <View style={styles.proteinHeroCard}>
                <View style={styles.proteinHeroHeader}>
                  <View style={styles.proteinHeroIconCircle}>
                    <Ionicons name="flash" size={26} color="#FFD700" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proteinHeroEyebrow}>{t('DAILY TARGET')}</Text>
                    <View style={styles.proteinHeroValueRow}>
                      <Text style={styles.proteinHeroValue}>{onboardingProteinTarget > 0 ? onboardingProteinTarget : 112}</Text>
                      <Text style={styles.proteinHeroUnit}>g</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.proteinHeroDivider} />

                <View style={styles.proteinHeroFormulaRow}>
                  <Text style={styles.proteinHeroFormulaText}>
                    {t('Formula: 1.6g × {weight}kg = {target}g protein daily', {
                      weight: currentWeightKg > 0 ? currentWeightKg : 70,
                      target: onboardingProteinTarget > 0 ? onboardingProteinTarget : 112,
                    })}
                  </Text>
                </View>
              </View>

              {/* Auto-update Rule Card */}
              <View style={styles.proteinInfoCard}>
                <View style={styles.proteinInfoIconWrap}>
                  <Ionicons name="sync-outline" size={20} color="#E2B34E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proteinInfoTitle}>{t('Auto-updates with weight changes')}</Text>
                  <Text style={styles.proteinInfoDesc}>
                    {t('If your weight changes by more than 2kg, Victory automatically recalibrates your protein target and meal portions.')}
                  </Text>
                  <Text style={styles.proteinInfoSubnote}>
                    {t('Set weight 70kg → target shows 112g. Auto-updates when weight changes by more than 2kg.')}
                  </Text>
                </View>
              </View>

              {/* Science Card */}
              <View style={styles.proteinInfoCard}>
                <View style={styles.proteinInfoIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#A855F7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proteinInfoTitle}>{t('Why 1.6g per kilogram?')}</Text>
                  <Text style={styles.proteinInfoDesc}>
                    {t('1.6g/kg is the scientifically proven sweet spot for muscle preservation, metabolism support, and steady daily recovery.')}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
          {step === 4 ? (
            <View>
              <Text style={styles.stepTitle}>{t('Sport and health anamnese')}</Text>
              <Text style={styles.stepText}>{t('Answer these five questions so we can shape the right plan recommendation.')}</Text>
              <Text style={styles.questionTitle}>{t('1. What is your primary goal?')}</Text>
              <View style={styles.optionGridSingle}>
                {PRIMARY_GOAL_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => void updateData((current) => ({ ...current, anamnese: { ...current.anamnese, primaryGoal: option } }))}
                    style={[styles.optionCard, data.anamnese.primaryGoal === option && styles.optionCardActive]}
                  >
                    <Text style={[styles.optionLabel, data.anamnese.primaryGoal === option && styles.optionLabelActive]}>{t(option)}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.primaryGoal ? <Text style={styles.errorText}>{t(errors.primaryGoal)}</Text> : null}
              <Text style={styles.questionTitle}>{t('2. How would you describe your current activity level?')}</Text>
              <View style={styles.optionGridSingle}>
                {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => void updateData((current) => ({ ...current, anamnese: { ...current.anamnese, activityLevel: option } }))}
                    style={[styles.optionCard, data.anamnese.activityLevel === option && styles.optionCardActive]}
                  >
                    <Text style={[styles.optionLabel, data.anamnese.activityLevel === option && styles.optionLabelActive]}>{t(option)}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.activityLevel ? <Text style={styles.errorText}>{t(errors.activityLevel)}</Text> : null}
              <Text style={styles.questionTitle}>{t('3. Do you currently have, or have you had in the last 12 months, any injuries, pain, or medical conditions we should know about?')}</Text>
              <View style={styles.optionGridSingle}>
                {HEALTH_CONCERN_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => toggleHealthConcern(option)}
                    style={[styles.optionCard, data.anamnese.healthConcerns.includes(option) && styles.optionCardActive]}
                  >
                    <Text style={[styles.optionLabel, data.anamnese.healthConcerns.includes(option) && styles.optionLabelActive]}>{t(getHealthConcernLabel(option))}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.healthConcerns ? <Text style={styles.errorText}>{t(errors.healthConcerns)}</Text> : null}
              {/* Health Notes - Allows both strings and numbers */}
              <TextInput
                value={data.anamnese.healthNotes}
                onChangeText={(value) => void updateData((current) => ({ ...current, anamnese: { ...current.anamnese, healthNotes: value } }))}
                placeholder={t('Add details if needed')}
                placeholderTextColor={Colors.placeholder}
                multiline
                style={styles.notesInput}
              />
              <Text style={styles.questionTitle}>{t('4. How many days per week can you realistically commit?')}</Text>
              <View style={styles.optionGridSingle}>
                {DAYS_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => void updateData((current) => ({ ...current, anamnese: { ...current.anamnese, daysPerWeek: option } }))}
                    style={[styles.optionCard, data.anamnese.daysPerWeek === option && styles.optionCardActive]}
                  >
                    <Text style={[styles.optionLabel, data.anamnese.daysPerWeek === option && styles.optionLabelActive]}>{t(option)}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.daysPerWeek ? <Text style={styles.errorText}>{t(errors.daysPerWeek)}</Text> : null}
              <Text style={styles.questionTitle}>{t('5. What equipment or environment do you have access to?')}</Text>
              <View style={styles.optionGridSingle}>
                {EQUIPMENT_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => void updateData((current) => ({ ...current, anamnese: { ...current.anamnese, equipmentAccess: option } }))}
                    style={[styles.optionCard, data.anamnese.equipmentAccess === option && styles.optionCardActive]}
                  >
                    <Text style={[styles.optionLabel, data.anamnese.equipmentAccess === option && styles.optionLabelActive]}>{t(option)}</Text>
                  </Pressable>
                ))}
              </View>
              {errors.equipmentAccess ? <Text style={styles.errorText}>{t(errors.equipmentAccess)}</Text> : null}
            </View>
          ) : null}
          {step === 5 ? (
            <View>
              <Text style={styles.stepTitle}>{t("Before we build your plan — what’s this for?")}</Text>
              <Text style={styles.stepText}>{t('Choose the reason that feels most true, or write your own.')}</Text>
              <View style={styles.optionGridSingle}>
                {COMMITMENT_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => void updateData((current) => ({ ...current, motivationStatement: current.motivationStatement === option ? '' : option }))}
                    style={[styles.optionCard, data.motivationStatement === option && styles.optionCardActive]}
                  >
                    <Text style={[styles.optionLabel, data.motivationStatement === option && styles.optionLabelActive]}>{t(option)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>{t('Or write your own reason')}</Text>
              <TextInput
                value={data.motivationStatement}
                onChangeText={(value) => void updateData((current) => ({ ...current, motivationStatement: value.slice(0, 240) }))}
                placeholder={t('Example: stay healthy for my family, feel stronger again, or rebuild my routine')}
                placeholderTextColor={Colors.placeholder}
                multiline
                maxLength={240}
                textAlignVertical="top"
                style={styles.notesInput}
              />
              <Text style={styles.helperText}>{t('We only reuse this in coaching and reminder copy as a supportive anchor, never to shame or pressure you.')}</Text>
            </View>
          ) : null}
          {step === 6 ? (
            <View>
              <Text style={styles.stepTitle}>{t('Who are you becoming?')}</Text>
              <Text style={styles.stepText}>{t('Write one sentence about the identity you are building. This is optional and can be edited later.')}</Text>
              <TextInput
                value={data.identityStatement}
                onChangeText={(value) => void updateData((current) => ({ ...current, identityStatement: value.slice(0, 240) }))}
                placeholder={t('Example: I am becoming someone who keeps promises to myself.')}
                placeholderTextColor={Colors.placeholder}
                multiline
                maxLength={240}
                textAlignVertical="top"
                style={styles.notesInput}
              />
              <Text style={styles.helperText}>{t('Gold coaching can use this as a positive anchor in reminders and check-ins.')}</Text>
            </View>
          ) : null}
          {step === STEP_TITLES.length - 1 && suggestion ? (
            <View>
              <Text style={styles.stepTitle}>{t('Suggested tier')}</Text>
              <Text style={styles.stepText}>{t('Based on your answers, this is the strongest starting point for your next step inside the app.')}</Text>
              <View style={[
                styles.recommendationCard,
                suggestion.tier === 'GOLD' && {
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                }
              ]}>
                <Text style={[
                  styles.recommendationEyebrow,
                  suggestion.tier === 'GOLD' && { color: '#F59E0B' }
                ]}>{t('RECOMMENDED')}</Text>
                <Text style={styles.recommendationTitle}>{t(suggestion.title)}</Text>
                <Text style={styles.recommendationReason}>{t(suggestion.reason)}</Text>
                {suggestion.note ? <Text style={styles.recommendationNote}>{suggestion.note}</Text> : null}
              </View>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>{t('Review answers')}</Text>
                <Text style={styles.reviewLine}>{t('Language')}: {LANGUAGE_OPTIONS.find((option) => option.value === data.language)?.nativeLabel || '-'}</Text>
                <Text style={styles.reviewLine}>{t('Country')}: {data.country || selectedCountry || '-'}</Text>
                <Text style={styles.reviewLine}>{t('Commitment statement')}: {data.motivationStatement || '-'}</Text>
                <Text style={styles.reviewLine}>{t('Identity statement')}: {data.identityStatement || '-'}</Text>
                <Text style={styles.reviewLine}>{t('Age')}: {data.personalProfile.age || '-'}</Text>
                <Text style={styles.reviewLine}>{t('Gender')}: {data.personalProfile.gender ? t(data.personalProfile.gender) : '-'}</Text>
                <Text style={styles.reviewLine}>{t('Height')}: {data.personalProfile.height ? `${data.personalProfile.height} ${data.personalProfile.heightUnit}` : '-'}</Text>
                <Text style={styles.reviewLine}>{t('Weight')}: {data.personalProfile.weight ? `${data.personalProfile.weight} ${data.personalProfile.weightUnit}` : '-'}</Text>
                <Text style={styles.reviewLine}>{t('Goal')}: {data.anamnese.primaryGoal ? t(data.anamnese.primaryGoal) : '-'}</Text>
                <Text style={styles.reviewLine}>{t('Activity')}: {data.anamnese.activityLevel ? t(data.anamnese.activityLevel) : '-'}</Text>
                <Text style={styles.reviewLine}>{t('Commitment')}: {data.anamnese.daysPerWeek ? t(data.anamnese.daysPerWeek) : '-'}</Text>
                <Text style={styles.reviewLine}>{t('Equipment')}: {data.anamnese.equipmentAccess ? t(data.anamnese.equipmentAccess) : '-'}</Text>
              </View>
            </View>
          ) : null}
        </View>
        {saveError ? <Text style={styles.saveError}>{t(saveError)}</Text> : null}
        <View style={styles.actionsRow}>
          <View style={styles.primaryButtonWrap}>
            <AuthButton
              title={
                step === STEP_TITLES.length - 1
                  ? t('Try Gold free for 5 days')
                  : step === 3
                  ? t('Next: Health & Goals Survey')
                  : (step === 5 && !data?.motivationStatement?.trim()) || (step === 6 && !data?.identityStatement?.trim())
                  ? t('Skip for now')
                  : t('Next')
              }
              onPress={() => step === STEP_TITLES.length - 1 ? void completeAndStartGoldTrial() : void handleNext()}
              disabled={saving}
              loading={saving}
            />
          </View>
          {step > 0 ? (
            <Pressable
              onPress={() => {
                if (step === STEP_TITLES.length - 1) {
                  replaceRoute(router, '/plan');
                  return;
                }
                void handleBack();
              }}
              disabled={saving}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{t(step === STEP_TITLES.length - 1 ? 'Choose another plan' : 'Back')}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
      <Modal visible={showGenderModal} transparent animationType="fade" onRequestClose={() => setShowGenderModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowGenderModal(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('Select gender')}</Text>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={styles.modalOption}
                onPress={() => {
                  setShowGenderModal(false);
                  void updateData((current) => ({ ...current, personalProfile: { ...current.personalProfile, gender: option } }));
                }}
              >
                <Text style={[styles.modalOptionText, data.personalProfile.gender === option && styles.modalOptionTextActive]}>{t(option)}</Text>
                {data.personalProfile.gender === option ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  eyebrow: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 1.3,
    marginBottom: 10,
  },
  title: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 22,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  progressDotText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  progressDotTextActive: {
    color: '#062724',
  },
  progressLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  progressLabelActive: {
    color: Colors.primary,
  },
  currentStepText: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(18, 22, 34, 0.85)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  stepTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 21,
    marginBottom: 8,
  },
  stepText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  fieldLabel: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  optionGridSingle: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 8,
  },
  optionCard: {
    width: '100%',
    backgroundColor: 'rgba(26, 26, 46, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 240, 208, 0.14)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  optionLabel: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  optionSubLabel: {
    color: Colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 4,
  },
  optionLabelActive: {
    color: Colors.text,
  },
  helperText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  dropdownField: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(26, 26, 46, 0.75)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dropdownFieldText: {
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  dropdownFieldPlaceholder: {
    color: Colors.placeholder,
  },
  measurementField: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(26, 26, 46, 0.75)',
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  measurementInput: {
    flex: 1,
    minWidth: 0,
    color: Colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    paddingVertical: 14,
    paddingRight: 4,
    outlineStyle: 'none' as any,
  },
  measurementUnitBadge: {
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 208, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 208, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  measurementUnitText: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 12.5,
    letterSpacing: 0.4,
  },
  unitSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unitSelectorPill: {
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitSelectorPillActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  unitSelectorText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_700Bold',
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  unitSelectorTextActive: {
    color: '#051614',
  },
  errorText: {
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 10,
  },
  saveError: {
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
    textAlign: 'center',
  },
  questionTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 10,
  },
  notesInput: {
    minHeight: 94,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(26, 26, 46, 0.75)',
    color: Colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 4,
    textAlignVertical: 'top',
    outlineStyle: 'none' as any,
  },
  recommendationCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(0, 240, 208, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 208, 0.3)',
    marginBottom: 18,
  },
  recommendationEyebrow: {
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  recommendationTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    marginBottom: 8,
  },
  recommendationReason: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  recommendationNote: {
    color: '#FDE68A',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  proteinHeroCard: {
    backgroundColor: 'rgba(226, 179, 78, 0.09)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 179, 78, 0.35)',
    padding: 20,
    marginBottom: 16,
  },
  proteinHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  proteinHeroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(226, 179, 78, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proteinHeroEyebrow: {
    color: '#FFD700',
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  proteinHeroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  proteinHeroValue: {
    color: '#FFF',
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  proteinHeroUnit: {
    color: '#FFD700',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  proteinHeroDivider: {
    height: 1,
    backgroundColor: 'rgba(226, 179, 78, 0.2)',
    marginVertical: 14,
  },
  proteinHeroFormulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proteinHeroFormulaText: {
    color: '#E2B34E',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  proteinInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#111514',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 12,
  },
  proteinInfoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  proteinInfoTitle: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  proteinInfoDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  proteinInfoSubnote: {
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 16,
    marginTop: 6,
  },
  reviewCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  reviewTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginBottom: 10,
  },
  reviewLine: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 15, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 22,
  },
  modalTitle: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 16,
  },
  modalOption: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  modalOptionText: {
    color: Colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  modalOptionTextActive: {
    color: Colors.text,
  },
  actionsRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(18, 22, 34, 0.8)',
    paddingHorizontal: 12,
  },
  secondaryButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButtonWrap: {
    width: '100%',
    height: 56,
  },
  sectionHeader: {
    color: Colors.text,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 14,
    marginBottom: 10,
    opacity: 0.8,
  },
  noResultsText: {
    color: Colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
});
