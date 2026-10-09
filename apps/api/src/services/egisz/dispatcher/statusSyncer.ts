/**
 * Layer 2: EGISZ REMD In-Flight Status Synchronizer.
 * Polls and synchronizes status of in-flight "Sent" / "sending" transactions from РЭМД Минздрава РФ.
 * Compliant with Minzdrav Order 911n and FZ-63.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { egiszLogs, egiszOutbox } from "../../../db/schema.js";
import { appendEgiszAuditLog } from "../EgiszAuditService.js";
import type { OiisGatewayClient } from "../OiisGatewayClient.js";
import type { EgiszRemdRegistrationReceipt } from "./types.js";
import { createEgiszRemdReceipt } from "./egiszGatewayClient.js";

/**
 * Polls and synchronizes status of in-flight "Sent" / "sending" transactions from РЭМД Минздрава РФ.
 */
export async function syncPendingStatuses(
	client: OiisGatewayClient,
	organizationId?: string,
): Promise<number> {
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
			const statusRes = await client.getRemdDocumentStatus(row.remdTransactionId);
			if (statusRes.status === "Registered" || statusRes.status === "Rejected") {
				const isRegistered = statusRes.status === "Registered";
				const resolvedRemdDocId = statusRes.remdDocumentId ?? row.remdDocumentId ?? `REMD-DOC-${row.id.slice(0, 8)}`;

				let receipt: EgiszRemdRegistrationReceipt | null = null;
				if (isRegistered) {
					receipt = createEgiszRemdReceipt({
						remdDocumentId: resolvedRemdDocId,
						transactionId: row.remdTransactionId,
						registeredAt: statusRes.registrationDate,
						organizationId: row.organizationId,
						patientId: row.patientId,
						patientSnils: null,
						visitId: row.visitId,
						documentId: row.documentId,
						docTypeNsiCode: row.docTypeNsiCode,
						clinicOid: client.getConfig().clinicOid,
						payloadHashSha256: row.payloadHashSha256,
						doctorCertSerial: row.doctorCertSerial,
						doctorCertSubject: row.doctorCertSubject,
						moCertSerial: row.moCertSerial,
						serviceEndpoint: client.getConfig().baseUrl,
					});
				}

				const responsePayload: Record<string, unknown> = {
					...((statusRes as unknown as Record<string, unknown>) ?? {}),
					...(receipt ? { receipt } : {}),
				};

				await db
					.update(egiszOutbox)
					.set({
						status: isRegistered ? "registered_in_remd" : "rejected_by_remd",
						remdDocumentId: resolvedRemdDocId,
						lastErrorMessage: statusRes.statusDescription,
						gatewayResponseJson: responsePayload,
						updatedAt: new Date(),
					})
					.where(eq(egiszOutbox.id, row.id));

				await db
					.update(egiszLogs)
					.set({
						status: isRegistered ? "Accepted" : "Error",
						errorDetails: {
							outboxId: row.id,
							remdDocumentId: resolvedRemdDocId,
							statusDescription: statusRes.statusDescription,
							statusCodeNsi: statusRes.statusCodeNsi,
							syncedAt: new Date().toISOString(),
							...(receipt ? { receipt } : {}),
						},
					})
					.where(
						and(
							eq(egiszLogs.organizationId, row.organizationId),
							eq(egiszLogs.visitId, row.visitId),
						),
					);

				if (receipt) {
					await appendEgiszAuditLog(db, {
						organizationId: row.organizationId,
						eventType: "REMD_RECEIPT_PERSISTED",
						entityType: "egisz_outbox",
						entityId: row.id,
						patientId: row.patientId,
						payload: receipt as unknown as Record<string, unknown>,
					});
				}

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
						remdDocumentId: resolvedRemdDocId,
						statusDescription: statusRes.statusDescription,
						receiptId: receipt?.receiptId ?? null,
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
			const statusRes = await client.getRemdDocumentStatus(log.transactionId);
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
