import { eq, or } from "drizzle-orm";
import { withSuperuserBypass } from "../../db/rls.js";
import { payments, sberbankTransactions } from "../../db/schema.js";
import type { SbpWebhookTargetContext } from "./types.js";

/** Locates transaction or payment context with superuser bypass */
export async function locateSbpWebhookContext(
	operationId: string,
	payload: Record<string, unknown>,
): Promise<SbpWebhookTargetContext | null> {
	return await withSuperuserBypass(async (tx) => {
		// 1. Check sberbankTransactions (orders registered for SBP)
		const [sberTx] = await tx
			.select()
			.from(sberbankTransactions)
			.where(eq(sberbankTransactions.orderId, String(operationId)))
			.limit(1);

		if (sberTx) {
			return {
				source: "sberbankTransactions" as const,
				organizationId: sberTx.organizationId,
				patientId: sberTx.patientId,
				visitId: sberTx.visitId,
				documentId: sberTx.documentId,
				invoiceId: sberTx.invoiceId,
				amountKopecks: sberTx.amount,
				sberTx,
			};
		}

		// 2. Check existing payments by clientMutationId
		const mutationId = `sbp:${operationId}`;
		const [existingPayment] = await tx
			.select()
			.from(payments)
			.where(
				or(
					eq(payments.clientMutationId, mutationId),
					eq(payments.clientMutationId, String(operationId)),
				),
			)
			.limit(1);

		if (existingPayment) {
			return {
				source: "payments" as const,
				organizationId: existingPayment.organizationId,
				patientId: existingPayment.patientId,
				visitId: existingPayment.visitId,
				documentId: existingPayment.documentId,
				invoiceId: null,
				amountKopecks: Math.round(Number(existingPayment.amountRub) * 100),
				existingPayment,
			};
		}

		// 3. If payload includes organizationId and patientId (or invoiceId)
		if (payload.organizationId && (payload.patientId || payload.invoiceId)) {
			return {
				source: "payload" as const,
				organizationId: String(payload.organizationId),
				patientId: payload.patientId ? String(payload.patientId) : null,
				visitId: payload.visitId ? String(payload.visitId) : null,
				documentId: payload.documentId ? String(payload.documentId) : null,
				invoiceId: payload.invoiceId ? String(payload.invoiceId) : null,
				amountKopecks: payload.amountKopecks
					? Number(payload.amountKopecks)
					: payload.amount
						? Number(payload.amount)
						: null,
			};
		}

		return null;
	});
}
