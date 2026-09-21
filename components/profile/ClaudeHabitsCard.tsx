import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';

interface ClaudeHabitsCardProps {
  identity?: string;
  unlock?: string;
  trigger?: string;
  triggerUsage?: string;
  partnerTitle?: string;
  partnerNote?: string;
  isSilver?: boolean;
  onOpenDuo: () => void;
  onUpgrade: () => void;
  onSaveHabits?: (habits: { identity: string; unlock: string; trigger: string }) => void;
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

export default function ClaudeHabitsCard({
  identity = '“I am someone who trains even when it is hard.”',
  unlock = 'My true-crime podcast — only while I train',
  trigger = 'After the kids are in bed, I open the app and start.',
  triggerUsage = 'used on 3 of 4 sessions this week',
  partnerTitle = 'Anna is your partner',
  partnerNote = 'She trained today. You both did.',
  isSilver = false,
  onOpenDuo,
  onUpgrade,
  onSaveHabits,
}: ClaudeHabitsCardProps) {
  const [editing, setEditing] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState(identity);
  const [currentUnlock, setCurrentUnlock] = useState(unlock);
  const [currentTrigger, setCurrentTrigger] = useState(trigger);

  const handleSave = () => {
    setEditing(false);
    if (onSaveHabits) {
      onSaveHabits({
        identity: currentIdentity,
        unlock: currentUnlock,
        trigger: currentTrigger,
      });
    }
    Alert.alert('Habits Saved', 'Your 4 habit fields have been updated.');
  };

  if (isSilver) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionKicker}>MY HABITS</Text>
        <View style={styles.duoCard}>
          <TouchableOpacity style={styles.itemRow} activeOpacity={0.7} onPress={onOpenDuo}>
            <View style={styles.dotGreen} />
            <View style={styles.itemTextCol}>
              <Text style={styles.itemTitle}>{partnerTitle}</Text>
              <Text style={styles.itemSub}>{partnerNote}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.upgradeTeaserCard} activeOpacity={0.85} onPress={onUpgrade}>
          <Text style={styles.upgradeTeaserTitle}>Identity statement, unlock and trigger</Text>
          <Text style={styles.upgradeTeaserSub}>
            The three personal habit fields arrive with Gold. Your partner and network count stay on Silver.
          </Text>
          <Text style={styles.upgradeLink}>See what Gold adds ›</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionKicker}>MY HABITS</Text>
        <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.7}>
          <Text style={styles.editLink}>Edit fields</Text>
        </TouchableOpacity>
      </View>

      {/* WHO I'M BECOMING Card matching lines 1188-1191 */}
      <View style={styles.identityCard}>
        <Text style={styles.fieldKicker}>WHO I'M BECOMING</Text>
        <Text style={styles.identityStatement}>{currentIdentity}</Text>
      </View>

      {/* Unlock, Trigger, and Duo Cards matching lines 1192-1196 */}
      <View style={styles.habitsBlock}>
        {/* UNLOCK */}
        <View style={styles.habitRow}>
          <Text style={styles.fieldKicker}>MY UNLOCK</Text>
          <Text style={styles.habitValue}>{currentUnlock}</Text>
        </View>

        {/* TRIGGER + Trigger usage counter matching line 1194 */}
        <View style={styles.habitRow}>
          <Text style={styles.fieldKicker}>MY TRIGGER</Text>
          <Text style={styles.habitValue}>{currentTrigger}</Text>
          <Text style={styles.triggerUsageText}>{triggerUsage}</Text>
        </View>

        {/* ACCOUNTABILITY DUO ROW */}
        <TouchableOpacity style={styles.duoRow} activeOpacity={0.7} onPress={onOpenDuo}>
          <View style={styles.dotGreen} />
          <View style={styles.itemTextCol}>
            <Text style={styles.itemTitle}>{partnerTitle}</Text>
            <Text style={styles.itemSub}>{partnerNote}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Habits Modal */}
      <Modal visible={editing} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditing(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Habit Fields</Text>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WHO I'M BECOMING (IDENTITY)</Text>
              <TextInput
                style={styles.modalInput}
                value={currentIdentity}
                onChangeText={setCurrentIdentity}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MY UNLOCK (REWARD ONLY WHILE TRAINING)</Text>
              <TextInput
                style={styles.modalInput}
                value={currentUnlock}
                onChangeText={setCurrentUnlock}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>MY TRIGGER (ANCHOR HABIT)</Text>
              <TextInput
                style={styles.modalInput}
                value={currentTrigger}
                onChangeText={setCurrentTrigger}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
  },
  editLink: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
  },
  identityCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  fieldKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.2,
    color: GOLD,
    marginBottom: 6,
  },
  identityStatement: {
    fontFamily: CLASH,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '600',
    color: IVORY,
  },
  habitsBlock: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  habitRow: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  habitValue: {
    fontFamily: DMSANS,
    fontSize: 15,
    lineHeight: 21,
    color: IVORY,
  },
  triggerUsageText: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 5,
  },
  duoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  duoCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  itemSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  chevron: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
  upgradeTeaserCard: {
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.16)',
    borderRadius: 18,
    padding: 16,
  },
  upgradeTeaserTitle: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  upgradeTeaserSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 4,
  },
  upgradeLink: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: Platform.OS === 'web' ? 24 : 54,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  modalCancel: {
    fontFamily: DMSANS,
    fontSize: 14,
    color: 'rgba(247, 243, 238, 0.6)',
  },
  modalTitle: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: IVORY,
  },
  modalSave: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
  modalBody: {
    padding: 20,
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.1,
    color: GOLD,
  },
  modalInput: {
    backgroundColor: NAVY,
    borderRadius: 12,
    padding: 14,
    color: IVORY,
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 20,
  },
});
