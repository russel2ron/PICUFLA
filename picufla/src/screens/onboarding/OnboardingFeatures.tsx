import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import Button from '../../components/Button';
import type { OnboardingStackParamList } from '../../types';

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingFeatures'>;
};

const features = [
  {
    icon: 'search' as const,
    title: 'Identify Instantly',
    description: 'Snap a photo and let AI identify any plant in seconds.',
  },
  {
    icon: 'book' as const,
    title: 'Detailed Care Guides',
    description: 'Get watering, sunlight, and soil tips tailored to each plant.',
  },
  {
    icon: 'bell' as const,
    title: 'Smart Reminders',
    description: 'Never forget to water or fertilize with custom care reminders.',
  },
  {
    icon: 'folder' as const,
    title: 'Your Collection',
    description: 'Build a living library of every plant you\'ve discovered.',
  },
];

export default function OnboardingFeatures({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.dots}>
          <View style={styles.dotInactive} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dotInactive} />
          <View style={styles.dotInactive} />
        </View>

        <Text style={styles.heading}>Everything you need</Text>

        <View style={styles.featuresList}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon} size={22} color={Colors.green700} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomArea}>
          <Button
            title="Next"
            onPress={() => navigation.navigate('OnboardingPermissions')}
          />

          <Text style={styles.skipLink} onPress={() => navigation.navigate('OnboardingTerms')}>
            Skip
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.green700,
    width: 24,
  },
  dotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.stone,
  },
  heading: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: Colors.soil,
    textAlign: 'center',
    marginBottom: 28,
  },
  featuresList: {
    gap: 14,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.soil,
  },
  featureDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    marginTop: 2,
    lineHeight: 18,
  },
  bottomArea: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  skipLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.bark,
    marginTop: 20,
  },
});
