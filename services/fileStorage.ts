import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { PasswordEntry, MFAApproval, EmailAlias, User } from '../types';
import { hashPassword, encryptData, decryptData } from './encryption';

const USER_KEY = '@current_user';
const MASTER_PASSWORD_KEY = '@master_password';
const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';
const THEME_KEY = '@app_theme';

interface AppData {
  users: User[];
  passwords: PasswordEntry[];
  mfaApprovals: MFAApproval[];
  emailAliases: EmailAlias[];
}

// Get user-specific data directory
function getUserDataDirectory(userId: string): string {
  return `${FileSystem.documentDirectory}users/${userId}/`;
}

function getUserDataFile(userId: string): string {
  return `${getUserDataDirectory(userId)}data.json`;
}

// Global users registry (stored separately)
const USERS_REGISTRY_FILE = `${FileSystem.documentDirectory}users_registry.json`;

let appData: AppData = {
  users: [],
  passwords: [],
  mfaApprovals: [],
  emailAliases: [],
};

/**
 * Initialize storage and ensure directories exist
 */
export async function initStorage(): Promise<void> {
  try {
    // Ensure users directory exists
    const usersDir = `${FileSystem.documentDirectory}users/`;
    const dirInfo = await FileSystem.getInfoAsync(usersDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(usersDir, { intermediates: true });
    }

    // Load users registry
    await loadUsersRegistry();
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

/**
 * Load users registry
 */
async function loadUsersRegistry(): Promise<void> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(USERS_REGISTRY_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(USERS_REGISTRY_FILE);
      if (content) {
        const registry = JSON.parse(content);
        appData.users = registry.users || [];
        console.log('Users registry loaded. Total users:', appData.users.length);
      } else {
        console.log('Users registry file is empty');
        appData.users = [];
      }
    } else {
      console.log('Users registry file does not exist yet');
      appData.users = [];
    }
  } catch (error) {
    console.error('Error loading users registry:', error);
    appData.users = [];
  }
}

/**
 * Save users registry
 */
async function saveUsersRegistry(): Promise<void> {
  try {
    const data = JSON.stringify({ users: appData.users }, null, 2);
    await FileSystem.writeAsStringAsync(USERS_REGISTRY_FILE, data);
  } catch (error) {
    console.error('Error saving users registry:', error);
  }
}

/**
 * Load user-specific data (encrypted vault)
 * @param userId - User ID
 * @param masterPassword - Master password for decryption (optional if vault is not encrypted yet)
 */
