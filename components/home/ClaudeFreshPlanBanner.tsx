import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';

interface ClaudeFreshPlanBannerProps {
  visible: boolean;
  line: string;
  onDismiss: () => void;
}

const NAVY = '#0D2B45';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudeFreshPlanBanner({
  visible,
  line,
  onDismiss,
}: ClaudeFreshPlanBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Green Checkmark Circle */}
        <View style={styles.checkCircle}>
          <View style={styles.checkTick} />
        </View>

        {/* Text Content */}
        <View style={styles.textWrap}>
          <Text style={styles.title}>Your plan is ready — six weeks</Text>
          <Text style={styles.subtitle}>{line}</Text>
        </View>

        {/* Dismiss Button */}
        <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 99,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkTick: {
    width: 9,
    height: 5,
    borderLeftWidth: 2,
    borderLeftColor: IVORY,
    borderBottomWidth: 2,
    borderBottomColor: IVORY,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
  },
  subtitle: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.62)',
    marginTop: 3,
  },
  closeBtn: {
    flexShrink: 0,
    paddingLeft: 4,
  },
  closeText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
});
