import NodeCache from 'node-cache';

// Initialize cache with default TTL of 5 minutes
export class Cache<T> {
  private cache: Map<string, { value: T; expiry: number }>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) { // 5 minutes in milliseconds
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.cache.has(key) && Date.now() <= (this.cache.get(key)?.expiry || 0);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  values(): T[] {
    return Array.from(this.cache.values())
      .filter(item => Date.now() <= item.expiry)
      .map(item => item.value);
  }

  entries(): [string, T][] {
    return Array.from(this.cache.entries())
      .filter(([_, item]) => Date.now() <= item.expiry)
      .map(([key, item]) => [key, item.value]);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new Cache();

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
      cache.set(key, result, ttl * 1000);
      return result;
    };

    return descriptor;
  };
}

// Clear cache for a specific key pattern
export function clearCache(pattern: string): void {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  matchingKeys.forEach(key => cache.delete(key));
}

// Get cache statistics
export function getCacheStats(): { keys: number; hits: number; misses: number } {
  return {
    keys: cache.size(),
    hits: 0, // Not implemented
    misses: 0 // Not implemented
  };
}

// Clear entire cache
export function clearAllCache(): void {
  cache.clear();
}
