import NodeCache from 'node-cache';

// Initialize cache with default TTL of 5 minutes
export const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every minute
  useClones: false
});

export function cacheKey(...args: (string | number)[]): string {
  return args.join(':');
}

/**
 * Cache decorator for class methods
 * @param ttl Time to live in seconds
 */
export function cacheDecorator(ttl = 300) {
  return function (
    _target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const key = cacheKey(propertyKey, ...args.map(arg => String(arg)));
      const cachedValue = cache.get(key);

      if (cachedValue !== undefined) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(key, result, ttl);
      return result;
    };

    return descriptor;
  };
}

// Clear cache for a specific key pattern
export function clearCache(pattern: string): void {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  matchingKeys.forEach(key => cache.del(key));
}

// Get cache statistics
export function getCacheStats(): { keys: number; hits: number; misses: number } {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses
  };
}

// Clear entire cache
export function clearAllCache(): void {
  cache.flushAll();
}
