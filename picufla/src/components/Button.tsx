import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { Colors } from '../constants/colors';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

export default function Button({ title, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          baseStyles.base,
          variant === 'primary' && baseStyles.primary,
          variant === 'secondary' && baseStyles.secondary,
          variant === 'danger' && baseStyles.danger,
          isDisabled && baseStyles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? Colors.textOnDark : Colors.green700}
          />
        ) : (
          <Text
            style={[
              baseStyles.text,
              variant === 'primary' && baseStyles.textPrimary,
              variant === 'secondary' && baseStyles.textSecondary,
              variant === 'danger' && baseStyles.textDanger,
            ]}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const baseStyles = StyleSheet.create({
  base: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: Colors.green700,
  },
  secondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.stone,
  },
  danger: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  textPrimary: {
    color: Colors.textOnDark,
  },
  textSecondary: {
    color: Colors.soil,
  },
  textDanger: {
    color: Colors.error,
  },
});
