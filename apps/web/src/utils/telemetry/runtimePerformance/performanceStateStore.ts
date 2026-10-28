/**
 * DENTE CRM — Performance Metrics Store & Listener Registry
 */

import { buildPerformanceSnapshot, syncDomAttributes } from "./performanceStateMachine.js";
import type {
	DynamicLoadState,
	DynamicPerformanceMetrics,
	DynamicPerformanceSnapshot,
} from "./performanceTypes.js";

export function createInitialMetrics(isTabVisible: boolean): DynamicPerformanceMetrics {
	return {
		instantFps: 60,
		averageFps: 60,
		minFps: 60,
		maxFps: 60,
		jitterMs: 0,
		p95FrameTimeMs: 16.6,
		sampleCount: 0,
		longTaskCount: 0,
		totalLongTaskDurationMs: 0,
		maxLongTaskDurationMs: 0,
		memoryPressureRatio: null,
		usedHeapMb: null,
		heapLimitMb: null,
		isTabVisible,
	};
}

export class PerformanceStateStore {
	private readonly listeners = new Set<(snapshot: DynamicPerformanceSnapshot) => void>();
	public currentMetrics: DynamicPerformanceMetrics;
	public currentSnapshot: DynamicPerformanceSnapshot;

	constructor(now: number, isTabVisible: boolean) {
		this.currentMetrics = createInitialMetrics(isTabVisible);
		this.currentSnapshot = buildPerformanceSnapshot("HEALTHY", "HEALTHY", now, this.currentMetrics, false, now);
	}

	public subscribe(listener: (snapshot: DynamicPerformanceSnapshot) => void): () => void {
		this.listeners.add(listener);
		return () => { this.listeners.delete(listener); };
	}

	public update(
		state: DynamicLoadState,
		prevState: DynamicLoadState,
		stateChangedAt: number,
		metrics: DynamicPerformanceMetrics,
		isBatteryThrottling: boolean,
		now: number,
		syncDom: boolean,
	): void {
		this.currentMetrics = metrics;
		this.currentSnapshot = buildPerformanceSnapshot(state, prevState, stateChangedAt, metrics, isBatteryThrottling, now);
		if (syncDom) syncDomAttributes(state, metrics.averageFps, isBatteryThrottling);
		for (const l of this.listeners) {
			try { l(this.currentSnapshot); } catch {}
		}
	}
}
