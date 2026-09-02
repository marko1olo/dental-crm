/**
 * EGISZ REMD Background Queue Worker Service.
 * Manages non-blocking asynchronous dispatch of signed SEMD packages to EGISZ REMD.
 * Prevents doctor UI blocking during appointment completion.
 * Features:
 * - Recurring tick scheduled only AFTER prior tick completes (no overlapping ticks).
 * - Row-level locking via PostgreSQL FOR UPDATE SKIP LOCKED.
 * - Exponential backoff retry policy (calculateEgiszRetryDelayMs).
 * - Automatic status synchronization with REMD gateway.
 * - Cryptographic audit logging with SHA-256 hash chaining.
 */

import type { FastifyBaseLogger } from "fastify";
import { EgiszOutboxDispatcher, type OutboxProcessResult } from "./EgiszOutboxDispatcher.js";
import { OiisGatewayClient } from "./OiisGatewayClient.js";

export type EgiszQueueWorkerLogger = {
	info: (payload: Record<string, unknown>, message: string) => void;
	warn: (payload: Record<string, unknown>, message: string) => void;
	error: (payload: Record<string, unknown>, message: string) => void;
};

export type EgiszQueueWorkerOptions = {
	logger?: FastifyBaseLogger | EgiszQueueWorkerLogger | null | undefined;
	intervalMs?: number | undefined;
	statusSyncIntervalTicks?: number | undefined;
	batchLimit?: number | undefined;
	enabled?: boolean | undefined;
	client?: OiisGatewayClient | undefined;
};

export type EgiszQueueWorkerHandle = {
	readonly enabled: boolean;
	readonly intervalMs: number;
	readonly batchLimit: number;
	stop: () => void;
	runOnce: (organizationId?: string) => Promise<OutboxProcessResult>;
	syncStatusesOnce: (organizationId?: string) => Promise<number>;
	isRunning: () => boolean;
};

function createDefaultLogger(): EgiszQueueWorkerLogger {
	return {
		info: (payload, message) => console.log(`[EgiszQueueWorker] ${message}`, payload),
		warn: (payload, message) => console.warn(`[EgiszQueueWorker] ${message}`, payload),
		error: (payload, message) => console.error(`[EgiszQueueWorker] ${message}`, payload),
	};
}

let activeWorkerHandle: EgiszQueueWorkerHandle | null = null;

/**
 * Starts the EGISZ REMD background queue worker.
 * Runs non-blocking asynchronous dispatch loop.
 */
export function startEgiszQueueWorker(
	options: EgiszQueueWorkerOptions = {},
): EgiszQueueWorkerHandle {
	if (activeWorkerHandle?.isRunning()) {
		return activeWorkerHandle;
	}

	const enabled = options.enabled ?? (process.env.DENTE_EGISZ_QUEUE_WORKER_ENABLED !== "false");
	const intervalMs = options.intervalMs ?? (Number(process.env.DENTE_EGISZ_QUEUE_WORKER_INTERVAL_MS) || 10_000);
	const batchLimit = options.batchLimit ?? (Number(process.env.DENTE_EGISZ_QUEUE_WORKER_BATCH_LIMIT) || 25);
	const statusSyncIntervalTicks = options.statusSyncIntervalTicks ?? 3;
	const logger = options.logger ?? createDefaultLogger();

	const dispatcher = new EgiszOutboxDispatcher(options.client);

	let timer: NodeJS.Timeout | null = null;
	let isProcessing = false;
	let stopped = false;
	let tickCount = 0;

	const runOnce = async (organizationId?: string): Promise<OutboxProcessResult> => {
		return dispatcher.processPendingQueue(organizationId, batchLimit);
	};

	const syncStatusesOnce = async (organizationId?: string): Promise<number> => {
		return dispatcher.syncPendingStatuses(organizationId);
	};

	const scheduleNextTick = (delay: number) => {
		if (stopped || !enabled) return;
		timer = setTimeout(async () => {
			if (stopped || isProcessing) return;
			isProcessing = true;
			try {
				tickCount++;
				const result = await runOnce();
				if (result.processedCount > 0) {
					logger.info(
						{
							processed: result.processedCount,
							succeeded: result.successCount,
							failed: result.failedCount,
						},
						"Обработана пачка документов ЕГИСЗ РЭМД из очереди",
					);
				}

				// Periodically sync status of in-flight 'sending' transactions
				if (tickCount % statusSyncIntervalTicks === 0) {
					const synced = await syncStatusesOnce();
					if (synced > 0) {
						logger.info({ synced }, "Синхронизированы статусы документов РЭМД Минздрава");
					}
				}
			} catch (err: unknown) {
				logger.error(
					{ err: err instanceof Error ? err.message : String(err) },
					"Ошибка в фоновом воркере очереди ЕГИСЗ РЭМД",
				);
			} finally {
				isProcessing = false;
				scheduleNextTick(intervalMs);
			}
		}, delay);

		timer.unref?.();
	};

	const stop = () => {
		stopped = true;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		if (activeWorkerHandle === handle) {
			activeWorkerHandle = null;
		}
		logger.info({}, "Фоновый воркер очереди ЕГИСЗ РЭМД остановлен");
	};

	const isRunning = () => !stopped && enabled;

	const handle: EgiszQueueWorkerHandle = {
		enabled,
		intervalMs,
		batchLimit,
		stop,
		runOnce,
		syncStatusesOnce,
		isRunning,
	};

	activeWorkerHandle = handle;

	if (enabled) {
		logger.info(
			{ intervalMs, batchLimit },
			"Запущен фоновый воркер очереди ЕГИСЗ РЭМД (Outbox Dispatcher)",
		);
		scheduleNextTick(intervalMs);
	} else {
		logger.info({}, "Фоновый воркер очереди ЕГИСЗ РЭМД отключен в конфигурации");
	}

	return handle;
}

export function stopEgiszQueueWorker(): void {
	if (activeWorkerHandle) {
		activeWorkerHandle.stop();
		activeWorkerHandle = null;
	}
}

export function getEgiszQueueWorker(): EgiszQueueWorkerHandle | null {
	return activeWorkerHandle;
}
