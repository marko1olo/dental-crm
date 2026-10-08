import type {
	FieldConflictDetail,
	SyncMutationEnvelope,
	SyncMutationResult,
	SyncMutationStatus,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
} from "@dental/shared";
import type { TenantDb } from "../../../db/rls.js";
import { withTenantCtx } from "../../../db/rls.js";
import { SyncEntityHandlers } from "./syncEntityHandlers.js";
import { SyncQueueManager } from "./syncQueueManager.js";
import { SyncSecurityEnforcer } from "./syncSecurityEnforcer.js";
import { SyncStreamTransport } from "./syncStreamTransport.js";
import type { SyncProcessOptions, SyncPullResult } from "./types.js";

export * from "./types.js";
export * from "./constants.js";
export * from "./syncConflictResolver.js";
export * from "./syncStreamTransport.js";
export * from "./syncSecurityEnforcer.js";
export * from "./syncQueueManager.js";
export * from "./syncEntityHandlers.js";

/**
 * Master Gateway Coordinator for distributed clinic synchronization,
 * CRDT conflict resolution, double-spending prevention, and offline replication.
 */
export class SyncGatewayService {
	/**
	 * Ensures database tables for synchronization and vector clocks exist.
	 */
	public static async ensureSyncTablesExist(): Promise<void> {
		await SyncQueueManager.ensureSyncTablesExist();
	}

	/**
	 * Processes a batch of synchronization mutations from an offline client queue.
	 * Enforces idempotency (UUID + payload hash), double-spending protection for finances,
	 * and deterministic field-level CRDT conflict resolution for clinical records.
	 */
	public static async processPushBatch(
		organizationId: string,
		request: SyncPushBatchRequest,
		authorUserId?: string,
		options?: SyncProcessOptions,
	): Promise<SyncPushBatchResponse> {
		await this.ensureSyncTablesExist();

		const logger = options?.logger;
		if (logger) {
			logger.info(
				{
					syncBatchId: request.syncBatchId,
					clientId: request.clientId,
					mutationsCount: request.mutations.length,
					organizationId,
				},
				`[SyncGateway] Processing push batch: ${request.mutations.length} mutations`,
			);
		}

		return await withTenantCtx(organizationId, async (tx) => {
			const results: SyncMutationResult[] = [];
			let appliedCount = 0;
			let duplicateCount = 0;
			let mergedCount = 0;
			let rejectedCount = 0;

			const nowIso = new Date().toISOString();

			for (const mutation of request.mutations) {
				try {
					const mutationResult = await this.processSingleMutation(
						tx,
						organizationId,
						mutation,
						request.clientId,
						authorUserId,
					);

					results.push(mutationResult);

					if (mutationResult.status === "applied") {
						appliedCount++;
						logger?.info(
							{
								mutationId: mutation.mutationId,
								entityKind: mutation.entityKind,
								entityId: mutation.entityId,
								action: mutation.action,
							},
							`[SyncGateway] Mutation applied: ${mutation.entityKind}/${mutation.entityId}`,
						);
					} else if (mutationResult.status === "duplicate") {
						duplicateCount++;
						logger?.info(
							{
								mutationId: mutation.mutationId,
								idempotencyKey: mutation.idempotencyKey,
							},
							`[SyncGateway] Duplicate mutation ignored: ${mutation.idempotencyKey}`,
						);
					} else if (
						mutationResult.status === "merged" ||
						mutationResult.status === "conflict_resolved"
					) {
						mergedCount++;
						logger?.info(
							{
								mutationId: mutation.mutationId,
								entityKind: mutation.entityKind,
								status: mutationResult.status,
							},
							`[SyncGateway] CRDT conflict merged/resolved: ${mutation.entityKind}/${mutation.entityId}`,
						);
					} else if (mutationResult.status === "rejected") {
						rejectedCount++;
						logger?.warn(
							{ mutationId: mutation.mutationId, error: mutationResult.error },
							`[SyncGateway] Mutation rejected: ${mutationResult.error}`,
						);
					}
				} catch (err: unknown) {
					const errorMessage =
						err instanceof Error ? err.message : "Unknown sync mutation error";
					rejectedCount++;
					logger?.error(
						{ mutationId: mutation.mutationId, error: errorMessage },
						`[SyncGateway] Mutation error: ${errorMessage}`,
					);
					results.push({
						mutationId: mutation.mutationId,
						idempotencyKey: mutation.idempotencyKey,
						status: "rejected",
						entityKind: mutation.entityKind,
						entityId: mutation.entityId,
						appliedAt: nowIso,
						error: errorMessage,
					});
				}
			}

			if (logger) {
				logger.info(
					{
						syncBatchId: request.syncBatchId,
						appliedCount,
						duplicateCount,
						mergedCount,
						rejectedCount,
					},
					`[SyncGateway] Push batch complete: ${appliedCount} applied, ${mergedCount} merged, ${duplicateCount} dup, ${rejectedCount} rejected`,
				);
			}

			return {
				syncBatchId: request.syncBatchId,
				processedCount: request.mutations.length,
				appliedCount,
				duplicateCount,
				mergedCount,
				rejectedCount,
				results,
				serverTime: nowIso,
			};
		});
	}

