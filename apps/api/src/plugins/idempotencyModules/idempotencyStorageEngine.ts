/**
 * idempotencyStorageEngine.ts — High-Performance In-Memory & PostgreSQL Dual Storage Engine (Layer 2).
 */

import { and, eq, lt } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { idempotencyKeys, syncIdempotencyRecords } from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { extractPgErrorCode } from "./idempotencyHeaderParser.js";
import type { IdempotencyContext, InMemoryRecord } from "./idempotencyTypes.js";

const logger = createApiLogger("idempotencyStorageEngine");

/** 60-second threshold for zombie in-flight locks (Crash Recovery) */
export const STALE_LOCK_THRESHOLD_MS = 60_000;
/** 24-hour TTL for completed in-memory idempotency cache entries */
export const IN_MEMORY_COMPLETED_TTL_MS = 24 * 60 * 60 * 1000;
/** Bounded LRU capacity to prevent unbounded memory growth */
export const MAX_IN_MEMORY_CACHE_SIZE = 10_000;

export function isLockStale(lockedAt: Date | string | number | null | undefined): boolean {
	if (!lockedAt) return false;
	const lockTime = new Date(lockedAt).getTime();
	if (Number.isNaN(lockTime)) return false;
	return Date.now() - lockTime > STALE_LOCK_THRESHOLD_MS;
}

export function shouldEvictIdempotencyStatus(statusCode: number): boolean {
	return (
		statusCode >= 500 ||
		statusCode === 401 ||
		statusCode === 403 ||
		statusCode === 408 ||
		statusCode === 409 ||
		statusCode === 429
	);
}

// Bounded LRU + TTL fallback map for unauthenticated or intra-process fast-path deduplication
const inMemoryIdempotencyCache = new Map<string, InMemoryRecord>();

export function buildIdempotencyMemKey(memScope: string, idempotencyKey: string): string {
	return `${memScope}:${idempotencyKey}`;
}

export function clearInMemoryIdempotencyCache(): void {
	inMemoryIdempotencyCache.clear();
}

export function getInMemoryIdempotencyRecord(memKey: string): InMemoryRecord | undefined {
	const existing = inMemoryIdempotencyCache.get(memKey);
	if (!existing) return undefined;

	const ageMs = Date.now() - existing.createdAt;
	if (
		(existing.action === "completed" && ageMs > IN_MEMORY_COMPLETED_TTL_MS) ||
		(existing.action === "in_flight" && ageMs > STALE_LOCK_THRESHOLD_MS)
	) {
		inMemoryIdempotencyCache.delete(memKey);
		return undefined;
	}

	// Refresh LRU recency
	inMemoryIdempotencyCache.delete(memKey);
	inMemoryIdempotencyCache.set(memKey, existing);
	return existing;
}

export function setInMemoryIdempotencyRecord(memKey: string, record: InMemoryRecord): void {
	if (inMemoryIdempotencyCache.has(memKey)) {
		inMemoryIdempotencyCache.delete(memKey);
	}
	inMemoryIdempotencyCache.set(memKey, record);
	while (inMemoryIdempotencyCache.size > MAX_IN_MEMORY_CACHE_SIZE) {
		const oldestKey = inMemoryIdempotencyCache.keys().next().value;
		if (oldestKey === undefined) break;
		inMemoryIdempotencyCache.delete(oldestKey);
	}
}

export function deleteInMemoryIdempotencyRecord(memKey: string): void {
	inMemoryIdempotencyCache.delete(memKey);
}

export interface DatabaseLookupResult {
	existingIdemKey?: typeof idempotencyKeys.$inferSelect | undefined;
	existingSyncRecord?: typeof syncIdempotencyRecords.$inferSelect | undefined;
}

/**
 * Queries both idempotencyKeys and syncIdempotencyRecords under tenant RLS.
 */
export async function queryDatabaseIdempotencyRecord(
	tenantId: string,
	idempotencyKey: string,
): Promise<DatabaseLookupResult> {
	let existingIdemKey: typeof idempotencyKeys.$inferSelect | undefined;
	let existingSyncRecord: typeof syncIdempotencyRecords.$inferSelect | undefined;

	await withTenantCtx(tenantId, async (tx) => {
		const [foundKey] = await tx
			.select()
			.from(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, tenantId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			)
			.limit(1);
		existingIdemKey = foundKey;

		if (!existingIdemKey) {
			const [foundSync] = await tx
				.select()
				.from(syncIdempotencyRecords)
				.where(
					and(
						eq(syncIdempotencyRecords.organizationId, tenantId),
						eq(syncIdempotencyRecords.idempotencyKey, idempotencyKey),
					),
				)
				.limit(1);
			existingSyncRecord = foundSync;
		}
	});

	return { existingIdemKey, existingSyncRecord };
}

