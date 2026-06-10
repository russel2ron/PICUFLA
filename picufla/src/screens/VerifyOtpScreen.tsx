import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Keyboard, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackScreenProps } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { authService } from '../services/authService';
import type { RootStackParamList } from '../types';

const RESEND_KEY = '@picufla_otp_resend';
const DELAYS = [60, 120, 300];

interface ResendState {
  count: number;
  cooldownUntil: number;
}

type Props = StackScreenProps<RootStackParamList, 'VerifyOtp'>;

export default function VerifyOtpScreen({ route, navigation }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const { email, purpose } = route.params;
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadCooldown();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadCooldown = async () => {
    try {
      const raw = await AsyncStorage.getItem(RESEND_KEY);
      if (raw) {
        const state: ResendState = JSON.parse(raw);
        const remaining = Math.max(0, Math.ceil((state.cooldownUntil - Date.now()) / 1000));
        if (remaining > 0) {
          startTimer(remaining);
          return;
        }
      }
    } catch {}
    setCanResend(true);
  };

  const getCurrentCooldownSeconds = async (): Promise<number> => {
    try {
      const raw = await AsyncStorage.getItem(RESEND_KEY);
      if (raw) {
        const state: ResendState = JSON.parse(raw);
        const remaining = Math.max(0, Math.ceil((state.cooldownUntil - Date.now()) / 1000));
        if (remaining > 0) return remaining;
      }
    } catch {}
    return 0;
  };

  const startTimer = (seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let secs = seconds;
    setCountdown(secs);
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

  const saveCooldown = async (count: number, seconds: number) => {
    const state: ResendState = { count, cooldownUntil: Date.now() + seconds * 1000 };
    await AsyncStorage.setItem(RESEND_KEY, JSON.stringify(state));
  };

  const handleResend = async () => {
    Keyboard.dismiss();
    setIsSending(true);
    setMessage('');
    setMessageType('');

    const remaining = await getCurrentCooldownSeconds();
    if (remaining > 0) {
      startTimer(remaining);
      setIsSending(false);
      return;
    }

    try {
      await authService.sendOtp(email);
      const raw = await AsyncStorage.getItem(RESEND_KEY);
      const prev: ResendState | null = raw ? JSON.parse(raw) : null;
      const nextCount = (prev?.count ?? 0) + 1;
      const delay = nextCount < DELAYS.length ? DELAYS[nextCount] : DELAYS[DELAYS.length - 1];
      await saveCooldown(nextCount, delay);
      setMessage('Code resent! Check your inbox.');
      setMessageType('success');
      startTimer(delay);
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('too many')) {
        const raw = await AsyncStorage.getItem(RESEND_KEY);
        const prev: ResendState | null = raw ? JSON.parse(raw) : null;
        const nextCount = (prev?.count ?? 0) + 2;
        const delay = nextCount < DELAYS.length ? DELAYS[nextCount] : DELAYS[DELAYS.length - 1];
        await saveCooldown(nextCount, delay);
        setMessage(`Too many attempts. Try again in ${delay}s.`);
        setMessageType('error');
        startTimer(delay);
      } else {
        setMessage(msg || 'Could not resend code.');
        setMessageType('error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    Keyboard.dismiss();
    const code = otp.trim();
    setMessage('');
    setMessageType('');
    if (code.length < 6) {
      setMessage('Enter the 6-digit code sent to your email.');
      setMessageType('error');
      return;
    }

    setIsVerifying(true);
    try {
      await authService.verifyOtp(email, code);
      await AsyncStorage.removeItem(RESEND_KEY);
      setIsProcessing(true);
      if (purpose === 'password_reset') {
        await authService.logout();
        navigation.replace('ChangePassword');
      } else {
        await authService.logout();
        navigation.replace('EmailLogin');
      }
    } catch (e: any) {
      setMessage(e.message || 'Invalid or expired code. Try again.');
      setMessageType('error');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  return (
    <Pressable onPress={Keyboard.dismiss} style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={Colors.soil} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Feather name={purpose === 'password_reset' ? 'key' : 'mail'} size={28} color={Colors.green700} />
        </View>

        <Text style={styles.title}>
          {purpose === 'password_reset' ? 'Check Your Email' : 'Verify Your Email'}
        </Text>

        <Text style={styles.body}>We sent a 6-digit code to</Text>
        <View style={styles.emailPill}>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {isProcessing ? (
          <ActivityIndicator size="large" color={Colors.green700} style={{ marginVertical: 32 }} />
        ) : (
          <>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor={Colors.textDisabled}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {message ? (
              <View style={[styles.messageBox, messageType === 'error' ? styles.errorBox : styles.successBox]}>
                <Feather
                  name={messageType === 'error' ? 'alert-circle' : 'check-circle'}
                  size={14}
                  color={messageType === 'error' ? Colors.error : Colors.success}
                />
                <Text style={[styles.messageText, messageType === 'error' ? styles.errorText : styles.successText]}>
                  {message}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.verifyButton, (!otp || isVerifying) ? styles.buttonDisabled : null]}
              onPress={handleVerify}
              disabled={!otp || isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color={Colors.textOnDark} />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={!canResend || isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={Colors.green700} />
              ) : (
                <Text style={styles.resendButtonText}>
                  {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </Pressable>
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
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: -60,
    left: -8,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    marginBottom: 24,
  },
  emailText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.soil,
  },
  otpInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    height: 52,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_500Medium',
    fontSize: 22,
    color: Colors.soil,
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
    marginBottom: 16,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  successBox: {
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  messageText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    flex: 1,
  },
  successText: {
    color: Colors.success,
  },
  errorText: {
    color: Colors.error,
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
});
