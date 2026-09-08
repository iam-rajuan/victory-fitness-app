import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fetchAppNotifications, getAuthUser, fetchCurrentUser } from '../lib/api';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import { useLanguage } from '../lib/i18n';

interface VictoryHeaderProps {
  showGreeting?: boolean;
  showSettings?: boolean;
  onSettingsPress?: () => void;
}

export default function VictoryHeader({
  showGreeting = false,
  showSettings = false,
  onSettingsPress,
}: VictoryHeaderProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState('');
  const isCompactWidth = width < 380;
  const sideBlockWidth = Math.max(72, Math.min(100, width * 0.22));
  const logoWidth = Math.max(74, Math.min(95, width * 0.24));
  const logoHeight = isCompactWidth ? 24 : 28;
  const buttonSize = isCompactWidth ? 36 : 40;
  const greetingPrefixSize = isCompactWidth ? 11 : 12;
  const greetingNameSize = isCompactWidth ? 15 : 16;

  React.useEffect(() => {
    let cancelled = false;
    const refreshUnreadCount = async () => {
      try {
        const notifications = await fetchAppNotifications();
        if (!cancelled) setUnreadCount(notifications.filter((item) => !item.read).length);
      } catch {
        // The bell remains available if the inbox is temporarily offline.
      }
    };
    void refreshUnreadCount();
    const unsubscribe = subscribeToPushNotifications(() => { void refreshUnreadCount(); });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!showGreeting) return;
    let isMounted = true;

    const loadUserName = async () => {
      const cachedUser = await getAuthUser();
      if (cachedUser?.name?.trim() && isMounted) {
        setUserName(cachedUser.name.trim());
      }

      try {
        const user = await fetchCurrentUser();
        if (!isMounted) return;
        const nextName = user?.name?.trim();
        if (nextName) {
          setUserName(nextName);
        }
      } catch {
        // Fallback to cached user if network fails
      }
    };

    void loadUserName();
    return () => {
      isMounted = false;
    };
  }, [showGreeting]);

  // Format first name nicely (e.g. "test user one" -> "Test")
  const getFirstName = (fullName: string) => {
    if (!fullName) return '';
    const first = fullName.trim().split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  };

  const firstName = getFirstName(userName);

  return (
    <View style={styles.header}>
      <View style={[styles.headerRow, isCompactWidth && styles.headerRowCompact]}>
        {/* Left: Brand Logo */}
        <View style={[styles.brandBlock, { width: sideBlockWidth }]}>
          <Image
            source={require('../assets/logo_dark.png')}
            style={[styles.brandLogo, { width: logoWidth, height: logoHeight }]}
            resizeMode="contain"
          />
        </View>

        {/* Center: Greeting */}
        <View style={styles.middleBlock}>
          {showGreeting && firstName ? (
            <View style={styles.greetingContainer}>
              <Text
                style={[
                  styles.greetingPrefix,
                  { fontSize: greetingPrefixSize, lineHeight: greetingPrefixSize + 3 },
                ]}
              >
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return t('Good morning');
                  if (hour < 17) return t('Good afternoon');
                  return t('Good evening');
                })()}
              </Text>
              <Text style={[styles.greetingName, { fontSize: greetingNameSize, lineHeight: greetingNameSize + 2 }]} numberOfLines={1}>
                {firstName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right: Notifications & Settings */}
        <View style={[styles.rightBlock, { width: showSettings ? sideBlockWidth * 1.35 : sideBlockWidth, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }]}>
          {showSettings && (
            <TouchableOpacity
              style={[
                styles.notificationButton,
                { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
              ]}
              onPress={onSettingsPress || (() => router.push('/profile/settings'))}
              accessibilityRole="button"
              accessibilityLabel={t('Open settings')}
              hitSlop={10}
            >
              <Ionicons name="settings-outline" size={isCompactWidth ? 18 : 20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.notificationButton,
              { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 },
            ]}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('Open notifications')}
            hitSlop={10}
          >
            <Ionicons name="notifications-outline" size={isCompactWidth ? 18 : 20} color="#fff" />
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRowCompact: {
    gap: 10,
  },
  brandBlock: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  brandLogo: {
  },
  middleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingPrefix: {
    color: Colors.textSecondary,
    fontFamily: Fonts.heading,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  greetingName: {
    color: Colors.gold,
    fontFamily: Fonts.display,
  },
  rightBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  notificationButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 43, 69, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.3)',
  },
  unreadBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: Colors.obsidian,
  },
  unreadBadgeText: {
    color: Colors.ivory,
    fontSize: 9,
    fontFamily: Fonts.dataBold,
    textAlign: 'center',
  },
});
