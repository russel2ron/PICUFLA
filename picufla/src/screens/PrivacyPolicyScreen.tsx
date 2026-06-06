import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import type { ProfileStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<ProfileStackParamList, 'PrivacyPolicy'>;
};

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={20} color={Colors.soil} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.parchment,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.linen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
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
