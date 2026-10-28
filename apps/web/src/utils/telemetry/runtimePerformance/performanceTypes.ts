/**
 * DENTE CRM — Dynamic Performance Telemetry Types
 */

import type {
	DynamicLoadState,
	DynamicPerformanceMetrics,
	DynamicPerformanceSnapshot,
} from "@dental/shared/hardware";

export type {
	DynamicLoadState,
	DynamicPerformanceMetrics,
	DynamicPerformanceSnapshot,
};

export interface RuntimePerformanceMonitorOptions {
	samplingIntervalMs?: number;
	activeSamplingIntervalMs?: number;
	sampleWindowFrames?: number;
	longTaskWindowMs?: number;
	recoveryDurationMs?: number;
	syncDomAttributes?: boolean;
	enableLongTasks?: boolean;
	enableMemory?: boolean;
	onStateChange?: ((snapshot: DynamicPerformanceSnapshot) => void) | undefined;
	now?: () => number;
	requestAnimationFrame?: (cb: (time: number) => void) => number;
	cancelAnimationFrame?: (id: number) => void;
}

export const SEVERITY_RANK: Record<DynamicLoadState, number> = {
	HEALTHY: 0,
	WARNING: 1,
	DEGRADED: 2,
	CRITICAL: 3,
};

export const DEFAULT_MONITOR_OPTIONS = {
	samplingIntervalMs: 5000,
	activeSamplingIntervalMs: 2500,
	sampleWindowFrames: 30,
	longTaskWindowMs: 6000,
	recoveryDurationMs: 10000,
	syncDomAttributes: true,
	enableLongTasks: true,
	enableMemory: true,
};
