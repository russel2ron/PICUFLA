import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, Keyboard, Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { authService } from '../services/authService';
import type { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ChangePassword'>;
};

export default function ChangePasswordScreen({ navigation }: Props) {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  const handleChangePassword = async () => {
    Keyboard.dismiss();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/\d/.test(password)) {
      setError('Password must include at least one number.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must include at least one lowercase letter.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must include at least one uppercase letter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePassword(password);
      setIsDone(true);
      await authService.logout();
      navigation.replace('EmailLogin');
    } catch (e: any) {
      setError(e.message || 'Could not change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <View style={styles.container}>
        <View style={styles.doneContent}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={32} color={Colors.green700} />
          </View>
          <Text style={styles.title}>Password Changed</Text>
          <Text style={styles.body}>Your password has been updated. Sign in with your new password.</Text>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => navigation.replace('EmailLogin')}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={Keyboard.dismiss}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={Colors.soil} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Feather name="lock" size={28} color={Colors.green700} />
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Min 8 chars: uppercase, lowercase & number"
                  placeholderTextColor={Colors.textDisabled}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={Colors.bark} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={Colors.textDisabled}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                  <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color={Colors.bark} />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.sendButton, isSubmitting ? styles.sendButtonDisabled : null]}
              onPress={handleChangePassword}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.textOnDark} />
              ) : (
                <Text style={styles.sendButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  doneContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
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
    backgroundColor: Colors.green100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: Colors.soil,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
    lineHeight: 22,
    marginBottom: 32,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.bark,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.soil,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    height: 50,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    flex: 1,
  },
  sendButton: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
  },
});
