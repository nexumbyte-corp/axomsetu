/**
 * High-performance In-Memory Metadata Cache Utility
 * Reduces DB query workload for static/infrequently updated metadata
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get value from cache if not expired
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds Default: 300 seconds (5 mins)
   */
  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete specific key
   * @param {string} key
   */
  del(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys starting with prefix
   * @param {string} prefix
   */
  invalidatePrefix(prefix) {
    if (!prefix) return;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Alias for invalidatePrefix
   * @param {string} prefix
   */
  delPrefix(prefix) {
    this.invalidatePrefix(prefix);
  }

  /**
   * Invalidate all keys matching a pattern (string substring, prefix, wildcard or RegExp)
   * @param {string|RegExp} pattern
   */
  delPattern(pattern) {
    if (!pattern) return;
    if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
      return;
    }

    if (typeof pattern === 'string') {
      const cleanPattern = pattern.replace(/\*/g, '');
      for (const key of this.cache.keys()) {
        if (key.includes(cleanPattern) || key.startsWith(cleanPattern)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cache entries
   */
  flush() {
    this.cache.clear();
  }

  /**
   * Helper to get cached value or compute and store it
   * @param {string} key
   * @param {Function} fetchFn Async function returning value
   * @param {number} ttlSeconds
   * @returns {Promise<any>}
   */
  async getOrSet(key, fetchFn, ttlSeconds = 300) {
    const cached = this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    if (value !== null && value !== undefined) {
      this.set(key, value, ttlSeconds);
    }
    return value;
  }
}

export const memoryCache = new MemoryCache();
