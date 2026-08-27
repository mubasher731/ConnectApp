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
import { navigationRef } from './navigationRef';

import SplashScreen from '../screens/splash/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/patient/HomeScreen';
import ChatsScreen from '../screens/patient/ChatsScreen';
import ChatDetailScreen from '../screens/chat/ChatDetailScreen';
import NotificationsScreen from '../screens/notification/NotificationsScreen';
import DirectoryScreen from '../screens/chat/DirectoryScreen';
import CallsScreen from '../screens/patient/CallsScreen';
import ProfileScreen from '../screens/patient/ProfileScreen';
import DoctorsScreen from '../screens/patient/DoctorsScreen';
import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
//import { CallScreen } from '../components/Call/CallScreen';
import { CallScreen } from '../components/Call/CallScreen';

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
  Chats: ['chatbubble-ellipses-outline', 'chatbubble-ellipses'],
  Calls: ['call-outline', 'call'],
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

/** Doctor main interface: Dashboard + Chats + Calls + Profile. */
function DoctorTabs() {
  const tabOptions = useTabOptions(DOCTOR_TAB_ICONS);

  return (
    <Tab.Navigator
      screenOptions={tabOptions}
    >
      <Tab.Screen name="Dashboard" component={DoctorDashboardScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
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

  // Show splash until auth init is done AND minimum animation time (1.5s) passed.
  const [minDelayDone, setMinDelayDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (initializing || !minDelayDone) {
    return <SplashScreen />;
  }

  // Doctors get the doctor module as their main interface; everyone else
  // uses the standard patient tabs.
  const isDoctor = user?.role_id === 3;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
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
              name="Doctors"
              component={DoctorsScreen}
              options={{
                title: 'Doctors',
                headerTitleStyle: styles.doctorsHeaderTitle,
              }}
            />
            <Stack.Screen
              name="Directory"
              component={DirectoryScreen}
              options={{ title: 'Directory' }}
            />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ headerShown: false }}
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
  doctorsHeaderTitle: {
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBar: {
    backgroundColor: Colors.card, // #151A33 dark tab bar
    borderTopWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
  },
});

export default AppNavigator;
