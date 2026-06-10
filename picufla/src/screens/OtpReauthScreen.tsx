import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

const LAST_OTP_KEY = 'lastOtpTime';

type Props = {
  onVerified?: () => void;
};

export default function OtpReauthScreen({ onVerified }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const isNewUser = !!session && !!user && !user.setup_complete;

  const [email, setEmail] = useState(session?.user?.email ?? '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>(session?.user?.email ? 'otp' : 'email');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [initialSendDone, setInitialSendDone] = useState(false);

  useEffect(() => {
    if (session?.user?.email && !initialSendDone) {
      setInitialSendDone(true);
      autoSendOtp(session.user.email);
    }
  }, [session?.user?.email]);

  const autoSendOtp = async (targetEmail: string) => {
    setIsSending(true);
    setMessage('');
    try {
      await authService.sendOtp(targetEmail);
      setStep('otp');
      setMessage('Code sent to your email.');
    } catch (e: any) {
      setMessage(e.message || 'Could not send code.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setMessage('Enter your email address.');
      return;
    }
    setIsSending(true);
    setMessage('');
    try {
      await authService.sendOtp(trimmed);
      setStep('otp');
      setMessage('Code sent to your email.');
    } catch (e: any) {
      setMessage(e.message || 'Could not send code.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    const targetEmail = session?.user?.email ?? email.trim().toLowerCase();
    const code = otp.trim();
    if (code.length < 6) {
      setMessage('Enter the 6-digit code.');
      return;
    }
    setIsVerifying(true);
    setMessage('');
    try {
      await authService.verifyOtp(targetEmail, code);
      await AsyncStorage.setItem(LAST_OTP_KEY, String(Date.now()));
      onVerified?.();
    } catch (e: any) {
      setMessage(e.message || 'Invalid code. Try again.');
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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{isNewUser ? '🎉' : '🔐'}</Text>
        <Text style={styles.title}>{isNewUser ? 'Welcome!' : 'Session Verification'}</Text>
        <Text style={styles.body}>
          {isNewUser
            ? 'Your account is ready! Check your email for the verification code.'
            : 'For your security, please verify your identity every 12 hours.'}
        </Text>

        {session?.user?.email && !isNewUser && (
          <View style={styles.emailPill}>
            <Text style={styles.emailPillText}>{session.user.email}</Text>
          </View>
        )}

        {message ? (
          <View style={[styles.messageBox, message.includes('sent') ? styles.successBox : styles.errorBox]}>
            <Text style={[styles.messageText, message.includes('sent') ? styles.successText : styles.errorText]}>
              {message}
            </Text>
          </View>
        ) : null}

        {step === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Your email address"
              placeholderTextColor={Colors.textDisabled}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.button, isSending ? styles.buttonDisabled : null]}
              onPress={handleSendOtp}
              disabled={isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={Colors.textOnDark} />
              ) : (
                <Text style={styles.buttonText}>Send Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.otpInput}
              placeholder="6-digit code"
              placeholderTextColor={Colors.textDisabled}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, (!otp || isVerifying) ? styles.buttonDisabled : null]}
              onPress={handleVerify}
              disabled={!otp || isVerifying}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color={Colors.textOnDark} />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
            {!session?.user?.email && (
              <TouchableOpacity onPress={() => { setStep('email'); setMessage(''); }} activeOpacity={0.7}>
                <Text style={styles.backLink}>Use a different email</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export async function getLastOtpTime(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(LAST_OTP_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function isOtpExpired(lastTime: number): boolean {
  return Date.now() - lastTime > 12 * 60 * 60 * 1000;
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
  icon: {
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
    marginBottom: 24,
  },
  emailPill: {
    backgroundColor: Colors.linen,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  emailPillText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.soil,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    height: 52,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.soil,
    width: '100%',
    marginBottom: 16,
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
  button: {
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
  buttonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: Colors.textOnDark,
  },
  backLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.green700,
    marginTop: 16,
  },
});
