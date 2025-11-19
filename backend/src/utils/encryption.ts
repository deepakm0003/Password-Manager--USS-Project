/**
 * Database Encryption Utilities
 * Encrypts sensitive data before storing in database
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derive encryption key from master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha512');
}

/**
 * Encrypt sensitive data
 */
export function encryptData(plaintext: string, masterKey?: string): string {
  if (!plaintext) {
    return plaintext;
  }

  try {
    // Use master key if provided, otherwise use default encryption key
    const key = masterKey ? masterKey : ENCRYPTION_KEY;

    // Generate salt
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive encryption key
    const derivedKey = masterKey ? deriveKey(key, salt) : Buffer.from(key, 'hex').slice(0, 32);

    // Generate IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    // Return base64 encoded
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, masterKey?: string): string {
  if (!encryptedData) {
    return encryptedData;
  }

  try {
    // Use master key if provided, otherwise use default encryption key
    const key = masterKey ? masterKey : ENCRYPTION_KEY;

    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
    const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = combined.slice(ENCRYPTED_POSITION);

    // Derive decryption key
    const derivedKey = masterKey ? deriveKey(key, salt) : Buffer.from(key, 'hex').slice(0, 32);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(data, generatedSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  const newHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(newHash));
}

