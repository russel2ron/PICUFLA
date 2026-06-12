import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export default function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={100} borderRadius={16} />
      <View style={styles.cardBody}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="60%" height={10} />
        <Skeleton width="40%" height={10} />
      </View>
    </View>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.gridItem}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

export function SkeletonDetail() {
  return (
    <View style={styles.detailContainer}>
      <Skeleton height={220} borderRadius={0} />
      <View style={styles.detailBody}>
        <Skeleton width="70%" height={28} />
        <Skeleton width="50%" height={18} />
        <View style={{ height: 16 }} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="60%" height={14} />
        <View style={{ height: 24 }} />
        <Skeleton height={120} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.stone,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  cardBody: {
    padding: 9,
    gap: 6,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    padding: 14,
    gap: 9,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%' as any,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: Colors.parchment,
  },
  detailBody: {
    padding: 16,
  },
});
