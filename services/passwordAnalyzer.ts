import { PasswordEntry } from '../types';

export interface PasswordVulnerability {
  type: 'weak' | 'reused' | 'breached' | 'short' | 'common' | 'no-numbers' | 'no-special' | 'no-uppercase' | 'no-lowercase' | 'old';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
}

export interface PasswordAnalysis {
  score: number; // 0-100
  strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  vulnerabilities: PasswordVulnerability[];
  suggestions: string[];
  entropy: number; // Password entropy in bits
}

// Common weak passwords (in production, use a more comprehensive list)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', '1234', 'qwerty', 'abc123', 'password1',
  'admin', 'letmein', 'welcome', 'monkey', '1234567', 'sunshine', 'master',
  '123123', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'princess', 'football'
];

/**
 * Calculate password entropy
 */
function calculateEntropy(password: string): number {
  let pool = 0;
  
  // Check character pools used
  if (/[a-z]/.test(password)) pool += 26; // lowercase
  if (/[A-Z]/.test(password)) pool += 26; // uppercase
  if (/[0-9]/.test(password)) pool += 10; // digits
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32; // special chars (approx)
  
  // Entropy = length * log2(pool)
  if (pool === 0) return 0;
  return password.length * Math.log2(pool);
}

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  return COMMON_PASSWORDS.some(common => lowerPassword.includes(common));
}

/**
 * Analyze password for vulnerabilities
 */
export function analyzePassword(
  password: string,
  allPasswords?: PasswordEntry[]
): PasswordAnalysis {
  const vulnerabilities: PasswordVulnerability[] = [];
  const suggestions: string[] = [];
  let score = 100;

  if (!password || password.length === 0) {
    return {
      score: 0,
      strength: 'very-weak',
      vulnerabilities: [{
        type: 'short',
        severity: 'critical',
        message: 'Password is empty',
        recommendation: 'Enter a password'
      }],
      suggestions: ['Enter a password'],
      entropy: 0
    };
  }

  const length = password.length;
  const entropy = calculateEntropy(password);

  // Check length
  if (length < 8) {
    vulnerabilities.push({
      type: 'short',
      severity: 'critical',
      message: 'Password is too short (less than 8 characters)',
      recommendation: 'Use at least 12-16 characters for better security'
    });
    score -= 30;
    suggestions.push('Increase password length to at least 12 characters');
  } else if (length < 12) {
    vulnerabilities.push({
      type: 'short',
      severity: 'high',
      message: 'Password could be longer (less than 12 characters)',
      recommendation: 'Use 12-16 characters for better security'
    });
    score -= 15;
    suggestions.push('Increase password length to 12-16 characters');
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    vulnerabilities.push({
      type: 'no-uppercase',
      severity: 'medium',
      message: 'Password lacks uppercase letters',
      recommendation: 'Include uppercase letters (A-Z)'
    });
    score -= 10;
    suggestions.push('Add uppercase letters');
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    vulnerabilities.push({
      type: 'no-lowercase',
      severity: 'medium',
      message: 'Password lacks lowercase letters',
      recommendation: 'Include lowercase letters (a-z)'
    });
    score -= 10;
    suggestions.push('Add lowercase letters');
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    vulnerabilities.push({
      type: 'no-numbers',
      severity: 'medium',
      message: 'Password lacks numbers',
      recommendation: 'Include numbers (0-9)'
    });
    score -= 10;
    suggestions.push('Add numbers');
  }

  // Check for special characters
  if (!/[^a-zA-Z0-9]/.test(password)) {
    vulnerabilities.push({
      type: 'no-special',
      severity: 'medium',
      message: 'Password lacks special characters',
      recommendation: 'Include special characters (!@#$%^&*, etc.)'
    });
    score -= 10;
    suggestions.push('Add special characters');
  }

  // Check for common passwords
  if (isCommonPassword(password)) {
    vulnerabilities.push({
      type: 'common',
      severity: 'critical',
      message: 'Password is too common and easily guessable',
      recommendation: 'Use a unique, random password'
    });
    score -= 40;
    suggestions.push('Avoid common passwords, use a password generator');
  }

  // Check for patterns
  if (/(.)\1{2,}/.test(password)) {
    vulnerabilities.push({
      type: 'weak',
      severity: 'high',
      message: 'Password contains repeated characters',
      recommendation: 'Avoid repeating the same character multiple times'
    });
    score -= 15;
    suggestions.push('Avoid repeated characters');
  }

  // Check for sequential patterns
  if (/123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    vulnerabilities.push({
      type: 'weak',
      severity: 'high',
      message: 'Password contains sequential characters',
      recommendation: 'Avoid sequential patterns'
    });
    score -= 15;
    suggestions.push('Avoid sequential patterns');
  }

  // Check entropy
  if (entropy < 40) {
    vulnerabilities.push({
      type: 'weak',
      severity: 'high',
      message: 'Password has low complexity',
      recommendation: 'Use a more complex password with mixed characters'
    });
    score -= 20;
    suggestions.push('Increase password complexity');
  }

  // Check for password reuse
  if (allPasswords && allPasswords.length > 0) {
    const reused = allPasswords.some(p => p.password === password);
    if (reused) {
      vulnerabilities.push({
        type: 'reused',
        severity: 'critical',
        message: 'This password is already used in another account',
        recommendation: 'Use a unique password for each account'
      });
      score -= 50;
      suggestions.push('Use a unique password for each account');
    }
  }

  // Determine strength
  let strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score >= 80) strength = 'very-strong';
  else if (score >= 60) strength = 'strong';
  else if (score >= 40) strength = 'medium';
  else if (score >= 20) strength = 'weak';
  else strength = 'very-weak';

  // Ensure score is in range
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    strength,
    vulnerabilities,
    suggestions,
    entropy
  };
}

/**
 * Check if password has been breached
 */
export async function checkPasswordBreach(password: string): Promise<{
  isBreached: boolean;
  breachCount?: number;
}> {
  // In production, integrate with Have I Been Pwned API
  // For now, check against common breached passwords
  if (isCommonPassword(password)) {
    return {
      isBreached: true,
      breachCount: 1
    };
  }

  return {
    isBreached: false
  };
}

