import React from 'react';
import { Image, StyleSheet, Text, View, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';

interface ClaudeProfileHeaderProps {
  name?: string;
  initials?: string;
  profileImage?: string;
  tier?: string;
  country?: string;
  sinceDate?: string;
  streakDays?: number;
  totalSessions?: number;
  consistencyPct?: number;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeProfileHeader({
  name = 'Victory member',
  initials = 'VF',
  profileImage = '',
  tier = 'NONE',
  country = '',
  sinceDate = '',
  streakDays = 0,
  totalSessions = 0,
  consistencyPct = 0,
}: ClaudeProfileHeaderProps) {
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();
  const isSilver = tier.toUpperCase() === 'SILVER';
  const isIC = tier.toUpperCase() === 'INNER CIRCLE' || tier.toUpperCase() === 'INNER_CIRCLE';
  const metaText = [country, sinceDate ? t('since {date}', { date: sinceDate }) : ''].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      {/* Top User Info matching lines 1133-1136 */}
      <View style={styles.userRow}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarWrap} />
        ) : (
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}

        <View style={styles.nameCol}>
          <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.tierBadge,
                isSilver
                  ? styles.tierBadgeSilver
                  : isIC
                  ? styles.tierBadgeIC
                  : styles.tierBadgeGold,
              ]}
            >
              <Text
                style={[
                  styles.tierBadgeText,
                  isSilver && styles.tierBadgeTextSilver,
                  isIC && styles.tierBadgeTextIC,
                ]}
              >
                {tier.toUpperCase()}
              </Text>
            </View>
            {metaText ? (
              <Text style={[styles.userLocation, { color: colors.textMuted }]}>{metaText}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Stats Row matching lines 1137-1141 */}
      <View
        style={[
          styles.statsRow,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderColor: isDark ? 'transparent' : colors.cardBorder,
            borderWidth: isDark ? 0 : 1,
          },
        ]}
      >
        <View style={[styles.statCol, styles.statBorder, { borderRightColor: colors.divider }]}>
          <Text style={[styles.statValue, { color: GOLD }]}>{streakDays}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('STREAK')}</Text>
        </View>

        <View style={[styles.statCol, styles.statBorder, { borderRightColor: colors.divider }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalSessions}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('SESSIONS')}</Text>
        </View>

        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: GREEN }]}>
            {consistencyPct}
            <Text style={{ fontSize: 13 }}>%</Text>
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('CONSISTENCY')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 99,
    backgroundColor: NAVY,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: DMSANS,
    fontSize: 19,
    fontWeight: '700',
    color: GOLD,
  },
  nameCol: {
    flex: 1,
  },
  userName: {
    fontFamily: CLASH,
    fontSize: 22,
    fontWeight: '600',
    color: IVORY,
    textTransform: 'capitalize',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  tierBadge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tierBadgeGold: {
    backgroundColor: GOLD,
  },
  tierBadgeSilver: {
    backgroundColor: 'rgba(247, 243, 238, 0.2)',
  },
  tierBadgeIC: {
    backgroundColor: COPPER,
  },
  tierBadgeText: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#0D0D0D',
  },
  tierBadgeTextSilver: {
    color: IVORY,
  },
  tierBadgeTextIC: {
    color: IVORY,
  },
  userLocation: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 18,
  },
  statCol: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(247, 243, 238, 0.12)',
  },
  statValue: {
    fontFamily: MONO,
    fontSize: 21,
    fontWeight: '700',
  },
  statLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.7,
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 2,
  },
});
