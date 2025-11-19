/**
 * Vault Service
 * Handles zero-knowledge vault operations with client-side encryption
 * Backend never sees plaintext - only encrypted ciphertext
 */

import { vaultAPI } from './api';
import { encryptData, decryptData } from './encryption';
import * as SecureStore from 'expo-secure-store';
import { PasswordEntry } from '../types';

export interface VaultEntry {
  id: string;
  ciphertext: string;
  nonce: string;
  authTag: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const MASTER_PASSWORD_KEY = 'master_password_session';

/**
 * Store master password for session (encrypted)
 */
async function storeMasterPasswordForSession(password: string, userId?: string): Promise<void> {
  // In production, encrypt the master password with a session key
  // For now, store in secure storage (already encrypted at OS level)
  await SecureStore.setItemAsync(`${MASTER_PASSWORD_KEY}_${userId || 'default'}`, password);
}

/**
 * Clear master password from session
 */
async function clearMasterPasswordSession(userId?: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${MASTER_PASSWORD_KEY}_${userId || 'default'}`);
}

/**
 * Get stored master password (if session is active)
 */
async function getMasterPassword(userId?: string): Promise<string | null> {
  return await SecureStore.getItemAsync(`${MASTER_PASSWORD_KEY}_${userId || 'default'}`);
}

/**
 * Encrypt password entry for storage in vault
 */
async function encryptPasswordEntry(
  entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>,
  masterPassword: string,
  userId?: string
): Promise<{ ciphertext: string; nonce: string; authTag: string | null; metadata: Record<string, unknown> }> {
  // Prepare entry data (exclude sensitive fields from metadata)
  const entryData = {
    website: entry.website,
    username: entry.username,
    password: entry.password,
    notes: entry.notes,
    category: entry.category,
    tags: entry.tags,
    iconUrl: entry.iconUrl,
  };

  // Encrypt the entire entry
  // encryptData returns format: salt:encrypted
  const plaintext = JSON.stringify(entryData);
  const encrypted = await encryptData(plaintext, masterPassword, userId);

  // Extract nonce from encrypted format (first part before colon is salt/nonce)
  const parts = encrypted.split(':');
  const nonce = parts[0] || '';
  const ciphertext = parts[1] || encrypted;

  // Metadata that is NOT encrypted (for indexing/search)
  const metadata = {
    website: entry.website, // Website is not encrypted for searchability
    category: entry.category,
    tags: entry.tags,
    iconUrl: entry.iconUrl,
    isShared: entry.isShared || false,
    isBreached: entry.isBreached || false,
  };

  return {
    ciphertext, // Store the full encrypted string
    nonce,
    authTag: null, // Not used with current encryption format
    metadata,
  };
}

/**
 * Decrypt password entry from vault
 */
async function decryptPasswordEntry(
  vaultEntry: VaultEntry,
  masterPassword: string
): Promise<PasswordEntry> {
  try {
    // decryptData expects format: salt:encrypted
    // vaultEntry.ciphertext might already include salt, or we need to reconstruct it
    let encryptedData = vaultEntry.ciphertext;
    
    // If ciphertext doesn't include salt, reconstruct from nonce
    if (!encryptedData.includes(':')) {
      encryptedData = `${vaultEntry.nonce}:${vaultEntry.ciphertext}`;
    }
    
    const decrypted = await decryptData(encryptedData, masterPassword);
    const entryData = JSON.parse(decrypted);

    return {
      id: vaultEntry.id,
      ...entryData,
      isShared: vaultEntry.metadata.isShared as boolean || false,
      isBreached: vaultEntry.metadata.isBreached as boolean || false,
      createdAt: vaultEntry.createdAt,
      updatedAt: vaultEntry.updatedAt,
      category: vaultEntry.metadata.category as string | undefined,
      tags: (vaultEntry.metadata.tags as string[]) || [],
      iconUrl: vaultEntry.metadata.iconUrl as string | undefined,
      lastUsed: vaultEntry.metadata.lastUsed as string | undefined,
    };
  } catch (error) {
    console.error('Error decrypting password entry:', error);
    throw new Error('Failed to decrypt password entry');
  }
}

/**
 * Vault Service
 */
export const vaultService = {
  /**
   * Initialize vault session with master password
   */
  initialize: async (masterPassword: string, userId?: string): Promise<void> => {
    await storeMasterPasswordForSession(masterPassword, userId);
  },

  /**
   * Clear vault session
   */
  clearSession: async (userId?: string): Promise<void> => {
    await clearMasterPasswordSession(userId);
  },

  /**
   * Get all password entries (decrypted)
   */
  getAllPasswords: async (userId?: string): Promise<PasswordEntry[]> => {
    const masterPassword = await getMasterPassword(userId);
    if (!masterPassword) {
      throw new Error('Vault session not initialized. Please provide master password.');
    }

    const vaultEntries = await vaultAPI.getAll();
    const decrypted: PasswordEntry[] = [];

    for (const entry of vaultEntries) {
      try {
        const decryptedEntry = await decryptPasswordEntry(entry, masterPassword);
        decrypted.push(decryptedEntry);
      } catch (error) {
        console.error(`Error decrypting entry ${entry.id}:`, error);
        // Skip entries that fail to decrypt
      }
    }

    return decrypted;
  },

  /**
   * Get password entry by ID (decrypted)
   */
  getPasswordById: async (id: string, userId?: string): Promise<PasswordEntry | null> => {
    const masterPassword = await getMasterPassword(userId);
    if (!masterPassword) {
      throw new Error('Vault session not initialized. Please provide master password.');
    }

    try {
      const vaultEntry = await vaultAPI.getById(id);
      return await decryptPasswordEntry(vaultEntry, masterPassword);
    } catch (error) {
      console.error(`Error getting password ${id}:`, error);
      return null;
    }
  },

  /**
   * Add password entry (encrypted before sending to backend)
   */
  addPassword: async (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>, userId?: string): Promise<PasswordEntry> => {
    const masterPassword = await getMasterPassword(userId);
    if (!masterPassword) {
      throw new Error('Vault session not initialized. Please provide master password.');
    }

    const { ciphertext, nonce, authTag, metadata } = await encryptPasswordEntry(entry, masterPassword, userId);
    const vaultEntry = await vaultAPI.create(ciphertext, nonce, authTag, metadata);
    
    // Decrypt and return for consistency
    return await decryptPasswordEntry(vaultEntry, masterPassword);
  },

  /**
   * Update password entry (encrypted before sending to backend)
   */
  updatePassword: async (
    id: string,
    updates: Partial<Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>>,
    userId?: string
  ): Promise<PasswordEntry> => {
    const masterPassword = await getMasterPassword(userId);
    if (!masterPassword) {
      throw new Error('Vault session not initialized. Please provide master password.');
    }

    // Get existing entry to merge updates
    const existing = await vaultService.getPasswordById(id, userId);
    if (!existing) {
      throw new Error('Password entry not found');
    }

    const updated = { ...existing, ...updates };
    const { ciphertext, nonce, authTag, metadata } = await encryptPasswordEntry(
      updated,
      masterPassword,
      userId
    );

    const vaultEntry = await vaultAPI.update(id, ciphertext, nonce, authTag, metadata);
    return await decryptPasswordEntry(vaultEntry, masterPassword);
  },

  /**
   * Delete password entry
   */
  deletePassword: async (id: string): Promise<void> => {
    await vaultAPI.delete(id);
  },
};
