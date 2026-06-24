import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import Header from '../components/Header';
import type { ProfileStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<ProfileStackParamList, 'PrivacyPolicy'>;
};

export default function PrivacyPolicyScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <Header title="Privacy Policy" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Data We Collect</Text>
        <Text style={styles.body}>
          Camera images (temporary, compressed before identification), GPS location
          (optional), plant collection data, account information, usage logs.
        </Text>

        <Text style={styles.sectionTitle}>How We Use Your Data</Text>
        <Text style={styles.body}>
          To identify plants via OpenAI Vision API, to build and store your personal
          collection, to send care reminders you set, to improve app stability.
        </Text>

        <Text style={styles.sectionTitle}>Data Storage & Security</Text>
        <Text style={styles.body}>
          Your data is stored on Supabase cloud infrastructure. Session tokens are
          encrypted using AES-256 on your device. Plant images are stored in a
          private, access-controlled storage bucket. All database access is
          restricted to your account via Row Level Security.
        </Text>

        <Text style={styles.sectionTitle}>
          Your Rights (Philippine Data Privacy Act of 2012)
        </Text>
        <Text style={styles.body}>
          You have the right to access, correct, and delete your personal data.
          Deletion requests are processed within 30 days. Use the account settings
          to exercise these rights.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.body}>
          OpenAI GPT-4o is used for plant identification. Images are sent to OpenAI
          and not stored by PICUFLA after identification. See OpenAI{'\''}s Privacy
          Policy for details.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>
          For privacy concerns: privacy@picufla.app
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    color: Colors.soil,
    marginTop: 8,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.bark,
    lineHeight: 22,
  },
});
