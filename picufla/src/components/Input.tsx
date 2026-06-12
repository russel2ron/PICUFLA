import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ReturnKeyTypeOptions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  hint?: string;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
}

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  multiline,
  maxLength,
  autoFocus,
  rightIcon,
  onRightIconPress,
  hint,
  returnKeyType,
  onSubmitEditing,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;
  const effectiveSecure = isPassword && !showPassword;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            focused && styles.inputFocused,
            error && styles.inputError,
            (rightIcon || isPassword) && styles.inputWithIcon,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDisabled}
          secureTextEntry={effectiveSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete as any}
          multiline={multiline}
          maxLength={maxLength}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label || placeholder || 'Input field'}
          accessibilityRole="none"
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={Colors.bark} />
          </TouchableOpacity>
        )}
        {!isPassword && rightIcon && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={rightIcon}
            accessibilityRole="button"
          >
            <Feather name={rightIcon} size={18} color={Colors.bark} />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View style={styles.errorRow} accessibilityRole="alert">
          <Feather name="alert-circle" size={12} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {hint && !error && (
        <Text style={styles.hintText}>{hint}</Text>
      )}
      {maxLength && (
        <Text style={styles.counter}>
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.soil,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  inputRow: {
    position: 'relative' as const,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    height: 50,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top' as const,
  },
  inputFocused: {
    borderColor: Colors.green600,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  iconButton: {
    position: 'absolute' as const,
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
  },
  errorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.error,
    flex: 1,
  },
  hintText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.bark,
  },
  counter: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.textDisabled,
    textAlign: 'right' as const,
  },
});
