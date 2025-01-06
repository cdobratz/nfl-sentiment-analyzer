import NodeCache from 'node-cache';

// Initialize cache with default TTL of 5 minutes
const cacheManager = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

/**
 * Cache decorator for class methods
 * @param ttl Time to live in seconds
 */
export function cache(ttl = 300) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = `${propertyKey}-${JSON.stringify(args)}`;
      const cachedValue = cacheManager.get(key);

      if (cachedValue !== undefined) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      cacheManager.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

/**
 * Clear cache for a specific key pattern
 * @param pattern Key pattern to match
 */
export function clearCache(pattern: string): void {
  const keys = cacheManager.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  cacheManager.del(matchingKeys);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cacheManager.getStats();
}

/**
 * Clear entire cache
 */
export function clearAllCache(): void {
  cacheManager.flushAll();
}
