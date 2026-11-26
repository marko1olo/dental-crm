/**
 * Layer 2: EGISZ REMD In-Flight Status Synchronizer.
 * Polls and synchronizes status of in-flight "Sent" / "sending" transactions from РЭМД Минздрава РФ.
 * Compliant with Minzdrav Order 911n and FZ-63.
 */

import { and, eq } from "drizzle-orm";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import { egiszLogs, egiszOutbox } from "../../../db/schema.js";
import { appendEgiszAuditLog } from "../EgiszAuditService.js";
import type { OiisGatewayClient } from "../OiisGatewayClient.js";
import type { EgiszRemdRegistrationReceipt } from "./types.js";
import { createEgiszRemdReceipt } from "./egiszGatewayClient.js";
import { createApiLogger } from "../../../observability/logger.js";

const logger = createApiLogger("egisz:statusSyncer");

/**
 * Polls and synchronizes status of in-flight "Sent" / "sending" transactions from РЭМД Минздрава РФ.
 */
export async function syncPendingStatuses(
	clientOrResolver:
		| OiisGatewayClient
		| ((orgId: string) => Promise<OiisGatewayClient>),
	organizationId?: string,
): Promise<number> {
	let updatedCount = 0;

	// 1. Sync egisz_outbox items in 'sending' state (read under tenant RLS or superuser bypass)
	const sendingOutboxRows = await (organizationId
		? withTenantCtx(organizationId, async (tx) =>
				tx
					.select()
					.from(egiszOutbox)
					.where(
						and(
							eq(egiszOutbox.organizationId, organizationId),
							eq(egiszOutbox.status, "sending"),
						),
					)
					.limit(50),
			)
		: withSuperuserBypass(async (tx) =>
				tx
					.select()
					.from(egiszOutbox)
					.where(eq(egiszOutbox.status, "sending"))
					.limit(50),
			));

	for (const row of sendingOutboxRows) {
		if (!row.remdTransactionId) continue;
		try {
			const client =
				typeof clientOrResolver === "function"
					? await clientOrResolver(row.organizationId)
					: clientOrResolver;
			const statusRes = await client.getRemdDocumentStatus(row.remdTransactionId);
			if (statusRes.status === "Registered" || statusRes.status === "Rejected") {
				const isRegistered = statusRes.status === "Registered";
				const resolvedRemdDocId = statusRes.remdDocumentId ?? row.remdDocumentId ?? `REMD-DOC-${row.id.slice(0, 8)}`;

				let receipt: EgiszRemdRegistrationReceipt | null = null;
				if (isRegistered) {
					const rawObj: Record<string, unknown> = { ...statusRes };
					const serverReceiptId =
						typeof rawObj.receiptId === "string" ? rawObj.receiptId : undefined;
					receipt = createEgiszRemdReceipt({
						receiptId: serverReceiptId,
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
					...statusRes,
					...(receipt ? { receipt } : {}),
				};

				await withTenantCtx(row.organizationId, async (tx) => {
					await tx
						.update(egiszOutbox)
						.set({
							status: isRegistered ? "registered_in_remd" : "rejected_by_remd",
							remdDocumentId: resolvedRemdDocId,
							lastErrorMessage: statusRes.statusDescription,
							gatewayResponseJson: responsePayload,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(egiszOutbox.id, row.id),
								eq(egiszOutbox.organizationId, row.organizationId),
							),
						);

					if (row.visitId) {
						await tx
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
					}

					if (receipt) {
						await appendEgiszAuditLog(tx, {
							organizationId: row.organizationId,
							eventType: "REMD_RECEIPT_PERSISTED",
							entityType: "egisz_outbox",
							entityId: row.id,
							patientId: row.patientId,
							payload: { ...receipt },
						});
					}

					await appendEgiszAuditLog(tx, {
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
				});

				updatedCount++;
			}
		} catch (err: unknown) {
			logger.error(
				{ err, rowId: row.id, organizationId: row.organizationId },
				`Outbox status sync failed for row ${row.id}`,
			);
		}
	}

	// 2. Sync legacy egisz_logs in 'Sent' state
	const sentLogs = await (organizationId
		? withTenantCtx(organizationId, async (tx) =>
				tx
					.select()
					.from(egiszLogs)
					.where(
						and(
							eq(egiszLogs.organizationId, organizationId),
							eq(egiszLogs.status, "Sent"),
						),
					)
					.limit(50),
			)
		: withSuperuserBypass(async (tx) =>
				tx
					.select()
					.from(egiszLogs)
					.where(eq(egiszLogs.status, "Sent"))
					.limit(50),
			));

	for (const log of sentLogs) {
		if (!log.transactionId) continue;
		try {
			const client =
				typeof clientOrResolver === "function"
					? await clientOrResolver(log.organizationId)
					: clientOrResolver;
			const statusRes = await client.getRemdDocumentStatus(log.transactionId);
			if (statusRes.status === "Registered" || statusRes.status === "Rejected") {
				await withTenantCtx(log.organizationId, async (tx) => {
					await tx
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
						.where(
							and(
								eq(egiszLogs.id, log.id),
								eq(egiszLogs.organizationId, log.organizationId),
							),
						);

					await appendEgiszAuditLog(tx, {
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
				});

				updatedCount++;
			}
		} catch (err: unknown) {
			logger.error(
				{ err, logId: log.id, organizationId: log.organizationId },
				`Status sync failed for log ${log.id}`,
			);
		}
	}

	return updatedCount;
}
