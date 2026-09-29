/**
 * poolWatchdog.ts — Self-Healing PostgreSQL Connection Pool Watchdog.
 *
 * Runs a non-blocking background probe (`SELECT 1`) every 10 seconds.
 * If PostgreSQL drops, fails over, or restarts (e.g. during WAL recovery or maintenance):
 *   - Transparently drains dead/broken sockets from pg.Pool idle & client queues.
 *   - Triggers socket eviction and pool replenishment.
 *   - Tracks pool telemetry and health states (healthy, degraded, recovering, unhealthy).
 *   - Guarantees zero unhandled promise rejections / zero crashes in Fastify.
 */

import type pg from "pg";
import { pool } from "./client.js";

export type PoolHealthStatus =
	| "healthy"
	| "degraded"
	| "recovering"
	| "unhealthy";

export interface PoolHealthReport {
	status: PoolHealthStatus;
	lastCheckAt: string | null;
	consecutiveFailures: number;
	consecutiveSuccesses: number;
	lastError: string | null;
	lastRecoveryAt: string | null;
	totalDrainedSockets: number;
	metrics: {
		totalCount: number;
		idleCount: number;
		waitingCount: number;
	};
}

export interface PoolWatchdogOptions {
	/** Check interval in milliseconds. Defaults to 10,000ms (10s). */
	intervalMs?: number;
	/** Timeout for non-blocking health probe in milliseconds. Defaults to 3,000ms. */
	probeTimeoutMs?: number;
	/** Target pg.Pool instance. Defaults to the singleton application pool. */
	targetPool?: pg.Pool;
	/** Optional structured logger. */
	logger?: {
		info(...args: unknown[]): void;
		warn(...args: unknown[]): void;
		error(...args: unknown[]): void;
	};
}

class ConnectionPoolWatchdog {
	private timer: NodeJS.Timeout | null = null;
	private targetPool: pg.Pool;
	private intervalMs: number;
	private probeTimeoutMs: number;
	private logger?: PoolWatchdogOptions["logger"];

	private status: PoolHealthStatus = "healthy";
	private lastCheckAt: string | null = null;
	private consecutiveFailures = 0;
	private consecutiveSuccesses = 0;
	private lastError: string | null = null;
	private lastRecoveryAt: string | null = null;
	private totalDrainedSockets = 0;
	private isProbing = false;

	constructor(options: PoolWatchdogOptions = {}) {
		this.targetPool = options.targetPool ?? pool;
		this.intervalMs = options.intervalMs ?? 10_000;
		this.probeTimeoutMs = options.probeTimeoutMs ?? 3_000;
		this.logger = options.logger;
	}

	/**
	 * Starts the background health probe interval.
	 */
	public start(): void {
		if (this.timer) return;

		this.timer = setInterval(() => {
			void this.runProbe();
		}, this.intervalMs);

		// Unref so background watchdog does not prevent test runners or graceful exit
		this.timer.unref();
	}

	/**
	 * Stops the background health probe interval.
	 */
	public stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	/**
	 * Performs a single non-blocking health probe and initiates self-healing if failed.
	 */
	public async runProbe(): Promise<PoolHealthReport> {
		if (this.isProbing) {
			return this.getHealthReport();
		}

		this.isProbing = true;
		this.lastCheckAt = new Date().toISOString();

		try {
			await this.executeProbeQuery();

			// Successful probe
			this.consecutiveSuccesses++;
			if (this.status !== "healthy") {
				this.logger?.info?.(
					{
						previousStatus: this.status,
						consecutiveSuccesses: this.consecutiveSuccesses,
					},
					"[PoolWatchdog] PostgreSQL connection restored. Connection pool is healthy.",
				);
				this.status = "healthy";
				this.lastRecoveryAt = new Date().toISOString();
			}
			this.consecutiveFailures = 0;
			this.lastError = null;
		} catch (err: unknown) {
			this.consecutiveFailures++;
			this.consecutiveSuccesses = 0;
			const errorMessage =
				err instanceof Error ? err.message : String(err);
			this.lastError = errorMessage;

			if (this.consecutiveFailures >= 2) {
				this.status = "unhealthy";
			} else {
				this.status = "degraded";
			}

			this.logger?.warn?.(
				{
					status: this.status,
					consecutiveFailures: this.consecutiveFailures,
					error: errorMessage,
				},
				`[PoolWatchdog] Database health probe failed (${errorMessage}). Initiating self-healing pool drain...`,
			);

			// Self-heal: drain dead sockets
			const drainResult = this.drainDeadSockets();
			this.totalDrainedSockets += drainResult.drainedCount;
			this.status = "recovering";
		} finally {
			this.isProbing = false;
		}

		return this.getHealthReport();
	}