export async function loadUserData(userId: string, masterPassword?: string): Promise<void> {
  try {
    console.log(`[loadUserData] Loading data for userId: ${userId}, hasMasterPassword: ${!!masterPassword}`);
    const dataFile = getUserDataFile(userId);
    const fileInfo = await FileSystem.getInfoAsync(dataFile);
    
    if (fileInfo.exists) {
      console.log(`[loadUserData] File exists: ${dataFile}`);
      const content = await FileSystem.readAsStringAsync(dataFile);
      console.log(`[loadUserData] File content length: ${content.length}`);
      
      if (content) {
        try {
          // Try to parse as JSON first (for unencrypted data or metadata)
          const userData = JSON.parse(content);
          
          // Check if data is encrypted
          if (userData.encrypted && userData.data) {
            // Data is encrypted - decrypt it
            if (!masterPassword) {
              console.warn('[loadUserData] Encrypted vault found but no master password provided');
              // Initialize empty data if no master password
              appData.passwords = [];
              appData.mfaApprovals = [];
              appData.emailAliases = [];
              return;
            }
            
            try {
              console.log('[loadUserData] Decrypting encrypted vault...');
              const decryptedContent = await decryptData(userData.data, masterPassword);
              const decryptedData = JSON.parse(decryptedContent);
              appData.passwords = decryptedData.passwords || [];
              appData.mfaApprovals = decryptedData.mfaApprovals || [];
              appData.emailAliases = decryptedData.emailAliases || [];
              console.log(`[loadUserData] ✅ Decrypted successfully - Passwords: ${appData.passwords.length}, MFA: ${appData.mfaApprovals.length}, Aliases: ${appData.emailAliases.length}`);
            } catch (decryptError) {
              console.error('[loadUserData] ❌ Error decrypting user data:', decryptError);
              throw new Error('Failed to decrypt vault. Incorrect master password.');
            }
          } else {
            // Legacy unencrypted data - migrate to encrypted
            console.log('[loadUserData] Loading unencrypted data (legacy format)');
            appData.passwords = userData.passwords || [];
            appData.mfaApprovals = userData.mfaApprovals || [];
            appData.emailAliases = userData.emailAliases || [];
            console.log(`[loadUserData] Loaded - Passwords: ${appData.passwords.length}, MFA: ${appData.mfaApprovals.length}, Aliases: ${appData.emailAliases.length}`);
            
            // If master password is available, encrypt and save
            if (masterPassword && (appData.passwords.length > 0 || appData.mfaApprovals.length > 0 || appData.emailAliases.length > 0)) {
              console.log('[loadUserData] Migrating unencrypted data to encrypted format...');
              await saveUserData(userId, masterPassword);
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, data might be in old format
          console.error('[loadUserData] ❌ Error parsing user data:', parseError);
          appData.passwords = [];
          appData.mfaApprovals = [];
          appData.emailAliases = [];
        }
      } else {
        console.log('[loadUserData] File exists but is empty, initializing empty data');
        appData.passwords = [];
        appData.mfaApprovals = [];
        appData.emailAliases = [];
      }
    } else {
      // Initialize empty data
      console.log(`[loadUserData] File does not exist, initializing empty data`);
      appData.passwords = [];
      appData.mfaApprovals = [];
      appData.emailAliases = [];
    }
  } catch (error) {
    console.error('[loadUserData] ❌ Error loading user data:', error);
    appData.passwords = [];
    appData.mfaApprovals = [];
    appData.emailAliases = [];
  }
}

/**
 * Save user-specific data (encrypted vault)
 * @param userId - User ID
 * @param masterPassword - Master password for encryption (optional - if not provided, saves unencrypted)
 */
async function saveUserData(userId: string, masterPassword?: string): Promise<void> {
  try {
    console.log(`[saveUserData] Starting save for userId: ${userId}, hasMasterPassword: ${!!masterPassword}`);
    console.log(`[saveUserData] Current data - Passwords: ${appData.passwords.length}, MFA: ${appData.mfaApprovals.length}, Aliases: ${appData.emailAliases.length}`);
    
    // Ensure user directory exists
    const userDir = getUserDataDirectory(userId);
    const dirInfo = await FileSystem.getInfoAsync(userDir);
    if (!dirInfo.exists) {
      console.log(`[saveUserData] Creating user directory: ${userDir}`);
      await FileSystem.makeDirectoryAsync(userDir, { intermediates: true });
    }

    const dataFile = getUserDataFile(userId);
    const data = {
      passwords: appData.passwords,
      mfaApprovals: appData.mfaApprovals,
      emailAliases: appData.emailAliases,
    };
    
    console.log(`[saveUserData] Data to save - Passwords: ${data.passwords.length}, MFA: ${data.mfaApprovals.length}, Aliases: ${data.emailAliases.length}`);
    
    // If master password is provided, always encrypt (even if vault is empty)
    // This ensures the vault is properly initialized as encrypted
    if (masterPassword) {
      try {
        console.log(`[saveUserData] Encrypting data with master password...`);
        const dataString = JSON.stringify(data);
        console.log(`[saveUserData] Data string length: ${dataString.length}`);
        
        const encryptedData = await encryptData(dataString, masterPassword, userId);
        console.log(`[saveUserData] Encryption successful, encrypted data length: ${encryptedData.length}`);
        
        // Store as encrypted vault
        const vaultData = {
          encrypted: true,
          data: encryptedData,
          version: '1.0',
          updatedAt: new Date().toISOString(),
        };
        
        const vaultDataString = JSON.stringify(vaultData, null, 2);
        console.log(`[saveUserData] Writing to file: ${dataFile}`);
        await FileSystem.writeAsStringAsync(dataFile, vaultDataString);
        
        // Verify the file was written
        const verifyInfo = await FileSystem.getInfoAsync(dataFile);
        if (verifyInfo.exists) {
          const verifyContent = await FileSystem.readAsStringAsync(dataFile);
          if (verifyContent && verifyContent.length > 0) {
            console.log(`[saveUserData] ✅ Vault encrypted and saved successfully. File size: ${verifyContent.length} bytes`);
          } else {
            console.error(`[saveUserData] ❌ File exists but is empty!`);
            throw new Error('File was written but is empty');
          }
        } else {
          console.error(`[saveUserData] ❌ File does not exist after write!`);
          throw new Error('File was not created');
        }
      } catch (encryptError) {
        console.error('[saveUserData] ❌ Error encrypting user data:', encryptError);
        // Don't fallback - throw error so user knows encryption failed
        throw new Error(`Failed to encrypt vault: ${encryptError instanceof Error ? encryptError.message : 'Unknown error'}`);
      }
    } else {
      // No master password - store unencrypted (for initial setup only)
      // This should only happen before master password is set
      console.log(`[saveUserData] Saving unencrypted data (no master password set)`);
      const dataString = JSON.stringify(data, null, 2);
      await FileSystem.writeAsStringAsync(dataFile, dataString);
      
      // Verify the file was written
      const verifyInfo = await FileSystem.getInfoAsync(dataFile);
      if (verifyInfo.exists) {
        console.log(`[saveUserData] ✅ Vault saved unencrypted (no master password set). File exists.`);
      } else {
        console.error(`[saveUserData] ❌ File does not exist after write!`);
        throw new Error('File was not created');
      }
    }
  } catch (error) {
    console.error('[saveUserData] ❌ Error saving user data:', error);
    throw error;
  }
}

/**
 * Get current user ID
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (!userStr) return null;
    const user = JSON.parse(userStr) as User;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * User Management
 */
/**
 * Create a new user account
 * @param username - Username for login
 * @param email - Email address
 * @param accountPassword - Password for account login (different from master password)
 * @returns Created user object
 */
export async function createUser(
  username: string,
  email: string,
  accountPassword: string
): Promise<User> {
  await initStorage();

  // Check if user already exists
  const existingUser = appData.users.find(u => u.username === username || u.email === email);
  if (existingUser) {
    throw new Error('Username or email already exists');
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const accountPasswordHash = await hashPassword(accountPassword);
  const createdAt = new Date().toISOString();

  const user: User = {
    id,
    username,
    email,
    accountPasswordHash: accountPasswordHash,
    masterPasswordHash: undefined, // Master password will be set separately
    biometricEnabled: false,
    createdAt,
  };

  appData.users.push(user);
  await saveUsersRegistry();
  console.log('User created and saved to registry. User ID:', id);
  
  // Create user data directory and initialize empty data (unencrypted until master password is set)
  try {
    await loadUserData(id);
    await saveUserData(id); // Save without encryption initially
    console.log('User data directory initialized');
  } catch (error) {
    console.error('Error initializing user data directory:', error);
    // Don't fail user creation if data directory init fails
  }
  
  // Set user in AsyncStorage
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  console.log('User set in AsyncStorage');

  return user;
}

/**
 * Set master password for vault encryption
 * @param userId - User ID
 * @param masterPassword - Master password for vault encryption
 */
export async function setMasterPassword(userId: string, masterPassword: string): Promise<void> {
  try {
    await initStorage();
    console.log('Setting master password for userId:', userId);
    console.log('Total users in registry:', appData.users.length);
    
    // Reload users registry to ensure we have the latest data
    await loadUsersRegistry();
    
    // Find user
    const user = appData.users.find(u => u.id === userId);
    if (!user) {
      console.error('User not found in registry. Available users:', appData.users.map(u => ({ id: u.id, username: u.username })));
      throw new Error(`User not found. UserId: ${userId}`);
    }
    
    console.log('Found user:', user.username);
    
    // Hash master password
    console.log('Hashing master password...');
    const masterPasswordHash = await hashPassword(masterPassword);
    user.masterPasswordHash = masterPasswordHash;
    console.log('Master password hashed successfully');
    
    // Save updated user registry
    console.log('Saving users registry...');
    await saveUsersRegistry();
    console.log('Users registry saved');
    
    // Load current user data (might be unencrypted or empty)
    console.log('Loading user data...');
    await loadUserData(userId); // Load without master password (for unencrypted data)
    console.log('User data loaded. Passwords:', appData.passwords.length, 'MFA:', appData.mfaApprovals.length, 'Aliases:', appData.emailAliases.length);
    
    // Encrypt and save vault data with master password
    console.log('Encrypting and saving user data...');
    await saveUserData(userId, masterPassword);
    console.log('User data encrypted and saved');
    
    // Update current user in AsyncStorage if this is the current user
    try {
      const currentUserStr = await AsyncStorage.getItem(USER_KEY);
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr) as User;
        if (currentUser.id === userId) {
          // Update the user object with master password hash
          const updatedUser: User = {
            ...currentUser,
            masterPasswordHash: masterPasswordHash,
          };
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
          console.log('Current user updated in AsyncStorage');
        }
      }
    } catch (error) {
      console.error('Error updating current user in AsyncStorage:', error);
      // Don't throw - the registry is updated, which is the source of truth
    }
    
    console.log('Master password set successfully for user:', user.username);
  } catch (error) {
    console.error('Error in setMasterPassword:', error);
    throw error;
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  await initStorage();
  const user = appData.users.find(u => u.username === username || u.email === username);
  return user || null;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const userStr = await AsyncStorage.getItem(USER_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * Verify account password (for login)
 */
export async function verifyAccountPassword(
  user: User,
  password: string
): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === user.accountPasswordHash;
}

/**
 * Verify master password (for vault decryption)
 */
export async function verifyMasterPassword(
  user: User,
  masterPassword: string
): Promise<boolean> {
  if (!user.masterPasswordHash) {
    return false; // Master password not set
  }
  const hash = await hashPassword(masterPassword);
  return hash === user.masterPasswordHash;
}

/**
 * Change master password (re-encrypts vault with new password)
 */
export async function changeMasterPassword(
  userId: string,
  oldMasterPassword: string,
  newMasterPassword: string
): Promise<void> {
  await initStorage();
  
  // Find user
  const user = appData.users.find(u => u.id === userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify old master password
  const isValid = await verifyMasterPassword(user, oldMasterPassword);
  if (!isValid) {
    throw new Error('Current master password is incorrect');
  }
  
  // Load and decrypt vault with old master password
  await loadUserData(userId, oldMasterPassword);
  
  // Update master password hash
  const newHash = await hashPassword(newMasterPassword);
  user.masterPasswordHash = newHash;
  
  // Re-encrypt vault with new master password
  await saveUserData(userId, newMasterPassword);
  
  // Save updated user registry
  await saveUsersRegistry();
  
  // Update current user in AsyncStorage if this is the current user
  try {
    const currentUserStr = await AsyncStorage.getItem(USER_KEY);
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr) as User;
      if (currentUser.id === userId) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    }
  } catch (error) {
    console.error('Error updating current user in AsyncStorage:', error);
  }
  
  console.log('Master password changed successfully for user:', user.username);
}

/**
 * Change account password (for login)
 */
export async function changeAccountPassword(
  userId: string,
  oldAccountPassword: string,
  newAccountPassword: string
): Promise<void> {
  await initStorage();
  
  // Find user
  const user = appData.users.find(u => u.id === userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify old account password
  const isValid = await verifyAccountPassword(user, oldAccountPassword);
  if (!isValid) {
    throw new Error('Current account password is incorrect');
  }
  
  // Update account password hash
  const newHash = await hashPassword(newAccountPassword);
  user.accountPasswordHash = newHash;
  
  // Save updated user registry
  await saveUsersRegistry();
  
  // Update current user in AsyncStorage if this is the current user
  try {
    const currentUserStr = await AsyncStorage.getItem(USER_KEY);
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr) as User;
      if (currentUser.id === userId) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    }
  } catch (error) {
    console.error('Error updating current user in AsyncStorage:', error);
  }
  
  console.log('Account password changed successfully for user:', user.username);
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
  const user = await getCurrentUser();
  if (user) {
    await initStorage();
    const index = appData.users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      appData.users[index].biometricEnabled = enabled;
      await saveUsersRegistry();
    }
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  // Store onboarding status per user
  const userId = await getCurrentUserId();
  if (userId) {
    await AsyncStorage.setItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`, 'true');
  } else {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  }
}

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const completed = await AsyncStorage.getItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`);
      return completed === 'true';
    } else {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      return completed === 'true';
    }
  } catch {
    return false;
  }
}

