import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { AppIcon } from '../components';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { Colors } from '../theme/colors';
import { navigationRef, navigate } from './navigationRef';

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

/** Resolve the currently focused screen name (handles nested navigators). */
const getActiveRouteName = (state: any): string => {
  if (!state) return '';
  const route = state.routes?.[state.index];
  if (!route) return '';
  return route.state ? getActiveRouteName(route.state) : (route.name ?? '');
};

/** Floating "Back to Call" pill (WhatsApp-style) for returning to an active call. */
const BackToCallBanner: React.FC<{ currentRoute: string }> = ({ currentRoute }) => {
  const insets = useSafeAreaInsets();
  const { state: callState } = useCall();

  if (callState.status === 'idle' || currentRoute === 'Call') return null;

  return (
    <View style={[styles.backToCallWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backToCall}
        onPress={() => navigate('Call')}
        activeOpacity={0.9}
      >
        <AppIcon name="call" size={16} color={Colors.white} />
        <Text style={styles.backToCallText}>Back to Call</Text>
      </TouchableOpacity>
    </View>
  );
};

const AppNavigator: React.FC = () => {
  const { user, initializing } = useAuth();

  // Show splash until auth init is done AND minimum animation time (1.5s) passed.
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Track the focused screen so the "Back to Call" banner hides on the Call
  // screen. Guarded with isReady() because during the Splash phase the
  // NavigationContainer isn't mounted yet (ref.current is null), and calling
  // getCurrentRoute() then logs the "navigation object hasn't been initialized"
  // error. The onStateChange callback keeps it up to date afterwards.
  useEffect(() => {
    setCurrentRouteName(
      navigationRef.isReady() ? (navigationRef.getCurrentRoute()?.name ?? '') : ''
    );
  }, []);

  if (initializing || !minDelayDone) {
    return <SplashScreen />;
  }

  // Doctors get the doctor module as their main interface; everyone else
  // uses the standard patient tabs.
  const isDoctor = user?.role_id === 3;

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onStateChange={(s) => setCurrentRouteName(getActiveRouteName(s))}
      >
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
      <BackToCallBanner currentRoute={currentRouteName} />
    </>
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
  backToCallWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  backToCall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  backToCallText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default AppNavigator;
