/**
 * TaskQueueService.ts — персистентная ACID-очередь фоновых задач (TASK-2.3).
 *
 * ГАРАНТИИ НАДЁЖНОСТИ И МАНДАТЫ СИСТЕМЫ:
 * 1. Транзакционный захват через `SELECT ... FOR UPDATE SKIP LOCKED`:
 *    гарантирует ровно одного исполнителя при конкурентной обработке и горизонтальном масштабировании.
 * 2. Персистентность в PostgreSQL 18 (`system_background_jobs`):
 *    задачи переживают перезапуск серверов, сбои питания и сбои процессов.
 * 3. Автоматический подхват зависших задач (`recoverStaleTasks`):
 *    задачи, брошенные в статусе 'processing' из-за внезапного падения Node.js,
 *    автоматически подхватываются при рестарте и переводятся в retry с джиттером либо в DLQ.
 * 4. Экспоненциальный бэкофф с полным джиттером (Full Jitter) и Dead-Letter Queue (DLQ):
 *    предотвращение штормов повторов (retry storms / thundering herd) к внешним сервисам (ККТ, SMS, AI).
 * 5. Multi-Tenant изоляция:
 *    строгая фильтрация по organizationId, предотвращающая утечки данных между клиниками и филиалами.
 */

import type { SQL } from "drizzle-orm";
import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import {
	type SystemBackgroundJob,
	systemBackgroundJobs,
} from "../../db/schema.js";

export type JobStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed"
	| "dead_letter"
	| "cancelled";

export interface EnqueueJobParams {
	organizationId?: string | null | undefined;
	queueName: string;
	taskName: string;
	payload?: Record<string, unknown> | undefined;
	scheduledFor?: Date | undefined;
	maxRetries?: number | undefined;
}

export interface TaskHandlerContext {
	job: SystemBackgroundJob;
	logger?: {
		info: (msg: string, ...args: unknown[]) => void;
		warn: (msg: string, ...args: unknown[]) => void;
		error: (msg: string, ...args: unknown[]) => void;
	} | undefined;
}

export type TaskHandler = (ctx: TaskHandlerContext) => Promise<unknown>;

export interface WorkerOptions {
	queues?: string[] | undefined;
	pollIntervalMs?: number | undefined;
	concurrency?: number | undefined;
	organizationId?: string | null | undefined;
	autoRecoverStaleOnStart?: boolean | undefined;
	staleThresholdMs?: number | undefined;
	logger?: {
		info: (msg: string, ...args: unknown[]) => void;
		warn: (msg: string, ...args: unknown[]) => void;
		error: (msg: string, ...args: unknown[]) => void;
	} | undefined;
}

export interface WorkerHandle {
	stop: () => Promise<void>;
	isRunning: () => boolean;
	recoverStale: (staleThresholdMs?: number) => Promise<{ recovered: number; deadLettered: number }>;
}

export interface DequeueOptions {
	organizationId?: string | null | undefined;
}

export interface FailJobOptions {
	customRetryDelayMs?: number | undefined;
	organizationId?: string | undefined;
}

export interface RecoverStaleOptions {
	staleThresholdMs?: number | undefined;
	organizationId?: string | null | undefined;
	logger?: WorkerOptions["logger"] | undefined;
}

const DEFAULT_BASE_DELAY_MS = 5000;
const DEFAULT_MAX_DELAY_MS = 3600_000; // 1 hour
const DEFAULT_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Calculates exponential delay with full jitter to avoid retry storms:
 * backoff = min(maxDelay, baseDelay * 2^(retryCount - 1)) * (0.5 + Math.random() * 0.5)
 */
export function calculateExponentialBackoffWithJitter(
	retryCount: number,
	baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
	maxDelayMs: number = DEFAULT_MAX_DELAY_MS,
): number {
	const exponent = Math.max(0, retryCount - 1);
	const rawExponential = Math.min(maxDelayMs, baseDelayMs * 2 ** exponent);
	// Decorrelated / full jitter between 50% and 100% of rawExponential
	const jitterMultiplier = 0.5 + Math.random() * 0.5;
	return Math.round(rawExponential * jitterMultiplier);
}

export class TaskQueueService {
	private static handlers = new Map<string, TaskHandler>();

	/**
	 * Регистрация исполнителя для именованной задачи.
	 */
	static registerHandler(taskName: string, handler: TaskHandler): void {
		TaskQueueService.handlers.set(taskName, handler);
	}

	/**
	 * Удаление исполнителя (для тестов).
	 */
	static unregisterHandler(taskName: string): void {
		TaskQueueService.handlers.delete(taskName);
	}

