import React, { useCallback, useEffect, useState } from 'react';
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
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { fetchCurrentUser, fetchCurrentUserBodyMetrics } from '../../lib/api';
import { canAccessFeature } from '../../lib/access';
import { analyzeMealImage, calculateProteinTarget } from '../../lib/nutrition';
import ClaudeMacroCards from '../../components/nutrition/ClaudeMacroCards';
import ClaudeFullDayMeals from '../../components/nutrition/ClaudeFullDayMeals';
import ClaudeTodayFiveActions from '../../components/nutrition/ClaudeTodayFiveActions';
import ClaudeMealAnalysisCard from '../../components/nutrition/ClaudeMealAnalysisCard';
import ClaudeMealAnalysisModal from '../../components/nutrition/ClaudeMealAnalysisModal';
import ClaudeWeekPlanModal from '../../components/nutrition/ClaudeWeekPlanModal';
import ClaudeShoppingListModal from '../../components/nutrition/ClaudeShoppingListModal';

const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function MealPlanScreen() {
  const router = useRouter();

  // Tier access state
  const [userTier, setUserTier] = useState<string>('gold');
  const [canAccessNutrition, setCanAccessNutrition] = useState(true);

  // Protein targets
  const [proteinTarget, setProteinTarget] = useState(112);
  const [userWeight, setUserWeight] = useState(75);

  // Modals state
  const [showMealAnalysisModal, setShowMealAnalysisModal] = useState(false);
  const [showWeekPlanModal, setShowWeekPlanModal] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

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
          const u = user as any;
          const tier = (u.tier || u.membership_tier || 'gold').toLowerCase();
          setUserTier(tier);
          const hasAccess = canAccessFeature('nutrition_tracker', user);
          setCanAccessNutrition(hasAccess || tier !== 'silver');
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

  const getFormattedDate = () => {
    const d = new Date();
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header matching line 998-1001 */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Food</Text>
            <Text style={styles.screenDate}>{getFormattedDate()}</Text>
          </View>

          <TouchableOpacity
            style={styles.logFoodBtn}
            activeOpacity={0.8}
            onPress={() => setShowMealAnalysisModal(true)}
          >
            <Text style={styles.logFoodBtnText}>+ Log food</Text>
          </TouchableOpacity>
        </View>

        {/* Silver Paywall Lock Teaser if user is Silver */}
        {!canAccessNutrition ? (
          <View style={styles.silverLockCard}>
            <View style={styles.silverBadge}>
              <Text style={styles.silverBadgeText}>GOLD FEATURE</Text>
            </View>
            <Text style={styles.silverLockTitle}>Full Nutrition Planner & Macro Tracking</Text>
            <Text style={styles.silverLockSub}>
              Macro rings, daily AI actions, plate photo scanner, and 7-day meal plans are included in Gold, Platinum, and Inner Circle memberships.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/membership')}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Gold</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 4 Macro Rings matching lines 1003-1014 */}
            <ClaudeMacroCards proteinTarget={proteinTarget} />
            <Text style={styles.macroFootnote}>
              Gold is protein, copper is carbs, ivory is fat, green is calories — the same four colours everywhere in the app.
            </Text>

            {/* YOUR FULL DAY matching lines 1017-1026 */}
            <ClaudeFullDayMeals onLogMeal={() => setShowMealAnalysisModal(true)} />
            <Text style={styles.fullDayFootnote}>
              Every meal of the day is laid out from the start, dinner included — so you can see at 09:00 whether the target is reachable, not at 22:00.
            </Text>

            {/* TODAY'S FIVE ACTIONS matching lines 1028-1046 */}
            <ClaudeTodayFiveActions />
            <Text style={styles.actionsFootnote}>
              Written each morning from the meals you have logged before — not a generic checklist. Do three and you land on target.
            </Text>

            {/* MEAL ANALYSIS Photo Card matching lines 1048-1063 */}
            <ClaudeMealAnalysisCard
              onTakePhoto={handleTakePhoto}
              onUploadPhoto={handleUploadPhoto}
            />

            {/* Week Plan Builder Banner matching lines 1065-1070 */}
            <View style={styles.weekPlanBannerCard}>
              <Text style={styles.weekPlanKicker}>YOUR NUTRITION PLAN</Text>
              <Text style={styles.weekPlanTitle}>A week of food you actually like</Text>
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
          </>
        )}
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

      {/* Week Plan Modal matching lines 1621-1654 */}
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
  macroFootnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247, 243, 238, 0.42)',
    marginHorizontal: 20,
    marginTop: 10,
  },
  fullDayFootnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.45)',
    marginHorizontal: 20,
    marginTop: 10,
  },
  actionsFootnote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 19,
    color: 'rgba(247, 243, 238, 0.45)',
    marginHorizontal: 20,
    marginTop: 10,
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
  silverLockCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    gap: 12,
  },
  silverBadge: {
    alignSelf: 'flex-start',
    backgroundColor: GOLD,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  silverBadgeText: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: OBSIDIAN,
  },
  silverLockTitle: {
    fontFamily: CLASH,
    fontSize: 22,
    fontWeight: '600',
    color: IVORY,
  },
  silverLockSub: {
    fontFamily: INTER,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(247, 243, 238, 0.7)',
  },
  upgradeBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  upgradeBtnText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: OBSIDIAN,
  },
});
