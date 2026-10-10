/**
 * lowSpecHdd/types.ts — типы и контракты для оптимизатора слабого железа и медленных дисков.
 * Layer 0: Чистые типы и интерфейсы без рантайм-зависимостей.
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
	/** Обнаружен ли медленный диск (HDD 5400 RPM) по бенчмарку записи в IndexedDB */
	readonly isSlowHdd?: boolean | undefined;
	/** Время записи 100 КБ блока в IndexedDB (мс) */
	readonly diskWriteTimeMs?: number | null | undefined;
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

export interface DiskBenchmarkOptions {
	readonly chunkSizeKb?: number | undefined;
	readonly slowThresholdMs?: number | undefined;
	readonly forceRetest?: boolean | undefined;
}

export interface DiskBenchmarkResult {
	readonly isSlowDisk: boolean;
	readonly writeTimeMs: number;
	readonly chunkBytes: number;
	readonly error?: string | undefined;
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

export interface DebouncedFunction<Args extends unknown[]> {
	(...args: Args): void;
	readonly cancel: () => void;
	readonly flush: () => void;
}
