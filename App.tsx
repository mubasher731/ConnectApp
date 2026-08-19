/**
 * ConnectApp - Modern React Native Chat Application
 * Healthcare Communication Platform
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { MockSessionProvider } from './src/context/MockSessionProvider';
import { Colors } from './src/theme/colors';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background}
      />
      <AuthProvider>
        <MockSessionProvider>
          <AppNavigator />
        </MockSessionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
