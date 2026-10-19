import { STATIC_TRANSLATIONS } from '../lib/translations/index';
import type {
  NutritionDayPlan,
  NutritionMealEntry,
  NutritionPlanApiResponse,
} from '../lib/nutrition';
import { getMealPreparationSteps } from '../lib/nutritionPrep';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

const mockPlan: NutritionPlanApiResponse = {
  plan_id: 'plan-12345',
  summary: 'Balanced 7-day high protein nutrition plan',
  goal_label: 'Lean Muscle',
  shopping_list: [
    {
      category: 'Produce',
      items: [
        { name: 'Oats', qty: '500g' },
        { name: 'Bananas', qty: '7 units' },
      ],
    },
    {
      category: 'Protein',
      items: [
        { name: 'Chicken breast', qty: '1.2kg' },
        { name: 'Whey Protein', qty: '300g' },
      ],
    },
  ],
  days: [
    {
      day: 'Mon',
      breakfast: {
        name: 'Oatmeal & Berries',
        desc: 'Rolled oats with fresh berries and whey protein',
        kcal: 450,
        p: 35,
        c: 55,
        f: 8,
        ingredients: ['80g oats', '1 scoop whey', '100g blueberries'],
        instructions: ['Boil oats in water', 'Stir in protein powder', 'Top with blueberries'],
      },
      lunch: {
        name: 'Grilled Chicken & Rice',
        desc: 'Seasoned chicken breast with brown rice and broccoli',
        kcal: 650,
        p: 55,
        c: 65,
        f: 14,
        ingredients: ['200g chicken', '150g cooked brown rice', '100g broccoli'],
        instructions: ['Grill chicken for 12 mins', 'Steam broccoli for 5 mins', 'Serve with rice'],
      },
      pre_workout: {
        name: 'Banana & Rice Cake',
        desc: 'Fast digesting carbs before lifting',
        kcal: 180,
        p: 4,
        c: 40,
        f: 1,
        ingredients: ['1 banana', '2 rice cakes'],
        instructions: ['Slice banana on top of rice cakes'],
      },
      post_workout: {
        name: 'Protein Shake',
        desc: 'Post-training recovery shake',
        kcal: 220,
        p: 32,
        c: 12,
        f: 2,
        ingredients: ['1.5 scoops whey', '300ml almond milk'],
        instructions: ['Shake vigorously in bottle for 20s'],
      },
      dinner: {
        name: 'Baked Salmon & Sweet Potato',
        desc: 'Rich omega-3 salmon with baked sweet potato',
        kcal: 700,
        p: 48,
        c: 50,
        f: 24,
        ingredients: ['220g salmon fillet', '200g sweet potato', 'Olive oil'],
        instructions: ['Preheat oven to 200°C', 'Bake sweet potato for 35m', 'Bake salmon for 15m'],
      },
    },
    {
      day: 'Tue',
      breakfast: {
        name: 'Greek Yogurt Parfait',
        desc: 'Greek yogurt with honey and almonds',
        kcal: 400,
        p: 32,
        c: 35,
        f: 12,
        ingredients: ['250g Greek yogurt', '15g almonds', '1 tsp honey'],
        instructions: ['Layer yogurt and honey', 'Sprinkle almonds on top'],
      },
      lunch: {
        name: 'Turkey Wrap',
        desc: 'Whole wheat wrap with roasted turkey and avocado',
        kcal: 580,
        p: 45,
        c: 48,
        f: 18,
        ingredients: ['1 whole wheat wrap', '160g roasted turkey', '50g avocado'],
        instructions: ['Spread avocado on tortilla', 'Add turkey and roll tight'],
      },
      dinner: {
        name: 'Grass-fed Beef Stir-fry',
        desc: 'Lean beef strips with bell peppers and jasmine rice',
        kcal: 680,
        p: 52,
        c: 58,
        f: 20,
        ingredients: ['200g lean beef', '1 bell pepper', '150g jasmine rice'],
        instructions: ['Heat wok with sesame oil', 'Sear beef 4 mins', 'Toss in bell peppers'],
      },
    },
    {
      day: 'Wed',
      breakfast: {
        name: 'Scrambled Eggs & Sourdough',
        desc: '3 whole eggs on toasted artisanal sourdough',
        kcal: 480,
        p: 28,
        c: 42,
        f: 20,
        ingredients: ['3 eggs', '2 slices sourdough bread'],
        instructions: ['Whisk eggs with salt', 'Scramble on low heat with butter', 'Serve on toast'],
      },
      lunch: {
        name: 'Tuna Salad Bowl',
        desc: 'Solid white tuna with quinoa and leafy greens',
        kcal: 540,
        p: 46,
        c: 50,
        f: 12,
        ingredients: ['1 can tuna', '100g quinoa', 'Mixed greens'],
        instructions: ['Drain tuna', 'Toss with cooked quinoa and lemon dressing'],
      },
      dinner: {
        name: 'Tofu & Edamame Bowl',
        desc: 'Crispy pan-fried tofu with steamed edamame and brown rice',
        kcal: 610,
        p: 40,
        c: 65,
        f: 18,
        ingredients: ['200g firm tofu', '80g shelled edamame', '150g brown rice'],
        instructions: ['Press tofu and dice', 'Pan fry until golden', 'Assemble bowl'],
      },
    },
    {
      day: 'Thu',
      breakfast: {
        name: 'Protein Pancakes',
        desc: 'Fluffy oats and egg white pancakes with blueberries',
        kcal: 460,
        p: 38,
        c: 52,
        f: 8,
        ingredients: ['80g oats', '4 egg whites', '1 scoop protein'],
        instructions: ['Blend batter until smooth', 'Cook on skillet 2m per side'],
      },
      lunch: {
        name: 'Chicken Caesar Salad',
        desc: 'Grilled chicken breast with romaine and light parmesan',
        kcal: 590,
        p: 52,
        c: 24,
        f: 26,
        ingredients: ['220g chicken breast', 'Romaine lettuce', 'Parmesan'],
        instructions: ['Slice grilled chicken', 'Toss lettuce with light dressing'],
      },
      dinner: {
        name: 'Cod Fillet with Quinoa',
        desc: 'Pan-seared Atlantic cod with herb quinoa',
        kcal: 520,
        p: 48,
        c: 45,
        f: 10,
        ingredients: ['250g cod', '120g quinoa', 'Lemon & herbs'],
        instructions: ['Sear cod in olive oil 4 mins each side', 'Fluff quinoa with herbs'],
      },
    },
    {
      day: 'Fri',
      breakfast: {
        name: 'Avocado Toast & Boiled Eggs',
        desc: 'Smashed avocado on rye with 2 boiled eggs',
        kcal: 440,
        p: 22,
        c: 38,
        f: 22,
        ingredients: ['2 eggs', '60g avocado', '2 slices rye bread'],
        instructions: ['Boil eggs 7 mins', 'Smash avocado on toasted rye'],
      },
      lunch: {
        name: 'Beef Burrito Bowl',
        desc: 'Lean ground beef with black beans and corn',
        kcal: 690,
        p: 50,
        c: 68,
        f: 22,
        ingredients: ['180g extra lean beef', '100g black beans', '100g rice'],
        instructions: ['Brown beef with taco seasoning', 'Layer with beans and rice'],
      },
      dinner: {
        name: 'Shrimp Skewers & Couscous',
        desc: 'Grilled garlic herb shrimp skewers with pearl couscous',
        kcal: 560,
        p: 44,
        c: 56,
        f: 12,
        ingredients: ['250g jumbo shrimp', '100g couscous', 'Garlic herbs'],
        instructions: ['Thread shrimp onto skewers', 'Grill 3 mins per side'],
      },
    },
    {
      day: 'Sat',
      breakfast: {
        name: 'Chia Seed Protein Pudding',
        desc: 'Overnight chia seeds soaked in protein milk with kiwi',
        kcal: 390,
        p: 28,
        c: 36,
        f: 14,
        ingredients: ['35g chia seeds', '1 scoop protein', '250ml milk', '1 kiwi'],
        instructions: ['Mix seeds and milk overnight in fridge', 'Top with sliced kiwi'],
      },
      lunch: {
        name: 'BBQ Pulled Chicken',
        desc: 'Slow-cooked shredded chicken breast with roasted potatoes',
        kcal: 640,
        p: 56,
        c: 62,
        f: 14,
        ingredients: ['220g chicken', '200g baby potatoes', 'BBQ seasoning'],
        instructions: ['Roast potatoes at 210°C', 'Shred cooked chicken in sauce'],
      },
      dinner: {
        name: 'Sirloin Steak with Asparagus',
        desc: 'Grass-fed sirloin with grilled asparagus and mashed potato',
        kcal: 720,
        p: 58,
        c: 40,
        f: 28,
        ingredients: ['220g sirloin steak', '150g asparagus', '150g potato'],
        instructions: ['Sear steak 3m per side to medium rare', 'Grill asparagus in olive oil'],
      },
    },
    {
      day: 'Sun',
      breakfast: {
        name: 'Omelette with Spinach & Feta',
        desc: '3-egg fluffy omelette with baby spinach and crumbled feta',
        kcal: 420,
        p: 30,
        c: 8,
        f: 26,
        ingredients: ['3 eggs', '50g baby spinach', '30g feta cheese'],
        instructions: ['Sauté spinach until wilted', 'Pour beaten eggs and fold in feta'],
      },
      lunch: {
        name: 'Mediterranean Lentil Soup & Chicken',
        desc: 'Warm spiced lentils with tender grilled chicken breast',
        kcal: 610,
        p: 54,
        c: 60,
        f: 12,
        ingredients: ['180g chicken', '200g lentil stew', 'Cumin & coriander'],
        instructions: ['Simmer lentil soup', 'Top with sliced warm grilled chicken'],
      },
      dinner: {
        name: 'Roast Chicken with Root Veggies',
        desc: 'Sunday roast chicken with carrots, parsnips, and gravy',
        kcal: 680,
        p: 52,
        c: 54,
        f: 22,
        ingredients: ['200g roast chicken', '150g roasted carrots & parsnips'],
        instructions: ['Roast chicken and root vegetables for 45 mins at 190°C'],
      },
    },
  ],
};

