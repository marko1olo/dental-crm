/**
 * lowSpecHdd/index.ts — единая точка входа для модулей lowSpecHdd.
 * Layer 4: Module aggregator & barrel.
 */

export type {
	DeviceCapabilities,
	OptimizedTimingConfig,
	DiskBenchmarkOptions,
	DiskBenchmarkResult,
	MemoryLruCacheOptions,
	DebouncedBatchFlusherOptions,
	DebouncedFunction,
} from "./types.js";

export {
	getDiskBenchmarkResult,
	setCachedDiskBenchmark,
} from "./benchmarkStore.js";

export {
	isLowSpecDevice,
	getDeviceCapabilities,
	setForcedLowSpecMode,
} from "./hardwareDetector.js";

export {
	getOptimizedTiming,
	getDebounceInterval,
} from "./timingConfig.js";

export {
	measureIndexedDbDiskSpeed,
} from "./diskBenchmarkEngine.js";

export {
	estimateObjectByteSize,
	MemoryLruCache,
	createMemoryLruCache,
} from "./lruCache.js";

export {
	DebouncedBatchFlusher,
	createDebouncedAction,
} from "./batchFlusher.js";
