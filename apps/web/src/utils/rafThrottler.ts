/**
 * apps/web/src/utils/rafThrottler.ts
 *
 * High-Performance Adaptive RequestAnimationFrame (RAF) Throttler & Coalescing Engine.
 * Tailored for weak integrated GPUs (Intel HD Graphics 3000/4000/520/620) in Dental CRM.
 *
 * Key Architecture & Features:
 * 1. Adaptive Frame Rate Capping: Automatically drops from 60 FPS down to 30-40 FPS
 *    when frame execution duration exceeds the render budget, preventing CPU 100%
 *    lockup, thermal throttling, and dropped frames during heavy CT slice scrubbing,
 *    odontogram surface tracking, and periodontogram heatmap updates.
 * 2. Coalescing RAF: Groups burst updates within the same frame interval into a single
 *    render pass with the latest payload, preventing frame queue buildup.
 * 3. Zero-GC on Hot Path: Pre-allocated frame telemetry objects and reused state
 *    to avoid triggering V8 minor/major GC collections.
 * 4. Hardware Concurrency & GPU Tier Detection: Automatically identifies low-end hardware
 *    (<= 4 CPU cores, <= 4GB RAM, or slow integrated GPU).
 * 5. React Hook: useRafThrottledCallback with automatic teardown on unmount.
 */

import { useEffect, useRef } from "react";

export type GpuPerformanceTier = "low" | "medium" | "high";

/**
 * Detects whether the client is operating on low-tier hardware / integrated GPU.
 * Uses hardwareConcurrency, deviceMemory, and WebGL debug renderer info where accessible.
 */
export function detectGpuPerformanceTier(): GpuPerformanceTier {
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return "medium";
	}

	// 1. CPU core count check: <= 4 threads is typical for older dual-core / quad-thread laptops
	const cores = navigator.hardwareConcurrency ?? 4;
	if (cores <= 2) {
		return "low";
	}

	// 2. Device memory check (Chrome/Edge API): <= 4GB RAM
	const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
	if (typeof deviceMemory === "number" && deviceMemory <= 4) {
		return "low";
	}

	// 3. WebGL GPU renderer string inspection
	try {
		const canvas = document.createElement("canvas");
		const gl =
			canvas.getContext("webgl") ||
			(canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

		if (gl) {
			const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
			if (debugInfo) {
				const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
				if (typeof renderer === "string") {
					const r = renderer.toLowerCase();
					// Explicit low-end / legacy integrated GPUs & software fallbacks
					if (
						r.includes("intel hd") ||
						r.includes("intel uhd") ||
						r.includes("intel(r) hd") ||
						r.includes("intel iris") ||
						r.includes("mali-4") ||
						r.includes("mali-t") ||
						r.includes("adreno 3") ||
						r.includes("adreno 4") ||
						r.includes("adreno 5") ||
						r.includes("llvmpipe") ||
						r.includes("swiftshader") ||
						r.includes("mesa") ||
						r.includes("basic render")
					) {
						return "low";
					}

					// High-end dedicated GPUs
					if (
						r.includes("rtx") ||
						r.includes("gtx") ||
						r.includes("geforce") ||
						r.includes("radeon rx") ||
						r.includes("apple m") ||
						r.includes("quadro")
					) {
						return "high";
					}
				}
			}
		}
	} catch {
		// WebGL inspection non-fatal fallback
	}

	return cores <= 4 ? "low" : "medium";
}

export interface RafFrameInfo {
	/** High-resolution timestamp from performance.now() */
	timestamp: number;
	/** Milliseconds elapsed since the previous throttled frame */
	deltaMs: number;
	/** Observed instant FPS calculated over the elapsed delta */
	fps: number;
	/** Current effective target FPS constraint */
	targetFps: number;
	/** Whether frame pacing is currently capped for low-end device/overload */
	isAdaptiveThrottled: boolean;
	/** Monotonically increasing frame index */
	frameIndex: number;
}

export interface RafThrottlerOptions {
	/**
	 * Target frame rate:
	 * - "adaptive": dynamically drops from 60 to 30-40 FPS based on measured execution time and hardware tier.
	 * - number: hard limit (e.g. 30 for low-power mode, 60 for standard).
	 */
	targetFps?: number | "adaptive";
	/** Minimum allowable frame rate when throttled under heavy load (default: 24) */
	minFps?: number;
	/** Maximum allowable frame rate under light load (default: 60) */
	maxFps?: number;
	/** Whether to coalesce multiple calls into the latest arguments per tick (default: true) */
	coalesce?: boolean;
	/** Whether to inspect hardware and auto-clamp to 30 FPS on low-end GPUs (default: true) */
	detectLowEnd?: boolean;
	/** Optional telemetry callback invoked when frame pacing drops below budget */
	onFpsDrop?: (currentFps: number, targetFps: number) => void;
}

