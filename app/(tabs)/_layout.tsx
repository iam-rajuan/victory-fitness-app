import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Image, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AccessRestrictionModal from '../../components/AccessRestrictionModal';
import { fetchCurrentUser, getAuthUser, getValidAuthTokens } from '../../lib/api';
import { getAllowedTabNames, isSubscriptionActive } from '../../lib/access';
import { preloadAppData } from '../../lib/appPreload';
import { useLanguage } from '../../lib/i18n';
import { replaceRoute } from '../../lib/navigation';

const WEB_PROFILE_AVATAR_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
  display: 'block',
};

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const routerRef = React.useRef(router);
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profileImage, setProfileImage] = useState('');
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<string[] | null>(null);
  const [restrictedSection, setRestrictedSection] = useState('');
  const hasStartedPreloadRef = React.useRef(false);
  const isCompactWidth = width < 380;
  const tabBarHeight = isCompactWidth ? 60 : 64;
  const tabIconSize = isCompactWidth ? 22 : 24;
  const activeTabPadding = isCompactWidth ? 7 : 8;
  const profileBadgeSize = isCompactWidth ? 30 : 32;

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const syncCachedProfileImage = async () => {
      const cachedUser = await getAuthUser();
      if (cancelled || !cachedUser) {
        return;
      }
      setProfileImage(String(cachedUser.profileImage || '').trim());
      setProfileImageFailed(false);
    };

    void syncCachedProfileImage();

    return () => {
      cancelled = true;
    };
  }, [segments]);

  useEffect(() => {
    let cancelled = false;

    const guard = async () => {
      try {
        const tokens = await getValidAuthTokens();
        if (cancelled) {
          return;
        }

        if (!tokens) {
          replaceRoute(routerRef.current, '/login');
          return;
        }

        const cachedUser = await getAuthUser();
        if (cancelled) {
          return;
        }

        if (cachedUser) {
          setProfileImage(String(cachedUser.profileImage || '').trim());
          setProfileImageFailed(false);

          if (!isSubscriptionActive(cachedUser)) {
            replaceRoute(routerRef.current, '/plan');
            return;
          }

          setAllowedTabs(getAllowedTabNames(cachedUser));
          setCheckingAuth(false);

          if (!hasStartedPreloadRef.current) {
            hasStartedPreloadRef.current = true;
            void preloadAppData();
          }
        }

        const authUser = await fetchCurrentUser();
        if (cancelled) {
          return;
        }

        setProfileImage(String(authUser?.profileImage || '').trim());
        setProfileImageFailed(false);

        if (!isSubscriptionActive(authUser)) {
          replaceRoute(routerRef.current, '/plan');
          return;
        }

        setAllowedTabs(getAllowedTabNames(authUser));
        setCheckingAuth(false);

        if (!hasStartedPreloadRef.current) {
          hasStartedPreloadRef.current = true;
          void preloadAppData();
        }
      } catch {
        if (!cancelled) {
          replaceRoute(routerRef.current, '/login');
          setCheckingAuth(false);
        }
      }
    };

    void guard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (checkingAuth || allowedTabs === null) {
    return null;
  }

  const visibleTabs = new Set(allowedTabs ?? []);
  const isVisible = (name: string) => visibleTabs.has(name);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              height: tabBarHeight,
              paddingBottom: isCompactWidth ? 7 : 8,
              paddingTop: isCompactWidth ? 7 : 8,
            },
          ],
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? [styles.activeTab, { padding: activeTabPadding }] : undefined}>
                <Ionicons name={focused ? 'home' : 'home-outline'} size={tabIconSize} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? [styles.activeTab, { padding: activeTabPadding }] : undefined}>
                <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={tabIconSize} color={color} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (event) => {
              if (isVisible('workout')) {
                return;
              }
              event.preventDefault();
              setRestrictedSection(t('Workout'));
            },
          }}
        />
        <Tabs.Screen
          name="challenge"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? [styles.activeTab, { padding: activeTabPadding }] : undefined}>
                <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={tabIconSize} color={color} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (event) => {
              if (isVisible('challenge')) {
                return;
              }
              event.preventDefault();
              setRestrictedSection(t('Challenges'));
            },
          }}
        />
        <Tabs.Screen
          name="mealPlan"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? [styles.activeTab, { padding: activeTabPadding }] : undefined}>
                <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={tabIconSize} color={color} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (event) => {
              if (isVisible('mealPlan')) {
                return;
              }
              event.preventDefault();
              setRestrictedSection(t('Meal Plan'));
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? [styles.activeTab, { padding: activeTabPadding }] : undefined}>
                <View
                  style={[
                    styles.profileBadge,
                    {
                      width: profileBadgeSize,
                      height: profileBadgeSize,
                      borderRadius: profileBadgeSize / 2,
                    },
                  ]}
                >
                  {profileImage && !profileImageFailed ? (
                    Platform.OS === 'web' ? (
                      React.createElement('img', {
                        src: profileImage,
                        alt: 'Profile',
                        referrerPolicy: 'no-referrer',
                        style: WEB_PROFILE_AVATAR_STYLE,
                        onError: () => setProfileImageFailed(true),
                      })
                    ) : (
                      <Image source={{ uri: profileImage }} style={styles.profileAvatar} onError={() => setProfileImageFailed(true)} />
                    )
                  ) : (
                    <Ionicons name={focused ? 'person' : 'person-outline'} size={tabIconSize} color={color} />
                  )}
                </View>
              </View>
            ),
          }}
        />
      </Tabs>
      <AccessRestrictionModal
        visible={Boolean(restrictedSection)}
        sectionName={restrictedSection}
        onClose={() => setRestrictedSection('')}
        onUpdatePlan={() => {
          setRestrictedSection('');
          router.push('/plan');
        }}
        onBackHome={() => {
          setRestrictedSection('');
          replaceRoute(router, '/(tabs)');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    zIndex: 1000,
    elevation: 1000,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 240, 208, 0.12)',
    borderRadius: 16,
  },
  profileBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
});
