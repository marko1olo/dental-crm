/**
 * Layer 2: EGISZ REMD Outbox Queue Processor & Worker Dispatcher.
 * Manages background outbox queue processing, concurrency locks, retry backoff,
 * cryptographic audit trails, and submission status transitions.
 * Zero mocks: strictly dispatches genuine signed packages with doctor UKEP (FZ-63 / Order 911n).
 */

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { TenantDb } from "../../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import {
	egiszOutbox,
	type EgiszOutboxItem,
} from "../../../db/schema.js";
import { appendEgiszAuditLog, computePayloadSha256 } from "../EgiszAuditService.js";
import {
	OiisGatewayClient,
} from "../OiisGatewayClient.js";
import { canonicalizeCdaXml } from "../../cda/signature.js";
import type {
	EgiszQueueHealthSummary,
	EgiszRemdRegistrationReceipt,
	EnqueueSignedPackageInput,
	EnqueueSignedPackageResult,
	OutboxProcessResult,
} from "./types.js";
import { getReceiptByOutboxId, getReceiptByVisitId } from "./receiptManager.js";
import { syncPendingStatuses } from "./statusSyncer.js";
import { processOutboxRow } from "./outboxRowSender.js";
import { resolveN3HealthConfig } from "../../../routes/egisz/n3/n3Config.js";
import { calculateEgiszRetryDelayMs } from "./egiszGatewayClient.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";

const logger = createApiLogger("egiszOutboxDispatcher");

export class EgiszOutboxDispatcher {
	private readonly client: OiisGatewayClient;

	constructor(client?: OiisGatewayClient) {
		this.client = client ?? new OiisGatewayClient();
	}

	public getClient(): OiisGatewayClient {
		return this.client;
	}

	/**
	 * Резолвит OiisGatewayClient с учетом настроек клиники из БД (workspaceFeatureFlags.n3HealthVipnetConfig)
	 * DEF-EG-02: считывание настроек ViPNet конкретной организации.
	 */
	public async resolveClientForOrg(organizationId?: string): Promise<OiisGatewayClient> {
		if (!organizationId) return this.client;
		try {
			const n3Res = await resolveN3HealthConfig(organizationId);
			if (n3Res?.config) {
				const restBaseUrl = (process.env.EGISZ_N3_BASE_URL || "https://api.n3health.ru/egisz/v1").replace(/\/+$/, "");
				return new OiisGatewayClient({
					baseUrl: restBaseUrl,
					guid: n3Res.config.authGuid,
					lpuId: n3Res.config.idLpu,
					clinicOid: n3Res.config.clinicOid,
					apiKey: n3Res.config.eventLogToken,
					timeoutMs: n3Res.config.timeoutMs,
				});
			}
		} catch (err: unknown) {
			logger.warn(
				{ err: safeLogError(err), organizationId },
				"Failed to resolve N3Health config for org, falling back to default OiisGatewayClient",
			);
		}
		return this.client;
	}

