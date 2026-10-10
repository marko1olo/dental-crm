/**
 * lowSpecHdd/lruCache.ts — In-Memory LRU кэш (Zero-Disk, 0 ms доступ в RAM).
 * Layer 1: In-Memory cache data structures.
 */

import type { MemoryLruCacheOptions } from "./types.js";
import { getOptimizedTiming } from "./timingConfig.js";

/**
 * Оценивает приблизительный размер JavaScript значения в байтах для защиты кучи (heap memory).
 */
export function estimateObjectByteSize(val: unknown): number {
	if (val === null || val === undefined) return 8;
	if (typeof val === "boolean") return 4;
	if (typeof val === "number") return 8;
	if (typeof val === "string") return val.length * 2;
	if (val instanceof ArrayBuffer) return val.byteLength;
	if (ArrayBuffer.isView(val)) return val.byteLength;
	if (typeof val === "object") {
		try {
			const json = JSON.stringify(val);
			return json ? json.length * 2 : 128;
		} catch {
			return 256;
		}
	}
	return 64;
}

interface CacheEntry<V> {
	readonly value: V;
	readonly expiresAt: number | null;
	readonly byteSize: number;
}

/**
 * Быстрый In-Memory LRU кэш на основе Map с контролем TTL и потолка памяти (байтов).
 *
 * Преимущества:
 * - O(1) доступ и O(1) вытеснение благодаря порядку ключей JavaScript Map.
 * - При вызове get() запись перемещается в конец очереди (самая свежая).
 * - Нулевое обращение к диску (HDD не дергается).
 * - Двойной контроль: вытеснение по числу записей И по объему байтов в RAM (потолок 50 МБ).
 * - Поддержка индивидуального и глобального TTL.
 */
export class MemoryLruCache<K extends string | number, V> {
	private readonly map = new Map<K, CacheEntry<V>>();
	private readonly maxEntries: number;
	private readonly defaultTtlMs: number | null;
	private readonly maxBytes: number;
	private readonly sizeCalculator?: ((value: V) => number) | undefined;
	private currentBytes = 0;

	constructor(options?: MemoryLruCacheOptions<V>) {
		const timing = getOptimizedTiming();
		this.maxEntries = options?.maxEntries ?? timing.maxLruCacheEntries;
		this.defaultTtlMs = options?.defaultTtlMs !== undefined ? options.defaultTtlMs : timing.defaultCacheTtlMs;
		this.maxBytes = options?.maxBytes ?? timing.maxLruCacheBytes;
		this.sizeCalculator = options?.sizeCalculator;
	}

	/**
	 * Получает значение из кэша.
	 * При наличии возвращает значение и обновляет позицию в LRU-очереди.
	 * Если срок жизни истек — удаляет запись и возвращает undefined.
	 */
	get(key: K): V | undefined {
		const entry = this.map.get(key);
		if (!entry) {
			return undefined;
		}

		if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
			this.currentBytes = Math.max(0, this.currentBytes - entry.byteSize);
			this.map.delete(key);
			return undefined;
		}