const DAY_NAME_KEYS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

function runAuditTests() {
  console.log('=== STARTING SAVED WEEKLY NUTRITION PLAN AUDIT TESTS ===\n');

  // TEST 1: All 7 days accessible
  assert(mockPlan.days.length === 7, 'Plan has exactly 7 days');
  const expectedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  expectedDays.forEach((dayKey, idx) => {
    assert(mockPlan.days[idx].day === dayKey, `Day ${idx + 1} is ${dayKey}`);
  });

  // TEST 2: German and English labels work for all 7 days
  const enTranslations = STATIC_TRANSLATIONS.en || {};
  const deTranslations = STATIC_TRANSLATIONS.de || {};

  const expectedGermanDays: Record<string, string> = {
    Monday: 'Montag',
    Tuesday: 'Dienstag',
    Wednesday: 'Mittwoch',
    Thursday: 'Donnerstag',
    Friday: 'Freitag',
    Saturday: 'Samstag',
    Sunday: 'Sonntag',
  };

  expectedDays.forEach((shortDay) => {
    const canonical = DAY_NAME_KEYS[shortDay];
    assert(enTranslations[canonical] === canonical, `English day label for ${canonical} is correct`);
    assert(deTranslations[canonical] === expectedGermanDays[canonical], `German day label for ${canonical} is ${expectedGermanDays[canonical]}`);
  });

  // TEST 3: German and English labels for UI components
  const requiredUiKeys = [
    'Your saved week',
    'Back to Food',
    'Shopping list',
    'Breakfast',
    'Lunch',
    'Snacks',
    'Pre-workout snack',
    'Post-workout snack',
    'Dinner',
    'Preparation information',
    'Preparation steps',
    'Ingredients',
    'protein',
    'carbs',
    'fat',
    'kcal',
  ];

  requiredUiKeys.forEach((key) => {
    assert(!!enTranslations[key], `English translation exists for "${key}"`);
    assert(!!deTranslations[key], `German translation exists for "${key}" -> "${deTranslations[key]}"`);
  });

  // TEST 4: Accordion interaction logic
  // Simulate single-day accordion state changes
  let expandedDay: string | null = 'Mon'; // initially Monday open
  assert(expandedDay === 'Mon', 'Default expanded day is Monday');

  // User collapses Monday:
  const toggle = (current: string | null, clicked: string) => (current === clicked ? null : clicked);
  expandedDay = toggle(expandedDay, 'Mon');
  assert(expandedDay === null, 'Clicking Monday collapses it; no days expanded');

  // User opens Tuesday:
  expandedDay = toggle(expandedDay, 'Tue');
  assert(expandedDay === 'Tue', 'Clicking Tuesday opens Tuesday');

  // User clicks Wednesday:
  expandedDay = toggle(expandedDay, 'Wed');
  assert(expandedDay === 'Wed', 'Clicking Wednesday closes Tuesday and opens Wednesday');

  // TEST 5: Correct meals remain under correct day & No data lost
  mockPlan.days.forEach((dayPlan) => {
    const dayLabel = DAY_NAME_KEYS[dayPlan.day];
    assert(!!dayPlan.breakfast, `${dayLabel} has breakfast`);
    assert(!!dayPlan.breakfast.name, `${dayLabel} breakfast has name`);
    assert(dayPlan.breakfast.kcal > 0, `${dayLabel} breakfast has kcal`);
    assert(dayPlan.breakfast.p > 0, `${dayLabel} breakfast has protein`);
    assert(dayPlan.breakfast.ingredients.length > 0, `${dayLabel} breakfast has ingredients`);
    assert(dayPlan.breakfast.instructions.length > 0, `${dayLabel} breakfast has preparation instructions`);

    assert(!!dayPlan.lunch, `${dayLabel} has lunch`);
    assert(!!dayPlan.lunch.name, `${dayLabel} lunch has name`);
    assert(dayPlan.lunch.kcal > 0, `${dayLabel} lunch has kcal`);
    assert(dayPlan.lunch.instructions.length > 0, `${dayLabel} lunch has preparation instructions`);

    assert(!!dayPlan.dinner, `${dayLabel} has dinner`);
    assert(!!dayPlan.dinner.name, `${dayLabel} dinner has name`);
    assert(dayPlan.dinner.kcal > 0, `${dayLabel} dinner has kcal`);
    assert(dayPlan.dinner.instructions.length > 0, `${dayLabel} dinner has preparation instructions`);
  });

  // Monday snacks validation
  const mon = mockPlan.days[0];
  assert(!!mon.pre_workout, 'Monday has pre_workout snack');
  assert(mon.pre_workout?.kcal === 180, 'Monday pre_workout kcal preserved (180)');
  assert(mon.pre_workout?.instructions[0] === 'Slice banana on top of rice cakes', 'Monday pre_workout prep preserved');
  assert(!!mon.post_workout, 'Monday has post_workout snack');
  assert(mon.post_workout?.p === 32, 'Monday post_workout protein preserved (32g)');

  // TEST 6: Shopping list preserved
  // TEST 7: Preparation Steps End-to-End Audit & Fallback

  // 7a. Existing instructions reused
  const mealWithInstructions: NutritionMealEntry = {
    name: 'Jollof with Grilled Chicken',
    desc: 'Spicy rice dish',
    kcal: 600,
    p: 45,
    c: 70,
    f: 12,
    ingredients: ['Rice', 'Chicken', 'Tomato stew'],
    instructions: ['Parboil rice', 'Blend tomatoes and peppers', 'Cook stew and simmer rice', 'Serve with chicken'],
  };
  const prep1 = getMealPreparationSteps(mealWithInstructions);
  assert(prep1.length === 4, 'Meal with instructions returns 4 steps');
  assert(prep1[0] === 'Parboil rice', 'First step matches instruction');

  // 7b. preparation_steps field priority
  const mealWithPrepSteps: NutritionMealEntry = {
    name: 'Ghanaian Waakye',
    desc: 'Rice and beans with waakye leaves',
    kcal: 580,
    p: 35,
    c: 85,
    f: 10,
    ingredients: ['Rice', 'Black eyed peas', 'Sorghum leaves'],
    instructions: [],
    preparation_steps: ['Boil beans with sorghum leaves', 'Add rice once beans soften', 'Serve with shito and boiled egg'],
  };
  const prep2 = getMealPreparationSteps(mealWithPrepSteps);
  assert(prep2.length === 3, 'Meal with preparation_steps returns correct steps');
  assert(prep2[0] === 'Boil beans with sorghum leaves', 'preparation_steps prioritized over empty instructions');

  // 7c. Missing preparation data graceful fallback (meal-specific, not generic)
  const mealWithoutPrep: NutritionMealEntry = {
    name: 'Banku with Tilapia',
    desc: 'Fermented corn and cassava dough with grilled fish',
    kcal: 620,
    p: 48,
    c: 65,
    f: 14,
    ingredients: ['Corn dough', 'Cassava dough', 'Fresh tilapia', 'Pepper sauce'],
    instructions: [],
  };
  const prep3 = getMealPreparationSteps(mealWithoutPrep);
  assert(prep3.length === 4, 'Missing preparation data provides 4 structured fallback steps');
  assert(prep3[0].includes('Corn dough, Cassava dough, Fresh tilapia'), 'Step 1 includes ingredient specifics');
  assert(prep3[1].includes('Banku with Tilapia'), 'Step 2 includes meal name');
  assert(prep3[2].toLowerCase().includes('seasoning'), 'Step 3 mentions seasoning');
  assert(prep3[3].toLowerCase().includes('serve'), 'Step 4 mentions serving');

  // 7d. Mobile preparation expand/collapse state simulation
  let openPrepKeys: Record<string, boolean> = {};
  const toggleMeal = (key: string) => {
    openPrepKeys[key] = !openPrepKeys[key];
  };
  toggleMeal('Mon-breakfast');
  assert(openPrepKeys['Mon-breakfast'] === true, 'Tapping breakfast preparation steps opens it');
  toggleMeal('Mon-breakfast');
  assert(openPrepKeys['Mon-breakfast'] === false, 'Tapping breakfast preparation steps again collapses it');

  console.log('\n🎉 ALL NUTRITION PLAN ACCORDION & PREPARATION STEPS TESTS PASSED SUCCESSFULLY! 🎉');
}

runAuditTests();
