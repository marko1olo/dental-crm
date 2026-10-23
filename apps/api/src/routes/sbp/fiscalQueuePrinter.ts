import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { fiscalReceiptQueue } from "../../db/schema.js";

/** Handles physical KKT printer queue buffer status updates */
export async function updateFiscalQueuePrintStatus(params: {
	queueEntryId?: string | undefined;
	orgId: string;
	isKktOffline: boolean;
	logWarn?: (obj: Record<string, unknown>, msg: string) => void;
}): Promise<{ queueStatus: "printed" | "hardware_offline" }> {
	const { queueEntryId, orgId, isKktOffline, logWarn } = params;

	if (isKktOffline) {
		const printError = "KKT connection timed out (5000ms) or printer offline";
		if (logWarn) {
			logWarn(
				{ queueId: queueEntryId, orgId },
				"Physical KKT printer offline; buffered in fiscal_receipt_queue",
			);
		}
		if (queueEntryId) {
			await db
				.update(fiscalReceiptQueue)
				.set({
					status: "hardware_offline",
					lastError: printError,
					retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(fiscalReceiptQueue.id, queueEntryId),
						eq(fiscalReceiptQueue.organizationId, orgId),
					),
				);
		}
		return { queueStatus: "hardware_offline" };
	}

	if (queueEntryId) {
		await db
			.update(fiscalReceiptQueue)
			.set({
				status: "printed",
				printedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(fiscalReceiptQueue.id, queueEntryId),
					eq(fiscalReceiptQueue.organizationId, orgId),
				),
			);
	}

	return { queueStatus: "printed" };
}
