/**
 * ConnectApp - Modern React Native Chat Application
 * Healthcare Communication Platform
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/components/CustomAlert/AlertProvider';
import { SessionConfigProvider } from './src/context/SessionConfigContext';
import { CallProvider } from './src/context/CallContext';
import { Colors } from './src/theme/colors';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.background}
      />
      <AuthProvider>
        <AlertProvider>
          <SessionConfigProvider>
            <CallProvider>
              <AppNavigator />
            </CallProvider>
          </SessionConfigProvider>
        </AlertProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
