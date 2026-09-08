import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';

const { width } = Dimensions.get('window');

type FeatureCardsProps = {
  canAccessCoachVictor?: boolean;
  canAccessNutrition?: boolean;
  onRestrictedPress?: (sectionName: string) => void;
};

export default function FeatureCards({
  canAccessCoachVictor = true,
  canAccessNutrition = true,
  onRestrictedPress,
}: FeatureCardsProps) {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View style={styles.featureContainer}>
      {/* Coach Victor */}
      <View style={[styles.featureCardFull, { backgroundColor: Colors.navy }, !canAccessCoachVictor && styles.lockedCard]}>
        <View style={styles.featureIconCircle}>
          <Ionicons name="sparkles" size={22} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.featureTitle}>{t('COACH VICTOR')}</Text>
          <Text style={styles.featureDesc}>
            {t('Your AI companion for motivation, advice, and feedback.')}
          </Text>
          <TouchableOpacity 
            style={styles.featureAction}
            onPress={() => {
              if (!canAccessCoachVictor) {
                onRestrictedPress?.('Coach Victor');
                return;
              }
              router.push('/chat');
            }}
          >
            <Text style={styles.featureLink}>{canAccessCoachVictor ? t('Start Chat +') : t('Unlock Access +')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.featureCardFull, { backgroundColor: Colors.surfaceCard, marginTop: 16 }, !canAccessNutrition && styles.lockedCard]}>
          <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(181, 101, 29, 0.2)' }]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={Colors.copper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t('NUTRITION')}</Text>
            <Text style={styles.featureDesc}>
              {t('Personalized nutrition plans and recipes for your goals.')}
            </Text>
            <TouchableOpacity
              style={styles.featureAction}
              onPress={() => {
                if (!canAccessNutrition) {
                  onRestrictedPress?.('Nutrition');
                  return;
                }
                router.push('/mealPlan');
              }}
            >
              <Text style={[styles.featureLink, { color: Colors.gold }]}>{canAccessNutrition ? t('View Plan +') : t('Unlock Access +')}</Text>
            </TouchableOpacity>
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featureContainer: {
    marginBottom: 20,
  },
  featureCardFull: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.28)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  lockedCard: {
    opacity: 0.84,
  },
  featureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201, 148, 58, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  featureTitle: {
    fontSize: 17,
    color: Colors.ivory,
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: Fonts.display,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
    maxWidth: width * 0.6,
    fontFamily: Fonts.body,
  },
  featureAction: {
    alignSelf: 'flex-start',
  },
  featureLink: {
    fontSize: 13,
    color: Colors.gold,
    fontFamily: Fonts.heading,
  },
});
