import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ActionItem {
  id: string;
  t: string;
  why: string;
  g: string;
  done: boolean;
}

interface ClaudeTodayFiveActionsProps {
  onActionToggle?: (id: string, isDone: boolean) => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

export default function ClaudeTodayFiveActions({ onActionToggle }: ClaudeTodayFiveActionsProps) {
  const { colors, isDark } = useTheme();
  const [actions, setActions] = useState<ActionItem[]>([
    {
      id: 'a1',
      t: 'Drink 500 ml water upon waking',
      why: 'Hydration before coffee · 08:00',
      g: '+10 pts',
      done: true,
    },
    {
      id: 'a2',
      t: 'Hit 30 g protein at breakfast',
      why: 'Skyr and berries covered 32 g · 08:30',
      g: '+15 pts',
      done: true,
    },
    {
      id: 'a3',
      t: 'Complete your 40 min session',
      why: 'Upper Body Strength planned tonight',
      g: '+25 pts',
      done: false,
    },
    {
      id: 'a4',
      t: 'Walk 15 mins after lunch',
      why: 'Blunts blood sugar spike and aids digestion',
      g: '+10 pts',
      done: false,
    },
    {
      id: 'a5',
      t: 'Log dinner before 20:30',
      why: 'Avoid late night decision fatigue',
      g: '+15 pts',
      done: false,
    },
  ]);

  const doneCount = actions.filter((a) => a.done).length;

  const toggleAction = (id: string) => {
    setActions((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const next = !a.done;
          if (onActionToggle) onActionToggle(id, next);
          return { ...a, done: next };
        }
        return a;
      })
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.kicker, { color: colors.textMuted }]}>TODAY'S FIVE ACTIONS</Text>
        <Text style={styles.trackBadge}>{`${doneCount} of 5 done · +${doneCount * 15} pts`}</Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? NAVY : '#FFFFFF',
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(13, 43, 69, 0.08)',
            shadowColor: '#0D2B45',
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 14,
            elevation: 2,
            shadowOpacity: isDark ? 0.35 : 0.05,
          },
        ]}
      >
        {actions.map((a, idx) => (
          <Pressable
            key={a.id}
            style={[
              styles.actionRow,
              idx < actions.length - 1 && styles.actionRowBorder,
              { borderBottomColor: isDark ? 'rgba(247, 243, 238, 0.08)' : 'rgba(13, 43, 69, 0.08)' },
            ]}
            onPress={() => toggleAction(a.id)}
          >
            {/* Custom Checkbox */}
            <View
              style={[
                styles.checkBox,
                { borderColor: isDark ? 'rgba(247, 243, 238, 0.3)' : 'rgba(13, 43, 69, 0.25)' },
                a.done && styles.checkBoxDone,
              ]}
            >
              {a.done ? <View style={styles.checkMarkWhite} /> : null}
            </View>

            {/* Texts */}
            <View style={styles.textCol}>
              <Text
                style={[
                  styles.actionTitle,
                  { color: isDark ? IVORY : NAVY },
                  a.done && styles.actionTitleDone,
                ]}
              >
                {a.t}
              </Text>
              <Text
                style={[
                  styles.actionWhy,
                  { color: isDark ? 'rgba(247, 243, 238, 0.5)' : 'rgba(13, 43, 69, 0.55)' },
                ]}
              >
                {a.why}
              </Text>
            </View>

            {/* Points Gain */}
            <Text style={[styles.gainText, a.done && styles.gainTextDone]}>{a.g}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        Written each morning from the meals you have logged before — not a generic checklist. Do three and you land on target.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
  },
  trackBadge: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.08)',
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkMarkWhite: {
    width: 9,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: IVORY,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
  },
  actionTitleDone: {
    color: 'rgba(247, 243, 238, 0.65)',
    textDecorationLine: 'line-through',
  },
  actionWhy: {
    fontFamily: MONO,
    fontSize: 11,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 3,
  },
  gainText: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '700',
    color: GOLD,
  },
  gainTextDone: {
    color: GREEN,
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 10,
  },
});
