export interface User {
  id: string;
  username: string;
  email: string;
  accountPasswordHash: string; // Password for login
  masterPasswordHash?: string; // Optional: Separate master password for vault encryption
  biometricEnabled: boolean;
  createdAt: string;
}

export interface PasswordEntry {
  id: string;
  website: string;
  username: string;
  password: string;
  notes?: string;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
  isShared?: boolean;
  sharedWith?: string[];
  isBreached?: boolean;
  iconUrl?: string; // Website favicon/icon URL
}

export interface MFAApproval {
  id: string;
  service: string;
  location: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied';
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  aliasUsed?: string; // Email alias used for this login
}

export interface EmailAlias {
  id: string;
  alias: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  expiresAt?: string;
  // Enhanced features
  autoExpire?: boolean; // Auto-expire after first use
  usedCount?: number; // Number of times alias has been used
  lastUsedAt?: string; // Last time alias received an email
  replyMasking?: boolean; // Enable reply masking
  replyMaskingEnabled?: boolean; // Is reply masking enabled
  emailsReceived?: number; // Total emails received
  loginsViaAlias?: number; // Number of logins using this alias
  trackerDetected?: boolean; // Whether marketing trackers were detected
  trackersBlocked?: number; // Number of trackers blocked
}

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: { fromLogin?: boolean } | undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  MasterPasswordSetup: { username: string; email: string; isFirstTime?: boolean };
  BiometricSetup: { username: string; email: string };
  ForgotUsername: undefined;
  ForgotPassword: undefined;
  Onboarding: { fromLogin?: boolean } | undefined;
};

export type MainTabParamList = {
  Passwords: undefined;
  Generate: undefined;
  MFA: undefined;
  EmailRelay: undefined;
  Settings: undefined;
};

export type PasswordStackParamList = {
  PasswordList: undefined;
  PasswordDetails: { passwordId?: string };
  AddPassword: undefined;
  PasswordShare: { passwordEntry: PasswordEntry };
};

export type MFAScreenParamList = {
  MFAApproval: undefined;
  MFAHistory: undefined;
};

export type EmailRelayStackParamList = {
  EmailAliasList: undefined;
  CreateAlias: undefined;
};

export interface SecurityEvent {
  id: string;
  type: 'login' | 'mfa_approval' | 'mfa_denial' | 'password_shared' | 'alias_created' | 'alias_expired' | 'tracker_blocked';
  title: string;
  description: string;
  timestamp: string;
  location?: string;
  metadata?: Record<string, any>;
}

export interface PrivacyMetrics {
  reusedPasswords: number;
  uniquePasswords: number;
  mfaApprovalsThisWeek: number;
  aliasesUsed: number;
  totalAliases: number;
  digitalHygieneScore: number; // 0-100
  trackersBlocked: number;
  loginsViaAlias: number;
}

export interface DashboardData {
  metrics: PrivacyMetrics;
  events: SecurityEvent[];
  recentEvents: SecurityEvent[]; // Last 10 events
}
