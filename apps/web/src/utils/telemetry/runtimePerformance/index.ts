/**
 * DENTE CRM — Dynamic Runtime Host Performance Monitor Entry Point
 */

import { useSyncExternalStore } from "react";
import { RuntimePerformanceMonitor } from "./runtimePerformanceMonitorClass.js";
import type {
	DynamicLoadState,
	DynamicPerformanceMetrics,
	DynamicPerformanceSnapshot,
	RuntimePerformanceMonitorOptions,
} from "./performanceTypes.js";

export type {
	DynamicLoadState,
	DynamicPerformanceMetrics,
	DynamicPerformanceSnapshot,
	RuntimePerformanceMonitorOptions,
};

export { RuntimePerformanceMonitor };

let globalMonitorInstance: RuntimePerformanceMonitor | null = null;

export function getRuntimePerformanceMonitor(): RuntimePerformanceMonitor {
	if (!globalMonitorInstance) {
		globalMonitorInstance = new RuntimePerformanceMonitor();
		if (typeof window !== "undefined") {
			globalMonitorInstance.start();
		}
	}
	return globalMonitorInstance;
}

export function subscribeToPerformanceStateChange(
	listener: (snapshot: DynamicPerformanceSnapshot) => void,
): () => void {
	return getRuntimePerformanceMonitor().subscribe(listener);
}

export function getDynamicPerformanceSnapshot(): DynamicPerformanceSnapshot {
	return getRuntimePerformanceMonitor().getSnapshot();
}

export function useDynamicPerformanceState(): DynamicPerformanceSnapshot {
	const monitor = getRuntimePerformanceMonitor();
	return useSyncExternalStore(
		(cb) => monitor.subscribe(cb),
		() => monitor.getSnapshot(),
		() => monitor.getSnapshot(),
	);
}
