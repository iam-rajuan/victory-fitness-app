import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getLatestNutritionPlan, NutritionPlanApiResponse } from '../../lib/nutrition';

export default function SavedWeekScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<NutritionPlanApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    getLatestNutritionPlan({ forceRefresh: true })
      .then(value => { if (active) setPlan(value); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.replace('/mealPlan' as any)}><Text style={styles.link}>← Food</Text></Pressable>
    <Text style={styles.title}>Your saved week</Text>
    {loading ? <ActivityIndicator color="#C9943A" accessibilityLabel="Loading saved week" /> : error ? <View>
      <Text style={styles.text}>We couldn’t load your saved week. Please try again.</Text>
      <Pressable onPress={() => setAttempt(value => value + 1)}><Text style={styles.link}>Try again</Text></Pressable>
    </View> : !plan ? <Text style={styles.text}>No saved week yet. Build a plan from the Food tab to get started.</Text> : <>
      <Text style={styles.text}>{plan.summary}</Text>
      {plan.days.map(day => <View key={day.day} style={styles.card}>
        <Text style={styles.heading}>{day.day}</Text>
        {(['breakfast', 'lunch', 'dinner', 'pre_workout', 'post_workout'] as const).map(key => {
          const meal = day[key];
          return meal ? <View key={key} style={styles.meal}>
            <Text style={styles.link}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
            <Text style={styles.heading}>{meal.name}</Text>
            <Text style={styles.text}>{meal.kcal} kcal · {meal.p} g protein · {meal.c} g carbs · {meal.f} g fat</Text>
            <Text style={styles.text}>{meal.desc}</Text>
            <Text style={styles.text}>Ingredients: {meal.ingredients.join(', ')}</Text>
            {meal.instructions.map((step, index) => <Text key={index} style={styles.text}>{index + 1}. {step}</Text>)}
          </View> : null;
        })}
      </View>)}
      <Text style={styles.title}>Shopping list</Text>
      {plan.shopping_list.map((section, index) => <View key={index} style={styles.card}>
        <Text style={styles.heading}>{section.category}</Text>
        {section.items.map((item, i) => <Text key={i} style={styles.text}>{item.name} — {item.qty}</Text>)}
      </View>)}
    </>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 24, paddingTop: 48, paddingBottom: 64, width: '100%', maxWidth: 900, alignSelf: 'center', gap: 16 },
  title: { color: '#F7F3EE', fontSize: 28, fontWeight: '700' },
  heading: { color: '#F7F3EE', fontSize: 20, fontWeight: '600' },
  text: { color: '#F7F3EE', fontSize: 15, lineHeight: 23 },
  link: { color: '#C9943A', fontSize: 15, paddingVertical: 10 },
  card: { backgroundColor: '#0D2B45', borderRadius: 20, padding: 20, gap: 12 },
  meal: { gap: 8, borderTopWidth: 1, borderColor: '#335065', paddingVertical: 12 },
});
