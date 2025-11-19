import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PasswordEntry } from '../types';
import { encryptData } from './encryption';

/**
 * Password Sharing Service
 * Handles secure password sharing with other users
 */

export interface ShareLink {
  id: string;
  passwordId: string;
  token: string;
  expiresAt: Date;
  accessCount: number;
  maxAccess: number;
  isActive: boolean;
}

/**
 * Generate a secure sharing link for a password
 */
export async function generateShareLink(
  passwordEntry: PasswordEntry,
  masterPassword: string,
  expiresInHours: number = 24,
  maxAccess: number = 1
): Promise<ShareLink> {
  // Encrypt the password entry
  const encryptedData = await encryptData(JSON.stringify(passwordEntry), masterPassword);
  
  // Generate a unique token
  const token = generateToken();
  
  // Create share link
  const shareLink: ShareLink = {
    id: Date.now().toString(),
    passwordId: passwordEntry.id,
    token,
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    accessCount: 0,
    maxAccess,
    isActive: true,
  };
  
  // Store the share link (in a real app, this would be stored in the backend)
  await storeShareLink(shareLink, encryptedData);
  
  return shareLink;
}

/**
 * Generate a secure token
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Store share link (mock implementation)
 */
async function storeShareLink(shareLink: ShareLink, encryptedData: string): Promise<void> {
  try {
    // In a real app, this would be stored in the backend
    // For now, we'll store it in AsyncStorage
    const shareLinksStr = await AsyncStorage.getItem('@share_links');
    const shareLinks = shareLinksStr ? JSON.parse(shareLinksStr) : {};
    shareLinks[shareLink.id] = { ...shareLink, encryptedData };
    await AsyncStorage.setItem('@share_links', JSON.stringify(shareLinks));
  } catch (error) {
    console.error('Error storing share link:', error);
  }
}

/**
 * Get share links (mock implementation)
 */
async function getShareLinks(): Promise<Record<string, any>> {
  try {
    // In a real app, this would be fetched from the backend
    const shareLinksStr = await AsyncStorage.getItem('@share_links');
    return shareLinksStr ? JSON.parse(shareLinksStr) : {};
  } catch (error) {
    console.error('Error getting share links:', error);
    return {};
  }
}

/**
 * Copy share link to clipboard
 */
export async function copyShareLink(shareLink: ShareLink): Promise<void> {
  const shareUrl = `https://unifiedauth.app/share/${shareLink.token}`;
  await Clipboard.setStringAsync(shareUrl);
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(shareLinkId: string): Promise<void> {
  try {
    // In a real app, this would be revoked in the backend
    const shareLinksStr = await AsyncStorage.getItem('@share_links');
    if (shareLinksStr) {
      const shareLinks = JSON.parse(shareLinksStr);
      delete shareLinks[shareLinkId];
      await AsyncStorage.setItem('@share_links', JSON.stringify(shareLinks));
    }
  } catch (error) {
    console.error('Error revoking share link:', error);
  }
}

/**
 * Check if a password has been shared
 */
export async function isPasswordShared(passwordId: string): Promise<boolean> {
  try {
    // In a real app, this would check the backend
    const shareLinks = await getShareLinks();
    return Object.values(shareLinks).some((link: any) => 
      link.passwordId === passwordId && link.isActive
    );
  } catch (error) {
    console.error('Error checking if password is shared:', error);
    return false;
  }
}

/**
 * Get share link for a password
 */
export async function getShareLinkForPassword(passwordId: string): Promise<ShareLink | null> {
  try {
    const shareLinks = await getShareLinks();
    const linkEntry = Object.values(shareLinks).find((link: any) => 
      link.passwordId === passwordId && link.isActive
    );
    return linkEntry ? linkEntry as ShareLink : null;
  } catch (error) {
    console.error('Error getting share link:', error);
    return null;
  }
}

