import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, Keyboard, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { z } from 'zod';
import AuthLayout from '../components/AuthLayout';
import { Colors } from '../constants/colors';
import Input from '../components/Input';
import Button from '../components/Button';
import { authService } from '../services/authService';
import { loginRateLimiter } from '../services/loginRateLimiter';
import type { RootStackParamList } from '../types';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'EmailLogin'>;
};

export default function EmailLoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    (async () => {
      const wait = await loginRateLimiter.getRemainingWaitSeconds();
      if (wait > 0) setCooldownSeconds(wait);
    })();
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (cooldownSeconds > 0) return;
    setError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError('Incorrect email or password');
      return;
    }

    const remaining = await loginRateLimiter.getRemainingWaitSeconds();
    if (remaining > 0) {
      setCooldownSeconds(remaining);
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.loginWithEmail(email, password);
      await loginRateLimiter.recordSuccess();
    } catch (e: any) {
      setError('Incorrect email or password');
      await loginRateLimiter.recordFailure();
      const wait = await loginRateLimiter.getRemainingWaitSeconds();
      if (wait > 0) setCooldownSeconds(wait);
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

            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

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
              />

              <Input
                label="Password"
                labelLight
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
              />

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>

              {cooldownSeconds > 0 ? (
                <View style={styles.cooldownBox}>
                  <Feather name="clock" size={14} color={Colors.terra} />
                  <Text style={styles.cooldownText}>Too many attempts. Try again in {cooldownSeconds}s</Text>
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isSubmitting}
                disabled={cooldownSeconds > 0}
                style={styles.submitButtonSpacing}
              />

              <TouchableOpacity onPress={() => navigation.navigate('EmailRegister')}>
                <Text style={styles.switchLink}>
                  Don't have an account? <Text style={styles.switchLinkBold}>Create one</Text>
                </Text>
              </TouchableOpacity>
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
  cooldownBox: {
    backgroundColor: Colors.terraLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.terra,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cooldownText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.terra,
    flex: 1,
  },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -12,
    marginBottom: 8,
  },
  forgotLinkText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.green300,
  },
  submitButtonSpacing: {
    marginTop: 8,
  },
  switchLink: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textOnDark,
    textAlign: 'center',
    marginTop: 4,
  },
  switchLinkBold: {
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.green300,
  },
});
