import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackScreenProps } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { authService } from '../services/authService';
import type { RootStackParamList } from '../types';

const COOLDOWN_KEY = 'verifyEmailCooldownEnd';

type Props = StackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ route, navigation }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const { email } = route.params;
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read persisted cooldown and set initial countdown
  useEffect(() => {
    initCooldown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const initCooldown = async () => {
    try {
      const stored = await AsyncStorage.getItem(COOLDOWN_KEY);
      if (stored) {
        const end = parseInt(stored, 10);
        const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        if (remaining > 0) {
          setCountdown(remaining);
          startTimer(remaining);
          return;
        }
      }
    } catch {}
    startTimer(60);
  };

  const startTimer = (initial: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let secs = initial;
    setCanResend(false);
    intervalRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCanResend(true);
      }
    }, 1000);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  const handleResend = async () => {
    setIsResending(true);
    setMessage('');
    try {
      await authService.resendVerificationEmail(email);
      const end = Date.now() + 60000;
      await AsyncStorage.setItem(COOLDOWN_KEY, String(end));
      setMessage('Verification email sent!');
      startTimer(60);
    } catch (e: any) {
      Alert.alert('Failed to Resend', e.message || 'Could not resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerified = async () => {
    setIsVerifying(true);
    setMessage('');
    try {
      const session = await authService.getSession();
      if (session?.user?.email_confirmed_at) {
        await AsyncStorage.removeItem(COOLDOWN_KEY);
        navigation.replace('SetupProfile');
        return;
      }
      setMessage("Email not yet verified. Check your inbox and click the link, then try again.");
    } catch {
      setMessage("Could not check verification status. Try again.");
    }
    setIsVerifying(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.envelopeEmoji}>✉️</Text>

        <Text style={styles.title}>Check Your Email</Text>

        <Text style={styles.body}>
          We sent a verification link to
        </Text>

        <View style={styles.emailPill}>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <Text style={styles.hint}>
          Click the link in the email to verify your account, then come back here.
          {'\n\n'}
          Didn't see the email? Check your spam folder.
        </Text>

        {message ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.verifyButton, isVerifying ? styles.buttonDisabled : null]}
          onPress={handleVerified}
          disabled={isVerifying}
          activeOpacity={0.8}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color={Colors.textOnDark} />
          ) : (
            <Text style={styles.verifyButtonText}>I've Verified My Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          disabled={!canResend || isResending}
          activeOpacity={0.8}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={Colors.green700} />
          ) : (
            <Text style={styles.resendButtonText}>
              {canResend ? 'Resend Email' : `Resend in ${countdown}s`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 380,
  },
  envelopeEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26,
    color: Colors.soil,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailPill: {
    backgroundColor: Colors.linen,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emailText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.soil,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textDisabled,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  verifyButton: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 32,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: Colors.textOnDark,
  },
  resendButton: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: Colors.stone,
    backgroundColor: Colors.card,
    marginTop: 12,
  },
  resendButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.green700,
  },
  successBox: {
    backgroundColor: Colors.successBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.success,
    marginBottom: 16,
    width: '100%',
  },
  successText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.success,
    textAlign: 'center',
  },
});
