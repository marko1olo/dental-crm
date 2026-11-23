/**
 * @file syncQueueManager.ts
 * @description Route-level Sync Queue Manager and Coordinator for DENTE CRM.
 * Bridges offline sync buffers, persistent database task queues (system_background_jobs),
 * and idempotency records with strict multi-tenant isolation.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import {
	type SystemBackgroundJob,
	systemBackgroundJobs,
	syncEntityVectors,
	syncIdempotencyRecords,
} from "../../db/schema.js";
import {
	SyncGatewayService,
} from "../../services/sync/syncGateway/index.js";
import {
	SyncQueueManager as GatewayQueueManager,
} from "../../services/sync/syncGateway/syncQueueManager.js";
import {
	TaskQueueService,
} from "../../services/tasks/TaskQueueService.js";
import type {
	SyncMutationEnvelope,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
} from "@dental/shared";
import type { SyncQueueStats } from "../../services/sync/syncGateway/types.js";

export const SYNC_QUEUE_NAME = "sync";

export interface OrganizationSyncQueueHealth {
	organizationId: string;
	memoryBuffer: SyncQueueStats;
	persistentJobs: {
		pending: number;
		processing: number;
		completed: number;
		failed: number;
		deadLetter: number;
		total: number;
	};
	recentIdempotencyRecordsCount: number;
	activeEntityVectorsCount: number;
	serverTime: string;
}

export interface ReplaySyncJobResult {
	success: boolean;
	job: SystemBackgroundJob;
	message: string;
}

export class RouteSyncQueueManager {
	/**
	 * Re-exports core gateway queue manager methods for backward compatibility and unified access.
	 */
	public static checkIdempotency = GatewayQueueManager.checkIdempotency;
	public static recordIdempotency = GatewayQueueManager.recordIdempotency;
	public static upsertEntityVector = GatewayQueueManager.upsertEntityVector;
	public static enqueueOfflineMutation = GatewayQueueManager.enqueueOfflineMutation;
	public static clearOfflineQueue = GatewayQueueManager.clearOfflineQueue;
	public static getQueueStats = GatewayQueueManager.getQueueStats;
	public static ensureSyncTablesExist = GatewayQueueManager.ensureSyncTablesExist;

	/**
	 * Enqueues a synchronization batch into the persistent background task queue
	 * for asynchronous durable processing with SKIP LOCKED row locking.
	 */
	public static async enqueueSyncBatchTask(params: {
		organizationId: string;
		batch: SyncPushBatchRequest;
		authorUserId?: string | undefined;
		maxRetries?: number | undefined;
	}): Promise<SystemBackgroundJob> {
		const { organizationId, batch, authorUserId, maxRetries = 3 } = params;

		return await TaskQueueService.enqueue({
			organizationId,
			queueName: SYNC_QUEUE_NAME,
			taskName: "sync.process_push_batch",
			payload: {
				syncBatchId: batch.syncBatchId,
				clientId: batch.clientId,
				sentAt: batch.sentAt,
				mutationsCount: batch.mutations.length,
				authorUserId,
				batch,
			},
			maxRetries,
			scheduledFor: new Date(),
		});
	}

	/**
	 * Inspects comprehensive sync queue health for a specific tenant organization.
	 */
	public static async getDetailedSyncQueueHealth(
		organizationId: string,
	): Promise<OrganizationSyncQueueHealth> {
		const memoryBuffer = GatewayQueueManager.getQueueStats(organizationId);

		return await withSuperuserBypass(async (tx) => {
			const jobCounts = await tx
				.select({
					status: systemBackgroundJobs.status,
					count: sql<number>`count(*)::int`,
				})
				.from(systemBackgroundJobs)
				.where(
					and(
						eq(systemBackgroundJobs.organizationId, organizationId),
						eq(systemBackgroundJobs.queueName, SYNC_QUEUE_NAME),
					),
				)
				.groupBy(systemBackgroundJobs.status);

			const persistent = {
				pending: 0,
				processing: 0,
				completed: 0,
				failed: 0,
				deadLetter: 0,
				total: 0,
			};

			for (const row of jobCounts) {
				const c = Number(row.count) || 0;
				persistent.total += c;
				if (row.status === "pending") persistent.pending += c;
				else if (row.status === "processing") persistent.processing += c;
				else if (row.status === "completed") persistent.completed += c;
				else if (row.status === "failed") persistent.failed += c;
				else if (row.status === "dead_letter") persistent.deadLetter += c;
			}

			const [idempotencyCountRow] = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(syncIdempotencyRecords)
				.where(eq(syncIdempotencyRecords.organizationId, organizationId));

			const [vectorCountRow] = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(syncEntityVectors)
				.where(eq(syncEntityVectors.organizationId, organizationId));

			return {
				organizationId,
				memoryBuffer,
				persistentJobs: persistent,
				recentIdempotencyRecordsCount: Number(idempotencyCountRow?.count ?? 0),
				activeEntityVectorsCount: Number(vectorCountRow?.count ?? 0),
				serverTime: new Date().toISOString(),
			};
		});
	}

	/**
	 * Fetches dead-letter jobs for an organization to audit failures and unblock sync pipelines.
	 */
	public static async getDeadLetterSyncJobs(params: {
		organizationId: string;
		limit?: number | undefined;
		offset?: number | undefined;
	}): Promise<SystemBackgroundJob[]> {
		return await TaskQueueService.listJobs({
			organizationId: params.organizationId,
			queueName: SYNC_QUEUE_NAME,
			status: "dead_letter",
			limit: params.limit ?? 50,
			offset: params.offset ?? 0,
		});
	}

	/**
	 * Replays a failed or dead-letter sync task back into pending status.
	 */
	public static async replaySyncJob(
		organizationId: string,
		jobId: string,
	): Promise<ReplaySyncJobResult> {
		const retried = await TaskQueueService.retryJob(jobId, organizationId);
		return {
			success: true,
			job: retried,
			message: `Sync job ${jobId} successfully re-enqueued for organization ${organizationId}`,
		};
	}

	/**
	 * Recovers any stale sync tasks stuck in 'processing' state.
	 */
	public static async recoverStaleSyncTasks(
		organizationId: string,
		staleThresholdMs?: number | undefined,
	): Promise<{ recovered: number; deadLettered: number }> {
		return await TaskQueueService.recoverStaleTasks({
			organizationId,
			staleThresholdMs,
		});
	}
}

/**
 * Registers the background task handler for durable sync push batch processing.
 */
export function registerSyncTaskHandlers(): void {
	TaskQueueService.registerHandler("sync.process_push_batch", async (ctx) => {
		const payload = ctx.job.payload as {
			batch?: SyncPushBatchRequest | undefined;
			authorUserId?: string | undefined;
		} | null;

		if (!payload?.batch || !ctx.job.organizationId) {
			throw new Error(
				`Invalid sync batch payload or missing organizationId (jobId: ${ctx.job.id})`,
			);
		}

		const logger = ctx.logger
			? {
					info: (obj: unknown, msg?: string) => ctx.logger?.info(msg ?? "", obj),
					warn: (obj: unknown, msg?: string) => ctx.logger?.warn(msg ?? "", obj),
					error: (obj: unknown, msg?: string) => ctx.logger?.error(msg ?? "", obj),
				}
			: undefined;

		return await SyncGatewayService.processPushBatch(
			ctx.job.organizationId,
			payload.batch,
			payload.authorUserId,
			{ ...(logger !== undefined ? { logger } : {}) },
		);
	});
}

// Auto-register upon module load
registerSyncTaskHandlers();
