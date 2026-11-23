/**
 * @file syncAdministrativeHandlers.ts
 * @description Administrative HTTP endpoints for Sync Gateway & Task Queue in DENTE CRM.
 * Covers queue health inspection, dead-letter queue (DLQ) audits, deterministic replay triggers,
 * CRDT entity vector version audits, and stale task crash recovery.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { withSuperuserBypass } from "../../db/rls.js";
import {
	syncEntityVectors,
	syncIdempotencyRecords,
} from "../../db/schema.js";
import { RouteSyncQueueManager } from "./syncQueueManager.js";
import type { SyncMutationEntityKind } from "@dental/shared";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const replayJobSchema = z.object({
	jobId: z.string().regex(UUID_REGEX, "jobId must be a valid UUID"),
});

const listDlqQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional(),
});

const vectorAuditQuerySchema = z.object({
	entityKind: z
		.enum([
			"patient",
			"appointment",
			"visit",
			"visit_diary",
			"payment",
			"odontogram_state",
			"treatment_plan",
			"clinical_task",
		])
		.optional(),
	entityId: z.string().min(1).optional(),
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional(),
});

const recoverStaleSchema = z.object({
	staleThresholdMs: z.number().int().min(1000).max(86400000).optional(),
});

export class SyncAdministrativeHandlers {
	/**
	 * GET /api/sync/admin/queue/stats
	 * Returns comprehensive sync queue telemetry, memory buffer counts, and persistent job status.
	 */
	public static async getQueueStats(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"sync admin queue stats",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync admin queue stats",
		);
		if (!orgId) return;

		const health = await RouteSyncQueueManager.getDetailedSyncQueueHealth(orgId);
		return reply.code(200).send(health);
	}

	/**
	 * GET /api/sync/admin/dlq
	 * Returns failed / dead-letter queue items and rejected sync records for this organization.
	 */
	public static async getDeadLetterQueue(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"sync admin get dlq",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync admin get dlq",
		);
		if (!orgId) return;

		const queryParsed = listDlqQuerySchema.safeParse(request.query);
		const limit = queryParsed.success ? queryParsed.data.limit ?? 50 : 50;
		const offset = queryParsed.success ? queryParsed.data.offset ?? 0 : 0;

		const deadLetterJobs = await RouteSyncQueueManager.getDeadLetterSyncJobs({
			organizationId: orgId,
			limit,
			offset,
		});

		// Also fetch recent rejected idempotency records for complete audit
		const rejectedRecords = await withSuperuserBypass(async (tx) => {
			return await tx
				.select()
				.from(syncIdempotencyRecords)
				.where(
					and(
						eq(syncIdempotencyRecords.organizationId, orgId),
						eq(syncIdempotencyRecords.action, "rejected"),
					),
				)
				.orderBy(desc(syncIdempotencyRecords.createdAt))
				.limit(limit)
				.offset(offset);
		});

		return reply.code(200).send({
			organizationId: orgId,
			deadLetterJobs,
			rejectedIdempotencyRecords: rejectedRecords,
			totalDeadLetterCount: deadLetterJobs.length,
		});
	}

	/**
	 * POST /api/sync/admin/replay
	 * Manually triggers retry of a dead-lettered or failed sync task.
	 */
	public static async replaySyncJob(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"sync admin replay job",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync admin replay job",
		);
		if (!orgId) return;

		const parsed = replayJobSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Invalid replay request: jobId must be a valid UUID",
				issues: parsed.error.issues,
			});
		}

		try {
			const result = await RouteSyncQueueManager.replaySyncJob(
				orgId,
				parsed.data.jobId,
			);
			return reply.code(200).send(result);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return reply.code(404).send({
				error: "JobNotFoundError",
				message: msg,
			});
		}
	}

	/**
	 * GET /api/sync/admin/vectors
	 * Audits CRDT vector clocks and idempotency logs for clinical and financial entities.
	 */
	public static async getEntityVectorsAudit(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"sync admin vector audit",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync admin vector audit",
		);
		if (!orgId) return;

		const queryParsed = vectorAuditQuerySchema.safeParse(request.query);
		const limit = queryParsed.success ? queryParsed.data.limit ?? 50 : 50;
		const offset = queryParsed.success ? queryParsed.data.offset ?? 0 : 0;
		const entityKind = queryParsed.success ? queryParsed.data.entityKind : undefined;
		const entityId = queryParsed.success ? queryParsed.data.entityId : undefined;

		const vectors = await withSuperuserBypass(async (tx) => {
			const conditions = [eq(syncEntityVectors.organizationId, orgId)];
			if (entityKind) {
				conditions.push(eq(syncEntityVectors.entityKind, entityKind as SyncMutationEntityKind));
			}
			if (entityId) {
				conditions.push(eq(syncEntityVectors.entityId, entityId));
			}

			return await tx
				.select()
				.from(syncEntityVectors)
				.where(and(...conditions))
				.orderBy(desc(syncEntityVectors.updatedAt))
				.limit(limit)
				.offset(offset);
		});

		return reply.code(200).send({
			organizationId: orgId,
			vectors,
			count: vectors.length,
		});
	}

	/**
	 * POST /api/sync/admin/recover-stale
	 * Forces immediate recovery scan for tasks stuck in 'processing' status.
	 */
	public static async recoverStaleTasks(
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"sync admin recover stale",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync admin recover stale",
		);
		if (!orgId) return;

		const parsed = recoverStaleSchema.safeParse(request.body ?? {});
		const staleThresholdMs = parsed.success
			? parsed.data.staleThresholdMs
			: undefined;

		const result = await RouteSyncQueueManager.recoverStaleSyncTasks(
			orgId,
			staleThresholdMs,
		);

		return reply.code(200).send({
			organizationId: orgId,
			...result,
			message: `Stale task recovery completed: ${result.recovered} returned to pending, ${result.deadLettered} sent to DLQ.`,
		});
	}
}
