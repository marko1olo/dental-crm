/**
 * idempotencyStorageEngine.ts — High-Performance In-Memory & PostgreSQL Dual Storage Engine (Layer 2).
 */

import { and, eq, lt } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { idempotencyKeys, syncIdempotencyRecords } from "../../db/schema.js";
import { extractPgErrorCode } from "./idempotencyHeaderParser.js";
import type { IdempotencyContext, InMemoryRecord } from "./idempotencyTypes.js";

/** 60-second threshold for zombie in-flight locks (Crash Recovery) */
export const STALE_LOCK_THRESHOLD_MS = 60_000;

export function isLockStale(lockedAt: Date | string | number | null | undefined): boolean {
	if (!lockedAt) return false;
	const lockTime = new Date(lockedAt).getTime();
	if (Number.isNaN(lockTime)) return false;
	return Date.now() - lockTime > STALE_LOCK_THRESHOLD_MS;
}

// In-memory fallback map for unauthenticated or non-database contexts
const inMemoryIdempotencyCache = new Map<string, InMemoryRecord>();

export function clearInMemoryIdempotencyCache(): void {
	inMemoryIdempotencyCache.clear();
}

export function getInMemoryIdempotencyRecord(memKey: string): InMemoryRecord | undefined {
	return inMemoryIdempotencyCache.get(memKey);
}

export function setInMemoryIdempotencyRecord(memKey: string, record: InMemoryRecord): void {
	inMemoryIdempotencyCache.set(memKey, record);
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
		} catch {
			// Ignored for sync compatibility table
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
		} catch {
			// Ignored if sync table fails or duplicates
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
			} catch {
				// Fall back to conflict
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
	} catch {
		// Ignored
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
	} catch {
		// Ignored
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
	const { idempotencyKey, organizationId, payloadHash, useDatabase } = ctx;
	const memKey = `${organizationId ?? "global"}:${idempotencyKey}`;

	if (statusCode >= 500) {
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
			if (statusCode >= 500) {
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
	const { idempotencyKey, organizationId, useDatabase } = ctx;
	const memKey = `${organizationId ?? "global"}:${idempotencyKey}`;
	deleteInMemoryIdempotencyRecord(memKey);

	if (useDatabase && organizationId) {
		try {
			await evictDatabaseIdempotencyRecord(organizationId, idempotencyKey);
		} catch {
			// Ignore cleanup errors on error path
		}
	}
}