	/**
	 * Очистка всех зарегистрированных исполнителей.
	 */
	static clearHandlers(): void {
		TaskQueueService.handlers.clear();
	}

	/**
	 * Постановка задачи в персистентную очередь с multi-tenant привязкой.
	 */
	static async enqueue(params: EnqueueJobParams): Promise<SystemBackgroundJob> {
		return withSuperuserBypass(async (tx) => {
			const [job] = await tx
				.insert(systemBackgroundJobs)
				.values({
					organizationId: params.organizationId ?? null,
					queueName: params.queueName,
					taskName: params.taskName,
					payload: params.payload ?? {},
					status: "pending",
					retryCount: 0,
					maxRetries: params.maxRetries ?? 3,
					scheduledFor: params.scheduledFor ?? new Date(),
				})
				.returning();

			if (!job) {
				throw new Error("Failed to enqueue job: database returned empty result");
			}

			return job;
		});
	}

	/**
	 * Атомарный захват следующей готовой к выполнению задачи из указанной очереди.
	 * Использует SELECT ... FOR UPDATE SKIP LOCKED внутри транзакции.
	 * Поддерживает фильтрацию по арендатору (organizationId).
	 */
	static async dequeueNext(
		queueName: string,
		optionsOrOrgId?: DequeueOptions | string | null | undefined,
	): Promise<SystemBackgroundJob | null> {
		let targetOrgId: string | null | undefined;
		if (typeof optionsOrOrgId === "string") {
			targetOrgId = optionsOrOrgId;
		} else if (optionsOrOrgId === null) {
			targetOrgId = null;
		} else if (optionsOrOrgId !== undefined && typeof optionsOrOrgId === "object") {
			targetOrgId = optionsOrOrgId.organizationId;
		}

		return withSuperuserBypass(async (tx) => {
			const now = new Date();

			const conditions: (SQL | undefined)[] = [
				eq(systemBackgroundJobs.queueName, queueName),
				eq(systemBackgroundJobs.status, "pending"),
				lte(systemBackgroundJobs.scheduledFor, now),
			];

			if (targetOrgId !== undefined) {
				conditions.push(
					targetOrgId === null
						? isNull(systemBackgroundJobs.organizationId)
						: eq(systemBackgroundJobs.organizationId, targetOrgId),
				);
			}

			const validConditions = conditions.filter((c): c is SQL => c !== undefined);

			const [candidate] = await tx
				.select()
				.from(systemBackgroundJobs)
				.where(and(...validConditions))
				.orderBy(asc(systemBackgroundJobs.scheduledFor))
				.limit(1)
				.for("update", { skipLocked: true });

			if (!candidate) {
				return null;
			}

			const [updated] = await tx
				.update(systemBackgroundJobs)
				.set({
					status: "processing",
					startedAt: now,
					retryCount: candidate.retryCount + 1,
				})
				.where(eq(systemBackgroundJobs.id, candidate.id))
				.returning();

			return updated ?? null;
		});
	}

	/**
	 * Завершение задачи со статусом completed.
	 * При передаче organizationId проверяет принадлежность задачи арендатору.
	 */
	static async completeJob(
		jobId: string,
		resultPayload?: Record<string, unknown> | undefined,
		organizationId?: string | undefined,
	): Promise<SystemBackgroundJob> {
		const now = new Date();
		const updateValues: Record<string, unknown> = {
			status: "completed",
			finishedAt: now,
			lastError: null,
		};

		if (resultPayload !== undefined) {
			updateValues.payload = resultPayload;
		}

		return withSuperuserBypass(async (tx) => {
			const conditions: SQL[] = [eq(systemBackgroundJobs.id, jobId)];
			if (organizationId !== undefined) {
				conditions.push(eq(systemBackgroundJobs.organizationId, organizationId));
			}

			const [job] = await tx
				.update(systemBackgroundJobs)
				.set(updateValues)
				.where(and(...conditions))
				.returning();

			if (!job) {
				throw new Error(
					`Failed to complete job ${jobId}${
						organizationId ? ` for organization ${organizationId}` : ""
					}`,
				);
			}

			return job;
		});
	}

