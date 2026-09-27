import React, { useState } from 'react';
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
import { createCoachSessionBooking } from '../../lib/api';

interface SlotItem {
  id: string;
  day: string;
  time: string;
  note: string;
}

interface ClaudeOneToOneBookingModalProps {
  visible: boolean;
  onClose: () => void;
  tierBadge?: string;
  userPhone?: string;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#5FC48E';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

function nextSlots(): SlotItem[] {
  const times = [
    { time: '18:30 - 18:55', note: 'Next available' },
    { time: '19:00 - 19:25', note: 'Popular' },
    { time: '08:00 - 08:25', note: 'Morning' },
    { time: '17:30 - 17:55', note: 'Evening' },
  ];
  const today = new Date();
  return times.map((item, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index + 1);
    return {
      id: `s${index + 1}`,
      day: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
      time: item.time,
      note: item.note,
    };
  });
}

export default function ClaudeOneToOneBookingModal({
  visible,
  onClose,
  tierBadge = 'PLATINUM',
  userPhone = '',
}: ClaudeOneToOneBookingModalProps) {
  const [talkMode, setTalkMode] = useState<'Zoom' | 'Phone'>('Zoom');
  const [selectedSlot, setSelectedSlot] = useState<string>('s1');
  const [saving, setSaving] = useState(false);
  const slots = nextSlots();

  const handleConfirm = async () => {
    const slot = slots.find((item) => item.id === selectedSlot) || slots[0];
    if (!slot || saving) return;
    setSaving(true);
    try {
      await createCoachSessionBooking({
        day: slot.day,
        time: slot.time,
        mode: talkMode,
        note: slot.note,
      });
      Alert.alert(
        'Session requested',
        `Your ${talkMode.toLowerCase()} session request for ${slot.day} at ${slot.time} was saved.`
      );
      onClose();
    } catch (error: any) {
      Alert.alert('Could not request session', error?.message || 'Please try again.');
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
          {/* Top Bar matching lines 2027-2030 */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>{tierBadge}</Text>
            </View>
          </View>

          <Text style={styles.kicker}>1-TO-1 WITH VICTOR · 25 MINUTES</Text>
          <Text style={styles.title}>Pick a slot</Text>
          <Text style={styles.sub}>
            Times are in your zone, CET. Once you confirm it lands in both calendars and you get the link — nobody has to chase anybody.
          </Text>

          {/* Mode Selector matching lines 2035-2038 */}
          <Text style={styles.sectionLabel}>HOW YOU WANT TO TALK</Text>
          <View style={styles.modesRow}>
            <TouchableOpacity
              style={[styles.modeBtn, talkMode === 'Zoom' && styles.modeBtnActive]}
              activeOpacity={0.8}
              onPress={() => setTalkMode('Zoom')}
            >
              <Text style={[styles.modeBtnText, talkMode === 'Zoom' && styles.modeBtnTextActive]}>
                Zoom video
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, talkMode === 'Phone' && styles.modeBtnActive]}
              activeOpacity={0.8}
              onPress={() => setTalkMode('Phone')}
            >
              <Text style={[styles.modeBtnText, talkMode === 'Phone' && styles.modeBtnTextActive]}>
                Phone call
              </Text>
            </TouchableOpacity>
          </View>

          {/* Slots List matching lines 2040-2050 */}
          <Text style={styles.sectionLabel}>NEXT AVAILABLE</Text>
          <View style={styles.slotsList}>
            {slots.map((s) => {
              const isSelected = selectedSlot === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.slotCard, isSelected && styles.slotCardActive]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedSlot(s.id)}
                >
                  <View style={[styles.radio, isSelected && styles.radioActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>

                  <View style={styles.slotTextCol}>
                    <Text style={styles.slotDay}>{s.day}</Text>
                    <Text style={styles.slotTime}>{s.time}</Text>
                  </View>

                  <Text style={[styles.slotTag, isSelected && styles.slotTagActive]}>
                    {s.note}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* What gets confirmed card matching lines 2052-2059 */}
          <View style={styles.confirmedCard}>
            <Text style={styles.confirmedKicker}>WHAT GETS CONFIRMED</Text>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Length</Text>
              <Text style={styles.confirmedVal}>25 minutes</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Where</Text>
              <Text style={styles.confirmedVal}>{talkMode === 'Zoom' ? 'Zoom link in invite' : 'Direct phone call'}</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Your number</Text>
              <Text style={styles.confirmedVal}>{userPhone || 'Not set'}</Text>
            </View>
            <View style={[styles.confirmedRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.confirmedLabel}>Calendar</Text>
              <Text style={[styles.confirmedVal, { color: GREEN }]}>Both, with the link</Text>
            </View>
          </View>

          {/* Brief teaser card matching lines 2060-2063 */}
          <View style={styles.briefNoticeCard}>
            <Text style={styles.briefNoticeTitle}>Victor reads your brief first</Text>
            <Text style={styles.briefNoticeSub}>
              Identity, unlock, trigger and four weeks of training, sent ahead — so the 25 minutes are not spent catching up.
            </Text>
          </View>

          {/* CTA matching line 2065 */}
          <TouchableOpacity
            style={styles.confirmBtn}
            activeOpacity={0.85}
            disabled={saving}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmBtnText}>{saving ? 'Saving...' : 'Confirm session'}</Text>
          </TouchableOpacity>

          <Text style={styles.cancelNotice}>
            Reschedule or cancel free up to 12 hours before. A reminder goes to your phone an hour ahead.
          </Text>
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
    marginBottom: 22,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  tierBadge: {
    backgroundColor: GOLD,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tierBadgeText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: '#0D0D0D',
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
    fontSize: 31,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 10,
  },
  sub: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 22,
  },
  sectionLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  modesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  modeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  modeBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  modeBtnTextActive: {
    color: '#0D0D0D',
  },
  slotsList: {
    gap: 8,
    marginBottom: 14,
  },
  slotCard: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotCardActive: {
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: GOLD,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: GOLD,
  },
  slotTextCol: {
    flex: 1,
  },
  slotDay: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '600',
    color: IVORY,
  },
  slotTime: {
    fontFamily: MONO,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  slotTag: {
    fontFamily: DMSANS,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.4)',
  },
  slotTagActive: {
    color: GOLD,
  },
  confirmedCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 18,
  },
  confirmedKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 12,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  confirmedLabel: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.7)',
  },
  confirmedVal: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: IVORY,
  },
  briefNoticeCard: {
    marginTop: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(181, 101, 29, 0.5)',
    borderRadius: 16,
    padding: 15,
  },
  briefNoticeTitle: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '600',
    color: IVORY,
  },
  briefNoticeSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.6)',
    marginTop: 3,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  confirmBtnText: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  cancelNotice: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 14,
  },
});