	/**
	 * Processes an individual mutation envelope within the organization's tenant context.
	 */
	public static async processSingleMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<SyncMutationResult> {
		const nowIso = new Date().toISOString();

		// 1. Data Integrity Check: Verify payload hash matches canonical serialized payload
		const integrityCheck = SyncSecurityEnforcer.validateMutationIntegrity(mutation);
		if (!integrityCheck.isValid) {
			return {
				mutationId: mutation.mutationId,
				idempotencyKey: mutation.idempotencyKey,
				status: "rejected",
				entityKind: mutation.entityKind,
				entityId: mutation.entityId,
				appliedAt: nowIso,
				error: integrityCheck.error,
			};
		}

		const calculatedHash = integrityCheck.calculatedHash;

		// 2. Idempotency Check: Look for previous processing of this exact idempotency key
		const cachedResult = await SyncQueueManager.checkIdempotency({
			tx,
			organizationId,
			mutation,
			calculatedHash,
			nowIso,
		});

		if (cachedResult) {
			return cachedResult;
		}

		// 3. Dispatch entity-specific mutation handling
		let mutationStatus: SyncMutationStatus = "applied";
		let mergedFields: string[] = [];
		let conflictDetails: FieldConflictDetail[] = [];
		let currentServerEntity: Record<string, unknown> | undefined;

		if (mutation.entityKind === "payment") {
			const paymentResult = await SyncEntityHandlers.handlePaymentMutation(
				tx,
				organizationId,
				mutation,
			);
			mutationStatus = paymentResult.status;
			currentServerEntity = paymentResult.entity;
		} else if (mutation.entityKind === "patient") {
			const patientResult = await SyncEntityHandlers.handlePatientMutation(
				tx,
				organizationId,
				mutation,
				clientId,
				authorUserId,
			);
			mutationStatus = patientResult.status;
			mergedFields = patientResult.mergedFields || [];
			conflictDetails = patientResult.conflicts || [];
			currentServerEntity = patientResult.entity;
		} else if (
			mutation.entityKind === "visit" ||
			mutation.entityKind === "visit_diary"
		) {
			const clinicalResult = await SyncEntityHandlers.handleClinicalMutation(
				tx,
				organizationId,
				mutation,
				clientId,
				authorUserId,
			);
			mutationStatus = clinicalResult.status;
			mergedFields = clinicalResult.mergedFields || [];
			conflictDetails = clinicalResult.conflicts || [];
			currentServerEntity = clinicalResult.entity;
		} else if (mutation.entityKind === "appointment") {
			const appointmentResult =
				await SyncEntityHandlers.handleAppointmentMutation(
					tx,
					organizationId,
					mutation,
					clientId,
					authorUserId,
				);
			mutationStatus = appointmentResult.status;
			mergedFields = appointmentResult.mergedFields || [];
			conflictDetails = appointmentResult.conflicts || [];
			currentServerEntity = appointmentResult.entity;
		} else if (
			mutation.entityKind === "odontogram_state" ||
			(mutation.entityKind as string) === "tooth_state"
		) {
			const odontogramResult =
				await SyncEntityHandlers.handleOdontogramMutation(
					tx,
					organizationId,
					mutation,
					clientId,
					authorUserId,
				);
			mutationStatus = odontogramResult.status;
			mergedFields = odontogramResult.mergedFields || [];
			conflictDetails = odontogramResult.conflicts || [];
			currentServerEntity = odontogramResult.entity;
		} else {
			currentServerEntity = mutation.payload;
			mutationStatus = "applied";
		}

		// 4. Record idempotency log for exactly-once replay protection
		const raceDuplicate = await SyncQueueManager.recordIdempotency({
			tx,
			organizationId,
			mutation,
			calculatedHash,
			currentServerEntity,
		});

		if (raceDuplicate) {
			return raceDuplicate;
		}

		return {
			mutationId: mutation.mutationId,
			idempotencyKey: mutation.idempotencyKey,
			status: mutationStatus,
			entityKind: mutation.entityKind,
			entityId: mutation.entityId,
			appliedAt: nowIso,
			...(mergedFields.length > 0 ? { mergedFields } : {}),
			...(conflictDetails.length > 0 ? { conflictDetails } : {}),
			...(currentServerEntity ? { currentServerEntity } : {}),
		};
	}

	/**
	 * Pulls changed entities and vectors since a specified timestamp for offline client catch-up.
	 */
	public static async pullChanges(
		organizationId: string,
		sinceIso?: string,
	): Promise<SyncPullResult> {
		await this.ensureSyncTablesExist();
		return await SyncStreamTransport.pullChanges(organizationId, sinceIso);
	}
}