	/**
	 * Enqueues a pre-signed SEMD package with UKEP into the EGISZ REMD Outbox Queue.
	 * Guarantees zero-blocking UI operation: writes to egisz_outbox & egisz_logs,
	 * appends cryptographic audit record, and returns immediately.
	 */
	public async enqueueSignedPackage(
		input: EnqueueSignedPackageInput,
	): Promise<EnqueueSignedPackageResult> {
		const canonicalXml = canonicalizeCdaXml(input.pkg.xmlCanonicalPayload);
		const payloadHashSha256 = computePayloadSha256(canonicalXml);
		const dedupeKey = `${input.pkg.documentId}-v${input.pkg.documentVersion}`;

		const doctorSignedAt = input.pkg.doctorSignature.signedAt
			? new Date(input.pkg.doctorSignature.signedAt)
			: new Date();
		const moSignedAt = input.pkg.moSignature?.signedAt
			? new Date(input.pkg.moSignature.signedAt)
			: null;

		const outboxRow = await withTenantCtx(input.organizationId, async (tx) => {
			const [row] = await tx
				.insert(egiszOutbox)
				.values({
					organizationId: input.organizationId,
					visitId: input.visitId,
					patientId: input.patientId,
					doctorId: input.doctorId,
					documentId: input.documentId ?? null,
					docTypeNsiCode: input.pkg.metadata.docTypeNsiCode || "108",
					status: "ready_for_dispatch",
					payloadXml: canonicalXml,
					payloadHashSha256,
					doctorSignaturePkcs7: input.pkg.doctorSignature.signatureBase64,
					doctorCertSerial: input.pkg.doctorSignature.certificateSerialNumber,
					doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
					doctorSignedAt,
					moSignaturePkcs7: input.pkg.moSignature?.signatureBase64 ?? null,
					moCertSerial: input.pkg.moSignature?.certificateSerialNumber ?? null,
					moCertSubject: input.pkg.moSignature?.certificateSubject ?? null,
					moSignedAt,
					attempts: 0,
					maxAttempts: 5,
					scheduledAt: new Date(),
					nextAttemptAt: new Date(),
					dedupeKey,
				})
				.onConflictDoUpdate({
					target: [egiszOutbox.organizationId, egiszOutbox.dedupeKey],
					set: {
						status: "ready_for_dispatch",
						payloadXml: canonicalXml,
						payloadHashSha256,
						doctorSignaturePkcs7: input.pkg.doctorSignature.signatureBase64,
						doctorCertSerial: input.pkg.doctorSignature.certificateSerialNumber,
						doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
						doctorSignedAt,
						moSignaturePkcs7: input.pkg.moSignature?.signatureBase64 ?? null,
						moCertSerial: input.pkg.moSignature?.certificateSerialNumber ?? null,
						moCertSubject: input.pkg.moSignature?.certificateSubject ?? null,
						moSignedAt,
						attempts: 0,
						nextAttemptAt: new Date(),
						updatedAt: new Date(),
					},
				})
				.returning();

			if (!row) {
				throw new Error("Не удалось сохранить запись пакета в egisz_outbox.");
			}

			// Append cryptographic audit trail for immutable legal record
			await appendEgiszAuditLog(tx, {
				organizationId: input.organizationId,
				eventType: "REMD_SEMD_QUEUED",
				entityType: "egisz_outbox",
				entityId: row.id,
				patientId: input.patientId,
				actorUserId: input.actorUserId ?? null,
				payload: {
					outboxId: row.id,
					logId: row.id,
					visitId: input.visitId,
					documentId: input.documentId ?? null,
					docTypeNsiCode: input.pkg.metadata.docTypeNsiCode,
					doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
					dedupeKey,
				},
			});

			return row;
		});

		return {
			success: true,
			outboxId: outboxRow.id,
			logId: outboxRow.id,
			dedupeKey,
			status: "ready_for_dispatch",
			canonicalXmlLength: canonicalXml.length,
		};
	}

