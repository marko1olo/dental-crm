/**
 * apps/web/src/utils/telemetry/runtimePerformanceMonitor.ts
 *
 * DENTE CRM — Lightweight Dynamic Runtime Host Performance Monitor & Adaptive Controller.
 *
 * Designed under Mandates 8c, 8e, 8k, 8n, 8v:
 * 1. Zero-Observer Effect (< 0.2% CPU): Periodic burst sampling (30-40 frames per 5s) instead
 *    of continuous 24/7 rAF loops. Zero GC allocations on hot sampling path (pre-allocated Float32Array).
 * 2. High-Precision Frame Time Jitter: Computes average FPS, variance (jitter ms), and P95 frame time.
 * 3. Long Task Detection: Integrates with PerformanceObserver (type "longtask", > 50ms) across a sliding window.
 * 4. Memory Pressure Telemetry: Reads Chromium performance.memory (usedJSHeapSize / jsHeapSizeLimit)
 *    to detect dangerous heap exhaustion (> 80-85% limit) before OOM tab crash.
 * 5. Page Visibility Defense: Completely freezes all rAF loops and timers when tab is hidden
 *    (document.visibilityState === "hidden") to save battery and workstation CPU.
 * 6. Dynamic Load State Machine with Hysteresis:
 *    - States: HEALTHY -> WARNING -> DEGRADED -> CRITICAL
 *    - Fast degrade (immediate / within 2s) to protect UI responsiveness and drop CT render load.
 *    - Slow recovery (strictly requires 10s of sustained stability) to prevent anti-pattern thrashing.
 * 7. Quiet Telemetry (Mandate 8v): Silent background operation, no intrusive toasts or blocking popups.
 * 8. Reactive Store & React Hook: useSyncExternalStore subscription for CT viewports and UI layers.
 */

import { useSyncExternalStore } from "react";
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
	/** Milliseconds between sampling bursts during normal state (default: 5000) */
	samplingIntervalMs?: number;
	/** Milliseconds between sampling bursts under load (default: 2500) */
	activeSamplingIntervalMs?: number;
	/** Number of frames sampled per burst (default: 30) */
	sampleWindowFrames?: number;
	/** Sliding window duration for long task tracking in milliseconds (default: 6000) */
	longTaskWindowMs?: number;
	/** Minimum duration of sustained stability required for state upgrade in ms (default: 10000) */
	recoveryDurationMs?: number;
	/** Whether to synchronize data attributes on document.documentElement (default: true) */
	syncDomAttributes?: boolean;
	/** Whether to listen to PerformanceObserver longtask entries if supported (default: true) */
	enableLongTasks?: boolean;
	/** Whether to inspect performance.memory where available (default: true) */
	enableMemory?: boolean;
	/** Callback invoked whenever dynamic state changes */
	onStateChange?: ((snapshot: DynamicPerformanceSnapshot) => void) | undefined;
	/** Custom now() provider for deterministic unit testing */
	now?: () => number;
	/** Custom requestAnimationFrame provider for headless testing */
	requestAnimationFrame?: (cb: (time: number) => void) => number;
	/** Custom cancelAnimationFrame provider for headless testing */
	cancelAnimationFrame?: (id: number) => void;
}

const SEVERITY_RANK: Record<DynamicLoadState, number> = {
	HEALTHY: 0,
	WARNING: 1,
	DEGRADED: 2,
	CRITICAL: 3,
};

const DEFAULT_OPTIONS: Required<Omit<RuntimePerformanceMonitorOptions, "onStateChange" | "now" | "requestAnimationFrame" | "cancelAnimationFrame">> = {
	samplingIntervalMs: 5000,
	activeSamplingIntervalMs: 2500,
	sampleWindowFrames: 30,
	longTaskWindowMs: 6000,
	recoveryDurationMs: 10000,
	syncDomAttributes: true,
	enableLongTasks: true,
	enableMemory: true,
};

export class RuntimePerformanceMonitor {
	private readonly options: Required<Omit<RuntimePerformanceMonitorOptions, "onStateChange" | "now" | "requestAnimationFrame" | "cancelAnimationFrame">> & {
		onStateChange?: ((snapshot: DynamicPerformanceSnapshot) => void) | undefined;
		now: () => number;
		requestAnimationFrame: (cb: (time: number) => void) => number;
		cancelAnimationFrame: (id: number) => void;
	};