	/**
	 * Executes non-blocking probe query with a hard timeout.
	 */
	private async executeProbeQuery(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let isSettled = false;

			const timer = setTimeout(() => {
				if (!isSettled) {
					isSettled = true;
					reject(
						new Error(
							`Pool probe timed out after ${this.probeTimeoutMs}ms`,
						),
					);
				}
			}, this.probeTimeoutMs);

			this.targetPool
				.query("SELECT 1 AS watchdog_heartbeat")
				.then(() => {
					if (!isSettled) {
						isSettled = true;
						clearTimeout(timer);
						resolve();
					}
				})
				.catch((err) => {
					if (!isSettled) {
						isSettled = true;
						clearTimeout(timer);
						reject(err);
					}
				});
		});
	}

	/**
	 * Transparently evicts dead, hung, or half-open client sockets from pg.Pool.
	 */
	public drainDeadSockets(): { drainedCount: number } {
		let drained = 0;
		// biome-ignore lint/suspicious/noExplicitAny: pg.Pool internals access
		const p = this.targetPool as any;

		try {
			// 1. Evict all idle connections that might have closed or hung
			if (Array.isArray(p._idle)) {
				const idleItems = [...p._idle];
				for (const item of idleItems) {
					const client = item?.client ?? item;
					if (client) {
						drained++;
						try {
							if (typeof p._remove === "function") {
								p._remove(client);
							} else if (typeof client.end === "function") {
								client.end();
							}
						} catch {
							try {
								client.connection?.stream?.destroy();
							} catch {
								// Ignore stream destruction errors
							}
						}
					}
				}
			}

			// 2. Inspect active clients for dead or unwritable network streams
			if (Array.isArray(p._clients)) {
				const clientItems = [...p._clients];
				for (const client of clientItems) {
					const stream = client?.connection?.stream;
					if (
						stream &&
						(stream.destroyed ||
							!stream.writable ||
							!stream.readable)
					) {
						drained++;
						try {
							if (typeof p._remove === "function") {
								p._remove(client);
							} else if (typeof client.end === "function") {
								client.end();
							}
						} catch {
							try {
								stream.destroy?.();
							} catch {
								// Ignore
							}
						}
					}
				}
			}
		} catch (drainErr) {
			this.logger?.error?.(
				{ error: drainErr },
				"[PoolWatchdog] Unexpected error during pool dead socket drain.",
			);
		}

		return { drainedCount: drained };
	}

	/**
	 * Returns current health telemetry snapshot.
	 */
	public getHealthReport(): PoolHealthReport {
		// biome-ignore lint/suspicious/noExplicitAny: pg.Pool metric access
		const p = this.targetPool as any;
		return {
			status: this.status,
			lastCheckAt: this.lastCheckAt,
			consecutiveFailures: this.consecutiveFailures,
			consecutiveSuccesses: this.consecutiveSuccesses,
			lastError: this.lastError,
			lastRecoveryAt: this.lastRecoveryAt,
			totalDrainedSockets: this.totalDrainedSockets,
			metrics: {
				totalCount: typeof p.totalCount === "number" ? p.totalCount : 0,
				idleCount: typeof p.idleCount === "number" ? p.idleCount : 0,
				waitingCount:
					typeof p.waitingCount === "number" ? p.waitingCount : 0,
			},
		};
	}

	/**
	 * Resets counters (useful for unit tests).
	 */
	public resetTelemetry(): void {
		this.status = "healthy";
		this.lastCheckAt = null;
		this.consecutiveFailures = 0;
		this.consecutiveSuccesses = 0;
		this.lastError = null;
		this.lastRecoveryAt = null;
		this.totalDrainedSockets = 0;
	}
}

let defaultWatchdogInstance: ConnectionPoolWatchdog | null = null;

export function getPoolWatchdog(
	options?: PoolWatchdogOptions,
): ConnectionPoolWatchdog {
	if (!defaultWatchdogInstance || options) {
		defaultWatchdogInstance = new ConnectionPoolWatchdog(options);
	}
	return defaultWatchdogInstance;
}

export function startPoolWatchdog(
	options?: PoolWatchdogOptions,
): ConnectionPoolWatchdog {
	const watchdog = getPoolWatchdog(options);
	watchdog.start();
	return watchdog;
}

export function stopPoolWatchdog(): void {
	if (defaultWatchdogInstance) {
		defaultWatchdogInstance.stop();
	}
}

export async function checkPoolHealth(
	options?: PoolWatchdogOptions,
): Promise<PoolHealthReport> {
	const watchdog = getPoolWatchdog(options);
	return watchdog.runProbe();
}

export function getPoolHealth(): PoolHealthReport {
	const watchdog = getPoolWatchdog();
	return watchdog.getHealthReport();
}

export function drainPoolDeadSockets(
	targetPool?: pg.Pool,
): { drainedCount: number } {
	const watchdog = getPoolWatchdog(
		targetPool ? { targetPool } : undefined,
	);
	return watchdog.drainDeadSockets();
}
