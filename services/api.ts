import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PasswordEntry } from '../types';

/**
 * API Configuration
 * For Android emulator, use: http://10.0.2.2:5000
 * For iOS simulator, use: http://localhost:5000
 * For physical devices (Expo Go), we detect your LAN IP automatically.
 * For production, configure HTTPS endpoint via env/Constants.
 */

const DEFAULT_LAN_IP = '192.168.0.100'; // fallback if detection fails – update to your LAN IP

const resolveDevBaseUrl = (): string => {
  const envBaseUrl =
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL;

  if (typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0) {
    return envBaseUrl.replace(/\/$/, '');
  }

  // Try to detect the LAN IP that Expo is using
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    '';

  const lanHost = debuggerHost.split(':')[0];

  if (lanHost && lanHost !== 'localhost') {
    return `http://${lanHost}:5000`;
  }

  // Platform specific defaults
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000'; // Android emulator
  }

  if (Platform.OS === 'ios') {
    return 'http://localhost:5000'; // iOS simulator
  }

  // Fallback to configurable LAN IP
  return `http://${DEFAULT_LAN_IP}:5000`;
};

const getApiBaseUrl = (): string => {
  if (__DEV__) {
    return resolveDevBaseUrl();
  }

  // Production URL (configure as needed or via env)
  return 'https://your-production-api.com';
};

const API_BASE_URL = getApiBaseUrl();
const API_V1_PREFIX = '/api/v1';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Create axios instance with security configurations
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
  },
  // Security: reject unauthorized SSL certificates in production
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
  // In production, enable SSL certificate validation
  // For development, we allow self-signed certificates
  // https: {
  //   rejectUnauthorized: process.env.NODE_ENV === 'production',
  // },
  maxRedirects: 0, // Prevent redirect attacks
  maxContentLength: 1048576, // 1MB max response size
  maxBodyLength: 1048576, // 1MB max request body
});

