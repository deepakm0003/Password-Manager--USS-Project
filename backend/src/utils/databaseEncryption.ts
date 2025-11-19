/**
 * Database encryption configuration and utilities
 * 
 * Note: PostgreSQL encryption at rest should be configured at the database level.
 * This file provides utilities for encryption-related operations.
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.DATABASE_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive data before storing in database (if needed)
 * Note: Passwords should be encrypted client-side before sending to backend
 */
export const encryptSensitiveData = (data: string, key?: string): string => {
  if (!key && !ENCRYPTION_KEY) {
    // If no encryption key is set, return data as-is
    // Client-side encryption should handle this
    return data;
  }

  const encryptionKey = key || ENCRYPTION_KEY;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt sensitive data from database (if needed)
 */
export const decryptSensitiveData = (encryptedData: string, key?: string): string => {
  if (!key && !ENCRYPTION_KEY) {
    // If no encryption key is set, return data as-is
    return encryptedData;
  }

  const encryptionKey = key || ENCRYPTION_KEY;
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Generate encryption key for database
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

