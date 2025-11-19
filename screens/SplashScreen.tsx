import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initStorage, getCurrentUser, isOnboardingCompleted } from '../services/fileStorage';

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';

interface SplashScreenProps {
  navigation: any;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize storage
        await initStorage();

        // Check if user is logged in
        const user = await getCurrentUser();
        
        if (user) {
          // User exists - load their data
          try {
            const { loadUserData } = await import('../services/fileStorage');
            await loadUserData(user.id);
            console.log('User data loaded in splash screen for:', user.username);
          } catch (error) {
            console.error('Error loading user data in splash:', error);
            // Continue anyway - user might not have data yet
          }
          
          // User exists, check onboarding status for this user
          const onboardingCompleted = await isOnboardingCompleted();
          if (!onboardingCompleted) {
            // Shouldn't happen if signup worked correctly
            navigation.replace('Onboarding');
          } else {
            // Go to main app (AuthGuard will prompt for master password if needed)
            navigation.replace('Main');
          }
        } else {
          // No user exists - check if onboarding was shown before
          const onboardingShown = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
          if (onboardingShown === 'true') {
            // Onboarding already shown, go to auth
            navigation.replace('Auth');
          } else {
            // First time - show onboarding
            navigation.replace('Onboarding');
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        navigation.replace('Auth');
      }
    };

    // Small delay for splash screen
    const timer = setTimeout(initializeApp, 1500);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.shield}>
          <View style={styles.shieldInner} />
        </View>
      </View>
      <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  shield: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 20,
  },
});
