import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { authService } from '../services/authService';
import type { RootStackParamList } from '../types';

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

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    setIsResending(true);
    try {
      await authService.resendVerificationEmail(email);
    } catch {}
    setIsResending(false);
  };

  const handleVerified = async () => {
    setIsVerifying(true);
    try {
      // Refresh the session to pick up the verified email
      const session = await authService.getSession();
      if (session?.user?.email_confirmed_at) {
        // Session is verified — navigation will auto-redirect via useAuth
      }
    } catch {}
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
        </Text>

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
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  verifyButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
  },
  resendButton: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.stone,
    backgroundColor: Colors.card,
    marginTop: 12,
  },
  resendButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.green700,
  },
});
