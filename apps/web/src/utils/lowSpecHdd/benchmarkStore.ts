/**
 * lowSpecHdd/benchmarkStore.ts — хранилище состояния бенчмарка диска и принудительного режима low-spec.
 * Layer 1: In-Memory State & DOM sync.
 */

import type { DiskBenchmarkResult } from "./types.js";

let cachedDiskBenchmark: DiskBenchmarkResult | null = null;
let forcedLowSpecMode: boolean | null = null;

export function getDiskBenchmarkResult(): DiskBenchmarkResult | null {
	return cachedDiskBenchmark;
}

export function getForcedLowSpecMode(): boolean | null {
	return forcedLowSpecMode;
}

export function setForcedLowSpecMode(mode: boolean | null): void {
	forcedLowSpecMode = mode;
}

export function setCachedDiskBenchmark(res: DiskBenchmarkResult | null): void {
	cachedDiskBenchmark = res;
	if (res?.isSlowDisk) {
		setForcedLowSpecMode(true);
		if (typeof document !== "undefined") {
			const root = document.documentElement;
			root.setAttribute("data-low-spec", "true");
			root.setAttribute("data-perf", "low");
			root.setAttribute("data-hardware-tier", "low");
			root.classList.add("low-spec-mode");
			root.classList.add("low-spec-perf");
		}
	}
}
