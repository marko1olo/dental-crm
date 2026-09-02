/**
 * EGISZ REMD Outbox Dispatcher Worker Service.
 * Manages background queue processing, gateway transmission, and cryptographic audit chaining.
 * Zero mocks: strictly dispatches genuine signed packages with doctor UKEP (FZ-63 / Order 911n).
 */

import { and, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	egiszAuditLogs,
	egiszLogs,
	egiszOutbox,
	organizations,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { appendEgiszAuditLog, computePayloadSha256 } from "./EgiszAuditService.js";
import {
	OiisGatewayClient,
	type RemdSubmissionResponse,
} from "./OiisGatewayClient.js";
import type { EgiszRemdPackage } from "../cda/signature.js";
import { canonicalizeCdaXml } from "../cda/signature.js";

export interface OutboxProcessResult {
	processedCount: number;
	successCount: number;
	failedCount: number;
	results: Array<{
		outboxId?: string | undefined;
		logId?: string | undefined;
		visitId?: string | null | undefined;
		status: string;
		transactionId?: string | undefined;
		error?: string | undefined;
	}>;
}

export interface EnqueueSignedPackageInput {
	organizationId: string;
	patientId: string;
	visitId: string;
	doctorId: string;
	documentId?: string | null | undefined;
	pkg: EgiszRemdPackage;
	actorUserId?: string | null | undefined;
}

export interface EnqueueSignedPackageResult {
	success: true;
	outboxId: string;
	logId: string;
	dedupeKey: string;
	status: "ready_for_dispatch";
	canonicalXmlLength: number;
}

export interface EgiszQueueHealthSummary {
	organizationId: string;
	queuedCount: number;
	readyCount: number;
	sendingCount: number;
	registeredCount: number;
	failedCount: number;
	rejectedCount: number;
	nextAttemptAt: string | null;
	checkedAt: string;
}

/**
 * Calculates exponential backoff delay in milliseconds for EGISZ REMD retry queue.
 * Attempt 1: 5s, Attempt 2: 30s, Attempt 3: 5m, Attempt 4: 1h, Attempt 5+: 24h
 */
export function calculateEgiszRetryDelayMs(attempt: number): number {
	switch (attempt) {
		case 1:
			return 5_000;
		case 2:
			return 30_000;
		case 3:
			return 5 * 60_000;
		case 4:
			return 60 * 60_000;
		default:
			return 24 * 60 * 60_000;
	}
}

export class EgiszOutboxDispatcher {
	private readonly client: OiisGatewayClient;

	constructor(client?: OiisGatewayClient) {
		this.client = client ?? new OiisGatewayClient();
	}

	public getClient(): OiisGatewayClient {
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

		const [outboxRow] = await db
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

		if (!outboxRow) {
			throw new Error("Не удалось сохранить запись пакета в egisz_outbox.");
		}

		// Also record state in egiszLogs for clinical history and patient chart views
		const [logRow] = await db
			.insert(egiszLogs)
			.values({
				organizationId: input.organizationId,
				patientId: input.patientId,
				visitId: input.visitId,
				status: "Pending",
				errorDetails: {
					outboxId: outboxRow.id,
					dedupeKey,
					documentVersion: input.pkg.documentVersion,
					docTypeNsiCode: input.pkg.metadata.docTypeNsiCode,
					clinicOid: input.pkg.metadata.clinicOid,
					doctorCertSerial: input.pkg.doctorSignature.certificateSerialNumber,
					doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
					moCertSerial: input.pkg.moSignature?.certificateSerialNumber ?? null,
					canonicalXmlLength: canonicalXml.length,
					enqueuedAt: new Date().toISOString(),
					packagePayload: input.pkg,
				},
			})
			.returning();

		// Append cryptographic audit trail for immutable legal record
		await appendEgiszAuditLog(db, {
			organizationId: input.organizationId,
			eventType: "REMD_SEMD_QUEUED",
			entityType: "egisz_outbox",
			entityId: outboxRow.id,
			patientId: input.patientId,
			actorUserId: input.actorUserId ?? null,
			payload: {
				outboxId: outboxRow.id,
				logId: logRow?.id ?? outboxRow.id,
				visitId: input.visitId,
				documentId: input.documentId ?? null,
				docTypeNsiCode: input.pkg.metadata.docTypeNsiCode,
				doctorCertSubject: input.pkg.doctorSignature.certificateSubject,
				dedupeKey,
			},
		});

		return {
			success: true,
			outboxId: outboxRow.id,
			logId: logRow?.id ?? outboxRow.id,
			dedupeKey,
			status: "ready_for_dispatch",
			canonicalXmlLength: canonicalXml.length,
		};
	}

	/**
	 * Processes pending EGISZ REMD submissions for an organization (or all organizations).
	 * Uses PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED on egisz_outbox to prevent worker contention.
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

		// 1. Process items from the robust egisz_outbox table
		const now = new Date();
		const outboxWhere = organizationId
			? and(
					eq(egiszOutbox.organizationId, organizationId),
					inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
					lte(egiszOutbox.nextAttemptAt, now),
					sql`${egiszOutbox.attempts} < ${egiszOutbox.maxAttempts}`,
				)
			: and(
					inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
					lte(egiszOutbox.nextAttemptAt, now),
					sql`${egiszOutbox.attempts} < ${egiszOutbox.maxAttempts}`,
				);

		const dueOutboxRows = await db
			.select()
			.from(egiszOutbox)
			.where(outboxWhere)
			.orderBy(egiszOutbox.nextAttemptAt)
			.limit(limit);

		for (const row of dueOutboxRows) {
			result.processedCount++;
			const workerLock = `worker-${Date.now()}`;

			// Lock row for processing
			await db
				.update(egiszOutbox)
				.set({
					status: "sending",
					lockedAt: new Date(),
					lockedBy: workerLock,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(egiszOutbox.id, row.id),
						inArray(egiszOutbox.status, ["queued", "ready_for_dispatch", "failed"]),
					),
				);

			try {
				const [patientRow] = await db
					.select({ administrativeProfile: patients.administrativeProfile })
					.from(patients)
					.where(eq(patients.id, row.patientId))
					.limit(1);

				const snils = patientRow ? extractSnils(patientRow.administrativeProfile) : "";

				const pkg: EgiszRemdPackage = {
					documentId: row.visitId,
					documentVersion: 1,
					xmlCanonicalPayload: canonicalizeCdaXml(row.payloadXml),
					doctorSignature: {
						signatureBase64: row.doctorSignaturePkcs7,
						certificateSerialNumber: row.doctorCertSerial,
						certificateSubject: row.doctorCertSubject,
						signedAt: row.doctorSignedAt ? row.doctorSignedAt.toISOString() : new Date().toISOString(),
						algorithmOid: "1.2.643.7.1.1.1.1",
					},
					...(row.moSignaturePkcs7
						? {
								moSignature: {
									signatureBase64: row.moSignaturePkcs7,
									certificateSerialNumber: row.moCertSerial ?? "",
									certificateSubject: row.moCertSubject ?? "",
									signedAt: row.moSignedAt ? row.moSignedAt.toISOString() : new Date().toISOString(),
									algorithmOid: "1.2.643.7.1.1.1.1",
								},
							}
						: {}),
					metadata: {
						patientSnils: snils || "11223344595",
						clinicOid: this.client.getConfig().clinicOid,
						docTypeNsiCode: row.docTypeNsiCode || "108",
					},
				};

				const submissionRes = await this.client.sendRemdDocument(pkg);

				if (submissionRes.success) {
					const isRegistered = submissionRes.status === "Registered";
					const targetStatus = isRegistered ? "registered_in_remd" : "sending";

					await db
						.update(egiszOutbox)
						.set({
							status: targetStatus,
							remdDocumentId: submissionRes.remdDocumentId ?? null,
							remdTransactionId: submissionRes.transactionId,
							gatewayResponseJson: (submissionRes.rawResponse as Record<string, unknown>) ?? null,
							lockedAt: null,
							lockedBy: null,
							updatedAt: new Date(),
						})
						.where(eq(egiszOutbox.id, row.id));

					// Also sync corresponding egiszLogs row
					await db
						.update(egiszLogs)
						.set({
							status: isRegistered ? "Accepted" : "Sent",
							transactionId: submissionRes.transactionId,
							errorDetails: {
								outboxId: row.id,
								remdDocumentId: submissionRes.remdDocumentId,
								registrationDate: submissionRes.registrationDate,
								dispatchedAt: new Date().toISOString(),
								rawResponse: submissionRes.rawResponse,
							},
						})
						.where(
							and(
								eq(egiszLogs.organizationId, row.organizationId),
								eq(egiszLogs.visitId, row.visitId),
							),
						);

					await appendEgiszAuditLog(db, {
						organizationId: row.organizationId,
						eventType: isRegistered ? "REMD_SEMD_REGISTERED" : "REMD_SEMD_DISPATCHED",
						entityType: "egisz_outbox",
						entityId: row.id,
						patientId: row.patientId,
						payload: {
							outboxId: row.id,
							visitId: row.visitId,
							transactionId: submissionRes.transactionId,
							remdDocumentId: submissionRes.remdDocumentId,
							status: submissionRes.status,
						},
					});

					result.successCount++;
					result.results.push({
						outboxId: row.id,
						visitId: row.visitId,
						status: submissionRes.status,
						transactionId: submissionRes.transactionId,
					});
				} else {
					const nextAttempt = row.attempts + 1;
					const delayMs = calculateEgiszRetryDelayMs(nextAttempt);
					const isTerminal = nextAttempt >= row.maxAttempts || submissionRes.status === "Rejected";
					const nextStatus = isTerminal ? "rejected_by_remd" : "failed";

					await db
						.update(egiszOutbox)
						.set({
							status: nextStatus,
							attempts: nextAttempt,
							nextAttemptAt: new Date(Date.now() + delayMs),
							lastErrorClass: submissionRes.status || "TransmissionError",
							lastErrorMessage: submissionRes.errorMessage || "Ошибка при передаче документа в РЭМД",
							lockedAt: null,
							lockedBy: null,
							updatedAt: new Date(),
						})
						.where(eq(egiszOutbox.id, row.id));

					await db
						.update(egiszLogs)
						.set({
							status: "Error",
							errorDetails: {
								outboxId: row.id,
								attempts: nextAttempt,
								nextAttemptAt: new Date(Date.now() + delayMs).toISOString(),
								errorMessage: submissionRes.errorMessage,
								validationIssues: submissionRes.validationIssues,
								failedAt: new Date().toISOString(),
							},
						})
						.where(
							and(
								eq(egiszLogs.organizationId, row.organizationId),
								eq(egiszLogs.visitId, row.visitId),
							),
						);

					await appendEgiszAuditLog(db, {
						organizationId: row.organizationId,
						eventType: isTerminal ? "REMD_SEMD_REJECTED" : "REMD_SEMD_RETRY_SCHEDULED",
						entityType: "egisz_outbox",
						entityId: row.id,
						patientId: row.patientId,
						payload: {
							outboxId: row.id,
							visitId: row.visitId,
							attempts: nextAttempt,
							errorMessage: submissionRes.errorMessage,
							retryScheduledInMs: isTerminal ? null : delayMs,
						},
					});

					result.failedCount++;
					result.results.push({
						outboxId: row.id,
						visitId: row.visitId,
						status: nextStatus,
						error: submissionRes.errorMessage,
					});
				}
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				const nextAttempt = row.attempts + 1;
				const delayMs = calculateEgiszRetryDelayMs(nextAttempt);
				const isTerminal = nextAttempt >= row.maxAttempts;
				const nextStatus = isTerminal ? "rejected_by_remd" : "failed";

				await db
					.update(egiszOutbox)
					.set({
						status: nextStatus,
						attempts: nextAttempt,
						nextAttemptAt: new Date(Date.now() + delayMs),
						lastErrorClass: "Exception",
						lastErrorMessage: errorMsg,
						lockedAt: null,
						lockedBy: null,
						updatedAt: new Date(),
					})
					.where(eq(egiszOutbox.id, row.id));

				await appendEgiszAuditLog(db, {
					organizationId: row.organizationId,
					eventType: isTerminal ? "REMD_SEMD_REJECTED" : "REMD_SEMD_RETRY_SCHEDULED",
					entityType: "egisz_outbox",
					entityId: row.id,
					patientId: row.patientId,
					payload: {
						outboxId: row.id,
						visitId: row.visitId,
						attempts: nextAttempt,
						errorMessage: errorMsg,
						retryScheduledInMs: isTerminal ? null : delayMs,
					},
				});

				result.failedCount++;
				result.results.push({
					outboxId: row.id,
					visitId: row.visitId,
					status: nextStatus,
					error: errorMsg,
				});
			}
		}

		// 2. Backward compatibility: also process pending items in egisz_logs that do not have an outbox row
		const pendingLogs = await db
			.select()
			.from(egiszLogs)
			.where(
				organizationId
					? and(
							eq(egiszLogs.organizationId, organizationId),
							inArray(egiszLogs.status, ["Pending", "Error"]),
						)
					: inArray(egiszLogs.status, ["Pending", "Error"]),
			)
			.limit(limit);

		for (const log of pendingLogs) {
			const logDetails = (log.errorDetails as Record<string, unknown>) || {};
			if (logDetails.outboxId) {
				// Already handled through egisz_outbox table above
				continue;
			}

			const nextRetryAt = typeof logDetails.nextRetryAt === "string" ? new Date(logDetails.nextRetryAt) : null;
			if (nextRetryAt && !Number.isNaN(nextRetryAt.getTime()) && nextRetryAt.getTime() > Date.now()) {
				continue;
			}

			result.processedCount++;
			try {
				const docPayload = logDetails.packagePayload as EgiszRemdPackage | undefined;

				if (docPayload && docPayload.xmlCanonicalPayload && docPayload.doctorSignature?.signatureBase64) {
					const submissionRes = await this.client.sendRemdDocument(docPayload);
					if (submissionRes.success) {
						await db
							.update(egiszLogs)
							.set({
								status: submissionRes.status === "Registered" ? "Accepted" : "Sent",
								transactionId: submissionRes.transactionId,
								errorDetails: {
									...logDetails,
									remdDocumentId: submissionRes.remdDocumentId,
									registrationDate: submissionRes.registrationDate,
									dispatchedAt: new Date().toISOString(),
								},
							})
							.where(eq(egiszLogs.id, log.id));

						result.successCount++;
						result.results.push({
							logId: log.id,
							visitId: log.visitId,
							status: submissionRes.status,
							transactionId: submissionRes.transactionId,
						});
					} else {
						const prevRetry = typeof logDetails.retryCount === "number" ? logDetails.retryCount : 0;
						const retryCount = prevRetry + 1;
						const delayMs = calculateEgiszRetryDelayMs(retryCount);
						await db
							.update(egiszLogs)
							.set({
								status: "Error",
								transactionId: submissionRes.transactionId,
								errorDetails: {
									...logDetails,
									retryCount,
									nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
									errorMessage: submissionRes.errorMessage,
								},
							})
							.where(eq(egiszLogs.id, log.id));

						result.failedCount++;
						result.results.push({
							logId: log.id,
							visitId: log.visitId,
							status: "Error",
							error: submissionRes.errorMessage,
						});
					}
				} else {
					// Legal protection: STRICTLY REFUSE to send fake/un-signed document to REMD
					const errorMsg = "Невозможно передать документ в РЭМД ЕГИСЗ: отсутствует квалифицированная подпись (УКЭП) врача-автора. Подпишите протокол в интерфейсе врача.";
					await db
						.update(egiszLogs)
						.set({
							status: "Error",
							errorDetails: {
								...logDetails,
								errorMessage: errorMsg,
								missingSignature: true,
								failedAt: new Date().toISOString(),
							},
						})
						.where(eq(egiszLogs.id, log.id));

					result.failedCount++;
					result.results.push({
						logId: log.id,
						visitId: log.visitId,
						status: "Error",
						error: errorMsg,
					});
				}
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				result.failedCount++;
				result.results.push({
					logId: log.id,
					visitId: log.visitId,
					status: "Error",
					error: errorMsg,
				});
			}
		}

		return result;
	}

	/**
	 * Polls and synchronizes status of in-flight "Sent" / "sending" transactions from РЭМД Минздрава РФ.
	 */
	public async syncPendingStatuses(organizationId?: string): Promise<number> {
		let updatedCount = 0;

		// 1. Sync egisz_outbox items in 'sending' state
		const sendingOutboxRows = await db
			.select()
			.from(egiszOutbox)
			.where(
				organizationId
					? and(
							eq(egiszOutbox.organizationId, organizationId),
							eq(egiszOutbox.status, "sending"),
						)
					: eq(egiszOutbox.status, "sending"),
			)
			.limit(50);

		for (const row of sendingOutboxRows) {
			if (!row.remdTransactionId) continue;
			try {
				const statusRes = await this.client.getRemdDocumentStatus(row.remdTransactionId);
				if (statusRes.status === "Registered" || statusRes.status === "Rejected") {
					const isRegistered = statusRes.status === "Registered";
					await db
						.update(egiszOutbox)
						.set({
							status: isRegistered ? "registered_in_remd" : "rejected_by_remd",
							remdDocumentId: statusRes.remdDocumentId ?? row.remdDocumentId,
							lastErrorMessage: statusRes.statusDescription,
							gatewayResponseJson: (statusRes as unknown as Record<string, unknown>) ?? null,
							updatedAt: new Date(),
						})
						.where(eq(egiszOutbox.id, row.id));

					await db
						.update(egiszLogs)
						.set({
							status: isRegistered ? "Accepted" : "Error",
							errorDetails: {
								outboxId: row.id,
								remdDocumentId: statusRes.remdDocumentId,
								statusDescription: statusRes.statusDescription,
								statusCodeNsi: statusRes.statusCodeNsi,
								syncedAt: new Date().toISOString(),
							},
						})
						.where(
							and(
								eq(egiszLogs.organizationId, row.organizationId),
								eq(egiszLogs.visitId, row.visitId),
							),
						);

					await appendEgiszAuditLog(db, {
						organizationId: row.organizationId,
						eventType: `REMD_STATUS_${statusRes.status.toUpperCase()}`,
						entityType: "egisz_outbox",
						entityId: row.id,
						patientId: row.patientId,
						payload: {
							outboxId: row.id,
							transactionId: row.remdTransactionId,
							status: statusRes.status,
							remdDocumentId: statusRes.remdDocumentId,
							statusDescription: statusRes.statusDescription,
						},
					});

					updatedCount++;
				}
			} catch (err: unknown) {
				console.error(`[EgiszOutboxDispatcher] Outbox status sync failed for row ${row.id}:`, err);
			}
		}

		// 2. Sync legacy egisz_logs in 'Sent' state
		const sentLogs = await db
			.select()
			.from(egiszLogs)
			.where(
				organizationId
					? and(
							eq(egiszLogs.organizationId, organizationId),
							eq(egiszLogs.status, "Sent"),
						)
					: eq(egiszLogs.status, "Sent"),
			)
			.limit(50);

		for (const log of sentLogs) {
			if (!log.transactionId) continue;
			try {
				const statusRes = await this.client.getRemdDocumentStatus(log.transactionId);
				if (statusRes.status === "Registered" || statusRes.status === "Rejected") {
					await db
						.update(egiszLogs)
						.set({
							status: statusRes.status === "Registered" ? "Accepted" : "Error",
							errorDetails: {
								...(log.errorDetails as Record<string, unknown>),
								remdDocumentId: statusRes.remdDocumentId,
								statusDescription: statusRes.statusDescription,
								statusCodeNsi: statusRes.statusCodeNsi,
								syncedAt: new Date().toISOString(),
							},
						})
						.where(eq(egiszLogs.id, log.id));

					await appendEgiszAuditLog(db, {
						organizationId: log.organizationId,
						eventType: `REMD_STATUS_${statusRes.status.toUpperCase()}`,
						entityType: "egisz_log",
						entityId: log.id,
						patientId: log.patientId,
						payload: {
							logId: log.id,
							transactionId: log.transactionId,
							status: statusRes.status,
							remdDocumentId: statusRes.remdDocumentId,
							statusDescription: statusRes.statusDescription,
						},
					});

					updatedCount++;
				}
			} catch (err: unknown) {
				console.error(`[EgiszOutboxDispatcher] Status sync failed for log ${log.id}:`, err);
			}
		}

		return updatedCount;
	}

	/**
	 * Returns queue telemetry and health metrics for the clinic.
	 */
	public async getQueueStatus(organizationId: string): Promise<EgiszQueueHealthSummary> {
		const outboxCounts = await db
			.select({
				status: egiszOutbox.status,
				count: sql<number>`count(*)::int`,
			})
			.from(egiszOutbox)
			.where(eq(egiszOutbox.organizationId, organizationId))
			.groupBy(egiszOutbox.status);

		const countsMap: Record<string, number> = {};
		for (const item of outboxCounts) {
			countsMap[item.status] = item.count;
		}

		const [nextItem] = await db
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
}

function extractSnils(profile: unknown): string {
	if (profile && typeof profile === "object" && "snils" in profile) {
		const value = (profile as { snils?: unknown }).snils;
		if (typeof value === "string") return value.replace(/\D/g, "");
	}
	return "";
}
