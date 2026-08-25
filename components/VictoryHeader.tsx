import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fetchAppNotifications, getAuthUser, fetchCurrentUser } from '../lib/api';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../lib/i18n';

interface VictoryHeaderProps {
  showGreeting?: boolean;
}

export default function VictoryHeader({ showGreeting = false }: VictoryHeaderProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userName, setUserName] = useState('');

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
      <View style={styles.headerRow}>
        {/* Left: Brand Logo */}
        <View style={styles.brandBlock}>
          <Image
            source={require('../assets/logo_dark.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* Center: Greeting */}
        <View style={styles.middleBlock}>
          {showGreeting && firstName ? (
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingPrefix}>{t('Good morning')}</Text>
              <Text style={styles.greetingName} numberOfLines={1}>
                {firstName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right: Notifications */}
        <View style={styles.rightBlock}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            hitSlop={10}
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
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
  },
  headerRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: {
    width: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 95,
    height: 28,
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
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00F0D0',
    fontFamily: 'Inter_700Bold',
    lineHeight: 18,
  },
  rightBlock: {
    width: 100,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#0D0D16',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
});
