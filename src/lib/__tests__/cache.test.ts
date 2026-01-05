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
    test('should set and get value', async () => {
      await cache.set('test-key', 'test-value', 60);
      const value = await cache.get('test-key');

      expect(value).toBe('test-value');
    });

    test('should return undefined for non-existent key', async () => {
      const value = await cache.get('non-existent');

      expect(value).toBeUndefined();
    });

    test('should delete value', async () => {
      await cache.set('test-key', 'test-value', 60);
      await cache.del('test-key');
      const value = await cache.get('test-key');

      expect(value).toBeUndefined();
    });

    test('should handle complex objects', async () => {
      const obj = { name: 'Test', count: 42, nested: { value: true } };
      await cache.set('obj-key', obj, 60);
      const retrieved = await cache.get('obj-key');

      expect(retrieved).toEqual(obj);
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire after TTL', async () => {
      await cache.set('expire-key', 'value', 1); // 1 second

      // Should exist initially
      expect(await cache.get('expire-key')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(await cache.get('expire-key')).toBeUndefined();
    });

    test('should get TTL of key', async () => {
      const ttl = 60;
      await cache.set('ttl-key', 'value', ttl);

      const keyTTL = cache.getTtl('ttl-key');

      expect(keyTTL).toBeGreaterThan(Date.now());
    });
  });

  describe('Pattern Invalidation', () => {
    test('should invalidate keys matching pattern', async () => {
      await cache.set('user:1', 'User 1', 60);
      await cache.set('user:2', 'User 2', 60);
      await cache.set('product:1', 'Product 1', 60);

      invalidatePattern('user:');

      expect(await cache.get('user:1')).toBeUndefined();
      expect(await cache.get('user:2')).toBeUndefined();
      expect(await cache.get('product:1')).toBe('Product 1');
    });
  });

  describe('Statistics', () => {
    test('should track cache hits and misses', async () => {
      await cache.set('hit-key', 'value', 60);

      await cache.get('hit-key');  // hit
      await cache.get('miss-key'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBeGreaterThanOrEqual(1);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
    });
  });
});
