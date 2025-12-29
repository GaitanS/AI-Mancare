/**
 * Cache Utility Tests
 */

import { cache, invalidatePattern } from '../cache';

describe('Cache Utility', () => {
  beforeEach(() => {
    // Clear cache before each test
    cache.flushAll();
  });

  afterEach(() => {
    cache.flushAll();
  });

  describe('Basic Operations', () => {
    test('should set and get value', () => {
      cache.set('test-key', 'test-value', 60);
      const value = cache.get('test-key');

      expect(value).toBe('test-value');
    });

    test('should return undefined for non-existent key', () => {
      const value = cache.get('non-existent');

      expect(value).toBeUndefined();
    });

    test('should delete value', () => {
      cache.set('test-key', 'test-value', 60);
      cache.del('test-key');
      const value = cache.get('test-key');

      expect(value).toBeUndefined();
    });

    test('should handle complex objects', () => {
      const obj = { name: 'Test', count: 42, nested: { value: true } };
      cache.set('obj-key', obj, 60);
      const retrieved = cache.get('obj-key');

      expect(retrieved).toEqual(obj);
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire after TTL', async () => {
      cache.set('expire-key', 'value', 1); // 1 second

      // Should exist initially
      expect(cache.get('expire-key')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(cache.get('expire-key')).toBeUndefined();
    });

    test('should get TTL of key', () => {
      const ttl = 60;
      cache.set('ttl-key', 'value', ttl);

      const keyTTL = cache.getTtl('ttl-key');

      expect(keyTTL).toBeGreaterThan(Date.now());
    });
  });

  describe('Pattern Invalidation', () => {
    test('should invalidate keys matching pattern', () => {
      cache.set('user:1', 'User 1', 60);
      cache.set('user:2', 'User 2', 60);
      cache.set('product:1', 'Product 1', 60);

      invalidatePattern('user:*');

      expect(cache.get('user:1')).toBeUndefined();
      expect(cache.get('user:2')).toBeUndefined();
      expect(cache.get('product:1')).toBe('Product 1');
    });
  });

  describe('Statistics', () => {
    test('should track cache hits and misses', () => {
      cache.set('hit-key', 'value', 60);

      cache.get('hit-key');  // hit
      cache.get('miss-key'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBeGreaterThanOrEqual(1);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
    });
  });
});