		// Обновляем позицию в Map (удаляем и вставляем заново в конец)
		this.map.delete(key);
		this.map.set(key, entry);
		return entry.value;
	}

	/**
	 * Сохраняет значение в кэш с опциональным индивидуальным TTL и контролем размера памяти.
	 */
	set(key: K, value: V, customTtlMs?: number | null | undefined): void {
		const byteSize = this.sizeCalculator
			? this.sizeCalculator(value)
			: estimateObjectByteSize(value);

		if (this.map.has(key)) {
			const existing = this.map.get(key);
			if (existing) {
				this.currentBytes = Math.max(0, this.currentBytes - existing.byteSize);
			}
			this.map.delete(key);
		}

		// Если превышен лимит записей или байтов — сначала удаляем просроченные по TTL
		if (
			this.map.size >= this.maxEntries ||
			(this.currentBytes + byteSize > this.maxBytes && this.map.size > 0)
		) {
			this.pruneExpired();
		}

		// Вытесняем старейшие записи (LRU) до освобождения достаточного объема
		while (
			this.map.size > 0 &&
			(this.map.size >= this.maxEntries ||
				(this.currentBytes + byteSize > this.maxBytes && this.map.size > 0))
		) {
			const oldestKey = this.map.keys().next().value;
			if (oldestKey === undefined) break;
			const oldestEntry = this.map.get(oldestKey);
			if (oldestEntry) {
				this.currentBytes = Math.max(0, this.currentBytes - oldestEntry.byteSize);
			}
			this.map.delete(oldestKey);
		}

		const ttl = customTtlMs !== undefined ? customTtlMs : this.defaultTtlMs;
		const expiresAt = ttl !== null && ttl > 0 ? Date.now() + ttl : null;

		this.map.set(key, { value, expiresAt, byteSize });
		this.currentBytes += byteSize;
	}

	/**
	 * Проверяет наличие актуального ключа в кэше.
	 */
	has(key: K): boolean {
		return this.get(key) !== undefined;
	}

	/**
	 * Удаляет запись по ключу.
	 */
	delete(key: K): boolean {
		const entry = this.map.get(key);
		if (entry) {
			this.currentBytes = Math.max(0, this.currentBytes - entry.byteSize);
			return this.map.delete(key);
		}
		return false;
	}

	/**
	 * Полностью очищает кэш в оперативной памяти.
	 */
	clear(): void {
		this.map.clear();
		this.currentBytes = 0;
	}

	/**
	 * Текущее количество записей в кэше.
	 */
	get size(): number {
		return this.map.size;
	}

	/**
	 * Текущий объем данных в оперативной памяти (в байтах).
	 */
	get currentByteSize(): number {
		return this.currentBytes;
	}

	/**
	 * Список всех активных ключей кэша.
	 */
	keys(): K[] {
		return Array.from(this.map.keys());
	}

	/**
	 * Список всех активных значений кэша.
	 */
	values(): V[] {
		const result: V[] = [];
		const now = Date.now();
		for (const [key, entry] of this.map.entries()) {
			if (entry.expiresAt !== null && now > entry.expiresAt) {
				this.currentBytes = Math.max(0, this.currentBytes - entry.byteSize);
				this.map.delete(key);
			} else {
				result.push(entry.value);
			}
		}
		return result;
	}

	/**
	 * Возвращает массив пар [ключ, значение].
	 */
	entries(): Array<[K, V]> {
		const result: Array<[K, V]> = [];
		const now = Date.now();
		for (const [key, entry] of this.map.entries()) {
			if (entry.expiresAt !== null && now > entry.expiresAt) {
				this.currentBytes = Math.max(0, this.currentBytes - entry.byteSize);
				this.map.delete(key);
			} else {
				result.push([key, entry.value]);
			}
		}
		return result;
	}

	/**
	 * Принудительно удаляет все просроченные записи.
	 * Возвращает количество удаленных записей.
	 */
	pruneExpired(): number {
		const now = Date.now();
		let prunedCount = 0;
		for (const [key, entry] of this.map.entries()) {
			if (entry.expiresAt !== null && now > entry.expiresAt) {
				this.currentBytes = Math.max(0, this.currentBytes - entry.byteSize);
				this.map.delete(key);
				prunedCount++;
			}
		}
		return prunedCount;
	}

	/**
	 * Возвращает статистику использования кэша.
	 */
	getStats(): {
		size: number;
		maxEntries: number;
		defaultTtlMs: number | null;
		currentBytes: number;
		maxBytes: number;
	} {
		return {
			size: this.map.size,
			maxEntries: this.maxEntries,
			defaultTtlMs: this.defaultTtlMs,
			currentBytes: this.currentBytes,
			maxBytes: this.maxBytes,
		};
	}
}

/**
 * Фабричная функция для создания In-Memory LRU кэша.
 */
export function createMemoryLruCache<K extends string | number, V>(
	options?: MemoryLruCacheOptions<V>,
): MemoryLruCache<K, V> {
	return new MemoryLruCache<K, V>(options);
}
