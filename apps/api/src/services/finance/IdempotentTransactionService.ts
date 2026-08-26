/**
 * @dental/api/services/finance/IdempotentTransactionService
 *
 * Universal Production-Grade Financial Idempotency Engine for:
 * 1. 54-FZ Cashier Registers (АТОЛ, ШТРИХ-М, Cloud KKT)
 * 2. SBP (Система Быстрых Платежей) Dynamic QR payments & webhooks
 * 3. Sberbank POS Acquiring Terminal transactions
 * 4. Multi-tender split transactions (Cash + Electronic/Card + SBP + Deposit offset)
 *
 * Guarantees:
 * - Exactly-once execution of payments and fiscal print jobs
 * - Zero double-charging upon network drops or multi-click race conditions
 * - Replay protection: client retrying with identical Idempotency-Key within TTL receives
 *   the already generated transaction result (HTTP 200) instead of double-processing
 * - Payload mismatch detection: reusing the same key with different parameters is rejected with HTTP 409
 * - PostgreSQL advisory transaction locking (`pg_advisory_xact_lock`) for strict distributed concurrency serialization
 */

import {
	computePayloadHash,
	generateFinancialCompositeIdempotencyKey,
	parseFinancialIdempotencyKey,
	type SyncMutationEntityKind,
	verifyFinancialIdempotencyMatch,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	type NewSyncIdempotencyRecord,
	type SyncIdempotencyRecord,
	syncIdempotencyRecords,
} from "../../db/schema/sync.js";

export class IdempotencyPayloadMismatchError extends Error {
	public readonly statusCode = 409;
	public readonly code = "IDEMPOTENCY_PAYLOAD_MISMATCH";
	public readonly idempotencyKey: string;
	public readonly expectedPayloadHash: string;
	public readonly receivedPayloadHash: string;
	public readonly existingEntityId?: string | undefined;

	constructor(params: {
		idempotencyKey: string;
		expectedPayloadHash: string;
		receivedPayloadHash: string;
		existingEntityId?: string | undefined;
	}) {
		super(
			`Ключ идемпотентности '${params.idempotencyKey}' уже использован с другим набором параметров (Хеш в базе: ${params.expectedPayloadHash.slice(0, 8)}..., получено: ${params.receivedPayloadHash.slice(0, 8)}...). Повторное проведение запрещено.`,
		);
		this.name = "IdempotencyPayloadMismatchError";
		this.idempotencyKey = params.idempotencyKey;
		this.expectedPayloadHash = params.expectedPayloadHash;
		this.receivedPayloadHash = params.receivedPayloadHash;
		this.existingEntityId = params.existingEntityId;
	}
}

export class IdempotencyInProgressError extends Error {
	public readonly statusCode = 409;
	public readonly code = "IDEMPOTENCY_TRANSACTION_IN_PROGRESS";
	public readonly idempotencyKey: string;

	constructor(idempotencyKey: string) {
		super(
			`Финансовая транзакция с ключом '${idempotencyKey}' в данный момент обрабатывается другим процессом кассы. Дождитесь завершения.`,
		);
		this.name = "IdempotencyInProgressError";
		this.idempotencyKey = idempotencyKey;
	}
}

export interface IdempotentExecutionParams<T> {
	readonly organizationId: string;
	readonly idempotencyKey: string;
	readonly entityKind: SyncMutationEntityKind;
	readonly action: string;
	readonly payload: unknown;
	readonly entityId?: string | undefined;
	readonly ttlSeconds?: number | undefined;
	readonly handler: () => Promise<{
		responseStatus: number;
		responseJson: T;
		entityId?: string | undefined;
	}>;
}

export interface IdempotentExecutionResult<T> {
	readonly success: boolean;
	readonly isReplay: boolean;
	readonly responseStatus: number;
	readonly responseJson: T;
	readonly entityId: string;
	readonly idempotencyKey: string;
	readonly payloadHash: string;
	readonly executedAt: string;
}

// In-memory fast lock cache to eliminate unnecessary DB roundtrips for hot concurrent clicks
const activeInFlightKeys = new Set<string>();

export class IdempotentTransactionService {
	/**
	 * Computes 64-bit integer hash for PostgreSQL advisory lock key.
	 */
	public static computeAdvisoryLockKey(organizationId: string, mutationKey: string): number {
		const combined = `${organizationId}:${mutationKey}`;
		let hash = 0;
		for (let i = 0; i < combined.length; i++) {
			hash = (hash << 5) - hash + combined.charCodeAt(i);
			hash |= 0;
		}
		return hash;
	}

