import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
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
        ? me.preferred_language as LanguageCode
        : language;
      setPreferredLanguage(nextLanguage);
      return null;
    },
    getErrorMessage: () => t('Unable to load your profile right now.'),
  });

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
        quality: 0.9,
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
      <Stack.Screen options={{ 
        headerShown: true, 
        title: t('EDIT PROFILE'),
        headerTransparent: true,
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 2 } as any,
        headerLeft: () => (
          <TouchableOpacity onPress={() => goBackOrReplace(router, '/profile')} style={{ marginLeft: 8 }}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
        ),
      }} />

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
            >
              {uploadingImage ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
              <Ionicons name="camera" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={uploadingImage || deletingImage || loadingProfile || savingProfile}
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
              style={[styles.photoActionBtn, (uploadingImage || deletingImage || loadingProfile || savingProfile) && styles.photoActionBtnDisabled]}
              onPress={handleChangePhoto}
              disabled={uploadingImage || deletingImage || loadingProfile || savingProfile}
            >
              <Ionicons name="image-outline" size={16} color="#fff" />
              <Text style={styles.photoActionBtnText}>
                {profileImage ? t('Replace') : t('Upload')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.photoActionBtn,
                styles.photoDeleteBtn,
                (!profileImage || uploadingImage || deletingImage || loadingProfile || savingProfile) && styles.photoActionBtnDisabled,
              ]}
              onPress={handleDeletePhoto}
              disabled={!profileImage || uploadingImage || deletingImage || loadingProfile || savingProfile}
            >
              {deletingImage ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.photoActionBtnText}>{t('Delete')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('FULL NAME')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(val) => setName(val.replace(/[0-9]/g, ''))}
              placeholder={t('Your Name')}
              placeholderTextColor="rgba(255,255,255,0.2)"
              editable={!loadingProfile && !savingProfile}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('PREFERRED LANGUAGE')}</Text>
            <Text style={styles.helperText}>{t('Choose the language used across Victory Fitness.')}</Text>
            <View style={styles.languageGrid}>
              {SUPPORTED_LANGUAGES.map((option) => {
                const selected = preferredLanguage === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[styles.languageCard, selected && styles.languageCardActive]}
                    activeOpacity={0.82}
                    disabled={savingLanguage || savingProfile || loadingProfile}
                    onPress={() => void handleLanguageSelect(option.code)}
                  >
                    <View style={[styles.languageBadge, selected && styles.languageBadgeActive]}>
                      <Text style={[styles.languageBadgeText, selected && styles.languageBadgeTextActive]}>
                        {option.code.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.languageCopy}>
                      <Text style={[styles.languageLabel, selected && styles.languageLabelActive]}>{option.nativeLabel}</Text>
                      <Text style={styles.languageHint}>{t(option.label)}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            {savingLanguage ? <Text style={styles.languageSavingText}>{t('Saving language...')}</Text> : null}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (loadingProfile || savingProfile || uploadingImage || deletingImage) && styles.saveBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={loadingProfile || savingProfile || uploadingImage || deletingImage}
        >
          {savingProfile ? (
            <View style={styles.saveBtnRow}>
              <ActivityIndicator color="#000" />
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
    backgroundColor: '#1E1E1E',
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrap: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.accentBlue,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1E1E1E',
  },
  cameraBtnDisabled: {
    opacity: 0.8,
  },
  changePhotoText: {
    color: Colors.accentBlue,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
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
    minWidth: 118,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#13263A',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.34)',
  },
  photoDeleteBtn: {
    backgroundColor: '#30161A',
    borderColor: 'rgba(239,68,68,0.34)',
  },
  photoActionBtnDisabled: {
    opacity: 0.5,
  },
  photoActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  formSection: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  helperText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    marginBottom: 14,
  },
  languageGrid: {
    gap: 12,
  },
  languageCard: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  languageCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(20,184,166,0.14)',
  },
  languageBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  languageBadgeActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  languageBadgeText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  languageBadgeTextActive: {
    color: '#06111f',
  },
  languageCopy: {
    flex: 1,
  },
  languageLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  languageLabelActive: {
    color: '#DFFFFB',
  },
  languageHint: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.48)',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  languageSavingText: {
    marginTop: 10,
    color: Colors.primary,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    backgroundColor: '#131313',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    outlineStyle: 'none' as any,
  },
  saveBtn: {
    backgroundColor: Colors.accentBlue,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
});

