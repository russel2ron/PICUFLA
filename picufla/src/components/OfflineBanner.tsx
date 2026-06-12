import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface OfflineBannerProps {
  lastSynced?: Date | null;
  visible: boolean;
}

export default function OfflineBanner({ lastSynced, visible }: OfflineBannerProps) {
  const slideAnim = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -40,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const syncText = lastSynced
    ? (() => {
        const diffMs = Date.now() - lastSynced.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return lastSynced.toLocaleDateString();
      })()
    : 'Never';

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      accessibilityRole="alert"
      accessibilityLabel={`Offline. Last synced ${syncText}`}
    >
      <View style={styles.dot} />
      <Text style={styles.text}>Offline · Last synced: {syncText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.terraLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.terra,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.terra,
  },
  text: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.soil,
    flex: 1,
  },
});
