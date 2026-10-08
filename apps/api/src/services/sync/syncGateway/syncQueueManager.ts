import type { MutationVector, SyncMutationEnvelope, SyncMutationResult } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import type { TenantDb } from "../../../db/rls.js";
import { syncEntityVectors, syncIdempotencyRecords } from "../../../db/schema.js";
import { SYNC_TABLE_DDL } from "./constants.js";
import type { SyncQueueItem, SyncQueueStats } from "./types.js";

/**
 * Manages idempotent transaction logs, vector clocks, and offline queue buffer.
 */
export class SyncQueueManager {
	private static offlineQueue: SyncQueueItem[] = [];

	/**
	 * Ensures database tables for synchronization and vector clocks exist.
	 */
	public static async ensureSyncTablesExist(): Promise<void> {
		try {
			await db.execute(SYNC_TABLE_DDL.CREATE_IDEMPOTENCY_RECORDS_TABLE);
			await db.execute(SYNC_TABLE_DDL.CREATE_IDEMPOTENCY_ORG_KEY_INDEX);
			await db.execute(SYNC_TABLE_DDL.CREATE_IDEMPOTENCY_ORG_ENTITY_INDEX);
			await db.execute(SYNC_TABLE_DDL.CREATE_ENTITY_VECTORS_TABLE);
			await db.execute(SYNC_TABLE_DDL.CREATE_ENTITY_VECTORS_ORG_KIND_ENTITY_INDEX);
		} catch {
			// Ignore if tables or indexes already exist
		}
	}

	/**
	 * Checks whether an idempotency key was previously processed for this organization.
	 */
	public static async checkIdempotency(params: {
		tx: TenantDb;
		organizationId: string;
		mutation: SyncMutationEnvelope;
		calculatedHash: string;
		nowIso: string;
	}): Promise<SyncMutationResult | null> {
		const { tx, organizationId, mutation, calculatedHash, nowIso } = params;

		const [existingIdempotency] = await tx
			.select()
			.from(syncIdempotencyRecords)
			.where(
				and(
					eq(syncIdempotencyRecords.organizationId, organizationId),
					eq(syncIdempotencyRecords.idempotencyKey, mutation.idempotencyKey),
				),
			)
			.limit(1);

		if (!existingIdempotency) {
			return null;
		}

		// If key was used with a DIFFERENT payload hash, reject as conflict
		if (existingIdempotency.payloadHash !== calculatedHash) {
			return {
				mutationId: mutation.mutationId,
				idempotencyKey: mutation.idempotencyKey,
				status: "rejected",
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				appliedAt: nowIso,
				error: "Idempotency-Key collision: same key was previously processed with different payload",
			};
		}

		// Exact duplicate: return cached response, guarantee zero double-execution / zero double-billing
		return {
			mutationId: mutation.mutationId,
			idempotencyKey: mutation.idempotencyKey,
			status: "duplicate",
			entityKind: mutation.entityKind,
			entityId: mutation.entityId,
			appliedAt: existingIdempotency.createdAt.toISOString(),
			currentServerEntity: existingIdempotency.responseJson ?? undefined,
		};
	}

	/**
	 * Persists an idempotency record. Handles race conditions via graceful duplicate fallback.
	 */
	public static async recordIdempotency(params: {
		tx: TenantDb;
		organizationId: string;
		mutation: SyncMutationEnvelope;
		calculatedHash: string;
		currentServerEntity?: Record<string, unknown>;
	}): Promise<SyncMutationResult | null> {
		const { tx, organizationId, mutation, calculatedHash, currentServerEntity } = params;

		try {
			await tx.insert(syncIdempotencyRecords).values({
				organizationId,
				idempotencyKey: mutation.idempotencyKey,
				payloadHash: calculatedHash,
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				action: mutation.action,
				responseStatus: 200,
				responseJson: currentServerEntity ?? null,
				clientMutationVector: mutation.mutationVector ?? null,
			});
			return null;
		} catch {
			// Concurrent race: If another worker inserted the same idempotency key simultaneously,
			// query the existing record and return duplicate status.
			const [raceRecord] = await tx
				.select()
				.from(syncIdempotencyRecords)
				.where(
					and(
						eq(syncIdempotencyRecords.organizationId, organizationId),
						eq(syncIdempotencyRecords.idempotencyKey, mutation.idempotencyKey),
					),
				)
				.limit(1);

			if (raceRecord) {
				return {
					mutationId: mutation.mutationId,
					idempotencyKey: mutation.idempotencyKey,
					status: "duplicate",
					entityKind: mutation.entityKind,
					entityId: mutation.entityId,
					appliedAt: raceRecord.createdAt.toISOString(),
					currentServerEntity: raceRecord.responseJson ?? undefined,
				};
			}

			return null;
		}
	}

	/**
	 * Persists or updates the vector clock for an entity.
	 */
	public static async upsertEntityVector(
		tx: TenantDb,
		organizationId: string,
		entityKind: SyncMutationEnvelope["entityKind"],
		entityId: string,
		vector: MutationVector,
		lastMutationId?: string,
	): Promise<void> {
		const [existing] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, entityKind),
					eq(syncEntityVectors.entityId, entityId),
				),
			)
			.limit(1);

		if (existing) {
			await tx
				.update(syncEntityVectors)
				.set({
					vectorJson: vector,
					currentVersion: (existing.currentVersion ?? 1) + 1,
					lastMutationId: lastMutationId ?? existing.lastMutationId,
					updatedAt: new Date(),
				})
				.where(eq(syncEntityVectors.id, existing.id));
		} else {
			await tx.insert(syncEntityVectors).values({
				organizationId,
				entityKind,
				entityId,
				currentVersion: 1,
				vectorJson: vector,
				lastMutationId,
			});
		}
	}

	/**
	 * Enqueues mutation into in-memory offline buffer for retry policies.
	 */
	public static enqueueOfflineMutation(item: SyncQueueItem): void {
		this.offlineQueue.push(item);
	}

	/**
	 * Returns queue telemetry metrics for an organization.
	 */
	public static getQueueStats(organizationId: string): SyncQueueStats {
		const items = this.offlineQueue.filter((q) => q.organizationId === organizationId);
		return {
			organizationId,
			pendingCount: items.filter((q) => q.retryCount === 0).length,
			processingCount: items.filter((q) => q.retryCount > 0 && q.retryCount < 5).length,
			deadLetterCount: items.filter((q) => q.retryCount >= 5).length,
			oldestEnqueuedAt: items[0]?.enqueuedAt,
		};
	}
}
