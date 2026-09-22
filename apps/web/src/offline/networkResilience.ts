/**
 * DENTE CRM — Network Resilience & HDD Overload Protection
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization, defer background writes until idle.
 * - Mandate 8e: Doctor autonomy — zero frozen screens or blocking error dialogs on connection loss.
 * - Mandate 8n: Solo doctor & small clinic resilience without high-speed fiber or constant internet.
 * - Mandate 8s: Friction-killer — transparent fallback to cached records.
 */

import { isLowSpecDevice } from "../utils/lowSpecHddOptimizer.js";
import { logger } from "../utils/logger.js";

export interface OfflineFallbackOptions {
	readonly timeoutMs?: number | undefined;
	readonly retryAttempts?: number | undefined;
	readonly logErrors?: boolean | undefined;
}

/**
 * Safely executes a network request with an automatic timeout and transparent offline fallback.
 * Prevents hanging the UI when network drops or slow server hangs.
 */
export async function withOfflineFallback<T>(
	networkAction: (signal: AbortSignal) => Promise<T>,
	offlineFallback: () => Promise<T> | T,
	options?: OfflineFallbackOptions,
): Promise<T> {
	const timeoutMs = options?.timeoutMs ?? (isLowSpecDevice() ? 6000 : 4000);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const result = await networkAction(controller.signal);
		clearTimeout(timer);
		return result;
	} catch (err: unknown) {
		clearTimeout(timer);
		if (options?.logErrors) {
			logger.warn("[networkResilience] Network action failed or timed out, executing offline fallback:", err);
		}
		return await offlineFallback();
	}
}

/**
 * Schedules a non-urgent task during browser idle periods to prevent mechanical disk seek contention.
 */
export function deferUntilIdle(task: () => Promise<void> | void, timeoutMs = 2000): void {
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		(window as unknown as { requestIdleCallback: (cb: () => void, opt: { timeout: number }) => void }).requestIdleCallback(
			() => {
				try {
					void task();
				} catch (e) {
					logger.warn("[networkResilience] Error in idle task:", e);
				}
			},
			{ timeout: timeoutMs },
		);
	} else {
		setTimeout(() => {
			try {
				void task();
			} catch (e) {
				logger.warn("[networkResilience] Error in deferred task:", e);
			}
		}, 100);
	}
}

let activeWriteOperations = 0;
const MAX_CONCURRENT_HDD_WRITES = 2;
const writeQueue: Array<() => void> = [];

/**
 * Serializes heavy disk I/O operations on mechanical 5400 RPM HDDs to prevent
 * Disk Queue Length from reaching 100% and stalling the operating system.
 */
export async function protectAgainstDiskStarvation<T>(ioTask: () => Promise<T>): Promise<T> {
	if (!isLowSpecDevice()) {
		return ioTask();
	}

	if (activeWriteOperations >= MAX_CONCURRENT_HDD_WRITES) {
		await new Promise<void>((resolve) => {
			writeQueue.push(resolve);
		});
	}

	activeWriteOperations++;
	try {
		return await ioTask();
	} finally {
		activeWriteOperations--;
		if (writeQueue.length > 0) {
			const next = writeQueue.shift();
			next?.();
		}
	}
}