	/**
	 * Фиксация ошибки выполнения задачи с расчетом времени следующего повтора (Backoff с джиттером)
	 * и автоматическим переводом в dead_letter при исчерпании лимита попыток.
	 */
	static async failJob(
		jobId: string,
		error: Error | string,
		optionsOrDelayMs?: FailJobOptions | number | undefined,
	): Promise<SystemBackgroundJob> {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const now = new Date();

		let customDelay: number | undefined;
		let targetOrgId: string | undefined;
		if (typeof optionsOrDelayMs === "number") {
			customDelay = optionsOrDelayMs;
		} else if (optionsOrDelayMs !== undefined && typeof optionsOrDelayMs === "object") {
			customDelay = optionsOrDelayMs.customRetryDelayMs;
			targetOrgId = optionsOrDelayMs.organizationId;
		}

		return withSuperuserBypass(async (tx) => {
			const selectConditions: SQL[] = [eq(systemBackgroundJobs.id, jobId)];
			if (targetOrgId !== undefined) {
				selectConditions.push(eq(systemBackgroundJobs.organizationId, targetOrgId));
			}

			const [existing] = await tx
				.select()
				.from(systemBackgroundJobs)
				.where(and(...selectConditions))
				.limit(1)
				.for("update");

			if (!existing) {
				throw new Error(
					`Job with id ${jobId} not found${
						targetOrgId ? ` for organization ${targetOrgId}` : ""
					}`,
				);
			}

			const isDeadLetter = existing.retryCount >= existing.maxRetries;

			if (isDeadLetter) {
				const [dead] = await tx
					.update(systemBackgroundJobs)
					.set({
						status: "dead_letter",
						finishedAt: now,
						lastError: errorMessage,
					})
					.where(eq(systemBackgroundJobs.id, jobId))
					.returning();
				if (!dead) {
					throw new Error(`Failed to update dead_letter for job ${jobId}`);
				}
				return dead;
			}

			// Экспоненциальный бэкофф с джиттером для защиты от retry storm
			const delayMs =
				customDelay ??
				calculateExponentialBackoffWithJitter(existing.retryCount);
			const nextScheduled = new Date(now.getTime() + delayMs);

			const [retried] = await tx
				.update(systemBackgroundJobs)
				.set({
					status: "pending",
					scheduledFor: nextScheduled,
					lastError: errorMessage,
				})
				.where(eq(systemBackgroundJobs.id, jobId))
				.returning();

			if (!retried) {
				throw new Error(`Failed to retry job ${jobId}`);
			}

			return retried;
		});
	}

	/**
	 * Автоматический подхват зависших задач, оставшихся в статусе 'processing'
	 * старше порога staleThresholdMs из-за сбоя питания, падения процесса или перезапуска сервера.
	 *
	 * - Если retryCount >= maxRetries -> переводит в 'dead_letter' с фиксацией таймаута.
	 * - Иначе -> возвращает в 'pending' со смещением по экспоненциальному джиттеру.
	 */
	static async recoverStaleTasks(
		options: RecoverStaleOptions = {},
	): Promise<{ recovered: number; deadLettered: number }> {
		const staleThresholdMs = options.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
		const targetOrgId = options.organizationId;
		const logger = options.logger;
		const cutoffTime = new Date(Date.now() - staleThresholdMs);
		const now = new Date();

		return withSuperuserBypass(async (tx) => {
			const conditions: (SQL | undefined)[] = [
				eq(systemBackgroundJobs.status, "processing"),
				lte(systemBackgroundJobs.startedAt, cutoffTime),
			];

			if (targetOrgId !== undefined) {
				conditions.push(
					targetOrgId === null
						? isNull(systemBackgroundJobs.organizationId)
						: eq(systemBackgroundJobs.organizationId, targetOrgId),
				);
			}

			const validConditions = conditions.filter((c): c is SQL => c !== undefined);

			// Конкурентный захват зависших задач без блокировки соседних воркеров
			const staleJobs = await tx
				.select()
				.from(systemBackgroundJobs)
				.where(and(...validConditions))
				.for("update", { skipLocked: true });

			if (staleJobs.length === 0) {
				return { recovered: 0, deadLettered: 0 };
			}

			let recovered = 0;
			let deadLettered = 0;

			for (const job of staleJobs) {
				if (job.retryCount >= job.maxRetries) {
					await tx
						.update(systemBackgroundJobs)
						.set({
							status: "dead_letter",
							finishedAt: now,
							lastError: `Stale task timed out: worker process died or crashed while processing (attempt ${job.retryCount}/${job.maxRetries})`,
						})
						.where(eq(systemBackgroundJobs.id, job.id));
					deadLettered++;
					logger?.warn?.(
						`[TaskQueue] Stale job ${job.id} (${job.taskName}) exceeded max retries (${job.retryCount}/${job.maxRetries}) -> moved to DLQ`,
					);
				} else {
					const delayMs = calculateExponentialBackoffWithJitter(job.retryCount);
					const nextScheduled = new Date(now.getTime() + delayMs);
					await tx
						.update(systemBackgroundJobs)
						.set({
							status: "pending",
							scheduledFor: nextScheduled,
							lastError: `Recovered from stale processing state (startedAt: ${job.startedAt?.toISOString() ?? "unknown"})`,
						})
						.where(eq(systemBackgroundJobs.id, job.id));
					recovered++;
					logger?.info?.(
						`[TaskQueue] Stale job ${job.id} (${job.taskName}) recovered to pending (scheduled in ${delayMs}ms)`,
					);
				}
			}

			return { recovered, deadLettered };
		});
	}

