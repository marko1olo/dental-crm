/**
 * lowSpecHddOptimizer.ts — тонкий канонический фасад оптимизатора слабого железа и медленных дисков.
 *
 * ДЕКОМПОЗИЦИЯ:
 * Полная реализация декомпозирована в модульную поддиректорию ./lowSpecHdd/
 * в соответствии с Мандатом 8b (лимит файлов <= 800 строк, тонкий фасад <= 50 строк).
 */

export type {
	DeviceCapabilities,
	OptimizedTimingConfig,
	DiskBenchmarkOptions,
	DiskBenchmarkResult,
	MemoryLruCacheOptions,
	DebouncedBatchFlusherOptions,
	DebouncedFunction,
} from "./lowSpecHdd/types.js";

export {
	getDiskBenchmarkResult,
	setCachedDiskBenchmark,
} from "./lowSpecHdd/benchmarkStore.js";

export {
	isLowSpecDevice,
	getDeviceCapabilities,
	setForcedLowSpecMode,
} from "./lowSpecHdd/hardwareDetector.js";

export {
	getOptimizedTiming,
	getDebounceInterval,
} from "./lowSpecHdd/timingConfig.js";

export {
	measureIndexedDbDiskSpeed,
} from "./lowSpecHdd/diskBenchmarkEngine.js";

export {
	estimateObjectByteSize,
	MemoryLruCache,
	createMemoryLruCache,
} from "./lowSpecHdd/lruCache.js";

export {
	DebouncedBatchFlusher,
	createDebouncedAction,
} from "./lowSpecHdd/batchFlusher.js";
