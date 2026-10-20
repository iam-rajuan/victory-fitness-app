import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { ErrorPopupModal } from '../../components/ErrorPopupModal';
import { ScreenState } from '../../components/ScreenState';
import {
  deleteCurrentUserProfileImage,
  fetchCurrentUser,
  fetchCurrentUserBodyMetrics,
  fetchCurrentUserOnboarding,
  updateCurrentUserBodyMetrics,
  updateCurrentUserOnboarding,
  updateCurrentUserProfile,
  uploadCurrentUserProfileImage,
} from '../../lib/api';
import { getOnboardingData, saveOnboardingData, syncOnboardingProfileFields } from '../../lib/onboarding';
import { calculateProteinTarget } from '../../lib/nutrition';
import { formatAppError } from '../../lib/error';
import { SUPPORTED_LANGUAGES, LanguageCode, useLanguage } from '../../lib/i18n';
import { useAsyncScreenData } from '../../hooks/useAsyncScreenData';
import { goBackOrReplace } from '../../lib/navigation';

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const GOAL_OPTIONS = [
  { key: 'To feel strong again', desc: 'Energy & functional strength' },
  { key: 'To keep up with my kids', desc: 'Stamina & joint resilience' },
  { key: 'My doctor asked me to', desc: 'Cardiovascular & safe progressive load' },
  { key: 'To lose weight steadily', desc: 'Sustainable fat loss without crash dieting' },
  { key: 'To build visible muscle', desc: 'Hypertrophy & progressive overload' },
];

const DAYS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];
const TIME_OPTIONS = [
  { val: '15', label: '15 min' },
  { val: '30', label: '30 min' },
  { val: '45', label: '45 min' },
  { val: '60', label: '60 min' },
  { val: '90', label: '90 min' },
];

const PLACE_OPTIONS = [
  { key: 'Gym equipment', icon: 'barbell-outline', desc: 'Commercial gym free weights & machines' },
  { key: 'Only body weight', icon: 'body-outline', desc: 'No equipment needed — floor space & wall' },
  { key: 'CrossFit gym', icon: 'fitness-outline', desc: 'Rigs, boxes, rowers & barbells' },
  { key: 'Home gym', icon: 'home-outline', desc: 'Dumbbells, kettlebells or home kit' },
];

const KIT_OPTIONS = ['Dumbbells', 'Barbells', 'Pull-up bar', 'Kettlebell'];

