import crypto from 'crypto';
import bcrypt from 'bcrypt';

const AES_ALGORITHM = 'aes-256-gcm';
const AES_KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

export const deriveAESKey = (masterPassword: string, salt: Buffer): Buffer =>
  crypto.pbkdf2Sync(masterPassword, salt, 100000, AES_KEY_LENGTH, 'sha256');

export const encryptAES = (plaintext: string, masterPassword: string): string => {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveAESKey(masterPassword, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Return salt:iv:tag:ciphertext (hex encoded)
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown encryption error';
    throw new Error(`Encryption failed: ${message}`);
  }
};

export const decryptAES = (encryptedData: string, masterPassword: string): string => {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltHex, ivHex, tagHex, cipherHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');

    const key = deriveAESKey(masterPassword, salt);

    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown decryption error';
    throw new Error(`Decryption failed: ${message}`);
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

export const generateToken = (length: number = 32): string =>
  crypto.randomBytes(length).toString('hex');

export const generateUUID = (): string => crypto.randomUUID();

export const hashBiometric = (userId: number, deviceId: string, timestamp: string): string => {
  const secret = process.env.JWT_SECRET ?? 'default-secret';
  const payload = `${userId}:${deviceId}:${timestamp}:${secret}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};
