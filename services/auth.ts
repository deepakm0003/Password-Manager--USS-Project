import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getCurrentUser, verifyMasterPassword } from './fileStorage';

const BIOMETRIC_KEY = 'biometric_credentials';

/**
 * Check if biometric authentication is available on the device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Get available biometric types
 */
export async function getSupportedBiometrics(): Promise<LocalAuthentication.AuthenticationType[]> {
  try {
    return await LocalAuthentication.supportedAuthenticationTypesAsync();
  } catch (error) {
    console.error('Error getting supported biometrics:', error);
    return [];
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access your vault',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'An error occurred during authentication',
    };
  }
}

/**
 * Store master password securely (for biometric unlock)
 * Note: In production, this should use hardware-backed keystore
 */
export async function storeMasterPasswordForBiometric(
  masterPassword: string
): Promise<void> {
  try {
    // Try with authentication first, fallback without if iOS permission not set
    try {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, masterPassword, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to store your credentials',
      });
    } catch (authError: any) {
      // If authentication requirement fails, store without it
      // This can happen if NSFaceIDUsageDescription is not set
      if (authError?.message?.includes('NSFaceIDUsageDescription')) {
        console.log('Storing password without authentication requirement (iOS permission not set)');
        await SecureStore.setItemAsync(BIOMETRIC_KEY, masterPassword);
      } else {
        throw authError;
      }
    }
  } catch (error) {
    console.error('Error storing master password:', error);
    // Don't throw - allow app to continue without biometric storage
    // User can still use password login
  }
}

/**
 * Retrieve master password using biometric authentication
 */
export async function getMasterPasswordWithBiometric(): Promise<string | null> {
  try {
    const authenticated = await authenticateWithBiometrics();
    if (!authenticated.success) {
      return null;
    }

    // Try with authentication first, fallback without if needed
    try {
      const password = await SecureStore.getItemAsync(BIOMETRIC_KEY, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access your vault',
      });
      return password;
    } catch (authError: any) {
      // If authentication requirement fails, try without it
      if (authError?.message?.includes('NSFaceIDUsageDescription')) {
        console.log('Retrieving password without authentication requirement');
        const password = await SecureStore.getItemAsync(BIOMETRIC_KEY);
        return password;
      } else {
        throw authError;
      }
    }
  } catch (error) {
    console.error('Error retrieving master password:', error);
    return null;
  }
}

/**
 * Clear stored biometric credentials
 */
export async function clearBiometricStorage(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    console.log('Biometric storage cleared');
  } catch (error) {
    console.error('Error clearing biometric storage:', error);
    // Don't throw - it's OK if this fails
  }
}

/**
 * @deprecated Use clearBiometricStorage instead
 */
export async function clearBiometricCredentials(): Promise<void> {
  return clearBiometricStorage();
}
