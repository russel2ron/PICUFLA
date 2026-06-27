import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AuthLayout from '../components/AuthLayout';
import { Colors } from '../constants/colors';
import Button from '../components/Button';
import type { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const titleFade = useRef(new Animated.Value(0)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(300, [
      Animated.timing(titleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(taglineFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <AuthLayout logoPosition="none">
      <View style={styles.contentWrapper}>
        <Animated.View style={[styles.topSection, { opacity: titleFade }]}>
          <Image source={require('../../assets/LOGO.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>PICUFLA</Text>
        </Animated.View>

        <View style={styles.bottomSection}>
          <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
            Discover & collect every plant around you.
          </Animated.Text>

          <Animated.View style={{ opacity: cardFade }}>
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
              By continuing, you agree to our Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    marginTop: 80,
  },
  logo: {
    width: 500,
    height: 183,
    marginBottom: 8,
  },
  appName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 36,
    color: Colors.textOnDark,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textOnDark,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  loginLink: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textOnDark,
    textAlign: 'center',
    marginTop: 24,
  },
  loginLinkBold: {
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.green400,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textOnDark,
    textAlign: 'center',
  },
});
