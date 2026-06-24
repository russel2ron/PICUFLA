import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import Button from '../components/Button';
import { StorageKeys } from '../constants/storage';
import { authService } from '../services/authService';
import { otpStorage } from '../services/otpStorage';

const RESEND_KEY = StorageKeys.OTP_RESEND;
const DELAYS = [60, 120, 300];

interface ResendState {
  count: number;
  cooldownUntil: number;
}

type Props = {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
};

export default function SignupOtpScreen({ email, onVerified, onBack }: Props) {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [message, setMessage] = useState('');
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

  const handleResend = async () => {
    setIsResending(true);
    setMessage('');

    const remaining = await getCurrentCooldownSeconds();
    if (remaining > 0) {
      startTimer(remaining);
      setIsResending(false);
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
        startTimer(delay);
      } else {
        setMessage(msg || 'Could not resend code.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.trim();
    setMessage('');
    if (code.length < 6) {
      setMessage('Enter the 6-digit code sent to your email.');
      return;
    }

    setIsVerifying(true);
    try {
      await authService.verifyOtp(email, code);
      await otpStorage.clearPendingOtpEmail();
      await AsyncStorage.removeItem(RESEND_KEY);
      onVerified();
    } catch (e: any) {
      setMessage(e.message || 'Invalid or expired code. Try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="mail" size={28} color={Colors.green700} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.body}>We sent a 6-digit code to</Text>
        <View style={styles.emailPill}>
          <Text style={styles.emailText}>{email}</Text>
        </View>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.wrongEmail}>
            <Text style={styles.wrongEmailText}>Wrong email? Go back</Text>
          </TouchableOpacity>
        )}

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
          <View style={[styles.messageBox, message.includes('sent') ? styles.successBox : styles.errorBox]}>
            <Text style={[styles.messageText, message.includes('sent') ? styles.successText : styles.errorText]}>
              {message}
            </Text>
          </View>
        ) : null}

        <Button title="Verify Code" onPress={handleVerify} loading={isVerifying} disabled={!otp} />

        <View style={{ height: 32 }} />

        <Button
          title={canResend ? 'Resend Code' : `Resend in ${countdown}s`}
          onPress={handleResend}
          variant="secondary"
          disabled={!canResend || isResending}
          loading={isResending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  wrongEmail: {
    marginBottom: 24,
  },
  wrongEmailText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.green700,
    textDecorationLine: 'underline',
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
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: Colors.success,
  },
  errorText: {
    color: Colors.error,
  },

});
