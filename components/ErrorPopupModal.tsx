import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import { useLanguage } from '../lib/i18n';

type ErrorPopupModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorPopupModal({
  visible,
  title,
  message,
  onClose,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorPopupModalProps) {
  const { t } = useLanguage();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle" size={28} color={Colors.accentDanger} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {onRetry ? (
              <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={onRetry} activeOpacity={0.85}>
                <Text style={styles.retryText}>{t(retryLabel)}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.closeText}>{t('OK')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.obsidian,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: Colors.ivory,
    fontSize: 20,
    fontFamily: Fonts.display,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.body,
    textAlign: 'center',
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    minWidth: 108,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.35)',
  },
  retryText: {
    color: Colors.ivory,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
  closeButton: {
    backgroundColor: Colors.gold,
  },
  closeText: {
    color: Colors.obsidian,
    fontSize: 14,
    fontFamily: Fonts.heading,
  },
});
