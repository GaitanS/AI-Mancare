/**
 * Security Validation Tests
 */

import {
  safeString,
  safeEmail,
  safeURL,
  safeSlug,
  sanitizeHTML,
  sanitizeFilename,
  sanitizeUserInput,
  productSearchSchema,
} from '../validation';

describe('Security Validation', () => {
  describe('safeString', () => {
    test('should accept valid string', () => {
      const result = safeString.safeParse('Valid string');
      expect(result.success).toBe(true);
    });

    test('should reject HTML tags', () => {
      const result = safeString.safeParse('<script>alert("XSS")</script>');
      expect(result.success).toBe(false);
    });

    test('should reject empty string', () => {
      const result = safeString.safeParse('');
      expect(result.success).toBe(false);
    });

    test('should reject string over 255 chars', () => {
      const longString = 'a'.repeat(256);
      const result = safeString.safeParse(longString);
      expect(result.success).toBe(false);
    });
  });

  describe('safeEmail', () => {
    test('should accept valid email', () => {
      const result = safeEmail.safeParse('test@example.com');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    test('should reject invalid email', () => {
      const result = safeEmail.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    test('should lowercase email', () => {
      const result = safeEmail.safeParse('TEST@EXAMPLE.COM');
      expect(result.data).toBe('test@example.com');
    });
  });

  describe('safeURL', () => {
    test('should accept valid HTTPS URL', () => {
      const result = safeURL.safeParse('https://example.com');
      expect(result.success).toBe(true);
    });

    test('should accept valid HTTP URL', () => {
      const result = safeURL.safeParse('http://example.com');
      expect(result.success).toBe(true);
    });

    test('should reject javascript: protocol', () => {
      const result = safeURL.safeParse('javascript:alert(1)');
      expect(result.success).toBe(false);
    });

    test('should reject invalid URL', () => {
      const result = safeURL.safeParse('not-a-url');
      expect(result.success).toBe(false);
    });
  });

  describe('safeSlug', () => {
    test('should accept valid slug', () => {
      const result = safeSlug.safeParse('valid-slug-123');
      expect(result.success).toBe(true);
    });

    test('should reject uppercase', () => {
      const result = safeSlug.safeParse('Invalid-Slug');
      expect(result.success).toBe(false);
    });

    test('should reject special characters', () => {
      const result = safeSlug.safeParse('invalid_slug!');
      expect(result.success).toBe(false);
    });

    test('should reject spaces', () => {
      const result = safeSlug.safeParse('invalid slug');
      expect(result.success).toBe(false);
    });
  });

  describe('sanitizeHTML', () => {
    test('should remove HTML tags', () => {
      const result = sanitizeHTML('<p>Hello <b>World</b></p>');
      expect(result).toBe('Hello World');
    });

    test('should remove script tags', () => {
      const result = sanitizeHTML('<script>alert("XSS")</script>Hello');
      expect(result).toBe('Hello');
    });

    test('should remove javascript: protocol', () => {
      const result = sanitizeHTML('<a href="javascript:alert(1)">Click</a>');
      expect(result).not.toContain('javascript:');
    });

    test('should remove event handlers', () => {
      const result = sanitizeHTML('<div onclick="alert(1)">Click</div>');
      expect(result).not.toContain('onclick');
    });
  });

  describe('sanitizeFilename', () => {
    test('should allow alphanumeric and dots', () => {
      const result = sanitizeFilename('file-name.123.txt');
      expect(result).toBe('file-name.123.txt');
    });

    test('should replace special characters', () => {
      const result = sanitizeFilename('file name!@#$.txt');
      expect(result).toBe('file_name____.txt');
    });

    test('should prevent directory traversal', () => {
      const result = sanitizeFilename('../../../etc/passwd');
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    test('should lowercase filename', () => {
      const result = sanitizeFilename('FILE-NAME.TXT');
      expect(result).toBe('file-name.txt');
    });
  });

  describe('sanitizeUserInput', () => {
    test('should accept safe input', () => {
      const result = sanitizeUserInput('Safe input text');
      expect(result).toBe('Safe input text');
    });

    test('should throw on script tags', () => {
      expect(() => {
        sanitizeUserInput('<script>alert(1)</script>');
      }).toThrow('Potentially dangerous input detected');
    });

    test('should throw on non-string input', () => {
      expect(() => {
        sanitizeUserInput(123 as any);
      }).toThrow('Input must be a string');
    });
  });

  describe('productSearchSchema', () => {
    test('should accept valid search params', () => {
      const result = productSearchSchema.safeParse({
        query: 'lapte',
        category: 'lactate',
        store: 'Lidl',
        minPrice: 5,
        maxPrice: 20,
        page: 1,
        limit: 20,
      });

      expect(result.success).toBe(true);
    });

    test('should apply defaults', () => {
      const result = productSearchSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(20);
    });

    test('should reject invalid page', () => {
      const result = productSearchSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    test('should reject limit over 100', () => {
      const result = productSearchSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    test('should reject HTML in query', () => {
      const result = productSearchSchema.safeParse({
        query: '<script>alert(1)</script>',
      });
      expect(result.success).toBe(false);
    });
  });
});
