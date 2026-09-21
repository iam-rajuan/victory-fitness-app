import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';

interface ClaudeHabitDigestModalProps {
  visible: boolean;
  onClose: () => void;
  onBookHumanSession: () => void;
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

export default function ClaudeHabitDigestModal({
  visible,
  onClose,
  onBookHumanSession,
}: ClaudeHabitDigestModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar matching lines 1252-1255 */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← Profile</Text>
            </TouchableOpacity>
            <Text style={styles.dateMono}>MONDAY, 08:00</Text>
          </View>

          <Text style={styles.kicker}>WEEKLY DIGEST · PLATINUM</Text>
          <Text style={styles.title}>Your week, in your own words</Text>

          {/* Identity & Habits Reflection matching lines 1258-1261 */}
          <View style={styles.reflectionCard}>
            <Text style={styles.identityQuote}>
              “I am someone who trains even when it is hard.”
            </Text>
            <Text style={styles.reflectionBody}>
              This week you trained 4 times. Your trigger is “after the kids are in bed” — you used it on 3 of those 4 days. Your unlock, the true-crime podcast, was waiting each time.
            </Text>
          </View>

          {/* Consistency Bar Chart matching lines 1262-1270 */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Habit consistency</Text>
              <Text style={styles.chartValue}>75% of trigger days</Text>
            </View>

            <View style={styles.barsRow}>
              <View style={styles.barCol}>
                <View style={[styles.barFill, { height: 30, backgroundColor: 'rgba(247,243,238,0.2)' }]} />
                <Text style={styles.barLabel}>W1</Text>
              </View>

              <View style={styles.barCol}>
                <View style={[styles.barFill, { height: 42, backgroundColor: 'rgba(247,243,238,0.34)' }]} />
                <Text style={styles.barLabel}>W2</Text>
              </View>

              <View style={styles.barCol}>
                <View style={[styles.barFill, { height: 38, backgroundColor: 'rgba(247,243,238,0.34)' }]} />
                <Text style={styles.barLabel}>W3</Text>
              </View>

              <View style={styles.barCol}>
                <View style={[styles.barFill, { height: 56, backgroundColor: GOLD }]} />
                <Text style={[styles.barLabel, { color: GOLD, fontWeight: '700' }]}>W4</Text>
              </View>
            </View>
          </View>

          {/* Monthly 1-to-1 Session Card matching lines 1271-1276 */}
          <View style={styles.bookingCard}>
            <Text style={styles.bookingKicker}>MONTHLY 1-TO-1 INCLUDED</Text>
            <Text style={styles.bookingTitle}>Book this month's call with Victor</Text>
            <Text style={styles.bookingNote}>
              25 minutes. He reads your 4 weeks of habit logs before jumping on the call.
            </Text>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.85}
              onPress={onBookHumanSession}
            >
              <Text style={styles.bookBtnText}>Book my session</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 26,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  dateMono: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.5)',
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
    lineHeight: 33,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 20,
  },
  reflectionCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    marginBottom: 14,
  },
  identityQuote: {
    fontFamily: CLASH,
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 14,
  },
  reflectionBody: {
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 25,
    color: 'rgba(247, 243, 238, 0.85)',
  },
  chartCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartTitle: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '600',
    color: IVORY,
  },
  chartValue: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    height: 66,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.5)',
  },
  bookingCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 20,
  },
  bookingKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 10,
  },
  bookingTitle: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 4,
  },
  bookingNote: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(247, 243, 238, 0.6)',
  },
  bookBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  bookBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0D0D0D',
  },
});
