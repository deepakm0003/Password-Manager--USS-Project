/**
 * Push Notification Service
 * Handles FCM push notifications for MFA requests
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const FCM_TOKEN_KEY = 'fcm_token';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationData {
  mfaRequestId: string;
  challenge: string;
  expiresAt: string;
  payload?: Record<string, unknown>;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Register for push notifications and get FCM token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get FCM token (or APNs token on iOS)
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'unified-auth-manager', // From app.json extra.eas.projectId
    });

    const token = tokenData.data;
    
    // Store token securely
    if (token) {
      await SecureStore.setItemAsync(FCM_TOKEN_KEY, token);
    }

    // Configure Android channel for notifications
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('mfa-requests', {
        name: 'MFA Requests',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Get stored FCM token
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(FCM_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Set up notification listeners for MFA requests
 */
export function setupNotificationListeners(
  onNotificationReceived: (data: PushNotificationData) => void,
  onNotificationTapped: (data: PushNotificationData) => void
): () => void {
  // Listener for notifications received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as unknown as PushNotificationData;
    if (data.mfaRequestId) {
      onNotificationReceived(data);
    }
  });

  // Listener for when user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as unknown as PushNotificationData;
    if (data.mfaRequestId) {
      onNotificationTapped(data);
    }
  });

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Schedule a local notification (for testing or fallback)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: PushNotificationData
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

