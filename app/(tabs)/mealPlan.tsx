import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { fetchCurrentUser, fetchCurrentUserBodyMetrics, AuthUser } from '../../lib/api';
import { normalizeSubscriptionTier, SubscriptionTier } from '../../lib/access';
import { pushRoute } from '../../lib/navigation';
import { calculateProteinTarget } from '../../lib/nutrition';
import ClaudeMacroCards from '../../components/nutrition/ClaudeMacroCards';
import ClaudeFullDayMeals from '../../components/nutrition/ClaudeFullDayMeals';
import ClaudeTodayFiveActions from '../../components/nutrition/ClaudeTodayFiveActions';
import ClaudeMealAnalysisCard from '../../components/nutrition/ClaudeMealAnalysisCard';
import ClaudeMealAnalysisModal from '../../components/nutrition/ClaudeMealAnalysisModal';
import ClaudeWeekPlanModal from '../../components/nutrition/ClaudeWeekPlanModal';
import ClaudeShoppingListModal from '../../components/nutrition/ClaudeShoppingListModal';
import { useTheme } from '../../context/ThemeContext';

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

export default function MealPlanScreen() {
  const router = useRouter();
  const { isDark, colors } = useTheme();

  // Current user & tier state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [proteinTarget, setProteinTarget] = useState(112);
  const [userWeight, setUserWeight] = useState(75);

  // Modals state
  const [showMealAnalysisModal, setShowMealAnalysisModal] = useState(false);
  const [showWeekPlanModal, setShowWeekPlanModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [user, metrics] = await Promise.all([
          fetchCurrentUser().catch(() => null),
          fetchCurrentUserBodyMetrics().catch(() => null),
        ]);

        if (cancelled) return;

        if (user) {
          setCurrentUser(user);
        }

        if (metrics?.weight) {
          const w = parseFloat(metrics.weight);
          if (!isNaN(w) && w > 0) {
            setUserWeight(w);
            setProteinTarget(calculateProteinTarget(w, 'maintenance').target);
          }
        }
      } catch {
        // Fallback to defaults
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const tier: SubscriptionTier = useMemo(() => {
    return normalizeSubscriptionTier(currentUser?.subscription_tier);
  }, [currentUser?.subscription_tier]);

  const isSilver = tier === 'SILVER' || tier === 'NONE';
  const isPlatinumOrIC = tier === 'PLATINUM' || tier === 'INNER_CIRCLE';

  const getFormattedDate = () => {
    const d = new Date();
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const day = d.toLocaleDateString('en-GB', { day: 'numeric' });
    const month = d.toLocaleDateString('en-GB', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please enable camera permissions to photograph your meal.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShowMealAnalysisModal(true);
      }
    } catch {
      // Fallback: open modal directly
      setShowMealAnalysisModal(true);
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo Permission Required', 'Please enable photo library permissions.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShowMealAnalysisModal(true);
      }
    } catch {
      setShowMealAnalysisModal(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header matching line 998-1001 */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Food</Text>
            <Text style={[styles.screenDate, { color: colors.textMuted }]}>{getFormattedDate()}</Text>
          </View>

          <TouchableOpacity
            style={styles.logFoodBtn}
            activeOpacity={0.8}
            onPress={() => setShowMealAnalysisModal(true)}
          >
            <Text style={styles.logFoodBtnText}>+ Log food</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Macro Rings matching lines 1003-1014 */}
        <ClaudeMacroCards proteinTarget={proteinTarget} />

        {/* YOUR FULL DAY matching lines 1017-1026 */}
        <ClaudeFullDayMeals onLogMeal={() => setShowMealAnalysisModal(true)} />

        {/* TODAY'S FIVE ACTIONS matching lines 1028-1046 */}
        <ClaudeTodayFiveActions />

        {/* MEAL ANALYSIS Photo Card matching lines 1048-1063 */}
        <ClaudeMealAnalysisCard
          onTakePhoto={handleTakePhoto}
          onUploadPhoto={handleUploadPhoto}
        />

        {/* Week Plan Builder Banner matching lines 1065-1070 */}
        <View style={styles.weekPlanBannerCard}>
          <Text style={styles.weekPlanKicker}>
            NUTRITION PLANNER · SIX WEEKS
          </Text>
          <Text style={styles.weekPlanTitle}>
            A week of food you actually like
          </Text>
          <Text style={styles.weekPlanSub}>
            Six questions about the dishes you love, the cuisines you cook, and anything you cannot eat. Then a full week with preparation steps and a shopping list.
          </Text>
          <TouchableOpacity
            style={styles.buildPlanBtn}
            activeOpacity={0.85}
            onPress={() => setShowWeekPlanModal(true)}
          >
            <Text style={styles.buildPlanBtnText}>Build my plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Meal Analysis Modal matching lines 1074-1110 */}
      <ClaudeMealAnalysisModal
        visible={showMealAnalysisModal}
        onClose={() => setShowMealAnalysisModal(false)}
        onLogMeal={(meal) => {
          Alert.alert('Meal Logged', `${meal.name} logged successfully!`);
          setShowMealAnalysisModal(false);
        }}
      />

      {/* Week Plan Modal matching lines 1567-1653 */}
      <ClaudeWeekPlanModal
        visible={showWeekPlanModal}
        onClose={() => setShowWeekPlanModal(false)}
        onOpenShoppingList={() => {
          setShowWeekPlanModal(false);
          setShowShoppingModal(true);
        }}
      />

      {/* Shopping List Modal matching lines 1655-1679 */}
      <ClaudeShoppingListModal
        visible={showShoppingModal}
        onClose={() => setShowShoppingModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'web' ? 32 : 54,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  screenTitle: {
    fontFamily: CLASH,
    fontSize: 27,
    fontWeight: '600',
    color: IVORY,
  },
  screenDate: {
    fontFamily: INTER,
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(247, 243, 238, 0.55)',
    marginTop: 4,
  },
  logFoodBtn: {
    height: 42,
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logFoodBtnText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  weekPlanBannerCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
  },
  weekPlanKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 9,
  },
  weekPlanTitle: {
    fontFamily: CLASH,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
    color: IVORY,
  },
  weekPlanSub: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.65)',
    marginTop: 7,
  },
  buildPlanBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buildPlanBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: OBSIDIAN,
  },

  // Silver Lock Paywall styles (matching prototype lines 1112-1128)
  silverLockContainer: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  silverLockTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  silverBackBtn: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(247, 243, 238, 0.55)',
  },
  goldFeatureBadge: {
    backgroundColor: GOLD,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  goldFeatureBadgeText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: OBSIDIAN,
  },
  lockIconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockShackle: {
    width: 13,
    height: 10,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: GOLD,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  lockBodyShape: {
    width: 16,
    height: 11,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  silverLockTitle: {
    fontFamily: CLASH,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 12,
  },
  silverLockBody: {
    fontFamily: INTER,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(247, 243, 238, 0.65)',
    marginBottom: 26,
  },
  stillYoursBox: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  stillYoursKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 12,
  },
  stillYoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 5,
  },
  greenTickDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  stillYoursText: {
    fontFamily: INTER,
    fontSize: 14,
    color: 'rgba(247, 243, 238, 0.85)',
  },
  seeGoldBtn: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  seeGoldBtnText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  notNowBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
  },
  notNowText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.4)',
  },
});
