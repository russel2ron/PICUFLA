import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface BadgeProps {
  label?: string;
  variant?: 'confidence' | 'tag' | 'stat' | 'status';
  confidence?: number;
  icon?: keyof typeof Feather.glyphMap;
}

export default function Badge({ label, variant = 'tag', confidence, icon }: BadgeProps) {
  if (variant === 'confidence' && confidence !== undefined) {
    const high = confidence >= 0.8;
    const medium = confidence >= 0.6 && confidence < 0.8;
    const low = confidence < 0.6;

    const bgColor = high ? Colors.green100 : medium ? Colors.warningBg : Colors.terraLight;
    const textColor = high ? Colors.green700 : medium ? Colors.warning : Colors.terra;
    const iconName = high ? 'check' as const : medium ? 'alert-triangle' as const : 'help-circle' as const;
    const pct = Math.round(confidence * 100);

    return (
      <View style={[styles.badge, styles.confidenceBadge, { backgroundColor: bgColor }]}>
        <Feather name={iconName} size={14} color={textColor} />
        <Text style={[styles.confidenceText, { color: textColor }]}>{pct}% match</Text>
      </View>
    );
  }

  if (variant === 'stat') {
    return (
      <View style={[styles.badge, styles.statBadge]}>
        {icon && <Feather name={icon} size={12} color={Colors.green700} />}
        <Text style={styles.statText}>{label}</Text>
      </View>
    );
  }

  if (variant === 'status') {
    const isOffline = (label ?? '').toLowerCase().includes('offline');
    return (
      <View style={[styles.badge, styles.statusBadge, isOffline && styles.statusBadgeOffline]}>
        <View style={[styles.statusDot, isOffline && styles.statusDotOffline]} />
        <Text style={[styles.statusText, isOffline && styles.statusTextOffline]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.tagBadge]}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  confidenceText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  statBadge: {
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.green100,
  },
  statText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.green700,
  },
  tagBadge: {
    backgroundColor: Colors.lavenderLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.lavender,
  },
  statusBadge: {
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.green100,
  },
  statusBadgeOffline: {
    backgroundColor: Colors.terraLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green700,
  },
  statusDotOffline: {
    backgroundColor: Colors.terra,
  },
  statusText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.green700,
  },
  statusTextOffline: {
    color: Colors.soil,
  },
});
