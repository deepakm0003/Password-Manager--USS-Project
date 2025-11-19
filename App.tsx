import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
