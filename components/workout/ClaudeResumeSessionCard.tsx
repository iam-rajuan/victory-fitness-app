import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';

interface ClaudeResumeSessionCardProps {
  sessionTitle?: string;
  sessionLine?: string;
  minutesLeft?: string;
  progressPct?: number;
  onResume?: () => void;
}

const NAVY = '#0D2B45';
const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeResumeSessionCard({
  sessionTitle = 'Upper Body Strength',
  sessionLine = 'exercise 3 of 7 · Strong at 45+ · week 2',
  minutesLeft = '18 min left',
  progressPct = 43,
  onResume,
}: ClaudeResumeSessionCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>PICK UP WHERE YOU LEFT OFF</Text>

      <Pressable style={styles.card} onPress={onResume}>
        {/* Top media container */}
        <View style={styles.mediaWrap}>
          {/* Big gold play circle */}
          <View style={styles.playCircle}>
            <View style={styles.playArrow} />
          </View>

          {/* Time remaining pill badge */}
          <Text style={styles.timeBadge}>{minutesLeft}</Text>

          {/* Bottom progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* Bottom details row */}
        <View style={styles.bottomRow}>
          <View style={styles.textCol}>
            <Text style={styles.title}>{sessionTitle}</Text>
            <Text style={styles.line}>{sessionLine}</Text>
          </View>

          <Pressable style={styles.resumeBtn} onPress={onResume}>
            <Text style={styles.resumeBtnText}>Resume</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.1)',
  },
  mediaWrap: {
    position: 'relative',
    height: 168,
    backgroundColor: OBSIDIAN,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 60,
    height: 60,
    borderRadius: 99,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 17,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 12,
    borderTopColor: 'transparent',
    borderBottomWidth: 12,
    borderBottomColor: 'transparent',
    marginLeft: 5,
  },
  timeBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: IVORY,
    backgroundColor: 'rgba(13, 13, 13, 0.78)',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(247, 243, 238, 0.18)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  bottomRow: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 19,
    fontWeight: '600',
    color: IVORY,
  },
  line: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 4,
  },
  resumeBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
