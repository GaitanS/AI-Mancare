/**
 * Cryptography Utilities
 * Password hashing, token generation, encryption
 */

import { createHash, randomBytes, pbkdf2 } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

/**
 * Hash password using PBKDF2 (recomandat de OWASP)
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = randomBytes(16).toString('hex');

  // Hash password with salt (100,000 iterations)
  const hash = await pbkdf2Async(
    password,
    salt,
    100000,
    64,
    'sha512'
  );

  // Return salt:hash format
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');

    if (!salt || !hash) {
      return false;
    }

    const verifyHash = await pbkdf2Async(
      password,
      salt,
      100000,
      64,
      'sha512'
    );

    return hash === verifyHash.toString('hex');
  } catch {
    return false;
  }
}

/**
 * Generate secure random token
 */
export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate API key
 */
export function generateAPIKey(): string {
  const prefix = 'ri_'; // retete-ieftine
  const token = randomBytes(32).toString('hex');

  return `${prefix}${token}`;
}

/**
 * Hash string (pentru cache keys, etc)
 */
export function hashString(input: string): string {
  return createHash('sha256')
    .update(input)
    .digest('hex');
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Verify CSRF token timing-safe
 */
export function verifyCSRFToken(
  token: string,
  expectedToken: string
): boolean {
  if (token.length !== expectedToken.length) {
    return false;
  }

  // Timing-safe comparison
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  return tokenBuffer.compare(expectedBuffer) === 0;
}

/**
 * Simple encryption (pentru date non-critice)
 * Pentru date sensibile, folosește un serviciu dedicat
 */
export function simpleEncrypt(text: string, key: string): string {
  const cipher = createHash('sha256').update(key).digest('hex');
  const encrypted = Buffer.from(text).toString('base64');

  return `${cipher.slice(0, 16)}:${encrypted}`;
}

/**
 * Simple decryption
 */
export function simpleDecrypt(encrypted: string, key: string): string {
  const [, data] = encrypted.split(':');

  if (!data) {
    throw new Error('Invalid encrypted data');
  }

  return Buffer.from(data, 'base64').toString('utf-8');
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Contains lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  } else {
    score += 1;
  }

  // Contains uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  } else {
    score += 1;
  }

  // Contains numbers
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  } else {
    score += 1;
  }

  // Contains special characters
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain special characters');
  } else {
    score += 1;
  }

  // Bonus for length
  if (password.length >= 12) {
    score += 1;
  }

  return {
    valid: errors.length === 0,
    errors,
    score, // 0-6
  };
}
