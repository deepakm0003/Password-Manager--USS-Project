import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { MasterPasswordPromptScreen } from '../screens/MasterPasswordPromptScreen';
import { getCurrentUser } from '../services/fileStorage';

interface AuthGuardProps {
  children: React.ReactNode;
  navigation: any;
}

/**
 * Auth Guard - Protects routes that require master password authentication
 * Similar to Google Password Manager - prompts for master password to access vault
 * This ensures the master password is required every time the user accesses protected content
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children, navigation }) => {
  const { isAuthenticated, isLoading, masterPassword } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false); // Don't show prompt until we check
  const [checking, setChecking] = useState(true);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    // After checking, if user exists but not authenticated, show prompt
    // DO NOT automatically try biometric - user must explicitly request it
    if (!isLoading && !checking && hasUser) {
      if (!isAuthenticated || !masterPassword) {
        // Just show password prompt - don't automatically try biometric
        setShowPrompt(true);
      } else {
        // Authenticated - hide prompt
        setShowPrompt(false);
      }
    }
  }, [isLoading, checking, hasUser, isAuthenticated, masterPassword]);

  const checkAuthentication = async () => {
    setChecking(true);
    try {
      const user = await getCurrentUser();
      setHasUser(!!user);
      
      if (user) {
        // User exists - ensure their data is loaded
        try {
          const { initStorage, loadUserData } = await import('../services/fileStorage');
          await initStorage();
          await loadUserData(user.id);
        } catch (error) {
          console.error('Error loading user data in AuthGuard:', error);
          // Continue anyway
        }
        
        // Check authentication status - if not authenticated, show password prompt
        // DO NOT automatically try biometric - user must explicitly request it from the prompt screen
        if (!isAuthenticated || !masterPassword) {
          // Show password prompt (user can choose to use biometric from there)
          setShowPrompt(true);
        } else {
          // Authenticated and has master password - allow access
          setShowPrompt(false);
        }
      } else {
        // No user - redirect to auth screen (login/signup)
        navigation.replace('Auth');
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      // On error, show password prompt
      setShowPrompt(true);
    } finally {
      setChecking(false);
    }
  };

  const handleAuthenticated = () => {
    setShowPrompt(false);
  };

  if (isLoading || checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no user, redirect to auth (handled by checkAuthentication)
  if (!hasUser) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If user exists but not authenticated, show master password prompt
  if ((!isAuthenticated || !masterPassword) && showPrompt) {
    return (
      <MasterPasswordPromptScreen
        navigation={navigation}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  // If authenticated, show children
  if (isAuthenticated && masterPassword) {
    return <>{children}</>;
  }

  // Fallback - show loading
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

