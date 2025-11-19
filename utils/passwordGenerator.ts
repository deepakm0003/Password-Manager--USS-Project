/**
 * Password generator utility with configurable options
 */

export interface PasswordOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Generates a random password based on options
 */
export function generatePassword(options: PasswordOptions): string {
  const {
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
  } = options;

  // Build character set based on options
  let charset = '';
  if (includeUppercase) charset += UPPERCASE;
  if (includeLowercase) charset += LOWERCASE;
  if (includeNumbers) charset += NUMBERS;
  if (includeSymbols) charset += SYMBOLS;

  // Ensure at least one character type is selected
  if (charset.length === 0) {
    charset = LOWERCASE + UPPERCASE + NUMBERS;
  }

  // Generate password
  let password = '';
  const charsetLength = charset.length;

  // Ensure at least one character from each selected type
  if (includeUppercase && password.indexOf(UPPERCASE[0]) === -1) {
    password += UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)];
  }
  if (includeLowercase && password.indexOf(LOWERCASE[0]) === -1) {
    password += LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)];
  }
  if (includeNumbers && password.indexOf(NUMBERS[0]) === -1) {
    password += NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
  }
  if (includeSymbols && password.indexOf(SYMBOLS[0]) === -1) {
    password += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  // Fill the rest randomly
  while (password.length < length) {
    password += charset[Math.floor(Math.random() * charsetLength)];
  }

  // Shuffle the password to randomize character positions
  return shuffleString(password);
}

/**
 * Shuffles a string to randomize character order
 */
function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Calculates password strength based on various factors
 */
export function calculatePasswordStrength(password: string): {
  score: number; // 0-100
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  color: string;
} {
  let score = 0;

  // Length factor
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;

  // Patterns and complexity
  if (password.length > 12 && /[a-z]/.test(password) && /[A-Z]/.test(password)) score += 10;
  if (password.length > 12 && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 10;

  // Penalties for common patterns
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 5; // Sequential patterns

  score = Math.max(0, Math.min(100, score));

  let strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  let color: string;

  if (score < 30) {
    strength = 'weak';
    color = '#ef4444'; // red
  } else if (score < 50) {
    strength = 'fair';
    color = '#f59e0b'; // orange
  } else if (score < 70) {
    strength = 'good';
    color = '#eab308'; // yellow
  } else if (score < 90) {
    strength = 'strong';
    color = '#22c55e'; // green
  } else {
    strength = 'very-strong';
    color = '#10b981'; // emerald
  }

  return { score, strength, color };
}

/**
 * Default password options
 */
export const defaultPasswordOptions: PasswordOptions = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: false,
};

