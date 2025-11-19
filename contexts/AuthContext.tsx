import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getCurrentUser, verifyMasterPassword } from '../services/fileStorage';
import * as AuthService from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  masterPassword: string | null;
  isLoading: boolean;
  authenticate: (password: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  setMasterPassword: (password: string) => Promise<void>;
  checkBiometricAvailable: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MASTER_PASSWORD_KEY = 'master_password_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterPassword, setMasterPasswordState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        setIsAuthenticated(false);
        setMasterPasswordState(null);
        return;
      }

      // Try to restore master password from secure store
      try {
        const storedPassword = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
        if (storedPassword) {
          const isValid = await verifyMasterPassword(user, storedPassword);
          if (isValid) {
            setMasterPasswordState(storedPassword);
            setIsAuthenticated(true);

            // Ensure storage is initialized and user data loaded
            try {
              const { initStorage, loadUserData } = await import('../services/fileStorage');
              await initStorage();
              await loadUserData(user.id);
            } catch (storageError) {
              console.error('Error loading user data on startup:', storageError);
            }
            return;
          }
        }
      } catch (secureStoreError) {
        console.error('Error restoring master password from SecureStore:', secureStoreError);
      }

      // If no stored password or verification failed, require re-authentication
      setIsAuthenticated(false);
      setMasterPasswordState(null);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setMasterPasswordState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async (password: string): Promise<boolean> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No user found in storage during authentication');
        return false;
      }

      // Verify master password
      const isValid = await verifyMasterPassword(user, password);
      if (isValid) {
        // Store master password in secure store for session
        try {
          await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, password);
        } catch (secureStoreError: any) {
          // If SecureStore fails, still allow authentication
          // Password will just be stored in memory for this session
          console.log('Could not store password in SecureStore (using memory only):', secureStoreError?.message);
        }
        setMasterPasswordState(password);
        setIsAuthenticated(true);
        
        // Ensure user data is loaded for this user
        try {
          const { loadUserData, initStorage } = await import('../services/fileStorage');
          // Make sure storage is initialized
          await initStorage();
          // Load user's data
          await loadUserData(user.id);
          console.log('User data loaded successfully for user:', user.id);
        } catch (error) {
          console.error('Error loading user data after authentication:', error);
          // Don't fail authentication if data loading fails - data might be empty for new users
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      // First authenticate with biometric
      const biometricResult = await AuthService.authenticateWithBiometrics();
      if (!biometricResult.success) {
        return false;
      }

      // Get master password from secure store
      const storedPassword = await AuthService.getMasterPasswordWithBiometric();
      if (!storedPassword) {
        return false;
      }

      // Verify password is still valid
      const user = await getCurrentUser();
      if (!user) {
        return false;
      }

      const isValid = await verifyMasterPassword(user, storedPassword);
      if (isValid) {
        // Store in session
        try {
          await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, storedPassword);
        } catch (secureStoreError: any) {
          // If SecureStore fails, store in memory only
          console.log('Could not store password in SecureStore (using memory only):', secureStoreError?.message);
        }
        setMasterPasswordState(storedPassword);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const setMasterPassword = async (password: string): Promise<void> => {
    // Store master password for biometric unlock
    try {
      // Try to store for biometric (may fail if iOS permission not set, that's OK)
      try {
        await AuthService.storeMasterPasswordForBiometric(password);
      } catch (error) {
        // Don't fail if biometric storage fails - user can still login with password
        console.log('Biometric storage failed (continuing anyway):', error);
      }
      
      // Store in session (try SecureStore, fallback to memory)
      try {
        await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, password);
      } catch (secureStoreError: any) {
        // If SecureStore fails, store in memory only
        console.log('Could not store password in SecureStore (using memory only):', secureStoreError?.message);
      }
      setMasterPasswordState(password);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error storing master password:', error);
      // Don't throw - allow app to continue
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear master password session from SecureStore
      try {
        await SecureStore.deleteItemAsync(MASTER_PASSWORD_KEY);
      } catch (secureStoreError: any) {
        // If SecureStore fails, just clear memory
        console.log('Could not delete from SecureStore (clearing memory only):', secureStoreError?.message);
      }
      
      // Also clear biometric storage
      try {
        await AuthService.clearBiometricStorage();
      } catch (error) {
        console.log('Could not clear biometric storage:', error);
      }
      
      // Clear all state
      setMasterPasswordState(null);
      setIsAuthenticated(false);
      
      // Note: We do NOT clear the current user from AsyncStorage here
      // This allows the user to login again and access their data
      // The user will be cleared by the logoutStorage function in SettingsScreen
      console.log('User logged out - session cleared');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const checkBiometricAvailable = async (): Promise<boolean> => {
    return await AuthService.isBiometricAvailable();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        masterPassword,
        isLoading,
        authenticate,
        authenticateWithBiometric,
        logout,
        setMasterPassword,
        checkBiometricAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

