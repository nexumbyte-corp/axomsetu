/**
 * High-Performance In-Memory Cache Utility with TTL & Pattern Invalidation
 * Optimized for multi-tenant SaaS workloads (e.g. metadata lookups, dashboard stats).
 */

class MemoryCache {
  constructor(defaultTtlSeconds = 60) {
    this.cache = new Map();
    this.defaultTtl = defaultTtlSeconds * 1000;

    // Periodic sweep every 2 minutes to clear expired keys and prevent memory leaks
    this.cleanupInterval = setInterval(() => this.sweepExpired(), 2 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Get cached item if valid and not expired.
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
   * Set cache key with optional TTL override in seconds.
   */
  set(key, value, ttlSeconds) {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    return value;
  }

  /**
   * Delete specific key.
   */
  del(key) {
    return this.cache.delete(key);
  }

  /**
   * Delete keys matching a prefix or substring pattern (e.g. `school:123:*`)
   */
  delPattern(prefixOrPattern) {
    let deletedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(prefixOrPattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * Helper to retrieve from cache or execute fetcher function and store result.
   */
  async getOrSet(key, fetcherFn, ttlSeconds) {
    const cached = this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const value = await fetcherFn();
    if (value !== undefined && value !== null) {
      this.set(key, value, ttlSeconds);
    }
    return value;
  }

  /**
   * Sweep and clear expired keys from memory map.
   */
  sweepExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all keys in memory map.
   */
  clear() {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryCache();