	private isRunning = false;
	private isTabVisible = true;
	private isSamplingBurst = false;

	// State Machine
	private currentState: DynamicLoadState = "HEALTHY";
	private previousState: DynamicLoadState = "HEALTHY";
	private stateChangedAt: number;

	// Hysteresis candidate
	private candidateBetterState: DynamicLoadState | null = null;
	private candidateStableSince: number | null = null;

	// Burst sampling ring buffers (Zero GC)
	private readonly frameDeltas: Float32Array;
	private sampleCapacity: number;
	private sampleCount = 0;
	private burstFrameCount = 0;
	private lastFrameTimestamp = 0;
	private burstStartTimestamp = 0;

	// Long Tasks ring buffer
	private readonly longTaskTimestamps: Float64Array;
	private readonly longTaskDurations: Float32Array;
	private readonly maxLongTasks = 32;
	private longTaskHead = 0;
	private longTaskTotalRecorded = 0;

	// Timers and Observers
	private sampleTimerId: ReturnType<typeof setTimeout> | null = null;
	private currentRafId: number | null = null;
	private performanceObserver: PerformanceObserver | null = null;
	private visibilityListener: (() => void) | null = null;

	// Metrics snapshot cache
	private currentMetrics: DynamicPerformanceMetrics;
	private currentSnapshot: DynamicPerformanceSnapshot;

	// Event listeners
	private readonly listeners = new Set<(snapshot: DynamicPerformanceSnapshot) => void>();

	constructor(options: RuntimePerformanceMonitorOptions = {}) {
		const getNow = options.now ?? (typeof performance !== "undefined" && typeof performance.now === "function"
			? () => performance.now()
			: () => Date.now());

		const getRaf = options.requestAnimationFrame ?? (typeof requestAnimationFrame === "function"
			? (cb) => requestAnimationFrame(cb)
			: (cb) => setTimeout(() => cb(getNow()), 16) as unknown as number);

		const getCaf = options.cancelAnimationFrame ?? (typeof cancelAnimationFrame === "function"
			? (id) => cancelAnimationFrame(id)
			: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));

		this.options = {
			...DEFAULT_OPTIONS,
			...options,
			onStateChange: options.onStateChange,
			now: getNow,
			requestAnimationFrame: getRaf,
			cancelAnimationFrame: getCaf,
		};

		this.sampleCapacity = Math.max(32, this.options.sampleWindowFrames * 2);
		this.frameDeltas = new Float32Array(this.sampleCapacity);

		this.longTaskTimestamps = new Float64Array(this.maxLongTasks);
		this.longTaskDurations = new Float32Array(this.maxLongTasks);

		const initTime = this.options.now();
		this.stateChangedAt = initTime;

		this.currentMetrics = {
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
			isTabVisible: true,
		};

