type CacheScope = 'public' | 'user';
type CacheStorage = 'memory' | 'localStorage';

type CacheEntry<T> = {
  expiresAt: number;
  scopeKey: string;
  storage: CacheStorage;
  tags: string[];
  value: T;
};

type CachedReadOptions<T> = {
  fetcher: () => Promise<T>;
  forceRefresh?: boolean | undefined;
  keyParts: readonly unknown[];
  scope?: CacheScope | undefined;
  storage?: CacheStorage | undefined;
  tags?: string[] | undefined;
  ttlMs: number;
};

type PrimeCacheOptions<T> = {
  keyParts: readonly unknown[];
  scope?: CacheScope | undefined;
  storage?: CacheStorage | undefined;
  tags?: string[] | undefined;
  ttlMs: number;
  value: T;
};

type InvalidateCacheOptions = {
  keyParts?: readonly unknown[] | undefined;
  scope?: CacheScope | undefined;
  tags?: string[] | undefined;
};

const STORAGE_PREFIX = 'colegio.frontend.data-cache';

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflightReads = new Map<string, Promise<unknown>>();

let currentUserScopeKey = 'anonymous';

function canUseBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function serializeKeyPart(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'undefined') {
    return 'undefined';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeKeyPart(item)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    const serializedEntries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeKeyPart(value[key])}`);

    return `{${serializedEntries.join(',')}}`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(Object.prototype.toString.call(value));
  }

  if (typeof value === 'bigint') {
    return JSON.stringify(value.toString());
  }

  if (typeof value === 'symbol') {
    return JSON.stringify(value.description ?? 'symbol');
  }

  if (typeof value === 'function') {
    return JSON.stringify(value.name || 'function');
  }

  return JSON.stringify('unsupported');
}

function resolveScopeKey(scope: CacheScope): string {
  return scope === 'public' ? 'public' : `user:${currentUserScopeKey}`;
}

function buildCacheKey(scope: CacheScope, keyParts: readonly unknown[]): string {
  return `${resolveScopeKey(scope)}::${keyParts.map((part) => serializeKeyPart(part)).join('|')}`;
}

function buildStorageKey(cacheKey: string): string {
  return `${STORAGE_PREFIX}.${cacheKey}`;
}

function isEntryFresh(entry: CacheEntry<unknown>): boolean {
  return entry.expiresAt > Date.now();
}

function removeEntry(cacheKey: string): void {
  memoryCache.delete(cacheKey);

  if (!canUseBrowser()) {
    return;
  }

  window.localStorage.removeItem(buildStorageKey(cacheKey));
}

function readPersistentEntry(cacheKey: string): CacheEntry<unknown> | null {
  if (!canUseBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(buildStorageKey(cacheKey));

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<CacheEntry<unknown>>;

    if (
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.scopeKey !== 'string' ||
      !Array.isArray(parsed.tags) ||
      (parsed.storage !== 'memory' && parsed.storage !== 'localStorage') ||
      !('value' in parsed)
    ) {
      removeEntry(cacheKey);
      return null;
    }

    const entry: CacheEntry<unknown> = {
      expiresAt: parsed.expiresAt,
      scopeKey: parsed.scopeKey,
      storage: parsed.storage,
      tags: parsed.tags.filter((tag): tag is string => typeof tag === 'string'),
      value: parsed.value,
    };

    if (!isEntryFresh(entry)) {
      removeEntry(cacheKey);
      return null;
    }

    memoryCache.set(cacheKey, entry);
    return entry;
  } catch {
    removeEntry(cacheKey);
    return null;
  }
}

function writeEntry<T>(
  cacheKey: string,
  entry: CacheEntry<T>,
): CacheEntry<T> {
  memoryCache.set(cacheKey, entry);

  if (entry.storage === 'localStorage' && canUseBrowser()) {
    try {
      window.localStorage.setItem(buildStorageKey(cacheKey), JSON.stringify(entry));
    } catch {
      // Keep the in-memory value even if persistent storage is unavailable.
    }
  }

  return entry;
}

function getEntry(cacheKey: string): CacheEntry<unknown> | null {
  const inMemoryEntry = memoryCache.get(cacheKey);

  if (inMemoryEntry) {
    if (isEntryFresh(inMemoryEntry)) {
      return inMemoryEntry;
    }

    removeEntry(cacheKey);
  }

  return readPersistentEntry(cacheKey);
}

function matchesInvalidation(
  entry: CacheEntry<unknown>,
  cacheKey: string,
  options: InvalidateCacheOptions,
): boolean {
  const tags = options.tags ?? [];
  const hasTagMatch =
    tags.length > 0 && tags.some((tag) => entry.tags.includes(tag));

  if (hasTagMatch) {
    return true;
  }

  if (options.keyParts && options.keyParts.length > 0) {
    const scope = options.scope ?? 'user';
    return cacheKey === buildCacheKey(scope, options.keyParts);
  }

  if (options.scope) {
    return entry.scopeKey === resolveScopeKey(options.scope);
  }

  return tags.length === 0;
}

function collectCacheKeys(): string[] {
  const memoryKeys = Array.from(memoryCache.keys());

  if (!canUseBrowser()) {
    return memoryKeys;
  }

  const persistentKeys: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);

    if (!storageKey?.startsWith(`${STORAGE_PREFIX}.`)) {
      continue;
    }

    persistentKeys.push(storageKey.slice(`${STORAGE_PREFIX}.`.length));
  }

  return Array.from(new Set([...memoryKeys, ...persistentKeys]));
}

export function cleanupExpiredDataCache(): void {
  collectCacheKeys().forEach((cacheKey) => {
    const entry = memoryCache.get(cacheKey) ?? readPersistentEntry(cacheKey);

    if (!entry) {
      return;
    }

    if (!isEntryFresh(entry)) {
      removeEntry(cacheKey);
    }
  });
}

export function setDataCacheUserScope(
  user: { id: string; role: string } | null,
): void {
  const nextScopeKey = user ? `${user.id}:${user.role}` : 'anonymous';

  if (nextScopeKey === currentUserScopeKey) {
    return;
  }

  invalidateDataCache({ scope: 'user' });
  currentUserScopeKey = nextScopeKey;
}

export function primeDataCache<T>({
  keyParts,
  scope = 'user',
  storage = 'memory',
  tags = [],
  ttlMs,
  value,
}: PrimeCacheOptions<T>): void {
  cleanupExpiredDataCache();

  const cacheKey = buildCacheKey(scope, keyParts);

  writeEntry(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    scopeKey: resolveScopeKey(scope),
    storage,
    tags,
    value,
  });
}

export async function readWithDataCache<T>({
  fetcher,
  forceRefresh = false,
  keyParts,
  scope = 'user',
  storage = 'memory',
  tags = [],
  ttlMs,
}: CachedReadOptions<T>): Promise<T> {
  cleanupExpiredDataCache();

  const cacheKey = buildCacheKey(scope, keyParts);

  if (!forceRefresh) {
    const cachedEntry = getEntry(cacheKey);

    if (cachedEntry) {
      return cachedEntry.value as T;
    }
  }

  const existingRead = inflightReads.get(cacheKey);

  if (existingRead) {
    return existingRead as Promise<T>;
  }

  const nextRead = (async () => {
    const value = await fetcher();

    writeEntry(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      scopeKey: resolveScopeKey(scope),
      storage,
      tags,
      value,
    });

    return value;
  })();

  inflightReads.set(cacheKey, nextRead);

  try {
    return await nextRead;
  } finally {
    inflightReads.delete(cacheKey);
  }
}

export function invalidateDataCache(options: InvalidateCacheOptions = {}): void {
  cleanupExpiredDataCache();

  collectCacheKeys().forEach((cacheKey) => {
    const entry = memoryCache.get(cacheKey) ?? readPersistentEntry(cacheKey);

    if (!entry) {
      return;
    }

    if (matchesInvalidation(entry, cacheKey, options)) {
      removeEntry(cacheKey);
      inflightReads.delete(cacheKey);
    }
  });
}
