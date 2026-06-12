import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingWelcome from '../screens/onboarding/OnboardingWelcome';
import OnboardingFeatures from '../screens/onboarding/OnboardingFeatures';
import OnboardingPermissions from '../screens/onboarding/OnboardingPermissions';
import OnboardingTerms from '../screens/onboarding/OnboardingTerms';
import type { OnboardingStackParamList } from '../types';

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcome} />
      <Stack.Screen name="OnboardingFeatures" component={OnboardingFeatures} />
      <Stack.Screen name="OnboardingPermissions" component={OnboardingPermissions} />
      <Stack.Screen name="OnboardingTerms" component={OnboardingTerms} />
    </Stack.Navigator>
  );
}