	/**
	 * Выполнение одного шага обработки следующей задачи.
	 */
	static async processNext(
		queueName: string,
		logger?: WorkerOptions["logger"] | undefined,
		options?: DequeueOptions | undefined,
	): Promise<{ processed: boolean; job?: SystemBackgroundJob | undefined }> {
		const job = await TaskQueueService.dequeueNext(queueName, options);
		if (!job) {
			return { processed: false };
		}

		const handler = TaskQueueService.handlers.get(job.taskName);
		if (!handler) {
			const errorMsg = `No handler registered for task: ${job.taskName}`;
			logger?.error?.(
				`[TaskQueue] ${errorMsg} (jobId: ${job.id}, queue: ${queueName})`,
			);
			await TaskQueueService.failJob(job.id, new Error(errorMsg));
			return { processed: true, job };
		}

		try {
			logger?.info?.(
				`[TaskQueue] Executing ${job.taskName} (jobId: ${job.id}, attempt: ${job.retryCount}/${job.maxRetries})`,
			);
			await handler({
				job,
				...(logger !== undefined ? { logger } : {}),
			});
			await TaskQueueService.completeJob(job.id);
			logger?.info?.(`[TaskQueue] Completed ${job.taskName} (jobId: ${job.id})`);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			logger?.error?.(
				`[TaskQueue] Failed ${job.taskName} (jobId: ${job.id}): ${error.message}`,
			);
			await TaskQueueService.failJob(job.id, error);
		}

		return { processed: true, job };
	}

	/**
	 * Ручной перезапуск задачи из статуса dead_letter, failed или cancelled.
	 */
	static async retryJob(
		jobId: string,
		organizationId?: string | undefined,
	): Promise<SystemBackgroundJob> {
		return withSuperuserBypass(async (tx) => {
			const conditions: SQL[] = [eq(systemBackgroundJobs.id, jobId)];
			if (organizationId !== undefined) {
				conditions.push(eq(systemBackgroundJobs.organizationId, organizationId));
			}

			const [job] = await tx
				.update(systemBackgroundJobs)
				.set({
					status: "pending",
					scheduledFor: new Date(),
					retryCount: 0,
					finishedAt: null,
					lastError: null,
				})
				.where(and(...conditions))
				.returning();

			if (!job) {
				throw new Error(
					`Job with id ${jobId} not found${
						organizationId ? ` for organization ${organizationId}` : ""
					}`,
				);
			}

			return job;
		});
	}

	/**
	 * Отмена запланированной задачи.
	 */
	static async cancelJob(
		jobId: string,
		organizationId?: string | undefined,
	): Promise<SystemBackgroundJob> {
		return withSuperuserBypass(async (tx) => {
			const conditions: SQL[] = [
				eq(systemBackgroundJobs.id, jobId),
				eq(systemBackgroundJobs.status, "pending"),
			];
			if (organizationId !== undefined) {
				conditions.push(eq(systemBackgroundJobs.organizationId, organizationId));
			}

			const [job] = await tx
				.update(systemBackgroundJobs)
				.set({
					status: "cancelled",
					finishedAt: new Date(),
				})
				.where(and(...conditions))
				.returning();

			if (!job) {
				throw new Error(
					`Job with id ${jobId} not found or not in pending status${
						organizationId ? ` for organization ${organizationId}` : ""
					}`,
				);
			}

			return job;
		});
	}

	/**
	 * Получение информации о задаче по ID с проверкой прав доступа.
	 */
	static async getJob(
		jobId: string,
		organizationId?: string | undefined,
	): Promise<SystemBackgroundJob | null> {
		return withSuperuserBypass(async (tx) => {
			const conditions: SQL[] = [eq(systemBackgroundJobs.id, jobId)];
			if (organizationId !== undefined) {
				conditions.push(eq(systemBackgroundJobs.organizationId, organizationId));
			}

			const [job] = await tx
				.select()
				.from(systemBackgroundJobs)
				.where(and(...conditions))
				.limit(1);

			return job ?? null;
		});
	}

