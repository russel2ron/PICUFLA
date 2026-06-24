import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Keyboard, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import AuthLayout from '../components/AuthLayout';
import { Colors } from '../constants/colors';
import Input from '../components/Input';
import Button from '../components/Button';
import { authService } from '../services/authService';
import type { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    Keyboard.dismiss();
    const trimmed = email.trim().toLowerCase();
    setError('');
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.sendOtp(trimmed);
      navigation.navigate('VerifyOtp', { email: trimmed, purpose: 'password_reset' });
    } catch (e: any) {
      setError(e.message || 'Could not send reset code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={Keyboard.dismiss}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={22} color={Colors.textOnDark} />
            </TouchableOpacity>

            <View style={styles.iconCircle}>
              <Feather name="key" size={28} color={Colors.green700} />
            </View>

            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a code to reset your password.
            </Text>

            <View style={styles.form}>
              <Input
                label="Email"
                labelLight
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={error}
              />

              <Button
                title="Send Reset Code"
                onPress={handleSend}
                loading={isSubmitting}
                style={styles.submitSpacing}
              />
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.textOnDark,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textOnDark,
    lineHeight: 22,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  submitSpacing: {
    marginTop: 8,
  },
});
