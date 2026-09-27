import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ClaudeWearablesCardProps {
  onOpenWearables: () => void;
  connectedDevice?: string;
  restingBpm?: string;
  sleepAverage?: string;
  caloriesAverage?: string;
  syncMeta?: string;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeWearablesCard({
  onOpenWearables,
  connectedDevice = 'No wearable connected',
  restingBpm = '--',
  sleepAverage = '--',
  caloriesAverage = '--',
  syncMeta = 'Connect a device to sync health metrics',
}: ClaudeWearablesCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionKicker, { color: colors.textMuted }]}>YOUR HEALTH · LAST 4 WEEKS</Text>

      <View
        style={[
          styles.mainCard,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowColor: '#0D2B45',
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 14,
            elevation: 2,
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
      >
        {/* Metric Triplet matching lines 1163-1167 */}
        <View style={styles.tripletRow}>
          <View style={styles.tripletCol}>
            <Text style={[styles.tripletValue, { color: GREEN }]}>{restingBpm}</Text>
            <Text
              style={[
                styles.tripletLabel,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              RESTING BPM
            </Text>
            <Text
              style={[
                styles.tripletDelta,
                { color: isDark ? 'rgba(247, 243, 238, 0.4)' : 'rgba(13, 43, 69, 0.45)' },
              ]}
            >
              {syncMeta}
            </Text>
          </View>

          <View style={styles.tripletCol}>
            <Text style={[styles.tripletValue, { color: isDark ? IVORY : NAVY }]}>{sleepAverage}</Text>
            <Text
              style={[
                styles.tripletLabel,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              SLEEP AVG
            </Text>
            <Text
              style={[
                styles.tripletDelta,
                { color: isDark ? 'rgba(247, 243, 238, 0.4)' : 'rgba(13, 43, 69, 0.45)' },
              ]}
            >
              {syncMeta}
            </Text>
          </View>

          <View style={styles.tripletCol}>
            <Text style={[styles.tripletValue, { color: GOLD }]}>{caloriesAverage}</Text>
            <Text
              style={[
                styles.tripletLabel,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              KCAL / DAY
            </Text>
            <Text
              style={[
                styles.tripletDelta,
                { color: isDark ? 'rgba(247, 243, 238, 0.4)' : 'rgba(13, 43, 69, 0.45)' },
              ]}
            >
              {connectedDevice === 'No wearable connected' ? 'No device' : connectedDevice}
            </Text>
          </View>
        </View>

        {/* HR Zones Breakdown matching lines 1168-1174 */}
        <View
          style={[
            styles.zonesSection,
            { borderTopColor: isDark ? 'rgba(247, 243, 238, 0.12)' : 'rgba(13, 43, 69, 0.08)' },
          ]}
        >
          <Text style={styles.zonesKicker}>TIME IN HEART-RATE ZONES</Text>
          <View style={styles.zonesBar}>
            <View
              style={[
                styles.zoneSegment,
                { flex: 2, backgroundColor: isDark ? 'rgba(247,243,238,0.2)' : 'rgba(13,43,69,0.1)' },
              ]}
            />
            <View style={[styles.zoneSegment, { flex: 3, backgroundColor: GREEN }]} />
            <View style={[styles.zoneSegment, { flex: 4, backgroundColor: GOLD }]} />
            <View style={[styles.zoneSegment, { flex: 2, backgroundColor: COPPER }]} />
            <View style={[styles.zoneSegment, { flex: 1, backgroundColor: 'rgba(181,101,29,0.4)' }]} />
          </View>
          <Text
            style={[
              styles.zonesFootnote,
              { color: isDark ? 'rgba(247, 243, 238, 0.6)' : 'rgba(13, 43, 69, 0.65)' },
            ]}
          >
            Most of your work sits in zone 3. Your coach uses this to set next week's volume — you don't have to read it.
          </Text>
        </View>
      </View>

      {/* Device Sync Row matching lines 1176-1179 */}
      <TouchableOpacity
        style={[
          styles.deviceRow,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowColor: '#0D2B45',
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 14,
            elevation: 2,
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
        activeOpacity={0.7}
        onPress={onOpenWearables}
      >
        <View style={styles.deviceTextCol}>
          <Text style={[styles.deviceName, { color: isDark ? IVORY : NAVY }]}>{connectedDevice}</Text>
          <Text
            style={[
              styles.deviceMeta,
              { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
            ]}
          >
            Connected · syncs every workout
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  mainCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
  },
  tripletRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  tripletCol: {
    flex: 1,
  },
  tripletValue: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
  },
  tripletLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.6,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  tripletDelta: {
    fontFamily: MONO,
    fontSize: 10.5,
    color: 'rgba(247, 243, 238, 0.4)',
    marginTop: 2,
  },
  zonesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.12)',
    paddingTop: 14,
  },
  zonesKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.2,
    color: GOLD,
    marginBottom: 10,
  },
  zonesBar: {
    flexDirection: 'row',
    gap: 3,
    height: 10,
    borderRadius: 99,
    overflow: 'hidden',
  },
  zoneSegment: {
    height: '100%',
  },
  zonesFootnote: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.6)',
    marginTop: 10,
  },
  deviceRow: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  deviceTextCol: {
    flex: 1,
  },
  deviceName: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '600',
    color: IVORY,
  },
  deviceMeta: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
  chevron: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
  },
});
