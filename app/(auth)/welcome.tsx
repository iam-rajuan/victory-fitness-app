import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { pushRoute } from '../../lib/navigation';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';

type Language = 'en' | 'de';

const COPY: Record<Language, {
  headline: string;
  sub: string;
  langNote: string;
  build: string;
  haveAccount: string;
  signIn: string;
  workouts: string;
  challenges: string;
  setup: string;
}> = {
  en: {
    headline: 'You already know what to do.',
    sub: "The hard part is doing it on the days you don't feel like it. That is the part we handle.",
    langNote: 'You can change the language later in your profile.',
    build: 'Build my plan',
    haveAccount: 'I already have an account',
    signIn: 'Sign in',
    workouts: 'WORKOUTS',
    challenges: 'CHALLENGES',
    setup: 'TO SET UP',
  },
  de: {
    headline: 'Du weißt schon, was zu tun ist.',
    sub: 'Schwer ist es an den Tagen, an denen du keine Lust hast. Genau dabei helfen wir dir.',
    langNote: 'Die Sprache kannst du später im Profil ändern.',
    build: 'Meinen Plan erstellen',
    haveAccount: 'Ich habe schon ein Konto',
    signIn: 'Anmelden',
    workouts: 'WORKOUTS',
    challenges: 'CHALLENGES',
    setup: 'EINRICHTUNG',
  },
};

