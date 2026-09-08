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
import { deleteCurrentUserProfileImage, fetchCurrentUser, updateCurrentUserProfile, uploadCurrentUserProfileImage } from '../../lib/api';
import { formatAppError } from '../../lib/error';
import { SUPPORTED_LANGUAGES, LanguageCode, useLanguage } from '../../lib/i18n';
import { useAsyncScreenData } from '../../hooks/useAsyncScreenData';
import { goBackOrReplace } from '../../lib/navigation';

export default function EditProfileScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>(language);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
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
      const me = await fetchCurrentUser();
      setName(me.name ?? '');
      setProfileImage(me.profileImage ?? '');
      const nextLanguage = SUPPORTED_LANGUAGES.some((option) => option.code === me.preferred_language)
        ? (me.preferred_language as LanguageCode)
        : language;
      setPreferredLanguage(nextLanguage);
      return null;
    },
    getErrorMessage: () => t('Unable to load your profile right now.'),
  });

  const currentLanguageObj = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === preferredLanguage) || SUPPORTED_LANGUAGES[0];
  }, [preferredLanguage]);

  const handleSave = async () => {
    if (savingProfile || uploadingImage || deletingImage) {
      return;
    }

    setSavingProfile(true);
    try {
      await updateCurrentUserProfile({
        name: name.trim(),
        profileImage: profileImage.trim() || undefined,
        preferred_language: preferredLanguage,
      });
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

      {/* Language Selection Modal (Identical to Onboarding Design) */}
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

            <TouchableOpacity
              onPress={handleChangePhoto}
              disabled={uploadingImage || deletingImage || loadingProfile || savingProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.changePhotoText}>
                {uploadingImage
                  ? t('Uploading photo...')
                  : profileImage
                    ? t('Update Profile Photo')
                    : t('Upload Profile Photo')}
              </Text>
            </TouchableOpacity>

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
                  {profileImage ? t('Replace') : t('Upload')}
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

          {/* Form Section */}
          <View style={styles.formSection}>
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

            {/* Preferred Language - Onboarding Dropdown Style */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('PREFERRED LANGUAGE')}</Text>
              <Text style={styles.helperText}>{t('Choose the language used across Victory Fitness.')}</Text>

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

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, (loadingProfile || savingProfile || uploadingImage || deletingImage) && styles.saveBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={loadingProfile || savingProfile || uploadingImage || deletingImage}
          >
            {savingProfile ? (
              <View style={styles.saveBtnRow}>
                <ActivityIndicator color={Colors.obsidian} />
                <Text style={styles.saveBtnText}>{t('SAVING...')}</Text>
              </View>
            ) : (
              <Text style={styles.saveBtnText}>{loadingProfile ? t('LOADING...') : t('SAVE CHANGES')}</Text>
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
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrap: {
    position: 'relative',
    width: 110,
    height: 110,
    marginBottom: 14,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    borderColor: 'rgba(181, 101, 29, 0.45)',
    backgroundColor: Colors.surfaceCard,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.obsidian,
  },
  cameraBtnDisabled: {
    opacity: 0.8,
  },
  changePhotoText: {
    color: Colors.gold,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  photoActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 110,
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
  formSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    color: Colors.copper,
    fontSize: 11,
    fontFamily: Fonts.heading,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  helperText: {
    color: 'rgba(247, 243, 238, 0.58)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.body,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(13, 43, 69, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.ivory,
    fontSize: 15,
    fontFamily: Fonts.body,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    outlineStyle: 'none' as any,
  },
  languageDropdownField: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    backgroundColor: 'rgba(13, 43, 69, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201, 148, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageDropdownValue: {
    color: Colors.ivory,
    fontSize: 15,
    fontFamily: Fonts.heading,
  },
  languageDropdownSubtext: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  languageSavingText: {
    marginTop: 8,
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.heading,
  },

  /* Language Modal Styles */
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
