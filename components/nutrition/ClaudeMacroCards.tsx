import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface MacroItem {
  k: string; // label, e.g. "Protein"
  v: string; // current value, e.g. "86 g"
  of: string; // target, e.g. "of 112 g"
  color: string; // ring color
  pct: number;
}

interface ClaudeMacroCardsProps {
  proteinTarget?: number;
  proteinCurrent?: number;
  carbsCurrent?: number;
  carbsTarget?: number;
  fatCurrent?: number;
  fatTarget?: number;
  kcalCurrent?: number;
  kcalTarget?: number;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeMacroCards({
  proteinTarget = 112,
  proteinCurrent = 86,
  carbsCurrent = 160,
  carbsTarget = 210,
  fatCurrent = 48,
  fatTarget = 65,
  kcalCurrent = 1580,
  kcalTarget = 2200,
}: ClaudeMacroCardsProps) {
  const { colors, isDark } = useTheme();

  const macros: MacroItem[] = [
    {
      k: 'Protein',
      v: `${proteinCurrent}`,
      of: `of ${proteinTarget} g`,
      color: GOLD,
      pct: Math.min(100, Math.round((proteinCurrent / proteinTarget) * 100)),
    },
    {
      k: 'Carbs',
      v: `${carbsCurrent}`,
      of: `of ${carbsTarget} g`,
      color: COPPER,
      pct: Math.min(100, Math.round((carbsCurrent / carbsTarget) * 100)),
    },
    {
      k: 'Fat',
      v: `${fatCurrent}`,
      of: `of ${fatTarget} g`,
      color: isDark ? IVORY : '#4A5568',
      pct: Math.min(100, Math.round((fatCurrent / fatTarget) * 100)),
    },
    {
      k: 'Calories',
      v: kcalCurrent >= 1000 ? `${Math.floor(kcalCurrent / 1000)} ${kcalCurrent % 1000}` : `${kcalCurrent}`,
      of: kcalTarget >= 1000 ? `of ${Math.floor(kcalTarget / 1000)} ${kcalTarget % 1000}` : `of ${kcalTarget}`,
      color: GREEN,
      pct: Math.min(100, Math.round((kcalCurrent / kcalTarget) * 100)),
    },
  ];

  return (
    <View style={styles.container}>
      {/* 4 Macro Cards Row */}
      <View style={styles.cardsRow}>
        {macros.map((m) => (
          <View
            key={m.k}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? NAVY : '#FFFFFF',
                borderWidth: isDark ? 0 : 1,
                borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
                shadowColor: '#0D2B45',
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 10,
                elevation: 2,
                shadowOpacity: isDark ? 0.35 : 0.05,
              },
            ]}
          >
            {/* Macro Ring Graphic */}
            <View style={[styles.outerRing, { borderColor: `${m.color}40` }]}>
              <View
                style={[
                  styles.activeRingFill,
                  {
                    borderTopColor: m.color,
                    borderRightColor: m.pct > 50 ? m.color : 'transparent',
                    borderBottomColor: m.pct > 75 ? m.color : 'transparent',
                    borderLeftColor: m.pct > 25 ? m.color : 'transparent',
                  },
                ]}
              />
              <View
                style={[
                  styles.innerRing,
                  { backgroundColor: isDark ? NAVY : '#FFFFFF' },
                ]}
              />
            </View>

            <Text style={[styles.valueText, { color: m.k === 'Fat' ? (isDark ? IVORY : '#1A202C') : m.color }]}>{m.v}</Text>
            <Text
              style={[
                styles.targetText,
                { color: isDark ? 'rgba(247, 243, 238, 0.45)' : 'rgba(13, 43, 69, 0.5)' },
              ]}
            >
              {m.of}
            </Text>
            <Text style={[styles.labelText, { color: isDark ? 'rgba(247, 243, 238, 0.55)' : 'rgba(13, 43, 69, 0.65)' }]}>{m.k}</Text>
          </View>
        ))}
      </View>

      {/* Color System Footnote */}
      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        Gold is protein, copper is carbs, ivory is fat, green is calories — the same four colours everywhere in the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  card: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  outerRing: {
    width: 52,
    height: 52,
    borderRadius: 99,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    position: 'relative',
  },
  activeRingFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 99,
    borderWidth: 3,
  },
  innerRing: {
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: NAVY,
  },
  valueText: {
    fontFamily: MONO,
    fontSize: 18,
    fontWeight: '700',
    color: IVORY,
  },
  targetText: {
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 2,
  },
  labelText: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.9,
    marginTop: 3,
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 10,
  },
});
