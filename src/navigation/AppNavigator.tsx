import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { AppIcon } from '../components';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme/colors';

import SplashScreen from '../screens/splash/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/patient/HomeScreen';
import ChatsScreen from '../screens/patient/ChatsScreen';
import ChatDetailScreen from '../screens/chat/ChatDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DirectoryScreen from '../screens/chat/DirectoryScreen';
import CallsScreen from '../screens/patient/CallsScreen';
import ProfileScreen from '../screens/patient/ProfileScreen';
import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
import DoctorConsultationsScreen from '../screens/doctor/DoctorConsultationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.background,
    primary: Colors.primary,
    text: Colors.text,
    border: Colors.border,
  },
};

const TAB_ICONS: Record<string, [string, string]> = {
  Home: ['home-outline', 'home'],
  Chats: ['chatbubble-ellipses-outline', 'chatbubble-ellipses'],
  Calls: ['call-outline', 'call'],
  Profile: ['person-outline', 'person'],
};

const DOCTOR_TAB_ICONS: Record<string, [string, string]> = {
  Dashboard: ['grid-outline', 'grid'],
  Consultations: ['clipboard-outline', 'clipboard'],
  Chats: ['chatbubble-ellipses-outline', 'chatbubble-ellipses'],
  Profile: ['person-outline', 'person'],
};

function MainTabs() {
  const tabOptions = useTabOptions(TAB_ICONS);

  return (
    <Tab.Navigator
      screenOptions={tabOptions}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/** Doctor main interface: Dashboard + Consultations + Chats + Profile. */
function DoctorTabs() {
  const tabOptions = useTabOptions(DOCTOR_TAB_ICONS);

  return (
    <Tab.Navigator
      screenOptions={tabOptions}
    >
      <Tab.Screen name="Dashboard" component={DoctorDashboardScreen} />
      <Tab.Screen name="Consultations" component={DoctorConsultationsScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function useTabOptions(icons: Record<string, [string, string]>) {
  const insets = useSafeAreaInsets();
  const contentHeight = Math.min(64, Math.max(52, hp('7%')));

  return ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
      const [outline, filled] = icons[route.name] ?? ['ellipse-outline', 'ellipse'];
      return <AppIcon name={focused ? filled : outline} size={size} color={color} />;
    },
    tabBarActiveTintColor: Colors.white,
    tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
    tabBarLabelStyle: styles.tabLabel,
    tabBarStyle: [
      styles.tabBar,
      {
        height: contentHeight + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 6),
      },
    ],
    tabBarItemStyle: styles.tabItem,
  });
}

const AppNavigator: React.FC = () => {
  const { user, initializing } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Always show splash on cold start so animations play before content.
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (initializing || showSplash) {
    return <SplashScreen />;
  }

  // Doctors get the doctor module as their main interface; everyone else
  // uses the standard patient tabs.
  const isDoctor = user?.role_id === 3;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: styles.headerTitle,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={isDoctor ? DoctorTabs : MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChatDetail"
              component={ChatDetailScreen}
              options={{ title: 'Chat' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: 'Notifications' }}
            />
            <Stack.Screen
              name="Directory"
              component={DirectoryScreen}
              options={{ title: 'Directory' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Signup"
              component={SignupScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    fontWeight: '700',
    fontSize: 17,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBar: {
    backgroundColor: Colors.primary,
    borderTopWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
  },
});

export default AppNavigator;
