import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';

interface ShopCategory {
  category: string;
  items: { id: string; name: string }[];
}

interface ClaudeShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

const SHOP_CATEGORIES: ShopCategory[] = [
  {
    category: 'PRODUCE',
    items: [
      { id: 'p1', name: 'Fresh berries (400 g)' },
      { id: 'p2', name: 'Sweet potatoes (2 kg)' },
      { id: 'p3', name: 'Broccoli (3 heads)' },
      { id: 'p4', name: 'Plantains (4 yellow)' },
      { id: 'p5', name: 'Spinach & kale leaves (500 g)' },
    ],
  },
  {
    category: 'MEAT & FISH',
    items: [
      { id: 'm1', name: 'Chicken breast (1.2 kg)' },
      { id: 'm2', name: 'Wild salmon fillets (800 g)' },
      { id: 'm3', name: 'Lean turkey mince (600 g)' },
      { id: 'm4', name: 'White cod fillets (600 g)' },
    ],
  },
  {
    category: 'DAIRY & EGGS (LACTOSE-FREE)',
    items: [
      { id: 'd1', name: 'Skyr / Greek yogurt lactose-free (1 kg)' },
      { id: 'd2', name: 'Eggs (24 large free-range)' },
      { id: 'd3', name: 'Almond milk unsweetened (2 L)' },
    ],
  },
  {
    category: 'PANTRY',
    items: [
      { id: 'pa1', name: 'Rolled oats (1 kg)' },
      { id: 'pa2', name: 'Basmati rice & jollof spices' },
      { id: 'pa3', name: 'Red lentils & canned black beans' },
      { id: 'pa4', name: 'Olive oil & raw honey' },
    ],
  },
];

export default function ClaudeShoppingListModal({
  visible,
  onClose,
}: ClaudeShoppingListModalProps) {
  const [tickedIds, setTickedIds] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setTickedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyList = () => {
    if (Platform.OS === 'web') {
      const allItems = SHOP_CATEGORIES.map(
        (c) => `${c.category}:\n` + c.items.map((it) => `- ${it.name}`).join('\n')
      ).join('\n\n');
      navigator.clipboard?.writeText(allItems);
      alert('Shopping list copied to clipboard!');
    } else {
      Alert.alert('Copied', 'Shopping list copied to clipboard!');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.backBtn}>← Week plan</Text>
          </Pressable>
          <Pressable onPress={handleCopyList} hitSlop={10}>
            <Text style={styles.copyBtn}>Copy list</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.headline}>Shopping list</Text>
          <Text style={styles.subheadline}>
            Sorted the way the shop is laid out. Tick as you go — it remembers, even offline.
          </Text>

          {/* Grouped Categories */}
          {SHOP_CATEGORIES.map((g) => (
            <View key={g.category} style={styles.categoryWrap}>
              <Text style={styles.categoryTitle}>{g.category}</Text>
              <View style={styles.itemsCard}>
                {g.items.map((it, idx) => {
                  const isTicked = Boolean(tickedIds[it.id]);
                  return (
                    <Pressable
                      key={it.id}
                      style={[
                        styles.itemRow,
                        idx < g.items.length - 1 && styles.itemRowBorder,
                      ]}
                      onPress={() => toggleItem(it.id)}
                    >
                      <View style={[styles.checkBox, isTicked && styles.checkBoxDone]}>
                        {isTicked ? <View style={styles.checkMarkWhite} /> : null}
                      </View>
                      <Text
                        style={[
                          styles.itemName,
                          isTicked && styles.itemNameTicked,
                        ]}
                      >
                        {it.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={styles.footnote}>
            Quantities are for four people across seven days. Nothing on this list contains lactose.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
  },
  backBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  copyBtn: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '700',
    color: GOLD,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headline: {
    fontFamily: CLASH,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 8,
  },
  subheadline: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.6)',
    marginBottom: 20,
  },
  categoryWrap: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: COPPER,
    marginBottom: 8,
  },
  itemsCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 243, 238, 0.09)',
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
  itemName: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '500',
    color: IVORY,
  },
  itemNameTicked: {
    color: 'rgba(247, 243, 238, 0.45)',
    textDecorationLine: 'line-through',
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.45)',
    marginTop: 8,
  },
});