	/**
	 * Processes pending EGISZ REMD submissions for an organization (or all organizations).
	 * Uses atomic PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED + UPDATE inside a single
	 * ACID transaction for both stale lock recovery and batch claiming.
	 */
	public async processPendingQueue(
		organizationId?: string,
		limit = 50,
	): Promise<OutboxProcessResult> {
		const result: OutboxProcessResult = {
			processedCount: 0,
			successCount: 0,
			failedCount: 0,
			results: [],
		};

		if (limit <= 0) {
			return result;
		}

		// 1. Atomic stale lock recovery: recover items stuck in 'sending' without transaction ID for > 5 minutes
		const staleThreshold = new Date(Date.now() - 5 * 60_000);
		const recoverStaleInTx = async (tx: TenantDb): Promise<void> => {
			const staleWhere = organizationId
				? and(
						eq(egiszOutbox.organizationId, organizationId),
						eq(egiszOutbox.status, "sending"),
						sql`${egiszOutbox.remdTransactionId} IS NULL`,
						or(
							lte(egiszOutbox.lockedAt, staleThreshold),
							sql`${egiszOutbox.lockedAt} IS NULL`,
						),
					)
				: and(
						eq(egiszOutbox.status, "sending"),
						sql`${egiszOutbox.remdTransactionId} IS NULL`,
						or(
							lte(egiszOutbox.lockedAt, staleThreshold),
							sql`${egiszOutbox.lockedAt} IS NULL`,
						),
					);

			const lockedStaleRows = await tx
				.select({
					id: egiszOutbox.id,
					attempts: egiszOutbox.attempts,
					maxAttempts: egiszOutbox.maxAttempts,
					organizationId: egiszOutbox.organizationId,
					visitId: egiszOutbox.visitId,
					patientId: egiszOutbox.patientId,
				})
				.from(egiszOutbox)
				.where(staleWhere)
				.limit(limit)
				.for("update", { skipLocked: true });

			for (const staleRow of lockedStaleRows) {
				const nextAttempt = staleRow.attempts + 1;
				const delayMs = calculateEgiszRetryDelayMs(nextAttempt);
				const isTerminal = nextAttempt >= staleRow.maxAttempts;
				const nextStatus = isTerminal ? "failed" : "ready_for_dispatch";
				const recoveredAt = new Date();

				const applyRecovery = async (tenantTx: TenantDb): Promise<void> => {
					await tenantTx
						.update(egiszOutbox)
						.set({
							status: nextStatus,
							attempts: nextAttempt,
							nextAttemptAt: new Date(recoveredAt.getTime() + (isTerminal ? 0 : delayMs)),
							lastErrorClass: "StaleLockTimeout",
							lastErrorMessage: "Сброс зависшей блокировки воркера (таймаут отправки > 5 мин)",
							lockedAt: null,
							lockedBy: null,
							updatedAt: recoveredAt,
						})
						.where(
							and(
								eq(egiszOutbox.id, staleRow.id),
								eq(egiszOutbox.organizationId, staleRow.organizationId),
								eq(egiszOutbox.status, "sending"),
							),
						);

					await appendEgiszAuditLog(tenantTx, {
						organizationId: staleRow.organizationId,
						eventType: isTerminal ? "REMD_STALE_LOCK_EXHAUSTED" : "REMD_STALE_LOCK_RECOVERED",
						entityType: "egisz_outbox",
						entityId: staleRow.id,
						patientId: staleRow.patientId,
						payload: {
							outboxId: staleRow.id,
							visitId: staleRow.visitId,
							previousAttempts: staleRow.attempts,
							newAttempts: nextAttempt,
							status: nextStatus,
							retryScheduledInMs: isTerminal ? null : delayMs,
						},
					});
				};

				if (organizationId) {
					await applyRecovery(tx);
				} else {
					await withTenantCtx(staleRow.organizationId, applyRecovery);
				}
			}
		};

		if (organizationId) {
			await withTenantCtx(organizationId, recoverStaleInTx);
		} else {
			await withSuperuserBypass(recoverStaleInTx);
		}

		// 2. Atomic batch claim: SELECT ... FOR UPDATE SKIP LOCKED + UPDATE status='sending' in one ACID transaction
		const claimNow = new Date();
		const workerLock = `worker-${process.pid}-${claimNow.getTime()}-${randomUUID().slice(0, 8)}`;

		const claimBatchInTx = async (tx: TenantDb): Promise<EgiszOutboxItem[]> => {
			const dueWhere = organizationId
				? and(
						eq(egiszOutbox.organizationId, organizationId),
						inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
						or(isNull(egiszOutbox.nextAttemptAt), lte(egiszOutbox.nextAttemptAt, claimNow)),
						sql`${egiszOutbox.attempts} < ${egiszOutbox.maxAttempts}`,
					)
				: and(
						inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
						or(isNull(egiszOutbox.nextAttemptAt), lte(egiszOutbox.nextAttemptAt, claimNow)),
						sql`${egiszOutbox.attempts} < ${egiszOutbox.maxAttempts}`,
					);

			const candidates = await tx
				.select({
					id: egiszOutbox.id,
					organizationId: egiszOutbox.organizationId,
				})
				.from(egiszOutbox)
				.where(dueWhere)
				.orderBy(asc(egiszOutbox.nextAttemptAt), asc(egiszOutbox.createdAt))
				.limit(limit)
				.for("update", { skipLocked: true });

			if (candidates.length === 0) {
				return [];
			}

			if (organizationId) {
				const ids = candidates.map((c) => c.id);
				return tx
					.update(egiszOutbox)
					.set({
						status: "sending",
						lockedAt: claimNow,
						lockedBy: workerLock,
						updatedAt: claimNow,
					})
					.where(
						and(
							eq(egiszOutbox.organizationId, organizationId),
							inArray(egiszOutbox.id, ids),
							inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
						),
					)
					.returning();
			}

			// Under superuser bypass, RLS WITH CHECK requires app.current_tenant per orgId on UPDATE
			const idsByOrg = new Map<string, string[]>();
			for (const candidate of candidates) {
				const list = idsByOrg.get(candidate.organizationId) ?? [];
				list.push(candidate.id);
				idsByOrg.set(candidate.organizationId, list);
			}

			const claimedRows: EgiszOutboxItem[] = [];
			for (const [orgId, ids] of idsByOrg.entries()) {
				const orgClaimed = await withTenantCtx(orgId, async (tenantTx) =>
					tenantTx
						.update(egiszOutbox)
						.set({
							status: "sending",
							lockedAt: claimNow,
							lockedBy: workerLock,
							updatedAt: claimNow,
						})
						.where(
							and(
								eq(egiszOutbox.organizationId, orgId),
								inArray(egiszOutbox.id, ids),
								inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
							),
						)
						.returning(),
				);
				claimedRows.push(...orgClaimed);
			}
			return claimedRows;
		};

		const claimedOutboxRows = organizationId
			? await withTenantCtx(organizationId, claimBatchInTx)
			: await withSuperuserBypass(claimBatchInTx);

		// 3. Dispatch claimed rows outside the claim transaction (no DB locks held during network I/O)
		for (const row of claimedOutboxRows) {
			result.processedCount++;
			const activeClient = await this.resolveClientForOrg(row.organizationId);
			const rowRes = await processOutboxRow(row, activeClient);
			if (rowRes.success) {
				result.successCount++;
			} else {
				result.failedCount++;
			}
			result.results.push(rowRes.resultItem);
		}

		return result;
	}

