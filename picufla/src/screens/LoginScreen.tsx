import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
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

  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -12, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    );
    float.start();

    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    return () => float.stop();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.illustrationArea, { transform: [{ translateY: floatAnim }] }]}>
          <Text style={styles.leafEmoji}>🌿</Text>
          <Text style={styles.appName}>PICUFLA</Text>
          <Text style={styles.tagline}>Discover & collect every plant around you.</Text>
        </Animated.View>

        <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => navigation.navigate('EmailRegister')}
            activeOpacity={0.8}
          >
            <Text style={styles.emailButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('EmailLogin')}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

        </Animated.View>
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
    justifyContent: 'center',
  },
  illustrationArea: {
    backgroundColor: Colors.linen,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
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
  signInButton: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.stone,
    marginTop: 12,
  },
  signInButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.soil,
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
