/**
 * TaskQueueService.ts — персистентная очередь фоновых задач (TASK-2.3).
 *
 * ГАРАНТИИ НАДЁЖНОСТИ:
 * 1. Транзакционный захват задач через `SELECT ... FOR UPDATE SKIP LOCKED`:
 *    гарантирует ровно одного исполнителя при горизонтальном масштабировании.
 * 2. Персистентность в PostgreSQL (`system_background_jobs`):
 *    задачи переживают перезапуск серверов и сбои процессов.
 * 3. Экспоненциальный бэкофф и Dead-Letter Queue:
 *    устойчивость к временным сбоям внешних систем (ККТ, СМС, AI, бэкапы).
 * 4. Multi-Tenant изоляция: задачи изолированы по organizationId, системные
 *    задачи (organizationId = null) выполняются в доверенном контексте.
 */

import type { SQL } from "drizzle-orm";
import { and, asc, eq, isNull, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { withSuperuserBypass } from "../db/rls.js";
import {
	type SystemBackgroundJob,
	systemBackgroundJobs,
} from "../db/schema.js";

export type JobStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed"
	| "dead_letter"
	| "cancelled";

export interface EnqueueJobParams {
	organizationId?: string | null;
	queueName: string;
	taskName: string;
	payload?: Record<string, unknown>;
	scheduledFor?: Date;
	maxRetries?: number;
}

export interface TaskHandlerContext {
	job: SystemBackgroundJob;
	logger?: {
		info: (msg: string, ...args: unknown[]) => void;
		warn: (msg: string, ...args: unknown[]) => void;
		error: (msg: string, ...args: unknown[]) => void;
	};
}

export type TaskHandler = (ctx: TaskHandlerContext) => Promise<unknown>;

export interface WorkerOptions {
	queues?: string[];
	pollIntervalMs?: number;
	concurrency?: number;
	logger?: {
		info: (msg: string, ...args: unknown[]) => void;
		warn: (msg: string, ...args: unknown[]) => void;
		error: (msg: string, ...args: unknown[]) => void;
	};
}

export interface WorkerHandle {
	stop: () => Promise<void>;
	isRunning: () => boolean;
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
	 * Постановка задачи в персистентную очередь.
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
				throw new Error("Failed to enqueue job");
			}

			return job;
		});
	}

	/**
	 * Атомарный захват следующей готовой к выполнению задачи из указанной очереди.
	 * Использует SELECT ... FOR UPDATE SKIP LOCKED внутри транзакции.
	 */
	static async dequeueNext(
		queueName: string,
	): Promise<SystemBackgroundJob | null> {
		return withSuperuserBypass(async (tx) => {
			const now = new Date();

			const [candidate] = await tx
				.select()
				.from(systemBackgroundJobs)
				.where(
					and(
						eq(systemBackgroundJobs.queueName, queueName),
						eq(systemBackgroundJobs.status, "pending"),
						lte(systemBackgroundJobs.scheduledFor, now),
					),
				)
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
	 */
	static async completeJob(
		jobId: string,
		resultPayload?: Record<string, unknown>,
	): Promise<SystemBackgroundJob> {
		const now = new Date();
		const updateValues: Record<string, unknown> = {
			status: "completed",
			finishedAt: now,
			lastError: null,
		};

		if (resultPayload) {
			updateValues.payload = resultPayload;
		}

		return withSuperuserBypass(async (tx) => {
			const [job] = await tx
				.update(systemBackgroundJobs)
				.set(updateValues)
				.where(eq(systemBackgroundJobs.id, jobId))
				.returning();

			if (!job) {
				throw new Error(`Failed to complete job ${jobId}`);
			}

			return job;
		});
	}

	/**
	 * Фиксация ошибки выполнения задачи с расчетом времени следующего повтора (Backoff).
	 */
	static async failJob(
		jobId: string,
		error: Error | string,
		customRetryDelayMs?: number,
	): Promise<SystemBackgroundJob> {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const now = new Date();

		return withSuperuserBypass(async (tx) => {
			const [existing] = await tx
				.select()
				.from(systemBackgroundJobs)
				.where(eq(systemBackgroundJobs.id, jobId))
				.limit(1);

			if (!existing) {
				throw new Error(`Job with id ${jobId} not found`);
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

			// Экспоненциальный бэкофф: 2^retryCount * 5 сек (5s, 10s, 20s, 40s...)
			const delayMs =
				customRetryDelayMs ??
				Math.min(3600_000, 5000 * 2 ** Math.max(0, existing.retryCount - 1));
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
	 * Выполнение одного шага обработки следующей задачи.
	 */
	static async processNext(
		queueName: string,
		logger?: WorkerOptions["logger"],
	): Promise<{ processed: boolean; job?: SystemBackgroundJob }> {
		const job = await TaskQueueService.dequeueNext(queueName);
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
	 * Ручной перезапуск задачи из статуса dead_letter или failed.
	 */
	static async retryJob(jobId: string): Promise<SystemBackgroundJob> {
		return withSuperuserBypass(async (tx) => {
			const [job] = await tx
				.update(systemBackgroundJobs)
				.set({
					status: "pending",
					scheduledFor: new Date(),
					retryCount: 0,
					finishedAt: null,
					lastError: null,
				})
				.where(eq(systemBackgroundJobs.id, jobId))
				.returning();

			if (!job) {
				throw new Error(`Job with id ${jobId} not found`);
			}

			return job;
		});
	}

	/**
	 * Отмена запланированной задачи.
	 */
	static async cancelJob(jobId: string): Promise<SystemBackgroundJob> {
		return withSuperuserBypass(async (tx) => {
			const [job] = await tx
				.update(systemBackgroundJobs)
				.set({
					status: "cancelled",
					finishedAt: new Date(),
				})
				.where(
					and(
						eq(systemBackgroundJobs.id, jobId),
						eq(systemBackgroundJobs.status, "pending"),
					),
				)
				.returning();

			if (!job) {
				throw new Error(
					`Job with id ${jobId} not found or not in pending status`,
				);
			}

			return job;
		});
	}

	/**
	 * Получение информации о задаче по ID.
	 */
	static async getJob(jobId: string): Promise<SystemBackgroundJob | null> {
		return withSuperuserBypass(async (tx) => {
			const [job] = await tx
				.select()
				.from(systemBackgroundJobs)
				.where(eq(systemBackgroundJobs.id, jobId))
				.limit(1);

			return job ?? null;
		});
	}

	/**
	 * Выборка списка задач с фильтрацией.
	 */
	static async listJobs(params: {
		organizationId?: string | null;
		queueName?: string;
		status?: JobStatus;
		limit?: number;
		offset?: number;
	}): Promise<SystemBackgroundJob[]> {
		const conditions: (SQL | undefined)[] = [];

		if (params.organizationId !== undefined) {
			conditions.push(
				params.organizationId === null
					? isNull(systemBackgroundJobs.organizationId)
					: eq(systemBackgroundJobs.organizationId, params.organizationId),
			);
		}

		if (params.queueName) {
			conditions.push(eq(systemBackgroundJobs.queueName, params.queueName));
		}

		if (params.status) {
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
	 * Запуск фонового воркера для обработки очередей.
	 */
	static startWorker(options: WorkerOptions = {}): WorkerHandle {
		const queues = options.queues ?? ["default"];
		const pollIntervalMs = options.pollIntervalMs ?? 1000;
		const logger = options.logger;

		let running = true;
		let processing = false;
		let timeoutId: NodeJS.Timeout | null = null;

		const tick = async () => {
			if (!running || processing) return;
			processing = true;

			try {
				for (const queue of queues) {
					let hadWork = true;
					while (hadWork && running) {
						const res = await TaskQueueService.processNext(queue, logger);
						hadWork = res.processed;
					}
				}
			} catch (err) {
				logger?.error?.(`[TaskQueueWorker] Loop error: ${err}`);
			} finally {
				processing = false;
				if (running) {
					timeoutId = setTimeout(tick, pollIntervalMs);
				}
			}
		};

		timeoutId = setTimeout(tick, 0);

		return {
			isRunning: () => running,
			stop: async () => {
				running = false;
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
			},
		};
	}
}
