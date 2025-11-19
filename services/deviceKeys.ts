/**
 * Device Keypair Management
 * Generates and manages Ed25519 keypairs for device authentication and MFA signatures
 */

import * as nacl from 'tweetnacl';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const DEVICE_KEYPAIR_KEY = 'device_keypair';
const DEVICE_PUBLIC_KEY_KEY = 'device_public_key';
const DEVICE_ID_KEY = 'device_id';

export interface DeviceKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyBase64: string;
  secretKeyBase64: string;
}

/**
 * Generate a new Ed25519 keypair for the device
 */
export async function generateDeviceKeypair(): Promise<DeviceKeypair> {
  try {
    const keypair = nacl.sign.keyPair();
    
    const publicKeyBase64 = Buffer.from(keypair.publicKey).toString('base64');
    const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
    
    return {
      publicKey: keypair.publicKey,
      secretKey: keypair.secretKey,
      publicKeyBase64,
      secretKeyBase64,
    };
  } catch (error) {
    console.error('Error generating device keypair:', error);
    throw new Error(`Failed to generate device keypair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get or create device keypair
 * If keypair doesn't exist, generates a new one and stores it securely
 */
export async function getOrCreateDeviceKeypair(): Promise<DeviceKeypair> {
  try {
    // Try to get existing keypair from secure storage
    const storedKeypair = await SecureStore.getItemAsync(DEVICE_KEYPAIR_KEY);
    
    if (storedKeypair) {
      const parsed = JSON.parse(storedKeypair);
      return {
        publicKey: new Uint8Array(Object.values(parsed.publicKey)),
        secretKey: new Uint8Array(Object.values(parsed.secretKey)),
        publicKeyBase64: parsed.publicKeyBase64,
        secretKeyBase64: parsed.secretKeyBase64,
      };
    }
    
    // Generate new keypair if it doesn't exist
    const keypair = await generateDeviceKeypair();
    
    // Store in secure storage
    // Note: In production, the secret key should be encrypted with biometric-derived key
    const storageFormat = {
      publicKey: Array.from(keypair.publicKey),
      secretKey: Array.from(keypair.secretKey),
      publicKeyBase64: keypair.publicKeyBase64,
      secretKeyBase64: keypair.secretKeyBase64,
    };
    
    await SecureStore.setItemAsync(DEVICE_KEYPAIR_KEY, JSON.stringify(storageFormat));
    await SecureStore.setItemAsync(DEVICE_PUBLIC_KEY_KEY, keypair.publicKeyBase64);
    
    return keypair;
  } catch (error) {
    console.error('Error getting/creating device keypair:', error);
    throw error;
  }
}

/**
 * Get device public key (for device registration)
 */
export async function getDevicePublicKey(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_PUBLIC_KEY_KEY);
    if (stored) {
      return stored;
    }
    
    const keypair = await getOrCreateDeviceKeypair();
    return keypair.publicKeyBase64;
  } catch (error) {
    console.error('Error getting device public key:', error);
    throw error;
  }
}

/**
 * Sign data with device private key
 * Requires biometric authentication if enabled
 */
export async function signWithDeviceKey(data: string, requireBiometric: boolean = true): Promise<string> {
  try {
    if (requireBiometric) {
      // Check if biometrics are available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        // Authenticate with biometrics before signing
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to approve MFA request',
          fallbackLabel: 'Use passcode',
          disableDeviceFallback: false,
        });
        
        if (!result.success) {
          throw new Error('Biometric authentication failed');
        }
      }
    }
    
    const keypair = await getOrCreateDeviceKeypair();
    const messageBytes = new TextEncoder().encode(data);
    
    // Sign message with Ed25519
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    
    // Return base64-encoded signature
    return Buffer.from(signature).toString('base64');
  } catch (error) {
    console.error('Error signing with device key:', error);
    throw new Error(`Failed to sign data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get or create device ID
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) {
      return stored;
    }
    
    // Generate UUID-like device ID
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const deviceId = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
    
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch (error) {
    console.error('Error getting/creating device ID:', error);
    throw error;
  }
}

/**
 * Clear device keypair (for logout or device revocation)
 */
export async function clearDeviceKeypair(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_KEYPAIR_KEY);
    await SecureStore.deleteItemAsync(DEVICE_PUBLIC_KEY_KEY);
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  } catch (error) {
    console.error('Error clearing device keypair:', error);
  }
}