	/**
	 * Polls and synchronizes status of in-flight "Sent" / "sending" transactions from РЭМД Минздрава РФ.
	 */
	public async syncPendingStatuses(organizationId?: string): Promise<number> {
		if (organizationId) {
			const activeClient = await this.resolveClientForOrg(organizationId);
			return syncPendingStatuses(activeClient, organizationId);
		}
		return syncPendingStatuses(
			(orgId) => this.resolveClientForOrg(orgId),
			undefined,
		);
	}

	/**
	 * Returns queue telemetry and health metrics for the clinic.
	 */
	public async getQueueStatus(organizationId: string): Promise<EgiszQueueHealthSummary> {
		const { outboxCounts, nextItem } = await withTenantCtx(organizationId, async (tx) => {
			const counts = await tx
				.select({
					status: egiszOutbox.status,
					count: sql<number>`count(*)::int`,
				})
				.from(egiszOutbox)
				.where(eq(egiszOutbox.organizationId, organizationId))
				.groupBy(egiszOutbox.status);

			const [next] = await tx
				.select({ nextAttemptAt: egiszOutbox.nextAttemptAt })
				.from(egiszOutbox)
				.where(
					and(
						eq(egiszOutbox.organizationId, organizationId),
						inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
					),
				)
				.orderBy(egiszOutbox.nextAttemptAt)
				.limit(1);

			return { outboxCounts: counts, nextItem: next };
		});

		const countsMap: Record<string, number> = {};
		for (const item of outboxCounts) {
			countsMap[item.status] = item.count;
		}

		return {
			organizationId,
			queuedCount: countsMap.queued ?? 0,
			readyCount: countsMap.ready_for_dispatch ?? 0,
			sendingCount: countsMap.sending ?? 0,
			registeredCount: (countsMap.registered_in_remd ?? 0) + (countsMap.delivered_to_epgu ?? 0),
			failedCount: countsMap.failed ?? 0,
			rejectedCount: countsMap.rejected_by_remd ?? 0,
			nextAttemptAt: nextItem?.nextAttemptAt ? nextItem.nextAttemptAt.toISOString() : null,
			checkedAt: new Date().toISOString(),
		};
	}

	/**
	 * Retrieves the formal REMD Registration Receipt by outbox package ID.
	 */
	public async getReceiptByOutboxId(
		organizationId: string,
		outboxId: string,
	): Promise<EgiszRemdRegistrationReceipt | null> {
		const activeClient = await this.resolveClientForOrg(organizationId);
		return getReceiptByOutboxId(activeClient, organizationId, outboxId);
	}

	/**
	 * Retrieves the formal REMD Registration Receipt by clinical visit ID.
	 */
	public async getReceiptByVisitId(
		organizationId: string,
		visitId: string,
	): Promise<EgiszRemdRegistrationReceipt | null> {
		const activeClient = await this.resolveClientForOrg(organizationId);
		return getReceiptByVisitId(activeClient, organizationId, visitId);
	}
}

export const OutboxQueueProcessor = EgiszOutboxDispatcher;
export type OutboxQueueProcessor = EgiszOutboxDispatcher;
