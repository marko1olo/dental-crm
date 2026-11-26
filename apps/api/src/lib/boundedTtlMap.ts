/**
 * Bounded Map with optional TTL and byte-budget eviction (FIFO/LRU-by-refresh).
 * Uses Map insertion order: `get()` can optionally refresh recency (`touchOnGet`).
 */
export interface BoundedTtlMapOptions<V> {
  maxEntries: number;
  ttlMs?: number | undefined;
  maxBytes?: number | undefined;
  sizeOf?: ((value: V) => number) | undefined;
  touchOnGet?: boolean | undefined;
  onEvict?: ((key: unknown, value: V, reason: "ttl" | "capacity" | "bytes" | "clear") => void) | undefined;
}

interface EntryWrapper<V> {
  value: V;
  expiresAt: number;
  bytes: number;
}

export class BoundedTtlMap<K, V> {
  private readonly store = new Map<K, EntryWrapper<V>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number | undefined;
  private readonly maxBytes: number | undefined;
  private readonly sizeOf: ((value: V) => number) | undefined;
  private readonly touchOnGet: boolean;
  private readonly onEvict:
    | ((key: K, value: V, reason: "ttl" | "capacity" | "bytes" | "clear") => void)
    | undefined;
  private totalBytes = 0;

  constructor(options: BoundedTtlMapOptions<V>) {
    this.maxEntries = Math.max(1, Math.floor(options.maxEntries));
    this.ttlMs = options.ttlMs !== undefined && options.ttlMs > 0 ? options.ttlMs : undefined;
    this.maxBytes =
      options.maxBytes !== undefined && options.maxBytes > 0 ? options.maxBytes : undefined;
    this.sizeOf = options.sizeOf;
    this.touchOnGet = options.touchOnGet ?? true;
    this.onEvict = options.onEvict as
      | ((key: K, value: V, reason: "ttl" | "capacity" | "bytes" | "clear") => void)
      | undefined;
  }

  get size(): number {
    this.pruneExpired();
    return this.store.size;
  }

  get currentBytes(): number {
    return this.totalBytes;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt > 0 && Date.now() >= entry.expiresAt) {
      this.deleteEntry(key, entry, "ttl");
      return undefined;
    }
    if (this.touchOnGet) {
      this.store.delete(key);
      this.store.set(key, entry);
    }
    return entry.value;
  }

  set(key: K, value: V, customTtlMs?: number): this {
    const existing = this.store.get(key);
    if (existing) {
      this.totalBytes = Math.max(0, this.totalBytes - existing.bytes);
      this.store.delete(key);
    }

    const effectiveTtl = customTtlMs !== undefined ? customTtlMs : this.ttlMs;
    const expiresAt = effectiveTtl !== undefined && effectiveTtl > 0 ? Date.now() + effectiveTtl : 0;
    const bytes = this.sizeOf ? Math.max(0, this.sizeOf(value)) : 0;

    if (this.maxBytes !== undefined && bytes > this.maxBytes) {
      this.onEvict?.(key, value, "bytes");
      return this;
    }

    this.pruneExpired();

    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next();
      if (oldestKey.done) break;
      const oldest = this.store.get(oldestKey.value);
      if (oldest) {
        this.deleteEntry(oldestKey.value, oldest, "capacity");
      }
    }

    if (this.maxBytes !== undefined) {
      while (this.totalBytes + bytes > this.maxBytes && this.store.size > 0) {
        const oldestKey = this.store.keys().next();
        if (oldestKey.done) break;
        const oldest = this.store.get(oldestKey.value);
        if (oldest) {
          this.deleteEntry(oldestKey.value, oldest, "bytes");
        }
      }
    }

    this.store.set(key, { value, expiresAt, bytes });
    this.totalBytes += bytes;
    return this;
  }

  delete(key: K): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    this.totalBytes = Math.max(0, this.totalBytes - entry.bytes);
    return this.store.delete(key);
  }

  clear(): void {
    if (this.onEvict) {
      for (const [k, entry] of this.store.entries()) {
        this.onEvict(k, entry.value, "clear");
      }
    }
    this.store.clear();
    this.totalBytes = 0;
  }

  pruneExpired(now = Date.now()): number {
    if (this.ttlMs === undefined && this.store.size === 0) return 0;
    let removed = 0;
    for (const [k, entry] of this.store.entries()) {
      if (entry.expiresAt > 0 && now >= entry.expiresAt) {
        this.deleteEntry(k, entry, "ttl");
        removed++;
      }
    }
    return removed;
  }

  values(): V[] {
    this.pruneExpired();
    const out: V[] = [];
    for (const entry of this.store.values()) {
      out.push(entry.value);
    }
    return out;
  }

  entries(): Array<[K, V]> {
    this.pruneExpired();
    const out: Array<[K, V]> = [];
    for (const [k, entry] of this.store.entries()) {
      out.push([k, entry.value]);
    }
    return out;
  }

  keys(): K[] {
    this.pruneExpired();
    return Array.from(this.store.keys());
  }

  private deleteEntry(
    key: K,
    entry: EntryWrapper<V>,
    reason: "ttl" | "capacity" | "bytes" | "clear",
  ): void {
    this.store.delete(key);
    this.totalBytes = Math.max(0, this.totalBytes - entry.bytes);
    this.onEvict?.(key, entry.value, reason);
  }
}

export class BoundedStringSet {
  private readonly map: BoundedTtlMap<string, true>;

  constructor(maxEntries: number, ttlMs?: number) {
    this.map = new BoundedTtlMap<string, true>({
      maxEntries,
      ...(ttlMs !== undefined ? { ttlMs } : {}),
    });
  }

  get size(): number {
    return this.map.size;
  }

  has(value: string): boolean {
    return this.map.has(value);
  }

  add(value: string): this {
    this.map.set(value, true);
    return this;
  }

  delete(value: string): boolean {
    return this.map.delete(value);
  }

  clear(): void {
    this.map.clear();
  }
}