		this.currentSnapshot = this.buildSnapshot(initTime);
	}

	/**
	 * Starts background telemetry monitoring.
	 */
	public start(): void {
		if (this.isRunning) return;
		this.isRunning = true;

		// 1. Setup visibility listener
		if (typeof document !== "undefined") {
			this.isTabVisible = document.visibilityState !== "hidden";
			this.visibilityListener = () => {
				const visible = document.visibilityState !== "hidden";
				this.handleVisibilityChange(visible);
			};
			document.addEventListener("visibilitychange", this.visibilityListener);
		}

		// 2. Setup PerformanceObserver for Long Tasks
		if (this.options.enableLongTasks && typeof PerformanceObserver !== "undefined") {
			try {
				const supported = PerformanceObserver.supportedEntryTypes;
				if (supported && supported.includes("longtask")) {
					this.performanceObserver = new PerformanceObserver((list) => {
						const entries = list.getEntries();
						for (let i = 0; i < entries.length; i++) {
							const entry = entries[i];
							this.recordLongTask(entry.duration, entry.startTime);
						}
					});
					this.performanceObserver.observe({ entryTypes: ["longtask"] });
				}
			} catch {
				// Safe fallback: PerformanceObserver might fail in restricted iframes
				this.performanceObserver = null;
			}
		}

		// 3. Schedule first burst sample
		if (this.isTabVisible) {
			this.scheduleNextBurst(100);
		}
	}

	/**
	 * Stops background monitoring and cleans up all active timers and observers.
	 */
	public stop(): void {
		if (!this.isRunning) return;
		this.isRunning = false;

		this.cancelPendingTimers();

		if (this.visibilityListener && typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", this.visibilityListener);
			this.visibilityListener = null;
		}

		if (this.performanceObserver) {
			try {
				this.performanceObserver.disconnect();
			} catch {
				// Ignore disconnect errors
			}
			this.performanceObserver = null;
		}
	}

	/**
	 * Returns current performance snapshot.
	 */
	public getSnapshot(): DynamicPerformanceSnapshot {
		return this.currentSnapshot;
	}

	/**
	 * Subscribes a listener to snapshot changes.
	 */
	public subscribe(listener: (snapshot: DynamicPerformanceSnapshot) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Manually triggers a burst sample (useful when heavy CT slice scrubbing starts).
	 */
	public sampleNow(): void {
		if (!this.isRunning || !this.isTabVisible || this.isSamplingBurst) return;
		this.cancelPendingTimers();
		this.startSamplingBurst();
	}

	/**
	 * Injects a synthetic frame time delta for testing or external RAF hooks.
	 */
	public recordFrameDelta(deltaMs: number, now: number = this.options.now()): void {
		if (deltaMs <= 0) return;
		const idx = this.sampleCount % this.sampleCapacity;
		this.frameDeltas[idx] = deltaMs;
		this.sampleCount++;
		this.evaluateAfterBurst(now);
	}

	/**
	 * Injects a synthetic long task record for testing.
	 */
	public recordLongTask(durationMs: number, startTime: number = this.options.now()): void {
		if (durationMs <= 0) return;
		const idx = this.longTaskHead;
		this.longTaskTimestamps[idx] = startTime;
		this.longTaskDurations[idx] = durationMs;
		this.longTaskHead = (this.longTaskHead + 1) % this.maxLongTasks;
		this.longTaskTotalRecorded++;

		this.recalculateLongTaskMetrics(startTime);
		this.evaluateDynamicState(startTime);
	}

	/**
	 * Completely resets internal metrics to healthy baseline.
	 */
	public reset(): void {
		const now = this.options.now();
		this.currentState = "HEALTHY";
		this.previousState = "HEALTHY";
		this.stateChangedAt = now;
		this.candidateBetterState = null;
		this.candidateStableSince = null;
		this.sampleCount = 0;
		this.burstFrameCount = 0;
		this.longTaskHead = 0;
		this.longTaskTotalRecorded = 0;

		this.currentMetrics = {
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
			isTabVisible: this.isTabVisible,
		};

		this.updateSnapshot(now);
	}

	// ========================================================================
	// PRIVATE IMPLEMENTATION DETAILS
	// ========================================================================

	private handleVisibilityChange(visible: boolean): void {
		this.isTabVisible = visible;
		(this.currentMetrics as { isTabVisible: boolean }).isTabVisible = visible;

		if (!visible) {
			// Tab is hidden: freeze all timers and cancel active RAF
			this.cancelPendingTimers();
			this.isSamplingBurst = false;
		} else {
			// Tab returned to foreground: give browser 400ms to stabilize, then sample
			this.cancelPendingTimers();
			this.scheduleNextBurst(400);
		}
	}

	private cancelPendingTimers(): void {
		if (this.sampleTimerId !== null) {
			clearTimeout(this.sampleTimerId);
			this.sampleTimerId = null;
		}
		if (this.currentRafId !== null) {
			this.options.cancelAnimationFrame(this.currentRafId);
			this.currentRafId = null;
		}
	}

	private scheduleNextBurst(delayMs?: number): void {
		if (!this.isRunning || !this.isTabVisible) return;

		const delay = delayMs !== undefined
			? delayMs
			: this.currentState === "HEALTHY"
				? this.options.samplingIntervalMs
				: this.options.activeSamplingIntervalMs;

		this.sampleTimerId = setTimeout(() => {
			this.sampleTimerId = null;
			this.startSamplingBurst();
		}, delay);
	}

	private startSamplingBurst(): void {
		if (!this.isRunning || !this.isTabVisible) return;

		this.isSamplingBurst = true;
		this.burstFrameCount = 0;
		this.burstStartTimestamp = this.options.now();
		this.lastFrameTimestamp = this.burstStartTimestamp;

		const onFrame = (now: number) => {
			if (!this.isRunning || !this.isTabVisible || !this.isSamplingBurst) {
				this.currentRafId = null;
				return;
			}

			const deltaMs = now - this.lastFrameTimestamp;
			this.lastFrameTimestamp = now;

			// Skip first frame if delta is abnormally huge (e.g. resuming from sleep)
			if (this.burstFrameCount > 0 && deltaMs > 0 && deltaMs < 2000) {
				const idx = this.sampleCount % this.sampleCapacity;
				this.frameDeltas[idx] = deltaMs;
				this.sampleCount++;
			}

			this.burstFrameCount++;

			if (this.burstFrameCount >= this.options.sampleWindowFrames) {
				this.isSamplingBurst = false;
				this.currentRafId = null;
				this.evaluateAfterBurst(now);
				this.scheduleNextBurst();
			} else {
				this.currentRafId = this.options.requestAnimationFrame(onFrame);
			}
		};

		this.currentRafId = this.options.requestAnimationFrame(onFrame);
	}

	private evaluateAfterBurst(now: number): void {
		this.recalculateFpsMetrics();
		this.recalculateMemoryMetrics();
		this.recalculateLongTaskMetrics(now);
		this.evaluateDynamicState(now);
	}

	private recalculateFpsMetrics(): void {
		const count = Math.min(this.sampleCount, this.options.sampleWindowFrames);
		if (count <= 0) return;

		let sumDelta = 0;
		let minDelta = Infinity;
		let maxDelta = 0;

		const recentDeltas: number[] = [];
		for (let i = 0; i < count; i++) {
			const idx = (this.sampleCount - 1 - i + this.sampleCapacity * 10) % this.sampleCapacity;
			const d = this.frameDeltas[idx];
			if (d !== undefined && d > 0) {
				sumDelta += d;
				if (d < minDelta) minDelta = d;
				if (d > maxDelta) maxDelta = d;
				recentDeltas.push(d);
			}
		}

		if (recentDeltas.length === 0) return;

		const avgDelta = sumDelta / recentDeltas.length;
		const instantDelta = recentDeltas[0] ?? 16.6;

		// Calculate variance / jitter (Standard Deviation)
		let varianceSum = 0;
		for (let i = 0; i < recentDeltas.length; i++) {
			const val = recentDeltas[i] ?? avgDelta;
			const diff = val - avgDelta;
			varianceSum += diff * diff;
		}
		const jitterMs = Math.round(Math.sqrt(varianceSum / recentDeltas.length) * 10) / 10;

		// Calculate P95 frame time
		recentDeltas.sort((a, b) => a - b);
		const p95Index = Math.min(
			recentDeltas.length - 1,
			Math.floor(recentDeltas.length * 0.95),
		);
		const p95FrameTimeMs = Math.round((recentDeltas[p95Index] ?? avgDelta) * 10) / 10;

		const instantFps = Math.min(120, Math.max(1, Math.round(1000 / instantDelta)));
		const averageFps = Math.min(120, Math.max(1, Math.round(1000 / avgDelta)));
		const minFps = maxDelta > 0 ? Math.max(1, Math.round(1000 / maxDelta)) : averageFps;
		const maxFps = minDelta > 0 ? Math.min(120, Math.round(1000 / minDelta)) : averageFps;

		this.currentMetrics = {
			...this.currentMetrics,
			instantFps,
			averageFps,
			minFps,
			maxFps,
			jitterMs,
			p95FrameTimeMs,
			sampleCount: this.sampleCount,
		};
	}

	private recalculateMemoryMetrics(): void {
		if (!this.options.enableMemory || typeof performance === "undefined") {
			return;
		}

		const memory = (performance as unknown as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } }).memory;
		if (memory && typeof memory.usedJSHeapSize === "number" && typeof memory.jsHeapSizeLimit === "number") {
			const usedMb = Math.round(memory.usedJSHeapSize / (1024 * 1024));
			const limitMb = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
			const pressureRatio = limitMb > 0 ? Math.round((usedMb / limitMb) * 100) / 100 : null;

			this.currentMetrics = {
				...this.currentMetrics,
				usedHeapMb: usedMb,
				heapLimitMb: limitMb,
				memoryPressureRatio: pressureRatio,
			};
		}
	}

	private recalculateLongTaskMetrics(now: number): void {
		const windowStart = now - this.options.longTaskWindowMs;
		let count = 0;
		let totalDuration = 0;
		let maxDuration = 0;

		const recordedCount = Math.min(this.longTaskTotalRecorded, this.maxLongTasks);
		for (let i = 0; i < recordedCount; i++) {
			const idx = (this.longTaskHead - 1 - i + this.maxLongTasks * 10) % this.maxLongTasks;
			const time = this.longTaskTimestamps[idx];
			if (time !== undefined && time >= windowStart) {
				const duration = this.longTaskDurations[idx];
				if (duration !== undefined) {
					count++;
					totalDuration += duration;
					if (duration > maxDuration) {
						maxDuration = duration;
					}
				}
			}
		}

		this.currentMetrics = {
			...this.currentMetrics,
			longTaskCount: count,
			totalLongTaskDurationMs: Math.round(totalDuration),
			maxLongTaskDurationMs: Math.round(maxDuration),
		};
	}

	private evaluateDynamicState(now: number): void {
		const m = this.currentMetrics;
		const rawState = this.computeRawState(m);

		const currentRank = SEVERITY_RANK[this.currentState];
		const rawRank = SEVERITY_RANK[rawState];

		if (rawRank > currentRank) {
			// ====================================================================
			// FAST DEGRADATION PATH:
			// Instantly transition to worse state to prevent tab freeze & drop render load
			// ====================================================================
			this.candidateBetterState = null;
			this.candidateStableSince = null;
			this.applyStateChange(rawState, now);
			return;
		}

		if (rawRank < currentRank) {
			// ====================================================================
			// SLOW RECOVERY PATH (HYSTERESIS):
			// Strictly requires 10s of sustained stability before state upgrade
			// ====================================================================
			if (this.candidateBetterState !== rawState) {
				this.candidateBetterState = rawState;
				this.candidateStableSince = now;
			} else if (this.candidateStableSince !== null) {
				const stableDuration = now - this.candidateStableSince;
				if (stableDuration >= this.options.recoveryDurationMs) {
					this.candidateBetterState = null;
					this.candidateStableSince = null;
					this.applyStateChange(rawState, now);
					return;
				}
			}
			this.updateSnapshot(now);
			return;
		}

		// Raw state matches current state — clear recovery candidate if any
		this.candidateBetterState = null;
		this.candidateStableSince = null;
		this.updateSnapshot(now);
	}

	private computeRawState(m: DynamicPerformanceMetrics): DynamicLoadState {
		// 1. Critical threshold checks (Catastrophic overload / impending OOM crash)
		const isCriticalFps = m.averageFps < 18;
		const isCriticalJitter = m.p95FrameTimeMs > 120;
		const isCriticalLongTasks = m.totalLongTaskDurationMs > 800 || m.maxLongTaskDurationMs > 400;
		const isCriticalMemory = m.memoryPressureRatio !== null && m.memoryPressureRatio > 0.85;

		if (isCriticalFps || isCriticalJitter || isCriticalLongTasks || isCriticalMemory) {
			return "CRITICAL";
		}

		// 2. Degraded threshold checks (Severe lag / frame drops)
		const isDegradedFps = m.averageFps < 32;
		const isDegradedJitter = m.p95FrameTimeMs > 60 || m.jitterMs > 25;
		const isDegradedLongTasks = m.totalLongTaskDurationMs > 250 || m.longTaskCount >= 3;
		const isDegradedMemory = m.memoryPressureRatio !== null && m.memoryPressureRatio > 0.80;

		if (isDegradedFps || isDegradedJitter || isDegradedLongTasks || isDegradedMemory) {
			return "DEGRADED";
		}

		// 3. Warning threshold checks (Microstutter / moderate load)
		const isWarningFps = m.averageFps < 52;
		const isWarningJitter = m.p95FrameTimeMs > 35 || m.jitterMs > 12;
		const isWarningLongTasks = m.totalLongTaskDurationMs > 80 || m.longTaskCount >= 1;
		const isWarningMemory = m.memoryPressureRatio !== null && m.memoryPressureRatio > 0.70;

		if (isWarningFps || isWarningJitter || isWarningLongTasks || isWarningMemory) {
			return "WARNING";
		}

		// 4. Healthy (Smooth 60 FPS, no long tasks, low memory)
		return "HEALTHY";
	}

	private applyStateChange(nextState: DynamicLoadState, now: number): void {
		if (this.currentState === nextState) return;

		this.previousState = this.currentState;
		this.currentState = nextState;
		this.stateChangedAt = now;

		this.updateSnapshot(now);

		if (this.options.syncDomAttributes) {
			this.syncDom(nextState);
		}

		if (this.options.onStateChange) {
			try {
				this.options.onStateChange(this.currentSnapshot);
			} catch {
				// Prevent client callback errors from crashing monitor
			}
		}
	}

	private updateSnapshot(now: number): void {
		this.currentSnapshot = this.buildSnapshot(now);
		for (const listener of this.listeners) {
			try {
				listener(this.currentSnapshot);
			} catch {
				// Ignore listener errors
			}
		}
	}

	private buildSnapshot(now: number): DynamicPerformanceSnapshot {
		const state = this.currentState;

		// Calculate adaptive recommendations
		let downscaleFactor = 1.0;
		let targetFpsCap = 60;
		let recommendedBlurDisabled = false;

		switch (state) {
			case "HEALTHY":
				downscaleFactor = 1.0;
				targetFpsCap = 60;
				recommendedBlurDisabled = false;
				break;
			case "WARNING":
				downscaleFactor = 0.85;
				targetFpsCap = 45;
				recommendedBlurDisabled = false;
				break;
			case "DEGRADED":
				downscaleFactor = 0.65;
				targetFpsCap = 30;
				recommendedBlurDisabled = true;
				break;
			case "CRITICAL":
				downscaleFactor = 0.45;
				targetFpsCap = 15;
				recommendedBlurDisabled = true;
				break;
		}

		return {
			timestamp: now,
			state,
			previousState: this.previousState,
			stateChangedAt: this.stateChangedAt,
			metrics: { ...this.currentMetrics },
			isThrottlingRecommended: state !== "HEALTHY",
			downscaleFactor,
			targetFpsCap,
			recommendedBlurDisabled,
		};
	}

	private syncDom(state: DynamicLoadState): void {
		if (typeof document === "undefined" || !document.documentElement) return;

		const root = document.documentElement;
		root.setAttribute("data-dynamic-load", state.toLowerCase());
		root.setAttribute("data-dynamic-fps", String(this.currentMetrics.averageFps));

		if (state === "DEGRADED" || state === "CRITICAL") {
			root.setAttribute("data-blur-disabled", "true");
			root.setAttribute("data-perf-state", "degraded");
		} else {
			root.removeAttribute("data-blur-disabled");
			root.setAttribute("data-perf-state", "healthy");
		}
	}
}

