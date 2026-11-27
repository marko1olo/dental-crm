import type { MutationVector, SyncMutationEnvelope, SyncMutationResult } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import { syncEntityVectors, syncIdempotencyRecords, syncTombstones } from "../../../db/schema.js";
import type { SyncQueueItem, SyncQueueStats } from "./types.js";

/**
 * Manages idempotent transaction logs, vector clocks, and offline queue buffer.
 */
export class SyncQueueManager {
	private static offlineQueue: SyncQueueItem[] = [];

	/**
	 * Ensures database tables for synchronization and vector clocks exist.
	 * Schema DDL is managed canonically via Postgres migrations (drizzle).
	 */
	public static async ensureSyncTablesExist(): Promise<void> {
		// Schema DDL is maintained strictly via Postgres migrations
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

		// Use PostgreSQL ON CONFLICT DO NOTHING to prevent aborting transaction (25P02) on race condition
		const [inserted] = await tx
			.insert(syncIdempotencyRecords)
			.values({
				organizationId,
				idempotencyKey: mutation.idempotencyKey,
				payloadHash: calculatedHash,
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				action: mutation.action,
				responseStatus: 200,
				responseJson: currentServerEntity ?? null,
				clientMutationVector: mutation.mutationVector ?? null,
			})
			.onConflictDoNothing({
				target: [syncIdempotencyRecords.organizationId, syncIdempotencyRecords.idempotencyKey],
			})
			.returning();

		if (inserted) {
			return null;
		}

		// Concurrent race: Another worker inserted the same idempotency key simultaneously.
		// Query the existing record safely without transaction abort.
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
				currentServerEntity: (raceRecord.responseJson as Record<string, unknown> | null) ?? undefined,
			};
		}

		return null;
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
	 * Records or refreshes a deletion tombstone for offline catch-up sync (`pullChanges`).
	 */
	public static async recordEntityTombstone(params: {
		tx: TenantDb;
		organizationId: string;
		entityKind: SyncMutationEnvelope["entityKind"];
		entityId: string;
		deletedByUserId?: string | null | undefined;
		reason?: string | null | undefined;
	}): Promise<{ id: string; deletedAt: Date }> {
		const { tx, organizationId, entityKind, entityId, deletedByUserId, reason } = params;
		const now = new Date();
		const [row] = await tx
			.insert(syncTombstones)
			.values({
				organizationId,
				entityKind,
				entityId,
				deletedAt: now,
				deletedByUserId: deletedByUserId ?? null,
				reason: reason ?? null,
			})
			.onConflictDoUpdate({
				target: [
					syncTombstones.organizationId,
					syncTombstones.entityKind,
					syncTombstones.entityId,
				],
				set: {
					deletedAt: now,
					deletedByUserId: deletedByUserId ?? null,
					reason: reason ?? null,
				},
			})
			.returning({
				id: syncTombstones.id,
				deletedAt: syncTombstones.deletedAt,
			});

		return row ?? { id: "", deletedAt: now };
	}

	/**
	 * Enqueues mutation into in-memory offline buffer for retry policies with bounded FIFO retention.
	 */
	public static enqueueOfflineMutation(item: SyncQueueItem): void {
		if (this.offlineQueue.length >= 1000) {
			this.offlineQueue.shift(); // Evict oldest entry to prevent memory exhaustion
		}
		this.offlineQueue.push(item);
	}

	/**
	 * Clears offline queue buffer for test isolation and cache lifecycle management.
	 */
	public static clearOfflineQueue(): void {
		this.offlineQueue = [];
	}

	/**
	 * Returns queue telemetry metrics for an organization.
	 */
	public static getQueueStats(organizationId: string): SyncQueueStats {
		const items = this.offlineQueue.filter((q) => q.organizationId === organizationId);
		const oldest = items[0]?.enqueuedAt;
		return {
			organizationId,
			pendingCount: items.filter((q) => q.retryCount === 0).length,
			processingCount: items.filter((q) => q.retryCount > 0 && q.retryCount < 5).length,
			deadLetterCount: items.filter((q) => q.retryCount >= 5).length,
			...(oldest !== undefined ? { oldestEnqueuedAt: oldest } : {}),
		};
	}
}
