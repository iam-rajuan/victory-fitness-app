import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import CrossPlatformWebView from '../CrossPlatformWebView';
import { useLanguage } from '../../lib/i18n';
import { canonicalizeFitnessText } from '../../lib/workoutTerminology';

export interface WorkoutDetailExercise {
  n: string;
  s: string;
}

export interface ClaudeWorkoutDetailModalProps {
  visible: boolean;
  onClose: () => void;
  onStartWorkout: () => void;
  workoutTitle?: string;
  kicker?: string;
  description?: string;
  vimeoId?: string;
  videoUrl?: string;
  completed?: boolean;
  exercises?: WorkoutDetailExercise[];
}

const NAVY = '#0D2B45';
const OBSIDIAN = '#0D0D0D';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

export default function ClaudeWorkoutDetailModal({
  visible,
  onClose,
  onStartWorkout,
  workoutTitle = 'Workout',
  kicker = 'STRENGTH · DUMBBELLS · INTERMEDIATE',
  description = 'Seven movements, three rounds. Victor demonstrates each one before you start it, and the video pauses itself between sets.',
  vimeoId = '',
  videoUrl = '',
  completed = false,
  exercises = [],
}: ClaudeWorkoutDetailModalProps) {
  const { t } = useLanguage();
  const resolvedVideoUrl = videoUrl || (vimeoId ? `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}?title=0&byline=0&portrait=0&playsinline=1&dnt=1` : '');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header Media / Player Area matching VF Prototype.dc.html lines 1540-1545 */}
          <View style={styles.mediaContainer}>
            {resolvedVideoUrl ? (
              <CrossPlatformWebView
                source={{ uri: resolvedVideoUrl }}
                style={StyleSheet.absoluteFill}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                scrollEnabled={false}
              />
            ) : (
              <Pressable style={styles.playCircle} onPress={onStartWorkout}>
                <View style={styles.playArrow} />
              </Pressable>
            )}

            {/* Back button */}
            <Pressable style={styles.backBtn} onPress={onClose} hitSlop={12}>
              <Text style={styles.backBtnText}>← {t('Back')}</Text>
            </Pressable>

            {/* Bottom info row */}
            <Text style={styles.mediaMeta}>{vimeoId ? 'vimeo' : 'video'} · 1080p · steps down on 3G</Text>
          </View>

          {/* 2. Content Info matching VF Prototype.dc.html lines 1546-1563 */}
          <View style={styles.contentWrap}>
            <Text style={styles.kicker}>{kicker}</Text>
            {completed ? (
              <View style={styles.completedNotice}>
                <Text style={styles.completedNoticeText}>{t('Previously completed')}</Text>
                <Text style={styles.completedNoticeSub}>{t('You can repeat this workout anytime.')}</Text>
              </View>
            ) : null}
            <Text style={styles.title}>{canonicalizeFitnessText(workoutTitle)}</Text>
            <Text style={styles.description}>{description}</Text>

            {/* 3. Action Buttons Row */}
            <View style={styles.actionsRow}>
              <Pressable style={styles.startBtn} onPress={onStartWorkout}>
                <Text style={styles.startBtnText}>{completed ? t('Start again') : t('Start workout')}</Text>
              </Pressable>
            </View>

            {/* 4. Movements List */}
            <Text style={styles.movementsTitle}>
              {exercises.length > 0 ? `${t('THE')} ${exercises.length} ${t('MOVEMENTS')}` : t('MOVEMENTS')}
            </Text>
            <View style={styles.movementsList}>
              {exercises.length > 0 ? (
                exercises.map((e, idx) => (
                  <View key={idx} style={styles.movementRow}>
                    <View style={styles.movementThumb}>
                      <View style={styles.movementPlayArrow} />
                    </View>
                    <Text style={styles.movementName}>{canonicalizeFitnessText(e.n)}</Text>
                    <Text style={styles.movementSets}>{e.s}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyMovementRow}>
                  <Text style={styles.emptyMovementText}>
                    {t('No movements have been added for this workout yet.')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  mediaContainer: {
    position: 'relative',
    height: 226,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 62,
    height: 62,
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
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  backBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: IVORY,
  },
  mediaMeta: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.6)',
  },
  contentWrap: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: COPPER,
    marginBottom: 8,
  },
  completedNotice: {
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 122, 74, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(26, 122, 74, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  completedNoticeText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: '900',
    color: '#5FC48E',
    textTransform: 'uppercase',
  },
  completedNoticeSub: {
    marginTop: 4,
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(247, 243, 238, 0.68)',
  },
  title: {
    fontFamily: DMSANS,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: IVORY,
    marginBottom: 12,
  },
  description: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247, 243, 238, 0.65)',
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  startBtn: {
    flex: 1,
    height: 52,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  movementsTitle: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  movementsList: {},
  emptyMovementRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.09)',
  },
  emptyMovementText: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.09)',
  },
  movementThumb: {
    width: 44,
    height: 32,
    borderRadius: 7,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  movementPlayArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderLeftColor: GOLD,
    borderTopWidth: 5,
    borderTopColor: 'transparent',
    borderBottomWidth: 5,
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  movementName: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '500',
    color: IVORY,
  },
  movementSets: {
    fontFamily: MONO,
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.55)',
  },
});
