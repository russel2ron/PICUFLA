import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import Button from '../../components/Button';
import { useAppStore } from '../../store/appStore';
import type { OnboardingStackParamList } from '../../types';

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingTerms'>;
};

const termsText = `PICUFLA Privacy Policy

1. Data Collection
We collect information you provide when creating an account, including your email address and display name. When you use our plant identification feature, we process images you upload to identify plant species.

2. Image Processing
Images uploaded for plant identification are processed by our AI service. Uploaded images are stored securely and used to improve identification accuracy. You may delete your identified plants and associated images at any time.

3. Data Sharing
We do not sell your personal data. We may share anonymized, aggregated data for research and service improvement purposes.

4. Data Retention
Your data is retained as long as your account is active. You may request deletion of your account and associated data at any time.

5. Third-Party Services
We use Supabase for database and authentication, and external AI services for plant identification. These services comply with applicable data protection regulations.

6. Your Rights
You have the right to access, correct, or delete your personal data. You may export your data upon request.

7. Updates
We may update this policy from time to time. Continued use of the app after changes constitutes acceptance of the updated policy.

By accepting, you agree to these terms and our privacy policy.`;

export default function OnboardingTerms({ navigation }: Props) {
  const [accepting, setAccepting] = useState(false);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const handleAccept = async () => {
    setAccepting(true);
    await completeOnboarding();
    setAccepting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.dots}>
          <View style={styles.dotInactive} />
          <View style={styles.dotInactive} />
          <View style={styles.dotInactive} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <Text style={styles.heading}>Terms & Privacy</Text>

        <View style={styles.termsBox}>
          <ScrollView showsVerticalScrollIndicator bounces={false}>
            <Text style={styles.termsText}>{termsText}</Text>
          </ScrollView>
        </View>

        <View style={styles.bottomArea}>
          <Button
            title="Accept & Continue"
            onPress={handleAccept}
            loading={accepting}
          />
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
    marginBottom: 28,
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
    marginBottom: 20,
  },
  termsBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  termsText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    lineHeight: 20,
  },
  bottomArea: {
    alignItems: 'center',
  },
});
