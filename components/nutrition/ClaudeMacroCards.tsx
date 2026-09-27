import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

interface MacroItem {
  k: string;
  v: string;
  of: string;
  color: string;
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
  proteinTarget = 0,
  proteinCurrent = 0,
  carbsCurrent = 0,
  carbsTarget = 0,
  fatCurrent = 0,
  fatTarget = 0,
  kcalCurrent = 0,
  kcalTarget = 0,
}: ClaudeMacroCardsProps) {
  const macros: MacroItem[] = [
    {
      k: 'Protein',
      v: `${proteinCurrent}`,
      of: `of ${proteinTarget} g`,
      color: GOLD,
      pct: proteinTarget > 0 ? Math.min(100, Math.round((proteinCurrent / proteinTarget) * 100)) : 0,
    },
    {
      k: 'Carbs',
      v: `${carbsCurrent}`,
      of: `of ${carbsTarget} g`,
      color: COPPER,
      pct: carbsTarget > 0 ? Math.min(100, Math.round((carbsCurrent / carbsTarget) * 100)) : 0,
    },
    {
      k: 'Fat',
      v: `${fatCurrent}`,
      of: `of ${fatTarget} g`,
      color: IVORY,
      pct: fatTarget > 0 ? Math.min(100, Math.round((fatCurrent / fatTarget) * 100)) : 0,
    },
    {
      k: 'Calories',
      v: kcalCurrent >= 1000 ? `${Math.floor(kcalCurrent / 1000)} ${kcalCurrent % 1000}` : `${kcalCurrent}`,
      of: kcalTarget >= 1000 ? `of ${Math.floor(kcalTarget / 1000)} ${kcalTarget % 1000}` : `of ${kcalTarget}`,
      color: GREEN,
      pct: kcalTarget > 0 ? Math.min(100, Math.round((kcalCurrent / kcalTarget) * 100)) : 0,
    },
  ];

  return (
    <View style={styles.container}>
      {/* 4 Macro Cards Row matching lines 1003-1014 */}
      <View style={styles.cardsRow}>
        {macros.map((m) => {
          const ringDeg = Math.round(m.pct * 3.6);
          const ringBackground = `conic-gradient(${m.color} ${ringDeg}deg, rgba(247,243,238,0.12) 0deg)`;

          return (
            <View key={m.k} style={styles.card}>
              {/* Conic Donut Ring matching lines 1006-1008 */}
              <View
                style={[
                  styles.outerRing,
                  Platform.OS === 'web'
                    ? ({ background: ringBackground } as any)
                    : { borderColor: m.color, borderWidth: 7 },
                ]}
              >
                <View style={styles.innerRing} />
              </View>

              {/* Macro Value & Target matching lines 1009-1011 */}
              <Text
                style={[
                  styles.valueText,
                  { color: m.k === 'Fat' ? IVORY : m.color },
                ]}
              >
                {m.v}
              </Text>
              <Text style={styles.targetText}>{m.of}</Text>
              <Text style={styles.labelText}>{m.k}</Text>
            </View>
          );
        })}
      </View>

      {/* Color System Explainer Footnote matching line 1015 */}
      <Text style={styles.footnote}>
        Gold is protein, copper is carbs, ivory is fat, green is calories — the same four colours everywhere in the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    overflow: 'hidden',
  },
  innerRing: {
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: NAVY,
  },
  valueText: {
    fontFamily: MONO,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '700',
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
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 3,
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.42)',
    marginTop: 10,
    marginHorizontal: 20,
  },
});