// ============================================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================================

let globalMonitorInstance: RuntimePerformanceMonitor | null = null;

/**
 * Returns the canonical global singleton RuntimePerformanceMonitor instance.
 * Automatically initializes and starts on first access in browser environments.
 */
export function getRuntimePerformanceMonitor(): RuntimePerformanceMonitor {
	if (!globalMonitorInstance) {
		globalMonitorInstance = new RuntimePerformanceMonitor();
		if (typeof window !== "undefined") {
			globalMonitorInstance.start();
		}
	}
	return globalMonitorInstance;
}

/**
 * Subscribes to real-time performance state changes.
 */
export function subscribeToPerformanceStateChange(
	listener: (snapshot: DynamicPerformanceSnapshot) => void,
): () => void {
	return getRuntimePerformanceMonitor().subscribe(listener);
}

/**
 * Returns current snapshot synchronously.
 */
export function getDynamicPerformanceSnapshot(): DynamicPerformanceSnapshot {
	return getRuntimePerformanceMonitor().getSnapshot();
}

/**
 * React 19 Hook: useDynamicPerformanceState
 * Seamlessly delivers reactive dynamic performance snapshot to CT viewports and UI components.
 */
export function useDynamicPerformanceState(): DynamicPerformanceSnapshot {
	const monitor = getRuntimePerformanceMonitor();
	return useSyncExternalStore(
		(cb) => monitor.subscribe(cb),
		() => monitor.getSnapshot(),
		() => monitor.getSnapshot(),
	);
}
