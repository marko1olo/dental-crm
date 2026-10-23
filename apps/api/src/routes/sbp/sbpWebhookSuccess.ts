import { kopecksToNumericString } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import {
	generatedDocuments,
	patientInvoices,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import type { ProcessSbpWebhookResult } from "./sbpWebhookTypes.js";
import type { SbpWebhookTargetContext } from "./types.js";

/** Handles successful SBP payment settlement */
export async function handleSbpWebhookSuccess(params: {
	tx: TenantDb;
	orgId: string;
	operationId: string;
	mutationId: string;
	targetContext: SbpWebhookTargetContext;
	payload: Record<string, unknown>;
	incomingAmountKopecks: number | null;
	lockedSberTx?: typeof sberbankTransactions.$inferSelect | undefined;
	lockedPayment?: typeof payments.$inferSelect | undefined;
}): Promise<ProcessSbpWebhookResult> {
	const {
		tx,
		orgId,
		operationId,
		mutationId,
		targetContext,
		payload,
		incomingAmountKopecks,
		lockedSberTx,
		lockedPayment,
	} = params;

	if ((lockedSberTx && lockedSberTx.status === "success") || (lockedPayment && lockedPayment.status === "paid")) {
		return {
			statusCode: 200,
			body: { success: true, processed: false, reason: "already_processed", status: "PAID", paymentId: lockedPayment?.id },
		};
	}

	if (lockedSberTx) {
		await tx
			.update(sberbankTransactions)
			.set({ status: "success", updatedAt: new Date() })
			.where(and(eq(sberbankTransactions.id, lockedSberTx.id), eq(sberbankTransactions.organizationId, orgId)));
	}

	const effectiveAmountKopecks = targetContext.amountKopecks ?? incomingAmountKopecks ?? 0;
	const amountRub =
		effectiveAmountKopecks > 0
			? Number(kopecksToNumericString(effectiveAmountKopecks))
			: payload.amountRub
				? Number(payload.amountRub)
				: 0;

	const effectivePatientId = targetContext.patientId || lockedSberTx?.patientId || (payload.patientId ? String(payload.patientId) : null);
	if (!effectivePatientId) {
		return {
			statusCode: 400,
			body: { error: "MissingPatientId", message: "Не удалось определить пациента для разноски платежа СБП." },
		};
	}

	const [insertedPayment] = await tx
		.insert(payments)
		.values({
			organizationId: orgId,
			patientId: effectivePatientId,
			visitId: targetContext.visitId || lockedSberTx?.visitId || null,
			documentId: targetContext.documentId || lockedSberTx?.documentId || null,
			method: "online",
			status: "paid",
			amountRub,
			paidAt: new Date(),
			clientMutationId: mutationId,
			note: `Оплата через СБП QR (операция ${operationId})`,
		})
		.onConflictDoNothing({ target: [payments.organizationId, payments.clientMutationId] })
		.returning();

	const targetDocId = targetContext.documentId || lockedSberTx?.documentId;
	if (targetDocId) {
		await tx
			.update(generatedDocuments)
			.set({ status: "issued", issuedAt: new Date() })
			.where(and(eq(generatedDocuments.id, targetDocId), eq(generatedDocuments.organizationId, orgId), eq(generatedDocuments.status, "draft")));
	}

	const targetVisitId = targetContext.visitId || lockedSberTx?.visitId;
	if (targetVisitId) {
		await tx.update(visits).set({ updatedAt: new Date() }).where(and(eq(visits.id, targetVisitId), eq(visits.organizationId, orgId)));
	}

	const targetInvoiceId = targetContext.invoiceId || lockedSberTx?.invoiceId;
	if (targetInvoiceId) {
		await tx.update(patientInvoices).set({ status: "paid", paidAt: new Date() }).where(and(eq(patientInvoices.id, targetInvoiceId), eq(patientInvoices.organizationId, orgId)));
	}

	return {
		statusCode: 200,
		body: {
			success: true,
			processed: true,
			status: "PAID",
			paymentId: insertedPayment?.id || lockedPayment?.id,
			amount: effectiveAmountKopecks,
		},
	};
}
