import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const GOLD_LIGHT = '#E5C378';
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });

interface VictorThinkingIndicatorProps {
  text?: string;
}

type EquipmentItem =
  | { family: 'ionicons'; name: keyof typeof Ionicons.glyphMap; size: number }
  | { family: 'material'; name: keyof typeof MaterialCommunityIcons.glyphMap; size: number };

// Curated luxury fitness equipment icons in a rhythmic athletic cadence
const EQUIPMENT_ICONS: EquipmentItem[] = [
  { family: 'ionicons', name: 'barbell-outline', size: 14.5 },
  { family: 'material', name: 'dumbbell', size: 14 },
  { family: 'material', name: 'kettlebell', size: 13.5 },
  { family: 'ionicons', name: 'timer-outline', size: 14 },
  { family: 'ionicons', name: 'flame-outline', size: 14 },
];

export function VictorThinkingIndicator({ text = 'Thinking' }: VictorThinkingIndicatorProps) {
  // Current active gym equipment icon index
  const [iconIdx, setIconIdx] = useState(0);

  // Silky vertical slot-roll animation values
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const iconTranslateY = useRef(new Animated.Value(0)).current;

  // 3 kinetic wave dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // Subtle text breath
  const textOpacity = useRef(new Animated.Value(0.7)).current;

  // Athletic Cadence Loop: ~72 BPM rhythmic vertical glide between gym equipment icons
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const rollNextIcon = () => {
      // 1. Smooth upward glide out (140ms)
      Animated.parallel([
        Animated.timing(iconOpacity, {
          toValue: 0,
          duration: 140,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 0.85,
          duration: 140,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(iconTranslateY, {
          toValue: -7,
          duration: 140,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isMounted) return;

        // 2. Switch to next gym equipment
        setIconIdx((prev) => (prev + 1) % EQUIPMENT_ICONS.length);
        iconTranslateY.setValue(7); // Start slightly below for upward entry

        // 3. Smooth upward glide in with micro-cushion (190ms)
        Animated.parallel([
          Animated.timing(iconOpacity, {
            toValue: 1,
            duration: 170,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(iconScale, {
            toValue: 1,
            duration: 190,
            easing: Easing.out(Easing.back(1.3)),
            useNativeDriver: true,
          }),
          Animated.timing(iconTranslateY, {
            toValue: 0,
            duration: 190,
            easing: Easing.out(Easing.back(1.3)),
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!isMounted) return;
          // 4. Optimal athletic hold: 520ms (~72 BPM resting heart rate cadence)
          timeoutId = setTimeout(rollNextIcon, 520);
        });
      });
    };

    // Initial hold before first roll
    timeoutId = setTimeout(rollNextIcon, 520);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      iconScale.stopAnimation();
      iconOpacity.stopAnimation();
      iconTranslateY.stopAnimation();
    };
  }, [iconOpacity, iconScale, iconTranslateY]);

  // Synchronized kinetic wave dots & text breathing
  useEffect(() => {
    const createDotAnim = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 280,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 280,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 240 - delay)),
        ])
      );
    };

    const a1 = createDotAnim(dot1, 0);
    const a2 = createDotAnim(dot2, 90);
    const a3 = createDotAnim(dot3, 180);

    const textBreath = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 0.92,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.58,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    a1.start();
    a2.start();
    a3.start();
    textBreath.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      textBreath.stop();
    };
  }, [dot1, dot2, dot3, textOpacity]);

  // Sanitize label to eliminate duplicate trailing periods
  const displayLabel = (text || 'Thinking').replace(/[.…]+$/, '');
  const currentEquipment = EQUIPMENT_ICONS[iconIdx];

  return (
    <View style={styles.bubble}>
      {/* Precision vertical slot-glide for gym equipment icons */}
      <View style={styles.iconFrame}>
        <Animated.View
          style={[
            styles.iconWrap,
            {
              transform: [
                { scale: iconScale },
                { translateY: iconTranslateY },
              ],
              opacity: iconOpacity,
            },
          ]}
        >
          {currentEquipment.family === 'ionicons' ? (
            <Ionicons
              name={currentEquipment.name as any}
              size={currentEquipment.size}
              color={GOLD}
            />
          ) : (
            <MaterialCommunityIcons
              name={currentEquipment.name as any}
              size={currentEquipment.size}
              color={GOLD}
            />
          )}
        </Animated.View>
      </View>

      {/* Clean Typography */}
      <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
        {displayLabel}
      </Animated.Text>

      {/* 3 Harmonic Kinetic Wave Pearls */}
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
  iconFrame: {
    width: 17,
    height: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 17,
    height: 17,
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
