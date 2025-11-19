/**
 * MFA Service
 * Handles MFA request approval with device signature verification
 */

import { mfaAPI, deviceAPI } from './api';
import { getDevicePublicKey, signWithDeviceKey } from './deviceKeys';
import { setupNotificationListeners, registerForPushNotifications, getFCMToken } from './pushNotifications';
import { encryptData } from './encryption';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEVICE_ID_KEY = 'device_id_registered';

export interface MfaRequest {
  id: string;
  userId: string;
  deviceId: string | null;
  challenge: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MfaRequestPayload {
  ip?: string;
  app?: string;
  action?: string;
  source?: string;
  [key: string]: unknown;
}

/**
 * Register device with backend (called after login/registration)
 */
export async function registerDevice(
  deviceName: string,
  fcmToken?: string
): Promise<{ deviceId: string; publicKey: string }> {
  try {
    // Get or generate device keypair
    const publicKey = await getDevicePublicKey();
    
    // Encrypt FCM token if provided
    const fcmTokenCipher = fcmToken ? await encryptFCMToken(fcmToken) : undefined;
    
    // Get app version
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    
    // Register device with backend
    const device = await deviceAPI.register(
      deviceName,
      publicKey,
      fcmTokenCipher,
      'ed25519',
      Platform.OS as 'android' | 'ios' | 'web' | 'desktop',
      appVersion
    );

    // Store device ID
    await SecureStore.setItemAsync(DEVICE_ID_KEY, device.id);

    return {
      deviceId: device.id,
      publicKey,
    };
  } catch (error) {
    console.error('Error registering device:', error);
    throw new Error(`Failed to register device: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get registered device ID
 */
export async function getRegisteredDeviceId(): Promise<string | null> {
  return await SecureStore.getItemAsync(DEVICE_ID_KEY);
}

/**
 * Encrypt FCM token before sending to backend
 */
async function encryptFCMToken(token: string): Promise<string> {
  // Use a simple encryption key derived from device ID
  // In production, use a proper encryption key
  const deviceId = await getRegisteredDeviceId();
  const key = deviceId || 'default-encryption-key';
  
  // Simple XOR encryption for demo (use proper encryption in production)
  return await encryptData(token, key);
}

/**
 * Create MFA request (for testing or manual triggers)
 */
export async function createMfaRequest(
  deviceId: string,
  payload: MfaRequestPayload = {}
): Promise<MfaRequest> {
  try {
    const request = await mfaAPI.request(deviceId, payload);
    return request;
  } catch (error) {
    console.error('Error creating MFA request:', error);
    throw new Error(`Failed to create MFA request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Approve MFA request with device signature
 */
export async function approveMfaRequest(
  mfaRequestId: string,
  challenge: string,
  requireBiometric: boolean = true
): Promise<MfaRequest> {
  try {
    const timestamp = Date.now();
    
    // Prepare payload to sign
    const payloadToSign = JSON.stringify({
      id: mfaRequestId,
      challenge,
      decision: 'approve',
      timestamp,
    });

    // Sign with device private key (requires biometric if enabled)
    const signature = await signWithDeviceKey(payloadToSign, requireBiometric);

    // Send signed response to backend
    const request = await mfaAPI.response(mfaRequestId, signature, 'approve', timestamp);
    return request;
  } catch (error) {
    console.error('Error approving MFA request:', error);
    throw new Error(`Failed to approve MFA request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deny MFA request with device signature
 */
export async function denyMfaRequest(
  mfaRequestId: string,
  challenge: string,
  requireBiometric: boolean = true
): Promise<MfaRequest> {
  try {
    const timestamp = Date.now();
    
    // Prepare payload to sign
    const payloadToSign = JSON.stringify({
      id: mfaRequestId,
      challenge,
      decision: 'deny',
      timestamp,
    });

    // Sign with device private key
    const signature = await signWithDeviceKey(payloadToSign, requireBiometric);

    // Send signed response to backend
    const request = await mfaAPI.response(mfaRequestId, signature, 'deny', timestamp);
    return request;
  } catch (error) {
    console.error('Error denying MFA request:', error);
    throw new Error(`Failed to deny MFA request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Set up MFA notification handlers
 */
export function setupMfaNotificationHandlers(
  onMfaRequestReceived: (request: MfaRequest) => void,
  onMfaRequestTapped: (request: MfaRequest) => void
): () => void {
  return setupNotificationListeners(
    (data) => {
      // Convert push notification data to MfaRequest
      const request: MfaRequest = {
        id: data.mfaRequestId,
        userId: '',
        deviceId: null,
        challenge: data.challenge,
        payload: data.payload || {},
        status: 'PENDING',
        expiresAt: data.expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onMfaRequestReceived(request);
    },
    (data) => {
      const request: MfaRequest = {
        id: data.mfaRequestId,
        userId: '',
        deviceId: null,
        challenge: data.challenge,
        payload: data.payload || {},
        status: 'PENDING',
        expiresAt: data.expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onMfaRequestTapped(request);
    }
  );
}

/**
 * Initialize MFA service (register for push notifications)
 */
export async function initializeMfaService(deviceName: string): Promise<void> {
  try {
    // Register for push notifications
    const fcmToken = await registerForPushNotifications();
    
    if (fcmToken) {
      // Register device with backend if not already registered
      const deviceId = await getRegisteredDeviceId();
      if (!deviceId) {
        await registerDevice(deviceName, fcmToken);
      }
    }
  } catch (error) {
    console.error('Error initializing MFA service:', error);
    // Don't throw - MFA service can work without push notifications
  }
}

