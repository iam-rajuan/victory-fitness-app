import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';

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

const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

export default function ClaudeTodayFiveActions({ onActionToggle }: ClaudeTodayFiveActionsProps) {
  const [actions, setActions] = useState<ActionItem[]>([
    {
      id: 'a1',
      t: 'Add skyr to your breakfast oats',
      why: 'you logged this 9 times',
      g: '+18 g',
      done: true,
    },
    {
      id: 'a2',
      t: 'Swap the afternoon biscuit for nuts',
      why: 'you often dip here at 15:00',
      g: '+7 g',
      done: false,
    },
    {
      id: 'a3',
      t: 'Grill 200 g chicken for dinner',
      why: 'your most-logged dinner',
      g: '+46 g',
      done: true,
    },
    {
      id: 'a4',
      t: 'Drink 500 ml before your session',
      why: 'you train at 20:30',
      g: '+0.5 L',
      done: false,
    },
    {
      id: 'a5',
      t: 'Keep the shake only if dinner is short',
      why: 'you needed it twice last week',
      g: '+25 g',
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
        <Text style={styles.kicker}>TODAY'S FIVE ACTIONS</Text>
        <Text style={styles.trackBadge}>{`${doneCount} of 5 done`}</Text>
      </View>

      <View style={styles.card}>
        {actions.map((a, idx) => {
          const isLast = idx === actions.length - 1;

          return (
            <TouchableOpacity
              key={a.id}
              activeOpacity={0.8}
              style={[
                styles.actionRow,
                !isLast && styles.actionRowBorder,
                a.done && styles.actionRowDone,
              ]}
              onPress={() => toggleAction(a.id)}
            >
              {/* Checkbox box matching prototype lines 2729-2731 */}
              <View
                style={[
                  styles.checkBox,
                  a.done ? styles.checkBoxDone : styles.checkBoxPending,
                ]}
              >
                {a.done && <Text style={styles.checkGlyph}>✓</Text>}
              </View>

              {/* Text column matching lines 2732 */}
              <View style={styles.textCol}>
                <Text
                  style={[
                    styles.actionTitle,
                    a.done && styles.actionTitleDone,
                  ]}
                >
                  {a.t}
                </Text>
                <Text style={styles.actionWhy}>{a.why}</Text>
              </View>

              {/* Gain matching line 2733 */}
              <Text
                style={[
                  styles.gainText,
                  a.done && styles.gainTextDone,
                ]}
              >
                {a.g}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.footnote}>
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
    gap: 10,
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
    fontWeight: '500',
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
    alignItems: 'flex-start',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.1)',
  },
  actionRowDone: {
    backgroundColor: 'rgba(26, 122, 74, 0.1)',
  },
  checkBox: {
    width: 19,
    height: 19,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkBoxPending: {
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.6)',
  },
  checkBoxDone: {
    backgroundColor: GREEN,
  },
  checkGlyph: {
    color: IVORY,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '600',
    color: IVORY,
  },
  actionTitleDone: {
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.55)',
    textDecorationLine: 'line-through',
  },
  actionWhy: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 3,
  },
  gainText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: GOLD,
    marginTop: 2,
    flexShrink: 0,
  },
  gainTextDone: {
    color: 'rgba(247, 243, 238, 0.4)',
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18.5,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 10,
  },
});