export type InsertInFlightResult =
	| { success: true }
	| { success: false; isConflict: true }
	| { success: false; isConflict: false; error: unknown };

/**
 * Atomically reclaims a zombie in-flight lock (older than 60 seconds) in PostgreSQL.
 * Resets locked_at = NOW(), payload_hash, and allows execution to proceed safely.
 */
export async function reclaimStaleLock(
	tenantId: string,
	idempotencyKey: string,
	payloadHash: string,
): Promise<boolean> {
	let reclaimed = false;
	const staleCutoff = new Date(Date.now() - STALE_LOCK_THRESHOLD_MS);

	await withTenantCtx(tenantId, async (tx) => {
		const updatedRows = await tx
			.update(idempotencyKeys)
			.set({
				status: "in_flight",
				payloadHash,
				responseCode: 0,
				responseBody: null,
				lockedAt: new Date(),
			})
			.where(
				and(
					eq(idempotencyKeys.clinicId, tenantId),
					eq(idempotencyKeys.key, idempotencyKey),
					eq(idempotencyKeys.status, "in_flight"),
					lt(idempotencyKeys.lockedAt, staleCutoff),
				),
			)
			.returning();

		const firstUpdated = updatedRows[0];
		if (firstUpdated) {
			reclaimed = true;
		}
	});

	if (reclaimed) {
		try {
			await withTenantCtx(tenantId, async (tx) => {
				await tx
					.update(syncIdempotencyRecords)
					.set({
						action: "in_flight",
						payloadHash,
						responseStatus: 0,
						responseJson: null,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(syncIdempotencyRecords.organizationId, tenantId),
							eq(syncIdempotencyRecords.idempotencyKey, idempotencyKey),
						),
					);
			});
		} catch (syncErr) {
			logger.debug(
				{ err: safeLogError(syncErr), tenantId, idempotencyKey },
				"Sync compatibility table stale-lock reclaim skipped",
			);
		}
	}

	return reclaimed;
}

/**
 * Records in-flight row in PostgreSQL idempotency_keys with race condition protection
 * and zombie lock auto-reclaim.
 */
export async function recordInFlightToDatabase(
	tenantId: string,
	idempotencyKey: string,
	payloadHash: string,
): Promise<InsertInFlightResult> {
	try {
		await withTenantCtx(tenantId, async (tx) => {
			await tx.insert(idempotencyKeys).values({
				clinicId: tenantId,
				key: idempotencyKey,
				status: "in_flight",
				payloadHash,
				responseCode: 0,
				responseBody: null,
				lockedAt: new Date(),
			});
		});

		// Dual-persist to syncIdempotencyRecords for sync compatibility in independent transaction
		try {
			await withTenantCtx(tenantId, async (tx) => {
				await tx.insert(syncIdempotencyRecords).values({
					organizationId: tenantId,
					idempotencyKey,
					payloadHash,
					entityKind: "payment" as const,
					entityId: idempotencyKey,
					action: "in_flight",
					responseStatus: 0,
					responseJson: null,
				});
			});
		} catch (syncInsertErr) {
			logger.debug(
				{ err: safeLogError(syncInsertErr), tenantId, idempotencyKey },
				"Sync compatibility table in-flight insert skipped",
			);
		}

		return { success: true };
	} catch (insertErr: unknown) {
		const pgCode = extractPgErrorCode(insertErr);
		const errStr = String(insertErr);
		if (
			pgCode === "23505" ||
			errStr.includes("23505") ||
			errStr.includes("unique constraint") ||
			errStr.includes("idempotency_keys_clinic_key_idx")
		) {
			// Check if the conflicting row is a zombie in-flight lock (> 60s) and reclaim it!
			try {
				const reclaimed = await reclaimStaleLock(tenantId, idempotencyKey, payloadHash);
				if (reclaimed) {
					return { success: true };
				}
			} catch (reclaimErr) {
				logger.warn(
					{ err: safeLogError(reclaimErr), tenantId, idempotencyKey },
					"Failed to reclaim stale idempotency lock; returning conflict",
				);
			}
			return { success: false, isConflict: true };
		}
		return { success: false, isConflict: false, error: insertErr };
	}
}

