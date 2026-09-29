import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';

interface ClaudeNotificationPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  pushEnabled?: boolean;
  whatsappEnabled?: boolean;
  emailEnabled?: boolean;
  nudgeTime?: string;
  templates?: Array<{ type: string; title: string; enabled: boolean; approved: boolean; channels: string[] }>;
  contactNumber?: string | null;
  countryCode?: string | null;
  onSave?: (preferences: {
    pushEnabled: boolean;
    whatsappEnabled: boolean;
    emailEnabled: boolean;
    nudgeTime: string;
    templates?: Array<{ type: string; enabled: boolean }>;
  }) => void | Promise<void>;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeNotificationPreferencesModal({
  visible,
  onClose,
  pushEnabled: initialPushEnabled = true,
  whatsappEnabled: initialWhatsappEnabled = false,
  emailEnabled: initialEmailEnabled = false,
  nudgeTime: initialNudgeTime = '20:30',
  templates: initialTemplates = [],
  contactNumber,
  countryCode,
  onSave,
}: ClaudeNotificationPreferencesModalProps) {
  const [pushEnabled, setPushEnabled] = useState(initialPushEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialWhatsappEnabled);
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [nudgeTime, setNudgeTime] = useState(initialNudgeTime);
  const [templateStates, setTemplateStates] = useState(initialTemplates);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPushEnabled(initialPushEnabled);
    setWhatsappEnabled(initialWhatsappEnabled);
    setEmailEnabled(initialEmailEnabled);
    setNudgeTime(initialNudgeTime || '20:30');
    setTemplateStates(initialTemplates);
  }, [initialEmailEnabled, initialNudgeTime, initialPushEnabled, initialTemplates, initialWhatsappEnabled, visible]);

  const toggleTemplate = (type: string) => {
    setTemplateStates((prev) =>
      prev.map((item) => item.type === type ? { ...item, enabled: !item.enabled } : item)
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave?.({
        pushEnabled,
        whatsappEnabled,
        emailEnabled,
        nudgeTime,
        templates: templateStates.map((item) => ({ type: item.type, enabled: item.enabled })),
      });
      Alert.alert('Preferences saved', 'Your reminder channels have been updated.');
      onClose();
    } catch (error: any) {
      Alert.alert('Could not save preferences', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar matching line 2072-2075 */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← Profile</Text>
            </TouchableOpacity>
            <View style={styles.statePill}>
              <Text style={styles.statePillText}>ACTIVE</Text>
            </View>
          </View>

          <Text style={styles.kicker}>REMINDERS</Text>
          <Text style={styles.title}>How we reach you</Text>
          <Text style={styles.sub}>
            A single evening nudge if your daily session has not been logged. No generic motivation spam.
          </Text>

          {/* CHANNELS matching lines 2080-2083 */}
          <Text style={styles.sectionLabel}>CHANNELS · PICK ONE OR ALL</Text>
          <View style={styles.channelsRow}>
            <TouchableOpacity
              style={[styles.channelChip, pushEnabled && styles.channelChipActive]}
              activeOpacity={0.8}
              onPress={() => setPushEnabled((prev) => !prev)}
            >
              <Text style={[styles.channelChipText, pushEnabled && styles.channelChipTextActive]}>
                Push {pushEnabled ? '✓' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelChip, whatsappEnabled && styles.channelChipActive]}
              activeOpacity={0.8}
              onPress={() => setWhatsappEnabled((prev) => !prev)}
            >
              <Text style={[styles.channelChipText, whatsappEnabled && styles.channelChipTextActive]}>
                WhatsApp {whatsappEnabled ? '✓' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelChip, emailEnabled && styles.channelChipActive]}
              activeOpacity={0.8}
              onPress={() => setEmailEnabled((prev) => !prev)}
            >
              <Text style={[styles.channelChipText, emailEnabled && styles.channelChipTextActive]}>
                Email {emailEnabled ? '✓' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* WhatsApp Number Card matching lines 2085-2093 */}
          {whatsappEnabled && (
            <View style={styles.waCard}>
              <Text style={styles.waKicker}>WHATSAPP NUMBER</Text>
              <View style={styles.waRow}>
                <Text style={styles.waCountryCode}>{countryCode ? countryCode.toUpperCase() : 'WA'}</Text>
                <Text style={styles.waNumber}>{contactNumber || 'No WhatsApp number set'}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => Alert.alert('Change Number', 'Update your phone number in account settings.')}
                >
                  <Text style={styles.waChangeBtn}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.waNote}>
                Country code from your region. Set in your profile.
              </Text>
            </View>
          )}

          <Text style={styles.channelFootnote}>
            Nudges include your accountability partner's status when they've trained.
          </Text>

          {templateStates.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>WHAT YOU WANT TO RECEIVE</Text>
              <View style={styles.templateList}>
                {templateStates.map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={styles.templateRow}
                    activeOpacity={0.82}
                    onPress={() => toggleTemplate(item.type)}
                  >
                    <View style={styles.templateTextCol}>
                      <Text style={styles.templateTitle}>{item.title}</Text>
                      <Text style={styles.templateMeta}>
                        {(item.channels || []).join(' · ') || 'Push'} · {item.approved ? 'available' : 'silent until approved'}
                      </Text>
                    </View>
                    <View style={[styles.templateSwitch, item.enabled && styles.templateSwitchOn]}>
                      <Text style={[styles.templateSwitchText, item.enabled && styles.templateSwitchTextOn]}>
                        {item.enabled ? 'On' : 'Off'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* WHEN matching lines 2097-2105 */}
          <Text style={styles.sectionLabel}>WHEN</Text>
          <View style={styles.whenCard}>
            <View style={styles.whenRow}>
              <View style={styles.whenTextCol}>
                <Text style={styles.whenTitle}>Evening nudge</Text>
                <Text style={styles.whenNote}>Only sent if you haven't trained by this time</Text>
              </View>
              <Text style={styles.whenTime}>{nudgeTime}</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} activeOpacity={0.85} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save preferences'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 36 : 64,
    paddingBottom: 96,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  statePill: {
    backgroundColor: 'rgba(26, 122, 74, 0.2)',
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statePillText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: GREEN,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.6,
    color: COPPER,
    marginBottom: 10,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 10,
  },
  sub: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.62)',
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.45)',
    marginBottom: 10,
  },
  channelsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  channelChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
  },
  channelChipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  channelChipText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  channelChipTextActive: {
    color: '#0D0D0D',
  },
  waCard: {
    backgroundColor: NAVY,
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
  },
  waKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: 'rgba(247, 243, 238, 0.5)',
    marginBottom: 6,
  },
  waRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waCountryCode: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  waNumber: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '500',
    color: IVORY,
  },
  waChangeBtn: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  waNote: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 8,
  },
  channelFootnote: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.5)',
    marginBottom: 22,
  },
  templateList: {
    backgroundColor: NAVY,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 22,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  templateTextCol: {
    flex: 1,
    minWidth: 0,
  },
  templateTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: IVORY,
  },
  templateMeta: {
    fontFamily: MONO,
    fontSize: 10.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  templateSwitch: {
    minWidth: 48,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateSwitchOn: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  templateSwitchText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.65)',
  },
  templateSwitchTextOn: {
    color: '#0D0D0D',
  },
  whenCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 17,
    marginBottom: 24,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  whenTextCol: {
    flex: 1,
  },
  whenTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  whenNote: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  whenTime: {
    fontFamily: MONO,
    fontSize: 17,
    fontWeight: '700',
    color: GOLD,
  },
  saveBtn: {
    height: 50,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: '#0D0D0D',
  },
});
