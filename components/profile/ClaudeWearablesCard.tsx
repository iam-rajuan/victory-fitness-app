import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';

interface ClaudeWearablesCardProps {
  onOpenWearables: () => void;
  connectedDevice?: string;
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
  connectedDevice = 'Garmin Forerunner 965',
}: ClaudeWearablesCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionKicker}>YOUR HEALTH · LAST 4 WEEKS</Text>

      <View style={styles.mainCard}>
        {/* Metric Triplet matching lines 1163-1167 */}
        <View style={styles.tripletRow}>
          <View style={styles.tripletCol}>
            <Text style={[styles.tripletValue, { color: GREEN }]}>54</Text>
            <Text style={styles.tripletLabel}>RESTING BPM</Text>
            <Text style={styles.tripletDelta}>−3 in 4 weeks</Text>
          </View>

          <View style={styles.tripletCol}>
            <Text style={[styles.tripletValue, { color: IVORY }]}>6:48</Text>
            <Text style={styles.tripletLabel}>SLEEP AVG</Text>
            <Text style={styles.tripletDelta}>72% quality</Text>
          </View>

          <View style={styles.tripletCol}>
            <Text style={[styles.tripletValue, { color: GOLD }]}>2 410</Text>
            <Text style={styles.tripletLabel}>KCAL / DAY</Text>
            <Text style={styles.tripletDelta}>Garmin</Text>
          </View>
        </View>

        {/* HR Zones Breakdown matching lines 1168-1174 */}
        <View style={styles.zonesSection}>
          <Text style={styles.zonesKicker}>TIME IN HEART-RATE ZONES</Text>
          <View style={styles.zonesBar}>
            <View style={[styles.zoneSegment, { flex: 2, backgroundColor: 'rgba(247,243,238,0.2)' }]} />
            <View style={[styles.zoneSegment, { flex: 3, backgroundColor: GREEN }]} />
            <View style={[styles.zoneSegment, { flex: 4, backgroundColor: GOLD }]} />
            <View style={[styles.zoneSegment, { flex: 2, backgroundColor: COPPER }]} />
            <View style={[styles.zoneSegment, { flex: 1, backgroundColor: 'rgba(181,101,29,0.4)' }]} />
          </View>
          <Text style={styles.zonesFootnote}>
            Most of your work sits in zone 3. Your coach uses this to set next week's volume — you don't have to read it.
          </Text>
        </View>
      </View>

      {/* Device Sync Row matching lines 1176-1179 */}
      <TouchableOpacity style={styles.deviceRow} activeOpacity={0.7} onPress={onOpenWearables}>
        <View style={styles.deviceTextCol}>
          <Text style={styles.deviceName}>{connectedDevice}</Text>
          <Text style={styles.deviceMeta}>Connected · syncs every workout</Text>
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
