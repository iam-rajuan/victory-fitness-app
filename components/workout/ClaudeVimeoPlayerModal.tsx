import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';

interface ChapterItem {
  at: string;
  n: string;
  active?: boolean;
}

interface ClaudeVimeoPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  workoutTitle?: string;
  workoutMeta?: string;
  workoutDesc?: string;
  vimeoId?: string;
  chapters?: ChapterItem[];
  onFinishSession: () => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const DEFAULT_CHAPTERS: ChapterItem[] = [
  { at: '00:00', n: 'Warm-up: Rotators & Thoracic spine', active: true },
  { at: '04:15', n: 'Block 1: Overhead Press & Single-Arm Row' },
  { at: '16:30', n: 'Block 2: Lateral Raises & Face Pulls' },
  { at: '28:10', n: 'Finisher: Hollow Hold & Dead Bug' },
  { at: '36:00', n: 'Cooldown & Decompression' },
];

export default function ClaudeVimeoPlayerModal({
  visible,
  onClose,
  workoutTitle = 'Upper Body Strength',
  workoutMeta = 'FROM THE LIBRARY · 40 MIN',
  workoutDesc = 'Follow along with Victor as he coaches dumbbell upper body strength focusing on strict form, tempo and posture control.',
  vimeoId = '912440318',
  chapters = DEFAULT_CHAPTERS,
  onFinishSession,
}: ClaudeVimeoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (visible && isPlaying) {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [visible, isPlaying]);

  const clockString = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  const vimeoEmbedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>

          <View style={styles.clockCenter}>
            <Text style={styles.topLabel}>FROM THE LIBRARY</Text>
            <Text style={styles.topClock}>{clockString}</Text>
          </View>

          <Pressable onPress={onFinishSession} hitSlop={10}>
            <Text style={styles.doneBtn}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Vimeo / Video Container */}
          <View style={styles.videoCard}>
            <View style={styles.videoPlayer}>
              {Platform.OS === 'web' && isPlaying ? (
                React.createElement('iframe', {
                  src: vimeoEmbedUrl,
                  style: { width: '100%', height: '100%', border: 0 },
                  allow: 'autoplay; fullscreen',
                  allowFullScreen: true,
                })
              ) : (
                <View style={styles.posterWrap}>
                  <View style={styles.radialBackdrop} />
                  <Pressable
                    style={styles.playCircle}
                    onPress={() => setIsPlaying(true)}
                  >
                    <View style={styles.playArrow} />
                  </Pressable>
                  <Text style={styles.vimeoBadge}>VIMEO · 360p ON 3G</Text>
                </View>
              )}
            </View>

            <View style={styles.videoInfo}>
              <Text style={styles.metaKicker}>{workoutMeta}</Text>
              <Text style={styles.videoTitle}>{workoutTitle}</Text>
              <Text style={styles.videoDesc}>{workoutDesc}</Text>
            </View>
          </View>

          {/* Chapters List */}
          <View style={styles.chaptersSection}>
            <Text style={styles.chaptersKicker}>WHAT VICTOR TAKES YOU THROUGH</Text>

            <View style={styles.chaptersBox}>
              {chapters.map((c, i) => (
                <View
                  key={i}
                  style={[
                    styles.chapterRow,
                    i < chapters.length - 1 && styles.chapterRowBorder,
                  ]}
                >
                  <Text
                    style={[
                      styles.chapterAt,
                      c.active && styles.chapterAtActive,
                    ]}
                  >
                    {c.at}
                  </Text>
                  <Text
                    style={[
                      styles.chapterName,
                      c.active && styles.chapterNameActive,
                    ]}
                  >
                    {c.n}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.chaptersFootnote}>
              Just follow along. Nothing to log — we count the session when the video finishes.
            </Text>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.finishBtn} onPress={onFinishSession}>
            <Text style={styles.finishBtnText}>I finished this session</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.08)',
  },
  backBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  clockCenter: {
    alignItems: 'center',
  },
  topLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  topClock: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: IVORY,
    marginTop: 2,
  },
  doneBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  videoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
  },
  videoPlayer: {
    height: 214,
    backgroundColor: OBSIDIAN,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  posterWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(201, 148, 58, 0.14)',
  },
  playCircle: {
    width: 66,
    height: 66,
    borderRadius: 99,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderLeftColor: OBSIDIAN,
    borderTopWidth: 11,
    borderTopColor: 'transparent',
    borderBottomWidth: 11,
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  vimeoBadge: {
    position: 'absolute',
    top: 12,
    left: 14,
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: IVORY,
    backgroundColor: 'rgba(13, 13, 13, 0.7)',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  videoInfo: {
    padding: 18,
  },
  metaKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 6,
  },
  videoTitle: {
    fontFamily: CLASH,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    color: IVORY,
  },
  videoDesc: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.65)',
    marginTop: 9,
  },
  chaptersSection: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  chaptersKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  chaptersBox: {
    backgroundColor: NAVY,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  chapterRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.08)',
  },
  chapterAt: {
    width: 44,
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  chapterAtActive: {
    color: GOLD,
  },
  chapterName: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.85)',
  },
  chapterNameActive: {
    fontWeight: '700',
    color: IVORY,
  },
  chaptersFootnote: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.5)',
    marginTop: 12,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: OBSIDIAN,
  },
  finishBtn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
