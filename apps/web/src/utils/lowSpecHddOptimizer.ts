/**
 * lowSpecHddOptimizer.ts — оптимизатор дискового I/O и оперативной памяти для старых ПК и медленных HDD.
 *
 * КОНТЕКСТ И ЗАДАЧА:
 * В стоматологических кабинетах и регистратурах часто установлены недорогие рабочие станции
 * или возрастные ноутбуки с механическими жесткими дисками 5400 RPM (HDD) и 2-4 ГБ RAM.
 * Время позиционирования головки (seek time) на таких дисках составляет 10-15 мс.
 *
 * Если веб-приложение спамит синхронными записями в localStorage, непрерывно дергает
 * IndexedDB на каждое нажатие клавиши в дневнике 043/у или раздувает сетевые запросы,
 * очередь диска (Disk Queue Length) подскакивает до 100%, и интерфейс намертво зависает.
 *
 * РЕШЕНИЯ МОДУЛЯ:
 * 1. In-Memory LRU Cache: быстрое хранение в RAM часто читаемых справочников (804н, МКБ-10,
 *    прайс-листы, профили врачей) с вытеснением наименее используемых записей и контролем TTL.
 * 2. Debounced Batch Flushing: группировка и отложенная запись (1200–2000 мс) вместо
 *    непрерывного насилия механического HDD.
 * 3. Low-Spec Device Detection: детекция слабой конфигурации (<=4 ядер, <=4 ГБ RAM, Save-Data)
 *    с адаптивной подстройкой задержек автосохранения и отключением агрессивного предзагрузочного спама.
 */

export interface DeviceCapabilities {
	/** Является ли устройство слабым (медленный CPU, мало RAM или медленная сеть) */
	readonly isLowSpec: boolean;
	/** Количество логических ядер процессора */
	readonly hardwareConcurrency: number;
	/** Объем оперативной памяти в гигабайтах (если поддерживается браузером) */
	readonly deviceMemoryGb: number | null;
	/** Включен ли режим экономии трафика / ресурсов (Save-Data) */
	readonly isSaveData: boolean;
	/** Эффективный тип сетевого подключения (например, '2g', '3g', '4g') */
	readonly effectiveConnectionType: string | null;
	/** Принудительно заданный режим оптимизации (если переопределен вручную) */
	readonly forcedMode: boolean | null;
}

export interface OptimizedTimingConfig {
	/** Задержка автосохранения дневников и форм (мс) */
	readonly autosaveDebounceMs: number;
	/** Задержка поиска по каталогам и пациентам (мс) */
	readonly searchDebounceMs: number;
	/** Задержка пакетного сброса мутаций на диск (мс) */
	readonly batchFlushDelayMs: number;
	/** Интервал фоновой синхронизации данных (мс) */
	readonly backgroundSyncIntervalMs: number;
	/** Максимальное количество записей в in-memory LRU кэше */
	readonly maxLruCacheEntries: number;
	/** Максимальный размер LRU кэша в байтах (не более 50 МБ на слабом ПК) */
	readonly maxLruCacheBytes: number;
	/** Время жизни кэша по умолчанию (мс) */
	readonly defaultCacheTtlMs: number;
	/** Отключение агрессивной предзагрузки для экономии дисковых и сетевых ресурсов */
	readonly disableAggressivePrefetch: boolean;
	/** Интервал периодической очистки устаревших записей по TTL (мс) */
	readonly cachePruneIntervalMs: number;
}

/** Внутренний переключатель для принудительного включения/отключения оптимизации (тесты, настройки) */
let forcedLowSpecMode: boolean | null = null;

/**
 * Определяет, относится ли текущее устройство к категории слабых (Low-Spec / Slow HDD).
 */
export function isLowSpecDevice(): boolean {
	if (forcedLowSpecMode !== null) {
		return forcedLowSpecMode;
	}

	if (typeof navigator === "undefined") {
		return false;
	}

	// 1. Проверка количества ядер процессора (<= 4 ядра — типичный офисный ноутбук/нетбук)
	const cores = navigator.hardwareConcurrency;
	if (typeof cores === "number" && cores > 0 && cores <= 4) {
		return true;
	}

	// 2. Проверка объема RAM (Device Memory API, если доступно в Chromium)
	const navWithMemory = navigator as unknown as { deviceMemory?: number };
	if (typeof navWithMemory.deviceMemory === "number" && navWithMemory.deviceMemory <= 4) {
		return true;
	}

	// 3. Проверка режима экономии трафика (часто включен на слабых каналах)
	const navWithConn = navigator as unknown as {
		connection?: { saveData?: boolean; effectiveType?: string };
	};
	if (navWithConn.connection?.saveData === true) {
		return true;
	}
	const effType = navWithConn.connection?.effectiveType;
	if (effType === "slow-2g" || effType === "2g" || effType === "3g") {
		return true;
	}

	return false;
}

/**
 * Возвращает полные аппаратные характеристики устройства.
 */
