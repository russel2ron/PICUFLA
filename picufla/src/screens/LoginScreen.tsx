import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { authService } from '../services/authService';
import type { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
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

  const handleGoogleLogin = async () => {
    try {
      await authService.loginWithGoogle();
    } catch {}
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} keyboardShouldPersistTaps="handled">
        <View style={styles.illustrationArea}>
          <Text style={styles.leafEmoji}>🌿</Text>
          <Text style={styles.appName}>PICUFLA</Text>
          <Text style={styles.tagline}>Discover & collect every plant around you.</Text>
        </View>

        <View style={styles.formCard}>
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} activeOpacity={0.8}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => navigation.navigate('EmailRegister')}
            activeOpacity={0.8}
          >
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('EmailLogin')}>
            <Text style={styles.loginLink}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Privacy Policy and DPA
        </Text>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  illustrationArea: {
    backgroundColor: Colors.linen,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  leafEmoji: {
    fontSize: 72,
  },
  appName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 36,
    color: Colors.soil,
    marginTop: 8,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  formCard: {
    backgroundColor: Colors.linen,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    marginTop: -24,
    ...Theme.shadow.sm,
  },
  googleButton: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.stone,
  },
  googleButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.soil,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.stone,
    opacity: 0.5,
  },
  dividerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.bark,
    marginHorizontal: 16,
  },
  emailButton: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textOnDark,
  },
  loginLink: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.bark,
    textAlign: 'center',
    marginTop: 24,
  },
  loginLinkBold: {
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.green700,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.bark,
    textAlign: 'center',
  },
});
