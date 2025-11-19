import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { MasterPasswordPromptScreen } from './MasterPasswordPromptScreen';

interface ProtectedScreenProps {
  children: React.ReactNode;
  navigation: any;
}

/**
 * Wrapper component that requires authentication before showing content
 * Similar to Google Password Manager - all data requires authentication
 */
export const ProtectedScreen: React.FC<ProtectedScreenProps> = ({ children, navigation }) => {
  const { isAuthenticated, isLoading, authenticateWithBiometric } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Try biometric first if available
        authenticateWithBiometric().then((success) => {
          if (!success) {
            setShowPrompt(true);
          }
        });
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Loading indicator */}
      </View>
    );
  }

  if (!isAuthenticated && showPrompt) {
    return (
      <MasterPasswordPromptScreen
        navigation={navigation}
        onAuthenticated={() => setShowPrompt(false)}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        {/* Checking authentication */}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