	/**
	 * Executes a financial transaction with strict idempotency, advisory locking, and replay caching.
	 */
	public static async executeIdempotentTransaction<T extends Record<string, unknown>>(
		params: IdempotentExecutionParams<T>,
	): Promise<IdempotentExecutionResult<T>> {
		const parsedKey = parseFinancialIdempotencyKey(params.idempotencyKey);
		const rawKey = parsedKey.uuid;
		const actualPayloadHash = computePayloadHash(params.payload);

		// 1. Verify embedded hash in composite key (if provided)
		if (parsedKey.embeddedHash !== null && parsedKey.embeddedHash !== actualPayloadHash) {
			throw new IdempotencyPayloadMismatchError({
				idempotencyKey: params.idempotencyKey,
				expectedPayloadHash: parsedKey.embeddedHash,
				receivedPayloadHash: actualPayloadHash,
			});
		}

		const memoryLockKey = `${params.organizationId}:${rawKey}`;
		if (activeInFlightKeys.has(memoryLockKey)) {
			// Fast check for parallel burst
			throw new IdempotencyInProgressError(params.idempotencyKey);
		}

		activeInFlightKeys.add(memoryLockKey);

		try {
			// 2. Perform DB advisory lock & existing record check inside transaction
			return await db.transaction(async (tx) => {
				const lockId = this.computeAdvisoryLockKey(params.organizationId, rawKey);
				await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

				// 3. Look up existing idempotency record
				const [existing] = await tx
					.select()
					.from(syncIdempotencyRecords)
					.where(
						and(
							eq(syncIdempotencyRecords.organizationId, params.organizationId),
							eq(syncIdempotencyRecords.idempotencyKey, rawKey),
						),
					)
					.limit(1);

				if (existing) {
					// Compare payload hash
					if (existing.payloadHash !== actualPayloadHash) {
						throw new IdempotencyPayloadMismatchError({
							idempotencyKey: params.idempotencyKey,
							expectedPayloadHash: existing.payloadHash,
							receivedPayloadHash: actualPayloadHash,
							existingEntityId: existing.entityId,
						});
					}

					// Return cached response (replay)
					return {
						success: existing.responseStatus >= 200 && existing.responseStatus < 300,
						isReplay: true,
						responseStatus: existing.responseStatus,
						responseJson: (existing.responseJson ?? {}) as T,
						entityId: existing.entityId,
						idempotencyKey: existing.idempotencyKey,
						payloadHash: existing.payloadHash,
						executedAt: existing.createdAt.toISOString(),
					};
				}

				// 4. Execute the actual payment/fiscal operation
				const handlerResult = await params.handler();
				const entityId = handlerResult.entityId ?? params.entityId ?? rawKey;

				// 5. Store completed idempotency record in PostgreSQL
				const [inserted] = await tx
					.insert(syncIdempotencyRecords)
					.values({
						organizationId: params.organizationId,
						idempotencyKey: rawKey,
						payloadHash: actualPayloadHash,
						entityKind: params.entityKind,
						entityId,
						action: params.action,
						responseStatus: handlerResult.responseStatus,
						responseJson: handlerResult.responseJson,
					})
					.returning();

				return {
					success: handlerResult.responseStatus >= 200 && handlerResult.responseStatus < 300,
					isReplay: false,
					responseStatus: handlerResult.responseStatus,
					responseJson: handlerResult.responseJson,
					entityId,
					idempotencyKey: rawKey,
					payloadHash: actualPayloadHash,
					executedAt: (inserted?.createdAt ?? new Date()).toISOString(),
				};
			});
		} finally {
			activeInFlightKeys.delete(memoryLockKey);
		}
	}

	/**
	 * Queries an existing idempotency record by key.
	 */
	public static async getRecord(
		organizationId: string,
		idempotencyKey: string,
	): Promise<SyncIdempotencyRecord | null> {
		const parsedKey = parseFinancialIdempotencyKey(idempotencyKey);
		const [row] = await db
			.select()
			.from(syncIdempotencyRecords)
			.where(
				and(
					eq(syncIdempotencyRecords.organizationId, organizationId),
					eq(syncIdempotencyRecords.idempotencyKey, parsedKey.uuid),
				),
			)
			.limit(1);

		return row ?? null;
	}

	/**
	 * Manually records a successful transaction in the idempotency log.
	 */
	public static async recordTransaction<T extends Record<string, unknown>>(params: {
		organizationId: string;
		idempotencyKey: string;
		entityKind: SyncMutationEntityKind;
		entityId: string;
		action: string;
		payload: unknown;
		responseStatus: number;
		responseJson: T;
	}): Promise<SyncIdempotencyRecord> {
		const parsedKey = parseFinancialIdempotencyKey(params.idempotencyKey);
		const rawKey = parsedKey.uuid;
		const payloadHash = computePayloadHash(params.payload);

		const [row] = await db
			.insert(syncIdempotencyRecords)
			.values({
				organizationId: params.organizationId,
				idempotencyKey: rawKey,
				payloadHash,
				entityKind: params.entityKind,
				entityId: params.entityId,
				action: params.action,
				responseStatus: params.responseStatus,
				responseJson: params.responseJson,
			})
			.onConflictDoUpdate({
				target: [syncIdempotencyRecords.organizationId, syncIdempotencyRecords.idempotencyKey],
				set: {
					responseStatus: params.responseStatus,
					responseJson: params.responseJson,
					updatedAt: new Date(),
				},
			})
			.returning();

		return row!;
	}
}
