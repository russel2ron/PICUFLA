import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Keyboard, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { z } from 'zod';
import AuthLayout from '../components/AuthLayout';
import { Colors } from '../constants/colors';
import { authService } from '../services/authService';
import { otpStorage } from '../services/otpStorage';
import { useAuthStore } from '../store/authStore';
import Button from '../components/Button';
import Input from '../components/Input';
import type { RootStackParamList } from '../types';

const registerSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/\d/, 'Password must include at least one number')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'EmailRegister'>;
};

export default function EmailRegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setPendingOtpEmail = useAuthStore((s) => s.setPendingOtpEmail);

  const handleRegister = async () => {
    Keyboard.dismiss();
    setErrors({});
    setSubmitError('');

    const result = registerSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.registerWithEmail(email, password);
      await authService.sendOtp(email);
      await otpStorage.setPendingOtpEmail(email);
      setPendingOtpEmail(email);
    } catch (e: any) {
      setSubmitError(e.message || 'Something went wrong. Please try again.');
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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Enter your details to get started</Text>

            <View style={styles.form}>
              <Input
                label="Email"
                labelLight
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
              />

              <Input
                label="Password"
                labelLight
                value={password}
                onChangeText={setPassword}
                placeholder="Min 8 chars: uppercase, lowercase & number"
                secureTextEntry
                autoCapitalize="none"
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                labelLight
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                secureTextEntry
                autoCapitalize="none"
                error={errors.confirmPassword}
              />

              {submitError ? (
                <View style={styles.submitErrorBox}>
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              ) : null}

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={isSubmitting}
                style={styles.submitButtonSpacing}
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
    marginBottom: 16,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.textOnDark,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textOnDark,
    marginBottom: 28,
  },
  form: {
    gap: 20,
  },
  submitErrorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  submitErrorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  submitButtonSpacing: {
    marginTop: 8,
  },
});
