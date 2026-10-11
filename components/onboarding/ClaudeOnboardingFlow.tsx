import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthUser,
  fetchCurrentUser,
  fetchCurrentUserBodyMetrics,
  fetchCurrentUserOnboarding,
  fetchSubscriptionPlans,
  startGoldTrial,
  startPhaseOneBetaSubscription,
  updateCurrentUserBodyMetrics,
  updateCurrentUserOnboarding,
  updateCurrentUserProfile,
  updateCurrentUserSubscription,
} from '../../lib/api';
import { getPostAuthRoute } from '../../lib/access';
import { replaceRoute } from '../../lib/navigation';
import { buildE164PhoneNumber, normalizeDialCode, splitE164PhoneNumber } from '../../lib/phone';
import ClaudeInnerCircleApplyModal from '../profile/ClaudeInnerCircleApplyModal';

export const ONBOARDING_STEP_KEY = '@vf_onboarding_current_step';
export const ONBOARDING_ANSWERS_KEY = '@vf_onboarding_answers';

// Design tokens matching Claude reference
const OBSIDIAN = '#0D0D0D';
const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const IVORY = '#F7F3EE';
const GREEN = '#1A7A4A';
const BLUE_GRAY = '#8FA8C4';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });
const MONO = Platform.select({ web: "'JetBrains Mono', monospace", default: 'Courier' });

const STEPS_META = [
  ['Welcome', '0:00 · install to first tap', 'One promise, three numbers, one language', 'No carousel, no sign-up wall, no permission prompts. A single sentence that names the real problem — showing up on the bad days.'],
  ['Register', '0:10', 'Name and email, nothing more', 'Google is the one social option, in Navy with a copper edge. Email is a first-class path: name, email and password, or emailed code.'],
  ['Question 1 · Why', '0:25', 'The one question that shapes the copy', 'Five honest options, no “other” dumping ground. This answer is never shown as a stat; it becomes the wording of the nudge at 20:30 on a Tuesday.'],
  ['Question 2 · Equipment', '0:50', 'The answer changes a number instantly', 'Four plain places to train — gym, body weight only, CrossFit box, home gym — and home gym opens a second row for what you own. Every tap updates “N workouts are yours” live.'],
  ['Question 3 · Time', '1:15', 'Honesty is easier than ambition', 'The framing — “not the hours you wish you had” — lowers the number people pick, which raises the chance they keep it. The weekly total appears underneath.'],
  ['Question 4 · Numbers', '1:40', 'The calculation happens in front of them', 'Weight is a stepper, not a keyboard, and the protein target recalculates on every tap with the arithmetic shown (1.6 g × kg). Calories, carbs and water appear in their permanent app colours.'],
  ['Building', '2:00', 'Four seconds of visible work', 'Long enough to feel considered, short enough not to annoy. Each line ticks green as it resolves and quotes the user\'s own answers back at them. The button only appears at 100%.'],
  ['Plan reveal', '2:10', 'The wow, and it is all their own words', 'A named plan, a first session ready now, the protein target, the workout count from their kit, and the actual week. Nothing generic.'],
  ['Identity', '2:35', 'Asked after the payoff, not before', 'By now the app has given something, so asking for a sentence feels like a fair trade rather than an interrogation. Skippable in one tap, stored verbatim, and shown only after finished sessions.'],
  ['Tier', '2:50', 'Choose with the plan already in hand', 'Pricing arrives last, after value is on the table. Every paid tier gets the same five days so nobody is funnelled; Inner Circle sits apart as an application.'],
  ['Payment', '3:00', 'Priced after the plan, never before it', 'The tier is already chosen, so this screen only has to be honest: what is being started, when the first charge lands, and what it costs either way. Prices and methods follow the region.'],
  ['Ready', '3:10', 'End on an action — and only now, contact', 'No feature carousel. One gold button into the session that was promised, and a quiet second option for people who want to look around. Contact for reminders is asked here.'],
];

const GOALS = [
  ['To feel strong again', 'Most people your age pick this one'],
  ['To keep up with my kids', 'Energy first, aesthetics second'],
  ['My doctor asked me to', 'We keep the intensity conservative'],
  ['To lose weight steadily', 'No crash plans, no 1 200 kcal days'],
  ['To build visible muscle', 'Progressive load, four days a week'],
];

const PLACES: [string, string, number][] = [
  ['Gym equipment', 'A commercial gym with machines and free weights', 170],
  ['Only body weight', 'No equipment at all — floor space and a wall', 62],
  ['CrossFit gym', 'Barbells, rigs, boxes, rowers', 148],
  ['Home gym', 'Tell us what you own below', 62],
];

const KITS: [string, number][] = [
  ['Dumbbells', 48],
  ['Barbells', 34],
  ['Pull-up bar', 16],
  ['Kettlebell', 14],
];

interface RegionDef {
  dial: string;
  sample: string;
  n: string;
  cur: string;
  rate: number;
  fast: string;
  tz: string;
  zone: string;
  methods: [string, string, string, string, string, string, string, string][];
  note: string;
  legal: string;
  nudge: string;
}

const REGIONS: Record<string, RegionDef> = {
  de: {
    dial: '+49',
    sample: '171 555 0148',
    n: 'Germany',
    cur: '€',
    rate: 1,
    fast: 'Pay with Apple Pay',
    tz: 'CET',
    zone: '20:30 CET',
    methods: [
      ['Card', 'Visa, Mastercard, Amex', 'CARD NUMBER', '1234 5678 9012 3456', 'EXPIRY', 'MM / YY', 'CVC', '123'],
      ['SEPA direct debit', 'Straight from your German bank account', 'IBAN', 'DE00 0000 0000 0000 0000 00', 'ACCOUNT HOLDER', 'Michael Krause', 'BIC', 'optional'],
      ['PayPal', 'You will be handed over to PayPal', '', '', '', '', '', ''],
      ['Google Pay', 'Cards saved in your Google account', '', '', '', '', '', ''],
    ],
    note: 'Prices in euros. VAT included, and the 14-day EU right of withdrawal applies.',
    legal: '14-day right of withdrawal in the EU',
    nudge: 'Push',
  },
  gh: {
    dial: '+233',
    sample: '24 000 0000',
    n: 'Ghana',
    cur: 'GH₵',
    rate: 16.4,
    fast: 'Pay with MTN MoMo',
    tz: 'GMT',
    zone: '20:30 GMT',
    methods: [
      ['MTN Mobile Money', 'The number you registered with MTN', 'MOMO NUMBER', '024 000 0000', 'NETWORK', 'MTN', 'NAME', 'Kofi Mensah'],
      ['Telecel Cash', 'Formerly Vodafone Cash', 'WALLET NUMBER', '020 000 0000', 'NETWORK', 'Telecel', 'NAME', 'Kofi Mensah'],
      ['Card', 'Visa, Mastercard', 'CARD NUMBER', '1234 5678 9012 3456', 'EXPIRY', 'MM / YY', 'CVC', '123'],
      ['Bank transfer', 'GCB, Ecobank, Fidelity', 'ACCOUNT NUMBER', '0000000000', 'BANK', 'GCB', 'NAME', 'Kofi Mensah'],
    ],
    note: 'Prices in cedis, charged locally — no foreign-card fee. Mobile Money first.',
    legal: 'Refund within 14 days if you have not started a plan',
    nudge: 'WhatsApp',
  },
  in: {
    dial: '+91',
    sample: '98 0000 0000',
    n: 'India',
    cur: '₹',
    rate: 90,
    fast: 'Pay with UPI',
    tz: 'IST',
    zone: '20:30 IST',
    methods: [
      ['UPI', 'GPay, PhonePe, Paytm — any UPI app', 'UPI ID', 'name@okhdfcbank', 'APP', 'GPay', 'NAME', 'Arjun Rao'],
      ['Card', 'Visa, Mastercard, RuPay', 'CARD NUMBER', '1234 5678 9012 3456', 'EXPIRY', 'MM / YY', 'CVC', '123'],
      ['Net banking', 'All major Indian banks', 'BANK', 'HDFC', 'ACCOUNT', '0000000000', 'NAME', 'Arjun Rao'],
      ['Paytm wallet', 'Balance in your Paytm wallet', '', '', '', '', '', ''],
    ],
    note: 'Prices in rupees, charged in India — RBI e-mandate rules apply to renewals.',
    legal: 'RBI e-mandate: you approve every renewal in advance',
    nudge: 'WhatsApp',
  },
  uk: {
    dial: '+44',
    sample: '7700 900148',
    n: 'United Kingdom',
    cur: '£',
    rate: 0.86,
    fast: 'Pay with Apple Pay',
    tz: 'GMT',
    zone: '20:30 GMT',
    methods: [
      ['Card', 'Visa, Mastercard, Amex', 'CARD NUMBER', '1234 5678 9012 3456', 'EXPIRY', 'MM / YY', 'CVC', '123'],
      ['Bacs direct debit', 'Straight from your UK bank account', 'SORT CODE', '00-00-00', 'ACCOUNT', '00000000', 'NAME', 'James Hill'],
      ['PayPal', 'You will be handed over to PayPal', '', '', '', '', '', ''],
      ['Google Pay', 'Cards saved in your Google account', '', '', '', '', '', ''],
    ],
    note: 'Prices in pounds. Cancel any time from your profile.',
    legal: '14-day cancellation right under UK consumer law',
    nudge: 'Push',
  },
  us: {
    dial: '+1',
    sample: '(415) 555-0148',
    n: 'United States',
    cur: '$',
    rate: 1.09,
    fast: 'Pay with Apple Pay',
    tz: 'ET',
    zone: '8:30 pm, your time',
    methods: [
      ['Card', 'Visa, Mastercard, Amex, Discover', 'CARD NUMBER', '1234 5678 9012 3456', 'EXPIRY', 'MM / YY', 'CVC', '123'],
      ['PayPal', 'You will be handed over to PayPal', '', '', '', '', '', ''],
      ['Google Pay', 'Cards saved in your Google account', '', '', '', '', '', ''],
      ['Cash App Pay', 'Pay from your Cash App balance', '', '', '', '', '', ''],
    ],
    note: 'Prices in dollars. Sales tax added at checkout where it applies.',
    legal: 'Refund within 14 days if you have not started a plan',
    nudge: 'Push',
  },
};

type OnboardingPlanPrice = [string, number, number, string, string, boolean?];

const DEFAULT_PRICES: OnboardingPlanPrice[] = [
  ['Silver', 199, 19, 'Every workout, all 35 challenges, your accountability duo and the journal.', ''],
  ['Gold', 299, 29, 'Silver plus unlimited AI coaching, the nutrition planner and your habit fields.', 'MOST CHOSEN'],
  ['Platinum', 399, 39, 'Gold plus wearable sync, the Monday digest and a human coach each month.', ''],
];
const BETA_TIER_INDEX = -1;
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 140;
const HEIGHT_MIN = 0;
const HEIGHT_MAX = 230;
const AGE_MIN = 0;
const AGE_MAX = 100;

