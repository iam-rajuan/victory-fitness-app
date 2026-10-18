import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GOLD_LIGHT = '#E5C378';
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });

interface VictorThinkingIndicatorProps {
  text?: string;
}

/**
 * Claude-style geometric rounded starburst/asterisk.
 * Features 3 crossing rounded rays (6 petals spaced 60° apart) with a smooth central hub,
 * rotating continuously and breathing with organic living intelligence.
 */
function ClaudeStarburst({
  spinAnim,
  pulseAnim,
}: {
  spinAnim: Animated.Value;
  pulseAnim: Animated.Value;
}) {
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.1],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  return (
    <Animated.View
      style={[
        styles.starburstContainer,
        {
          transform: [{ rotate: spin }, { scale }],
          opacity,
        },
      ]}
    >
      {/* Ray 1: 0° (vertical) */}
      <View style={[styles.starburstRay, { backgroundColor: GOLD, transform: [{ rotate: '0deg' }] }]} />
      {/* Ray 2: 60° */}
      <View style={[styles.starburstRay, { backgroundColor: GOLD_LIGHT, transform: [{ rotate: '60deg' }] }]} />
      {/* Ray 3: 120° */}
      <View style={[styles.starburstRay, { backgroundColor: GOLD, transform: [{ rotate: '120deg' }] }]} />
      {/* Central smooth hub */}
      <View style={styles.starburstHub} />
    </Animated.View>
  );
}

export function VictorThinkingIndicator({ text = 'Thinking' }: VictorThinkingIndicatorProps) {
  // Continuous smooth 360° spin for Claude-style starburst
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Breathing pulse for starburst scale and opacity
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // 3 kinetic wave dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Subtle text breath
  const textOpacity = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    // 1. Continuous silky 360° spin (linear 3200ms)
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 2. Organic breathing pulse (1200ms in/out)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Kinetic wave animation for the 3 trailing pearls
    const createDotAnim = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 380,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 320 - delay)),
        ])
      );
    };

    const a1 = createDotAnim(dot1, 0);
    const a2 = createDotAnim(dot2, 130);
    const a3 = createDotAnim(dot3, 260);

    // 4. Gentle text breathing
    const textBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 0.9,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.55,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    spinLoop.start();
    pulseLoop.start();
    a1.start();
    a2.start();
    a3.start();
    textBreath.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      a1.stop();
      a2.stop();
      a3.stop();
      textBreath.stop();
    };
  }, [dot1, dot2, dot3, pulseAnim, spinAnim, textOpacity]);

  // Strip trailing periods or ellipses so we don't display redundant dots before the kinetic wave pearls
  const displayLabel = (text || 'Thinking').replace(/[.…]+$/, '');

  return (
    <View style={styles.bubble}>
      {/* Claude-style rotating geometric starburst */}
      <ClaudeStarburst spinAnim={spinAnim} pulseAnim={pulseAnim} />

      {/* Neat Typography */}
      <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
        {displayLabel}
      </Animated.Text>

      {/* 3 Kinetic Wave Pearls */}
      <View style={styles.dotsWrap}>
        {[dot1, dot2, dot3].map((dotAnim, idx) => {
          const translateY = dotAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -2.5],
          });
          const opacity = dotAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.35, 1],
          });
          return (
            <Animated.View
              key={idx}
              style={[
                styles.dot,
                {
                  transform: [{ translateY }],
                  opacity,
                  backgroundColor: idx === 1 ? GOLD_LIGHT : GOLD,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.22)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  starburstContainer: {
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starburstRay: {
    position: 'absolute',
    width: 2.6,
    height: 13.5,
    borderRadius: 1.4,
    top: 0.75,
    left: 6.2,
  },
  starburstHub: {
    position: 'absolute',
    width: 4.8,
    height: 4.8,
    borderRadius: 2.4,
    backgroundColor: GOLD,
    top: 5.1,
    left: 5.1,
  },
  text: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.72)',
    letterSpacing: 0.15,
  },
  dotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingLeft: 1,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
});
