/**
 * DENTE CRM — Runtime Host Performance Monitor Implementation
 */

import { FpsTelemetrySampler } from "./fpsTelemetrySampler.js";
import { LongTaskObserver } from "./longTaskObserver.js";
import { processBurstMetrics } from "./performanceEvaluator.js";
import { attachLifecycleObservers, detachLifecycleObservers, type LifecycleObservers } from "./performanceMonitorLifecycle.js";
import { PerformanceSamplerLoop } from "./performanceSamplerLoop.js";
import { PerformanceStateStore, createInitialMetrics } from "./performanceStateStore.js";
import { DEFAULT_MONITOR_OPTIONS, type DynamicLoadState, type DynamicPerformanceSnapshot, type RuntimePerformanceMonitorOptions } from "./performanceTypes.js";

export class RuntimePerformanceMonitor {
	private readonly options: any;
	private isRunning = false;
	private isTabVisible = true;
	private isBatteryThrottling = false;
	private currentState: DynamicLoadState = "HEALTHY";
	private previousState: DynamicLoadState = "HEALTHY";
	private stateChangedAt: number;
	private candidateBetterState: DynamicLoadState | null = null;
	private candidateStableSince: number | null = null;
	private readonly fpsSampler: FpsTelemetrySampler;
	private readonly longTaskObs: LongTaskObserver;
	private readonly samplerLoop: PerformanceSamplerLoop;
	private readonly store: PerformanceStateStore;
	private observers: LifecycleObservers = { visibilityListener: null, performanceObserver: null };

	constructor(options: RuntimePerformanceMonitorOptions = {}) {
		const getNow = options.now ?? (typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : () => Date.now());
		const getRaf = options.requestAnimationFrame ?? (typeof requestAnimationFrame === "function" ? (cb) => requestAnimationFrame(cb) : (cb) => setTimeout(() => cb(getNow()), 16) as unknown as number);
		const getCaf = options.cancelAnimationFrame ?? (typeof cancelAnimationFrame === "function" ? (id) => cancelAnimationFrame(id) : (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));

		this.options = { ...DEFAULT_MONITOR_OPTIONS, ...options, onStateChange: options.onStateChange, now: getNow, requestAnimationFrame: getRaf, cancelAnimationFrame: getCaf };
		this.fpsSampler = new FpsTelemetrySampler(this.options.sampleWindowFrames);
		this.longTaskObs = new LongTaskObserver();
		this.samplerLoop = new PerformanceSamplerLoop({
			isRunning: () => this.isRunning,
			isTabVisible: () => this.isTabVisible,
			now: this.options.now,
			raf: this.options.requestAnimationFrame,
			caf: this.options.cancelAnimationFrame,
			sampleWindowFrames: this.options.sampleWindowFrames,
			fpsSampler: this.fpsSampler,
			onBurstComplete: (now) => { this.evaluateAfterBurst(now); this.scheduleBurst(); },
		});
		this.stateChangedAt = this.options.now();
		this.store = new PerformanceStateStore(this.stateChangedAt, this.isTabVisible);
	}

	public start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.observers = attachLifecycleObservers({
			onVisibilityChange: (vis) => {
				this.isTabVisible = vis;
				this.store.currentMetrics.isTabVisible = vis;
				this.samplerLoop.cancel();
				if (vis) this.scheduleBurst(400);
			},
			onLongTask: (d, s) => this.recordLongTask(d, s),
			enableLongTasks: this.options.enableLongTasks,
		});
		if (this.isTabVisible) this.scheduleBurst(100);
	}

	public stop(): void {
		if (!this.isRunning) return;
		this.isRunning = false;
		this.samplerLoop.cancel();
		detachLifecycleObservers(this.observers);
	}

	public getSnapshot(): DynamicPerformanceSnapshot { return this.store.currentSnapshot; }
	public getBatteryThrottling(): boolean { return this.isBatteryThrottling; }
	public subscribe(listener: (snapshot: DynamicPerformanceSnapshot) => void): () => void { return this.store.subscribe(listener); }
	public sampleNow(): void { if (this.isRunning && this.isTabVisible && !this.samplerLoop.isSampling()) { this.samplerLoop.cancel(); this.samplerLoop.startBurst(); } }
	public recordFrameDelta(d: number, now: number = this.options.now()): void { this.fpsSampler.recordDelta(d); this.evaluateAfterBurst(now); }
	public recordLongTask(d: number, s: number = this.options.now()): void { this.longTaskObs.record(d, s); this.evaluateAfterBurst(s); }
	public setBatteryThrottling(active: boolean): void {
		if (this.isBatteryThrottling === active) return;
		this.isBatteryThrottling = active;
		this.store.update(this.currentState, this.previousState, this.stateChangedAt, this.store.currentMetrics, this.isBatteryThrottling, this.options.now(), this.options.syncDomAttributes);
	}

	public reset(): void {
		const now = this.options.now();
		this.currentState = "HEALTHY";
		this.previousState = "HEALTHY";
		this.stateChangedAt = now;
		this.isBatteryThrottling = false;
		this.candidateBetterState = null;
		this.candidateStableSince = null;
		this.fpsSampler.reset();
		this.longTaskObs.reset();
		this.samplerLoop.cancel();
		this.store.update("HEALTHY", "HEALTHY", now, createInitialMetrics(this.isTabVisible), false, now, this.options.syncDomAttributes);
	}

	private scheduleBurst(delayMs?: number): void {
		this.samplerLoop.schedule(delayMs ?? (this.currentState === "HEALTHY" ? this.options.samplingIntervalMs : this.options.activeSamplingIntervalMs));
	}

	private evaluateAfterBurst(now: number): void {
		const ctx = { currentState: this.currentState, candidateBetterState: this.candidateBetterState, candidateStableSince: this.candidateStableSince, recoveryDurationMs: this.options.recoveryDurationMs };
		const res = processBurstMetrics(this.fpsSampler, this.longTaskObs, this.store, ctx, now, this.isTabVisible);
		this.candidateBetterState = res.candidate.better;
		this.candidateStableSince = res.candidate.since;
		if (res.nextState) { this.previousState = this.currentState; this.currentState = res.nextState; this.stateChangedAt = now; }
		this.store.update(this.currentState, this.previousState, this.stateChangedAt, res.metrics, this.isBatteryThrottling, now, this.options.syncDomAttributes);
		if (res.nextState) try { this.options.onStateChange?.(this.store.currentSnapshot); } catch {}
	}
}
