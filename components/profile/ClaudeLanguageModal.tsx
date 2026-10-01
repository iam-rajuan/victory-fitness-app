import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUPPORTED_LANGUAGES, LanguageCode, useLanguage } from '../../lib/i18n';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeLanguageModalProps {
  visible: boolean;
  onClose: () => void;
  currentLanguage: LanguageCode;
  onSelectLanguage: (code: LanguageCode) => Promise<void> | void;
  isSaving?: boolean;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

// Popular quick selection languages
const POPULAR_CODES = new Set(['en', 'de', 'es', 'fr', 'it', 'pt', 'bn', 'nl']);

export default function ClaudeLanguageModal({
  visible,
  onClose,
  currentLanguage,
  onSelectLanguage,
  isSaving = false,
}: ClaudeLanguageModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPendingCode, setSelectedPendingCode] = useState<LanguageCode | null>(null);

  const query = searchQuery.trim().toLowerCase();

  const filteredLanguages = useMemo(() => {
    if (!query) {
      return SUPPORTED_LANGUAGES;
    }
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.label.toLowerCase().includes(query) ||
        lang.nativeLabel.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [query]);

  const handleSelect = async (code: LanguageCode) => {
    if (isSaving) return;
    setSelectedPendingCode(code);
    try {
      await onSelectLanguage(code);
      setSearchQuery('');
      onClose();
    } finally {
      setSelectedPendingCode(null);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? '#111A24' : '#FFFFFF',
              borderColor: isDark ? 'rgba(201, 148, 58, 0.25)' : 'rgba(13, 43, 69, 0.15)',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <View style={styles.headerTitles}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('Select language')}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {t('Scroll and select your preferred language')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.06)' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: isDark ? 'rgba(247, 243, 238, 0.05)' : 'rgba(13, 43, 69, 0.04)',
                borderColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.12)',
              },
            ]}
          >
            <Ionicons name="search-outline" size={17} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('Search language...')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Languages List */}
          <ScrollView
            showsVerticalScrollIndicator={true}
            style={styles.languageList}
            contentContainerStyle={styles.languageListContent}
            keyboardShouldPersistTaps="handled"
          >
            {filteredLanguages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="globe-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {t('No languages match your search.')}
                </Text>
              </View>
            ) : (
              filteredLanguages.map((option) => {
                const isSelected = (currentLanguage || 'en').toLowerCase() === option.code.toLowerCase();
                const isItemSaving = selectedPendingCode === option.code;

                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[
                      styles.langOption,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(201, 148, 58, 0.15)'
                            : 'rgba(201, 148, 58, 0.12)'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(13, 43, 69, 0.03)',
                        borderColor: isSelected
                          ? GOLD
                          : isDark
                          ? 'rgba(247, 243, 238, 0.08)'
                          : 'rgba(13, 43, 69, 0.08)',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelect(option.code)}
                    disabled={isSaving}
                  >
                    <View style={styles.langTextCol}>
                      <View style={styles.langNameRow}>
                        <Text
                          style={[
                            styles.nativeLabel,
                            {
                              color: isSelected ? (isDark ? GOLD : COPPER) : colors.text,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {option.nativeLabel}
                        </Text>
                        <Text
                          style={[
                            styles.codeBadge,
                            {
                              color: isSelected ? GOLD : colors.textMuted,
                              backgroundColor: isSelected
                                ? 'rgba(201, 148, 58, 0.2)'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.06)'
                                : 'rgba(13, 43, 69, 0.06)',
                            },
                          ]}
                        >
                          {option.code.toUpperCase()}
                        </Text>
                      </View>
                      {option.label !== option.nativeLabel && (
                        <Text style={[styles.englishLabel, { color: colors.textSecondary }]}>
                          {option.label}
                        </Text>
                      )}
                    </View>

                    <View style={styles.checkCol}>
                      {isItemSaving ? (
                        <ActivityIndicator size="small" color={GOLD} />
                      ) : isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={GOLD} />
                      ) : (
                        <View
                          style={[
                            styles.unselectedCircle,
                            { borderColor: isDark ? 'rgba(247, 243, 238, 0.2)' : 'rgba(13, 43, 69, 0.2)' },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer note */}
          <View style={[styles.modalFooter, { borderTopColor: colors.divider }]}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {filteredLanguages.length} {t('supported languages')}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitles: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontFamily: DMSANS,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontFamily: INTER,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 14,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  languageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  languageListContent: {
    paddingVertical: 6,
    gap: 7,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.2,
  },
  langTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  langNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeLabel: {
    fontFamily: DMSANS,
    fontSize: 15,
  },
  codeBadge: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    letterSpacing: 0.5,
  },
  englishLabel: {
    fontFamily: INTER,
    fontSize: 12,
    marginTop: 2,
  },
  checkCol: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  emptyState: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: INTER,
    fontSize: 13,
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
