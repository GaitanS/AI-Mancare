/**
 * Cryptography Tests
 */

import {
  hashPassword,
  verifyPassword,
  generateToken,
  validatePasswordStrength,
  generateCSRFToken,
  verifyCSRFToken,
} from '../crypto';

describe('Cryptography', () => {
  describe('Password Hashing', () => {
    test('should hash password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).toContain(':'); // salt:hash format
      expect(hash).not.toBe(password);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });

    test('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });

    test('should handle invalid hash format', async () => {
      const isValid = await verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    test('should generate random token', () => {
      const token = generateToken();

      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
    });

    test('should generate different tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });

    test('should generate token of specified length', () => {
      const token = generateToken(16);
      // Hex string is 2x the byte length
      expect(token.length).toBe(32);
    });
  });

  describe('Password Strength Validation', () => {
    test('should accept strong password', () => {
      const result = validatePasswordStrength('SecurePass123!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    test('should reject short password', () => {
      const result = validatePasswordStrength('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject password without lowercase', () => {
      const result = validatePasswordStrength('PASSWORD123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain lowercase letters');
    });

    test('should reject password without uppercase', () => {
      const result = validatePasswordStrength('password123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain uppercase letters');
    });

    test('should reject password without numbers', () => {
      const result = validatePasswordStrength('PasswordTest!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain numbers');
    });

    test('should reject password without special chars', () => {
      const result = validatePasswordStrength('Password123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain special characters');
    });

    test('should give bonus for long password', () => {
      const result = validatePasswordStrength('VeryLongSecurePassword123!');

      expect(result.score).toBe(6); // All checks + length bonus
    });
  });

  describe('CSRF Token', () => {
    test('should generate CSRF token', () => {
      const token = generateCSRFToken();

      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
    });

    test('should verify matching token', () => {
      const token = generateCSRFToken();
      const isValid = verifyCSRFToken(token, token);

      expect(isValid).toBe(true);
    });

    test('should reject non-matching token', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const isValid = verifyCSRFToken(token1, token2);

      expect(isValid).toBe(false);
    });

    test('should reject token with different length', () => {
      const token = generateCSRFToken();
      const isValid = verifyCSRFToken(token, token + 'extra');

      expect(isValid).toBe(false);
    });
  });
});