// Request interceptor - Add token and security headers
api.interceptors.request.use(
  async (config) => {
    try {
      // Get JWT token from secure storage (Expo SecureStore)
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Note: Don't warn if no token - it's expected for login/register requests
      
      // Add request timestamp and unique ID for replay attack prevention
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}-${Math.random().toString(36).substring(7)}`;
      config.headers['X-Request-ID'] = requestId;
      config.headers['X-Request-Timestamp'] = Date.now().toString();
      
      // Add client platform information
      config.headers['X-Client-Platform'] = Platform.OS;
      config.headers['X-Client-Version'] = '1.0.0';
      
      // Add security headers
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      
      // Log API URL for debugging (only in development)
      if (__DEV__) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url} -> ${config.baseURL}${config.url}`);
      }
    } catch (error) {
      console.error('Error in request interceptor:', error);
      // Don't block request if token retrieval fails
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Log network errors for debugging
    if (!error.response && error.message === 'Network Error') {
      const fullUrl = `${originalRequest?.baseURL || API_BASE_URL}${originalRequest?.url}`;
      console.error('[API] Network Error:', {
        method: originalRequest?.method?.toUpperCase(),
        url: originalRequest?.url,
        fullUrl: fullUrl,
        baseURL: originalRequest?.baseURL || API_BASE_URL,
        platform: Platform.OS,
        message: 'Cannot connect to backend server. Make sure the backend is running on port 5000.',
      });
      
      // Provide helpful error message based on platform
      if (Platform.OS === 'android') {
        console.error('[API] Android: Make sure backend is running and accessible at http://10.0.2.2:5000');
      } else if (Platform.OS === 'ios') {
        console.error('[API] iOS: Make sure backend is running and accessible at http://localhost:5000');
      } else {
        console.error('[API] Web: Make sure backend is running and accessible at http://localhost:5000');
      }
    }

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data;
          await SecureStore.setItemAsync(TOKEN_KEY, token);
          if (newRefreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (
    email: string,
    password: string,
    masterKeySalt: string,
    masterKeyParams: Record<string, unknown>,
    kdfIterations: number = 200000
  ) => {
    const response = await api.post(`${API_V1_PREFIX}/auth/register`, {
      email,
      password,
      masterKeySalt,
      masterKeyParams,
      kdfIterations,
    });
    return response.data;
  },

  login: async (email: string, password: string, deviceId?: string) => {
    const response = await api.post(`${API_V1_PREFIX}/auth/login`, {
      email,
      password,
      deviceId,
    });
    if (response.data.accessToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, response.data.accessToken);
    }
    if (response.data.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
    }
    return response.data;
  },

  refresh: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await api.post(`${API_V1_PREFIX}/auth/refresh`, {
      refreshToken,
    });
    if (response.data.accessToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, response.data.accessToken);
    }
    if (response.data.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.data.refreshToken);
    }
    return response.data;
  },

  logout: async () => {
    try {
      await api.post(`${API_V1_PREFIX}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  },
};

// Device API
export const deviceAPI = {
  register: async (
    name: string,
    publicKey: string,
    fcmTokenCipher?: string,
    keyAlgorithm: 'ed25519' | 'secp256k1' = 'ed25519',
    platform: 'android' | 'ios' | 'web' | 'desktop' = Platform.OS as 'android' | 'ios' | 'web' | 'desktop',
    appVersion?: string
  ) => {
    const response = await api.post(`${API_V1_PREFIX}/devices/register`, {
      name,
      publicKey,
      fcmTokenCipher,
      keyAlgorithm,
      platform,
      appVersion,
    });
    return response.data.device;
  },

  getAll: async () => {
    const response = await api.get(`${API_V1_PREFIX}/devices`);
    return response.data.devices;
  },

  revoke: async (deviceId: string) => {
    await api.delete(`${API_V1_PREFIX}/devices/${deviceId}`);
  },
};

// Vault API (Zero-knowledge)
export const vaultAPI = {
  getAll: async () => {
    const response = await api.get(`${API_V1_PREFIX}/vault`);
    return response.data.entries || [];
  },

  getById: async (id: string) => {
    const response = await api.get(`${API_V1_PREFIX}/vault/${id}`);
    return response.data;
  },

  create: async (ciphertext: string, nonce: string, authTag: string | null, metadata: Record<string, unknown>) => {
    const response = await api.post(`${API_V1_PREFIX}/vault`, {
      ciphertext,
      nonce,
      authTag,
      metadata,
    });
    return response.data.entry;
  },

  update: async (id: string, ciphertext?: string, nonce?: string, authTag?: string | null, metadata?: Record<string, unknown>) => {
    const response = await api.put(`${API_V1_PREFIX}/vault/${id}`, {
      ciphertext,
      nonce,
      authTag,
      metadata,
    });
    return response.data.entry;
  },

  delete: async (id: string) => {
    await api.delete(`${API_V1_PREFIX}/vault/${id}`);
  },
};

// MFA API
export const mfaAPI = {
  request: async (deviceId?: string, payload: Record<string, unknown> = {}) => {
    const response = await api.post(`${API_V1_PREFIX}/mfa/request`, {
      deviceId,
      payload,
    });
    return response.data.request;
  },

  response: async (
    mfaRequestId: string,
    signature: string,
    decision: 'approve' | 'deny',
    timestamp: number
  ) => {
    const response = await api.post(`${API_V1_PREFIX}/mfa/response`, {
      mfaRequestId,
      signature,
      decision,
      timestamp,
    });
    return response.data.request;
  },
};

// Alias API (Email Relay)
export const aliasAPI = {
  getAll: async () => {
    const response = await api.get(`${API_V1_PREFIX}/aliases`);
    return response.data.aliases || [];
  },

  create: async (
    routingMode: 'DIRECT' | 'HMAC_LOOKUP',
    targetCiphertext?: string,
    targetHmac?: string,
    hmacKeyVersion?: number
  ) => {
    const response = await api.post(`${API_V1_PREFIX}/aliases`, {
      routingMode,
      targetCiphertext,
      targetHmac,
      hmacKeyVersion,
    });
    return response.data.alias;
  },

  revoke: async (aliasId: string) => {
    await api.delete(`${API_V1_PREFIX}/aliases/${aliasId}`);
  },
};

// Password API - PostgreSQL backend
export const passwordAPI = {
  getAll: async (): Promise<PasswordEntry[]> => {
    const response = await api.get(`${API_V1_PREFIX}/passwords`);
    const passwords = response.data.passwords || [];
    return passwords.map(mapBackendPassword);
  },

  getById: async (id: string): Promise<PasswordEntry> => {
    const response = await api.get(`${API_V1_PREFIX}/passwords/${id}`);
    return mapBackendPassword(response.data);
  },

  create: async (passwordData: {
    website: string;
    username: string;
    password: string;
    notes?: string;
    category?: string;
    tags?: string[];
    iconUrl?: string;
    isBreached?: boolean;
    isShared?: boolean;
  }): Promise<PasswordEntry> => {
    const response = await api.post(`${API_V1_PREFIX}/passwords`, passwordData);
    return mapBackendPassword(response.data.password);
  },

  update: async (id: string, passwordData: {
    website?: string;
    username?: string;
    password?: string;
    notes?: string;
    category?: string;
    tags?: string[];
    iconUrl?: string;
    isBreached?: boolean;
    isShared?: boolean;
  }): Promise<PasswordEntry> => {
    const response = await api.put(`${API_V1_PREFIX}/passwords/${id}`, passwordData);
    return mapBackendPassword(response.data.password);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${API_V1_PREFIX}/passwords/${id}`);
  },

  updateLastUsed: async (id: string): Promise<void> => {
    // This might need a separate endpoint, for now we'll update the password
    await api.put(`${API_V1_PREFIX}/passwords/${id}`, { lastUsed: new Date().toISOString() });
  },
};

// Helper to map backend response to PasswordEntry
const mapBackendPassword = (backendPassword: any): PasswordEntry => {
  return {
    id: backendPassword.id,
    website: backendPassword.website,
    username: backendPassword.username,
    password: backendPassword.password,
    notes: backendPassword.notes || undefined,
    category: backendPassword.category || undefined,
    tags: backendPassword.tags || [],
    iconUrl: backendPassword.iconUrl || undefined,
    isBreached: backendPassword.isBreached || false,
    isShared: backendPassword.isShared || false,
    lastUsed: backendPassword.lastUsed ? new Date(backendPassword.lastUsed).toISOString() : undefined,
    createdAt: backendPassword.createdAt ? new Date(backendPassword.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: backendPassword.updatedAt ? new Date(backendPassword.updatedAt).toISOString() : new Date().toISOString(),
  };
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data.user;
  },

  updateProfile: async (email?: string, username?: string) => {
    const response = await api.put('/user/profile', { email, username });
    return response.data.user;
  },

  enableBiometric: async (enabled: boolean, deviceId: string) => {
    const response = await api.post('/user/security/biometric', {
      enabled,
      deviceId,
    });
    return response.data.user;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await api.post('/user/security/password', {
      currentPassword,
      newPassword,
    });
  },

  deleteAccount: async (password: string) => {
    await api.delete('/user/delete', {
      data: { password },
    });
  },
};

export default api;