/**
 * Password Management
 */
export async function savePassword(
  entry: Partial<PasswordEntry> & { website: string; username: string; password: string },
  masterPassword: string
): Promise<PasswordEntry> {
  try {
    console.log('[savePassword] Starting save password operation');
    await initStorage();
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('[savePassword] ❌ User not logged in');
      throw new Error('User not logged in');
    }

    console.log(`[savePassword] User ID: ${userId}`);
    console.log(`[savePassword] Entry data:`, { website: entry.website, username: entry.username, hasPassword: !!entry.password, hasId: !!(entry as any).id });

    // Load user data with master password for decryption
    console.log('[savePassword] Loading user data...');
    await loadUserData(userId, masterPassword);
    console.log(`[savePassword] Loaded data - Passwords: ${appData.passwords.length}, MFA: ${appData.mfaApprovals.length}, Aliases: ${appData.emailAliases.length}`);

    const id = (entry as any).id || `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const existingEntry = (entry as any).id ? appData.passwords.find(p => p.id === id) : null;
    const passwordEntry: PasswordEntry = {
      id,
      website: entry.website,
      username: entry.username,
      password: entry.password,
      notes: entry.notes,
      lastUsed: entry.lastUsed,
      category: entry.category,
      tags: entry.tags,
      isBreached: entry.isBreached,
      isShared: entry.isShared,
      sharedWith: entry.sharedWith,
      iconUrl: entry.iconUrl,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
    };

    console.log(`[savePassword] Password entry prepared:`, { id, website: passwordEntry.website, username: passwordEntry.username });

    const index = appData.passwords.findIndex(p => p.id === id);
    if (index !== -1) {
      console.log(`[savePassword] Updating existing password at index ${index}`);
      appData.passwords[index] = passwordEntry;
    } else {
      console.log(`[savePassword] Adding new password entry`);
      appData.passwords.push(passwordEntry);
    }

    console.log(`[savePassword] After update - Passwords in memory: ${appData.passwords.length}`);

    // Save encrypted with master password
    console.log('[savePassword] Saving user data to file...');
    await saveUserData(userId, masterPassword);
    
    // Verify the file was written (don't reload data as it might cause issues)
    const dataFile = getUserDataFile(userId);
    const verifyInfo = await FileSystem.getInfoAsync(dataFile);
    if (verifyInfo.exists) {
      console.log(`[savePassword] ✅ Password saved successfully! File verified.`);
    } else {
      console.error(`[savePassword] ❌ File does not exist after save!`);
      throw new Error('Password was not saved - file not found');
    }
    
    return passwordEntry;
  } catch (error) {
    console.error('[savePassword] ❌ Error saving password:', error);
    throw error;
  }
}

export async function getPassword(
  passwordId: string,
  masterPassword: string
): Promise<PasswordEntry | null> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return null;

  // Load user data with master password for decryption
  await loadUserData(userId, masterPassword);
  const password = appData.passwords.find(p => p.id === passwordId);
  return password || null;
}

export async function getAllPasswords(masterPassword: string): Promise<PasswordEntry[]> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  // Load user data with master password for decryption
  await loadUserData(userId, masterPassword);
  return appData.passwords;
}

export async function deletePassword(passwordId: string, masterPassword: string): Promise<void> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');

  // Load user data with master password for decryption
  await loadUserData(userId, masterPassword);
  appData.passwords = appData.passwords.filter(p => p.id !== passwordId);
  // Save encrypted with master password
  await saveUserData(userId, masterPassword);
}

export async function updatePasswordLastUsed(passwordId: string, masterPassword?: string): Promise<void> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return;

  await loadUserData(userId, masterPassword);
  const index = appData.passwords.findIndex(p => p.id === passwordId);
  if (index !== -1) {
    appData.passwords[index].lastUsed = new Date().toISOString();
    await saveUserData(userId, masterPassword);
  }
}

/**
 * MFA Management
 */
export async function createMFAApproval(
  service: string,
  location: string,
  deviceInfo?: string
): Promise<MFAApproval> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');

  await loadUserData(userId);

  const id = `mfa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  const approval: MFAApproval = {
    id,
    service,
    location,
    timestamp,
    status: 'pending',
    deviceInfo,
  };

  appData.mfaApprovals.push(approval);
  await saveUserData(userId);
  return approval;
}

