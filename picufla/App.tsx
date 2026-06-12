import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from './src/hooks/useAuth';
import AuthStack from './src/navigation/AuthStack';
import AppTabs from './src/navigation/AppTabs';
import OnboardingStack from './src/navigation/OnboardingStack';
import SetupProfileScreen from './src/screens/SetupProfileScreen';
import OtpReauthScreen, { getLastOtpTime, isOtpExpired } from './src/screens/OtpReauthScreen';
import SignupOtpScreen from './src/screens/SignupOtpScreen';
import { Colors } from './src/constants/colors';
import { useAuthStore } from './src/store/authStore';
import { otpStorage } from './src/services/otpStorage';
import { useAppStore } from './src/store/appStore';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SetupStack = createStackNavigator();
function SetupNavigator() {
  return (
    <SetupStack.Navigator screenOptions={{ headerShown: false }}>
      <SetupStack.Screen name="SetupProfile" component={SetupProfileScreen} />
    </SetupStack.Navigator>
  );
}

function RootNavigator() {
  const { session, user, isLoading } = useAuth();
  const pendingOtpEmail = useAuthStore((s) => s.pendingOtpEmail);
  const setPendingOtpEmail = useAuthStore((s) => s.setPendingOtpEmail);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const loadOnboardingState = useAppStore((s) => s.loadOnboardingState);
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });
  const [otpChecked, setOtpChecked] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otpRefreshKey, setOtpRefreshKey] = useState(0);
  const [needsSignupOtp, setNeedsSignupOtp] = useState<string | null>(null);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  useEffect(() => {
    const checkStoredOtp = async () => {
      const stored = await otpStorage.getPendingOtpEmail();
      setNeedsSignupOtp(stored);
    };
    checkStoredOtp();
  }, [session?.user?.id]);

  useEffect(() => {
    if (session && user?.setup_complete) {
      getLastOtpTime().then((t) => {
        setNeedsOtp(isOtpExpired(t));
        setOtpChecked(true);
      });
    } else {
      setNeedsOtp(false);
      setOtpChecked(true);
    }
  }, [session, user?.setup_complete, otpRefreshKey]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      onLayoutRootView();
    }
  }, [fontsLoaded, onLayoutRootView]);

  if (!fontsLoaded || isLoading || !otpChecked) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.parchment }}
        onLayout={onLayoutRootView}
      >
        <ActivityIndicator size="large" color={Colors.green700} />
      </View>
    );
  }

  if (!onboardingComplete) return <OnboardingStack />;

  const signupOtpEmail = pendingOtpEmail || needsSignupOtp;

  if (signupOtpEmail) {
    return (
      <SignupOtpScreen
        email={signupOtpEmail}
        onVerified={() => {
          setPendingOtpEmail(null);
          setNeedsSignupOtp(null);
        }}
      />
    );
  }

  if (!session) return <AuthStack />;
  if (user && !user.setup_complete) return <SetupNavigator />;
  if (needsOtp) return <OtpReauthScreen onVerified={() => setOtpRefreshKey(k => k + 1)} />;
  return <AppTabs />;
}

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
