import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { pushRoute } from '../../lib/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';
import RequirementAuditBoundary from '../audit/RequirementAuditBoundary';

interface ClaudeAlsoTodayCardProps {
  partnerName?: string;
  partnerTrainedToday?: boolean;
  sessionsDoneThisWeek?: number;
  sessionsTargetThisWeek?: number;
  journalWrittenToday?: boolean;
  onNavigateWorkout?: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudeAlsoTodayCard({
  partnerName,
  partnerTrainedToday = true,
  sessionsDoneThisWeek = 3,
  sessionsTargetThisWeek = 4,
  journalWrittenToday = false,
  onNavigateWorkout,
}: ClaudeAlsoTodayCardProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const duoTitle = partnerName
    ? (partnerTrainedToday ? t('{name} trained today', { name: partnerName }) : t('{name} has not trained yet', { name: partnerName }))
    : t('No accountability duo yet');
  const duoNote = partnerName
    ? t('Your duo · your turn, they will see the tick')
    : t('Two people, one tick a day. Set it up in a minute.');

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionKicker, { color: colors.textMuted }]}>{t('ALSO TODAY')}</Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
      >
        {/* Row 1: Accountability Duo */}
        <Pressable
          style={[
            styles.itemRow,
            styles.itemRowBorder,
            { borderBottomColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.08)' },
          ]}
          onPress={() => pushRoute(router, '/duo')}
        >
          {partnerName ? (
            <View style={[styles.dot, partnerTrainedToday ? styles.dotGreen : styles.dotGoldRing]} />
          ) : (
            <View
              style={[
                styles.dotOutline,
                { borderColor: isDark ? 'rgba(247, 243, 238, 0.35)' : 'rgba(13, 43, 69, 0.25)' },
              ]}
            />
          )}

          <View style={styles.textCol}>
            <Text style={[styles.itemTitle, { color: isDark ? IVORY : NAVY }]}>{duoTitle}</Text>
            <Text
              style={[
                styles.itemSub,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              {duoNote}
            </Text>
          </View>

          <Text style={styles.arrowChevron}>›</Text>
        </Pressable>

        {/* Row 2: Daily Journal */}
        <RequirementAuditBoundary auditId="APP-EXTRA-002" status="extra">
          <Pressable
            style={[
              styles.itemRow,
              styles.itemRowBorder,
              { borderBottomColor: isDark ? 'rgba(247, 243, 238, 0.1)' : 'rgba(13, 43, 69, 0.08)' },
            ]}
            onPress={() => pushRoute(router, '/journal')}
          >
            <View style={[styles.dot, journalWrittenToday ? styles.dotGreen : styles.dotCopperRing]} />

            <View style={styles.textCol}>
              <Text style={[styles.itemTitle, { color: isDark ? IVORY : NAVY }]}>
                {journalWrittenToday ? t('Done today · tap to read') : t('Daily Journal')}
              </Text>
              <Text
                style={[
                  styles.itemSub,
                  { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
                ]}
              >
                {t('Write one line before bed')}
              </Text>
            </View>

            <Text style={styles.arrowChevron}>›</Text>
          </Pressable>
        </RequirementAuditBoundary>

        {/* Row 3: Weekly Target & Library */}
        <Pressable
          style={({ pressed }) => [styles.itemRow, pressed && { opacity: 0.75 }]}
          onPress={() => {
            if (onNavigateWorkout) {
              onNavigateWorkout();
            } else {
              pushRoute(router, '/workout');
            }
          }}
        >
          <View style={styles.textCol}>
            <Text style={[styles.itemTitle, { color: isDark ? IVORY : NAVY }]}>
              {t('{done} of {target} sessions done', { done: sessionsDoneThisWeek, target: sessionsTargetThisWeek })}
            </Text>
            <Text
              style={[
                styles.itemSub,
                { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.55)' },
              ]}
            >
              {t('Weekly target')}
            </Text>
          </View>

          <Text style={styles.arrowChevron}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    color: 'rgba(247, 243, 238, 0.42)',
    marginBottom: 10,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0D2B45',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  dotGreen: {
    backgroundColor: GREEN,
  },
  dotGoldRing: {
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: 'transparent',
  },
  dotCopperRing: {
    borderWidth: 1.5,
    borderColor: COPPER,
    backgroundColor: 'transparent',
  },
  dotOutline: {
    width: 9,
    height: 9,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.35)',
  },
  textCol: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 2,
  },
  itemSub: {
    fontFamily: INTER,
    fontSize: 12,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  arrowChevron: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
  },
});
