import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GOLD_LIGHT = '#E5C378';
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });

const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

interface VictorThinkingIndicatorProps {
  text?: string;
}

export function VictorThinkingIndicator({ text = 'Thinking…' }: VictorThinkingIndicatorProps) {
  // Sparkle ambient pulse (scale & opacity)
  const sparkScale = useRef(new Animated.Value(1)).current;
  const sparkOpacity = useRef(new Animated.Value(0.7)).current;

  // 3 kinetic wave dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Subtle text breath
  const textOpacity = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    // 1. Sparkle smooth breathing pulse
    const sparkAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sparkScale, {
            toValue: 1.15,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkOpacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(sparkScale, {
            toValue: 0.95,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(sparkOpacity, {
            toValue: 0.65,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 2. Kinetic wave animation for the 3 dots
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

    // 3. Gentle text breathing
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

    sparkAnimation.start();
    a1.start();
    a2.start();
    a3.start();
    textBreath.start();

    return () => {
      sparkAnimation.stop();
      a1.stop();
      a2.stop();
      a3.stop();
      textBreath.stop();
    };
  }, [dot1, dot2, dot3, sparkOpacity, sparkScale, textOpacity]);

  return (
    <View style={styles.bubble}>
      {/* Precision Gold Sparkle */}
      <Animated.View
        style={[
          styles.sparkWrap,
          {
            transform: [{ scale: sparkScale }],
            opacity: sparkOpacity,
          },
        ]}
      >
        <AnimatedIcon name="sparkles" size={12} color={GOLD} />
      </Animated.View>

      {/* Neat Typography */}
      <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
        {text}
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
    gap: 7,
    backgroundColor: NAVY,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.22)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  sparkWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
