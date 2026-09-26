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
import RequirementAuditBoundary from '../audit/RequirementAuditBoundary';

interface DeviceItem {
  id: string;
  name: string;
  sub: string;
  connected: boolean;
}

interface ClaudeWearablesModalProps {
  visible: boolean;
  onClose: () => void;
  tierBadge?: string;
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

const INITIAL_DEVICES: DeviceItem[] = [
  { id: 'garmin', name: 'Garmin Connect', sub: 'Forerunner, Fenix, Epix, Venu', connected: true },
  { id: 'apple', name: 'Apple Health', sub: 'Apple Watch Series 4+, Ultra', connected: false },
  { id: 'whoop', name: 'WHOOP', sub: 'WHOOP 4.0 recovery and strain', connected: false },
  { id: 'oura', name: 'Oura Ring', sub: 'Gen 3 sleep and readiness', connected: false },
  { id: 'fitbit', name: 'Fitbit / Google', sub: 'Sense, Versa, Charge 5/6', connected: false },
  { id: 'polar', name: 'Polar Flow', sub: 'Vantage, Grit X, Ignite', connected: false },
];

export default function ClaudeWearablesModal({
  visible,
  onClose,
  tierBadge = 'PLATINUM',
}: ClaudeWearablesModalProps) {
  const [devices, setDevices] = useState<DeviceItem[]>(INITIAL_DEVICES);

  const toggleDevice = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const next = !d.connected;
          Alert.alert(
            next ? 'Connected' : 'Disconnected',
            `${d.name} ${next ? 'is now synced for workout heart-rate zones.' : 'has been disconnected.'}`
          );
          return { ...d, connected: next };
        }
        return d;
      })
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <RequirementAuditBoundary auditId="APP-EXTRA-012" status="extra" style={{ flex: 1 }}>
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Top Bar matching lines 1436-1439 */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.backBtnText}>← Profile</Text>
            </TouchableOpacity>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>{tierBadge}</Text>
            </View>
          </View>

          <Text style={styles.title}>Your watch, doing something useful</Text>
          <Text style={styles.sub}>
            Connect one device. We read four numbers from it, and they change your training rather than sitting in a chart.
          </Text>

          {/* Device Sync Cards matching lines 1442-1449 */}
          <View style={styles.devicesCard}>
            {devices.map((d, i) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.deviceRow, i < devices.length - 1 && styles.deviceRowBorder]}
                activeOpacity={0.8}
                onPress={() => toggleDevice(d.id)}
              >
                <View style={styles.deviceTextCol}>
                  <Text style={styles.deviceName}>{d.name}</Text>
                  <Text style={styles.deviceSub}>{d.sub}</Text>
                </View>

                <View style={[styles.pill, d.connected ? styles.pillConnected : styles.pillConnect]}>
                  <Text
                    style={[
                      styles.pillText,
                      d.connected ? styles.pillTextConnected : styles.pillTextConnect,
                    ]}
                  >
                    {d.connected ? 'Connected' : 'Connect'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* What we read and what it does matching lines 1450-1456 */}
          <Text style={styles.sectionKicker}>WHAT WE READ, AND WHAT IT DOES</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoTitle}>Resting heart rate</Text>
              <Text style={styles.infoSub}>
                Trends on your health card. A jump tells your coach to back off.
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoTitle}>Sleep hours and quality</Text>
              <Text style={styles.infoSub}>
                Goes into your coach's context. Five hours' sleep and today's session gets lighter on its own.
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoTitle}>Calories burned</Text>
              <Text style={styles.infoSub}>
                Sits beside your intake so the protein target stays honest.
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoTitle}>Workout heart-rate zones</Text>
              <Text style={styles.infoSub}>
                Live during the session, and it feeds the difficulty engine afterwards.
              </Text>
            </View>
          </View>

          <Text style={styles.disclaimerFootnote}>
            Health data stays in your account, is never shown to your partner or your circle, and can be disconnected and deleted in one tap.
          </Text>
        </ScrollView>
      </View>
    </RequirementAuditBoundary>
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
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 22,
  },
  devicesCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  deviceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  deviceTextCol: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    fontFamily: DMSANS,
    fontSize: 15.5,
    fontWeight: '600',
    color: IVORY,
  },
  deviceSub: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 2,
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillConnected: {
    backgroundColor: 'rgba(26, 122, 74, 0.2)',
  },
  pillConnect: {
    backgroundColor: 'rgba(247, 243, 238, 0.08)',
  },
  pillText: {
    fontFamily: DMSANS,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextConnected: {
    color: GREEN,
  },
  pillTextConnect: {
    color: GOLD,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
  },
  infoRow: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  infoTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
  },
  infoSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  disclaimerFootnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 16,
  },
});
