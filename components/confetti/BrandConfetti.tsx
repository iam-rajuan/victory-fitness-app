import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  size: number;
  isCircle: boolean;
  animY: Animated.Value;
  animX: Animated.Value;
  animRotate: Animated.Value;
  animOpacity: Animated.Value;
}

const BRAND_COLORS = ['#00F0D0', '#FFD700', '#A855F7', '#38BDF8', '#FFFFFF'];
const PARTICLE_COUNT = 40;

interface BrandConfettiProps {
  active: boolean;
  duration?: number;
  colors?: string[];
  onAnimationComplete?: () => void;
}

export function BrandConfetti({ active, duration = 3000, colors = BRAND_COLORS, onAnimationComplete }: BrandConfettiProps) {
  const windowDimensions = Dimensions.get('window');
  const width = windowDimensions.width || 360;
  const height = windowDimensions.height || 640;

  const particlesRef = useRef<ConfettiPiece[]>([]);

  if (particlesRef.current.length === 0) {
    const palette = colors && colors.length > 0 ? colors : BRAND_COLORS;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      id: i,
      x: Math.random() * width,
      color: palette[i % palette.length],
      size: Math.random() * 6 + 6,
      isCircle: i % 3 === 0,
      animY: new Animated.Value(0),
      animX: new Animated.Value(0),
      animRotate: new Animated.Value(0),
      animOpacity: new Animated.Value(1),
    }));
  }

  useEffect(() => {
    if (!active) return;

    const animations = particlesRef.current.map((p) => {
      // Reset values
      p.animY.setValue(0);
      p.animX.setValue(0);
      p.animRotate.setValue(0);
      p.animOpacity.setValue(1);

      const targetX = (Math.random() - 0.5) * 160;
      const targetRotate = Math.random() > 0.5 ? 4 : -4;

      return Animated.parallel([
        Animated.timing(p.animY, {
          toValue: height * 0.75 + Math.random() * 100,
          duration: duration * (0.7 + Math.random() * 0.4),
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(p.animX, {
          toValue: targetX,
          duration: duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.animRotate, {
          toValue: targetRotate,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.animOpacity, {
          toValue: 0,
          delay: duration * 0.65,
          duration: duration * 0.35,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onAnimationComplete?.();
    });
  }, [active, duration, height, onAnimationComplete]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particlesRef.current.map((p) => {
        const spin = p.animRotate.interpolate({
          inputRange: [-4, 4],
          outputRange: ['-720deg', '720deg'],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                top: -20,
                width: p.size,
                height: p.isCircle ? p.size : p.size * 1.5,
                borderRadius: p.isCircle ? p.size / 2 : 2,
                backgroundColor: p.color,
                opacity: p.animOpacity,
                transform: [
                  { translateY: p.animY },
                  { translateX: p.animX },
                  { rotate: spin },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    zIndex: 9999,
  },
});
