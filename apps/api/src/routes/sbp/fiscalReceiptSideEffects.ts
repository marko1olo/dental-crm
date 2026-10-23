import { kopecksToNumericString } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { db } from "../../db/client.js";
import {
	cashLedger,
	digitalReceiptDispatches,
	generatedDocuments,
	patientInvoices,
	visits,
} from "../../db/schema.js";
import type { CreateFiscalReceiptPayloadInput } from "./types.js";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Applies secondary financial ledger, document promotion, and dispatch records */
export async function applyFiscalSideEffects(params: {
	tx: DbTransaction;
	orgId: string;
	input: CreateFiscalReceiptPayloadInput;
	paymentId: string;
	patientFullName: string;
	fiscalReceiptNumber: string;
	now: Date;
}): Promise<void> {
	const { tx, orgId, input, paymentId, patientFullName, fiscalReceiptNumber, now } = params;
	const isReturn = input.operationType === "income_return";

	// Promote document status to issued if documentId provided
	if (input.documentId) {
		await tx
			.update(generatedDocuments)
			.set({ status: "issued", issuedAt: now })
			.where(
				and(
					eq(generatedDocuments.id, input.documentId),
					eq(generatedDocuments.organizationId, orgId),
				),
			);
	}

	// Update visit timestamp if visitId provided
	if (input.visitId) {
		await tx
			.update(visits)
			.set({ updatedAt: now })
			.where(and(eq(visits.id, input.visitId), eq(visits.organizationId, orgId)));
	}

	// Record cash ledger entry and promote invoice/document status
	if (input.invoiceId) {
		await tx.insert(cashLedger).values({
			invoiceId: input.invoiceId,
			paymentMethod:
				input.sbpKopecks > 0
					? "card"
					: input.electronicCardKopecks > 0
						? "card"
						: "cash",
			amountRub: isReturn
				? `-${kopecksToNumericString(input.totalKopecks)}`
				: kopecksToNumericString(input.totalKopecks),
			timestamp: now,
		});

		await tx
			.update(patientInvoices)
			.set({
				status: isReturn ? "refunded" : "paid",
				paidAt: now,
			})
			.where(
				and(
					eq(patientInvoices.id, input.invoiceId),
					eq(patientInvoices.organizationId, orgId),
				),
			);

		await tx
			.update(generatedDocuments)
			.set({ status: "issued", issuedAt: now })
			.where(
				and(
					eq(generatedDocuments.id, input.invoiceId),
					eq(generatedDocuments.organizationId, orgId),
					eq(generatedDocuments.status, "draft"),
				),
			);
	}

	// Record digital receipt dispatch
	const isEmail = input.customerContact.includes("@");
	await tx.insert(digitalReceiptDispatches).values({
		organizationId: orgId,
		paymentId,
		patientName: patientFullName,
		dispatchChannel: isEmail ? "email" : "sms",
		targetDestination: input.customerContact,
		fiscalReceiptNumber,
		receiptAmountRub: kopecksToNumericString(input.totalKopecks),
		paperPrintSkipped: true,
	});
}