export interface ThrottledRafFunction<T> {
	/** Schedules a throttled frame invocation with the specified payload */
	(payload: T): void;
	/** Cancels any currently pending animation frame */
	cancel: () => void;
	/** Immediately executes any pending invocation synchronously */
	flush: () => void;
	/** Returns true if a frame callback is scheduled and waiting to execute */
	isPending: () => boolean;
	/** Returns the currently effective target FPS */
	getEffectiveFps: () => number;
	/** Dynamically modifies the target frame rate */
	setTargetFps: (fps: number | "adaptive") => void;
	/** Disposes the throttler and cleans up all scheduled timers */
	destroy: () => void;
}

/**
 * Creates an industrial-grade, zero-GC throttled function backed by requestAnimationFrame.
 */
export function createRafThrottler<T = void>(
	callback: (payload: T, frameInfo: Readonly<RafFrameInfo>) => void,
	options: RafThrottlerOptions = {},
): ThrottledRafFunction<T> {
	const {
		targetFps: initialTargetFps = "adaptive",
		minFps = 24,
		maxFps = 60,
		detectLowEnd = true,
		onFpsDrop,
	} = options;

	const isLowEnd = detectLowEnd ? detectGpuPerformanceTier() === "low" : false;

	// Initial effective target: 30 FPS for low-end hardware, 60 FPS otherwise
	let currentTargetFpsSetting = initialTargetFps;
	let effectiveTargetFps =
		currentTargetFpsSetting === "adaptive"
			? isLowEnd
				? 30
				: 60
			: Math.min(Math.max(currentTargetFpsSetting, minFps), maxFps);

	let minIntervalMs = 1000 / effectiveTargetFps;

	let rafId: number | null = null;
	let lastFrameTime = 0;
	let frameCount = 0;
	let slowFrameStreak = 0;
	let fastFrameStreak = 0;

	let pending = false;
	let latestPayload: T | undefined = undefined;

	// Pre-allocated frame telemetry instance (Zero-GC: reused every frame)
	const frameInfo: RafFrameInfo = {
		timestamp: 0,
		deltaMs: 0,
		fps: effectiveTargetFps,
		targetFps: effectiveTargetFps,
		isAdaptiveThrottled: isLowEnd || effectiveTargetFps < 60,
		frameIndex: 0,
	};

	function updateEffectiveInterval(nextFps: number): void {
		effectiveTargetFps = Math.min(Math.max(nextFps, minFps), maxFps);
		minIntervalMs = 1000 / effectiveTargetFps;
		frameInfo.targetFps = effectiveTargetFps;
		frameInfo.isAdaptiveThrottled = effectiveTargetFps < 60;
	}

	function tick(now: number): void {
		rafId = null;

		if (!pending) {
			return;
		}

		const deltaMs = now - lastFrameTime;

		// Frame rate pacing: if not enough time elapsed, re-schedule for next tick
		if (deltaMs < minIntervalMs) {
			rafId = requestAnimationFrame(tick);
			return;
		}

		// Frame timing calculations
		const instantFps = deltaMs > 0 ? Math.round(1000 / deltaMs) : effectiveTargetFps;

		frameInfo.timestamp = now;
		frameInfo.deltaMs = deltaMs;
		frameInfo.fps = instantFps;
		frameInfo.frameIndex = ++frameCount;

		lastFrameTime = now;
		pending = false;
		const payloadToDeliver = latestPayload as T;

		// Measure execution duration for adaptive throttling
		const execStart = typeof performance !== "undefined" ? performance.now() : Date.now();

		try {
			callback(payloadToDeliver, frameInfo);
		} finally {
			const execEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
			const execDurationMs = execEnd - execStart;

			// Adaptive heuristic: monitor render budget
			if (currentTargetFpsSetting === "adaptive") {
				// If a single frame execution exceeds 22ms (drops below ~45 FPS)
				if (execDurationMs > 22 || instantFps < 28) {
					slowFrameStreak++;
					fastFrameStreak = 0;

					// If 3 consecutive slow frames detected, down-throttle to save CPU
					if (slowFrameStreak >= 3 && effectiveTargetFps > minFps) {
						const nextFps = effectiveTargetFps > 40 ? 30 : minFps;
						updateEffectiveInterval(nextFps);
						if (onFpsDrop) {
							onFpsDrop(instantFps, nextFps);
						}
						slowFrameStreak = 0;
					}
				} else if (execDurationMs < 10) {
					// Light execution: allow gradual step up if hardware is not low-end
					fastFrameStreak++;
					slowFrameStreak = 0;

					if (fastFrameStreak >= 30 && !isLowEnd && effectiveTargetFps < maxFps) {
						updateEffectiveInterval(Math.min(effectiveTargetFps + 10, maxFps));
						fastFrameStreak = 0;
					}
				}
			}
		}
	}

	const throttled = function (payload: T): void {
		latestPayload = payload;
		pending = true;

		if (rafId === null) {
			if (typeof requestAnimationFrame !== "undefined") {
				rafId = requestAnimationFrame(tick);
			} else {
				// Fallback for non-browser/test environments
				rafId = setTimeout(() => tick(Date.now()), minIntervalMs) as unknown as number;
			}
		}
	} as ThrottledRafFunction<T>;

	throttled.cancel = function (): void {
		if (rafId !== null) {
			if (typeof cancelAnimationFrame !== "undefined") {
				cancelAnimationFrame(rafId);
			} else {
				clearTimeout(rafId);
			}
			rafId = null;
		}
		pending = false;
	};

	throttled.flush = function (): void {
		if (pending) {
			if (rafId !== null) {
				if (typeof cancelAnimationFrame !== "undefined") {
					cancelAnimationFrame(rafId);
				} else {
					clearTimeout(rafId);
				}
				rafId = null;
			}
			const now = typeof performance !== "undefined" ? performance.now() : Date.now();
			tick(now);
		}
	};

	throttled.isPending = function (): boolean {
		return pending;
	};

	throttled.getEffectiveFps = function (): number {
		return effectiveTargetFps;
	};

	throttled.setTargetFps = function (fps: number | "adaptive"): void {
		currentTargetFpsSetting = fps;
		if (fps === "adaptive") {
			updateEffectiveInterval(isLowEnd ? 30 : 60);
		} else {
			updateEffectiveInterval(fps);
		}
	};

	throttled.destroy = function (): void {
		throttled.cancel();
		latestPayload = undefined;
	};

	return throttled;
}