export function getDeviceCapabilities(): DeviceCapabilities {
	const isLow = isLowSpecDevice();

	let cores = 4;
	let memoryGb: number | null = null;
	let saveData = false;
	let effectiveType: string | null = null;

	if (typeof navigator !== "undefined") {
		if (typeof navigator.hardwareConcurrency === "number") {
			cores = navigator.hardwareConcurrency;
		}

		const navWithMemory = navigator as unknown as { deviceMemory?: number };
		if (typeof navWithMemory.deviceMemory === "number") {
			memoryGb = navWithMemory.deviceMemory;
		}

		const navWithConn = navigator as unknown as {
			connection?: { saveData?: boolean; effectiveType?: string };
		};
		if (navWithConn.connection) {
			saveData = Boolean(navWithConn.connection.saveData);
			effectiveType = navWithConn.connection.effectiveType || null;
		}
	}

	return {
		isLowSpec: isLow,
		hardwareConcurrency: cores,
		deviceMemoryGb: memoryGb,
		isSaveData: saveData,
		effectiveConnectionType: effectiveType,
		forcedMode: forcedLowSpecMode,
	};
}

/**
 * Принудительно переопределяет режим Low-Spec (например, для ручного тюнинга или тестов).
 */
export function setForcedLowSpecMode(mode: boolean | null): void {
	forcedLowSpecMode = mode;
}

/**
 * Возвращает адаптированные интервалы времени и лимиты кэша под текущее железо.
 */
export function getOptimizedTiming(): OptimizedTimingConfig {
	const isLow = isLowSpecDevice();

	if (isLow) {
		return {
			// На медленных HDD интервал 1800 мс предотвращает троттлинг диска при наборе текста врачом
			autosaveDebounceMs: 1800,
			// Снижает нагрузку на слабый CPU при фильтрации номенклатуры
			searchDebounceMs: 400,
			// Группировка мутаций снижает число случайных операций ввода-вывода (I/O)
			batchFlushDelayMs: 1500,
			// Редкая фоновая синхронизация, чтобы не забивать диск
			backgroundSyncIntervalMs: 120_000,
			// Компактный размер кэша для сохранения RAM при 2-4 ГБ
			maxLruCacheEntries: 300,
			// Максимальный размер кэша в RAM (35 МБ — строго < 40 МБ для low-spec ПК с 4GB RAM)
			maxLruCacheBytes: 35 * 1024 * 1024,
			// 5 минут TTL по умолчанию
			defaultCacheTtlMs: 300_000,
			// Отключение агрессивной предзагрузки
			disableAggressivePrefetch: true,
			// Фоновая очистка устаревших по TTL записей каждую минуту
			cachePruneIntervalMs: 60_000,
		};
	}

	return {
		autosaveDebounceMs: 800,
		searchDebounceMs: 200,
		batchFlushDelayMs: 500,
		backgroundSyncIntervalMs: 30_000,
		maxLruCacheEntries: 1200,
		maxLruCacheBytes: 100 * 1024 * 1024,
		defaultCacheTtlMs: 300_000,
		disableAggressivePrefetch: false,
		cachePruneIntervalMs: 60_000,
	};
}

// ---------------------------------------------------------------------------
// IN-MEMORY LRU CACHE (ZERO-DISK, 0 MS ACCESS)
// ---------------------------------------------------------------------------

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

export interface MemoryLruCacheOptions<V = unknown> {
	/** Максимальное количество элементов до срабатывания вытеснения */
	readonly maxEntries?: number;
	/** Время жизни записей по умолчанию в миллисекундах (null = бессрочно до вытеснения) */
	readonly defaultTtlMs?: number | null | undefined;
	/** Максимальный суммарный размер кэша в байтах (на слабом ПК <= 50 МБ) */
	readonly maxBytes?: number | undefined;
	/** Пользовательская функция расчета размера значения в байтах */
	readonly sizeCalculator?: ((value: V) => number) | undefined;
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

// ---------------------------------------------------------------------------
// DEBOUNCED BATCH FLUSHER (ANTI-HDD THRASHING WRITE QUEUE)
// ---------------------------------------------------------------------------

export interface DebouncedBatchFlusherOptions<T> {
	/** Задержка дебаунса перед сбросом накопившейся пачки (мс). По умолчанию берется из getOptimizedTiming() */
	readonly debounceMs?: number;
	/** Максимальное время ожидания гарантированного сброса (мс) */
	readonly maxWaitMs?: number;
	/** Максимальный размер пачки до немедленного сброса */
	readonly maxBatchSize?: number;
	/** Обработчик сброса пачки на диск / в хранилище */
	readonly onFlush: (items: T[]) => void | Promise<void>;
}

/**
 * Очередь пакетной отложенной записи (Debounced Batch Flusher).
 *
 * Вместо того чтобы вызывать синхронный или асинхронный I/O на каждый клик мыши или символ
 * клавиатуры, элементы накапливаются в оперативной памяти и сбрасываются единым блоком:
 * - либо по истечении дебаунса (1200-2000 мс спокойствия),
 * - либо по достижении максимального времени ожидания (maxWaitMs),
 * - либо при переполнении буфера (maxBatchSize),
 * - либо при закрытии вкладки (события beforeunload/pagehide).
 */
export class DebouncedBatchFlusher<T> {
	private buffer: T[] = [];
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly debounceMs: number;
	private readonly maxWaitMs: number;
	private readonly maxBatchSize: number;
	private readonly onFlush: (items: T[]) => void | Promise<void>;
	private isFlushing = false;
	private unloadListener: (() => void) | null = null;