export async function getPendingMFAApprovals(): Promise<MFAApproval[]> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  await loadUserData(userId);
  return appData.mfaApprovals.filter(a => a.status === 'pending');
}

export async function getAllMFAApprovals(): Promise<MFAApproval[]> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  await loadUserData(userId);
  return appData.mfaApprovals.slice(-50);
}

export async function updateMFAApprovalStatus(
  approvalId: string,
  status: 'approved' | 'denied'
): Promise<void> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');

  await loadUserData(userId);
  const index = appData.mfaApprovals.findIndex(a => a.id === approvalId);
  if (index !== -1) {
    appData.mfaApprovals[index].status = status;
    await saveUserData(userId);
  }
}

/**
 * Email Alias Management
 */
export async function createEmailAlias(options?: {
  autoExpire?: boolean;
  expiresInDays?: number;
  replyMasking?: boolean;
}): Promise<EmailAlias> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');

  await loadUserData(userId);

  const id = `alias_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const alias = `alias-${id.substring(0, 8)}@relay.com`;
  const createdAt = new Date().toISOString();
  const expiresInDays = options?.expiresInDays || 90;
  const expiresAt = options?.autoExpire 
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Auto-expire in 24 hours if enabled
    : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const emailAlias: EmailAlias = {
    id,
    alias,
    status: 'active',
    createdAt,
    expiresAt,
    autoExpire: options?.autoExpire || false,
    usedCount: 0,
    replyMasking: options?.replyMasking || false,
    replyMaskingEnabled: options?.replyMasking || false,
    emailsReceived: 0,
    loginsViaAlias: 0,
    trackerDetected: false,
    trackersBlocked: 0,
  };

  appData.emailAliases.push(emailAlias);
  await saveUserData(userId);
  return emailAlias;
}

export async function recordEmailAliasUsage(aliasId: string, type: 'email' | 'login'): Promise<void> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return;

  await loadUserData(userId);
  const alias = appData.emailAliases.find(a => a.id === aliasId);
  if (!alias) return;

  alias.usedCount = (alias.usedCount || 0) + 1;
  alias.lastUsedAt = new Date().toISOString();
  
  if (type === 'email') {
    alias.emailsReceived = (alias.emailsReceived || 0) + 1;
  } else if (type === 'login') {
    alias.loginsViaAlias = (alias.loginsViaAlias || 0) + 1;
  }

  // Auto-expire if enabled and used
  if (alias.autoExpire && alias.usedCount > 0) {
    alias.status = 'expired';
    alias.expiresAt = new Date().toISOString();
  }

  await saveUserData(userId);
}

export async function recordTrackerBlocked(aliasId: string, count: number = 1): Promise<void> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return;

  await loadUserData(userId);
  const alias = appData.emailAliases.find(a => a.id === aliasId);
  if (!alias) return;

  alias.trackerDetected = true;
  alias.trackersBlocked = (alias.trackersBlocked || 0) + count;
  await saveUserData(userId);
}

export async function getAllEmailAliases(): Promise<EmailAlias[]> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  await loadUserData(userId);

  // Check expiration
  const now = new Date();
  let updated = false;
  appData.emailAliases.forEach(alias => {
    if (alias.expiresAt && new Date(alias.expiresAt) < now && alias.status === 'active') {
      alias.status = 'expired';
      updated = true;
    }
  });
  
  if (updated) {
    await saveUserData(userId);
  }

  return appData.emailAliases;
}

export async function updateEmailAliasStatus(
  aliasId: string,
  status: 'active' | 'inactive'
): Promise<void> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');

  await loadUserData(userId);
  const index = appData.emailAliases.findIndex(a => a.id === aliasId);
  if (index !== -1) {
    appData.emailAliases[index].status = status;
    await saveUserData(userId);
  }
}

export async function deleteEmailAlias(aliasId: string): Promise<void> {
  await initStorage();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');

  await loadUserData(userId);
  appData.emailAliases = appData.emailAliases.filter(a => a.id !== aliasId);
  await saveUserData(userId);
}

/**
 * Logout and cleanup
 */
export async function logout(): Promise<void> {
  try {
    // Clear current user session from AsyncStorage
    // This logs out the user but keeps their data files intact
    await AsyncStorage.removeItem(USER_KEY);
    
    // Clear in-memory data (user data files remain on disk)
    appData.passwords = [];
    appData.mfaApprovals = [];
    appData.emailAliases = [];
  
    console.log('User logged out. User data files are preserved for next login.');
  } catch (error) {
    console.error('Error during logout:', error);
    // Don't throw - allow logout to complete even if there's an error
  }
}

/**
 * Theme Management
 */
export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  error: string;
  success: string;
}

export const defaultThemes: Theme[] = [
  {
    name: 'Default Blue',
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    accent: '#10b981',
    error: '#ef4444',
    success: '#22c55e',
  },
  {
    name: 'Dark Mode',
    primary: '#818cf8',
    secondary: '#a78bfa',
    background: '#1f2937',
    surface: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    accent: '#34d399',
    error: '#f87171',
    success: '#4ade80',
  },
  {
    name: 'Purple',
    primary: '#a855f7',
    secondary: '#c084fc',
    background: '#ffffff',
    surface: '#faf5ff',
    text: '#111827',
    textSecondary: '#6b7280',
    accent: '#ec4899',
    error: '#ef4444',
    success: '#22c55e',
  },
  {
    name: 'Green',
    primary: '#10b981',
    secondary: '#34d399',
    background: '#ffffff',
    surface: '#f0fdf4',
    text: '#111827',
    textSecondary: '#6b7280',
    accent: '#059669',
    error: '#ef4444',
    success: '#22c55e',
  },
];

export async function getTheme(): Promise<Theme> {
  try {
    const userId = await getCurrentUserId();
    const themeKey = userId ? `${THEME_KEY}_${userId}` : THEME_KEY;
    const themeStr = await AsyncStorage.getItem(themeKey);
    if (themeStr) {
      return JSON.parse(themeStr);
    }
  } catch (error) {
    console.error('Error loading theme:', error);
  }
  return defaultThemes[0];
}

export async function setTheme(theme: Theme): Promise<void> {
  const userId = await getCurrentUserId();
  const themeKey = userId ? `${THEME_KEY}_${userId}` : THEME_KEY;
  await AsyncStorage.setItem(themeKey, JSON.stringify(theme));
}