/**
 * Continuous Adaptive Loop Controller.
 * Useful for driving continuous Canvas / WebGL animation loops without CPU overheating.
 */
export class AdaptiveRafLoop {
	private isRunning = false;
	private readonly throttler: ThrottledRafFunction<void>;

	constructor(
		callback: (frameInfo: Readonly<RafFrameInfo>) => void,
		options: RafThrottlerOptions = {},
	) {
		this.throttler = createRafThrottler<void>((_payload, info) => {
			if (this.isRunning) {
				callback(info);
				this.scheduleNext();
			}
		}, options);
	}

	private scheduleNext(): void {
		if (this.isRunning) {
			this.throttler();
		}
	}

	public start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.scheduleNext();
	}

	public stop(): void {
		this.isRunning = false;
		this.throttler.cancel();
	}

	public getEffectiveFps(): number {
		return this.throttler.getEffectiveFps();
	}

	public destroy(): void {
		this.stop();
		this.throttler.destroy();
	}
}

/**
 * React Hook: useRafThrottledCallback
 * Provides a stable throttled callback function that automatically cleans up on unmount.
 */
export function useRafThrottledCallback<T = void>(
	callback: (payload: T, frameInfo: Readonly<RafFrameInfo>) => void,
	options: RafThrottlerOptions = {},
	deps: readonly unknown[] = [],
): ThrottledRafFunction<T> {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	const throttlerRef = useRef<ThrottledRafFunction<T> | null>(null);

	if (!throttlerRef.current) {
		throttlerRef.current = createRafThrottler<T>((payload, frameInfo) => {
			callbackRef.current(payload, frameInfo);
		}, options);
	}

	// Dynamic target FPS / options update when options change
	useEffect(() => {
		if (throttlerRef.current && options.targetFps !== undefined) {
			throttlerRef.current.setTargetFps(options.targetFps);
		}
	}, [options.targetFps]);

	// Teardown when component unmounts
	useEffect(() => {
		return () => {
			if (throttlerRef.current) {
				throttlerRef.current.destroy();
			}
		};
	}, []);

	// Recreate throttler if dependency array items change
	useEffect(() => {
		// When deps change, reset pending state
		if (throttlerRef.current) {
			throttlerRef.current.cancel();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	return throttlerRef.current;
}