	constructor(options: DebouncedBatchFlusherOptions<T>) {
		const timing = getOptimizedTiming();
		this.debounceMs = options.debounceMs ?? timing.batchFlushDelayMs;
		this.maxWaitMs = options.maxWaitMs ?? Math.max(this.debounceMs * 3, 4000);
		this.maxBatchSize = options.maxBatchSize ?? 50;
		this.onFlush = options.onFlush;

		// Гарантия сохранности данных при закрытии вкладки или перезагрузке
		if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
			this.unloadListener = () => {
				void this.flushNow();
			};
			window.addEventListener("beforeunload", this.unloadListener);
			window.addEventListener("pagehide", this.unloadListener);
		}
	}

	/**
	 * Добавляет элемент в буфер оперативной памяти.
	 */
	add(item: T): void {
		this.buffer.push(item);

		// Если буфер переполнен — сбрасываем немедленно
		if (this.buffer.length >= this.maxBatchSize) {
			void this.flushNow();
			return;
		}

		// Перезапускаем дебаунс-таймер
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(() => {
			void this.flushNow();
		}, this.debounceMs);

		// Запускаем гарантированный таймер ожидания, если он еще не запущен
		if (!this.maxWaitTimer) {
			this.maxWaitTimer = setTimeout(() => {
				void this.flushNow();
			}, this.maxWaitMs);
		}
	}

	/**
	 * Добавляет сразу несколько элементов в буфер.
	 */
	addBatch(items: readonly T[]): void {
		for (const item of items) {
			this.buffer.push(item);
		}

		if (this.buffer.length >= this.maxBatchSize) {
			void this.flushNow();
			return;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(() => {
			void this.flushNow();
		}, this.debounceMs);

		if (!this.maxWaitTimer) {
			this.maxWaitTimer = setTimeout(() => {
				void this.flushNow();
			}, this.maxWaitMs);
		}
	}

	/**
	 * Принудительно выполняет сброс всех накопленных в буфере элементов.
	 */
	async flushNow(): Promise<void> {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (this.maxWaitTimer) {
			clearTimeout(this.maxWaitTimer);
			this.maxWaitTimer = null;
		}

		if (this.buffer.length === 0 || this.isFlushing) {
			return;
		}

		const itemsToFlush = [...this.buffer];
		this.buffer = [];
		this.isFlushing = true;

		try {
			await this.onFlush(itemsToFlush);
		} catch (error) {
			// При сбое восстанавливаем элементы в начало буфера, чтобы не потерять данные
			this.buffer = [...itemsToFlush, ...this.buffer];
			throw error;
		} finally {
			this.isFlushing = false;
		}
	}

	/**
	 * Текущее количество элементов в буфере, ожидающих записи.
	 */
	get pendingCount(): number {
		return this.buffer.length;
	}

	/**
	 * Очищает буфер и снимает слушатели событий (при демонтировании компонента).
	 */
	destroy(): void {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer);
		this.debounceTimer = null;
		this.maxWaitTimer = null;

		if (typeof window !== "undefined" && typeof window.removeEventListener === "function" && this.unloadListener) {
			window.removeEventListener("beforeunload", this.unloadListener);
			window.removeEventListener("pagehide", this.unloadListener);
		}
		this.buffer = [];
	}
}

// ---------------------------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЙ ДЕБАУНС С ПОДДЕРЖКОЙ CANCEL И FLUSH
// ---------------------------------------------------------------------------

export interface DebouncedFunction<Args extends unknown[]> {
	(...args: Args): void;
	readonly cancel: () => void;
	readonly flush: () => void;
}

/**
 * Создает функцию с отложенным вызовом (debounce).
 * Если интервал не передан — берет адаптивный autosaveDebounceMs из getOptimizedTiming().
 */
export function createDebouncedAction<Args extends unknown[]>(
	action: (...args: Args) => void,
	delayMs?: number,
): DebouncedFunction<Args> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Args | null = null;

	const effectiveDelay = delayMs ?? getOptimizedTiming().autosaveDebounceMs;

	const debounced = (...args: Args) => {
		lastArgs = args;
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			timer = null;
			if (lastArgs) {
				action(...lastArgs);
				lastArgs = null;
			}
		}, effectiveDelay);
	};

	debounced.cancel = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		lastArgs = null;
	};

	debounced.flush = () => {
		if (timer && lastArgs) {
			clearTimeout(timer);
			timer = null;
			action(...lastArgs);
			lastArgs = null;
		}
	};

	return debounced;
}