const ACTIVITY_OPTIONS = [
  { key: 'Sedentary', desc: 'Desk job, little movement' },
  { key: 'Lightly active', desc: '1-3 light sessions/wk' },
  { key: 'Moderately active', desc: '3-5 sessions/wk' },
  { key: 'Very active', desc: '6-7 heavy sessions/wk' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  // Basic Account Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>(language);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Personal Profile & Body Metrics
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');

  // Fitness Goals & Onboarding Routine (Anamnese)
  const [primaryGoal, setPrimaryGoal] = useState('To build visible muscle');
  const [daysPerWeek, setDaysPerWeek] = useState('4');
  const [timePerSession, setTimePerSession] = useState('45');
  const [equipmentAccess, setEquipmentAccess] = useState('Gym equipment');
  const [selectedKit, setSelectedKit] = useState<string[]>(['Dumbbells']);
  const [activityLevel, setActivityLevel] = useState('Moderately active');
  const [healthNotes, setHealthNotes] = useState('');

  // Processing & State
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  const {
    loading: loadingProfile,
    error: loadError,
    reload: reloadProfile,
  } = useAsyncScreenData({
    initialData: null as null,
    load: async () => {
      const [me, onboardingState, metrics, localData] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        fetchCurrentUserOnboarding().catch(() => null),
        fetchCurrentUserBodyMetrics().catch(() => null),
        getOnboardingData().catch(() => null),
      ]);

      if (me) {
        setName(me.name ?? '');
        setEmail(me.email ?? '');
        setProfileImage(me.profileImage ?? '');
        const nextLanguage = SUPPORTED_LANGUAGES.some((option) => option.code === me.preferred_language)
          ? (me.preferred_language as LanguageCode)
          : language;
        setPreferredLanguage(nextLanguage);
      }

      const personal = (onboardingState?.personalProfile || localData?.personalProfile || {}) as Record<string, any>;
      const anamnese = (onboardingState?.anamnese || localData?.anamnese || {}) as Record<string, any>;
      const preferences = (onboardingState?.preferences || localData?.preferences || {}) as Record<string, any>;

      // Age
      const loadedAge = String(metrics?.age || personal?.age || '').trim();
      if (loadedAge) setAge(loadedAge);

      // Gender
      const loadedGender = String(metrics?.gender || personal?.gender || '').trim();
      if (loadedGender) setGender(loadedGender);

      // Height
      const loadedHeight = String(metrics?.height || personal?.height || '').trim();
      if (loadedHeight) setHeight(loadedHeight);

      // Weight
      const loadedWeight = String(metrics?.weight || personal?.weight || '').trim();
      if (loadedWeight) setWeight(loadedWeight);
      if (personal?.weightUnit === 'lb') setWeightUnit('lb');

      // Primary Goal
      const loadedGoal = String(anamnese?.primaryGoal || (Array.isArray(anamnese?.primaryGoals) ? anamnese.primaryGoals[0] : '') || '').trim();
      if (loadedGoal) setPrimaryGoal(loadedGoal);

      // Days per week
      const loadedDays = String(anamnese?.daysPerWeek || '').trim();
      if (loadedDays && Number(loadedDays) >= 1 && Number(loadedDays) <= 7) {
        setDaysPerWeek(loadedDays);
      }

      // Time per session
      const loadedTime = String(anamnese?.timePerSession || '').trim();
      if (loadedTime) setTimePerSession(loadedTime);

      // Equipment access
      const loadedEquipment = String(anamnese?.equipmentAccess || '').trim();
      if (loadedEquipment) setEquipmentAccess(loadedEquipment);

      // Selected kit
      if (Array.isArray(preferences?.selectedKit) && preferences.selectedKit.length > 0) {
        setSelectedKit(preferences.selectedKit);
      }

      // Activity level
      const loadedActivity = String(anamnese?.activityLevel || '').trim();
      if (loadedActivity) setActivityLevel(loadedActivity);

      // Health notes
      const loadedNotes = String(anamnese?.healthNotes || '').trim();
      if (loadedNotes) setHealthNotes(loadedNotes);

      return null;
    },
    getErrorMessage: () => t('Unable to load your profile right now.'),
  });

  const currentLanguageObj = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === preferredLanguage) || SUPPORTED_LANGUAGES[0];
  }, [preferredLanguage]);

  // Live protein calculation preview
  const proteinPreview = useMemo(() => {
    const wNum = parseFloat(weight.replace(/[^\d.]/g, ''));
    if (!wNum || isNaN(wNum)) return null;
    const calcWeight = weightUnit === 'lb' ? wNum * 0.453592 : wNum;
    return calculateProteinTarget(calcWeight, primaryGoal);
  }, [weight, weightUnit, primaryGoal]);

  const handleSave = async () => {
    if (savingProfile || uploadingImage || deletingImage) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorDialog({
        title: t('Validation error'),
        message: t('Please enter your full name.'),
      });
      return;
    }

    const trimmedAge = age.trim();
    if (trimmedAge) {
      const parsedAge = parseInt(trimmedAge, 10);
      if (isNaN(parsedAge) || parsedAge < 14) {
        setErrorDialog({
          title: t('Age requirement'),
          message: t('You must be at least 14 years old to train with Victory Fitness.'),
        });
        return;
      }
      if (parsedAge > 120) {
        setErrorDialog({
          title: t('Invalid age'),
          message: t('Please enter a realistic age.'),
        });
        return;
      }
    }

    const trimmedHeight = height.trim();
    if (trimmedHeight) {
      const parsedHeight = parseFloat(trimmedHeight);
      if (isNaN(parsedHeight) || parsedHeight < 50 || parsedHeight > 260) {
        setErrorDialog({
          title: t('Invalid height'),
          message: t('Please enter a valid height in centimeters (50 - 260 cm).'),
        });
        return;
      }
    }

    const trimmedWeight = weight.trim();
    if (trimmedWeight) {
      const parsedWeight = parseFloat(trimmedWeight);
      if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 400) {
        setErrorDialog({
          title: t('Invalid weight'),
          message: t('Please enter a valid body weight.'),
        });
        return;
      }
    }

    setSavingProfile(true);
    try {
      // 1. Update basic user profile
      await updateCurrentUserProfile({
        name: trimmedName,
        profileImage: profileImage.trim() || undefined,
        preferred_language: preferredLanguage,
      });

      // 2. Update body metrics
      await updateCurrentUserBodyMetrics({
        age: trimmedAge || undefined,
        height: trimmedHeight || undefined,
        weight: trimmedWeight || undefined,
        gender: gender || undefined,
      }).catch((err) => {
        console.warn('Non-fatal body metrics sync issue:', err);
      });

      // 3. Update full onboarding profile state
      const updatedPersonal = {
        age: trimmedAge,
        gender: gender,
        height: trimmedHeight,
        heightUnit: 'cm' as const,
        weight: trimmedWeight,
        weightUnit: weightUnit,
      };

      const updatedAnamnese = {
        primaryGoal: primaryGoal,
        primaryGoals: [primaryGoal],
        activityLevel: activityLevel,
        healthConcerns: [],
        healthNotes: healthNotes.trim(),
        daysPerWeek: daysPerWeek,
        timePerSession: timePerSession,
        equipmentAccess: equipmentAccess,
      };

      await updateCurrentUserOnboarding({
        personalProfile: updatedPersonal,
        anamnese: updatedAnamnese,
        preferences: {
          billingCycle: 'year',
          region: '',
          paymentMethodIndex: 0,
          paymentMethodName: '',
          nudgeChannels: [],
          nudgeTime: '20:30',
          dialCode: '',
          dialNumber: '',
          contactNumber: '',
          selectedKit: selectedKit,
          numbersConfirmed: true,
        },
      }).catch((err) => {
        console.warn('Non-fatal onboarding state sync issue:', err);
      });

      // 4. Update local storage snapshot
      await syncOnboardingProfileFields(trimmedName, updatedPersonal).catch(() => null);

      await setLanguage(preferredLanguage);
      goBackOrReplace(router, '/profile');
    } catch (error) {
      setErrorDialog(formatAppError(error, t('Unable to save profile changes.')));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePhoto = async () => {
    if (loadingProfile || savingProfile || uploadingImage || deletingImage) {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorDialog({
          title: t('Permission needed'),
          message: t('Please allow photo library access to choose a profile image.'),
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        throw new Error('The selected image could not be processed for upload.');
      }

      setUploadingImage(true);
      try {
        const response = await uploadCurrentUserProfileImage({
          image_base64: asset.base64,
          mime_type: asset.mimeType ?? 'image/jpeg',
          file_name: asset.fileName ?? null,
        });
        setProfileImage(response.image_url);
      } finally {
        setUploadingImage(false);
      }
    } catch (error) {
      setErrorDialog(formatAppError(error, t('Unable to upload your profile image right now.')));
      setUploadingImage(false);
    }
  };

  const handleLanguageSelect = async (nextLanguage: LanguageCode) => {
    if (savingProfile || savingLanguage || loadingProfile) {
      return;
    }

    setPreferredLanguage(nextLanguage);
    await setLanguage(nextLanguage);
    setSavingLanguage(true);
    try {
      await updateCurrentUserProfile({ preferred_language: nextLanguage });
    } catch (error) {
      setPreferredLanguage(language);
      await setLanguage(language);
      setErrorDialog(formatAppError(error, t('Unable to save language preference.')));
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!profileImage || loadingProfile || savingProfile || uploadingImage || deletingImage) {
      return;
    }

    setDeletingImage(true);
    try {
      await deleteCurrentUserProfileImage();
      setProfileImage('');
    } catch (error) {
      setErrorDialog(formatAppError(error, t('Unable to remove your profile image right now.')));
    } finally {
      setDeletingImage(false);
    }
  };

  const toggleKit = (item: string) => {
    if (selectedKit.includes(item)) {
      setSelectedKit(selectedKit.filter((k) => k !== item));
    } else {
      setSelectedKit([...selectedKit, item]);
    }
  };

  const adjustNumericValue = (
    currentVal: string,
    delta: number,
    minVal: number,
    maxVal: number,
    setter: (val: string) => void
  ) => {
    const num = parseFloat(currentVal) || minVal;
    const next = Math.min(maxVal, Math.max(minVal, num + delta));
    setter(String(next));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ErrorPopupModal
        visible={Boolean(errorDialog)}
        title={errorDialog?.title ?? t('Error')}
        message={errorDialog?.message ?? ''}
        onClose={() => setErrorDialog(null)}
      />

      <Stack.Screen
        options={{
          headerShown: true,
          title: t('EDIT PROFILE'),
          headerTransparent: true,
          headerTintColor: Colors.ivory,
          headerTitleStyle: { fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 2, color: Colors.ivory } as any,
          headerLeft: () => (
            <TouchableOpacity onPress={() => goBackOrReplace(router, '/profile')} style={{ marginLeft: 8 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={24} color={Colors.ivory} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity
            style={styles.modalCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>{t('Select language')}</Text>
                <Text style={styles.modalSubtitle}>{t('Scroll and select your preferred language')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={Colors.ivory} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={styles.languageModalScroll}>
              {SUPPORTED_LANGUAGES.map((option) => {
                const isSelected = preferredLanguage === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowLanguageModal(false);
                      void handleLanguageSelect(option.code);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextActive]}>
                        {option.nativeLabel}
                      </Text>
                      {option.label !== option.nativeLabel ? (
                        <Text style={[styles.modalOptionSubtext, isSelected && styles.modalOptionSubtextActive]}>
                          {option.label}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color={Colors.gold} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {loadingProfile ? (
        <ScreenState mode="loading" message={t('Loading your profile...')} />
      ) : loadError ? (
        <ScreenState
          mode="error"
          title={t('Profile unavailable')}
          message={loadError}
          actionLabel={t('Try Again')}
          onAction={() => void reloadProfile()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <Image
                source={
                  profileImage
                    ? { uri: profileImage }
                    : require('../../assets/profile-placeholder.png')
                }
                style={styles.avatarImage}
              />
              <TouchableOpacity
                style={[styles.cameraBtn, uploadingImage && styles.cameraBtnDisabled]}
                onPress={handleChangePhoto}
                disabled={uploadingImage || loadingProfile || savingProfile}
                activeOpacity={0.8}
              >
                {uploadingImage ? (
                  <ActivityIndicator color={Colors.obsidian} size="small" />
                ) : (
                  <Ionicons name="camera" size={16} color={Colors.obsidian} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={[
                  styles.photoActionBtn,
                  (uploadingImage || deletingImage || loadingProfile || savingProfile) && styles.photoActionBtnDisabled,
                ]}
                onPress={handleChangePhoto}
                disabled={uploadingImage || deletingImage || loadingProfile || savingProfile}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={16} color={Colors.obsidian} />
                <Text style={styles.photoActionBtnText}>
                  {profileImage ? t('Replace Photo') : t('Upload Photo')}
                </Text>
              </TouchableOpacity>

              {profileImage ? (
                <TouchableOpacity
                  style={[
                    styles.photoActionBtn,
                    styles.photoDeleteBtn,
                    (uploadingImage || deletingImage || loadingProfile || savingProfile) && styles.photoActionBtnDisabled,
                  ]}
                  onPress={handleDeletePhoto}
                  disabled={uploadingImage || deletingImage || loadingProfile || savingProfile}
                  activeOpacity={0.8}
                >
                  {deletingImage ? (
                    <ActivityIndicator color="#EF4444" size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={styles.photoDeleteBtnText}>{t('Delete')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* SECTION 1: IDENTITY & BASIC INFO */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="person-circle-outline" size={18} color={Colors.gold} />
              <Text style={styles.cardTitle}>{t('IDENTITY & CONTACT')}</Text>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('FULL NAME')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(val) => setName(val.replace(/[0-9]/g, ''))}
                placeholder={t('Your Name')}
                placeholderTextColor="rgba(247, 243, 238, 0.3)"
                editable={!loadingProfile && !savingProfile}
              />
            </View>

            {/* Email Address (Read-only) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('EMAIL ADDRESS')}</Text>
                <View style={styles.badgeRow}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.gold} />
                  <Text style={styles.badgeText}>{t('REGISTERED')}</Text>
                </View>
              </View>
              <View style={[styles.readOnlyField, styles.inputWithIcon]}>
                <Ionicons name="mail-outline" size={18} color={Colors.gold} style={styles.inputIcon} />
                <Text style={styles.readOnlyText} numberOfLines={1} ellipsizeMode="middle">
                  {email || t('Not available')}
                </Text>
                <Ionicons name="lock-closed" size={14} color="rgba(247, 243, 238, 0.4)" style={styles.lockIcon} />
              </View>
            </View>

            {/* Gender Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('GENDER')}</Text>
              <View style={styles.chipGrid}>
                {GENDER_OPTIONS.map((opt) => {
                  const isSelected = gender === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                      onPress={() => setGender(opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* SECTION 2: BODY METRICS (FROM ONBOARDING) */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="fitness-outline" size={18} color={Colors.gold} />
              <Text style={styles.cardTitle}>{t('BODY & PHYSICAL METRICS')}</Text>
            </View>
            <Text style={styles.helperText}>
              {t('Entered during onboarding. Used by Coach Victor to calibrate volume, recovery, and daily nutrition targets.')}
            </Text>

            {/* Age Stepper */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('AGE (YEARS)')}</Text>
                <Text style={styles.unitHint}>Min 14</Text>
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustNumericValue(age, -1, 14, 100, setAge)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color={Colors.ivory} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={age}
                  onChangeText={(val) => setAge(val.replace(/[^\d]/g, ''))}
                  placeholder="25"
                  placeholderTextColor="rgba(247, 243, 238, 0.3)"
                  keyboardType="numeric"
                  maxLength={3}
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustNumericValue(age, 1, 14, 100, setAge)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={Colors.ivory} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Height (CM) Stepper */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('HEIGHT (CM)')}</Text>
                <Text style={styles.unitHint}>Centimeters</Text>
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustNumericValue(height, -1, 100, 250, setHeight)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color={Colors.ivory} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={height}
                  onChangeText={(val) => setHeight(val.replace(/[^\d.]/g, ''))}
                  placeholder="178"
                  placeholderTextColor="rgba(247, 243, 238, 0.3)"
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustNumericValue(height, 1, 100, 250, setHeight)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={Colors.ivory} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight & Unit Toggle */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('CURRENT BODY WEIGHT')}</Text>
                <View style={styles.unitToggleWrap}>
                  <TouchableOpacity
                    style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <Text style={[styles.unitToggleText, weightUnit === 'kg' && styles.unitToggleTextActive]}>KG</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitToggleBtn, weightUnit === 'lb' && styles.unitToggleBtnActive]}
                    onPress={() => setWeightUnit('lb')}
                  >
                    <Text style={[styles.unitToggleText, weightUnit === 'lb' && styles.unitToggleTextActive]}>LB</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustNumericValue(weight, -0.5, 30, 300, setWeight)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color={Colors.ivory} />
                </TouchableOpacity>
                <TextInput
                  style={styles.stepperInput}
                  value={weight}
                  onChangeText={(val) => setWeight(val.replace(/[^\d.]/g, ''))}
                  placeholder={weightUnit === 'kg' ? '80' : '176'}
                  placeholderTextColor="rgba(247, 243, 238, 0.3)"
                  keyboardType="numeric"
                  maxLength={5}
                />
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjustNumericValue(weight, 0.5, 30, 300, setWeight)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={Colors.ivory} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Protein Target Insight */}
            {proteinPreview ? (
              <View style={styles.proteinInsightCard}>
                <View style={styles.proteinInsightIconWrap}>
                  <Ionicons name="flame" size={20} color={Colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.proteinInsightTitle}>
                    {t('Daily Target: ')}{proteinPreview.target}g {t('Protein')}
                  </Text>
                  <Text style={styles.proteinInsightSub}>
                    {proteinPreview.multiplier.toFixed(1)} g/kg · {t('Calculated automatically from your current weight')}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* SECTION 3: FITNESS GOALS & ONBOARDING ROUTINE */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="trophy-outline" size={18} color={Colors.gold} />
              <Text style={styles.cardTitle}>{t('TRAINING GOALS & ROUTINE')}</Text>
            </View>

            {/* Primary Goal */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('PRIMARY FITNESS GOAL')}</Text>
              <View style={styles.goalListWrap}>
                {GOAL_OPTIONS.map((g) => {
                  const isSelected = primaryGoal === g.key;
                  return (
                    <TouchableOpacity
                      key={g.key}
                      style={[styles.goalOptionCard, isSelected && styles.goalOptionCardActive]}
                      onPress={() => setPrimaryGoal(g.key)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.goalOptionTitle, isSelected && styles.goalOptionTitleActive]}>
                          {t(g.key)}
                        </Text>
                        <Text style={[styles.goalOptionDesc, isSelected && styles.goalOptionDescActive]}>
                          {t(g.desc)}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isSelected ? Colors.gold : 'rgba(247, 243, 238, 0.4)'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Training Frequency (Days/Week) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('TRAINING DAYS PER WEEK')}</Text>
                <Text style={styles.unitHint}>{daysPerWeek} {t('days planned')}</Text>
              </View>
              <View style={styles.daysRow}>
                {DAYS_OPTIONS.map((dayNum) => {
                  const isSelected = daysPerWeek === dayNum;
                  return (
                    <TouchableOpacity
                      key={dayNum}
                      style={[styles.dayPill, isSelected && styles.dayPillActive]}
                      onPress={() => setDaysPerWeek(dayNum)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time per session */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('SESSION DURATION')}</Text>
              <View style={styles.timePillsRow}>
                {TIME_OPTIONS.map((item) => {
                  const isSelected = timePerSession === item.val;
                  return (
                    <TouchableOpacity
                      key={item.val}
                      style={[styles.timePill, isSelected && styles.timePillActive]}
                      onPress={() => setTimePerSession(item.val)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timePillText, isSelected && styles.timePillTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Equipment Access / Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('WHERE YOU TRAIN & EQUIPMENT ACCESS')}</Text>
              <View style={styles.placesList}>
                {PLACE_OPTIONS.map((place) => {
                  const isSelected = equipmentAccess === place.key;
                  return (
                    <TouchableOpacity
                      key={place.key}
                      style={[styles.placeCard, isSelected && styles.placeCardActive]}
                      onPress={() => setEquipmentAccess(place.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.placeIconCircle, isSelected && styles.placeIconCircleActive]}>
                        <Ionicons
                          name={place.icon as any}
                          size={18}
                          color={isSelected ? Colors.gold : Colors.ivory}
                        />
                      </View>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.placeTitle, isSelected && styles.placeTitleActive]}>
                          {t(place.key)}
                        </Text>
                        <Text style={styles.placeDesc}>{t(place.desc)}</Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Kit Owned (Multi-select) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('EQUIPMENT YOU HAVE ACCESS TO')}</Text>
              <Text style={styles.helperText}>{t('Tap to toggle equipment available in your setup.')}</Text>
              <View style={styles.kitChipsWrap}>
                {KIT_OPTIONS.map((kitItem) => {
                  const hasKit = selectedKit.includes(kitItem);
                  return (
                    <TouchableOpacity
                      key={kitItem}
                      style={[styles.kitChip, hasKit && styles.kitChipActive]}
                      onPress={() => toggleKit(kitItem)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={hasKit ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={hasKit ? Colors.gold : 'rgba(247, 243, 238, 0.4)'}
                      />
                      <Text style={[styles.kitChipText, hasKit && styles.kitChipTextActive]}>
                        {kitItem}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Activity Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('BASELINE ACTIVITY LEVEL')}</Text>
              <View style={styles.chipGrid}>
                {ACTIVITY_OPTIONS.map((act) => {
                  const isSelected = activityLevel === act.key;
                  return (
                    <TouchableOpacity
                      key={act.key}
                      style={[styles.activityCard, isSelected && styles.activityCardActive]}
                      onPress={() => setActivityLevel(act.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.activityTitle, isSelected && styles.activityTitleActive]}>
                        {act.key}
                      </Text>
                      <Text style={styles.activityDesc}>{act.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Health Notes & Physical Considerations */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('HEALTH NOTES & INJURIES (OPTIONAL)')}</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={healthNotes}
                onChangeText={setHealthNotes}
                placeholder={t('e.g. Lower back pain, left shoulder mobility issue, knee sensitivity')}
                placeholderTextColor="rgba(247, 243, 238, 0.3)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* SECTION 4: PREFERENCES & LANGUAGE */}
          <View style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="globe-outline" size={18} color={Colors.gold} />
              <Text style={styles.cardTitle}>{t('REGIONAL & LANGUAGE PREFERENCES')}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('PREFERRED LANGUAGE')}</Text>
              <TouchableOpacity
                style={styles.languageDropdownField}
                activeOpacity={0.8}
                onPress={() => setShowLanguageModal(true)}
                disabled={savingLanguage || savingProfile || loadingProfile}
              >
                <View style={styles.languageDropdownLeft}>
                  <View style={styles.languageIconCircle}>
                    <Ionicons name="globe-outline" size={20} color={Colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.languageDropdownValue}>
                      {currentLanguageObj.nativeLabel}
                      {currentLanguageObj.label !== currentLanguageObj.nativeLabel ? ` (${currentLanguageObj.label})` : ''}
                    </Text>
                    <Text style={styles.languageDropdownSubtext}>{t('Tap to change language')}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={20} color={Colors.gold} />
              </TouchableOpacity>
              {savingLanguage ? <Text style={styles.languageSavingText}>{t('Saving language...')}</Text> : null}
            </View>
          </View>

          {/* Save Changes CTA Button */}
          <TouchableOpacity
            style={[styles.saveBtn, (loadingProfile || savingProfile || uploadingImage || deletingImage) && styles.saveBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loadingProfile || savingProfile || uploadingImage || deletingImage}
          >
            {savingProfile ? (
              <View style={styles.saveBtnRow}>
                <ActivityIndicator color={Colors.obsidian} />
                <Text style={styles.saveBtnText}>{t('SAVING CHANGES...')}</Text>
              </View>
            ) : (
              <Text style={styles.saveBtnText}>{t('SAVE CHANGES')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.obsidian,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    position: 'relative',
    width: 106,
    height: 106,
    marginBottom: 14,
  },
  avatarImage: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2.5,
    borderColor: 'rgba(181, 101, 29, 0.45)',
    backgroundColor: Colors.surfaceCard,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.obsidian,
  },
  cameraBtnDisabled: {
    opacity: 0.8,
  },
  photoActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.gold,
  },
  photoActionBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  photoDeleteBtn: {
    minWidth: 90,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  photoDeleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  photoActionBtnDisabled: {
    opacity: 0.5,
  },

  /* Card Sections */
  cardSection: {
    backgroundColor: 'rgba(13, 43, 69, 0.35)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.22)',
    padding: 18,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181, 101, 29, 0.16)',
  },
  cardTitle: {
    color: Colors.ivory,
    fontSize: 13,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: Colors.copper,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  unitHint: {
    color: 'rgba(247, 243, 238, 0.45)',
    fontSize: 11,
    fontFamily: Fonts.body,
  },
  helperText: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.body,
    marginBottom: 14,
  },
  input: {
    backgroundColor: 'rgba(13, 43, 69, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: Colors.ivory,
    fontSize: 15,
    fontFamily: Fonts.body,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    color: Colors.gold,
    fontSize: 10,
    fontFamily: Fonts.heading,
    letterSpacing: 0.8,
  },
  inputWithIcon: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  readOnlyField: {
    backgroundColor: 'rgba(13, 43, 69, 0.28)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingLeft: 46,
    paddingRight: 40,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.18)',
    minHeight: 48,
    justifyContent: 'center',
  },
  readOnlyText: {
    color: 'rgba(247, 243, 238, 0.85)',
    fontSize: 14,
    fontFamily: Fonts.body,
  },
  lockIcon: {
    position: 'absolute',
    right: 16,
  },

  /* Stepper UI */
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    flex: 1,
    backgroundColor: 'rgba(13, 43, 69, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    color: Colors.gold,
    fontSize: 17,
    fontFamily: Fonts.heading,
    textAlign: 'center',
    paddingVertical: 11,
  },

  /* Unit Toggle */
  unitToggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
    overflow: 'hidden',
  },
  unitToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unitToggleBtnActive: {
    backgroundColor: Colors.gold,
  },
  unitToggleText: {
    color: 'rgba(247, 243, 238, 0.6)',
    fontSize: 11,
    fontFamily: Fonts.heading,
  },
  unitToggleTextActive: {
    color: Colors.obsidian,
  },

  /* Chip Grid */
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
  },
  choiceChipActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
  },
  choiceChipText: {
    color: 'rgba(247, 243, 238, 0.8)',
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  choiceChipTextActive: {
    color: Colors.gold,
    fontFamily: Fonts.heading,
  },

  /* Protein Insight Card */
  proteinInsightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(201, 148, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.25)',
    marginTop: 6,
  },
  proteinInsightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proteinInsightTitle: {
    color: Colors.gold,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  proteinInsightSub: {
    color: 'rgba(247, 243, 238, 0.6)',
    fontSize: 11,
    fontFamily: Fonts.body,
    marginTop: 2,
  },

  /* Goals UI */
  goalListWrap: {
    gap: 8,
  },
  goalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.18)',
  },
  goalOptionCardActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
  },
  goalOptionTitle: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  goalOptionTitleActive: {
    color: Colors.gold,
  },
  goalOptionDesc: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 11,
    fontFamily: Fonts.body,
    marginTop: 3,
  },
  goalOptionDescActive: {
    color: 'rgba(247, 243, 238, 0.8)',
  },

  /* Days Selector */
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  dayPillText: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  dayPillTextActive: {
    color: Colors.obsidian,
  },

  /* Time Pills */
  timePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.2)',
  },
  timePillActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  timePillText: {
    color: Colors.ivory,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  timePillTextActive: {
    color: Colors.obsidian,
  },

  /* Places */
  placesList: {
    gap: 8,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.18)',
    gap: 12,
  },
  placeCardActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
  },
  placeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeIconCircleActive: {
    backgroundColor: 'rgba(201, 148, 58, 0.2)',
  },
  placeTitle: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  placeTitleActive: {
    color: Colors.gold,
  },
  placeDesc: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 11,
    fontFamily: Fonts.body,
    marginTop: 2,
  },

  /* Kit Chips */
  kitChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.18)',
  },
  kitChipActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
  },
  kitChipText: {
    color: 'rgba(247, 243, 238, 0.7)',
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  kitChipTextActive: {
    color: Colors.gold,
    fontFamily: Fonts.heading,
  },

  /* Activity cards */
  activityCard: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.18)',
  },
  activityCardActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
  },
  activityTitle: {
    color: Colors.ivory,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  activityTitleActive: {
    color: Colors.gold,
  },
  activityDesc: {
    color: 'rgba(247, 243, 238, 0.5)',
    fontSize: 10,
    fontFamily: Fonts.body,
    marginTop: 3,
  },

  /* Language Field */
  languageDropdownField: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    backgroundColor: 'rgba(13, 43, 69, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  languageIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageDropdownValue: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  languageDropdownSubtext: {
    color: Colors.gold,
    fontSize: 11,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  languageSavingText: {
    marginTop: 8,
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.3)',
    maxHeight: '80%',
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(181, 101, 29, 0.2)',
  },
  modalTitle: {
    color: Colors.ivory,
    fontSize: 18,
    fontFamily: Fonts.display,
  },
  modalSubtitle: {
    color: 'rgba(247, 243, 238, 0.6)',
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 3,
  },
  languageModalScroll: {
    marginTop: 4,
    marginBottom: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.15)',
    marginBottom: 8,
  },
  modalOptionActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
  },
  modalOptionText: {
    color: Colors.ivory,
    fontSize: 15,
    fontFamily: Fonts.heading,
  },
  modalOptionTextActive: {
    color: Colors.gold,
  },
  modalOptionSubtext: {
    color: 'rgba(247, 243, 238, 0.55)',
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  modalOptionSubtextActive: {
    color: Colors.gold,
  },

  /* Save CTA */
  saveBtn: {
    backgroundColor: Colors.gold,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: Colors.obsidian,
    fontSize: 14,
    fontFamily: Fonts.heading,
    letterSpacing: 1.5,
  },
});
