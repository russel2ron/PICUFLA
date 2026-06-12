import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, Animated, StyleSheet, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((msg: ToastMessage) => void)[] = [];

export function showToast(message: string, type: ToastType = 'success') {
  const id = Date.now().toString();
  toastListeners.forEach((listener) => listener({ id, message, type }));
}

const CONFIG: Record<ToastType, { icon: keyof typeof Feather.glyphMap; bg: string; color: string }> = {
  success: { icon: 'check-circle', bg: Colors.successBg, color: Colors.success },
  error: { icon: 'alert-circle', bg: Colors.errorBg, color: Colors.error },
  warning: { icon: 'alert-triangle', bg: Colors.warningBg, color: Colors.warning },
  info: { icon: 'info', bg: Colors.infoBg, color: Colors.info },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const currentMsg = useRef<ToastMessage | null>(null);
  const isShowing = useRef(false);

  const show = useCallback((msg: ToastMessage) => {
    if (isShowing.current) {
      setQueue((prev) => [...prev, msg]);
      return;
    }

    isShowing.current = true;
    currentMsg.current = msg;
    setQueue([]);

    opacity.setValue(0);
    translateY.setValue(-20);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        isShowing.current = false;
        currentMsg.current = null;
        if (queue.length > 0) {
          show(queue[0]);
        }
      });
    }, 2500);
  }, [opacity, translateY, queue]);

  useEffect(() => {
    const listener = (msg: ToastMessage) => show(msg);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, [show]);

  const msg = currentMsg.current;
  const cfg = msg ? CONFIG[msg.type] : null;

  return (
    <View style={{ flex: 1 }}>
      {children}
      {msg && cfg && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: cfg.bg,
              borderColor: cfg.color,
              opacity,
              transform: [{ translateY }],
            },
          ]}
          accessibilityRole="alert"
          accessibilityLabel={msg.message}
        >
          <Feather name={cfg.icon} size={16} color={cfg.color} />
          <Text style={[styles.text, { color: cfg.color }]}>{msg.message}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute' as const,
    top: 60,
    left: 16,
    right: 16,
    maxWidth: SCREEN_WIDTH - 32,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  text: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    flex: 1,
  },
});
