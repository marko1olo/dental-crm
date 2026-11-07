/**
 * apps/api/src/services/egisz/dispatcher/legacyLogsProcessor.ts
 * Backward compatibility: processes legacy pending items in egisz_logs that do not have an outbox row.
 * Decomposed per Mandate 8b / 8zi (<= 800 lines budget).
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { egiszLogs } from "../../../db/schema.js";
import type { OiisGatewayClient } from "../OiisGatewayClient.js";
import type { EgiszRemdPackage } from "../../cda/signature.js";
import type { OutboxProcessResult } from "./types.js";
import { calculateEgiszRetryDelayMs } from "./egiszGatewayClient.js";

export async function processLegacyPendingLogs(
	client: OiisGatewayClient,
	result: OutboxProcessResult,
	organizationId?: string,
	limit = 50,
): Promise<void> {
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
				const submissionRes = await client.sendRemdDocument(docPayload);
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
}
