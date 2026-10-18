import { formatStructuredNutritionSummary } from '../lib/nutritionSummary';
import type { NutritionPlanApiResponse } from '../lib/nutrition';
import { STATIC_TRANSLATIONS } from '../lib/translations/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

function runNutritionSummaryAudit() {
  console.log('=== STARTING NUTRITION PLAN SUMMARY AUDIT TESTS ===\n');

  // TEST 1: Ghanaian maintenance plan with nut allergy
  const ghanaianPlan: NutritionPlanApiResponse = {
    summary: 'Legacy long essay: Welcome to your 7-day Ghanaian meal plan designed to help you stay healthy and nourished while honoring your local traditions and portions and timing.',
    goal_label: 'Maintenance',
    daily_protein_target: 112,
    profile: {
      goal: 'g3',
      country: 'Ghana',
      cuisine: 'Ghanaian',
      allergies: 'nut',
    },
    shopping_list: [],
    days: [
      {
        day: 'Mon',
        breakfast: { name: 'Waakye with egg', desc: '', kcal: 450, p: 25, c: 60, f: 10, ingredients: [], instructions: [] },
        lunch: { name: 'Red Red with fried fish', desc: '', kcal: 700, p: 40, c: 80, f: 18, ingredients: [], instructions: [] },
        dinner: { name: 'Grilled Tilapia with Banku', desc: '', kcal: 650, p: 35, c: 70, f: 15, ingredients: [], instructions: [] },
        pre_workout: { name: 'Banana', desc: '', kcal: 150, p: 2, c: 35, f: 0, ingredients: [], instructions: [] },
        post_workout: { name: 'Protein Shake', desc: '', kcal: 150, p: 10, c: 10, f: 2, ingredients: [], instructions: [] },
      },
    ],
  };

  const ghanaResult = formatStructuredNutritionSummary(ghanaianPlan);
  console.log('--- Case 1: Ghanaian Maintenance ---');
  console.log(ghanaResult.fullText);

  assert(ghanaResult.primaryLine.includes('Ghanaian'), 'Primary line includes Ghanaian');
  assert(ghanaResult.primaryLine.includes('maintenance'), 'Primary line includes maintenance goal');
  assert(ghanaResult.primaryLine.includes('~2,100 kcal/day'), 'Primary line includes ~2,100 kcal/day');
  assert(ghanaResult.primaryLine.includes('112g protein/day'), 'Primary line includes 112g protein/day');
  assert(ghanaResult.contextLine.includes('Nut allergy respected'), 'Context line specifies Nut allergy respected');
  assert(ghanaResult.contextLine.includes('authentic Ghanaian options'), 'Context line prioritizes authentic Ghanaian options');
  assert(!ghanaResult.fullText.includes('Welcome to your 7-day'), 'Eliminated verbose AI introductory essay');
  assert(ghanaResult.fullText.split('\n').length <= 2, 'Summary is concise (max 2 lines)');

  // TEST 2: German muscle building plan without allergies
  const germanPlan: NutritionPlanApiResponse = {
    summary: 'A detailed high-protein muscle building diet tailored for athletic growth with rich German ingredients and structured macro ratios throughout the entire week.',
    goal_label: 'Muscle Building',
    daily_protein_target: 160,
    profile: {
      goal: 'g2',
      country: 'Germany',
      cuisine: 'German',
      allergies: '',
    },
    shopping_list: [],
    days: [
      {
        day: 'Mon',
        breakfast: { name: 'Quark with Berries & Oats', desc: '', kcal: 550, p: 45, c: 60, f: 10, ingredients: [], instructions: [] },
        lunch: { name: 'Chicken with Potatoes', desc: '', kcal: 850, p: 55, c: 80, f: 18, ingredients: [], instructions: [] },
        dinner: { name: 'Salmon and Steamed Vegetables', desc: '', kcal: 800, p: 50, c: 50, f: 25, ingredients: [], instructions: [] },
        pre_workout: { name: 'Energy Bar', desc: '', kcal: 200, p: 5, c: 40, f: 2, ingredients: [], instructions: [] },
        post_workout: { name: 'Whey Protein Shake', desc: '', kcal: 200, p: 25, c: 10, f: 2, ingredients: [], instructions: [] },
      },
    ],
  };

  const germanResult = formatStructuredNutritionSummary(germanPlan);
  console.log('\n--- Case 2: German Muscle Building ---');
  console.log(germanResult.fullText);

  assert(germanResult.primaryLine.includes('German'), 'Primary line includes German');
  assert(germanResult.primaryLine.includes('muscle building'), 'Primary line includes muscle building');
  assert(germanResult.primaryLine.includes('~2,600 kcal/day'), 'Primary line includes ~2,600 kcal/day');
  assert(germanResult.primaryLine.includes('160g protein/day'), 'Primary line includes 160g protein/day');
  assert(germanResult.contextLine.includes('authentic German options'), 'Context line prioritizes authentic German options');
  assert(!germanResult.contextLine.includes('allergy respected'), 'No allergy mentioned when none specified');

  // TEST 3: Italian weight loss plan with lactose allergy
  const italianPlan: NutritionPlanApiResponse = {
    summary: 'An Italian nutrition plan designed to support fat loss while maintaining authentic Mediterranean culinary flavors and keeping caloric density controlled.',
    goal_label: 'Weight Loss',
    daily_protein_target: 135,
    profile: {
      goal: 'g1',
      country: 'Italy',
      cuisine: 'Italian',
      allergies: 'lactose',
    },
    shopping_list: [],
    days: [
      {
        day: 'Mon',
        breakfast: { name: 'Egg whites & Fruit', desc: '', kcal: 380, p: 30, c: 40, f: 8, ingredients: [], instructions: [] },
        lunch: { name: 'Tuna Salad Bowl', desc: '', kcal: 550, p: 45, c: 45, f: 12, ingredients: [], instructions: [] },
        dinner: { name: 'Grilled Chicken & Greens', desc: '', kcal: 620, p: 40, c: 45, f: 16, ingredients: [], instructions: [] },
        pre_workout: { name: 'Apple', desc: '', kcal: 100, p: 1, c: 25, f: 0, ingredients: [], instructions: [] },
        post_workout: { name: 'Isolate Protein Shake', desc: '', kcal: 200, p: 25, c: 10, f: 1, ingredients: [], instructions: [] },
      },
    ],
  };

  const italianResult = formatStructuredNutritionSummary(italianPlan);
  console.log('\n--- Case 3: Italian Weight Loss ---');
  console.log(italianResult.fullText);

  assert(italianResult.primaryLine.includes('Italian'), 'Primary line includes Italian');
  assert(italianResult.primaryLine.includes('weight loss'), 'Primary line includes weight loss');
  assert(italianResult.primaryLine.includes('~1,850 kcal/day'), 'Primary line includes ~1,850 kcal/day');
  assert(italianResult.primaryLine.includes('135g protein/day'), 'Primary line includes 135g protein/day');
  assert(italianResult.contextLine.includes('Lactose allergy respected'), 'Context line mentions Lactose allergy respected');
  assert(italianResult.contextLine.includes('authentic Italian options'), 'Context line prioritizes authentic Italian options');

  // TEST 4: Nigerian endurance plan with gluten allergy & vegetarian diet
  const nigerianPlan: NutritionPlanApiResponse = {
    summary: 'A Nigerian endurance plan for high energy.',
    goal_label: 'Energy & Endurance',
    daily_protein_target: 125,
    profile: {
      goal: 'g5',
      country: 'Nigeria',
      cuisine: 'Nigerian',
      allergies: 'gluten',
      diet: 'vegetarian',
    },
    shopping_list: [],
    days: [
      {
        day: 'Mon',
        breakfast: { name: 'Moi Moi & Fruit', desc: '', kcal: 450, p: 25, c: 55, f: 10, ingredients: [], instructions: [] },
        lunch: { name: 'Beans Porridge & Plantain', desc: '', kcal: 750, p: 40, c: 90, f: 18, ingredients: [], instructions: [] },
        dinner: { name: 'Vegetable Egusi Soup & Eba', desc: '', kcal: 750, p: 35, c: 80, f: 22, ingredients: [], instructions: [] },
        pre_workout: { name: 'Dates & Peanuts', desc: '', kcal: 200, p: 5, c: 35, f: 5, ingredients: [], instructions: [] },
        post_workout: { name: 'Plant Protein Shake', desc: '', kcal: 200, p: 25, c: 15, f: 2, ingredients: [], instructions: [] },
      },
    ],
  };

  const nigerianResult = formatStructuredNutritionSummary(nigerianPlan);
  console.log('\n--- Case 4: Nigerian Endurance Vegetarian ---');
  console.log(nigerianResult.fullText);

  assert(nigerianResult.primaryLine.includes('Nigerian'), 'Primary line includes Nigerian');
  assert(nigerianResult.primaryLine.includes('endurance'), 'Primary line includes endurance');
  assert(nigerianResult.primaryLine.includes('~2,350 kcal/day'), 'Primary line includes ~2,350 kcal/day');
  assert(nigerianResult.primaryLine.includes('125g protein/day'), 'Primary line includes 125g protein/day');
  assert(nigerianResult.contextLine.includes('Gluten allergy respected'), 'Gluten allergy respected');
  assert(nigerianResult.contextLine.includes('Vegetarian diet respected'), 'Vegetarian diet respected');
  assert(nigerianResult.contextLine.includes('authentic Nigerian options'), 'Prioritizes authentic Nigerian options');

  // TEST 5: Default balanced plan without profile (legacy record)
  const legacyPlan: NutritionPlanApiResponse = {
    summary: 'A very long legacy essay that a previous model version stored. It talks on and on without structured metrics, pushing everything down.',
    goal_label: 'Muscle Building',
    days: [
      {
        day: 'Mon',
        breakfast: { name: 'Oatmeal', desc: '', kcal: 400, p: 25, c: 50, f: 8, ingredients: [], instructions: [] },
        lunch: { name: 'Chicken Rice', desc: '', kcal: 650, p: 45, c: 65, f: 14, ingredients: [], instructions: [] },
        dinner: { name: 'Steak & Potato', desc: '', kcal: 700, p: 50, c: 45, f: 20, ingredients: [], instructions: [] },
      },
    ],
    shopping_list: [],
  };

  const legacyResult = formatStructuredNutritionSummary(legacyPlan);
  console.log('\n--- Case 5: Legacy Unstructured Record ---');
  console.log(legacyResult.fullText);

  assert(legacyResult.primaryLine.includes('muscle building'), 'Dynamic goal extracted from goal_label');
  assert(legacyResult.primaryLine.includes('~1,750 kcal/day'), 'Dynamic average calories calculated from meals');
  assert(legacyResult.primaryLine.includes('120g protein/day'), 'Dynamic protein calculated');
  assert(!legacyResult.fullText.includes('very long legacy essay'), 'Raw verbose essay replaced by structured summary');

  console.log('\n🎉 ALL NUTRITION SUMMARY AUDIT TESTS PASSED SUCCESSFULLY! 🎉');
}

runNutritionSummaryAudit();
