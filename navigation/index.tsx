import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Provider as PaperProvider } from 'react-native-paper';

import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { BiometricSetupScreen } from '../screens/BiometricSetupScreen';
import { PasswordListScreen } from '../screens/PasswordListScreen';
import { PasswordDetailsScreen } from '../screens/PasswordDetailsScreen';
import { PasswordGeneratorScreen } from '../screens/PasswordGeneratorScreen';
import { MFAApprovalScreen } from '../screens/MFAApprovalScreen';
import { MFAHistoryScreen } from '../screens/MFAHistoryScreen';
import { EmailRelayScreen } from '../screens/EmailRelayScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ThemeSettingsScreen } from '../screens/ThemeSettingsScreen';
import { PasswordShareScreen } from '../screens/PasswordShareScreen';
import { SecurityDashboardScreen } from '../screens/SecurityDashboardScreen';
import { ForgotUsernameScreen } from '../screens/ForgotUsernameScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { PrivacyDashboardScreen } from '../screens/PrivacyDashboardScreen';
import { MasterPasswordSetupScreen } from '../screens/MasterPasswordSetupScreen';
import { AuthGuard } from '../components/AuthGuard';

import type { RootStackParamList, AuthStackParamList, MainTabParamList, PasswordStackParamList } from '../types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();
const PasswordStack = createNativeStackNavigator<PasswordStackParamList>();

// Password Stack Navigator
const PasswordNavigator = () => (
  <PasswordStack.Navigator screenOptions={{ headerShown: false }}>
    <PasswordStack.Screen name="PasswordList" component={PasswordListScreen} />
    <PasswordStack.Screen name="PasswordDetails" component={PasswordDetailsScreen} />
    <PasswordStack.Screen name="AddPassword" component={PasswordDetailsScreen} />
    <PasswordStack.Screen name="PasswordShare" component={PasswordShareScreen} />
  </PasswordStack.Navigator>
);

// MFA Stack Navigator  
const MFAStack = createNativeStackNavigator();

const MFANavigator = () => (
  <MFAStack.Navigator screenOptions={{ headerShown: false }}>
    <MFAStack.Screen name="MFAApproval" component={MFAApprovalScreen} />
    <MFAStack.Screen name="MFAHistory" component={MFAHistoryScreen} />
  </MFAStack.Navigator>
);

// Main Tabs Navigator - Protected with AuthGuard
const MainTabsNavigatorContent = () => (
  <MainTabs.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: {
        backgroundColor: '#ffffff',
        borderTopColor: '#e5e7eb',
      },
    }}
  >
    <MainTabs.Screen
      name="Passwords"
      component={PasswordNavigator}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="key-variant" size={size} color={color} />
        ),
      }}
    />
    <MainTabs.Screen
      name="Generate"
      component={PasswordGeneratorScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="lightning-bolt" size={size} color={color} />
        ),
      }}
    />
    <MainTabs.Screen
      name="MFA"
      component={MFANavigator}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="shield-alert" size={size} color={color} />
        ),
        tabBarLabel: 'MFA',
      }}
    />
    <MainTabs.Screen
      name="EmailRelay"
      component={EmailRelayScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="email" size={size} color={color} />
        ),
        tabBarLabel: 'Email Relay',
      }}
    />
    <MainTabs.Screen
      name="Settings"
      component={SettingsNavigator}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="cog" size={size} color={color} />
        ),
      }}
    />
  </MainTabs.Navigator>
);

const MainTabsNavigator = ({ navigation }: any) => (
  <AuthGuard navigation={navigation}>
    <MainTabsNavigatorContent />
  </AuthGuard>
);

// Auth Stack Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    <AuthStack.Screen name="MasterPasswordSetup" component={MasterPasswordSetupScreen} />
    <AuthStack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
    <AuthStack.Screen name="ForgotUsername" component={ForgotUsernameScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
  </AuthStack.Navigator>
);

// Settings Stack Navigator
const SettingsStack = createNativeStackNavigator();

const SettingsNavigator = () => (
  <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
    <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    <SettingsStack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
    <SettingsStack.Screen name="SecurityDashboard" component={SecurityDashboardScreen} />
    <SettingsStack.Screen name="PrivacyDashboard" component={PrivacyDashboardScreen} />
  </SettingsStack.Navigator>
);

// Root Navigator
export const AppNavigator = () => {
  return (
    <PaperProvider>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Splash" component={SplashScreen} />
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          <RootStack.Screen name="Auth" component={AuthNavigator} />
          <RootStack.Screen name="Main">
            {(props) => <MainTabsNavigator {...props} />}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};