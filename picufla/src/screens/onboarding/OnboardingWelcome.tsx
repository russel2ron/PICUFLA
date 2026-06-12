import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import Button from '../../components/Button';
import type { OnboardingStackParamList } from '../../types';

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingWelcome'>;
};

export default function OnboardingWelcome({ navigation }: Props) {
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={styles.hero}>
          <Animated.Text style={[styles.leafEmoji, { transform: [{ translateY: floatAnim }] }]}>
            🌿
          </Animated.Text>
          <Text style={styles.title}>PICUFLA</Text>
          <Text style={styles.tagline}>Discover & collect every plant around you.</Text>
        </View>

        <Animated.View style={[styles.bottomArea, { opacity: fadeAnim }]}>
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('OnboardingFeatures')}
          />

          <Text style={styles.skipLink} onPress={() => navigation.navigate('OnboardingTerms')}>
            Skip
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.stone,
  },
  dotActive: {
    backgroundColor: Colors.green700,
    width: 24,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  leafEmoji: {
    fontSize: 80,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 36,
    color: Colors.soil,
    marginTop: 12,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.bark,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  bottomArea: {
    alignItems: 'center',
  },
  skipLink: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.bark,
    marginTop: 20,
  },
});
