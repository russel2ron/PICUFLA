import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import Button from '../components/Button';
import type { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -12, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ]),
    ).start();

    Animated.stagger(300, [
      Animated.timing(titleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(taglineFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.green100, Colors.linen, Colors.parchment]}
        locations={[0, 0.5, 1]}
        style={styles.illustrationArea}
      >
        <Animated.View style={{ opacity: titleFade }}>
          <Animated.Text style={[styles.leafEmoji, { transform: [{ translateY: floatAnim }] }]}>
            🌿
          </Animated.Text>
          <Text style={styles.appName}>PICUFLA</Text>
        </Animated.View>

        <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
          Discover & collect every plant around you.
        </Animated.Text>
      </LinearGradient>

      <Animated.View style={[styles.formCard, { opacity: cardFade }]}>
        <Button
          title="Get Started"
          onPress={() => navigation.navigate('EmailRegister')}
        />

        <Text style={styles.loginLink}>
          Already have an account?{' '}
          <Text style={styles.loginLinkBold} onPress={() => navigation.navigate('EmailLogin')}>
            Log In
          </Text>
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Privacy Policy and DPA
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
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
    marginTop: 10,
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