export interface ClaudeOnboardingFlowProps {
  user?: AuthUser | null;
  initialStep?: number;
  onComplete?: () => void;
}

export default function ClaudeOnboardingFlow({
  user: initialUser = null,
  initialStep = 2,
  onComplete,
}: ClaudeOnboardingFlowProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  // Step state: 2 (Question 1) through 11 (Ready)
  const [step, setStep] = useState<number>(initialStep);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(initialUser);

  // User answers
  const [goal, setGoal] = useState<number>(0);
  const [selectedGoals, setSelectedGoals] = useState<number[]>([0]);
  const [place, setPlace] = useState<number>(3); // Default Home gym
  const [kit, setKit] = useState<string[]>(['Dumbbells']);
  const [days, setDays] = useState<number>(4);
  const [mins, setMins] = useState<number>(40);
  const [weight, setWeight] = useState<number>(45);
  const [height, setHeight] = useState<number>(120);
  const [age, setAge] = useState<number>(14);
  const [expandedMetric, setExpandedMetric] = useState<'weight' | 'height' | 'age' | null>('weight');

  const toggleMetric = (metric: 'weight' | 'height' | 'age') => {
    stopHold();
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
    setExpandedMetric((prev) => (prev === metric ? null : metric));
  };

  const [pct, setPct] = useState<number>(0);
  const [prices, setPrices] = useState<OnboardingPlanPrice[]>(DEFAULT_PRICES);
  const [identity, setIdentity] = useState<string>('');
  const [tier, setTier] = useState<number>(BETA_TIER_INDEX); // Default 21-Day Gold Beta
  const [cycle, setCycle] = useState<'year' | 'month'>('year');
  const [region, setRegion] = useState<string>('de');
  const [method, setMethod] = useState<number>(0);
  const [nudge, setNudge] = useState<string[]>(['Push']);
  const [dialCode, setDialCode] = useState<string>('+49');
  const [dialNumber, setDialNumber] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showInnerCircleApply, setShowInnerCircleApply] = useState(false);

  const isHydratedRef = useRef(false);

  const hydratePhoneNumber = (value?: string | null) => {
    const parsedPhone = splitE164PhoneNumber(String(value || '').trim());
    if (!parsedPhone) return false;
    setDialCode(parsedPhone.country.dialCode);
    setDialNumber(parsedPhone.nationalNumber);
    return true;
  };

  // Dynamically load real subscription plans from backend
  useEffect(() => {
    let cancelled = false;
    void fetchSubscriptionPlans()
      .then((res) => {
        if (cancelled || !res?.items?.length) return;
        const silver = res.items.find((i) => i.subscriptionTier === 'SILVER');
        const gold = res.items.find((i) => i.subscriptionTier === 'GOLD');
        const platinum = res.items.find((i) => i.subscriptionTier === 'PLATINUM');

        setPrices([
          [
            'Silver',
            silver?.discountedPriceYearly ?? silver?.priceYearly ?? 199,
            silver?.discountedPriceMonthly ?? silver?.priceMonthly ?? 19,
            silver?.description || 'Every workout, all 35 challenges, your accountability duo and the journal.',
            silver?.isMostPopular ? 'MOST CHOSEN' : '',
            Boolean(silver?.isComingSoon),
          ],
          [
            'Gold',
            gold?.discountedPriceYearly ?? gold?.priceYearly ?? 299,
            gold?.discountedPriceMonthly ?? gold?.priceMonthly ?? 29,
            gold?.description || 'Silver plus unlimited AI coaching, the nutrition planner and your habit fields.',
            gold?.isMostPopular !== false ? 'MOST CHOSEN' : '',
            Boolean(gold?.isComingSoon),
          ],
          [
            'Platinum',
            platinum?.discountedPriceYearly ?? platinum?.priceYearly ?? 399,
            platinum?.discountedPriceMonthly ?? platinum?.priceMonthly ?? 39,
            platinum?.description || 'Gold plus wearable sync, the Monday digest and a human coach each month.',
            platinum?.isMostPopular ? 'MOST CHOSEN' : '',
            Boolean(platinum?.isComingSoon),
          ],
        ]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const goToStep = (nextStep: number) => {
    const target = Math.max(2, Math.min(11, nextStep));
    setStep(target);
    void AsyncStorage.setItem(ONBOARDING_STEP_KEY, String(target)).catch(() => {});
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('step', String(target));
        window.history.replaceState(null, '', url.toString());
      } catch {}
    }
  };

  useEffect(() => {
    if (initialStep >= 2 && initialStep <= 11) {
      setStep(initialStep);
    }
  }, [initialStep]);

  useEffect(() => {
    let cancelled = false;

    const restoreOnboardingState = async () => {
      try {
        let stepFromUrl: number | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const s = urlParams.get('step');
            if (s && !isNaN(Number(s))) {
              stepFromUrl = Math.max(2, Math.min(11, Number(s)));
            }
          } catch {}
        }

        // 1. Fetch real user profile and real onboarding state from the backend
        let activeUser = initialUser;
        try {
          const freshUser = await fetchCurrentUser({ forceRefresh: true });
          if (freshUser) {
            activeUser = freshUser;
            if (!cancelled) {
              setCurrentUser(freshUser);
            }
          }
        } catch {}

        let realOnboarding: any = null;
        try {
          realOnboarding = await fetchCurrentUserOnboarding();
        } catch {}

        let realMetrics: any = null;
        try {
          realMetrics = await fetchCurrentUserBodyMetrics();
        } catch {}

        // 2. Hydrate from backend data if available
        if (realOnboarding && !cancelled) {
          if (realOnboarding.currentStep && realOnboarding.currentStep >= 2 && realOnboarding.currentStep <= 11) {
            if (!stepFromUrl) {
              setStep(realOnboarding.currentStep);
            }
          }

          const storedGoals = Array.isArray(realOnboarding.anamnese?.primaryGoals)
            ? realOnboarding.anamnese.primaryGoals
            : realOnboarding.anamnese?.primaryGoal
              ? [realOnboarding.anamnese.primaryGoal]
              : [];
          if (storedGoals.length) {
            const matchedGoalIndexes = storedGoals
              .map((storedGoal: string) => GOALS.findIndex((g) => g[0].toLowerCase() === String(storedGoal).toLowerCase()))
              .filter((idx: number) => idx >= 0);
            if (matchedGoalIndexes.length) {
              setSelectedGoals(matchedGoalIndexes);
              setGoal(matchedGoalIndexes[0]);
            }
          }

          if (realOnboarding.anamnese?.equipmentAccess) {
            const pIdx = PLACES.findIndex(
              (p) => p[0].toLowerCase() === realOnboarding.anamnese.equipmentAccess.toLowerCase()
            );
            if (pIdx >= 0) setPlace(pIdx);
          }

          if (realOnboarding.anamnese?.healthNotes?.includes('Home gym kit: ')) {
            const raw = realOnboarding.anamnese.healthNotes.replace('Home gym kit: ', '').split(', ');
            const matchedKits = raw.filter((k: string) => KITS.some((kitDef) => kitDef[0] === k));
            if (matchedKits.length) setKit(matchedKits);
          }

          const storedKit = Array.isArray(realOnboarding.preferences?.selectedKit)
            ? realOnboarding.preferences.selectedKit.filter((k: string) => KITS.some((kitDef) => kitDef[0] === k))
            : [];
          if (storedKit.length) {
            setKit(storedKit);
          }

          const parsedDays = Number(realOnboarding.anamnese?.daysPerWeek);
          if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 7) setDays(parsedDays);

          const parsedMins = Number(realOnboarding.anamnese?.timePerSession);
          if (!isNaN(parsedMins) && parsedMins >= 10 && parsedMins <= 120) setMins(parsedMins);

          const parsedWeight = Number(realOnboarding.personalProfile?.weight || realMetrics?.weight);
          if (!isNaN(parsedWeight) && parsedWeight >= WEIGHT_MIN && parsedWeight <= WEIGHT_MAX) setWeight(parsedWeight);

          const parsedHeight = Number(realOnboarding.personalProfile?.height || realMetrics?.height);
          if (!isNaN(parsedHeight) && parsedHeight >= HEIGHT_MIN && parsedHeight <= HEIGHT_MAX) setHeight(parsedHeight);

          const parsedAge = Number(realOnboarding.personalProfile?.age || realMetrics?.age);
          if (!isNaN(parsedAge) && parsedAge >= AGE_MIN && parsedAge <= AGE_MAX) setAge(parsedAge);

          const realIdentity = realOnboarding.identityStatement || activeUser?.identity_statement;
          if (
            realIdentity &&
            typeof realIdentity === 'string' &&
            realIdentity.trim() &&
            realIdentity.trim() !== 'I am someone who trains even when it is hard'
          ) {
            setIdentity(realIdentity.trim());
          }

          const cc = (realOnboarding.countryCode || activeUser?.country_code || '').toLowerCase();
          if (cc === 'gb' || cc === 'uk') setRegion('uk');
          else if (cc === 'us') setRegion('us');
          else if (cc === 'de') setRegion('de');
          else if (cc === 'gh') setRegion('gh');
          else if (cc === 'in') setRegion('in');

          const storedRegion = String(realOnboarding.preferences?.region || '').trim();
          if (storedRegion && REGIONS[storedRegion]) {
            setRegion(storedRegion);
          }

          const storedCycle = String(realOnboarding.preferences?.billingCycle || '').trim();
          if (storedCycle === 'year' || storedCycle === 'month') {
            setCycle(storedCycle);
          }

          const storedMethod = Number(realOnboarding.preferences?.paymentMethodIndex);
          if (!isNaN(storedMethod) && storedMethod >= 0) {
            setMethod(storedMethod);
          }

          if (Array.isArray(realOnboarding.preferences?.nudgeChannels) && realOnboarding.preferences.nudgeChannels.length) {
            setNudge(realOnboarding.preferences.nudgeChannels);
          }

          const storedSuggestionTitle = String(realOnboarding.suggestion?.title || '').toLowerCase();
          if (storedSuggestionTitle.includes('21-day gold beta')) {
            setTier(BETA_TIER_INDEX);
          } else if (storedSuggestionTitle) {
            const tierIndex = prices.findIndex((price) => String(price[0]).toLowerCase() === storedSuggestionTitle);
            if (tierIndex >= 0) setTier(tierIndex);
          }
        }

        const storedPreferenceContactNumber = realOnboarding?.preferences?.contactNumber || '';
        const profileContactNumber = activeUser?.contact_number || (activeUser as any)?.contactNumber || storedPreferenceContactNumber || '';
        const hydratedPhoneFromProfile = !cancelled && hydratePhoneNumber(profileContactNumber);
        if (!hydratedPhoneFromProfile && !cancelled) {
          const storedDialCode = String(realOnboarding?.preferences?.dialCode || '').trim();
          const storedDialNumber = String(realOnboarding?.preferences?.dialNumber || '').trim();
          if (storedDialCode || storedDialNumber) {
            if (storedDialCode) setDialCode(storedDialCode);
            if (storedDialNumber) setDialNumber(storedDialNumber);
          } else {
            const fallbackCountryCode = String(realOnboarding?.countryCode || activeUser?.country_code || '').toLowerCase();
            const fallbackRegion =
              fallbackCountryCode === 'gb' || fallbackCountryCode === 'uk'
                ? 'uk'
                : fallbackCountryCode === 'us' || fallbackCountryCode === 'de' || fallbackCountryCode === 'gh' || fallbackCountryCode === 'in'
                  ? fallbackCountryCode
                  : region;
            setDialCode(REGIONS[fallbackRegion]?.dial || '+49');
          }
        }

        // Check if user profile has motivation_statement
        if (activeUser?.motivation_statement && !cancelled) {
          const gIdx = GOALS.findIndex(
            (g) => g[0].toLowerCase() === activeUser?.motivation_statement?.toLowerCase()
          );
          if (gIdx >= 0) setGoal(gIdx);
        }

        // 3. Overlay any uncommitted answers from local storage
        const savedAnswersRaw = await AsyncStorage.getItem(ONBOARDING_ANSWERS_KEY);
        if (savedAnswersRaw && !cancelled) {
          try {
            const parsed = JSON.parse(savedAnswersRaw);
            if (typeof parsed.goal === 'number') setGoal(parsed.goal);
            if (typeof parsed.place === 'number') setPlace(parsed.place);
            if (Array.isArray(parsed.kit)) setKit(parsed.kit);
            if (typeof parsed.days === 'number') setDays(parsed.days);
            if (typeof parsed.mins === 'number') setMins(parsed.mins);
            if (typeof parsed.weight === 'number') setWeight(parsed.weight);
            if (typeof parsed.height === 'number') setHeight(parsed.height);
            if (typeof parsed.age === 'number') setAge(parsed.age);
            if (
              parsed.expandedMetric === 'weight' ||
              parsed.expandedMetric === 'height' ||
              parsed.expandedMetric === 'age' ||
              parsed.expandedMetric === null
            ) {
              setExpandedMetric(parsed.expandedMetric);
            }
            if (
              typeof parsed.identity === 'string' &&
              parsed.identity.trim() &&
              parsed.identity.trim() !== 'I am someone who trains even when it is hard'
            ) {
              setIdentity(parsed.identity.trim());
            }
            if (typeof parsed.tier === 'number') setTier(parsed.tier);
            if (parsed.cycle === 'year' || parsed.cycle === 'month') setCycle(parsed.cycle);
            if (typeof parsed.region === 'string') setRegion(parsed.region);
            if (typeof parsed.method === 'number') setMethod(parsed.method);
            if (Array.isArray(parsed.nudge)) setNudge(parsed.nudge);
            if (!hydratedPhoneFromProfile && typeof parsed.dialCode === 'string' && parsed.dialCode.trim()) {
              setDialCode(normalizeDialCode(parsed.dialCode) || parsed.dialCode.trim());
            }
            if (!hydratedPhoneFromProfile && typeof parsed.dialNumber === 'string') setDialNumber(parsed.dialNumber);
          } catch {}
        }

        const savedStepRaw = await AsyncStorage.getItem(ONBOARDING_STEP_KEY);
        const savedStep = savedStepRaw && !isNaN(Number(savedStepRaw)) ? Number(savedStepRaw) : null;

        const targetStep = stepFromUrl ?? savedStep ?? initialStep;
        if (!cancelled && targetStep >= 2 && targetStep <= 11) {
          setStep(targetStep);
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
            try {
              const url = new URL(window.location.href);
              url.searchParams.set('step', String(targetStep));
              window.history.replaceState(null, '', url.toString());
            } catch {}
          }
        }
      } catch {
      } finally {
        if (!cancelled) {
          isHydratedRef.current = true;
        }
      }
    };

    void restoreOnboardingState();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save answers whenever they change (only after initial hydration)
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const dataToSave = {
      goal,
      place,
      kit,
      days,
      mins,
      weight,
      height,
      age,
      expandedMetric,
      identity,
      tier,
      cycle,
      region,
      method,
      nudge,
      dialCode,
      dialNumber,
      step,
    };
    void AsyncStorage.setItem(ONBOARDING_ANSWERS_KEY, JSON.stringify(dataToSave)).catch(() => {});
  }, [
    goal,
    place,
    kit,
    days,
    mins,
    weight,
    height,
    age,
    expandedMetric,
    identity,
    tier,
    cycle,
    region,
    method,
    nudge,
    dialCode,
    dialNumber,
    step,
  ]);

  // Press and hold repeat logic for steppers (+ / -)
  const holdTimerRef = useRef<any>(null);
  const holdIntervalRef = useRef<any>(null);

  const stopHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // Weight stepper handlers
  const startIncrement = () => {
    stopHold();
    setWeight((prev) => Math.min(WEIGHT_MAX, prev + 1));
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setWeight((prev) => {
          if (prev >= WEIGHT_MAX) {
            stopHold();
            return WEIGHT_MAX;
          }
          return prev + 1;
        });
      }, 60);
    }, 240);
  };

  const startDecrement = () => {
    stopHold();
    setWeight((prev) => Math.max(WEIGHT_MIN, prev - 1));
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setWeight((prev) => {
          if (prev <= WEIGHT_MIN) {
            stopHold();
            return WEIGHT_MIN;
          }
          return prev - 1;
        });
      }, 60);
    }, 240);
  };

  // Height stepper handlers
  const startHeightIncrement = () => {
    stopHold();
    setHeight((prev) => Math.min(HEIGHT_MAX, prev + 1));
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setHeight((prev) => {
          if (prev >= HEIGHT_MAX) {
            stopHold();
            return HEIGHT_MAX;
          }
          return prev + 1;
        });
      }, 60);
    }, 240);
  };

  const startHeightDecrement = () => {
    stopHold();
    setHeight((prev) => Math.max(HEIGHT_MIN, prev - 1));
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setHeight((prev) => {
          if (prev <= HEIGHT_MIN) {
            stopHold();
            return HEIGHT_MIN;
          }
          return prev - 1;
        });
      }, 60);
    }, 240);
  };

  // Age stepper handlers
  const startAgeIncrement = () => {
    stopHold();
    setAge((prev) => Math.min(AGE_MAX, prev + 1));
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setAge((prev) => {
          if (prev >= AGE_MAX) {
            stopHold();
            return AGE_MAX;
          }
          return prev + 1;
        });
      }, 60);
    }, 240);
  };

  const startAgeDecrement = () => {
    stopHold();
    setAge((prev) => Math.max(AGE_MIN, prev - 1));
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setAge((prev) => {
          if (prev <= AGE_MIN) {
            stopHold();
            return AGE_MIN;
          }
          return prev - 1;
        });
      }, 60);
    }, 240);
  };

  useEffect(() => {
    return () => {
      stopHold();
    };
  }, []);

  // Track width for direct tap adjustment
  const [sliderTrackWidth, setSliderTrackWidth] = useState<number>(0);
  const handleSliderTrackPress = (e: any) => {
    if (sliderTrackWidth <= 0) return;
    const clickX = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, clickX / sliderTrackWidth));
    const targetWeight = Math.round(WEIGHT_MIN + ratio * (WEIGHT_MAX - WEIGHT_MIN));
    setWeight(targetWeight);
  };

  const [heightTrackWidth, setHeightTrackWidth] = useState<number>(0);
  const handleHeightTrackPress = (e: any) => {
    if (heightTrackWidth <= 0) return;
    const clickX = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, clickX / heightTrackWidth));
    const targetHeight = Math.round(HEIGHT_MIN + ratio * (HEIGHT_MAX - HEIGHT_MIN));
    setHeight(targetHeight);
  };

  const [ageTrackWidth, setAgeTrackWidth] = useState<number>(0);
  const handleAgeTrackPress = (e: any) => {
    if (ageTrackWidth <= 0) return;
    const clickX = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, clickX / ageTrackWidth));
    const targetAge = Math.round(AGE_MIN + ratio * (AGE_MAX - AGE_MIN));
    setAge(targetAge);
  };

  // Handle Building Step (Step 6) ticker animation
  const buildTimerRef = useRef<any>(null);
  useEffect(() => {
    if (step === 6) {
      setPct(0);
      clearInterval(buildTimerRef.current);
      buildTimerRef.current = setInterval(() => {
        setPct((prev) => {
          if (prev >= 100) {
            clearInterval(buildTimerRef.current);
            return 100;
          }
          return prev + 4;
        });
      }, 90);
    } else {
      clearInterval(buildTimerRef.current);
    }
    return () => clearInterval(buildTimerRef.current);
  }, [step]);

  // Live calculations matching Claude reference
  const isHomeGym = place === 3;
  const kitFit = Math.min(
    170,
    PLACES[place][2] + (isHomeGym ? KITS.filter((k) => kit.includes(k[0])).reduce((a, k) => a + k[1], 0) : 0)
  );
  const kitCount = `${kitFit} workouts are yours`;
  const totalMins = days * mins;
  const weekTotal =
    totalMins >= 60
      ? (totalMins / 60).toFixed(1).replace('.0', '') + ' hours a week'
      : `${totalMins} minutes a week`;
  const weekNote = `${days} sessions of ${mins} minutes. We will never plan a fourth if you said three.`;

  const protein = Math.round(weight * 1.6);
  const proteinMath = `1.6 g × ${weight} kg. Recalculated whenever your weight moves 2 kg.`;
  const kcal = String(Math.round(weight * 31));
  const carbs = String(Math.round(weight * 3.1));
  const water = (Math.round(weight * 0.035 * 10) / 10).toFixed(1);

  const kitShort =
    place === 1 ? 'NO KIT' : place === 0 ? 'GYM' : place === 2 ? 'CROSSFIT' : (kit[0] || 'NO KIT').toUpperCase();

  const planName =
    GOALS[goal][0] === 'To build visible muscle'
      ? `Build · ${days} days a week`
      : `Strong at ${age} · ${days} days a week`;

  const firstSession =
    (isHomeGym ? kit.includes('Dumbbells') : place !== 1) ? 'Upper Body Strength' : 'Upper Body · No Kit';

  const victorLine = `You said ${days} days and ${mins} minutes. That is what I have planned — not one session more. Finish week one and we will talk about week two.`;

  const currentRegion = REGIONS[region] || REGIONS.de;
  const money = (eur: number) => {
    const v = eur * currentRegion.rate;
    const r = currentRegion.rate >= 10 ? Math.round(v / 10) * 10 : Math.round(v);
    return currentRegion.cur + r.toLocaleString('en-US');
  };

  const yearly = cycle === 'year';
  const saving = (y: number, m: number) => Math.round((1 - y / (m * 12)) * 100);

  const isBetaTierSelected = tier === BETA_TIER_INDEX;
  const curTier = isBetaTierSelected
    ? ['21-Day Gold Beta', 0, 0, '21 days of Gold access. No card required, no charge today.', '21 DAY BETA'] as OnboardingPlanPrice
    : prices[tier] || prices[1] || DEFAULT_PRICES[1];
  const isComingSoonTierSelected = Boolean(curTier[5]);
  const payAmount = yearly ? money(curTier[1]) : money(curTier[2]);
  const payRenewal = yearly ? `${money(curTier[1])} every year` : `${money(curTier[2])} every month`;
  const paySaving = yearly
    ? `You are saving ${saving(curTier[1], curTier[2])}% against ${money(curTier[2])} a month — ${money(curTier[2] * 12 - curTier[1])} a year.`
    : `Switching to yearly costs ${money(curTier[1])} and saves you ${money(curTier[2] * 12 - curTier[1])} — ${saving(curTier[1], curTier[2])}%.`;

  // Kit toggler
  const toggleKit = (n: string) => {
    setKit((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  // Nudge toggler
  const toggleNudge = (n: string) => {
    setNudge((prev) => (prev.includes(n) ? (prev.length > 1 ? prev.filter((x) => x !== n) : prev) : [...prev, n]));
  };

  const toggleGoal = (idx: number) => {
    setSelectedGoals((prev) => {
      const next = prev.includes(idx) ? prev.filter((item) => item !== idx) : [...prev, idx];
      const safeNext = next.length ? next : [idx];
      setGoal(safeNext[0]);
      return safeNext;
    });
  };

  const normalizeDialCodeInput = (value: string) => {
    const normalized = normalizeDialCode(value);
    setDialCode(normalized || value);
  };

  // Sync state to backend API on milestones
  const persistOnboardingAnswers = async (markComplete = false) => {
    const countryCode = region === 'uk' ? 'GB' : region.toUpperCase();
    const contactNumber = buildE164PhoneNumber(dialCode, dialNumber);
    const selectedTierTitle = String(curTier[0]);
    const selectedGoalTitles = selectedGoals
      .map((idx) => GOALS[idx]?.[0])
      .filter(Boolean);
    const primaryGoal = selectedGoalTitles[0] || GOALS[goal][0];

    await updateCurrentUserOnboarding({
      currentStep: step,
      country: currentRegion.n,
      countryCode,
      motivationStatement: selectedGoalTitles.join(', ') || primaryGoal,
      identityStatement: identity.trim() || 'I am someone who trains even when it is hard',
      personalProfile: {
        age: String(age),
        gender: 'Prefer not to say',
        height: String(height),
        heightUnit: 'cm',
        weight: String(weight),
        weightUnit: 'kg',
      },
      anamnese: {
        primaryGoal,
        primaryGoals: selectedGoalTitles.length ? selectedGoalTitles : [primaryGoal],
        activityLevel: 'Moderately active',
        healthConcerns: [],
        healthNotes: isHomeGym && kit.length > 0 ? `Home gym kit: ${kit.join(', ')}` : '',
        daysPerWeek: String(days),
        timePerSession: String(mins),
        equipmentAccess: PLACES[place][0],
      },
      suggestion: {
        tier: selectedTierTitle.toUpperCase().includes('PLATINUM')
          ? 'PLATINUM'
          : selectedTierTitle.toUpperCase().includes('SILVER')
            ? 'SILVER'
            : 'GOLD',
        title: selectedTierTitle,
        reason: String(curTier[3]),
        note: isBetaTierSelected ? '21-Day Gold Beta selected by default' : undefined,
      },
      preferences: {
        billingCycle: cycle,
        region,
        paymentMethodIndex: method,
        paymentMethodName: currentRegion.methods[method]?.[0] || '',
        nudgeChannels: nudge,
        dialCode,
        dialNumber,
        contactNumber,
        selectedKit: kit,
      },
      calculations: {
        proteinGrams: protein,
        caloriesKcal: Number(kcal),
        carbsGrams: Number(carbs),
        waterLiters: Number(water),
        workoutsMatched: kitFit,
        weeklyMinutes: totalMins,
        proteinFormula: proteinMath,
      },
      planPreview: {
        planName,
        firstSession,
        kitShort,
        weekNote,
        victorLine,
      },
      completed: markComplete,
    });

    await updateCurrentUserProfile({
      daily_protein_target: protein,
      motivation_statement: GOALS[goal][0],
      identity_statement: identity.trim() || 'I am someone who trains even when it is hard',
      country: currentRegion.n,
      country_code: countryCode,
      contact_number: contactNumber || undefined,
      training_trigger_action: `${days} sessions of ${mins} minutes`,
      workout_unlock_label: firstSession,
      onboarding_completed: markComplete ? true : undefined,
    });

    await updateCurrentUserBodyMetrics({
      age: String(age),
      height: String(height),
      weight: String(weight),
      gender: 'Prefer not to say',
    });
  };

  // Activate trial or subscription with fallback for Phase 1 Beta
  const activateTrialOrSubscription = async () => {
    if (isBetaTierSelected) {
      await startPhaseOneBetaSubscription();
      return;
    }

    const tierName = String(curTier[0]).toUpperCase();
    try {
      if (tierName === 'GOLD') {
        try {
          await startGoldTrial();
        } catch {
          await startPhaseOneBetaSubscription();
        }
      } else {
        try {
          await updateCurrentUserSubscription({
            subscription_tier: tierName,
            billing_cycle: cycle === 'year' ? 'yearly' : 'monthly',
            confirm_payment: true,
          });
        } catch {
          await startPhaseOneBetaSubscription();
        }
      }
    } catch {
      await startPhaseOneBetaSubscription().catch(() => {});
    }
  };

  // Navigation handlers
  const handleNext = async () => {
    if (step === 5) {
      // Moving to Building step
      setSubmitting(true);
      try {
        await persistOnboardingAnswers(false);
        goToStep(6);
      } catch (error) {
        console.warn('Failed to save onboarding progress', error);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step === 9) {
      if (isComingSoonTierSelected) {
        return;
      }

      if (isBetaTierSelected) {
        setSubmitting(true);
        try {
          await activateTrialOrSubscription();
          goToStep(11);
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // From Tier selection to Payment step
      goToStep(10);
      return;
    }

    if (step === 10) {
      // Complete Payment / Start trial
      setSubmitting(true);
      try {
        await activateTrialOrSubscription();
        await persistOnboardingAnswers(false);
        goToStep(11);
      } catch (error) {
        console.warn('Failed to activate onboarding access', error);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (step === 11) {
      // Ready -> finish onboarding and save all data to user profile
      setSubmitting(true);
      try {
        await activateTrialOrSubscription();
        await persistOnboardingAnswers(true);

        const updated = await fetchCurrentUser({ forceRefresh: true }).catch(() => null);
        if (updated) {
          setCurrentUser(updated);
        }
        await AsyncStorage.removeItem(ONBOARDING_STEP_KEY).catch(() => {});
        await AsyncStorage.removeItem(ONBOARDING_ANSWERS_KEY).catch(() => {});
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('step');
            window.history.replaceState(null, '', url.pathname);
          } catch {}
        }
        if (onComplete) {
          onComplete();
        } else {
          // Redirect directly to Home
          replaceRoute(router, '/(tabs)');
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            setTimeout(() => {
              if (window.location.pathname.includes('/onboarding')) {
                window.location.href = '/';
              }
            }, 300);
          }
        }
      } catch (error) {
        console.warn('Failed to complete onboarding', error);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    goToStep(step + 1);
  };

  const handleBack = () => {
    if (step === 6) {
      goToStep(5);
    } else {
      goToStep(step - 1);
    }
  };

  // Progress bar calculation for question steps (Steps 2 to 5)
  const isQuestionStep = step >= 2 && step <= 5;
  const questionBarPct = Math.round(((step - 1) / 4) * 100);

  // 4 building checklist items
  const buildLines = [
    { text: `Reading your goal: ${GOALS[goal][0].toLowerCase()}`, at: 20 },
    { text: `${kitFit} workouts match your kit`, at: 45 },
    { text: `Protein target set to ${protein} g a day`, at: 70 },
    { text: `Week built around ${days} × ${mins} minutes`, at: 95 },
  ];

  // Weekly workout routine
  const weekSchedule = [
    { day: 'MON', title: place === 1 ? 'Upper Body · No Kit' : 'Upper Body Strength', duration: `${mins} min` },
    { day: 'TUE', title: 'Rest or a walk', duration: '—' },
    { day: 'WED', title: 'Lower Body Strength', duration: `${mins} min` },
    { day: 'THU', title: 'Ten-Minute Reset', duration: '10 min' },
    { day: 'FRI', title: 'Full Body Strength', duration: `${mins} min` },
    { day: 'SAT', title: days > 4 ? 'Conditioning Ladder' : 'Rest', duration: days > 4 ? `${mins} min` : '—' },
  ];

  // Active step meta
  const stepMeta = STEPS_META[step] || STEPS_META[2];

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainLayout, isDesktop && styles.desktopLayout]}>
          {/* Main Flow Container */}
          <View style={[styles.flowCard, isDesktop && styles.desktopFlowCard]}>
            {/* Step Top Bar (Questions only) */}
            {isQuestionStep ? (
              <View style={styles.stepHeader}>
                <Pressable hitSlop={12} onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${questionBarPct}%` }]} />
                </View>
                <Text style={styles.questionKicker}>{`QUESTION ${step - 1} OF 4`}</Text>
              </View>
            ) : null}

            {/* Back button for non-question steps that allow going back */}
            {!isQuestionStep && step > 2 && step !== 6 && step !== 11 ? (
              <View style={styles.navTopRow}>
                <Pressable hitSlop={12} onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backArrow}>←</Text>
                </Pressable>
              </View>
            ) : null}

            {/* STEP 2: QUESTION 1 · WHY */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>What is this for?</Text>
                <Text style={styles.stepSubtitle}>
                  Pick everything that is true today. We use it to word the nudge that gets you off the sofa.
                </Text>

                <View style={styles.optionsList}>
                  {GOALS.map((g, idx) => {
                    const isSelected = selectedGoals.includes(idx);
                    return (
                      <Pressable
                        key={g[0]}
                        onPress={() => toggleGoal(idx)}
                        style={[styles.selectionCard, isSelected && styles.selectionCardActive]}
                      >
                        <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]}>{g[0]}</Text>
                        <Text style={styles.cardSubtitle}>{g[1]}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable style={styles.ctaButton} onPress={handleNext}>
                  <Text style={styles.ctaButtonText}>Continue</Text>
                </Pressable>
              </View>
            )}

            {/* STEP 3: QUESTION 2 · EQUIPMENT */}
            {step === 3 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Where do you train?</Text>
                <Text style={styles.stepSubtitle}>
                  We only plan exercises you can actually do with the equipment you have.
                </Text>

                <View style={styles.optionsList}>
                  {PLACES.map((p, idx) => {
                    const isSelected = idx === place;
                    return (
                      <Pressable
                        key={p[0]}
                        onPress={() => setPlace(idx)}
                        style={[styles.selectionCard, isSelected && styles.selectionCardActive]}
                      >
                        <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]}>{p[0]}</Text>
                        <Text style={styles.cardSubtitle}>{p[1]}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {isHomeGym && (
                  <View style={styles.kitSection}>
                    <Text style={styles.sectionKicker}>WHICH EQUIPMENT DO YOU HAVE AT HOME?</Text>
                    <View style={styles.chipsRow}>
                      {KITS.map(([kitName]) => {
                        const isSelected = kit.includes(kitName);
                        return (
                          <Pressable
                            key={kitName}
                            onPress={() => toggleKit(kitName)}
                            style={[styles.chip, isSelected && styles.chipActive]}
                          >
                            <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{kitName}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.insightBox}>
                  <Text style={styles.insightKicker}>WITH THAT EQUIPMENT</Text>
                  <Text style={styles.insightNumber}>{kitCount}</Text>
                  <Text style={styles.insightSub}>out of 170 in the library</Text>
                </View>

                <Pressable style={styles.ctaButton} onPress={handleNext}>
                  <Text style={styles.ctaButtonText}>Continue</Text>
                </Pressable>
              </View>
            )}

            {/* STEP 4: QUESTION 3 · TIME */}
            {step === 4 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>How much time do you really have?</Text>
                <Text style={styles.stepSubtitle}>
                  Not the hours you wish you had. The ones you will actually give.
                </Text>

                <Text style={styles.sectionKicker}>DAYS A WEEK</Text>
                <View style={styles.segmentedRow}>
                  {[2, 3, 4, 5, 6].map((n) => {
                    const isSelected = n === days;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setDays(n)}
                        style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                      >
                        <Text style={[styles.segmentBtnText, isSelected && styles.segmentBtnTextActive]}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.sectionKicker}>MINUTES A SESSION</Text>
                <View style={styles.segmentedRow}>
                  {[20, 30, 40, 60, 90].map((n) => {
                    const isSelected = n === mins;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setMins(n)}
                        style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                      >
                        <Text style={[styles.segmentBtnText, isSelected && styles.segmentBtnTextActive]}>{n}′</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.insightBox}>
                  <Text style={styles.insightKicker}>THAT IS</Text>
                  <Text style={styles.insightMonoNumber}>{weekTotal}</Text>
                  <Text style={styles.insightSub}>{weekNote}</Text>
                </View>

                <Pressable style={styles.ctaButton} onPress={handleNext}>
                  <Text style={styles.ctaButtonText}>Continue</Text>
                </Pressable>
              </View>
            )}

            {/* STEP 5: QUESTION 4 · NUMBERS */}
            {step === 5 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Your numbers</Text>
                <Text style={styles.stepSubtitle}>
                  Only used to calculate your targets. Visible to nobody but you.
                </Text>

                {/* Weight Stepper Card */}
                <View style={styles.metricRowCard}>
                  <Pressable
                    style={styles.metricHeader}
                    onPress={() => toggleMetric('weight')}
                  >
                    <View style={styles.expandLabelRow}>
                      <Text style={styles.metricLabel}>Weight</Text>
                      <Text style={styles.expandChevron}>
                        {expandedMetric === 'weight' ? '▾' : '▸'}
                      </Text>
                    </View>
                    <Text style={styles.metricValue}>{weight} kg</Text>
                  </Pressable>

                  <View
                    style={[
                      styles.collapsibleWrap,
                      expandedMetric === 'weight'
                        ? styles.collapsibleWrapExpanded
                        : styles.collapsibleWrapCollapsed,
                    ]}
                    pointerEvents={expandedMetric === 'weight' ? 'auto' : 'none'}
                  >
                    <View style={styles.stepperContainer}>
                      <Pressable
                        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                        onPressIn={startDecrement}
                        onPressOut={stopHold}
                        onResponderTerminate={stopHold}
                        accessibilityLabel="Decrease weight"
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </Pressable>
                      <Pressable
                        style={styles.sliderTrack}
                        onLayout={(e) => setSliderTrackWidth(e.nativeEvent.layout.width)}
                        onPress={handleSliderTrackPress}
                        accessibilityLabel="Adjust weight slider"
                        accessibilityRole="adjustable"
                      >
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              width: `${Math.max(
                                0,
                                Math.min(100, Math.round(((weight - WEIGHT_MIN) / (WEIGHT_MAX - WEIGHT_MIN)) * 100))
                              )}%`,
                            },
                          ]}
                        />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                        onPressIn={startIncrement}
                        onPressOut={stopHold}
                        onResponderTerminate={stopHold}
                        accessibilityLabel="Increase weight"
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Height Card with Expandable Stepper */}
                <View style={styles.metricRowCard}>
                  <Pressable
                    style={styles.metricHeader}
                    onPress={() => toggleMetric('height')}
                  >
                    <View style={styles.expandLabelRow}>
                      <Text style={styles.metricLabel}>Height</Text>
                      <Text style={styles.expandChevron}>
                        {expandedMetric === 'height' ? '▾' : '▸'}
                      </Text>
                    </View>
                    <Text style={styles.metricValue}>{height} cm</Text>
                  </Pressable>

                  <View
                    style={[
                      styles.collapsibleWrap,
                      expandedMetric === 'height'
                        ? styles.collapsibleWrapExpanded
                        : styles.collapsibleWrapCollapsed,
                    ]}
                    pointerEvents={expandedMetric === 'height' ? 'auto' : 'none'}
                  >
                    <View style={styles.stepperContainer}>
                      <Pressable
                        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                        onPressIn={startHeightDecrement}
                        onPressOut={stopHold}
                        onResponderTerminate={stopHold}
                        accessibilityLabel="Decrease height"
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </Pressable>
                      <Pressable
                        style={styles.sliderTrack}
                        onLayout={(e) => setHeightTrackWidth(e.nativeEvent.layout.width)}
                        onPress={handleHeightTrackPress}
                        accessibilityLabel="Adjust height slider"
                        accessibilityRole="adjustable"
                      >
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              width: `${Math.max(
                                0,
                                Math.min(100, Math.round(((height - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN)) * 100))
                              )}%`,
                            },
                          ]}
                        />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                        onPressIn={startHeightIncrement}
                        onPressOut={stopHold}
                        onResponderTerminate={stopHold}
                        accessibilityLabel="Increase height"
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Age Card with Expandable Stepper */}
                <View style={styles.metricRowCard}>
                  <Pressable
                    style={styles.metricHeader}
                    onPress={() => toggleMetric('age')}
                  >
                    <View style={styles.expandLabelRow}>
                      <Text style={styles.metricLabel}>Age</Text>
                      <Text style={styles.expandChevron}>
                        {expandedMetric === 'age' ? '▾' : '▸'}
                      </Text>
                    </View>
                    <Text style={styles.metricValue}>{age}</Text>
                  </Pressable>

                  <View
                    style={[
                      styles.collapsibleWrap,
                      expandedMetric === 'age'
                        ? styles.collapsibleWrapExpanded
                        : styles.collapsibleWrapCollapsed,
                    ]}
                    pointerEvents={expandedMetric === 'age' ? 'auto' : 'none'}
                  >
                    <View style={styles.stepperContainer}>
                      <Pressable
                        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                        onPressIn={startAgeDecrement}
                        onPressOut={stopHold}
                        onResponderTerminate={stopHold}
                        accessibilityLabel="Decrease age"
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </Pressable>
                      <Pressable
                        style={styles.sliderTrack}
                        onLayout={(e) => setAgeTrackWidth(e.nativeEvent.layout.width)}
                        onPress={handleAgeTrackPress}
                        accessibilityLabel="Adjust age slider"
                        accessibilityRole="adjustable"
                      >
                        <View
                          style={[
                            styles.sliderFill,
                            {
                              width: `${Math.max(
                                0,
                                Math.min(100, Math.round(((age - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100))
                              )}%`,
                            },
                          ]}
                        />
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
                        onPressIn={startAgeIncrement}
                        onPressOut={stopHold}
                        onResponderTerminate={stopHold}
                        accessibilityLabel="Increase age"
                        accessibilityRole="button"
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Live Calculated Targets Box */}
                <View style={[styles.insightBox, styles.insightGlowBox]}>
                  <Text style={styles.insightKicker}>CALCULATED LIVE</Text>
                  <View style={styles.proteinRow}>
                    <Text style={styles.proteinNumber}>{protein}</Text>
                    <Text style={styles.proteinUnit}>g protein a day</Text>
                  </View>
                  <Text style={styles.insightSub}>{proteinMath}</Text>

                  <View style={styles.subMetricsGrid}>
                    <View style={styles.subMetricCol}>
                      <Text style={[styles.subMetricVal, { color: '#1A7A4A' }]}>{kcal}</Text>
                      <Text style={styles.subMetricTag}>KCAL</Text>
                    </View>
                    <View style={styles.subMetricCol}>
                      <Text style={[styles.subMetricVal, { color: COPPER }]}>{carbs}</Text>
                      <Text style={styles.subMetricTag}>CARBS G</Text>
                    </View>
                    <View style={styles.subMetricCol}>
                      <Text style={[styles.subMetricVal, { color: BLUE_GRAY }]}>{water}</Text>
                      <Text style={styles.subMetricTag}>WATER L</Text>
                    </View>
                  </View>
                </View>

                <Pressable style={styles.ctaButton} onPress={handleNext}>
                  <Text style={styles.ctaButtonText}>Build my plan</Text>
                </Pressable>
              </View>
            )}

            {/* STEP 6: BUILDING ANIMATION */}
            {step === 6 && (
              <View style={styles.buildingContainer}>
                <View style={styles.radialBackdrop} />
                <View style={styles.buildingContent}>
                  <View style={styles.spinner} />
                  <Text style={styles.buildingTitle}>Reading your answers</Text>
                  <Text style={styles.buildingPercent}>{`${pct}%`}</Text>
                  <View style={styles.buildingTrack}>
                    <View style={[styles.buildingFill, { width: `${pct}%` }]} />
                  </View>

                  <View style={styles.buildLinesList}>
                    {buildLines.map((line) => {
                      const isDone = pct >= line.at;
                      return (
                        <View key={line.text} style={styles.buildLineRow}>
                          <View style={[styles.buildDot, isDone && styles.buildDotActive]}>
                            {isDone ? <Text style={styles.buildCheckmark}>✓</Text> : null}
                          </View>
                          <Text style={[styles.buildLineText, isDone && styles.buildLineTextActive]}>
                            {line.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {pct >= 100 ? (
                    <Pressable style={styles.ctaButton} onPress={() => goToStep(7)}>
                      <Text style={styles.ctaButtonText}>See my plan</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}

            {/* STEP 7: PLAN REVEAL */}
            {step === 7 && (
              <View style={styles.stepContent}>
                <Text style={styles.revealKicker}>YOUR PLAN · BUILT FROM YOUR ANSWERS</Text>
                <Text style={styles.planNameTitle}>{planName}</Text>

                {/* First Session Card */}
                <View style={styles.firstSessionCard}>
                  <Text style={styles.firstSessionKicker}>FIRST SESSION · READY NOW</Text>
                  <Text style={styles.firstSessionTitle}>{firstSession}</Text>
                  <View style={styles.sessionStatsRow}>
                    <View>
                      <Text style={styles.sessionStatValue}>{mins}</Text>
                      <Text style={styles.sessionStatLabel}>MINUTES</Text>
                    </View>
                    <View>
                      <Text style={styles.sessionStatValue}>7</Text>
                      <Text style={styles.sessionStatLabel}>EXERCISES</Text>
                    </View>
                    <View>
                      <Text style={styles.sessionStatValue}>{kitShort}</Text>
                      <Text style={styles.sessionStatLabel}>KIT</Text>
                    </View>
                  </View>
                </View>

                {/* Dual Stat Badges */}
                <View style={styles.dualStatRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValueGold}>
                      {protein}
                      <Text style={styles.statBoxSmallUnit}>g</Text>
                    </Text>
                    <Text style={styles.statBoxLabel}>PROTEIN A DAY</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statBoxValueWhite}>{kitFit}</Text>
                    <Text style={styles.statBoxLabel}>WORKOUTS FIT YOU</Text>
                  </View>
                </View>

                {/* Weekly Schedule */}
                <Text style={styles.sectionKicker}>YOUR WEEK</Text>
                <View style={styles.weekCard}>
                  {weekSchedule.map((item, idx) => (
                    <View
                      key={item.day}
                      style={[styles.weekRow, idx < weekSchedule.length - 1 && styles.weekRowBorder]}
                    >
                      <Text style={styles.weekDay}>{item.day}</Text>
                      <Text style={styles.weekTitle}>{item.title}</Text>
                      <Text style={styles.weekDuration}>{item.duration}</Text>
                    </View>
                  ))}
                </View>

                {/* Victor Note */}
                <View style={styles.victorCard}>
                  <Text style={styles.victorKicker}>FROM VICTOR</Text>
                  <Text style={styles.victorText}>{victorLine}</Text>
                </View>

                <Pressable style={styles.ctaButton} onPress={handleNext}>
                  <Text style={styles.ctaButtonText}>Continue</Text>
                </Pressable>

                <Pressable onPress={() => goToStep(2)} style={styles.changeAnswersLink}>
                  <Text style={styles.changeAnswersText}>Change my answers</Text>
                </Pressable>
              </View>
            )}

            {/* STEP 8: IDENTITY */}
            {step === 8 && (
              <View style={styles.stepContent}>
                <Text style={styles.copperKicker}>ONE LAST THING</Text>
                <Text style={styles.identityTitle}>Who are you becoming?</Text>
                <Text style={styles.stepSubtitle}>
                  Present tense, one sentence, your words. We show it back to you after every session you finish — never
                  when you miss one.
                </Text>

                <View style={styles.identityInputWrapper}>
                  <TextInput
                    value={identity}
                    onChangeText={setIdentity}
                    style={styles.identityInput}
                    placeholder="I am someone who trains even when it is hard"
                    placeholderTextColor="rgba(247,243,238,0.32)"
                    multiline
                  />
                  <View style={styles.identityGoldUnderline} />
                </View>
                <Text style={styles.identityFootnote}>saved exactly as you write it — never paraphrased</Text>

                <View style={{ height: 28 }} />

                <Pressable style={styles.ctaButton} onPress={handleNext}>
                  <Text style={styles.ctaButtonText}>This is me</Text>
                </Pressable>

                <Pressable onPress={handleNext} style={styles.changeAnswersLink}>
                  <Text style={styles.changeAnswersText}>I'll do this later</Text>
                </Pressable>
              </View>
            )}

            {/* STEP 9: TIER SELECTION */}
            {step === 9 && (
              <View style={styles.stepContent}>
                <Text style={styles.copperKicker}>21 DAY GOLD BETA</Text>
                <Text style={styles.stepTitle}>Start where you think you belong</Text>
                <Text style={styles.stepSubtitle}>
                  Your plan is already built either way. Start with the 21-day beta, or choose the tier you want to keep.
                </Text>

                {/* Billing Cycle Switch */}
                <View style={styles.cycleSwitchTrack}>
                  <Pressable
                    style={[styles.cycleSwitchBtn, cycle === 'year' && styles.cycleSwitchBtnActive]}
                    onPress={() => setCycle('year')}
                  >
                    <Text style={[styles.cycleSwitchText, cycle === 'year' && styles.cycleSwitchTextActive]}>
                      {`Yearly · save ${saving(curTier[1], curTier[2])}%`}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.cycleSwitchBtn, cycle === 'month' && styles.cycleSwitchBtnActive]}
                    onPress={() => setCycle('month')}
                  >
                    <Text style={[styles.cycleSwitchText, cycle === 'month' && styles.cycleSwitchTextActive]}>
                      Monthly
                    </Text>
                  </Pressable>
                </View>

                {/* Tiers List */}
                <View style={styles.optionsList}>
                  <Pressable
                    onPress={() => setTier(BETA_TIER_INDEX)}
                    style={[styles.tierCard, styles.betaTierCard, isBetaTierSelected && styles.tierCardActive]}
                  >
                    <View style={styles.tierTopRow}>
                      <Text style={[styles.tierName, isBetaTierSelected && styles.tierNameActive]}>21-Day Gold Beta</Text>
                      <Text style={styles.tierPrice}>Free</Text>
                    </View>
                    <Text style={styles.tierDesc}>Gold access for 21 days. No card required, no charge today.</Text>
                    <View style={styles.tierBottomRow}>
                      <View style={styles.tierTag}>
                        <Text style={styles.tierTagText}>21 DAY BETA</Text>
                      </View>
                      <Text style={styles.tierAlt}>No card required</Text>
                    </View>
                  </Pressable>

                  {prices.map(([name, yearlyPrice, monthlyPrice, desc, tag, isComingSoon], idx) => {
                    const isSelected = idx === tier;
                    const priceLabel = isComingSoon ? 'Coming soon' : yearly ? `${money(yearlyPrice)} / year` : `${money(monthlyPrice)} / month`;
                    const altLabel = isComingSoon
                      ? 'Not available yet'
                      : yearly
                      ? `or ${money(monthlyPrice)} a month`
                      : `${money(yearlyPrice)} a year saves ${saving(yearlyPrice, monthlyPrice)}%`;
                    return (
                      <Pressable
                        key={name}
                        onPress={() => {
                          if (!isComingSoon) setTier(idx);
                        }}
                        style={[styles.tierCard, isSelected && styles.tierCardActive, isComingSoon && styles.tierCardDisabled]}
                        disabled={isComingSoon}
                      >
                        <View style={styles.tierTopRow}>
                          <Text style={[styles.tierName, isSelected && styles.tierNameActive]}>{name}</Text>
                          <Text style={styles.tierPrice}>{priceLabel}</Text>
                        </View>
                        <Text style={styles.tierDesc}>{desc}</Text>
                        <View style={styles.tierBottomRow}>
                          {tag ? (
                            <View style={styles.tierTag}>
                              <Text style={styles.tierTagText}>{tag}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.tierAlt}>{altLabel}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Inner Circle Info */}
                <Pressable style={styles.innerCircleCard} onPress={() => setShowInnerCircleApply(true)}>
                  <View style={styles.innerCircleHeader}>
                    <Text style={styles.innerCircleName}>Inner Circle</Text>
                    <Text style={styles.innerCircleTag}>NO TRIAL</Text>
                  </View>
                  <Text style={styles.innerCircleDesc}>
                    Five questions, then a call with Victor to see whether it fits — both ways.
                  </Text>
                  <Text style={styles.innerCircleApplyLink}>Apply instead ›</Text>
                </Pressable>

                <Pressable style={[styles.ctaButton, isComingSoonTierSelected && styles.ctaButtonDisabled]} onPress={handleNext} disabled={submitting || isComingSoonTierSelected}>
                  {submitting && isBetaTierSelected ? (
                    <ActivityIndicator color={OBSIDIAN} size="small" />
                  ) : isBetaTierSelected ? (
                    <Text style={styles.ctaButtonText}>Start 21-Day Gold Beta</Text>
                  ) : isComingSoonTierSelected ? (
                    <Text style={styles.ctaButtonText}>Coming soon</Text>
                  ) : (
                    <Text style={styles.ctaButtonText}>{`Continue with ${curTier[0]}`}</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* STEP 10: PAYMENT */}
            {step === 10 && (
              <View style={styles.stepContent}>
                <Text style={styles.copperKicker}>STEP 2 OF 2 · PAYMENT</Text>
                <Text style={styles.stepTitle}>Confirm and start</Text>

                {/* Order Summary Card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTierTitle}>{`${curTier[0]} · ${yearly ? 'yearly' : 'monthly'}`}</Text>
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>21 DAY BETA</Text>
                    </View>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLineLabel}>Today</Text>
                    <Text style={styles.summaryLineGreen}>{`${currentRegion.cur}0`}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLineLabel}>After trial</Text>
                    <Text style={styles.summaryLineWhite}>{payAmount}</Text>
                  </View>
                  <View style={styles.summaryLineLast}>
                    <Text style={styles.summaryLineLabel}>Then</Text>
                    <Text style={styles.summaryLineMuted}>{payRenewal}</Text>
                  </View>
                </View>

                {/* Cycle Switch */}
                <View style={styles.cycleSwitchTrack}>
                  <Pressable
                    style={[styles.cycleSwitchBtn, cycle === 'year' && styles.cycleSwitchBtnActive]}
                    onPress={() => setCycle('year')}
                  >
                    <Text style={[styles.cycleSwitchText, cycle === 'year' && styles.cycleSwitchTextActive]}>
                      {`Yearly · save ${saving(curTier[1], curTier[2])}%`}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.cycleSwitchBtn, cycle === 'month' && styles.cycleSwitchBtnActive]}
                    onPress={() => setCycle('month')}
                  >
                    <Text style={[styles.cycleSwitchText, cycle === 'month' && styles.cycleSwitchTextActive]}>
                      Monthly
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.savingsNote}>{paySaving}</Text>

                {/* Payment Methods */}
                <View style={styles.methodsHeaderRow}>
                  <Text style={styles.sectionKicker}>HOW YOU PAY</Text>
                  <Text style={styles.regionIndicator}>{`${currentRegion.n.toUpperCase()} · ${currentRegion.cur}`}</Text>
                </View>

                {/* Fast Pay Button */}
                <Pressable style={styles.fastPayButton} onPress={handleNext}>
                  <Text style={styles.fastPayText}>{currentRegion.fast}</Text>
                </Pressable>

                {/* Localized Methods */}
                <View style={styles.methodsBox}>
                  {currentRegion.methods.map((m, idx) => {
                    const isSelected = idx === method;
                    return (
                      <Pressable
                        key={m[0]}
                        onPress={() => setMethod(idx)}
                        style={[
                          styles.methodRow,
                          idx < currentRegion.methods.length - 1 && styles.methodRowBorder,
                          isSelected && styles.methodRowActive,
                        ]}
                      >
                        <View style={[styles.methodRadio, isSelected && styles.methodRadioActive]} />
                        <View style={styles.methodInfo}>
                          <Text style={styles.methodName}>{m[0]}</Text>
                          <Text style={styles.methodSub}>{m[1]}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Guarantees Box */}
                <View style={styles.guaranteeBox}>
                  <View style={styles.guaranteeRow}>
                    <View style={styles.guaranteeDot} />
                    <Text style={styles.guaranteeText}>Nothing is charged for five days</Text>
                  </View>
                  <View style={styles.guaranteeRow}>
                    <View style={styles.guaranteeDot} />
                    <Text style={styles.guaranteeText}>Cancel in two taps, any time</Text>
                  </View>
                  <View style={styles.guaranteeRow}>
                    <View style={styles.guaranteeDot} />
                    <Text style={styles.guaranteeText}>{currentRegion.legal}</Text>
                  </View>
                </View>

                <Pressable style={styles.ctaButton} onPress={handleNext} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color={OBSIDIAN} size="small" />
                  ) : (
                    <Text style={styles.ctaButtonText}>Start my access</Text>
                  )}
                </Pressable>

                <Text style={styles.payFinePrint}>
                  {`${currentRegion.note} The 21-day Gold Beta uses the existing beta access system when selected; paid tiers continue through the normal billing flow.`}
                </Text>
              </View>
            )}

            {/* STEP 11: READY */}
            {step === 11 && (
              <View style={styles.stepContent}>
                <View style={styles.successCheckWrap}>
                  <Text style={styles.successCheckIcon}>✓</Text>
                </View>

                {isBetaTierSelected ? (
                  <Text style={styles.copperKicker}>{`${curTier[0].toUpperCase()} · ACTIVE`}</Text>
                ) : (
                  <Text style={styles.copperKicker}>{`${curTier[0].toUpperCase()} · ACTIVE`}</Text>
                )}
                <Text style={styles.readyHeadline}>You're set up.{'\n'}Two minutes flat.</Text>
                <Text style={styles.stepSubtitle}>
                  Your first session is waiting, your protein target is set, and your plan already knows what you own and
                  how long you have.
                </Text>

                {/* Today's First Workout */}
                <View style={styles.firstSessionCard}>
                  <Text style={styles.firstSessionKicker}>TODAY</Text>
                  <Text style={styles.firstSessionTitle}>{firstSession}</Text>
                  <Text style={styles.readySessionDetails}>{`${mins} min · 7 exercises · ${kitShort}`}</Text>
                </View>

                {/* Reminder Settings */}
                <View style={styles.nudgeBox}>
                  <View style={styles.nudgeHeader}>
                    <Text style={styles.nudgeKicker}>WHERE SHOULD I NUDGE YOU?</Text>
                    <Text style={styles.nudgeSubKicker}>PICK ONE OR ALL</Text>
                  </View>

                  <View style={styles.chipsRow}>
                    {['Push', 'WhatsApp', 'Email'].map((channel) => {
                      const isSelected = nudge.includes(channel);
                      return (
                        <Pressable
                          key={channel}
                          onPress={() => toggleNudge(channel)}
                          style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                        >
                          <Text style={[styles.segmentBtnText, isSelected && styles.segmentBtnTextActive]}>
                            {channel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {nudge.includes('WhatsApp') ? (
                    <View style={styles.phoneInputRow}>
                      <Text style={styles.phoneInputLabel}>MOBILE NUMBER</Text>
                      <View style={styles.phoneInputFields}>
                        <TextInput
                          value={dialCode}
                          onChangeText={normalizeDialCodeInput}
                          placeholder={currentRegion.dial}
                          placeholderTextColor="rgba(201,148,58,0.55)"
                          keyboardType="phone-pad"
                          style={styles.dialCodeInput}
                        />
                        <TextInput
                          value={dialNumber}
                          onChangeText={setDialNumber}
                          placeholder={currentRegion.sample}
                          placeholderTextColor="rgba(247,243,238,0.4)"
                          keyboardType="phone-pad"
                          style={styles.phoneNumberInput}
                        />
                      </View>
                      <Text style={styles.phoneInputFootnote}>
                        {dialNumber
                          ? 'Loaded from your registration number. You can edit it here.'
                          : `Country code set from ${currentRegion.n}. You can edit it here.`}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.nudgeTimeRow}>
                    <Text style={styles.nudgeTimeText}>
                      {nudge.length === 1 && nudge[0] === 'Email'
                        ? `One email a week, Monday 08:00 ${currentRegion.tz}`
                        : `Evenings at ${currentRegion.zone}, only on days you planned to train`}
                    </Text>
                  </View>

                  <Text style={styles.nudgeZoneNote}>
                    {currentRegion.nudge === 'WhatsApp'
                      ? `WhatsApp is pre-selected for ${currentRegion.n} — it is where people actually read messages. `
                      : ''}
                    {`Reminders run on ${currentRegion.zone}, never on a day you did not plan to train.`}
                  </Text>
                </View>

                <Pressable style={styles.ctaButton} onPress={handleNext} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color={OBSIDIAN} size="small" />
                  ) : (
                    <Text style={styles.ctaButtonText}>Start my first session</Text>
                  )}
                </Pressable>

                <Pressable onPress={handleNext} style={styles.changeAnswersLink}>
                  <Text style={styles.changeAnswersText}>Look around first</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Desktop Rationale Companion Panel ("WHY THIS SCREEN LOOKS LIKE THIS" & "THE WOW RULE") */}
          {isDesktop && (
            <View style={styles.desktopCompanionPanel}>
              {/* Step Navigation Timeline */}
              <View style={styles.timelineCard}>
                <Text style={styles.timelineHeader}>ONBOARDING TIMELINE</Text>
                {STEPS_META.slice(2).map(([name, time], idx) => {
                  const sIndex = idx + 2;
                  const isCurrent = sIndex === step;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => goToStep(sIndex)}
                      style={[styles.timelineItem, isCurrent && styles.timelineItemActive]}
                    >
                      <View style={[styles.timelineNum, isCurrent && styles.timelineNumActive]}>
                        <Text style={[styles.timelineNumText, isCurrent && styles.timelineNumTextActive]}>
                          {sIndex}
                        </Text>
                      </View>
                      <View style={styles.timelineTextWrap}>
                        <Text style={[styles.timelineName, isCurrent && styles.timelineNameActive]}>{name}</Text>
                        <Text style={styles.timelineTime}>{time}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Design Rationale */}
              <View style={styles.rationaleCard}>
                <Text style={styles.rationaleKicker}>WHY THIS SCREEN LOOKS LIKE THIS</Text>
                <Text style={styles.rationaleTitle}>{stepMeta[2]}</Text>
                <Text style={styles.rationaleBody}>{stepMeta[3]}</Text>
              </View>

              {/* The Wow Rule */}
              <View style={styles.wowCard}>
                <Text style={styles.wowKicker}>THE WOW RULE</Text>
                <Text style={styles.wowBody}>
                  Nothing is asked that is not visibly used. Every answer changes a number on screen within one tap — the
                  kit count, the weekly total, the protein target — so by the time the plan appears, the user has already
                  watched it being built. That is the wow: not an animation, but the feeling of being listened to.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <ClaudeInnerCircleApplyModal
        visible={showInnerCircleApply}
        onClose={() => setShowInnerCircleApply(false)}
        userName={currentUser?.name || 'Inner Circle'}
        userEmail={currentUser?.email || ''}
        userPhone={currentUser?.contact_number || buildE164PhoneNumber(dialCode, dialNumber)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: OBSIDIAN,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
    alignItems: 'center',
  },
  mainLayout: {
    width: '100%',
    maxWidth: 540,
    paddingHorizontal: 20,
    paddingTop: 36,
  },
  desktopLayout: {
    maxWidth: 1040,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 40,
    paddingTop: 54,
  },
  flowCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: OBSIDIAN,
  },
  desktopFlowCard: {
    flex: 1,
    maxWidth: 520,
  },
  stepHeader: {
    marginBottom: 20,
  },
  navTopRow: {
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 16,
    alignSelf: 'flex-start',
  },
  backArrow: {
    fontFamily: DMSANS,
    fontSize: 20,
    color: 'rgba(247,243,238,0.6)',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(247,243,238,0.16)',
    overflow: 'hidden',
    marginTop: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  questionKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: COPPER,
    marginTop: 16,
  },
  copperKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: COPPER,
    marginBottom: 8,
  },
  revealKicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: COPPER,
    marginBottom: 10,
  },
  stepContent: {
    paddingTop: 4,
  },
  stepTitle: {
    fontFamily: CLASH,
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '700',
    color: IVORY,
    marginBottom: 10,
  },
  stepSubtitle: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247,243,238,0.6)',
    marginBottom: 22,
  },
  optionsList: {
    gap: 9,
    marginBottom: 20,
  },
  selectionCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.12)',
  },
  selectionCardActive: {
    borderWidth: 2,
    borderColor: GOLD,
  },
  cardTitle: {
    fontFamily: DMSANS,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(247,243,238,0.85)',
  },
  cardTitleActive: {
    color: IVORY,
  },
  cardSubtitle: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.55)',
    marginTop: 4,
  },
  kitSection: {
    marginBottom: 16,
  },
  sectionKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: 'rgba(247,243,238,0.45)',
    marginBottom: 10,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    borderRadius: 99,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.24)',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.72)',
  },
  chipTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  insightBox: {
    backgroundColor: NAVY,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 22,
  },
  insightGlowBox: {
    borderRadius: 18,
    padding: 18,
  },
  insightKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 7,
  },
  insightNumber: {
    fontFamily: CLASH,
    fontSize: 18,
    fontWeight: '600',
    color: IVORY,
  },
  insightMonoNumber: {
    fontFamily: MONO,
    fontSize: 26,
    fontWeight: '700',
    color: IVORY,
  },
  insightSub: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.55)',
    marginTop: 4,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  segmentBtnText: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.72)',
  },
  segmentBtnTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  metricRowCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
      } as any,
    }),
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: Platform.select({ web: 'pointer', default: undefined }) as any,
  },
  collapsibleWrap: {
    overflow: 'hidden',
    ...Platform.select({
      web: {
        transition:
          'max-height 0.32s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.25s ease, margin-top 0.32s cubic-bezier(0.25, 1, 0.5, 1)',
      } as any,
    }),
  },
  collapsibleWrapExpanded: {
    maxHeight: 90,
    opacity: 1,
    marginTop: 14,
  },
  collapsibleWrapCollapsed: {
    maxHeight: 0,
    opacity: 0,
    marginTop: 0,
  },
  metricLabel: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.75)',
  },
  metricValue: {
    fontFamily: MONO,
    fontSize: 19,
    fontWeight: '700',
    color: IVORY,
  },
  expandLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandChevron: {
    fontFamily: MONO,
    fontSize: 14,
    color: GOLD,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,238,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPressed: {
    backgroundColor: 'rgba(201, 148, 58, 0.18)',
    borderColor: GOLD,
    transform: [{ scale: 0.95 }],
  },
  stepBtnText: {
    fontFamily: DMSANS,
    fontSize: 20,
    fontWeight: '700',
    color: IVORY,
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(247,243,238,0.14)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  simpleMetricCard: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proteinRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  proteinNumber: {
    fontFamily: MONO,
    fontSize: 36,
    fontWeight: '700',
    color: GOLD,
  },
  proteinUnit: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.7)',
  },
  subMetricsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247,243,238,0.12)',
  },
  subMetricCol: {
    alignItems: 'flex-start',
  },
  subMetricVal: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '700',
  },
  subMetricTag: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.7,
    color: 'rgba(247,243,238,0.5)',
    marginTop: 2,
  },
  buildingContainer: {
    minHeight: 520,
    justifyContent: 'center',
    position: 'relative',
  },
  radialBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  buildingContent: {
    alignItems: 'flex-start',
  },
  spinner: {
    width: 52,
    height: 52,
    borderRadius: 99,
    borderWidth: 3,
    borderColor: 'rgba(247,243,238,0.16)',
    borderTopColor: GOLD,
    marginBottom: 28,
  },
  buildingTitle: {
    fontFamily: CLASH,
    fontSize: 30,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 8,
  },
  buildingPercent: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: GOLD,
    marginBottom: 24,
  },
  buildingTrack: {
    width: '100%',
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(247,243,238,0.14)',
    overflow: 'hidden',
    marginBottom: 28,
  },
  buildingFill: {
    height: '100%',
    backgroundColor: GOLD,
  },
  buildLinesList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  buildLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buildDot: {
    width: 18,
    height: 18,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,238,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildDotActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  buildCheckmark: {
    color: IVORY,
    fontSize: 11,
    fontWeight: '700',
  },
  buildLineText: {
    fontFamily: INTER,
    fontSize: 13.5,
    color: 'rgba(247,243,238,0.4)',
  },
  buildLineTextActive: {
    color: 'rgba(247,243,238,0.9)',
    fontWeight: '500',
  },
  planNameTitle: {
    fontFamily: CLASH,
    fontSize: 32,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  firstSessionCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    padding: 20,
    marginBottom: 12,
  },
  firstSessionKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 8,
  },
  firstSessionTitle: {
    fontFamily: CLASH,
    fontSize: 22,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 14,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    gap: 28,
  },
  sessionStatValue: {
    fontFamily: MONO,
    fontSize: 18,
    fontWeight: '700',
    color: IVORY,
  },
  sessionStatLabel: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: 'rgba(247,243,238,0.55)',
    marginTop: 2,
  },
  dualStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 16,
  },
  statBoxValueGold: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: GOLD,
  },
  statBoxSmallUnit: {
    fontSize: 13,
  },
  statBoxValueWhite: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: IVORY,
  },
  statBoxLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
    color: 'rgba(247,243,238,0.55)',
    marginTop: 3,
  },
  weekCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  weekRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,243,238,0.1)',
  },
  weekDay: {
    width: 36,
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247,243,238,0.5)',
  },
  weekTitle: {
    flex: 1,
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '500',
    color: IVORY,
  },
  weekDuration: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.5)',
  },
  victorCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 18,
    marginBottom: 20,
  },
  victorKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 8,
  },
  victorText: {
    fontFamily: INTER,
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(247,243,238,0.85)',
  },
  changeAnswersLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  changeAnswersText: {
    fontFamily: DMSANS,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.5)',
  },
  identityTitle: {
    fontFamily: CLASH,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    color: IVORY,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  identityInputWrapper: {
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 10,
    marginBottom: 10,
  },
  identityInput: {
    fontFamily: CLASH,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '600',
    color: IVORY,
    minHeight: 60,
  },
  identityGoldUnderline: {
    height: 1,
  },
  identityFootnote: {
    fontFamily: MONO,
    fontSize: 12,
    color: 'rgba(247,243,238,0.4)',
  },
  cycleSwitchTrack: {
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.18)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  cycleSwitchBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 9,
  },
  cycleSwitchBtnActive: {
    backgroundColor: GOLD,
  },
  cycleSwitchText: {
    fontFamily: DMSANS,
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.6)',
  },
  cycleSwitchTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  tierCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.14)',
    marginBottom: 10,
  },
  betaTierCard: {
    borderColor: 'rgba(201,148,58,0.38)',
    backgroundColor: '#12324E',
  },
  tierCardActive: {
    borderWidth: 2,
    borderColor: GOLD,
  },
  tierCardDisabled: {
    opacity: 0.62,
  },
  tierTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  tierName: {
    fontFamily: CLASH,
    fontSize: 19,
    fontWeight: '600',
    color: IVORY,
  },
  tierNameActive: {
    color: GOLD,
  },
  tierPrice: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(247,243,238,0.6)',
  },
  tierDesc: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.65)',
  },
  tierBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
  },
  tierTag: {
    backgroundColor: GOLD,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  tierTagText: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1,
    color: OBSIDIAN,
  },
  tierAlt: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.5)',
  },
  innerCircleCard: {
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.14)',
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
    marginBottom: 14,
  },
  innerCircleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  innerCircleName: {
    fontFamily: CLASH,
    fontSize: 16,
    fontWeight: '600',
    color: COPPER,
  },
  innerCircleTag: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(247,243,238,0.5)',
  },
  innerCircleDesc: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(247,243,238,0.6)',
  },
  innerCircleApplyLink: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '700',
    color: GOLD,
    marginTop: 11,
  },
  summaryCard: {
    backgroundColor: NAVY,
    borderRadius: 18,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    padding: 18,
    marginBottom: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  summaryTierTitle: {
    fontFamily: CLASH,
    fontSize: 21,
    fontWeight: '600',
    color: GOLD,
  },
  freeBadge: {
    backgroundColor: GREEN,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  freeBadgeText: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: IVORY,
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247,243,238,0.12)',
  },
  summaryLineLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247,243,238,0.12)',
  },
  summaryLineLabel: {
    flex: 1,
    fontFamily: INTER,
    fontSize: 13.5,
    color: 'rgba(247,243,238,0.7)',
  },
  summaryLineGreen: {
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '700',
    color: GREEN,
  },
  summaryLineWhite: {
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '700',
    color: IVORY,
  },
  summaryLineMuted: {
    fontFamily: MONO,
    fontSize: 13.5,
    fontWeight: '500',
    color: 'rgba(247,243,238,0.75)',
  },
  savingsNote: {
    fontFamily: INTER,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: GOLD,
    marginBottom: 18,
  },
  methodsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  regionIndicator: {
    fontFamily: MONO,
    fontSize: 10.5,
    fontWeight: '500',
    color: GOLD,
  },
  fastPayButton: {
    height: 52,
    borderRadius: 13,
    backgroundColor: IVORY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  fastPayText: {
    fontFamily: DMSANS,
    fontSize: 15,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  methodsBox: {
    backgroundColor: NAVY,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 13,
  },
  methodRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,243,238,0.1)',
  },
  methodRowActive: {
    backgroundColor: 'rgba(201,148,58,0.09)',
  },
  methodRadio: {
    width: 19,
    height: 19,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,238,0.3)',
  },
  methodRadioActive: {
    borderWidth: 6,
    borderColor: GOLD,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '600',
    color: IVORY,
  },
  methodSub: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: 'rgba(247,243,238,0.5)',
    marginTop: 2,
  },
  guaranteeBox: {
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.14)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  guaranteeDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: GREEN,
  },
  guaranteeText: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247,243,238,0.75)',
  },
  payFinePrint: {
    fontFamily: INTER,
    fontSize: 11.5,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.42)',
    marginTop: 14,
  },
  successCheckWrap: {
    width: 58,
    height: 58,
    borderRadius: 99,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCheckIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: IVORY,
  },
  readyHeadline: {
    fontFamily: CLASH,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    color: IVORY,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  readySessionDetails: {
    fontFamily: MONO,
    fontSize: 12.5,
    color: 'rgba(247,243,238,0.55)',
    marginTop: 4,
  },
  nudgeBox: {
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.12)',
  },
  nudgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  nudgeKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: GOLD,
  },
  nudgeSubKicker: {
    fontFamily: DMSANS,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: 'rgba(247,243,238,0.45)',
  },
  phoneInputRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247,243,238,0.22)',
    paddingBottom: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  phoneInputLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    color: 'rgba(247,243,238,0.45)',
    marginBottom: 6,
  },
  phoneInputFields: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dialCodeInput: {
    minWidth: 54,
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    color: GOLD,
    paddingVertical: 0,
  },
  phoneNumberInput: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '500',
    color: IVORY,
  },
  phoneInputFootnote: {
    fontFamily: INTER,
    fontSize: 11.5,
    color: 'rgba(247,243,238,0.45)',
    marginTop: 6,
  },
  nudgeTimeRow: {
    marginTop: 6,
  },
  nudgeTimeText: {
    fontFamily: INTER,
    fontSize: 12.5,
    color: 'rgba(247,243,238,0.55)',
  },
  nudgeZoneNote: {
    fontFamily: INTER,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(247,243,238,0.55)',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247,243,238,0.12)',
  },
  ctaButton: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  ctaButtonDisabled: {
    opacity: 0.58,
  },
  ctaButtonText: {
    fontFamily: DMSANS,
    fontSize: 17,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  desktopCompanionPanel: {
    width: 372,
    gap: 16,
  },
  timelineCard: {
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.12)',
    borderRadius: 16,
    padding: 16,
  },
  timelineHeader: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: 'rgba(247,243,238,0.4)',
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  timelineItemActive: {
    backgroundColor: NAVY,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  timelineNum: {
    width: 24,
    height: 24,
    borderRadius: 99,
    backgroundColor: 'rgba(247,243,238,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNumActive: {
    backgroundColor: GOLD,
  },
  timelineNumText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(247,243,238,0.6)',
  },
  timelineNumTextActive: {
    color: OBSIDIAN,
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineName: {
    fontFamily: DMSANS,
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(247,243,238,0.7)',
  },
  timelineNameActive: {
    color: IVORY,
  },
  timelineTime: {
    fontFamily: MONO,
    fontSize: 10.5,
    color: 'rgba(247,243,238,0.4)',
  },
  rationaleCard: {
    borderWidth: 1,
    borderColor: 'rgba(247,243,238,0.14)',
    borderRadius: 16,
    padding: 18,
  },
  rationaleKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: 'rgba(247,243,238,0.4)',
    marginBottom: 10,
  },
  rationaleTitle: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
    marginBottom: 8,
  },
  rationaleBody: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 22,
    color: 'rgba(247,243,238,0.7)',
  },
  wowCard: {
    borderLeftWidth: 3,
    borderLeftColor: COPPER,
    paddingLeft: 14,
    paddingVertical: 4,
  },
  wowKicker: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: COPPER,
    marginBottom: 8,
  },
  wowBody: {
    fontFamily: INTER,
    fontSize: 13.5,
    lineHeight: 22,
    color: 'rgba(247,243,238,0.7)',
  },
});
