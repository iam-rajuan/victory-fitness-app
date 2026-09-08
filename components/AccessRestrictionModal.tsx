import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import { useLanguage } from '../lib/i18n';
import { replaceRoute } from '../lib/navigation';

type AccessRestrictionModalProps = {
  visible: boolean;
  sectionName: string;
  onClose: () => void;
  onUpdatePlan?: () => void;
  onBackHome?: () => void;
};

export default function AccessRestrictionModal({
  visible,
  sectionName,
  onClose,
  onUpdatePlan,
  onBackHome,
}: AccessRestrictionModalProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const handleUpdatePlan = () => {
    onClose();
    if (onUpdatePlan) {
      onUpdatePlan();
      return;
    }

    router.push('/plan');
  };

  const handleBackHome = () => {
    onClose();
    if (onBackHome) {
      onBackHome();
      return;
    }

    replaceRoute(router, '/(tabs)');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="lock-closed" size={18} color={Colors.gold} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.72)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{t('Access Restricted')}</Text>
          <Text style={styles.message}>{t('Access restriction message', { sectionName })}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdatePlan} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t('Update Plan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackHome} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>{t('Back Home')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.obsidian,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: Colors.ivory,
    fontSize: 24,
    fontFamily: Fonts.display,
    marginBottom: 10,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.body,
  },
  actions: {
    gap: 12,
    marginTop: 24,
  },
  primaryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.obsidian,
    fontSize: 14,
    fontFamily: Fonts.heading,
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
  },
  secondaryBtnText: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
});
