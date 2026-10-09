/**
 * Layer 2: EGISZ REMD Registration Receipt Query Service.
 * Manages retrieval and hydration of formal REMD registration receipts
 * from egisz_outbox and legacy egisz_logs.
 * Compliant with Minzdrav Order 911n and FZ-63.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { egiszLogs, egiszOutbox } from "../../../db/schema.js";
import type { OiisGatewayClient } from "../OiisGatewayClient.js";
import type { EgiszRemdRegistrationReceipt } from "./types.js";
import { createEgiszRemdReceipt } from "./egiszGatewayClient.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieves the formal REMD Registration Receipt by outbox package ID.
 */
export async function getReceiptByOutboxId(
	client: OiisGatewayClient,
	organizationId: string,
	outboxId: string,
): Promise<EgiszRemdRegistrationReceipt | null> {
	if (!UUID_REGEX.test(organizationId) || !UUID_REGEX.test(outboxId)) {
		return null;
	}

	const [row] = await db
		.select({
			gatewayResponseJson: egiszOutbox.gatewayResponseJson,
			status: egiszOutbox.status,
			remdDocumentId: egiszOutbox.remdDocumentId,
			remdTransactionId: egiszOutbox.remdTransactionId,
			organizationId: egiszOutbox.organizationId,
			patientId: egiszOutbox.patientId,
			visitId: egiszOutbox.visitId,
			documentId: egiszOutbox.documentId,
			docTypeNsiCode: egiszOutbox.docTypeNsiCode,
			payloadHashSha256: egiszOutbox.payloadHashSha256,
			doctorCertSerial: egiszOutbox.doctorCertSerial,
			doctorCertSubject: egiszOutbox.doctorCertSubject,
			moCertSerial: egiszOutbox.moCertSerial,
			updatedAt: egiszOutbox.updatedAt,
		})
		.from(egiszOutbox)
		.where(
			and(
				eq(egiszOutbox.id, outboxId),
				eq(egiszOutbox.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!row) return null;

	const json = row.gatewayResponseJson as Record<string, unknown> | null;
	if (json?.receipt && typeof json.receipt === "object") {
		return json.receipt as EgiszRemdRegistrationReceipt;
	}

	if (row.status === "registered_in_remd" && row.remdDocumentId && row.remdTransactionId) {
		return createEgiszRemdReceipt({
			remdDocumentId: row.remdDocumentId,
			transactionId: row.remdTransactionId,
			registeredAt: row.updatedAt?.toISOString(),
			organizationId: row.organizationId,
			patientId: row.patientId,
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

	return null;
}

/**
 * Retrieves the formal REMD Registration Receipt by clinical visit ID.
 */
export async function getReceiptByVisitId(
	client: OiisGatewayClient,
	organizationId: string,
	visitId: string,
): Promise<EgiszRemdRegistrationReceipt | null> {
	if (!UUID_REGEX.test(organizationId) || !UUID_REGEX.test(visitId)) {
		return null;
	}

	const [row] = await db
		.select({ id: egiszOutbox.id })
		.from(egiszOutbox)
		.where(
			and(
				eq(egiszOutbox.visitId, visitId),
				eq(egiszOutbox.organizationId, organizationId),
				eq(egiszOutbox.status, "registered_in_remd"),
			),
		)
		.orderBy(desc(egiszOutbox.createdAt))
		.limit(1);

	if (row) {
		return getReceiptByOutboxId(client, organizationId, row.id);
	}

	// Check legacy egiszLogs
	const [logRow] = await db
		.select({ errorDetails: egiszLogs.errorDetails, status: egiszLogs.status })
		.from(egiszLogs)
		.where(
			and(
				eq(egiszLogs.visitId, visitId),
				eq(egiszLogs.organizationId, organizationId),
			),
		)
		.orderBy(desc(egiszLogs.createdAt))
		.limit(1);

	const details = logRow?.errorDetails as Record<string, unknown> | null;
	if (details?.receipt && typeof details.receipt === "object") {
		return details.receipt as EgiszRemdRegistrationReceipt;
	}

	return null;
}