/**
 * Records completed response in database tables under tenant RLS.
 */
export async function recordCompletedToDatabase(
	organizationId: string,
	idempotencyKey: string,
	statusCode: number,
	parsedJson: Record<string, unknown> | null,
): Promise<void> {
	await withTenantCtx(organizationId, async (tx) => {
		await tx
			.update(idempotencyKeys)
			.set({
				responseCode: statusCode,
				responseBody: parsedJson,
				status: "completed",
				lockedAt: new Date(),
			})
			.where(
				and(
					eq(idempotencyKeys.clinicId, organizationId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			);
	});

	try {
		await withTenantCtx(organizationId, async (tx) => {
			await tx
				.update(syncIdempotencyRecords)
				.set({
					responseStatus: statusCode,
					responseJson: parsedJson,
					action: "completed",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(syncIdempotencyRecords.organizationId, organizationId),
						eq(syncIdempotencyRecords.idempotencyKey, idempotencyKey),
					),
				);
		});
	} catch (syncCompleteErr) {
		logger.debug(
			{ err: safeLogError(syncCompleteErr), organizationId, idempotencyKey },
			"Sync compatibility table completion update skipped",
		);
	}
}

/**
 * Removes in-flight or failed record from database tables so subsequent retries are allowed.
 */
export async function evictDatabaseIdempotencyRecord(
	organizationId: string,
	idempotencyKey: string,
): Promise<void> {
	await withTenantCtx(organizationId, async (tx) => {
		await tx
			.delete(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, organizationId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			);
	});

	try {
		await withTenantCtx(organizationId, async (tx) => {
			await tx
				.delete(syncIdempotencyRecords)
				.where(
					and(
						eq(syncIdempotencyRecords.organizationId, organizationId),
						eq(syncIdempotencyRecords.idempotencyKey, idempotencyKey),
					),
				);
		});
	} catch (syncEvictErr) {
		logger.debug(
			{ err: safeLogError(syncEvictErr), organizationId, idempotencyKey },
			"Sync compatibility table eviction skipped",
		);
	}
}

/**
 * Persists final HTTP response or evicts in-flight record on 5xx server failure.
 */
export async function persistResponseOrEvictOnFailure(
	ctx: IdempotencyContext,
	statusCode: number,
	parsedJson: Record<string, unknown> | null,
	logError?: (details: Record<string, unknown>, msg: string) => void,
): Promise<void> {
	const { idempotencyKey, organizationId, memScope, payloadHash, useDatabase } = ctx;
	const memKey = buildIdempotencyMemKey(memScope ?? organizationId ?? "unscoped", idempotencyKey);
	const evict = shouldEvictIdempotencyStatus(statusCode);

	if (evict) {
		deleteInMemoryIdempotencyRecord(memKey);
	} else {
		setInMemoryIdempotencyRecord(memKey, {
			idempotencyKey,
			payloadHash,
			responseStatus: statusCode,
			responseJson: parsedJson,
			action: "completed",
			createdAt: Date.now(),
		});
	}

	if (useDatabase && organizationId) {
		try {
			if (evict) {
				await evictDatabaseIdempotencyRecord(organizationId, idempotencyKey);
			} else {
				await recordCompletedToDatabase(
					organizationId,
					idempotencyKey,
					statusCode,
					parsedJson,
				);
			}
		} catch (updateErr) {
			if (logError) {
				logError(
					{ error: updateErr, idempotencyKey },
					"[IdempotencyPlugin] Failed to save completed response to idempotency_keys",
				);
			}
		}
	}
}

/**
 * Cleans up in-memory lock and in-flight DB row when uncaught exception happens.
 */
export async function cleanupOnUncaughtError(
	ctx: IdempotencyContext,
): Promise<void> {
	const { idempotencyKey, organizationId, memScope, useDatabase } = ctx;
	const memKey = buildIdempotencyMemKey(memScope ?? organizationId ?? "unscoped", idempotencyKey);
	deleteInMemoryIdempotencyRecord(memKey);

	if (useDatabase && organizationId) {
		try {
			await evictDatabaseIdempotencyRecord(organizationId, idempotencyKey);
		} catch (cleanupErr) {
			logger.warn(
				{ err: safeLogError(cleanupErr), organizationId, idempotencyKey },
				"Failed to evict idempotency DB record during uncaught error cleanup",
			);
		}
	}
}
