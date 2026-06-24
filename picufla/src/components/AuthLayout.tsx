import React from 'react';
import { View, Image, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthLayoutProps {
  children: React.ReactNode;
  logoPosition?: 'right' | 'none';
}

export default function AuthLayout({ children, logoPosition = 'right' }: AuthLayoutProps) {
  return (
    <ImageBackground
      source={require('../../assets/background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      />
      {logoPosition === 'right' && (
        <View style={styles.logoCorner}>
          <Image source={require('../../assets/LOGO.png')} style={styles.logoCornerImage} resizeMode="contain" />
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoCorner: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
  },
  logoCornerImage: {
    width: 120,
    height: 44,
  },
  content: {
    flex: 1,
    zIndex: 5,
  },
});