const WELCOME_BG = require('../../assets/images/onboarding/welcome-bg.jpg');
const VF_LOGO = require('../../assets/images/onboarding/vf-logo-white.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [lang, setLang] = useState<Language>('en');

  const isDesktop = width >= 960;
  const isTablet = width >= 640 && width < 960;

  // Animation values matching prototype's vfLaunch and vfBreathe
  const logoLaunch = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    // vfLaunch 1.1s cubic-bezier(.2,.9,.24,1)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver,
      }),
      Animated.timing(logoLaunch, {
        toValue: 1,
        duration: 1100,
        easing: Easing.bezier(0.2, 0.9, 0.24, 1),
        useNativeDriver,
      }),
    ]).start(() => {
      // vfBreathe 4.5s ease-in-out infinite
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.035,
            duration: 2250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 2250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver,
          }),
        ])
      ).start();
    });
  }, [fadeAnim, logoLaunch, breatheAnim, useNativeDriver]);

  const t = COPY[lang];

  const logoTranslateY = logoLaunch.interpolate({
    inputRange: [0, 0.38, 0.56, 0.72, 1],
    outputRange: [58, -16, 6, -4, 0],
  });

  const logoScale = logoLaunch.interpolate({
    inputRange: [0, 0.38, 0.56, 0.72, 1],
    outputRange: [0.34, 1.14, 0.96, 1.02, 1],
  });

  const logoOpacity = logoLaunch.interpolate({
    inputRange: [0, 0.38, 1],
    outputRange: [0, 1, 1],
  });

  const handleBuildPlan = () => {
    pushRoute(router, '/register');
  };

  const handleLogin = () => {
    pushRoute(router, '/login');
  };

  // Language selector: ONLY EN and DE
  const renderLanguagePill = () => (
    <View style={styles.langPillContainer}>
      {(['en', 'de'] as Language[]).map((code) => {
        const active = lang === code;
        return (
          <Pressable
            key={code}
            onPress={() => setLang(code)}
            style={[
              styles.langBtn,
              active ? styles.langBtnActive : styles.langBtnInactive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Switch language to ${code.toUpperCase()}`}
          >
            <Text
              style={[
                styles.langText,
                active ? styles.langTextActive : styles.langTextInactive,
              ]}
            >
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Animated logo with golden vertical trail line
  const renderAnimatedLogo = (isLarge: boolean = false) => (
    <View style={[styles.logoSection, isLarge && styles.logoSectionLarge]}>
      <View
        style={[
          styles.logoTrail,
          isLarge && styles.logoTrailLarge,
          Platform.OS === 'web'
            ? ({
                background: 'linear-gradient(to top, rgba(201,148,58,.75), rgba(201,148,58,0))',
                transformOrigin: 'bottom center',
              } as any)
            : undefined,
        ]}
      >
        {Platform.OS !== 'web' ? (
          <LinearGradient
            colors={['rgba(201,148,58,0.75)', 'rgba(201,148,58,0)']}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [
            { translateY: logoTranslateY },
            { scale: Animated.multiply(logoScale, breatheAnim) },
          ],
        }}
      >
        <Image
          source={VF_LOGO}
          style={isLarge ? styles.logoImageLarge : styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );

  // Stats block: 170 workouts, 35 challenges, 3 min setup
  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCol}>
        <Text style={[styles.statNum, isDesktop && styles.statNumDesk]}>170</Text>
        <Text style={styles.statLabel}>{t.workouts}</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={[styles.statNum, isDesktop && styles.statNumDesk]}>35</Text>
        <Text style={styles.statLabel}>{t.challenges}</Text>
      </View>
      <View style={styles.statCol}>
        <Text style={[styles.statNum, isDesktop && styles.statNumDesk]}>3 min</Text>
        <Text style={styles.statLabel}>{t.setup}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Full-bleed background photo across the entire screen — clear, vivid, and sharp */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={WELCOME_BG}
          style={styles.bgImage}
          resizeMode="cover"
        />
        {/* Balanced gradient overlay: clear faces at top, smoothly transitioning to obsidian at bottom */}
        {Platform.OS === 'web' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                background:
                  'linear-gradient(180deg, rgba(13,13,13,0.32) 0%, rgba(13,13,13,0.22) 20%, rgba(13,13,13,0.52) 42%, rgba(13,13,13,0.85) 60%, rgba(13,13,13,0.98) 72%, #0D0D0D 82%)',
              } as any,
            ]}
          />
        ) : (
          <LinearGradient
            colors={[
              'rgba(13,13,13,0.32)',
              'rgba(13,13,13,0.22)',
              'rgba(13,13,13,0.52)',
              'rgba(13,13,13,0.85)',
              'rgba(13,13,13,0.98)',
              '#0D0D0D',
            ]}
            locations={[0, 0.20, 0.42, 0.60, 0.72, 0.82]}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      {/* Top radial golden glow shimmer */}
      <View
        style={[
          styles.radialGlow,
          Platform.OS === 'web'
            ? ({
                background:
                  'radial-gradient(100% 80% at 30% 0%, rgba(201,148,58,.18) 0%, rgba(13,13,13,0) 70%)',
              } as any)
            : undefined,
        ]}
        pointerEvents="none"
      >
        {Platform.OS !== 'web' ? (
          <LinearGradient
            colors={['rgba(201,148,58,0.18)', 'rgba(13,13,13,0)']}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>

      {/* Main Content ScrollView */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + (isDesktop ? 28 : 16), 32),
            paddingBottom: Math.max(insets.bottom + (isDesktop ? 36 : 24), 36),
          },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Global Header Row */}
        <View style={[styles.headerContainer, isDesktop && styles.headerContainerDesk]}>
          <View style={styles.headerLeft}>
            {isDesktop ? (
              <Image
                source={VF_LOGO}
                style={{ width: 44, height: 42 }}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <View style={styles.headerRight}>
            {renderLanguagePill()}
            {isDesktop ? (
              <Pressable
                onPress={handleLogin}
                style={styles.desktopSignInBtn}
                accessibilityRole="button"
                accessibilityLabel={t.signIn}
              >
                <Text style={styles.desktopSignInText}>{t.signIn}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* DESKTOP FLEXIBLE VIEW (width >= 960px) */}
        {isDesktop ? (
          <View style={styles.desktopMainRow}>
            {/* Left Column: Headline, Subtitle, Stats, and Action Buttons */}
            <Animated.View style={[styles.desktopTextCol, { opacity: fadeAnim }]}>
              <Text style={styles.desktopHeadline}>{t.headline}</Text>
              <Text style={styles.desktopSub}>{t.sub}</Text>
              <Text style={styles.desktopLangNote}>{t.langNote}</Text>

              {/* Stats Row */}
              <View style={styles.desktopStatsRow}>
                {renderStatsRow()}
              </View>

              {/* Action Buttons Row */}
              <View style={styles.desktopCtaRow}>
                <Pressable
                  onPress={handleBuildPlan}
                  style={({ pressed }) => [
                    styles.primaryCta,
                    styles.desktopPrimaryCta,
                    pressed && styles.primaryCtaPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t.build}
                >
                  <Text style={styles.primaryCtaText}>{t.build}</Text>
                </Pressable>

                <Pressable
                  onPress={handleLogin}
                  style={styles.desktopSecondaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t.haveAccount}
                >
                  <Text style={styles.desktopSecondaryBtnText}>{t.haveAccount}</Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* Right Column: Hero Emblem with animation */}
            <View style={styles.desktopVisualCol}>
              {renderAnimatedLogo(true)}
            </View>
          </View>
        ) : (
          /* MOBILE & TABLET FLEXIBLE PORTRAIT VIEW */
          <View style={[styles.mobileContainer, isTablet && styles.tabletContainer]}>
            {/* Centered Logo with trail & breathe animation */}
            {renderAnimatedLogo(false)}

            <View style={styles.flexibleSpacer} />

            {/* Copy Section */}
            <Animated.View style={[styles.copySection, { opacity: fadeAnim }]}>
              <Text style={[styles.headlineText, isTablet && styles.headlineTablet]}>
                {t.headline}
              </Text>
              <Text style={[styles.subText, isTablet && styles.subTablet]}>
                {t.sub}
              </Text>
              <Text style={styles.langNoteText}>{t.langNote}</Text>
            </Animated.View>

            {/* Stats & CTAs */}
            <Animated.View style={[styles.statsSection, { opacity: fadeAnim }]}>
              {renderStatsRow()}

              {/* Primary Gold CTA */}
              <Pressable
                onPress={handleBuildPlan}
                style={({ pressed }) => [
                  styles.primaryCta,
                  isTablet && styles.tabletCta,
                  pressed && styles.primaryCtaPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t.build}
              >
                <Text style={styles.primaryCtaText}>{t.build}</Text>
              </Pressable>

              {/* Secondary Link: I already have an account */}
              <Pressable
                onPress={handleLogin}
                style={styles.secondaryLink}
                accessibilityRole="button"
                accessibilityLabel={t.haveAccount}
              >
                <Text style={styles.secondaryLinkText}>{t.haveAccount}</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  bgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.92,
    ...(Platform.OS === 'web'
      ? ({
          objectFit: 'cover',
          objectPosition: '50% 20%',
        } as any)
      : {}),
  },
  radialGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '62%',
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 2,
  },

  // Header styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1160,
    alignSelf: 'center',
    marginBottom: 16,
    zIndex: 10,
  },
  headerContainerDesk: {
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopSignInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,238,0.28)',
    backgroundColor: 'rgba(13,13,13,0.4)',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  desktopSignInText: {
    color: '#F7F3EE',
    fontFamily: Fonts.heading,
    fontSize: 13.5,
    fontWeight: '700',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Language Pill: ONLY EN and DE
  langPillContainer: {
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.2)',
    borderRadius: 11,
    padding: 3,
    backgroundColor: 'rgba(13,13,13,0.3)',
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  langBtnActive: {
    backgroundColor: '#C9943A',
  },
  langBtnInactive: {
    backgroundColor: 'transparent',
  },
  langText: {
    fontSize: 12,
    fontFamily: Fonts.heading,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  langTextActive: {
    color: '#0D0D0D',
    fontWeight: '700',
  },
  langTextInactive: {
    color: 'rgba(247,243,238,0.65)',
    fontWeight: '500',
  },

  // Desktop 2-Column Responsive Layout
  desktopMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1160,
    alignSelf: 'center',
    gap: 60,
    marginVertical: 'auto',
    paddingVertical: 24,
  },
  desktopTextCol: {
    flex: 1.15,
    maxWidth: 580,
  },
  desktopVisualCol: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopHeadline: {
    fontFamily: Fonts.display,
    fontSize: 48,
    lineHeight: 52,
    color: '#F7F3EE',
    letterSpacing: -1.2,
    marginBottom: 16,
    fontWeight: '600',
    ...(Platform.OS === 'web'
      ? ({
          fontFamily: "'Clash Display', 'DM Sans', sans-serif",
          textWrap: 'balance',
        } as any)
      : {}),
  },
  desktopSub: {
    fontFamily: Fonts.body,
    fontSize: 17,
    lineHeight: 27,
    color: 'rgba(247,243,238,0.76)',
    marginBottom: 14,
    fontWeight: '400',
    ...(Platform.OS === 'web'
      ? ({
          fontFamily: "'Inter', sans-serif",
          textWrap: 'pretty',
        } as any)
      : {}),
  },
  desktopLangNote: {
    fontFamily: Fonts.data,
    fontSize: 13,
    color: '#B8B2AA',
    marginBottom: 28,
    ...(Platform.OS === 'web' ? ({ fontFamily: "'JetBrains Mono', monospace" } as any) : {}),
  },
  desktopStatsRow: {
    marginBottom: 30,
  },
  desktopCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  desktopPrimaryCta: {
    width: 250,
    marginTop: 0,
  },
  desktopSecondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,238,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  desktopSecondaryBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(247,243,238,0.75)',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // Mobile / Tablet Portrait Container
  mobileContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  tabletContainer: {
    maxWidth: 580,
  },

  // Logo & Animation styles
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 6,
    position: 'relative',
  },
  logoSectionLarge: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  logoTrail: {
    position: 'absolute',
    bottom: 6,
    width: 3,
    height: 96,
  },
  logoTrailLarge: {
    height: 130,
    width: 4,
    bottom: -6,
  },
  logoImage: {
    height: 165,
    width: 174,
    display: 'flex',
    ...(Platform.OS === 'web' ? ({ filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.6))' } as any) : {}),
  },
  logoImageLarge: {
    height: 230,
    width: 242,
    display: 'flex',
    ...(Platform.OS === 'web' ? ({ filter: 'drop-shadow(0 10px 36px rgba(0,0,0,0.75))' } as any) : {}),
  },

  // Mobile Copy & Spacing
  flexibleSpacer: {
    flex: 1,
    minHeight: 24,
  },
  copySection: {
    marginBottom: 20,
  },
  headlineText: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 41.6,
    color: '#F7F3EE',
    letterSpacing: -0.8,
    marginBottom: 16,
    fontWeight: '600',
    ...(Platform.OS === 'web'
      ? ({
          fontFamily: "'Clash Display', 'DM Sans', sans-serif",
          textWrap: 'balance',
        } as any)
      : {}),
  },
  headlineTablet: {
    fontSize: 44,
    lineHeight: 46,
  },
  subText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 25.6,
    color: 'rgba(247,243,238,0.7)',
    marginBottom: 14,
    fontWeight: '400',
    ...(Platform.OS === 'web'
      ? ({
          fontFamily: "'Inter', sans-serif",
          textWrap: 'pretty',
        } as any)
      : {}),
  },
  subTablet: {
    fontSize: 17,
    lineHeight: 27,
  },
  langNoteText: {
    fontFamily: Fonts.data,
    fontSize: 13,
    lineHeight: 18,
    color: '#B8B2AA',
    fontWeight: '400',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'JetBrains Mono', monospace" } as any) : {}),
  },

  // Stats Section
  statsSection: {
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 26,
    marginBottom: 30,
  },
  statCol: {
    flexDirection: 'column',
  },
  statNum: {
    fontFamily: Fonts.dataBold,
    fontSize: 22,
    lineHeight: 24,
    color: '#C9943A',
    fontWeight: '700',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'JetBrains Mono', monospace" } as any) : {}),
  },
  statNumDesk: {
    fontSize: 26,
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    color: 'rgba(247,243,238,0.55)',
    marginTop: 3,
    fontWeight: '500',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },

  // CTAs
  primaryCta: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    backgroundColor: '#C9943A',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  tabletCta: {
    maxWidth: 420,
    alignSelf: 'center',
  },
  primaryCtaPressed: {
    opacity: 0.88,
  },
  primaryCtaText: {
    fontFamily: Fonts.heading,
    fontSize: 17,
    fontWeight: '700',
    color: '#0D0D0D',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
  secondaryLink: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  secondaryLinkText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.5)',
    textAlign: 'center',
    ...(Platform.OS === 'web' ? ({ fontFamily: "'DM Sans', sans-serif" } as any) : {}),
  },
});
