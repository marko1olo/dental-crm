/**
 * DENTE CRM — Memory Pressure & Heap Exhaustion Telemetry
 *
 * Inspects Chromium performance.memory to detect impending OOM before crash.
 * Zero-simulation: strictly factual hardware telemetry.
 */

export interface MemoryMetrics {
	usedHeapMb: number | null;
	heapLimitMb: number | null;
	memoryPressureRatio: number | null;
}

export function sampleMemoryPressure(enabled: boolean = true): MemoryMetrics {
	if (!enabled || typeof performance === "undefined") {
		return { usedHeapMb: null, heapLimitMb: null, memoryPressureRatio: null };
	}

	const memory = (performance as unknown as {
		memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number };
	}).memory;

	if (memory && typeof memory.usedJSHeapSize === "number" && typeof memory.jsHeapSizeLimit === "number") {
		const usedMb = Math.round(memory.usedJSHeapSize / (1024 * 1024));
		const limitMb = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
		const memoryPressureRatio = limitMb > 0 ? Math.round((usedMb / limitMb) * 100) / 100 : null;

		return { usedHeapMb: usedMb, heapLimitMb: limitMb, memoryPressureRatio };
	}

	return { usedHeapMb: null, heapLimitMb: null, memoryPressureRatio: null };
}
