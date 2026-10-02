import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { pushRoute } from '../../lib/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';

interface ClaudeHomeHeaderProps {
  name: string;
  streakDays: number;
  unreadNotifications?: number;
}

const GOLD = '#C9943A';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeHomeHeader({
  name,
  streakDays,
  unreadNotifications = 0,
}: ClaudeHomeHeaderProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { language, t } = useLanguage();

  // Format today's date localized
  const formattedDate = React.useMemo(() => {
    const d = new Date();
    try {
      const weekday = d.toLocaleDateString(language || 'en-US', { weekday: 'long' }).toUpperCase();
      const day = d.getDate();
      const month = d.toLocaleDateString(language || 'en-US', { month: 'short' }).toUpperCase();
      return `${weekday}, ${day} ${month}`;
    } catch {
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      return `${weekday}, ${day} ${month}`;
    }
  }, [language]);

  const firstName = name ? name.split(' ')[0] : 'there';

  return (
    <View style={styles.container}>
      {/* Left: Date & Greeting */}
      <View style={styles.greetingWrap}>
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {formattedDate}
        </Text>
        <Text style={[styles.greetingTitle, { color: colors.text }]}>
          {t('Hello {name},', { name: firstName })}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[
            styles.streakPill,
            {
              borderColor: isDark ? 'rgba(247, 243, 238, 0.2)' : 'rgba(13, 43, 69, 0.12)',
              backgroundColor: isDark ? 'rgba(13, 43, 69, 0.6)' : '#FFFFFF',
            },
          ]}
          onPress={() => pushRoute(router, '/profile')}
        >
          <View style={styles.goldSquareDot} />
          <Text style={[styles.streakNumber, { color: colors.text }]}>
            {streakDays || 0}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open notifications"
          style={[
            styles.iconButton,
            {
              borderColor: isDark ? 'rgba(247, 243, 238, 0.2)' : 'rgba(13, 43, 69, 0.12)',
              backgroundColor: isDark ? 'rgba(13, 43, 69, 0.6)' : '#FFFFFF',
            },
          ]}
          onPress={() => pushRoute(router, '/notifications')}
        >
          <Ionicons name="notifications-outline" size={17} color={colors.text} />
          {unreadNotifications > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
  },
  greetingWrap: {
    flex: 1,
    paddingRight: 12,
  },
  dateLabel: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  greetingTitle: {
    fontFamily: CLASH,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  goldSquareDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  streakNumber: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
  },
});
