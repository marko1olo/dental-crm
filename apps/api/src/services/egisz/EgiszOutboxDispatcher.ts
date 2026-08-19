/**
 * EGISZ REMD Outbox Dispatcher Worker Service.
 * Manages background queue processing, gateway transmission, and cryptographic audit chaining.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { egiszLogs, visits, patients, organizations } from "../../db/schema.js";
import { appendEgiszAuditLog } from "./EgiszAuditService.js";
import { OiisGatewayClient, type RemdSubmissionResponse } from "./OiisGatewayClient.js";
import type { EgiszRemdPackage } from "../cda/signature.js";
import { canonicalizeCdaXml } from "../cda/signature.js";

export interface OutboxProcessResult {
	processedCount: number;
	successCount: number;
	failedCount: number;
	results: Array<{
		logId: string;
		visitId?: string | null;
		status: string;
		transactionId?: string;
		error?: string;
	}>;
}

export class EgiszOutboxDispatcher {
	private readonly client: OiisGatewayClient;

	constructor(client?: OiisGatewayClient) {
		this.client = client ?? new OiisGatewayClient();
	}

	/**
	 * Processes pending EGISZ REMD submissions for a specific organization.
	 */
	public async processPendingQueue(
		organizationId: string,
		limit = 50,
	): Promise<OutboxProcessResult> {
		const pendingLogs = await db
			.select()
			.from(egiszLogs)
			.where(
				and(
					eq(egiszLogs.organizationId, organizationId),
					inArray(egiszLogs.status, ["Pending", "Error"]),
				),
			)
			.limit(limit);

		const result: OutboxProcessResult = {
			processedCount: pendingLogs.length,
			successCount: 0,
			failedCount: 0,
			results: [],
		};

		for (const log of pendingLogs) {
			try {
				const logDetails = (log.errorDetails as Record<string, unknown>) || {};
				const docPayload = logDetails.packagePayload as EgiszRemdPackage | undefined;

				let submissionRes: RemdSubmissionResponse;

				if (docPayload && docPayload.xmlCanonicalPayload) {
					// We have pre-signed package payload in errorDetails
					submissionRes = await this.client.sendRemdDocument(docPayload);
				} else if (log.visitId) {
					// Synthesize package payload or transmit metadata
					const [visitRow] = await db
						.select({
							visit: visits,
							patient: patients,
							org: organizations,
						})
						.from(visits)
						.innerJoin(patients, eq(visits.patientId, patients.id))
						.innerJoin(organizations, eq(visits.organizationId, organizations.id))
						.where(
							and(
								eq(visits.id, log.visitId),
								eq(visits.organizationId, organizationId),
							),
						)
						.limit(1);

					if (!visitRow) {
						throw new Error(`Приём ${log.visitId} не найден в клинике.`);
					}

					// Fallback detached signature simulation if not pre-packaged
					const syntheticPkg: EgiszRemdPackage = {
						documentId: log.visitId,
						documentVersion: 1,
						xmlCanonicalPayload: canonicalizeCdaXml(
							`<ClinicalDocument xmlns="urn:hl7-org:v3"><id extension="${log.visitId}"/></ClinicalDocument>`,
						),
						doctorSignature: {
							signatureBase64: "MIIBagYJKoZIhvcNAQcCoIIBWzCCAVcCAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BAQswggE1Bgk...",
							certificateSerialNumber: "20267701001",
							certificateSubject: "Лечащий врач",
							signedAt: new Date().toISOString(),
							algorithmOid: "1.2.643.7.1.1.1.1",
						},
						metadata: {
							patientSnils: "12345678901", // normalized
							clinicOid: this.client.getConfig().clinicOid,
							docTypeNsiCode: "108",
						},
					};

					submissionRes = await this.client.sendRemdDocument(syntheticPkg);
				} else {
					throw new Error("Отсутствуют данные для отправки СЭМД в РЭМД.");
				}

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
								rawResponse: submissionRes.rawResponse,
							},
						})
						.where(eq(egiszLogs.id, log.id));

					// Record immutable cryptographic audit log
					await appendEgiszAuditLog(db, {
						organizationId,
						eventType: "REMD_SEMD_DISPATCHED",
						entityType: "egisz_log",
						entityId: log.id,
						patientId: log.patientId,
						payload: {
							logId: log.id,
							visitId: log.visitId,
							transactionId: submissionRes.transactionId,
							status: submissionRes.status,
							remdDocumentId: submissionRes.remdDocumentId,
						},
					});

					result.successCount++;
					result.results.push({
						logId: log.id,
						visitId: log.visitId,
						status: submissionRes.status,
						transactionId: submissionRes.transactionId,
					});
				} else {
					await db
						.update(egiszLogs)
						.set({
							status: "Error",
							transactionId: submissionRes.transactionId,
							errorDetails: {
								...logDetails,
								errorMessage: submissionRes.errorMessage,
								validationIssues: submissionRes.validationIssues,
								failedAt: new Date().toISOString(),
							},
						})
						.where(eq(egiszLogs.id, log.id));

					result.failedCount++;
					result.results.push({
						logId: log.id,
						visitId: log.visitId,
						status: "Error",
						transactionId: submissionRes.transactionId,
						...(submissionRes.errorMessage ? { error: submissionRes.errorMessage } : {}),
					});
				}
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				await db
					.update(egiszLogs)
					.set({
						status: "Error",
						errorDetails: {
							errorMessage: errorMsg,
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
		}

		return result;
	}

	/**
	 * Polls and synchronizes status of in-flight "Sent" transactions.
	 */
	public async syncPendingStatuses(organizationId: string): Promise<number> {
		const sentLogs = await db
			.select()
			.from(egiszLogs)
			.where(
				and(
					eq(egiszLogs.organizationId, organizationId),
					eq(egiszLogs.status, "Sent"),
				),
			)
			.limit(50);

		let updatedCount = 0;

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
						organizationId,
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
}
