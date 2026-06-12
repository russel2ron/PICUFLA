import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAppStore } from '../store/appStore';
import OfflineBanner from '../components/OfflineBanner';
import CollectionScreen from '../screens/CollectionScreen';
import PlantDetailScreen from '../screens/PlantDetailScreen';
import ReminderScreen from '../screens/ReminderScreen';
import ScanScreen from '../screens/ScanScreen';
import IdentificationResultScreen from '../screens/IdentificationResultScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SetupProfileScreen from '../screens/SetupProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import type {
  AppTabParamList,
  CollectionStackParamList,
  ScanStackParamList,
  ProfileStackParamList,
} from '../types';

const Tab = createBottomTabNavigator<AppTabParamList>();

const CollectionStack = createStackNavigator<CollectionStackParamList>();
function CollectionStackScreen() {
  const isOffline = useAppStore((s) => s.isOffline);
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner visible={isOffline} />
      <CollectionStack.Navigator screenOptions={{ headerShown: false }}>
        <CollectionStack.Screen name="Collection" component={CollectionScreen} />
        <CollectionStack.Screen name="PlantDetail" component={PlantDetailScreen} />
        <CollectionStack.Screen name="Reminders" component={ReminderScreen} />
      </CollectionStack.Navigator>
    </View>
  );
}

const ScanStack = createStackNavigator<ScanStackParamList>();
function ScanStackScreen() {
  return (
    <ScanStack.Navigator screenOptions={{ headerShown: false }}>
      <ScanStack.Screen name="Scan" component={ScanScreen} />
      <ScanStack.Screen name="IdentificationResult" component={IdentificationResultScreen} />
    </ScanStack.Navigator>
  );
}

const ProfileStack = createStackNavigator<ProfileStackParamList>();
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="SetupProfile" component={SetupProfileScreen} />
      <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Feather name={name as any} size={22} color={focused ? Colors.tabActive : Colors.tabInactive} />
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBg,
          borderTopColor: Colors.stone + '80',
          height: 70,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 10,
          letterSpacing: 0.02,
        },
      }}
    >
      <Tab.Screen
        name="CollectionTab"
        component={CollectionStackScreen}
        options={{
          tabBarLabel: 'Collection',
          tabBarIcon: ({ focused }) => <TabIcon name="book-open" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanStackScreen}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ focused }) => <TabIcon name="aperture" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: Colors.green100,
  },
});
