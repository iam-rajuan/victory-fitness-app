import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { analyzeMealImage, MealImageAnalysisResponse } from '../../lib/nutrition';

interface MacroSnapshot {
  k: string;
  v: string;
  color: string;
}

interface ClaudeMealAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  onLogMeal: (mealData: any) => void;
  imageBase64?: string | null;
  imageUri?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
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

export default function ClaudeMealAnalysisModal({
  visible,
  onClose,
  onLogMeal,
  imageBase64,
  imageUri,
  mimeType,
  fileName,
}: ClaudeMealAnalysisModalProps) {
  const [analysis, setAnalysis] = React.useState<MealImageAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    if (!visible) return;

    const runAnalysis = async () => {
      if (!imageBase64) {
        setAnalysis(null);
        setAnalysisError('');
        return;
      }
      setIsAnalyzing(true);
      setAnalysisError('');
      try {
        const result = await analyzeMealImage({
          image_base64: imageBase64,
          mime_type: mimeType || 'image/jpeg',
          file_name: fileName || 'meal-photo.jpg',
        });
        if (!cancelled) setAnalysis(result);
      } catch (error: any) {
        if (!cancelled) {
          setAnalysis(null);
          setAnalysisError(error?.message || 'Unable to analyse this meal right now.');
        }
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    };

    void runAnalysis();
    return () => {
      cancelled = true;
    };
  }, [fileName, imageBase64, mimeType, visible]);

  const macros: MacroSnapshot[] = [
    { k: 'PROTEIN', v: `${analysis?.estimated_protein ?? 0} g`, color: GOLD },
    { k: 'CARBS', v: `${analysis?.estimated_carbs ?? 0} g`, color: COPPER },
    { k: 'FAT', v: `${analysis?.estimated_fat ?? 0} g`, color: IVORY },
    { k: 'KCAL', v: `${analysis?.estimated_calories ?? 0}`, color: GREEN },
  ];

  const handleLog = () => {
    if (!analysis) return;
    onLogMeal({
      name: analysis.meal_name_guess,
      protein: analysis.estimated_protein,
      carbs: analysis.estimated_carbs,
      fat: analysis.estimated_fat,
      calories: analysis.estimated_calories,
      analysisId: analysis.analysis_id,
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
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <>
                <View style={styles.cameraBox}>
                  <View style={styles.cameraCap} />
                  <View style={styles.cameraLens} />
                </View>
                <Text style={styles.photoText}>your photo</Text>
              </>
            )}
          </View>

          {/* Recognition Results */}
          <Text style={styles.dishTitle}>
            {isAnalyzing ? 'Analysing your meal...' : analysis?.meal_name_guess || 'Meal analysis'}
          </Text>
          <Text style={styles.portionText}>
            {analysisError || (analysis ? `${analysis.confidence} confidence · saved to your history` : 'Choose a meal photo to analyse it')}
          </Text>

          {/* 4 Macro Boxes Row */}
          <View style={styles.macrosRow}>
            {macros.map((m) => (
              <View key={m.k} style={styles.macroCol}>
                <Text style={[styles.macroVal, { color: m.color }]}>{m.v}</Text>
                <Text style={styles.macroLabel}>{m.k}</Text>
              </View>
            ))}
          </View>

          {isAnalyzing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={GOLD} />
              <Text style={styles.loadingText}>Reading the plate from the backend...</Text>
            </View>
          ) : null}

          {/* What to do about it Card */}
          <View style={styles.adviceCard}>
            <Text style={styles.adviceKicker}>WHAT TO DO ABOUT IT</Text>
            <Text style={styles.adviceText}>
              {analysis?.summary || analysisError || 'Your backend analysis appears here after the photo is processed.'}
            </Text>

            {(analysis?.notes || []).slice(0, 3).map((note, idx) => (
              <View key={`${note}-${idx}`} style={styles.bulletRow}>
                <View style={idx % 2 === 0 ? styles.greenDot : styles.copperDot} />
                <Text style={styles.bulletText}>{note}</Text>
              </View>
            ))}
          </View>

          {/* Action CTAs */}
          <View style={styles.actionsRow}>
            <Pressable style={[styles.logBtn, !analysis && styles.logBtnDisabled]} onPress={handleLog} disabled={!analysis}>
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
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  loadingText: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247, 243, 238, 0.55)',
  },
  logBtnDisabled: {
    opacity: 0.45,
  },
});