	/**
	 * Выборка списка задач с фильтрацией по организации, очереди и статусу.
	 */
	static async listJobs(params: {
		organizationId?: string | null | undefined;
		queueName?: string | undefined;
		status?: JobStatus | undefined;
		limit?: number | undefined;
		offset?: number | undefined;
	}): Promise<SystemBackgroundJob[]> {
		const conditions: (SQL | undefined)[] = [];

		if (params.organizationId !== undefined) {
			conditions.push(
				params.organizationId === null
					? isNull(systemBackgroundJobs.organizationId)
					: eq(systemBackgroundJobs.organizationId, params.organizationId),
			);
		}

		if (params.queueName !== undefined && params.queueName !== "") {
			conditions.push(eq(systemBackgroundJobs.queueName, params.queueName));
		}

		if (params.status !== undefined) {
			conditions.push(eq(systemBackgroundJobs.status, params.status));
		}

		const validConditions = conditions.filter((c): c is SQL => c !== undefined);

		return withSuperuserBypass(async (tx) => {
			const query = tx
				.select()
				.from(systemBackgroundJobs)
				.where(validConditions.length > 0 ? and(...validConditions) : undefined)
				.orderBy(asc(systemBackgroundJobs.scheduledFor))
				.limit(params.limit ?? 50)
				.offset(params.offset ?? 0);

			return await query;
		});
	}

	/**
	 * Подсчёт количества задач с фильтрацией по организации, очереди и статусу.
	 */
	static async countJobs(params: {
		organizationId?: string | null | undefined;
		queueName?: string | undefined;
		status?: JobStatus | undefined;
	}): Promise<number> {
		const conditions: (SQL | undefined)[] = [];

		if (params.organizationId !== undefined) {
			conditions.push(
				params.organizationId === null
					? isNull(systemBackgroundJobs.organizationId)
					: eq(systemBackgroundJobs.organizationId, params.organizationId),
			);
		}

		if (params.queueName !== undefined && params.queueName !== "") {
			conditions.push(eq(systemBackgroundJobs.queueName, params.queueName));
		}

		if (params.status !== undefined) {
			conditions.push(eq(systemBackgroundJobs.status, params.status));
		}

		const validConditions = conditions.filter((c): c is SQL => c !== undefined);

		return withSuperuserBypass(async (tx) => {
			const [result] = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(systemBackgroundJobs)
				.where(validConditions.length > 0 ? and(...validConditions) : undefined);

			return Number(result?.count ?? 0);
		});
	}

	/**
	 * Запуск фонового воркера для обработки очередей.
	 * При старте автоматически восстанавливает зависшие задачи (если autoRecoverStaleOnStart !== false).
	 */
	static startWorker(options: WorkerOptions = {}): WorkerHandle {
		const queues = options.queues ?? ["default"];
		const pollIntervalMs = options.pollIntervalMs ?? 1000;
		const logger = options.logger;
		const targetOrgId = options.organizationId;
		const autoRecover = options.autoRecoverStaleOnStart ?? true;
		const staleThresholdMs = options.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;

		let running = true;
		let processing = false;
		let timeoutId: NodeJS.Timeout | null = null;

		// Авто-подхват зависших задач при старте
		if (autoRecover) {
			TaskQueueService.recoverStaleTasks({
				staleThresholdMs,
				organizationId: targetOrgId,
				logger,
			}).catch((err) => {
				logger?.error?.(`[TaskQueueWorker] Initial recoverStaleTasks error: ${err}`);
			});
		}

		const tick = async () => {
			if (!running || processing) return;
			processing = true;

			try {
				for (const queue of queues) {
					let hadWork = true;
					while (hadWork && running) {
						const res = await TaskQueueService.processNext(
							queue,
							logger,
							targetOrgId !== undefined ? { organizationId: targetOrgId } : undefined,
						);
						hadWork = res.processed;
					}
				}
			} catch (err) {
				logger?.error?.(`[TaskQueueWorker] Loop error: ${err}`);
			} finally {
				processing = false;
				if (running) {
					timeoutId = setTimeout(tick, pollIntervalMs);
					timeoutId.unref();
				}
			}
		};

		timeoutId = setTimeout(tick, 0);
		timeoutId.unref();

		return {
			isRunning: () => running,
			stop: async () => {
				running = false;
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
			},
			recoverStale: async (customStaleMs?: number) => {
				return await TaskQueueService.recoverStaleTasks({
					staleThresholdMs: customStaleMs ?? staleThresholdMs,
					organizationId: targetOrgId,
					logger,
				});
			},
		};
	}
}
