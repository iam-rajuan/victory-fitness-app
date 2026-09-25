import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';

interface MacroSnapshot {
  k: string;
  v: string;
  color: string;
}

interface ClaudeMealAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  onLogMeal: (mealData: any) => void;
}

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const GREEN = '#1A7A4A';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', -apple-system, sans-serif", default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: "'DM Sans', -apple-system, sans-serif", default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: "'Inter', -apple-system, sans-serif", default: 'Inter-Regular' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'JetBrainsMono-Bold' });

const SNAP_MACROS: MacroSnapshot[] = [
  { k: 'PROTEIN', v: '48 g', color: GOLD },
  { k: 'CARBS', v: '96 g', color: COPPER },
  { k: 'FAT', v: '18 g', color: IVORY },
  { k: 'KCAL', v: '720', color: GREEN },
];

export default function ClaudeMealAnalysisModal({
  visible,
  onClose,
  onLogMeal,
}: ClaudeMealAnalysisModalProps) {
  const handleLog = () => {
    onLogMeal({
      name: 'Jollof rice with grilled chicken',
      protein: 48,
      carbs: 96,
      fat: 18,
      calories: 720,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.backBtn}>← Food</Text>
          </Pressable>
          <Text style={styles.speedBadge}>ANALYSED IN 1.8s</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Photo Canvas Preview */}
          <View style={styles.photoCanvas}>
            <View style={styles.cameraBox}>
              <View style={styles.cameraCap} />
              <View style={styles.cameraLens} />
            </View>
            <Text style={styles.photoText}>your photo</Text>
          </View>

          {/* Recognition Results */}
          <Text style={styles.dishTitle}>Jollof rice with grilled chicken</Text>
          <Text style={styles.portionText}>Recognised · about 380 g on the plate</Text>

          {/* 4 Macro Boxes Row */}
          <View style={styles.macrosRow}>
            {SNAP_MACROS.map((m) => (
              <View key={m.k} style={styles.macroCol}>
                <Text style={[styles.macroVal, { color: m.color }]}>{m.v}</Text>
                <Text style={styles.macroLabel}>{m.k}</Text>
              </View>
            ))}
          </View>

          {/* What to do about it Card */}
          <View style={styles.adviceCard}>
            <Text style={styles.adviceKicker}>WHAT TO DO ABOUT IT</Text>
            <Text style={styles.adviceText}>
              Good protein for one plate, but the rice puts you near your carbs for the day. Keep dinner to fish or eggs with vegetables and you finish level.
            </Text>

            <View style={styles.bulletRow}>
              <View style={styles.greenDot} />
              <Text style={styles.bulletText}>Protein: on pace for 112 g</Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={styles.copperDot} />
              <Text style={styles.bulletText}>Carbs: 74% used, and dinner is still to come</Text>
            </View>
          </View>

          {/* Action CTAs */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.logBtn} onPress={handleLog}>
              <Text style={styles.logBtnText}>Log this meal</Text>
            </Pressable>
            <Pressable style={styles.editBtn} onPress={onClose}>
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          </View>

          {/* Privacy Footnote */}
          <Text style={styles.footnote}>
            Estimates from a photo, not laboratory numbers. Correct the portion and it learns your plates — and your photos are deleted once the meal is logged.
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
  speedBadge: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  photoCanvas: {
    height: 186,
    borderRadius: 18,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cameraBox: {
    width: 44,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(201, 148, 58, 0.7)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCap: {
    position: 'absolute',
    top: -7,
    left: 10,
    width: 14,
    height: 5,
    backgroundColor: 'rgba(201, 148, 58, 0.7)',
    borderRadius: 2,
  },
  cameraLens: {
    width: 12,
    height: 12,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: 'rgba(201, 148, 58, 0.7)',
  },
  photoText: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: 'rgba(247, 243, 238, 0.45)',
  },
  dishTitle: {
    fontFamily: CLASH,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 4,
  },
  portionText: {
    fontFamily: MONO,
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.5)',
    marginBottom: 18,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 16,
  },
  macroCol: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  macroVal: {
    fontFamily: MONO,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  macroLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 0.7,
    color: 'rgba(247, 243, 238, 0.5)',
  },
  adviceCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 18,
    marginBottom: 16,
  },
  adviceKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 9,
  },
  adviceText: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 22,
    color: 'rgba(247, 243, 238, 0.85)',
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 4,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  copperDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: COPPER,
  },
  bulletText: {
    fontFamily: INTER,
    fontSize: 13,
    color: 'rgba(247, 243, 238, 0.78)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 12,
  },
  logBtn: {
    flex: 1,
    height: 52,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  editBtn: {
    width: 112,
    height: 52,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(247, 243, 238, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: IVORY,
  },
  footnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.42)',
  },
});
